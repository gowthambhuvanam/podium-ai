'use client';

import { useRouter } from 'next/navigation';

const features = [
  { title: 'Solo Mode', desc: 'Debate AI one-on-one on any topic' },
  { title: '1v1 Mode', desc: 'Challenge a friend to a live debate' },
  { title: 'Group Debates', desc: 'Up to 10 participants in one room' },
  { title: 'AI Agents', desc: 'Participant, Coach, Interrogator, Judge and more' },
  { title: 'Real-time Analysis', desc: 'Fallacy detection and momentum tracking live' },
  { title: 'Performance Cards', desc: 'Detailed breakdown after every debate' },
];

export default function HomePage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <span className="text-xl font-bold tracking-tight">Podium</span>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/auth/login')}
            className="px-4 py-2 text-sm text-gray-300 hover:text-white transition"
          >
            Sign in
          </button>
          <button
            onClick={() => router.push('/auth/signup')}
            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 rounded-lg transition font-medium"
          >
            Get started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <div className="inline-block bg-indigo-950 text-indigo-400 text-xs font-semibold px-3 py-1 rounded-full mb-6 border border-indigo-800">
          AI-Powered Debate Platform
        </div>
        <h1 className="text-5xl font-bold tracking-tight mb-6 leading-tight">
          Debate smarter.<br />
          <span className="text-indigo-400">Think deeper.</span>
        </h1>
        <p className="text-gray-400 text-lg mb-10 max-w-2xl mx-auto">
          Real-time AI debate platform with multi-agent intelligence. Solo, 1v1, or group debates
          with live fallacy detection, coaching, and detailed performance analysis.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => router.push('/auth/signup')}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold transition"
          >
            Start debating free
          </button>
          <button
            onClick={() => router.push('/debate/create')}
            className="px-6 py-3 border border-gray-700 hover:border-gray-500 rounded-lg font-semibold transition text-gray-300"
          >
            Create a debate
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(f => (
            <div key={f.title} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-6 py-6 text-center text-gray-600 text-sm">
        Podium — AI debate platform.
      </footer>
    </main>
  );
}
