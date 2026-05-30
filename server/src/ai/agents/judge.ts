import { DebateRoom, Message, DebateVerdict, PerformanceCard } from '../../types/index.js';
import { completion, ANALYSIS_MODEL } from '../llmClient.js';

export async function runJudge(
  room: DebateRoom,
  allMessages: Message[]
): Promise<DebateVerdict> {
  const transcript = allMessages
    .filter(m => !m.is_ai || m.ai_role === 'participant')
    .map(m => `[${m.sender_name}]: ${m.content}`)
    .join('\n');

  const participantNames = room.participants
    .filter(p => !p.is_ai)
    .map(p => `${p.name} (${p.stance})`)
    .join(', ');

  const verdictPrompt = [
    {
      role: 'system' as const,
      content: `You are an expert debate judge. Analyze this debate and return ONLY valid JSON.`,
    },
    {
      role: 'user' as const,
      content: `Topic: "${room.sharpened_topic || room.topic}"
Participants: ${participantNames}

Transcript:
${transcript}

Return this JSON:
{
  "winner": "<FOR side or AGAINST side or Draw>",
  "reasoning": "<2-3 sentences explaining who won and why>",
  "key_moments": ["<moment 1>", "<moment 2>", "<moment 3>"],
  "final_scores": { "for": <0-100>, "against": <0-100> },
  "mind_shift": "<one sentence on how the debate shifted opinion>",
  "performance_cards": [
    {
      "user_name": "<name>",
      "strongest_argument": "<their best point in one sentence>",
      "weakest_argument": "<their weakest point in one sentence>",
      "fallacy_count": <number>,
      "logic_score": <0-100>,
      "evidence_score": <0-100>,
      "overall_score": <0-100>,
      "what_you_missed": "<strongest counterargument they never made>"
    }
  ]
}`,
    },
  ];

  const raw = await completion(verdictPrompt, ANALYSIS_MODEL, 1200);

  try {
    const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      winner: parsed.winner,
      reasoning: parsed.reasoning,
      key_moments: parsed.key_moments || [],
      final_scores: parsed.final_scores || { for: 50, against: 50 },
      performance_cards: (parsed.performance_cards || []).map((card: PerformanceCard & { user_name: string }) => ({
        user_id: room.participants.find(p => p.name === card.user_name)?.user_id || '',
        user_name: card.user_name,
        strongest_argument: card.strongest_argument,
        weakest_argument: card.weakest_argument,
        fallacy_count: card.fallacy_count || 0,
        logic_score: card.logic_score || 50,
        evidence_score: card.evidence_score || 50,
        overall_score: card.overall_score || 50,
        what_you_missed: card.what_you_missed,
      })),
      mind_shift: parsed.mind_shift,
    };
  } catch {
    return {
      winner: 'Draw',
      reasoning: 'The debate was closely contested with strong arguments on both sides.',
      key_moments: [],
      final_scores: { for: 50, against: 50 },
      performance_cards: [],
      mind_shift: 'The debate explored multiple perspectives on the topic.',
    };
  }
}
