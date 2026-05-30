'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signUp } from '@/lib/supabase';

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

  return (
    <main className="min-h-screen bg-[#08080f] grid-bg flex items-center justify-center px-4 relative">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <button onClick={() => router.push('/')} className="block text-center mb-8">
          <span className="text-2xl font-black tracking-tight text-white">PODIUM</span>
        </button>

        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8">
          <h1 className="text-2xl font-black mb-1 text-white">Enter the Arena</h1>
          <p className="text-gray-500 text-sm mb-6">Create your account. 10 free credits included.</p>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-indigo-500/60 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder-gray-600"
                placeholder="Your name"
              />
            </div>
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
                placeholder="Min 6 characters"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed font-bold py-3 rounded-xl transition-all text-sm glow-indigo"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/[0.06] text-center">
            <p className="text-gray-600 text-sm">
              Already have an account?{' '}
              <button onClick={() => router.push('/auth/login')} className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                Sign in
              </button>
            </p>
          </div>
        </div>

        {/* FOR vs AGAINST decorative */}
        <div className="flex justify-center gap-6 mt-6">
          <span className="text-xs font-bold text-green-500/40 tracking-widest">FOR</span>
          <span className="text-xs text-gray-700">vs</span>
          <span className="text-xs font-bold text-red-500/40 tracking-widest">AGAINST</span>
        </div>
      </div>
    </main>
  );
}
