import { ProfileRepository } from '../profiles/profileRepository.js';

interface QueuedUser {
  userId: string;
  socketId: string;
  interests: string[];
}

// In-memory queue
let searchQueue: QueuedUser[] = [];

export async function addUserToQueue(userId: string, socketId: string): Promise<QueuedUser | null> {
  const profile = await ProfileRepository.findByUserId(userId);
  const interests = profile?.interests || [];

  const queuedUser: QueuedUser = { userId, socketId, interests };
  
  // Remove if already in queue
  searchQueue = searchQueue.filter(u => u.userId !== userId);
  
  searchQueue.push(queuedUser);
  return queuedUser;
}

export function removeUserFromQueue(userId: string): void {
  searchQueue = searchQueue.filter(u => u.userId !== userId);
}

export function removeUserFromQueueBySocket(socketId: string): void {
  searchQueue = searchQueue.filter(u => u.socketId !== socketId);
}

export function findMatch(user: QueuedUser): QueuedUser | null {
  // Simple algorithm: find first person with at least one common interest
  // If none found after checking all, just pick the first available (fallback for MVP)
  
  const possibleMatches = searchQueue.filter(u => u.userId !== user.userId);
  
  if (possibleMatches.length === 0) {
    return null; // No one available
  }

  // 1. Try to find match with common interest
  for (const candidate of possibleMatches) {
    const hasCommonInterest = candidate.interests.some(interest => 
      user.interests.includes(interest)
    );
    
    if (hasCommonInterest) {
      return candidate;
    }
  }

  // 2. Fallback to any random user
  return possibleMatches[0] || null;
}
