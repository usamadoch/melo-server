import { Server, Socket } from 'socket.io';
import { ModerationService } from '../ratings/moderationService.js';
import { ChatMessage } from '../models/ChatMessage.js';
import { SeverityTier } from '../config/severityMap.js';
import jwt from 'jsonwebtoken';

// In-memory tracker for consecutive MODERATE offenses per user per room
// Key format: `${roomId}_${userId}`
const moderateOffenseTracker = new Map<string, number>();

export function setupChatMessageHandler(io: Server, socket: Socket) {
  const token = socket.handshake.auth?.token;
  if (!token) return;

  let userId: string;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as { userId: string };
    userId = decoded.userId;
  } catch (err) {
    return;
  }

  socket.on('chat_message', async ({ matchId, toUserId, text }) => {
    if (!matchId || !toUserId || !text) return;

    // Verify the socket is actually in the room (prevents spoofing)
    if (!socket.rooms.has(matchId)) {
      return;
    }

    try {
      // Real-time moderation check
      const result = await ModerationService.checkTextToxicity(matchId, userId, text);
      const severity = result.severityTier || SeverityTier.MINOR;

      if (severity === SeverityTier.CRITICAL || severity === SeverityTier.SEVERE) {
        // Block message
        await ChatMessage.create({
          matchId,
          fromUserId: userId,
          toUserId,
          text,
          status: 'BLOCKED'
        });
        
        socket.emit('chat_error', { 
          text, 
          message: 'Your message was blocked due to a community guidelines violation.' 
        });

        // The ModerationService has already applied the matchingPaused/isSuspended penalty
        // We will also end the call for them since it's a severe violation
        socket.to(matchId).emit('call_ended');
        socket.leave(matchId);
        socket.emit('call_ended');
        return;
      }

      if (severity === SeverityTier.MODERATE) {
        // Track moderate offenses
        const trackerKey = `${matchId}_${userId}`;
        const currentCount = (moderateOffenseTracker.get(trackerKey) || 0) + 1;
        moderateOffenseTracker.set(trackerKey, currentCount);

        if (currentCount >= 3) {
          // Escalation logic: treat as SEVERE
          await ChatMessage.create({
            matchId,
            fromUserId: userId,
            toUserId,
            text,
            status: 'BLOCKED'
          });

          socket.emit('chat_error', { 
            text, 
            message: 'Your message was blocked. You have been repeatedly warned for inappropriate behavior.' 
          });

          // End call
          socket.to(matchId).emit('call_ended');
          socket.leave(matchId);
          socket.emit('call_ended');
          return;
        }
      }

      // MINOR or CLEAN or MODERATE (under threshold): Deliver message
      const savedMessage = await ChatMessage.create({
        matchId,
        fromUserId: userId,
        toUserId,
        text,
        status: 'DELIVERED'
      });

      // Broadcast to everyone else in the room
      socket.to(matchId).emit('chat_message', {
        _id: savedMessage._id,
        matchId,
        fromUserId: userId,
        toUserId,
        text,
        status: 'DELIVERED',
        createdAt: savedMessage.createdAt
      });

    } catch (err) {
      console.error('Error handling chat message:', err);
    }
  });

  // Cleanup tracker on leave
  socket.on('disconnect', () => {
    // We don't have the exact roomId here easily, but we can clean up 
    // by relying on the call end logic or periodic cleanup if it grows too large.
    // Given the short lived nature, we could just iterate and delete.
    for (const key of moderateOffenseTracker.keys()) {
      if (key.endsWith(`_${userId}`)) {
        moderateOffenseTracker.delete(key);
      }
    }
  });
}
