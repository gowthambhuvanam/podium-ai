'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createDebate } from '@/lib/api';
import { getSession } from '@/lib/supabase';

const MODES = [
  { id: 'solo', label: 'Solo', desc: 'You vs AI' },
  { id: '1v1', label: '1v1', desc: 'Two humans' },
  { id: 'group', label: 'Group', desc: 'Up to 10 people' },
];

const AI_ROLES = [
  { id: 'participant', label: 'Participant', desc: 'AI actively debates' },
  { id: 'devils_advocate', label: "Devil's Advocate", desc: 'Challenges the winning side' },
  { id: 'interrogator', label: 'Interrogator', desc: 'Asks probing questions only' },
  { id: 'coach', label: 'Coach', desc: 'Private hints for your side' },
  { id: 'steelman', label: 'Steelman', desc: 'Strengthens the weakest argument' },
  { id: 'judge', label: 'Judge', desc: 'Silent observer, final verdict' },
];

const SKILL_LEVELS = [
  { id: 'beginner', label: 'Beginner', desc: 'Learning the basics' },
  { id: 'intermediate', label: 'Intermediate', desc: 'Some debate experience' },
  { id: 'expert', label: 'Expert', desc: 'Rigorous, no hints' },
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
    setAiRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const handleCreate = async () => {
    if (!topic.trim()) { setError('Please enter a topic'); return; }
    setLoading(true);
    setError('');
    try {
      const session = await getSession();
      const userId = session?.user?.id || 'guest';
      const userName = session?.user?.user_metadata?.name || 'You';

      const result = await createDebate({
        topic: topic.trim(),
        mode,
        ai_roles: aiRoles,
        skill_level: skillLevel,
        user_id: userId,
        user_name: userName,
      });

      router.push(`/debate/${result.debate_id}?stance=for&name=${encodeURIComponent(userName)}&user_id=${userId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create debate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => router.push('/')} className="text-gray-500 hover:text-gray-300 text-sm mb-6 flex items-center gap-1">
          Back
        </button>
        <h1 className="text-2xl font-bold mb-1">Create a debate</h1>
        <p className="text-gray-400 text-sm mb-8">Configure your debate room and AI agents</p>

        {error && <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-3 py-2 mb-4">{error}</p>}

        {/* Topic */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">Debate topic</label>
          <input
            type="text"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 placeholder-gray-600"
            placeholder="e.g. Remote work kills workplace culture"
          />
          <p className="text-xs text-gray-600 mt-1">AI will sharpen your topic into a clear proposition</p>
        </div>

        {/* Mode */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">Debate mode</label>
          <div className="grid grid-cols-3 gap-3">
            {MODES.map(m => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`p-3 rounded-xl border text-left transition ${
                  mode === m.id
                    ? 'border-indigo-500 bg-indigo-950'
                    : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                }`}
              >
                <div className="font-semibold text-sm">{m.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* AI Roles */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-1">AI roles</label>
          <p className="text-xs text-gray-500 mb-2">Select one or more. Each runs simultaneously.</p>
          <div className="grid grid-cols-2 gap-2">
            {AI_ROLES.map(r => (
              <button
                key={r.id}
                onClick={() => toggleRole(r.id)}
                className={`p-3 rounded-xl border text-left transition ${
                  aiRoles.includes(r.id)
                    ? 'border-indigo-500 bg-indigo-950'
                    : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                }`}
              >
                <div className="font-semibold text-sm flex items-center gap-2">
                  {aiRoles.includes(r.id) && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block"></span>}
                  {r.label}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{r.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Skill Level */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-300 mb-2">Skill level</label>
          <div className="grid grid-cols-3 gap-3">
            {SKILL_LEVELS.map(s => (
              <button
                key={s.id}
                onClick={() => setSkillLevel(s.id)}
                className={`p-3 rounded-xl border text-left transition ${
                  skillLevel === s.id
                    ? 'border-indigo-500 bg-indigo-950'
                    : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                }`}
              >
                <div className="font-semibold text-sm">{s.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{s.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition"
        >
          {loading ? 'Setting up your debate...' : 'Create debate room'}
        </button>
      </div>
    </main>
  );
}
