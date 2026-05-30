import { DebateRoom, Message } from '../../types/index.js';
import { streamCompletion, FAST_MODEL } from '../llmClient.js';

export async function runInterrogator(
  room: DebateRoom,
  lastMessage: Message,
  onChunk: (chunk: string) => void
): Promise<string> {
  const messages = [
    {
      role: 'system' as const,
      content: `You are a Socratic Interrogator in a debate about: "${room.sharpened_topic || room.topic}".
You ONLY ask questions — never make statements or take sides.
Ask one sharp, probing question that exposes an assumption or logical gap in the last argument.
Under 40 words. End with a question mark.`,
    },
    {
      role: 'user' as const,
      content: `${lastMessage.sender_name} just said: "${lastMessage.content}"\n\nAsk one probing question:`,
    },
  ];

  return streamCompletion(messages, onChunk, FAST_MODEL);
}
