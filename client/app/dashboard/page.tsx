'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, signOut } from '@/lib/supabase';
import { getDebateHistory, getCreditBalance } from '@/lib/api';

interface Debate {
  id: string;
  topic: string;
  mode: string;
  status: string;
  created_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [credits, setCredits] = useState<number | null>(null);
  const [debates, setDebates] = useState<Debate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const session = await getSession();
        if (!session) { router.push('/auth/login'); return; }

        const name = session.user.user_metadata?.name || session.user.email || 'Debater';
        const uid = session.user.id;
        setUserName(name);
        setUserId(uid);

        const [bal, history] = await Promise.allSettled([
          getCreditBalance(uid),
          getDebateHistory(uid),
        ]);

        if (bal.status === 'fulfilled') setCredits(bal.value.balance);
        if (history.status === 'fulfilled') setDebates(history.value || []);
      } catch {
        router.push('/auth/login');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router]);

  const handleSignOut = async () => { await signOut(); router.push('/'); };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08080f] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-500/40 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#08080f] text-white">
      {/* Nav */}
      <nav className="border-b border-white/[0.06] px-6 h-14 flex items-center justify-between bg-[#0f0f1a]">
        <span className="text-lg font-black tracking-tight">PODIUM</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">{userName}</span>
          <button onClick={handleSignOut} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">Sign out</button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* Welcome + Credits */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <p className="text-gray-500 text-sm mb-1">Welcome back,</p>
            <h1 className="text-3xl font-black text-white">{userName}</h1>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-indigo-400">{credits ?? '--'}</div>
            <div className="text-xs text-gray-600 uppercase tracking-widest">Credits</div>
          </div>
        </div>

        {/* CTA */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          <button
            onClick={() => router.push('/debate/create')}
            className="group bg-indigo-600/20 border border-indigo-500/30 hover:border-indigo-500/60 hover:bg-indigo-600/30 rounded-2xl p-6 text-left transition-all card-hover"
          >
            <div className="text-2xl font-black text-white mb-2">New Debate</div>
            <p className="text-sm text-gray-400">Create a room, pick your AI agents, enter the arena.</p>
            <span className="text-xs font-bold text-indigo-400 mt-3 block group-hover:text-indigo-300 transition-colors">Enter the Arena →</span>
          </button>

          <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl p-6">
            <div className="text-2xl font-black text-white mb-2">Join a Debate</div>
            <p className="text-sm text-gray-400 mb-3">Have a room code or link from someone?</p>
            <input
              placeholder="Paste debate link or ID..."
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-indigo-500/50 transition-colors placeholder-gray-700"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const val = (e.target as HTMLInputElement).value.trim();
                  if (val) {
                    const id = val.includes('/debate/') ? val.split('/debate/')[1].split('?')[0] : val;
                    router.push(`/debate/${id}?stance=against&name=${encodeURIComponent(userName)}&user_id=${userId}`);
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Debate History */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Recent Debates</h2>
            {debates.length > 0 && <span className="text-xs text-gray-700">{debates.length} total</span>}
          </div>

          {debates.length === 0 ? (
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-10 text-center">
              <p className="text-gray-600 text-sm">No debates yet.</p>
              <button onClick={() => router.push('/debate/create')} className="mt-3 text-indigo-400 hover:text-indigo-300 text-sm font-semibold transition-colors">
                Create your first debate
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {debates.map(d => (
                <div
                  key={d.id}
                  onClick={() => router.push(`/debate/${d.id}?name=${encodeURIComponent(userName)}&user_id=${userId}&stance=for`)}
                  className="bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl px-5 py-4 flex items-center gap-4 cursor-pointer transition-all card-hover"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{d.topic}</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {d.mode.toUpperCase()} · {new Date(d.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                    d.status === 'completed' ? 'bg-green-500/15 text-green-400' :
                    d.status === 'active' ? 'bg-indigo-500/15 text-indigo-400 animate-pulse' :
                    'bg-white/[0.06] text-gray-500'
                  }`}>
                    {d.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
