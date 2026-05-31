import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { getRoom, updateRoom } from './roomManager.js';
import {
  orchestrateAgents,
  detectFallacies,
  updateMomentum,
  runJudge,
} from '../ai/agentOrchestrator.js';
import { Message, AIRole } from '../types/index.js';
import { supabase } from '../db/supabase.js';

const ROLE_LABELS: Record<AIRole, string> = {
  participant: 'AI Participant',
  devils_advocate: "Devil's Advocate",
  interrogator: 'Socratic Interrogator',
  coach: 'Coach',
  steelman: 'Steelman',
  judge: 'Judge',
};

export function registerEventHandlers(io: Server, socket: Socket) {
  // Join debate room
  socket.on('join_room', async ({ debate_id, user_id, user_name, stance }) => {
    try {
      socket.join(debate_id);

      const room = getRoom(debate_id);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      // Add participant if not already in room
      const existing = room.participants.find(p => p.user_id === user_id);
      if (!existing) {
        room.participants.push({
          id: uuidv4(),
          user_id,
          name: user_name,
          stance,
          is_ai: false,
          socket_id: socket.id,
        });
        updateRoom(debate_id, { participants: room.participants });
      } else {
        existing.socket_id = socket.id;
        updateRoom(debate_id, { participants: room.participants });
      }

      socket.emit('room_joined', {
        room: getRoom(debate_id),
      });

      socket.to(debate_id).emit('participant_joined', {
        user_id,
        user_name,
        stance,
      });

      console.log(`${user_name} joined room ${debate_id}`);
    } catch (err) {
      console.error('join_room error:', err);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // Send message
  socket.on('send_message', async ({ debate_id, user_id, user_name, content, stance }) => {
    try {
      const room = getRoom(debate_id);
      if (!room || room.status !== 'active') return;

      // Detect fallacies in the message
      const fallacies = await detectFallacies(content);

      const message: Message = {
        id: uuidv4(),
        debate_id,
        sender_id: user_id,
        sender_name: user_name,
        content,
        is_ai: false,
        fallacies,
        timestamp: new Date().toISOString(),
      };

      room.messages.push(message);

      // Update momentum
      const newMomentum = updateMomentum(room.momentum, message, room);
      updateRoom(debate_id, {
        messages: room.messages,
        momentum: newMomentum,
      });

      // Broadcast message to room
      io.to(debate_id).emit('new_message', message);

      // Broadcast momentum update
      io.to(debate_id).emit('momentum_update', newMomentum);

      // Broadcast fallacy detection if any found
      if (fallacies.length > 0) {
        io.to(debate_id).emit('fallacy_detected', {
          message_id: message.id,
          sender_name: user_name,
          fallacies,
        });
      }

      // Only let AI agents respond to substantive arguments, not short
      // fragments or meta-remarks like "remote work actually"
      const wordCount = content.trim().split(/\s+/).length;
      const isSubstantive = wordCount >= 5;

      // Run AI agents if any are selected and the message is a real argument
      if (isSubstantive && room.ai_roles.length > 0 && !room.ai_roles.every(r => r === 'judge')) {
        const updatedRoom = getRoom(debate_id)!;

        await orchestrateAgents(
          updatedRoom,
          message,
          (output, chunk, done) => {
            if (output.role === 'coach') {
              // Coach messages go privately to the target stance players
              if (done && output.content) {
                const targetSockets = room.participants
                  .filter(p => p.stance === output.targetStance && p.socket_id)
                  .map(p => p.socket_id!);

                targetSockets.forEach(socketId => {
                  io.to(socketId).emit('coach_whisper', {
                    content: output.content,
                    stance: output.targetStance,
                  });
                });
              }
            } else {
              // Public agents stream to the whole room
              if (!done && chunk) {
                io.to(debate_id).emit('ai_chunk', {
                  role: output.role,
                  label: ROLE_LABELS[output.role],
                  chunk,
                });
              }
              if (done && output.content) {
                const aiMessage: Message = {
                  id: uuidv4(),
                  debate_id,
                  sender_id: `ai_${output.role}`,
                  sender_name: ROLE_LABELS[output.role],
                  content: output.content,
                  is_ai: true,
                  ai_role: output.role,
                  timestamp: new Date().toISOString(),
                };

                const currentRoom = getRoom(debate_id);
                if (currentRoom) {
                  currentRoom.messages.push(aiMessage);
                  updateRoom(debate_id, { messages: currentRoom.messages });
                }

                io.to(debate_id).emit('ai_message_complete', aiMessage);
              }
            }
          }
        );
      }
    } catch (err) {
      console.error('send_message error:', err);
    }
  });

  // Start debate
  socket.on('start_debate', ({ debate_id }) => {
    const room = updateRoom(debate_id, { status: 'active' });
    if (room) {
      io.to(debate_id).emit('debate_started', { room });
    }
  });

  // End debate and run judge
  socket.on('end_debate', async ({ debate_id }) => {
    try {
      const room = getRoom(debate_id);
      if (!room) return;

      updateRoom(debate_id, { status: 'completed' });
      io.to(debate_id).emit('debate_ending', { message: 'Debate ended. Generating verdict...' });

      const verdict = await runJudge(room, room.messages);

      // Save to Supabase
      await supabase.from('debates').update({ status: 'completed' }).eq('id', debate_id);
      await supabase.from('analysis').insert({
        id: uuidv4(),
        debate_id,
        verdict: verdict.winner,
        transcript: room.messages,
        momentum_data: room.momentum,
        created_at: new Date().toISOString(),
      });

      io.to(debate_id).emit('debate_ended', { verdict });
    } catch (err) {
      console.error('end_debate error:', err);
      socket.emit('error', { message: 'Failed to generate verdict' });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
}
