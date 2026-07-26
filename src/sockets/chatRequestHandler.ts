import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { getSocketIdForUser } from './onlineUsersManager.js';
import { User } from '../models/User.js';
import { Profile } from '../models/Profile.js';

const pendingRequests = new Map<string, Set<string>>();

export function setupChatRequestHandler(io: Server, socket: Socket) {
  const token = socket.handshake.auth?.token;
  if (!token) return;

  let userId: string;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as { userId: string };
    userId = decoded.userId;
  } catch (err) {
    return;
  }

  socket.on('send_chat_request', async ({ targetUserId }) => {
    const targetSocketId = getSocketIdForUser(targetUserId);
    if (!targetSocketId) {
      socket.emit('chat_request_failed', { targetUserId, message: 'User is offline' });
      return;
    }

    // Fetch requester info to send to target
    const user = await User.findById(userId);
    const profile = await Profile.findOne({ userId });

    const requestPayload = {
      id: userId,
      name: user?.name || 'Unknown User',
      avatarUrl: user?.avatar,
      info: profile?.bio || '',
      tags: profile?.interests || [],
      availability: 'available'
    };

    if (!pendingRequests.has(socket.id)) pendingRequests.set(socket.id, new Set());
    pendingRequests.get(socket.id)!.add(targetUserId);

    io.to(targetSocketId).emit('incoming_chat_request', requestPayload);
  });

  socket.on('accept_chat_request', ({ requesterUserId }) => {
    const requesterSocketId = getSocketIdForUser(requesterUserId);
    if (!requesterSocketId) {
      socket.emit('chat_request_failed', { targetUserId: requesterUserId, message: 'Requester is offline' });
      return;
    }

    const roomId = `direct_room_${requesterUserId}_${userId}_${Date.now()}`;

    // Do NOT join the SidebarLayout sockets to the room.
    // Only the ChatTemplate sockets should be in the room (via join_direct_room).
    // This prevents signal echo from having 4 sockets in the same room.

    const requesterSocket = io.sockets.sockets.get(requesterSocketId);

    // Notify both to transition to call view
    socket.emit('chat_request_accepted', { roomId, remoteUserId: requesterUserId, initiator: false });
    if (requesterSocket) {
      requesterSocket.emit('chat_request_accepted', { roomId, remoteUserId: userId, initiator: true });
    }
  });

  socket.on('join_direct_room', ({ roomId }) => {
    if (roomId && roomId.startsWith('direct_room_')) {
      socket.join(roomId);
    }
  });

  socket.on('end_call', ({ roomId }) => {
    // Broadcast call_ended to everyone else in the room
    if (roomId && roomId.startsWith('direct_room_')) {
      socket.to(roomId).emit('call_ended');
      socket.leave(roomId);
    }
  });

  // --- WebRTC signaling for direct calls ---
  // Signals are forwarded via the direct_room the socket has joined.
  // This ensures the correct socket receives them (not the sidebar socket).
  const getDirectRoom = () => Array.from(socket.rooms).find(r => r.startsWith('direct_room_'));

  socket.on('webrtc_offer', ({ offer, to }) => {
    const room = getDirectRoom();
    if (room) {
      socket.to(room).emit('webrtc_offer', { offer, from: userId });
    }
  });

  socket.on('webrtc_answer', ({ answer, to }) => {
    const room = getDirectRoom();
    if (room) {
      socket.to(room).emit('webrtc_answer', { answer, from: userId });
    }
  });

  socket.on('webrtc_ice_candidate', ({ candidate, to }) => {
    const room = getDirectRoom();
    if (room) {
      socket.to(room).emit('webrtc_ice_candidate', { candidate, from: userId });
    }
  });

  socket.on('reject_chat_request', ({ requesterUserId }) => {
    const requesterSocketId = getSocketIdForUser(requesterUserId);
    if (requesterSocketId) {
      io.to(requesterSocketId).emit('chat_request_rejected', { targetUserId: userId });

      // Cleanup pending request
      const targets = pendingRequests.get(requesterSocketId);
      if (targets) targets.delete(userId);
    }
  });

  socket.on('disconnect', () => {
    const targets = pendingRequests.get(socket.id);
    if (targets) {
      targets.forEach(targetId => {
        const targetSocketId = getSocketIdForUser(targetId);
        if (targetSocketId) {
          io.to(targetSocketId).emit('chat_request_cancelled', { requesterUserId: userId });
        }
      });
      pendingRequests.delete(socket.id);
    }
  });
}
