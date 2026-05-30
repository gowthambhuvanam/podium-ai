import { DebateRoom } from '../types/index.js';

// In-memory room storage
// In production this would be Redis for multi-instance support
const rooms = new Map<string, DebateRoom>();

export function createRoom(room: DebateRoom): void {
  rooms.set(room.id, room);
}

export function getRoom(roomId: string): DebateRoom | undefined {
  return rooms.get(roomId);
}

export function updateRoom(roomId: string, updates: Partial<DebateRoom>): DebateRoom | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  const updated = { ...room, ...updates };
  rooms.set(roomId, updated);
  return updated;
}

export function deleteRoom(roomId: string): void {
  rooms.delete(roomId);
}

export function getAllRooms(): DebateRoom[] {
  return Array.from(rooms.values());
}

export function getRoomCount(): number {
  return rooms.size;
}
