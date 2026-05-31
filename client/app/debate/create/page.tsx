'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createDebate } from '@/lib/api';
import { getSession } from '@/lib/supabase';

type Mode = 'solo' | '1v1' | 'group';
type Skill = 'beginner' | 'intermediate' | 'expert';

const MODES: { id: Mode; label: string; sub: string }[] = [
  { id: 'solo', label: 'Solo', sub: 'You vs AI' },
  { id: '1v1', label: '1 vs 1', sub: 'Two humans' },
  { id: 'group', label: 'Group', sub: 'Up to 10' },
];

const AI_ROLES = [
  { id: 'participant', label: 'Participant', desc: 'AI debates as your opponent', color: '#818cf8', activeBg: 'rgba(129,140,248,0.12)', activeBorder: 'rgba(129,140,248,0.4)' },
  { id: 'devils_advocate', label: "Devil's Advocate", desc: 'Challenges whichever side is winning', color: '#f87171', activeBg: 'rgba(248,113,113,0.12)', activeBorder: 'rgba(248,113,113,0.4)' },
  { id: 'interrogator', label: 'Interrogator', desc: 'Asks probing questions to everyone', color: '#fbbf24', activeBg: 'rgba(251,191,36,0.12)', activeBorder: 'rgba(251,191,36,0.4)' },
  { id: 'coach', label: 'Coach (helps you)', desc: 'Private tactical tips for your side', color: '#fb923c', activeBg: 'rgba(251,146,60,0.12)', activeBorder: 'rgba(251,146,60,0.4)' },
  { id: 'steelman', label: 'Steelman (helps you)', desc: 'Strengthens the weakest argument', color: '#34d399', activeBg: 'rgba(52,211,153,0.12)', activeBorder: 'rgba(52,211,153,0.4)' },
  { id: 'judge', label: 'Judge', desc: 'Silent observer — final verdict', color: '#c084fc', activeBg: 'rgba(192,132,252,0.12)', activeBorder: 'rgba(192,132,252,0.4)' },
];

const SKILL_LEVELS: { id: Skill; label: string; sub: string }[] = [
  { id: 'beginner', label: 'Beginner', sub: 'Coach + Steelman on' },
  { id: 'intermediate', label: 'Intermediate', sub: 'Balanced challenge' },
  { id: 'expert', label: 'Expert', sub: 'No aids, no mercy' },
];

// ─── Role rules engine ──────────────────────────────────────────────────────
type RoleState = 'required' | 'available' | 'disabled';
function roleStatus(roleId: string, mode: Mode): { state: RoleState; reason?: string } {
  if (mode === 'solo') {
    if (roleId === 'participant') return { state: 'required', reason: 'The AI must be your opponent in Solo mode' };
    if (roleId === 'devils_advocate') return { state: 'disabled', reason: 'Redundant in Solo — the AI participant already argues the opposing side' };
    return { state: 'available' };
  }
  if (mode === '1v1') {
    if (roleId === 'participant') return { state: 'disabled', reason: 'Both sides are humans in 1v1 — no AI debater' };
    return { state: 'available' };
  }
  return { state: 'available' }; // group: everything allowed
}

// Default role selection for a given mode + skill
function defaultRoles(mode: Mode, skill: Skill): string[] {
  const roles = new Set<string>();
  if (mode === 'solo') roles.add('participant'); // required
  roles.add('judge');
  if (skill === 'beginner') { roles.add('coach'); roles.add('steelman'); }
  return AI_ROLES.map(r => r.id).filter(id => roles.has(id) && roleStatus(id, mode).state !== 'disabled');
}

