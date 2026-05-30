import { Server } from 'socket.io';
import { registerEventHandlers } from './eventHandlers.js';

export function initializeSocket(io: Server) {
  io.on('connection', socket => {
    console.log(`Socket connected: ${socket.id}`);
    registerEventHandlers(io, socket);
  });
}
