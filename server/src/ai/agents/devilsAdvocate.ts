import { DebateRoom, Message } from '../../types/index.js';
import { streamCompletion, FAST_MODEL } from '../llmClient.js';

export async function runDevilsAdvocate(
  room: DebateRoom,
  recentMessages: Message[],
  momentum: { for: number; against: number },
  onChunk: (chunk: string) => void
): Promise<string> {
  const winningSide = momentum.for > momentum.against ? 'FOR' : 'AGAINST';
  const losingSide = winningSide === 'FOR' ? 'AGAINST' : 'FOR';

  const context = recentMessages
    .slice(-4)
    .map(m => `${m.sender_name}: ${m.content}`)
    .join('\n');

  const messages = [
    {
      role: 'system' as const,
      content: `You are the Devil's Advocate in a debate about: "${room.sharpened_topic || room.topic}".
The ${winningSide} side is currently winning. Your job is to challenge them and strengthen the ${losingSide} side.
Be provocative but intellectually honest. Under 70 words. No pleasantries.`,
    },
    {
      role: 'user' as const,
      content: `Recent debate:\n${context}\n\nChallenge the winning ${winningSide} side:`,
    },
  ];

  return streamCompletion(messages, onChunk, FAST_MODEL);
}
