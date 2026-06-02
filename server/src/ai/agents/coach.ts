import { DebateRoom, Message } from '../../types/index.js';
import { completion, FAST_MODEL } from '../llmClient.js';

// The Coach critiques HOW the user phrased their own message — delivery,
// clarity, structure, persuasiveness. It does NOT add new arguments or
// strategy. Think speaking/writing coach, not a teammate feeding you ideas.
export async function runCoach(
  room: DebateRoom,
  lastMessage: Message
): Promise<string> {
  // Skip greetings / very short messages — nothing to coach
  const wordCount = lastMessage.content.trim().split(/\s+/).length;
  if (wordCount < 5) return '';

  const messages = [
    {
      role: 'system' as const,
      content: `You are a debate delivery coach. The user just made an argument. Critique ONLY how they said it — clarity, structure, conciseness, tone, and persuasive impact. Do NOT give them new arguments, evidence, or strategy. Do NOT take a side.

Rules:
- If the phrasing could be stronger, show them a tighter or more compelling way to say the SAME point. You may quote a short improved version.
- If it was already well delivered, say so briefly in one line.
- Speak directly to the user, like a coach. Under 45 words.
- Focus on delivery, never on content.`,
    },
    {
      role: 'user' as const,
      content: `Topic: "${room.sharpened_topic || room.topic}"
The user said: "${lastMessage.content}"

Give them quick delivery feedback on how they phrased it:`,
    },
  ];

  return completion(messages, FAST_MODEL, 120);
}
