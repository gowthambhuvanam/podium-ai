'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signIn(form.email, form.password);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#08080f] grid-bg flex items-center justify-center px-4 relative">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-md">
        <button onClick={() => router.push('/')} className="block text-center mb-8">
          <span className="text-2xl font-black tracking-tight text-white">PODIUM</span>
        </button>

        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8">
          <h1 className="text-2xl font-black mb-1 text-white">Welcome back</h1>
          <p className="text-gray-500 text-sm mb-6">Sign in to your Podium account</p>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-indigo-500/60 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder-gray-600"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Password</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-indigo-500/60 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder-gray-600"
                placeholder="Your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed font-bold py-3 rounded-xl transition-all text-sm glow-indigo"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/[0.06] text-center">
            <p className="text-gray-600 text-sm">
              No account?{' '}
              <button onClick={() => router.push('/auth/signup')} className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                Sign up free
              </button>
            </p>
          </div>
        </div>

        <div className="flex justify-center gap-6 mt-6">
          <span className="text-xs font-bold text-green-500/40 tracking-widest">FOR</span>
          <span className="text-xs text-gray-700">vs</span>
          <span className="text-xs font-bold text-red-500/40 tracking-widest">AGAINST</span>
        </div>
      </div>
    </main>
  );
}
