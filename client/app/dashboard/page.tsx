'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, signOut } from '@/lib/supabase';
import { getDebateHistory, getCreditBalance } from '@/lib/api';
import { PodiumMark } from '@/components/Logo';

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
  const [joinValue, setJoinValue] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const session = await getSession();
        if (!session) { router.push('/auth/login'); return; }
        const name = session.user.user_metadata?.name || session.user.email || 'Debater';
        const uid = session.user.id;
        setUserName(name);
        setUserId(uid);
        const [bal, history] = await Promise.allSettled([getCreditBalance(uid), getDebateHistory(uid)]);
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

  const handleJoin = () => {
    const val = joinValue.trim();
    if (!val) return;
    const id = val.includes('/debate/') ? val.split('/debate/')[1].split('?')[0] : val;
    router.push(`/debate/${id}?stance=against&name=${encodeURIComponent(userName)}&user_id=${userId}`);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#09090f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '24px', height: '24px', border: '3px solid rgba(99,102,241,0.3)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const modeColor = (s: string) =>
    s === 'completed' ? { bg: 'rgba(34,197,94,0.15)', color: '#22c55e' }
    : s === 'active' ? { bg: 'rgba(99,102,241,0.15)', color: '#818cf8' }
    : { bg: 'rgba(255,255,255,0.06)', color: '#6b7280' };

  return (
    <div style={{ minHeight: '100vh', background: '#09090f', color: '#fff' }}>
      {/* Nav */}
      <nav style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 24px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0d0d18' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '9px' }}>
          <PodiumMark size={24} />
          <span style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '-0.5px', color: '#fff' }}>PODIUM</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '14px', color: '#9ca3af' }}>{userName}</span>
          <button onClick={handleSignOut} style={{ fontSize: '12px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Sign out</button>
        </div>
      </nav>

      <div style={{ maxWidth: '880px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Welcome back,</p>
            <h1 style={{ fontSize: '34px', fontWeight: 900, color: '#fff', letterSpacing: '-1px' }}>{userName}</h1>
          </div>
          <div style={{ textAlign: 'right', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '16px', padding: '12px 24px' }}>
            <div style={{ fontSize: '32px', fontWeight: 900, color: '#818cf8', lineHeight: 1 }}>{credits ?? '--'}</div>
            <div style={{ fontSize: '10px', color: '#6b7280', fontWeight: 700, letterSpacing: '2px', marginTop: '4px' }}>CREDITS</div>
          </div>
        </div>

        {/* CTA cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '40px' }}>
          {/* New Debate */}
          <button
            onClick={() => router.push('/debate/create')}
            style={{ textAlign: 'left', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '20px', padding: '28px', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 0 24px rgba(99,102,241,0.1)' }}
          >
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#fff', marginBottom: '8px' }}>New Debate</div>
            <p style={{ fontSize: '14px', color: '#9ca3af', lineHeight: 1.5, marginBottom: '16px' }}>Create a room, pick your AI agents, enter the arena.</p>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#818cf8' }}>Enter the Arena →</span>
          </button>

          {/* Join */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '28px' }}>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#fff', marginBottom: '8px' }}>Join a Debate</div>
            <p style={{ fontSize: '14px', color: '#9ca3af', lineHeight: 1.5, marginBottom: '16px' }}>Have a room link from someone?</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                value={joinValue}
                onChange={e => setJoinValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                placeholder="Paste debate link or ID..."
                style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }}
              />
              <button onClick={handleJoin} style={{ padding: '10px 16px', background: '#6366f1', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Join</button>
            </div>
          </div>
        </div>

        {/* History */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '11px', fontWeight: 800, color: '#6b7280', letterSpacing: '2px', textTransform: 'uppercase' }}>Recent Debates</h2>
            {debates.length > 0 && <span style={{ fontSize: '12px', color: '#374151' }}>{debates.length} total</span>}
          </div>

          {debates.length === 0 ? (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '48px 24px', textAlign: 'center' }}>
              <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '12px' }}>No debates yet.</p>
              <button onClick={() => router.push('/debate/create')} style={{ fontSize: '14px', fontWeight: 700, color: '#818cf8', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                Create your first debate →
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {debates.map(d => {
                const sc = modeColor(d.status);
                return (
                  <div
                    key={d.id}
                    onClick={() => router.push(`/debate/${d.id}?name=${encodeURIComponent(userName)}&user_id=${userId}&stance=for`)}
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.topic}</p>
                      <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{d.mode?.toUpperCase()} · {new Date(d.created_at).toLocaleDateString()}</p>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '999px', flexShrink: 0, background: sc.bg, color: sc.color }}>
                      {d.status?.toUpperCase()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
