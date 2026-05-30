const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4000';

export async function createDebate(payload: {
  topic: string;
  mode: string;
  ai_roles: string[];
  skill_level: string;
  user_id: string;
  user_name: string;
}) {
  const res = await fetch(`${SERVER_URL}/api/debates/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to create debate');
  return res.json();
}

export async function getBriefing(payload: {
  topic: string;
  stance: string;
  skill_level: string;
}) {
  const res = await fetch(`${SERVER_URL}/api/debates/briefing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to get briefing');
  return res.json();
}

export async function getDebate(id: string) {
  const res = await fetch(`${SERVER_URL}/api/debates/${id}`);
  if (!res.ok) throw new Error('Debate not found');
  return res.json();
}

export async function getDebateHistory(user_id: string) {
  const res = await fetch(`${SERVER_URL}/api/debates/history/${user_id}`);
  if (!res.ok) throw new Error('Failed to get history');
  return res.json();
}

export async function getCreditBalance(user_id: string) {
  const res = await fetch(`${SERVER_URL}/api/credits/balance/${user_id}`);
  if (!res.ok) throw new Error('Failed to get balance');
  return res.json();
}
