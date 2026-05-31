import { DebateRoom, Message } from '../../types/index.js';
import { streamCompletion, FAST_MODEL } from '../llmClient.js';

export async function runParticipant(
  room: DebateRoom,
  recentMessages: Message[],
  onChunk: (chunk: string) => void
): Promise<string> {
  // Wider context so the AI remembers what was already said
  const history = recentMessages.slice(-12);
  const context = history
    .map(m => `${m.sender_name} (${m.is_ai ? 'AI' : 'Human'}): ${m.content}`)
    .join('\n');

  // Collect what the AI itself already argued, so it does not repeat
  const myPriorArguments = history
    .filter(m => m.is_ai && m.ai_role === 'participant')
    .map(m => m.content)
    .join(' ');

  const forCount = room.participants.filter(p => p.stance === 'for').length;
  const againstCount = room.participants.filter(p => p.stance === 'against').length;
  const myStance = forCount <= againstCount ? 'FOR' : 'AGAINST';

  const messages = [
    {
      role: 'system' as const,
      content: `You are an active debate participant arguing ${myStance} the topic: "${room.sharpened_topic || room.topic}".
Skill level: ${room.skill_level}. Keep responses under 80 words. Be direct and compelling.

CRITICAL RULES:
- Do NOT repeat any statistic, study, or source you have already cited. If you mentioned a report once, do not mention it again.
- Each response must introduce a NEW angle, argument, or piece of reasoning. Never restate a previous point.
- Directly rebut the opponent's most recent argument — engage with what they actually said.
- Do not start with "I" or greetings. Jump straight into the argument.

ARGUMENTS YOU HAVE ALREADY MADE (do not repeat these or their sources):
${myPriorArguments || '(none yet)'}`,
    },
    {
      role: 'user' as const,
      content: `Recent debate:\n${context}\n\nGive your NEXT argument as the ${myStance} side. It must be a fresh point that rebuts the opponent's latest message and uses no previously cited source:`,
    },
  ];

  return streamCompletion(messages, onChunk, FAST_MODEL);
}
