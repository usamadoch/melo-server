import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { addUserToQueue, removeUserFromQueue, removeUserFromQueueBySocket, findMatch } from '../matching/matchingService.js';

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

  socket.on('join_queue', async () => {
    leaveAllMatchRooms(socket);

    const user = await addUserToQueue(userId, socket.id);
    if (!user) return;

    const match = findMatch(user);

    if (match) {
      removeUserFromQueue(user.userId);
      removeUserFromQueue(match.userId);

      const roomId = `room_${user.userId}_${match.userId}`;

      socket.join(roomId);
      
      const matchSocket = io.sockets.sockets.get(match.socketId);
      if (matchSocket) {
        matchSocket.join(roomId);
      }

      socket.emit('match_found', { remoteUserId: match.userId, initiator: true });
      if (matchSocket) {
        matchSocket.emit('match_found', { remoteUserId: user.userId, initiator: false });
      }
    }
  });

  socket.on('leave_queue', () => {
    removeUserFromQueueBySocket(socket.id);
    leaveAllMatchRooms(socket);
  });

  socket.on('next_match', async () => {
    leaveAllMatchRooms(socket);
    
    const user = await addUserToQueue(userId, socket.id);
    if (!user) return;
    
    const match = findMatch(user);
    if (match) {
      removeUserFromQueue(user.userId);
      removeUserFromQueue(match.userId);
      
      const roomId = `room_${user.userId}_${match.userId}`;
      
      socket.join(roomId);
      const matchSocket = io.sockets.sockets.get(match.socketId);
      if (matchSocket) matchSocket.join(roomId);
      
      socket.emit('match_found', { remoteUserId: match.userId, initiator: true });
      if (matchSocket) matchSocket.emit('match_found', { remoteUserId: user.userId, initiator: false });
    }
  });

  socket.on('webrtc_offer', ({ offer, to }) => {
    getMatchRooms(socket).forEach(r => socket.to(r).emit('webrtc_offer', { offer, from: userId }));
  });

  socket.on('webrtc_answer', ({ answer, to }) => {
    getMatchRooms(socket).forEach(r => socket.to(r).emit('webrtc_answer', { answer, from: userId }));
  });

  socket.on('webrtc_ice_candidate', ({ candidate, to }) => {
    getMatchRooms(socket).forEach(r => socket.to(r).emit('webrtc_ice_candidate', { candidate, from: userId }));
  });

  socket.on('disconnect', () => {
    removeUserFromQueueBySocket(socket.id);
    // Since socket is disconnecting, leave isn't strictly needed, but emit is.
    getMatchRooms(socket).forEach(r => socket.to(r).emit('peer_disconnected'));
  });
}
