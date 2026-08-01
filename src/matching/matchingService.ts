import { EventEmitter } from 'events';
import { ProfileRepository } from '../profiles/profileRepository.js';
import { cosineSimilarity } from './embeddingService.js';

// ─── Tuning constants ────────────────────────────────────────────────
export const INITIAL_THRESHOLD = 0.7;
export const MIN_THRESHOLD = 0.15;
// Reaches MIN_THRESHOLD after roughly 45 seconds
export const DECAY_RATE = (INITIAL_THRESHOLD - MIN_THRESHOLD) / 45;
const SWEEP_INTERVAL_MS = 2000; // Run matching sweep every 2 seconds
const SKIP_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

// ─── Types ───────────────────────────────────────────────────────────
export interface QueuedUser {
  userId: string;
  socketId: string;
  categories: string[];
  subcategories: string[];
  freeTextInterest?: string;
  interestVector: number[];
  joinedAt: number; // Date.now()
}

export interface MatchResult {
  userA: QueuedUser;
  userB: QueuedUser;
  roomId: string;
}

// ─── Skip cooldown tracking ─────────────────────────────────────────
interface SkipEntry {
  expiresAt: number;
}

// Key format: "userIdA::userIdB" (always sorted so lookup is symmetric)
const recentlySkippedPairs = new Map<string, SkipEntry>();

function skipKey(a: string, b: string): string {
  return a < b ? `${a}::${b}` : `${b}::${a}`;
}

function isRecentlySkipped(a: string, b: string): boolean {
  const key = skipKey(a, b);
  const entry = recentlySkippedPairs.get(key);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    recentlySkippedPairs.delete(key);
    return false;
  }
  return true;
}

export function addSkippedPair(a: string, b: string): void {
  const key = skipKey(a, b);
  recentlySkippedPairs.set(key, { expiresAt: Date.now() + SKIP_COOLDOWN_MS });
}

// Periodic cleanup of expired skip entries
function cleanupExpiredSkips(): void {
  const now = Date.now();
  for (const [key, entry] of recentlySkippedPairs) {
    if (now > entry.expiresAt) {
      recentlySkippedPairs.delete(key);
    }
  }
}

// ─── Waiting pool ────────────────────────────────────────────────────
let waitingPool: QueuedUser[] = [];

// ─── Event emitter for match results ─────────────────────────────────
export const matchEmitter = new EventEmitter();

// ─── Pool management ─────────────────────────────────────────────────
export async function addUserToPool(userId: string, socketId: string): Promise<QueuedUser | null> {
  const profile = await ProfileRepository.findByUserId(userId);
  if (!profile) return null;

  const categories = profile.categories || [];
  const subcategories = profile.subcategories || [];
  const freeTextInterest = profile.freeTextInterest || undefined;
  const interestVector = profile.interestVector || [];

  // Remove if already in pool (reconnect / re-queue)
  waitingPool = waitingPool.filter((u) => u.userId !== userId);

  const queuedUser: QueuedUser = {
    userId,
    socketId,
    categories,
    subcategories,
    interestVector,
    joinedAt: Date.now(),
  };
  if (freeTextInterest) {
    queuedUser.freeTextInterest = freeTextInterest;
  }

  waitingPool.push(queuedUser);
  return queuedUser;
}

export function removeUserFromPool(userId: string): void {
  waitingPool = waitingPool.filter((u) => u.userId !== userId);
}

export function removeUserFromPoolBySocket(socketId: string): void {
  waitingPool = waitingPool.filter((u) => u.socketId !== socketId);
}

export function getPoolSize(): number {
  return waitingPool.length;
}

// ─── Compatibility scoring ───────────────────────────────────────────
function compat(a: QueuedUser, b: QueuedUser): number {
  // Use cosine similarity on pre-computed interest vectors
  if (a.interestVector.length > 0 && b.interestVector.length > 0) {
    return cosineSimilarity(a.interestVector, b.interestVector);
  }
  // Fallback: basic Jaccard-like overlap on categories + subcategories
  return fallbackCompat(a, b);
}

function fallbackCompat(a: QueuedUser, b: QueuedUser): number {
  const aSet = new Set([...a.categories, ...a.subcategories]);
  const bSet = new Set([...b.categories, ...b.subcategories]);
  if (aSet.size === 0 || bSet.size === 0) return 0;

  let intersection = 0;
  for (const item of aSet) {
    if (bSet.has(item)) intersection++;
  }
  const union = new Set([...aSet, ...bSet]).size;
  return union > 0 ? intersection / union : 0;
}

// ─── Threshold decay ─────────────────────────────────────────────────
export function threshold(waitSeconds: number): number {
  return Math.max(MIN_THRESHOLD, INITIAL_THRESHOLD - DECAY_RATE * waitSeconds);
}

// ─── Matching sweep ──────────────────────────────────────────────────
function runMatchingSweep(): void {
  const now = Date.now();
  // Track users that have been matched in this sweep so we don't double-match
  const matchedUserIds = new Set<string>();

  // Sort pool by wait time (longest first) so they get priority
  const sortedPool = [...waitingPool].sort((a, b) => a.joinedAt - b.joinedAt);

  for (const user of sortedPool) {
    if (matchedUserIds.has(user.userId)) continue;

    const userWaitSec = (now - user.joinedAt) / 1000;
    const userThreshold = threshold(userWaitSec);

    // Find candidates
    const candidates = sortedPool.filter(
      (c) =>
        c.userId !== user.userId &&
        !matchedUserIds.has(c.userId) &&
        !isRecentlySkipped(user.userId, c.userId)
    );

    // Score and filter eligible candidates
    const eligible: { candidate: QueuedUser; score: number }[] = [];

    for (const candidate of candidates) {
      const score = compat(user, candidate);
      const candidateWaitSec = (now - candidate.joinedAt) / 1000;
      const candidateThreshold = threshold(candidateWaitSec);

      // Both must meet their respective thresholds
      if (score >= userThreshold && score >= candidateThreshold) {
        eligible.push({ candidate, score });
      }
    }

    if (eligible.length > 0) {
      // Pick the best match: highest score, tie-break by longest wait
      eligible.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        // Longest wait first (lower joinedAt = waited longer)
        return a.candidate.joinedAt - b.candidate.joinedAt;
      });

      const best = eligible[0]!.candidate;

      // Mark both as matched
      matchedUserIds.add(user.userId);
      matchedUserIds.add(best.userId);

      const roomId = `room_${user.userId}_${best.userId}`;

      // Remove both from pool
      waitingPool = waitingPool.filter(
        (u) => u.userId !== user.userId && u.userId !== best.userId
      );

      const result: MatchResult = {
        userA: user,
        userB: best,
        roomId,
      };
      matchEmitter.emit('match', result);
    }
  }
}

// ─── Lifecycle ───────────────────────────────────────────────────────
let sweepInterval: ReturnType<typeof setInterval> | null = null;
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

export function startMatchingSweep(): void {
  if (sweepInterval) return; // Already running
  console.log('[Matching] Starting periodic sweep (every 2s)');
  sweepInterval = setInterval(runMatchingSweep, SWEEP_INTERVAL_MS);
  // Cleanup expired skips every 60 seconds
  cleanupInterval = setInterval(cleanupExpiredSkips, 60_000);
}

export function stopMatchingSweep(): void {
  if (sweepInterval) {
    clearInterval(sweepInterval);
    sweepInterval = null;
  }
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}