export default function CreateDebatePage() {
  const router = useRouter();
  const [topic, setTopic] = useState('');
  const [mode, setMode] = useState<Mode>('solo');
  const [skillLevel, setSkillLevel] = useState<Skill>('intermediate');
  const [aiRoles, setAiRoles] = useState<string[]>(() => defaultRoles('solo', 'intermediate'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // When mode changes: drop disabled roles, force required roles on
  const changeMode = (m: Mode) => {
    setMode(m);
    setAiRoles(prev => {
      const kept = prev.filter(id => roleStatus(id, m).state !== 'disabled');
      const required = AI_ROLES.map(r => r.id).filter(id => roleStatus(id, m).state === 'required');
      return Array.from(new Set([...kept, ...required]));
    });
  };

  // When skill changes: beginner adds aids, expert strips aids (keeps required + judge)
  const changeSkill = (s: Skill) => {
    setSkillLevel(s);
    setAiRoles(prev => {
      const next = new Set(prev);
      if (s === 'beginner') { next.add('coach'); next.add('steelman'); }
      if (s === 'expert') { next.delete('coach'); next.delete('steelman'); }
      // keep required roles for current mode
      AI_ROLES.forEach(r => { if (roleStatus(r.id, mode).state === 'required') next.add(r.id); });
      return Array.from(next).filter(id => roleStatus(id, mode).state !== 'disabled');
    });
  };

  const toggleRole = (roleId: string) => {
    const status = roleStatus(roleId, mode);
    if (status.state === 'required' || status.state === 'disabled') return; // locked
    setAiRoles(prev => prev.includes(roleId) ? prev.filter(r => r !== roleId) : [...prev, roleId]);
  };

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
      // Solo: stance pick is shown next. 1v1/group: also pick a side.
      router.push(`/debate/${result.debate_id}?name=${encodeURIComponent(userName)}&user_id=${userId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create debate');
    } finally {
      setLoading(false);
    }
  };

  const sectionLabel = { fontSize: '11px', fontWeight: 700, color: '#6b7280', letterSpacing: '2px', textTransform: 'uppercase' as const, marginBottom: '12px', display: 'block' };

  return (
    <div style={{ minHeight: '100vh', background: '#09090f', color: '#fff' }}>
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '0 24px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(9,9,15,0.95)' }}>
        <button onClick={() => router.push('/')} style={{ fontSize: '18px', fontWeight: 900, color: '#fff', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '-0.5px' }}>PODIUM</button>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#374151', letterSpacing: '2px', textTransform: 'uppercase' }}>New Debate</span>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '40px 24px' }}>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', padding: '12px 16px', color: '#f87171', fontSize: '13px', marginBottom: '24px' }}>{error}</div>
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
                onClick={() => changeMode(m.id)}
                style={{ background: mode === m.id ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.02)', border: `1px solid ${mode === m.id ? 'rgba(99,102,241,0.45)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '14px', padding: '16px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', color: '#fff', boxShadow: mode === m.id ? '0 0 20px rgba(99,102,241,0.15)' : 'none' }}
              >
                <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '3px' }}>{m.label}</div>
                <div style={{ fontSize: '11px', color: '#4b5563' }}>{m.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* AI Roles */}
        <div style={{ marginBottom: '32px' }}>
          <label style={{ ...sectionLabel, marginBottom: '4px' }}>AI Roles</label>
          <p style={{ fontSize: '12px', color: '#4b5563', marginBottom: '12px' }}>
            Roles adapt to your mode. Greyed-out roles do not apply here.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {AI_ROLES.map(r => {
              const status = roleStatus(r.id, mode);
              const active = aiRoles.includes(r.id);
              const disabled = status.state === 'disabled';
              const required = status.state === 'required';

              return (
                <button
                  key={r.id}
                  onClick={() => toggleRole(r.id)}
                  disabled={disabled}
                  title={status.reason || ''}
                  style={{
                    position: 'relative',
                    background: disabled ? 'rgba(255,255,255,0.015)' : active ? r.activeBg : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${disabled ? 'rgba(255,255,255,0.04)' : active ? r.activeBorder : 'rgba(255,255,255,0.07)'}`,
                    borderRadius: '14px', padding: '16px', textAlign: 'left', fontFamily: 'inherit',
                    cursor: disabled ? 'not-allowed' : required ? 'default' : 'pointer',
                    opacity: disabled ? 0.4 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 800, fontSize: '13px', color: disabled ? '#4b5563' : active ? r.color : '#9ca3af' }}>{r.label}</span>
                    {required && <span style={{ fontSize: '9px', fontWeight: 700, color: r.color, background: r.activeBg, padding: '1px 6px', borderRadius: '999px', letterSpacing: '0.5px' }}>REQUIRED</span>}
                  </div>
                  <div style={{ fontSize: '11px', color: disabled ? '#374151' : '#4b5563', lineHeight: 1.5 }}>
                    {disabled ? status.reason : r.desc}
                  </div>
                </button>
              );
            })}
          </div>
          <p style={{ fontSize: '12px', color: '#374151', marginTop: '8px' }}>{aiRoles.length} role{aiRoles.length !== 1 ? 's' : ''} active</p>
        </div>

        {/* Skill Level */}
        <div style={{ marginBottom: '40px' }}>
          <label style={sectionLabel}>Skill Level</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {SKILL_LEVELS.map(s => (
              <button
                key={s.id}
                onClick={() => changeSkill(s.id)}
                style={{ background: skillLevel === s.id ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.02)', border: `1px solid ${skillLevel === s.id ? 'rgba(99,102,241,0.45)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '14px', padding: '16px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', color: '#fff' }}
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
          {loading ? 'Setting up your debate...' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
