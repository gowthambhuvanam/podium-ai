'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signUp } from '@/lib/supabase';
import { PodiumMark } from '@/components/Logo';

export default function SignUpPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signUp(form.email, form.password, form.name);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px', padding: '12px 16px', color: '#fff', fontSize: '14px',
    outline: 'none', fontFamily: 'inherit',
  };

  const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7280', letterSpacing: '1.5px', textTransform: 'uppercase' as const, marginBottom: '8px' };

  return (
    <div style={{ minHeight: '100vh', background: '#09090f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative' }}>
      {/* Glow */}
      <div style={{ position: 'fixed', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: '500px', height: '500px', background: 'radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: '420px', position: 'relative' }}>
        {/* Logo */}
        <button onClick={() => router.push('/')} style={{ display: 'block', width: '100%', textAlign: 'center', marginBottom: '32px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
            <PodiumMark size={28} />
            <span style={{ fontSize: '22px', fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>PODIUM</span>
          </span>
        </button>

        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '32px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#fff', marginBottom: '4px', letterSpacing: '-0.5px' }}>Enter the Arena</h1>
          <p style={{ fontSize: '13px', color: '#4b5563', marginBottom: '28px' }}>Create your account. 10 free credits included.</p>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', padding: '12px 16px', color: '#f87171', fontSize: '13px', marginBottom: '20px' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Name</label>
              <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} placeholder="Your name" />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Email</label>
              <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inputStyle} placeholder="you@example.com" />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Password</label>
              <input type="password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} style={inputStyle} placeholder="Min 6 characters" />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '14px', fontSize: '14px', fontWeight: 800, color: '#fff', background: loading ? '#4f46e5' : '#6366f1', border: 'none', borderRadius: '12px', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', boxShadow: '0 0 24px rgba(99,102,241,0.35)' }}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: '#4b5563' }}>
              Already have an account?{' '}
              <button onClick={() => router.push('/auth/login')} style={{ color: '#818cf8', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px' }}>
                Sign in
              </button>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '24px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(74,222,128,0.3)', letterSpacing: '2px' }}>FOR</span>
          <span style={{ fontSize: '11px', color: '#1f2937' }}>vs</span>
          <span style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(248,113,113,0.3)', letterSpacing: '2px' }}>AGAINST</span>
        </div>
      </div>
    </div>
  );
}
