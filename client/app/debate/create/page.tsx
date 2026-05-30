'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createDebate } from '@/lib/api';
import { getSession } from '@/lib/supabase';

const MODES = [
  { id: 'solo', label: 'Solo', desc: 'You vs AI', icon: '1v1' },
  { id: '1v1', label: '1 vs 1', desc: 'Two humans', icon: '1v1' },
  { id: 'group', label: 'Group', desc: 'Up to 10', icon: 'GRP' },
];

const AI_ROLES = [
  { id: 'participant', label: 'Participant', desc: 'AI debates as an active member', color: 'text-indigo-400', activeBg: 'bg-indigo-500/15 border-indigo-500/40' },
  { id: 'devils_advocate', label: "Devil's Advocate", desc: 'Challenges the winning side', color: 'text-red-400', activeBg: 'bg-red-500/15 border-red-500/40' },
  { id: 'interrogator', label: 'Interrogator', desc: 'Only asks probing questions', color: 'text-yellow-400', activeBg: 'bg-yellow-500/15 border-yellow-500/40' },
  { id: 'coach', label: 'Coach', desc: 'Private hints for your side', color: 'text-orange-400', activeBg: 'bg-orange-500/15 border-orange-500/40' },
  { id: 'steelman', label: 'Steelman', desc: 'Strengthens weak arguments', color: 'text-emerald-400', activeBg: 'bg-emerald-500/15 border-emerald-500/40' },
  { id: 'judge', label: 'Judge', desc: 'Silent observer. Final verdict.', color: 'text-purple-400', activeBg: 'bg-purple-500/15 border-purple-500/40' },
];

const SKILL_LEVELS = [
  { id: 'beginner', label: 'Beginner', desc: 'Guided experience' },
  { id: 'intermediate', label: 'Intermediate', desc: 'Balanced challenge' },
  { id: 'expert', label: 'Expert', desc: 'No mercy' },
];

export default function CreateDebatePage() {
  const router = useRouter();
  const [topic, setTopic] = useState('');
  const [mode, setMode] = useState('solo');
  const [aiRoles, setAiRoles] = useState<string[]>(['participant', 'judge']);
  const [skillLevel, setSkillLevel] = useState('intermediate');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleRole = (role: string) => {
    setAiRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
  };

  const selectAll = () => setAiRoles(AI_ROLES.map(r => r.id));
  const clearAll = () => setAiRoles([]);

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

  return (
    <main className="min-h-screen bg-[#08080f] text-white">
      {/* Header */}
      <div className="border-b border-white/[0.06] px-6 h-14 flex items-center justify-between">
        <button onClick={() => router.push('/')} className="text-lg font-black tracking-tight text-white">PODIUM</button>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">New Debate</span>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">

        {error && (
          <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>
        )}

        {/* Topic */}
        <div className="mb-8">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Debate Topic</label>
          <textarea
            value={topic}
            onChange={e => setTopic(e.target.value)}
            rows={2}
            className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500/50 rounded-2xl px-5 py-4 text-white text-base outline-none transition-colors placeholder-gray-700 resize-none"
            placeholder="e.g. Remote work kills workplace culture"
          />
          <p className="text-xs text-gray-600 mt-2">AI will sharpen your topic into a clear arguable proposition</p>
        </div>

        {/* Mode */}
        <div className="mb-8">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Debate Mode</label>
          <div className="grid grid-cols-3 gap-3">
            {MODES.map(m => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  mode === m.id
                    ? 'border-indigo-500/50 bg-indigo-500/10 glow-indigo'
                    : 'border-white/[0.07] bg-white/[0.02] hover:border-white/[0.14]'
                }`}
              >
                <div className="text-xs font-bold text-gray-500 mb-1">{m.icon}</div>
                <div className="font-bold text-sm text-white">{m.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* AI Roles */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">AI Roles</label>
            <div className="flex gap-3">
              <button onClick={selectAll} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Select all</button>
              <button onClick={clearAll} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">Clear</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {AI_ROLES.map(r => (
              <button
                key={r.id}
                onClick={() => toggleRole(r.id)}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  aiRoles.includes(r.id) ? r.activeBg : 'border-white/[0.07] bg-white/[0.02] hover:border-white/[0.12]'
                }`}
              >
                <div className={`font-bold text-sm mb-1 ${r.color}`}>{r.label}</div>
                <div className="text-xs text-gray-500">{r.desc}</div>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-2">{aiRoles.length} role{aiRoles.length !== 1 ? 's' : ''} selected — all run simultaneously</p>
        </div>

        {/* Skill Level */}
        <div className="mb-10">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Skill Level</label>
          <div className="grid grid-cols-3 gap-3">
            {SKILL_LEVELS.map(s => (
              <button
                key={s.id}
                onClick={() => setSkillLevel(s.id)}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  skillLevel === s.id
                    ? 'border-indigo-500/50 bg-indigo-500/10'
                    : 'border-white/[0.07] bg-white/[0.02] hover:border-white/[0.14]'
                }`}
              >
                <div className="font-bold text-sm text-white mb-0.5">{s.label}</div>
                <div className="text-xs text-gray-500">{s.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed font-black text-base py-4 rounded-2xl transition-all glow-indigo"
        >
          {loading ? 'Setting up your debate...' : 'Enter the Arena'}
        </button>

      </div>
    </main>
  );
}
