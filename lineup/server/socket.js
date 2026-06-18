// Holds the Socket.io server instance plus a couple of room helpers so route
// handlers can emit real-time events without importing the whole app.
let io = null;

export const NYC_ROOM = 'nyc_bars';

export function setIo(instance) {
  io = instance;
}

export function getIo() {
  return io;
}

// Per-user room used to push friend_checkin events to a specific person.
export function userRoom(userId) {
  return `user:${userId}`;
}

// Broadcast an updated wait time to everyone watching the map.
export function emitWaitUpdated(payload) {
  if (io) io.to(NYC_ROOM).emit('wait_updated', payload);
}

// Push a friend check-in toast to each friend's personal room.
export function emitFriendCheckin(friendUserIds, payload) {
  if (!io) return;
  for (const uid of friendUserIds) {
    io.to(userRoom(uid)).emit('friend_checkin', payload);
  }
}
