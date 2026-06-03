'use client';

import { useRouter } from 'next/navigation';

const agents = [
  { name: 'Participant', desc: 'Debates as an active member on one side', color: '#818cf8', bg: 'rgba(129,140,248,0.08)', border: 'rgba(129,140,248,0.25)' },
  { name: 'Coach', desc: 'Private feedback on how you phrased your point', color: '#fb923c', bg: 'rgba(251,146,60,0.08)', border: 'rgba(251,146,60,0.25)' },
  { name: "Devil's Advocate", desc: 'Three lifelines for the losing side to fight back', color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.25)' },
  { name: 'Interrogator', desc: 'Asks sharp Socratic questions', color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.25)' },
  { name: 'Judge', desc: 'Silent observer. Delivers the final verdict.', color: '#c084fc', bg: 'rgba(192,132,252,0.08)', border: 'rgba(192,132,252,0.25)' },
];

const steps = [
  { num: '01', title: 'Set the stage', desc: 'Enter any topic. AI sharpens it and predicts how the room will lean.' },
  { num: '02', title: 'Pick your agents', desc: 'Choose one or all five AI roles. Each runs simultaneously with its own job.' },
  { num: '03', title: 'Debate live', desc: 'Arguments analyzed in real time. Fallacies flagged. Momentum tracked.' },
  { num: '04', title: 'Get your verdict', desc: 'Full performance breakdown: who won, why, and what you missed.' },
];

