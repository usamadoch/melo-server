import cron from 'node-cron';
// @ts-ignore
import Graph from 'graphology';
// @ts-ignore
import louvainLib from 'graphology-communities-louvain';

import { MatchFeedbackRepository } from '../ratings/matchFeedbackRepository.js';
import { UserFingerprintRepository } from './userFingerprintRepository.js';
import { SybilDetectionLogRepository } from './sybilDetectionLogRepository.js';
import { TrustSignalRepository } from '../ratings/trustSignalRepository.js';
import { updateTrustScoreForUser, calculateTrustScore } from '../ratings/trustScoreService.js';
import type { IMatchFeedback } from '../models/MatchFeedback.js';

interface EdgeData {
  u1: string;
  u2: string;
  totalMatches: number;
  mutualLikes: number;
}

const buildEdgesFromFeedbacks = (feedbacks: IMatchFeedback[]): Record<string, EdgeData> => {
  const matchData: Record<string, { [user: string]: string }> = {};
  for (const fb of feedbacks) {
    if (!matchData[fb.matchId]) matchData[fb.matchId] = {};
    const fromUserId = fb.fromUserId ? fb.fromUserId.toString() : '';
    if (fromUserId) {
      matchData[fb.matchId]![fromUserId] = fb.currentState as string;
    }
  }

  const edges: Record<string, EdgeData> = {};
  for (const [, users] of Object.entries(matchData)) {
    const userIds = Object.keys(users);
    if (userIds.length === 2) {
      const sorted = userIds.sort();
      const u1 = sorted[0] as string;
      const u2 = sorted[1] as string;
      const edgeId = `${u1}_${u2}`;
      
      if (!edges[edgeId]) {
        edges[edgeId] = { u1, u2, totalMatches: 0, mutualLikes: 0 };
      }
      
      edges[edgeId]!.totalMatches += 1;
      if (users[u1] === 'LIKE' && users[u2] === 'LIKE') {
        edges[edgeId]!.mutualLikes += 1;
      }
    }
  }
  return edges;
};

const buildGraphAndDetectCommunities = (edges: Record<string, EdgeData>) => {
  // @ts-ignore
  const GraphClass = Graph.default || Graph;
  const graph = new GraphClass({ type: 'undirected' });
  
  for (const edge of Object.values(edges)) {
    if (!graph.hasNode(edge.u1)) graph.addNode(edge.u1);
    if (!graph.hasNode(edge.u2)) graph.addNode(edge.u2);
    
    const weight = calculateTrustScore(edge.mutualLikes, edge.totalMatches);
    if (weight > 0) {
      graph.addEdge(edge.u1, edge.u2, { weight });
    }
  }

  if (graph.order === 0) return {};

  const louvain = louvainLib.default || louvainLib;
  const communities = louvain(graph, { weightAttribute: 'weight' } as any);
  
  const clusterMap: Record<number, string[]> = {};
  for (const [node, commIdUnknown] of Object.entries(communities)) {
    const commId = Number(commIdUnknown);
    if (!clusterMap[commId]) clusterMap[commId] = [];
    clusterMap[commId]!.push(node);
  }
  return clusterMap;
};

const evaluateClusterAndLog = async (nodes: string[]): Promise<boolean> => {
  const fingerprints = await UserFingerprintRepository.findByUserIds(nodes);
  
  const ipCounts: Record<string, string[]> = {};
  const devCounts: Record<string, string[]> = {};
  
  for (const fp of fingerprints) {
    const ipHash = fp.ipHash as string;
    const deviceHash = fp.deviceHash as string;
    
    if (!ipCounts[ipHash]) ipCounts[ipHash] = [];
    ipCounts[ipHash]!.push(fp.userId.toString());
    
    if (!devCounts[deviceHash]) devCounts[deviceHash] = [];
    devCounts[deviceHash]!.push(fp.userId.toString());
  }

  let matchedFingerprint = 'NONE';
  let isSybil = false;

  for (const [ip, users] of Object.entries(ipCounts)) {
    if (users.length >= 2) {
      isSybil = true;
      matchedFingerprint = `IP:${ip}`;
      break;
    }
  }

  if (!isSybil) {
    for (const [dev, users] of Object.entries(devCounts)) {
      if (users.length >= 2) {
        isSybil = true;
        matchedFingerprint = `Device:${dev}`;
        break;
      }
    }
  }

  await SybilDetectionLogRepository.createLog({
    clusterNodes: nodes,
    fingerprintMatch: matchedFingerprint,
    actionTaken: isSybil,
    reason: isSybil ? 'Fingerprint overlap in Louvain community' : 'High interaction community, distinct fingerprints'
  });

  return isSybil;
};

const applyPenaltiesAndScores = async (edges: Record<string, EdgeData>, sybilEdges: Set<string>) => {
  const repeatScores: Record<string, number> = {};

  for (const edge of Object.values(edges)) {
    const edgeId = `${edge.u1}_${edge.u2}`;
    
    if (sybilEdges.has(edgeId)) {
      await MatchFeedbackRepository.suppressSybilEdges(edge.u1, edge.u2);
    } else if (edge.totalMatches > 1) {
      if (!repeatScores[edge.u1]) repeatScores[edge.u1] = 0;
      if (!repeatScores[edge.u2]) repeatScores[edge.u2] = 0;
      repeatScores[edge.u1]! += (edge.totalMatches - 1) * 2;
      repeatScores[edge.u2]! += (edge.totalMatches - 1) * 2;
    }
  }

  for (const [userId, score] of Object.entries(repeatScores)) {
    await TrustSignalRepository.updateRepeatConnectionScore(userId, score);
  }
};

const runDetection = async () => {
  console.log('Starting Sybil & Repeat Farming Detection Job...');
  try {
    const feedbacks = await MatchFeedbackRepository.findFinalizedFeedbacks();
    const edges = buildEdgesFromFeedbacks(feedbacks);
    const clusterMap = buildGraphAndDetectCommunities(edges);

    const sybilEdges = new Set<string>();

    for (const nodes of Object.values(clusterMap)) {
      if (nodes.length < 2) continue;
      
      const isSybil = await evaluateClusterAndLog(nodes);
      if (isSybil) {
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const sorted = [nodes[i]!, nodes[j]!].sort();
            sybilEdges.add(`${sorted[0]}_${sorted[1]}`);
          }
        }
      }
    }

    await applyPenaltiesAndScores(edges, sybilEdges);

    const allUniqueUsers = new Set<string>();
    for (const edge of Object.values(edges)) {
      allUniqueUsers.add(edge.u1);
      allUniqueUsers.add(edge.u2);
    }

    for (const userId of allUniqueUsers) {
      await updateTrustScoreForUser(userId).catch(console.error);
    }

    console.log(`Sybil Detection Job finished.`);
  } catch (error) {
    console.error('Error in Sybil Detection Job:', error);
  }
};

export const startSybilJob = () => {
  cron.schedule('0 3 * * *', runDetection);
  console.log('Sybil Detection node-cron job scheduled for 03:00 AM daily.');
};
