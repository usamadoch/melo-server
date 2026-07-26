// Maps userId -> Set<socketId>
// A user can have multiple concurrent sockets (SidebarLayout + ChatTemplate)
const onlineUsers = new Map<string, Set<string>>();

export function addOnlineUser(userId: string, socketId: string) {
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId)!.add(socketId);
}

export function removeOnlineUser(userId: string, socketId: string) {
  const sockets = onlineUsers.get(userId);
  if (sockets) {
    sockets.delete(socketId);
    // Only remove user entirely if they have no sockets left
    if (sockets.size === 0) {
      onlineUsers.delete(userId);
    }
  }
}

// Returns the "primary" socket for a user (first registered, i.e., SidebarLayout socket)
export function getSocketIdForUser(userId: string): string | undefined {
  const sockets = onlineUsers.get(userId);
  if (!sockets || sockets.size === 0) return undefined;
  return sockets.values().next().value; // Returns first socket in the set
}

export function getOnlineUserIds(): string[] {
  return Array.from(onlineUsers.keys());
}

export function getUserIdFromSocket(socketId: string): string | undefined {
  for (const [userId, sockets] of onlineUsers.entries()) {
    if (sockets.has(socketId)) {
      return userId;
    }
  }
  return undefined;
}
