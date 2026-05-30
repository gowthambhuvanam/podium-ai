import { DebateRoom, Message, Stance } from '../../types/index.js';
import { completion, FAST_MODEL } from '../llmClient.js';

export async function runCoach(
  room: DebateRoom,
  recentMessages: Message[],
  targetStance: Stance
): Promise<string> {
  const context = recentMessages
    .slice(-4)
    .map(m => `${m.sender_name}: ${m.content}`)
    .join('\n');

  const messages = [
    {
      role: 'system' as const,
      content: `You are a private debate coach whispering advice to the ${targetStance.toUpperCase()} side.
Topic: "${room.sharpened_topic || room.topic}".
Give one specific, tactical suggestion they can use RIGHT NOW in their next argument.
Under 50 words. Be direct. Start with an action verb.`,
    },
    {
      role: 'user' as const,
      content: `Recent debate:\n${context}\n\nPrivate tip for the ${targetStance} side:`,
    },
  ];

  const response = await completion(messages, FAST_MODEL, 150);
  return response;
}
