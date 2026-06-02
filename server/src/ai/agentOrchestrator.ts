import { DebateRoom, Message, AIRole, Stance } from '../types/index.js';
import { completion, FAST_MODEL } from './llmClient.js';
import { runParticipant } from './agents/participant.js';
import { runInterrogator } from './agents/interrogator.js';
import { runCoach } from './agents/coach.js';
import { runLifeline } from './agents/devilsAdvocate.js';
import { runJudge } from './agents/judge.js';

export { runJudge, runLifeline };

export interface AgentOutput {
  role: AIRole;
  content: string;
  targetStance?: Stance;
  targetUserId?: string; // for private coach feedback to a specific sender
}

// Only these real, well-known fallacies may be flagged. This stops the
// model from inventing fake names like "Argumentum ad Interrupting".
const VALID_FALLACIES = new Set([
  'Hasty Generalization',
  'Unsubstantiated Claim',
  'Slippery Slope',
  'Ad Hominem',
  'Straw Man',
  'Appeal to Emotion',
  'False Dichotomy',
  'Circular Reasoning',
  'Appeal to Authority',
  'Red Herring',
]);

// Detect logical fallacies in a message
export async function detectFallacies(content: string): Promise<string[]> {
  // Skip trivial / meta / non-argument messages — these are not claims to judge
  const wordCount = content.trim().split(/\s+/).length;
  if (wordCount < 6) return [];

  const response = await completion(
    [
      {
        role: 'system',
        content: `You are a strict logical fallacy detector. ONLY flag a fallacy if the message makes a substantive argument AND clearly commits one of these exact fallacies:
Hasty Generalization, Unsubstantiated Claim, Slippery Slope, Ad Hominem, Straw Man, Appeal to Emotion, False Dichotomy, Circular Reasoning, Appeal to Authority, Red Herring.

Rules:
- If the message is a question, a casual remark, a complaint, or not an argument, return [].
- Do NOT invent fallacy names. Use ONLY the exact names from the list above.
- Be conservative. Most messages have zero fallacies. When unsure, return [].
- Return ONLY a JSON array. Max 2 fallacies.`,
      },
      {
        role: 'user',
        content: `Message: "${content}"\n\nReturn JSON array of fallacy names (or [] if none):`,
      },
    ],
    FAST_MODEL,
    80
  );

  try {
    const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];
    // Filter out anything not in our known list
    return parsed.filter((f: unknown) => typeof f === 'string' && VALID_FALLACIES.has(f)).slice(0, 2);
  } catch {
    return [];
  }
}

// Update momentum based on message quality
export function updateMomentum(
  current: { for: number; against: number },
  message: Message,
  room: DebateRoom
): { for: number; against: number } {
  const participant = room.participants.find(p => p.user_id === message.sender_id);
  if (!participant) return current;

  const qualityScore = Math.min(message.content.length / 10, 5);
  const fallacyPenalty = (message.fallacies?.length || 0) * 3;
  const delta = Math.max(0, qualityScore - fallacyPenalty);

  if (participant.stance === 'for') {
    return { for: Math.min(100, current.for + delta), against: current.against };
  } else if (participant.stance === 'against') {
    return { for: current.for, against: Math.min(100, current.against + delta) };
  }
  return current;
}

// Sharpen a vague topic into a clear proposition
export async function sharpenTopic(topic: string): Promise<string> {
  const response = await completion(
    [
      {
        role: 'system',
        content: `You sharpen vague debate topics into clear, arguable propositions. Return ONLY the sharpened topic, nothing else. Max 20 words.`,
      },
      { role: 'user', content: `Sharpen this topic: "${topic}"` },
    ],
    FAST_MODEL,
    60
  );
  return response.trim();
}

// Suggest debate topics for a category
export async function suggestTopics(category: string): Promise<string[]> {
  const response = await completion(
    [
      {
        role: 'system',
        content: `You generate engaging, debatable topics. Return ONLY a JSON array of 5 short debate topic strings. Each must be a clear, controversial, two-sided proposition. No numbering, no explanation.`,
      },
      { role: 'user', content: `Category: ${category}\n\nReturn a JSON array of 5 debate topics:` },
    ],
    FAST_MODEL,
    300
  );
  try {
    const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
  } catch {
    return [];
  }
}

// Predict which stance most people would take
export async function predictStance(topic: string): Promise<string> {
  const response = await completion(
    [
      {
        role: 'system',
        content: `You predict debate stance distributions. Return ONLY one sentence like: "Most people lean FOR this topic because X."`,
      },
      { role: 'user', content: `Topic: "${topic}"` },
    ],
    FAST_MODEL,
    80
  );
  return response.trim();
}

// Generate briefing packet for a participant
export async function generateBriefing(
  topic: string,
  stance: Stance,
  skillLevel: string
): Promise<{ keyArguments: string[]; counterarguments: string[]; statistics: string[] }> {
  const response = await completion(
    [
      {
        role: 'system',
        content: `You create debate briefing packets. Return ONLY valid JSON.`,
      },
      {
        role: 'user',
        content: `Topic: "${topic}", Stance: ${stance}, Skill level: ${skillLevel}
Return:
{
  "keyArguments": ["<arg1>", "<arg2>", "<arg3>"],
  "counterarguments": ["<counter1>", "<counter2>"],
  "statistics": ["<stat1>", "<stat2>"]
}`,
      },
    ],
    FAST_MODEL,
    400
  );

  try {
    const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return { keyArguments: [], counterarguments: [], statistics: [] };
  }
}

// Run all selected AI agents after a human message
export async function orchestrateAgents(
  room: DebateRoom,
  lastMessage: Message,
  onAgentMessage: (output: AgentOutput, chunk: string, done: boolean) => void
): Promise<AgentOutput[]> {
  const outputs: AgentOutput[] = [];
  const roles = room.ai_roles;

  // Run agents that respond publicly (streamed)
  const publicAgents: { role: AIRole; fn: () => Promise<string> }[] = [];

  if (roles.includes('participant')) {
    publicAgents.push({
      role: 'participant',
      fn: () =>
        runParticipant(room, room.messages, chunk =>
          onAgentMessage({ role: 'participant', content: '' }, chunk, false)
        ),
    });
  }

  // Note: Devil's Advocate no longer auto-posts — it is an on-demand
  // lifeline (handled separately via the use_lifeline socket event).

  if (roles.includes('interrogator')) {
    publicAgents.push({
      role: 'interrogator',
      fn: () =>
        runInterrogator(room, lastMessage, chunk =>
          onAgentMessage({ role: 'interrogator', content: '' }, chunk, false)
        ),
    });
  }

  // Run public agents sequentially with a short gap to stay under
  // Groq free-tier rate limits (bursts of parallel calls trigger 429s)
  const gap = (ms: number) => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < publicAgents.length; i++) {
    const agent = publicAgents[i];
    try {
      const content = await agent.fn();
      const output = { role: agent.role, content };
      outputs.push(output);
      onAgentMessage(output, '', true);
    } catch (err) {
      console.error(`Agent ${agent.role} failed:`, err);
    }
    if (i < publicAgents.length - 1) await gap(700);
  }

  // Coach critiques HOW the sender phrased their own message (delivery
  // feedback), and is sent privately back to that sender only.
  if (roles.includes('coach') && !lastMessage.is_ai) {
    try {
      const feedback = await runCoach(room, lastMessage);
      if (feedback) {
        outputs.push({ role: 'coach', content: feedback, targetUserId: lastMessage.sender_id });
      }
    } catch (err) {
      console.error('Coach agent failed:', err);
    }
  }

  return outputs;
}
