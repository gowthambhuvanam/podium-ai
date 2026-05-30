'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createDebate } from '@/lib/api';
import { getSession } from '@/lib/supabase';

const MODES = [
  { id: 'solo', label: 'Solo', sub: 'You vs AI' },
  { id: '1v1', label: '1 vs 1', sub: 'Two humans' },
  { id: 'group', label: 'Group', sub: 'Up to 10' },
];

const AI_ROLES = [
  { id: 'participant', label: 'Participant', desc: 'AI debates as an active member', color: '#818cf8', activeBg: 'rgba(129,140,248,0.12)', activeBorder: 'rgba(129,140,248,0.4)' },
  { id: 'devils_advocate', label: "Devil's Advocate", desc: 'Challenges whichever side is winning', color: '#f87171', activeBg: 'rgba(248,113,113,0.12)', activeBorder: 'rgba(248,113,113,0.4)' },
  { id: 'interrogator', label: 'Interrogator', desc: 'Only asks probing questions', color: '#fbbf24', activeBg: 'rgba(251,191,36,0.12)', activeBorder: 'rgba(251,191,36,0.4)' },
  { id: 'coach', label: 'Coach', desc: 'Private hints to your side only', color: '#fb923c', activeBg: 'rgba(251,146,60,0.12)', activeBorder: 'rgba(251,146,60,0.4)' },
  { id: 'steelman', label: 'Steelman', desc: 'Strengthens the weakest arguments', color: '#34d399', activeBg: 'rgba(52,211,153,0.12)', activeBorder: 'rgba(52,211,153,0.4)' },
  { id: 'judge', label: 'Judge', desc: 'Silent observer — final verdict', color: '#c084fc', activeBg: 'rgba(192,132,252,0.12)', activeBorder: 'rgba(192,132,252,0.4)' },
];

const SKILL_LEVELS = [
  { id: 'beginner', label: 'Beginner', sub: 'Guided & supportive' },
  { id: 'intermediate', label: 'Intermediate', sub: 'Balanced challenge' },
  { id: 'expert', label: 'Expert', sub: 'No mercy' },
];

export default function CreateDebatePage() {
  const router = useRouter();
  const [topic, setTopic] = useState('');
  const [mode, setMode] = useState('solo');
  const [aiRoles, setAiRoles] = useState<string[]>(['participant', 'judge']);
  const [skillLevel, setSkillLevel] = useState('intermediate');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleRole = (role: string) => setAiRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);

  const handleCreate = async () => {
    if (!topic.trim()) { setError('Enter a debate topic'); return; }
    if (aiRoles.length === 0) { setError('Select at least one AI role'); return; }
    setLoading(true);
    setError('');
    try {
      const session = await getSession();
      const userId = session?.user?.id || 'guest-' + Math.random().toString(36).slice(2);
      const userName = session?.user?.user_metadata?.name || 'Debater';
      const result = await createDebate({ topic: topic.trim(), mode, ai_roles: aiRoles, skill_level: skillLevel, user_id: userId, user_name: userName });
      router.push(`/debate/${result.debate_id}?stance=for&name=${encodeURIComponent(userName)}&user_id=${userId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create debate');
    } finally {
      setLoading(false);
    }
  };

  const sectionLabel = { fontSize: '11px', fontWeight: 700, color: '#6b7280', letterSpacing: '2px', textTransform: 'uppercase' as const, marginBottom: '12px', display: 'block' };
  const inactiveCard = { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '16px', cursor: 'pointer', textAlign: 'left' as const, fontFamily: 'inherit', color: '#fff', transition: 'border-color 0.15s' };

  return (
    <div style={{ minHeight: '100vh', background: '#09090f', color: '#fff' }}>
      {/* Nav */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '0 24px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(9,9,15,0.95)' }}>
        <button onClick={() => router.push('/')} style={{ fontSize: '18px', fontWeight: 900, color: '#fff', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '-0.5px' }}>PODIUM</button>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#374151', letterSpacing: '2px', textTransform: 'uppercase' }}>New Debate</span>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '40px 24px' }}>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', padding: '12px 16px', color: '#f87171', fontSize: '13px', marginBottom: '24px' }}>
            {error}
          </div>
        )}

        {/* Topic */}
        <div style={{ marginBottom: '32px' }}>
          <label style={sectionLabel}>Debate Topic</label>
          <textarea
            value={topic}
            onChange={e => setTopic(e.target.value)}
            rows={2}
            style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '16px', color: '#fff', fontSize: '15px', outline: 'none', fontFamily: 'inherit', resize: 'none', lineHeight: 1.6 }}
            placeholder="e.g. Remote work kills workplace culture"
          />
          <p style={{ fontSize: '12px', color: '#374151', marginTop: '6px' }}>AI will sharpen this into a clear arguable proposition</p>
        </div>

        {/* Mode */}
        <div style={{ marginBottom: '32px' }}>
          <label style={sectionLabel}>Debate Mode</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {MODES.map(m => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                style={{ ...inactiveCard, ...(mode === m.id ? { background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.45)', boxShadow: '0 0 20px rgba(99,102,241,0.15)' } : {}) }}
              >
                <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '3px' }}>{m.label}</div>
                <div style={{ fontSize: '11px', color: '#4b5563' }}>{m.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* AI Roles */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <label style={{ ...sectionLabel, marginBottom: 0 }}>AI Roles</label>
            <div style={{ display: 'flex', gap: '16px' }}>
              <button onClick={() => setAiRoles(AI_ROLES.map(r => r.id))} style={{ fontSize: '12px', color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Select all</button>
              <button onClick={() => setAiRoles([])} style={{ fontSize: '12px', color: '#374151', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Clear</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {AI_ROLES.map(r => {
              const active = aiRoles.includes(r.id);
              return (
                <button
                  key={r.id}
                  onClick={() => toggleRole(r.id)}
                  style={{ ...inactiveCard, ...(active ? { background: r.activeBg, border: `1px solid ${r.activeBorder}` } : {}) }}
                >
                  <div style={{ fontWeight: 800, fontSize: '13px', color: active ? r.color : '#9ca3af', marginBottom: '4px' }}>{r.label}</div>
                  <div style={{ fontSize: '11px', color: '#4b5563', lineHeight: 1.5 }}>{r.desc}</div>
                </button>
              );
            })}
          </div>
          <p style={{ fontSize: '12px', color: '#374151', marginTop: '8px' }}>{aiRoles.length} role{aiRoles.length !== 1 ? 's' : ''} selected — all run simultaneously</p>
        </div>

        {/* Skill Level */}
        <div style={{ marginBottom: '40px' }}>
          <label style={sectionLabel}>Skill Level</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {SKILL_LEVELS.map(s => (
              <button
                key={s.id}
                onClick={() => setSkillLevel(s.id)}
                style={{ ...inactiveCard, ...(skillLevel === s.id ? { background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.45)' } : {}) }}
              >
                <div style={{ fontWeight: 800, fontSize: '13px', marginBottom: '3px' }}>{s.label}</div>
                <div style={{ fontSize: '11px', color: '#4b5563' }}>{s.sub}</div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleCreate}
          disabled={loading}
          style={{ width: '100%', padding: '16px', fontSize: '15px', fontWeight: 900, color: '#fff', background: loading ? '#4f46e5' : '#6366f1', border: 'none', borderRadius: '14px', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', boxShadow: '0 0 32px rgba(99,102,241,0.35)', letterSpacing: '0.5px' }}
        >
          {loading ? 'Setting up your debate...' : 'Enter the Arena'}
        </button>
      </div>
    </div>
  );
}
