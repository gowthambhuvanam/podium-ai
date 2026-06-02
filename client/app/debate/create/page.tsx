'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createDebate, suggestTopics } from '@/lib/api';
import { getSession } from '@/lib/supabase';

const CATEGORIES = ['Technology', 'Business', 'Ethics', 'Society', 'Science', 'Politics', 'Education', 'Health', 'Environment', 'Sports'];

type Mode = 'solo' | '1v1' | 'group';
type Skill = 'beginner' | 'intermediate' | 'expert';

const MODES: { id: Mode; label: string; sub: string }[] = [
  { id: 'solo', label: 'Solo', sub: 'You vs AI' },
  { id: '1v1', label: '1 vs 1', sub: 'Two humans' },
  { id: 'group', label: 'Group', sub: 'Up to 10' },
];

const AI_ROLES = [
  { id: 'participant', label: 'Participant', desc: 'AI debates as your opponent', color: '#818cf8', activeBg: 'rgba(129,140,248,0.12)', activeBorder: 'rgba(129,140,248,0.4)' },
  { id: 'coach', label: 'Coach (helps you)', desc: 'Feedback on how you phrased your point', color: '#fb923c', activeBg: 'rgba(251,146,60,0.12)', activeBorder: 'rgba(251,146,60,0.4)' },
  { id: 'devils_advocate', label: "Devil's Advocate", desc: '3 lifelines for the losing side', color: '#f87171', activeBg: 'rgba(248,113,113,0.12)', activeBorder: 'rgba(248,113,113,0.4)' },
  { id: 'interrogator', label: 'Interrogator', desc: 'Asks probing questions to everyone', color: '#fbbf24', activeBg: 'rgba(251,191,36,0.12)', activeBorder: 'rgba(251,191,36,0.4)' },
  { id: 'judge', label: 'Judge', desc: 'Silent observer — final verdict', color: '#c084fc', activeBg: 'rgba(192,132,252,0.12)', activeBorder: 'rgba(192,132,252,0.4)' },
];

const SKILL_LEVELS: { id: Skill; label: string; sub: string }[] = [
  { id: 'beginner', label: 'Beginner', sub: 'Coach on by default' },
  { id: 'intermediate', label: 'Intermediate', sub: 'Balanced challenge' },
  { id: 'expert', label: 'Expert', sub: 'No aids, no mercy' },
];

// ─── Role rules engine ──────────────────────────────────────────────────────
type RoleState = 'required' | 'available' | 'disabled';
function roleStatus(roleId: string, mode: Mode): { state: RoleState; reason?: string } {
  if (mode === 'solo') {
    if (roleId === 'participant') return { state: 'required', reason: 'The AI must be your opponent in Solo mode' };
    if (roleId === 'interrogator') return { state: 'disabled', reason: 'Not needed in Solo — the AI participant already rebuts and pushes back on you' };
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
  if (skill === 'beginner') roles.add('coach');
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

  // Topic suggestions
  const [activeCategory, setActiveCategory] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);

  const pickSuggestion = (s: string) => {
    setTopic(s);
    setSelectedSuggestion(s);
  };

  const writeOwn = () => {
    setSelectedSuggestion(null);
    setTopic('');
  };

  const loadSuggestions = async (category: string) => {
    setActiveCategory(category);
    setSuggesting(true);
    setSuggestions([]);
    try {
      const { topics } = await suggestTopics(category);
      setSuggestions(topics);
    } catch {
      setSuggestions([]);
    } finally {
      setSuggesting(false);
    }
  };

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
      if (s === 'beginner') next.add('coach');
      if (s === 'expert') next.delete('coach');
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

          {/* Free-text box — hidden once a suggestion is chosen */}
          {!selectedSuggestion && (
            <>
              <textarea
                value={topic}
                onChange={e => setTopic(e.target.value)}
                rows={2}
                style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '16px', color: '#fff', fontSize: '15px', outline: 'none', fontFamily: 'inherit', resize: 'none', lineHeight: 1.6 }}
                placeholder="e.g. Remote work kills workplace culture"
              />
              <p style={{ fontSize: '12px', color: '#374151', marginTop: '6px' }}>AI will sharpen this into a clear arguable proposition</p>
            </>
          )}

          {/* Chosen suggestion — shown highlighted instead of the text box */}
          {selectedSuggestion && (
            <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.45)', borderRadius: '14px', padding: '16px', boxShadow: '0 0 20px rgba(99,102,241,0.12)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <div>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: '#818cf8', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '6px' }}>Selected Topic</p>
                  <p style={{ fontSize: '15px', color: '#fff', lineHeight: 1.5 }}>{selectedSuggestion}</p>
                </div>
                <button onClick={writeOwn} style={{ flexShrink: 0, fontSize: '12px', fontWeight: 600, color: '#9ca3af', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                  Write my own
                </button>
              </div>
            </div>
          )}

          {/* Topic suggestions */}
          <div style={{ marginTop: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '14px' }}>
            <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '10px', fontWeight: 600 }}>Need ideas? Pick a category and we will suggest topics</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => loadSuggestions(cat)}
                  style={{ fontSize: '12px', fontWeight: 600, padding: '5px 12px', borderRadius: '999px', cursor: 'pointer', fontFamily: 'inherit',
                    background: activeCategory === cat ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${activeCategory === cat ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    color: activeCategory === cat ? '#a5b4fc' : '#9ca3af' }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {suggesting && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', color: '#6b7280' }}>
                <div style={{ width: '14px', height: '14px', border: '2px solid rgba(99,102,241,0.3)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '12px' }}>Generating {activeCategory} topics...</span>
              </div>
            )}

            {suggestions.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px' }}>
                {suggestions.map((s, i) => {
                  const chosen = selectedSuggestion === s;
                  return (
                    <button
                      key={i}
                      onClick={() => pickSuggestion(s)}
                      style={{ textAlign: 'left', fontSize: '13px', lineHeight: 1.4, borderRadius: '10px', padding: '10px 14px', cursor: 'pointer', fontFamily: 'inherit',
                        color: chosen ? '#fff' : '#d1d5db',
                        background: chosen ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${chosen ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.07)'}`,
                        display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      {chosen && <span style={{ color: '#818cf8', fontWeight: 800, flexShrink: 0 }}>✓</span>}
                      {s}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

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
