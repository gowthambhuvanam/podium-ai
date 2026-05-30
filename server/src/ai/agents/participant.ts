import { DebateRoom, Message } from '../../types/index.js';
import { streamCompletion, FAST_MODEL } from '../llmClient.js';

export async function runParticipant(
  room: DebateRoom,
  recentMessages: Message[],
  onChunk: (chunk: string) => void
): Promise<string> {
  const context = recentMessages
    .slice(-6)
    .map(m => `${m.sender_name} (${m.is_ai ? 'AI' : 'Human'}): ${m.content}`)
    .join('\n');

  const forCount = room.participants.filter(p => p.stance === 'for').length;
  const againstCount = room.participants.filter(p => p.stance === 'against').length;
  const myStance = forCount <= againstCount ? 'FOR' : 'AGAINST';

  const messages = [
    {
      role: 'system' as const,
      content: `You are an active debate participant arguing ${myStance} the topic: "${room.sharpened_topic || room.topic}".
You debate like a skilled human — use evidence, logic, and occasional rhetorical devices.
Skill level: ${room.skill_level}. Keep responses under 80 words. Be direct and compelling.
Do NOT start with "I" or greetings. Jump straight into your argument.`,
    },
    {
      role: 'user' as const,
      content: `Recent debate:\n${context}\n\nMake your next argument as a ${myStance} participant:`,
    },
  ];

  return streamCompletion(messages, onChunk, FAST_MODEL);
}
