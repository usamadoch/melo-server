import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import {
  addUserToPool,
  removeUserFromPool,
  removeUserFromPoolBySocket,
  addSkippedPair,
  matchEmitter,
  type MatchResult,
} from '../matching/matchingService.js';

function getMatchRooms(socket: Socket) {
  return Array.from(socket.rooms).filter(r => r.startsWith('room_') && !r.startsWith('direct_room_'));
}

function leaveAllMatchRooms(socket: Socket) {
  const rooms = getMatchRooms(socket);
  for (const r of rooms) {
    socket.to(r).emit('peer_disconnected');
    socket.leave(r);
  }
}

export function setupMatchingHandler(io: Server, socket: Socket) {
  const token = socket.handshake.auth?.token;
  if (!token) {
    socket.disconnect();
    return;
  }

  let userId: string;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as { userId: string };
    userId = decoded.userId;
  } catch (err) {
    socket.disconnect();
    return;
  }

  // ─── Listen for matches from the sweep engine ────────────────────
  const onMatch = (result: MatchResult) => {
    const isA = result.userA.userId === userId;
    const isB = result.userB.userId === userId;
    if (!isA && !isB) return;

    const peer = isA ? result.userB : result.userA;
    const isInitiator = isA; // userA is always the initiator

    socket.join(result.roomId);

    // Also join the peer if their socket is still connected
    const peerSocket = io.sockets.sockets.get(peer.socketId);
    if (peerSocket) {
      peerSocket.join(result.roomId);
    }

    socket.emit('match_found', { remoteUserId: peer.userId, initiator: isInitiator });
    if (peerSocket) {
      peerSocket.emit('match_found', { remoteUserId: userId, initiator: !isInitiator });
    }
  };

  matchEmitter.on('match', onMatch);

  // ─── Socket events ────────────────────────────────────────────────
  socket.on('join_queue', async () => {
    leaveAllMatchRooms(socket);
    await addUserToPool(userId, socket.id);
    // The periodic sweep will handle matching — no synchronous findMatch call
  });

  socket.on('leave_queue', () => {
    removeUserFromPoolBySocket(socket.id);
    leaveAllMatchRooms(socket);
  });

  socket.on('next_match', async (data?: { skippedUserId?: string }) => {
    leaveAllMatchRooms(socket);

    // Record the skip so they don't get re-matched immediately
    if (data?.skippedUserId) {
      addSkippedPair(userId, data.skippedUserId);
    }

    // Re-enter the pool; the sweep will handle finding a new match
    await addUserToPool(userId, socket.id);
  });

  // ─── WebRTC signaling (unchanged) ─────────────────────────────────
  socket.on('webrtc_offer', ({ offer, to }) => {
    getMatchRooms(socket).forEach(r => socket.to(r).emit('webrtc_offer', { offer, from: userId }));
  });

  socket.on('webrtc_answer', ({ answer, to }) => {
    getMatchRooms(socket).forEach(r => socket.to(r).emit('webrtc_answer', { answer, from: userId }));
  });

  socket.on('webrtc_ice_candidate', ({ candidate, to }) => {
    getMatchRooms(socket).forEach(r => socket.to(r).emit('webrtc_ice_candidate', { candidate, from: userId }));
  });

  // ─── Disconnect ────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    removeUserFromPoolBySocket(socket.id);
    matchEmitter.removeListener('match', onMatch);
    // Since socket is disconnecting, leave isn't strictly needed, but emit is.
    getMatchRooms(socket).forEach(r => socket.to(r).emit('peer_disconnected'));
  });
}
