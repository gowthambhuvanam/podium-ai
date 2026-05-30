import { DebateRoom, Message } from '../../types/index.js';
import { streamCompletion, FAST_MODEL } from '../llmClient.js';

export async function runSteelman(
  room: DebateRoom,
  recentMessages: Message[],
  momentum: { for: number; against: number },
  onChunk: (chunk: string) => void
): Promise<string> {
  const weakerSide = momentum.for < momentum.against ? 'FOR' : 'AGAINST';

  const weakArguments = recentMessages
    .filter(m => {
      const participant = room.participants.find(p => p.user_id === m.sender_id);
      return participant?.stance === weakerSide.toLowerCase();
    })
    .slice(-2)
    .map(m => m.content)
    .join(' | ');

  const messages = [
    {
      role: 'system' as const,
      content: `You are the Steelman agent in a debate about: "${room.sharpened_topic || room.topic}".
Your job is to take the weakest argument and present the strongest possible version of it.
You are strengthening the ${weakerSide} side. Under 80 words. Be intellectually rigorous.`,
    },
    {
      role: 'user' as const,
      content: `Weak ${weakerSide} arguments so far: "${weakArguments || 'No arguments yet'}"\n\nPresent the strongest version of the ${weakerSide} position:`,
    },
  ];

  return streamCompletion(messages, onChunk, FAST_MODEL);
}