export default function HomePage() {
  const router = useRouter();

  return (
    <div style={{ background: '#09090f', minHeight: '100vh', color: '#fff', fontFamily: 'inherit' }}>

      {/* NAV */}
      <nav style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '0 32px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'rgba(9,9,15,0.95)', backdropFilter: 'blur(12px)', zIndex: 100 }}>
        <span style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '-0.5px', color: '#fff' }}>PODIUM</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => router.push('/auth/login')} style={{ padding: '8px 16px', fontSize: '13px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            Sign in
          </button>
          <button onClick={() => router.push('/auth/signup')} style={{ padding: '8px 18px', fontSize: '13px', fontWeight: 700, color: '#fff', background: '#6366f1', border: 'none', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit' }}>
            Get started
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ padding: '80px 24px 80px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Background glow */}
        <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', width: '600px', height: '400px', background: 'radial-gradient(ellipse, rgba(99,102,241,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', maxWidth: '800px', margin: '0 auto' }}>
          {/* Pill */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '999px', padding: '6px 16px', marginBottom: '32px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#4ade80', letterSpacing: '2px' }}>FOR</span>
            <span style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.15)' }} />
            <span style={{ fontSize: '11px', color: '#6b7280' }}>AI-Powered Debate Platform</span>
            <span style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.15)' }} />
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#f87171', letterSpacing: '2px' }}>AGAINST</span>
          </div>

          {/* Headline */}
          <h1 style={{ fontSize: 'clamp(48px, 8vw, 88px)', fontWeight: 900, lineHeight: 1.0, letterSpacing: '-3px', marginBottom: '24px', color: '#ffffff' }}>
            THE ARENA FOR<br />
            <span style={{ color: '#818cf8' }}>INTELLIGENT</span><br />
            DEBATE
          </h1>

          <p style={{ fontSize: '18px', color: '#6b7280', maxWidth: '560px', margin: '0 auto 40px', lineHeight: 1.7 }}>
            Real-time AI debate with five simultaneous agents that argue, coach, interrogate, and judge. Solo, 1v1, or up to 10 people.
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '64px' }}>
            <button
              onClick={() => router.push('/auth/signup')}
              style={{ padding: '14px 32px', fontSize: '15px', fontWeight: 800, color: '#fff', background: '#6366f1', border: 'none', borderRadius: '14px', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 0 32px rgba(99,102,241,0.4)' }}
            >
              Enter the Arena
            </button>
            <button
              onClick={() => router.push('/debate/create')}
              style={{ padding: '14px 32px', fontSize: '15px', fontWeight: 700, color: '#d1d5db', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Create a Debate
            </button>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', maxWidth: '560px', margin: '0 auto' }}>
            {[['3', 'Debate Modes'], ['5', 'AI Agents'], ['10', 'Max Players'], ['100%', 'Real-time']].map(([val, label]) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '16px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#fff', lineHeight: 1 }}>{val}</div>
                <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '4px', fontWeight: 500 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI AGENTS */}
      <section style={{ padding: '80px 24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#6366f1', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '12px' }}>Five AI Roles</p>
            <h2 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 900, letterSpacing: '-2px', color: '#fff' }}>Your AI Debate Squad</h2>
            <p style={{ color: '#4b5563', marginTop: '12px', fontSize: '15px' }}>Select one or combine all six. Each runs simultaneously with its own job.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {agents.map(a => (
              <div key={a.name} style={{ background: a.bg, border: `1px solid ${a.border}`, borderRadius: '18px', padding: '24px' }}>
                <h3 style={{ fontWeight: 800, fontSize: '15px', color: a.color, marginBottom: '8px' }}>{a.name}</h3>
                <p style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.6 }}>{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: '80px 24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#6366f1', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '12px' }}>How it works</p>
            <h2 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 900, letterSpacing: '-2px', color: '#fff' }}>From Topic to Verdict</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '14px' }}>
            {steps.map(s => (
              <div key={s.num} style={{ position: 'relative', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '28px', overflow: 'hidden' }}>
                {/* Big faint watermark number (now actually visible) */}
                <span style={{ position: 'absolute', top: '8px', right: '20px', fontSize: '88px', fontWeight: 900, color: 'rgba(129,140,248,0.10)', lineHeight: 1, pointerEvents: 'none' }}>{s.num}</span>

                {/* Crisp number badge */}
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #6366f1, #818cf8)', color: '#fff', fontSize: '16px', fontWeight: 900, marginBottom: '18px', boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}>
                  {s.num}
                </div>

                <h3 style={{ position: 'relative', fontWeight: 800, fontSize: '18px', color: '#fff', marginBottom: '8px' }}>{s.title}</h3>
                <p style={{ position: 'relative', fontSize: '13.5px', color: '#9ca3af', lineHeight: 1.7 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOR vs AGAINST */}
      <section style={{ padding: '80px 24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '40px' }}>
            <div style={{ background: 'rgba(34,197,94,0.08)', padding: '40px 32px', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '52px', fontWeight: 900, color: '#22c55e', letterSpacing: '-2px', marginBottom: '12px' }}>FOR</div>
              <p style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.6 }}>Make your case. Back it with evidence. Change minds.</p>
            </div>
            <div style={{ background: 'rgba(239,68,68,0.08)', padding: '40px 32px', textAlign: 'center' }}>
              <div style={{ fontSize: '52px', fontWeight: 900, color: '#ef4444', letterSpacing: '-2px', marginBottom: '12px' }}>AGAINST</div>
              <p style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.6 }}>Challenge assumptions. Expose weak logic. Win the room.</p>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: '#374151', marginBottom: '24px' }}>Built for university debate clubs, corporate training, and competitive debaters</p>
            <button
              onClick={() => router.push('/auth/signup')}
              style={{ padding: '16px 40px', fontSize: '16px', fontWeight: 900, color: '#fff', background: '#6366f1', border: 'none', borderRadius: '14px', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 0 40px rgba(99,102,241,0.4)' }}
            >
              Start Debating Free
            </button>
            <p style={{ fontSize: '12px', color: '#374151', marginTop: '12px' }}>10 free credits on signup. No card required.</p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '16px', fontWeight: 900, color: 'rgba(255,255,255,0.2)' }}>PODIUM</span>
        <p style={{ fontSize: '12px', color: '#1f2937' }}>AI analysis only. Not affiliated with any institution.</p>
      </footer>

    </div>
  );
}
