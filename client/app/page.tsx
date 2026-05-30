'use client';

import { useRouter } from 'next/navigation';

const agents = [
  { name: 'Participant', desc: 'Debates as an active human-like debater', color: 'agent-participant', border: 'border-indigo-500/30', bg: 'bg-indigo-500/10' },
  { name: "Devil's Advocate", desc: 'Challenges the winning side to keep balance', color: 'agent-devils_advocate', border: 'border-red-500/30', bg: 'bg-red-500/10' },
  { name: 'Interrogator', desc: 'Asks sharp Socratic questions only', color: 'agent-interrogator', border: 'border-yellow-500/30', bg: 'bg-yellow-500/10' },
  { name: 'Coach', desc: 'Whispers private tactics to your side', color: 'agent-coach', border: 'border-orange-500/30', bg: 'bg-orange-500/10' },
  { name: 'Steelman', desc: 'Builds the strongest version of weak arguments', color: 'agent-steelman', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10' },
  { name: 'Judge', desc: 'Observes silently and delivers the final verdict', color: 'agent-judge', border: 'border-purple-500/30', bg: 'bg-purple-500/10' },
];

const stats = [
  { value: '3', label: 'Debate Modes' },
  { value: '6', label: 'AI Agents' },
  { value: '10', label: 'Max Participants' },
  { value: '100%', label: 'Real-time' },
];

const steps = [
  { num: '01', title: 'Set the stage', desc: 'Enter any topic. AI sharpens it into a clear proposition and predicts how the room will lean.' },
  { num: '02', title: 'Choose your agents', desc: 'Select one or all six AI roles. Each runs simultaneously — coaching, interrogating, arguing, judging.' },
  { num: '03', title: 'Debate live', desc: 'Every argument is analyzed in real time. Fallacies flagged. Momentum tracked. Coach whispering in your ear.' },
  { num: '04', title: 'Get your verdict', desc: 'Full performance breakdown. Who won, why, what you missed, and what to do better next time.' },
];

export default function HomePage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#08080f] text-white overflow-x-hidden">

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#08080f]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-lg font-black tracking-tight text-white">PODIUM</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/auth/login')}
              className="px-4 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Sign in
            </button>
            <button
              onClick={() => router.push('/auth/signup')}
              className="px-4 py-1.5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
            >
              Get started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center px-6 grid-bg pt-14">
        {/* Gradient orbs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-green-500/8 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-red-500/8 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          {/* FOR vs AGAINST pill */}
          <div className="inline-flex items-center gap-3 bg-white/[0.04] border border-white/[0.08] rounded-full px-4 py-1.5 mb-8">
            <span className="text-xs font-bold text-green-400 tracking-widest">FOR</span>
            <span className="w-px h-3 bg-white/20" />
            <span className="text-xs font-medium text-gray-400">AI-Powered Debate Platform</span>
            <span className="w-px h-3 bg-white/20" />
            <span className="text-xs font-bold text-red-400 tracking-widest">AGAINST</span>
          </div>

          <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-none mb-6">
            <span className="gradient-text">THE ARENA FOR</span>
            <br />
            <span className="text-white">INTELLIGENT</span>
            <br />
            <span className="gradient-text">DEBATE</span>
          </h1>

          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Real-time debates with six AI agents that argue, coach, interrogate, and judge.
            Solo, 1v1, or group — with live fallacy detection and performance analysis.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-20">
            <button
              onClick={() => router.push('/auth/signup')}
              className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 font-bold text-base rounded-xl transition-all glow-indigo"
            >
              Enter the Arena
            </button>
            <button
              onClick={() => router.push('/debate/create')}
              className="px-8 py-3.5 border border-white/10 hover:border-white/20 bg-white/[0.04] hover:bg-white/[0.07] font-semibold text-base rounded-xl transition-all text-gray-300"
            >
              Create a Debate
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {stats.map(s => (
              <div key={s.label} className="bg-white/[0.03] border border-white/[0.07] rounded-xl py-4 px-2">
                <div className="text-3xl font-black text-white mb-1">{s.value}</div>
                <div className="text-xs text-gray-500 font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Agents section */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-indigo-400 text-xs font-bold tracking-widest uppercase mb-3">Six AI Roles</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">Your AI Debate Squad</h2>
            <p className="text-gray-500 mt-4 max-w-xl mx-auto">Select one or combine all six. Each agent runs simultaneously with its own job.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map(a => (
              <div key={a.name} className={`${a.bg} border ${a.border} rounded-2xl p-5 card-hover cursor-default`}>
                <h3 className={`font-bold text-base mb-2 ${a.color}`}>{a.name}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6 border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-indigo-400 text-xs font-bold tracking-widest uppercase mb-3">How it works</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">From Topic to Verdict</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {steps.map(s => (
              <div key={s.num} className="bg-white/[0.02] border border-white/[0.07] rounded-2xl p-6 card-hover">
                <span className="text-5xl font-black text-white/[0.06] block mb-4 leading-none">{s.num}</span>
                <h3 className="font-bold text-lg text-white mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VS section — FOR vs AGAINST visual */}
      <section className="py-24 px-6 border-t border-white/[0.06] relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="relative max-w-4xl mx-auto">
          <div className="grid grid-cols-2 gap-0 rounded-2xl overflow-hidden border border-white/[0.08]">
            <div className="bg-green-500/10 border-r border-white/[0.08] p-10 text-center">
              <div className="text-5xl font-black gradient-text-for mb-3">FOR</div>
              <p className="text-gray-400 text-sm">Make your case. Back it with evidence. Change minds.</p>
            </div>
            <div className="bg-red-500/10 p-10 text-center">
              <div className="text-5xl font-black gradient-text-against mb-3">AGAINST</div>
              <p className="text-gray-400 text-sm">Challenge assumptions. Expose weak logic. Win the room.</p>
            </div>
          </div>
          <div className="text-center mt-10">
            <p className="text-gray-600 text-sm mb-6">Suitable for university debate clubs, corporate training, and competitive debaters</p>
            <button
              onClick={() => router.push('/auth/signup')}
              className="px-10 py-4 bg-indigo-600 hover:bg-indigo-500 font-black text-lg rounded-xl transition-all glow-indigo"
            >
              Start Debating Free
            </button>
            <p className="text-gray-600 text-xs mt-3">10 free credits on signup. No card required.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] px-6 py-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-lg font-black text-white/40">PODIUM</span>
          <p className="text-gray-700 text-xs">AI analysis only. Not affiliated with any institution.</p>
        </div>
      </footer>

    </main>
  );
}
