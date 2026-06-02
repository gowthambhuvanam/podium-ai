import { DebateRoom, Message } from '../../types/index.js';
import { streamCompletion, FAST_MODEL } from '../llmClient.js';

// Decide whether the room is still greeting/warming up or actually debating.
// If everyone is just saying hi, the AI should greet back like a human and
// NOT launch into an argument yet.
function isStillGreeting(recent: Message[]): boolean {
  const humanMsgs = recent.filter(m => !m.is_ai);
  if (humanMsgs.length === 0) return true;
  const greetingPattern = /^(hi|hey|hello|yo|hiya|good (morning|evening|afternoon)|greetings|sup|what'?s up|hello all|hi all|let'?s start|lets start|ready|shall we|good luck|gl|howdy)[\s!.,]*$/i;
  // Still greeting if every recent human message is short and greeting-like
  return humanMsgs.slice(-4).every(m => {
    const words = m.content.trim().split(/\s+/).length;
    return words <= 5 || greetingPattern.test(m.content.trim());
  });
}

export async function runParticipant(
  room: DebateRoom,
  recentMessages: Message[],
  onChunk: (chunk: string) => void
): Promise<string> {
  const history = recentMessages.slice(-12);
  const context = history
    .map(m => `${m.sender_name} (${m.is_ai ? 'AI' : 'Human'}): ${m.content}`)
    .join('\n');

  const forCount = room.participants.filter(p => p.stance === 'for').length;
  const againstCount = room.participants.filter(p => p.stance === 'against').length;
  const myStance = forCount <= againstCount ? 'FOR' : 'AGAINST';

  // ── GREETING PHASE ──────────────────────────────────────────────────────
  if (isStillGreeting(history)) {
    const messages = [
      {
        role: 'system' as const,
        content: `You are a person about to take part in a friendly debate, arguing the ${myStance} side of: "${room.sharpened_topic || room.topic}".
Right now people are just greeting each other before starting. Respond like a real human would: a short, warm, casual greeting. Maybe a light line about being ready to debate. Do NOT make any arguments yet. Under 20 words. Sound natural, use contractions, no formal essay language.`,
      },
      {
        role: 'user' as const,
        content: `Chat so far:\n${context}\n\nGreet the room naturally as a fellow debater (no arguments yet):`,
      },
    ];
    return streamCompletion(messages, onChunk, FAST_MODEL);
  }

  // ── DEBATE PHASE ────────────────────────────────────────────────────────
  const myPriorArguments = history
    .filter(m => m.is_ai && m.ai_role === 'participant')
    .map(m => m.content)
    .join(' ');

  const messages = [
    {
      role: 'system' as const,
      content: `You are a real person debating the ${myStance} side of: "${room.sharpened_topic || room.topic}".
Skill level: ${room.skill_level}.

Sound HUMAN, not like an AI or an essay:
- Talk like a sharp person in a live debate. Use contractions and natural rhythm.
- React directly to what the other person just said. Quote or paraphrase them, then hit back.
- Do NOT open with a thesis statement or "The moral obligation to...". Just respond like a human would.
- Keep it under 70 words. Be punchy and direct.

CRITICAL:
- Never reuse a statistic, study, or source you already cited.
- Each turn must add a NEW point, not restate an old one.

Arguments you already made (do not repeat these or their sources):
${myPriorArguments || '(none yet)'}`,
    },
    {
      role: 'user' as const,
      content: `Debate so far:\n${context}\n\nRespond as the ${myStance} side. React to their latest point and make a fresh argument, sounding like a real person:`,
    },
  ];

  return streamCompletion(messages, onChunk, FAST_MODEL);
}
