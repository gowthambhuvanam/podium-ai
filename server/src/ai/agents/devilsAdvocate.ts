import { DebateRoom, Stance } from '../../types/index.js';
import { completion, FAST_MODEL } from '../llmClient.js';

// Devil's Advocate is now an on-demand LIFELINE for the losing side.
// When a trailing side spends a heart, this gives them sharp counter-
// arguments to throw at the winning side right now. Private to that side.
export async function runLifeline(
  room: DebateRoom,
  stance: Stance
): Promise<string> {
  const recent = room.messages
    .slice(-8)
    .map(m => `${m.sender_name} (${m.is_ai ? 'AI' : 'Human'}): ${m.content}`)
    .join('\n');

  const yourSide = stance.toUpperCase();
  const opposing = stance === 'for' ? 'AGAINST' : 'FOR';

  const messages = [
    {
      role: 'system' as const,
      content: `You are a sharp debate strategist helping the ${yourSide} side, which is currently losing. Give them powerful counter-arguments to hit the ${opposing} side with right now.

Rules:
- Give 2 concrete, aggressive counter-points that directly attack the opposing side's strongest recent claims.
- Be specific and tactical. These are weapons they can deploy immediately.
- No greetings, no fluff. Just the ammunition.
- Under 90 words total. Use short punchy lines.`,
    },
    {
      role: 'user' as const,
      content: `Topic: "${room.sharpened_topic || room.topic}"

Recent debate:
${recent}

Give the ${yourSide} side counter-arguments to turn this around:`,
    },
  ];

  return completion(messages, FAST_MODEL, 220);
}
