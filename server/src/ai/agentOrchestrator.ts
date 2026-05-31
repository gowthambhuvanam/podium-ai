import { DebateRoom, Message, AIRole, Stance } from '../types/index.js';
import { completion, FAST_MODEL } from './llmClient.js';
import { runParticipant } from './agents/participant.js';
import { runDevilsAdvocate } from './agents/devilsAdvocate.js';
import { runInterrogator } from './agents/interrogator.js';
import { runCoach } from './agents/coach.js';
import { runSteelman } from './agents/steelman.js';
import { runJudge } from './agents/judge.js';

export { runJudge };

export interface AgentOutput {
  role: AIRole;
  content: string;
  targetStance?: Stance;
}

// Detect logical fallacies in a message
export async function detectFallacies(content: string): Promise<string[]> {
  const response = await completion(
    [
      {
        role: 'system',
        content: `You are a logical fallacy detector. Analyze the argument and return ONLY a JSON array of fallacy names found. Return [] if none. Max 3 fallacies.`,
      },
      {
        role: 'user',
        content: `Argument: "${content}"\n\nReturn JSON array of fallacy names found:`,
      },
    ],
    FAST_MODEL,
    100
  );

  try {
    const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
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

  if (roles.includes('devils_advocate')) {
    publicAgents.push({
      role: 'devils_advocate',
      fn: () =>
        runDevilsAdvocate(room, room.messages, room.momentum, chunk =>
          onAgentMessage({ role: 'devils_advocate', content: '' }, chunk, false)
        ),
    });
  }

  if (roles.includes('interrogator')) {
    publicAgents.push({
      role: 'interrogator',
      fn: () =>
        runInterrogator(room, lastMessage, chunk =>
          onAgentMessage({ role: 'interrogator', content: '' }, chunk, false)
        ),
    });
  }

  if (roles.includes('steelman')) {
    publicAgents.push({
      role: 'steelman',
      fn: () =>
        runSteelman(room, room.messages, room.momentum, chunk =>
          onAgentMessage({ role: 'steelman', content: '' }, chunk, false)
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

  // Coach runs privately (not streamed publicly)
  if (roles.includes('coach')) {
    try {
      const forCoach = await runCoach(room, room.messages, 'for');
      const againstCoach = await runCoach(room, room.messages, 'against');
      outputs.push({ role: 'coach', content: forCoach, targetStance: 'for' });
      outputs.push({ role: 'coach', content: againstCoach, targetStance: 'against' });
    } catch (err) {
      console.error('Coach agent failed:', err);
    }
  }

  return outputs;
}
