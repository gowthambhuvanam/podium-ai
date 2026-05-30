'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { getBriefing } from '@/lib/api';

interface Message {
  id: string;
  sender_name: string;
  content: string;
  is_ai: boolean;
  ai_role?: string;
  fallacies?: string[];
  timestamp: string;
}

interface Momentum { for: number; against: number; }
interface FallacyAlert { message_id: string; sender_name: string; fallacies: string[]; }
interface Briefing { keyArguments: string[]; counterarguments: string[]; statistics: string[]; }
interface PerformanceCard { user_name: string; overall_score: number; strongest_argument: string; what_you_missed: string; logic_score: number; }
interface Verdict { winner: string; reasoning: string; key_moments: string[]; final_scores: { for: number; against: number }; performance_cards: PerformanceCard[]; }

const AGENT_STYLES: Record<string, { color: string; bg: string; border: string; label: string }> = {
  participant:     { color: 'text-indigo-400',  bg: 'bg-indigo-500/10',  border: 'border-indigo-500/20',  label: 'Participant' },
  devils_advocate: { color: 'text-red-400',     bg: 'bg-red-500/10',    border: 'border-red-500/20',    label: "Devil's Advocate" },
  interrogator:   { color: 'text-yellow-400',  bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', label: 'Interrogator' },
  steelman:       { color: 'text-emerald-400', bg: 'bg-emerald-500/10',border: 'border-emerald-500/20',label: 'Steelman' },
  judge:          { color: 'text-purple-400',  bg: 'bg-purple-500/10', border: 'border-purple-500/20', label: 'Judge' },
  coach:          { color: 'text-orange-400',  bg: 'bg-orange-500/10', border: 'border-orange-500/20', label: 'Coach' },
};

export default function DebateRoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const debateId = params.id as string;
  const stance = searchParams.get('stance') || 'for';
  const userName = searchParams.get('name') || 'You';
  const userId = searchParams.get('user_id') || 'guest';

  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingMessages, setStreamingMessages] = useState<Record<string, string>>({});
  const [input, setInput] = useState('');
  const [momentum, setMomentum] = useState<Momentum>({ for: 50, against: 50 });
  const [status, setStatus] = useState<'waiting' | 'briefing' | 'active' | 'completed'>('waiting');
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [coachTip, setCoachTip] = useState('');
  const [fallacyAlerts, setFallacyAlerts] = useState<FallacyAlert[]>([]);
  const [topic, setTopic] = useState('');
  const [sharpenedTopic, setSharpenedTopic] = useState('');
  const [connected, setConnected] = useState(false);
  const [roomLink, setRoomLink] = useState('');
  const [copied, setCopied] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef(connectSocket());

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, streamingMessages]);
  useEffect(() => { setRoomLink(window.location.href); }, []);

  const loadBriefing = useCallback(async (topicText: string) => {
    try {
      const data = await getBriefing({ topic: topicText, stance, skill_level: 'intermediate' });
      setBriefing(data);
    } catch { /* silent */ }
  }, [stance]);

  useEffect(() => {
    const socket = socketRef.current;
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('room_joined', ({ room }: { room: { topic: string; sharpened_topic: string; status: string } }) => {
      setTopic(room.topic);
      setSharpenedTopic(room.sharpened_topic || room.topic);
      loadBriefing(room.sharpened_topic || room.topic);
      setStatus('briefing');
    });

    socket.on('new_message', (msg: Message) => setMessages(prev => [...prev, msg]));

    socket.on('ai_chunk', ({ role, chunk }: { role: string; chunk: string }) => {
      setStreamingMessages(prev => ({ ...prev, [role]: (prev[role] || '') + chunk }));
    });

    socket.on('ai_message_complete', (msg: Message) => {
      setStreamingMessages(prev => { const next = { ...prev }; delete next[msg.ai_role || '']; return next; });
      setMessages(prev => [...prev, msg]);
    });

    socket.on('momentum_update', (m: Momentum) => setMomentum(m));

    socket.on('fallacy_detected', (alert: FallacyAlert) => {
      setFallacyAlerts(prev => [alert, ...prev].slice(0, 5));
    });

    socket.on('coach_whisper', ({ content }: { content: string }) => {
      setCoachTip(content);
      setTimeout(() => setCoachTip(''), 15000);
    });

    socket.on('debate_started', () => setStatus('active'));
    socket.on('debate_ending', () => setStatus('completed'));
    socket.on('debate_ended', ({ verdict: v }: { verdict: Verdict }) => { setVerdict(v); setStatus('completed'); });

    socket.emit('join_room', { debate_id: debateId, user_id: userId, user_name: userName, stance });

    return () => {
      ['connect','disconnect','room_joined','new_message','ai_chunk','ai_message_complete',
       'momentum_update','fallacy_detected','coach_whisper','debate_started','debate_ending','debate_ended']
        .forEach(e => socket.off(e));
      disconnectSocket();
    };
  }, [debateId, userId, userName, stance, loadBriefing]);

  const startDebate = () => { socketRef.current.emit('start_debate', { debate_id: debateId }); setStatus('active'); };
  const sendMessage = () => {
    if (!input.trim() || status !== 'active') return;
    socketRef.current.emit('send_message', { debate_id: debateId, user_id: userId, user_name: userName, content: input.trim(), stance });
    setInput('');
  };
  const endDebate = () => socketRef.current.emit('end_debate', { debate_id: debateId });

  const copyLink = () => {
    navigator.clipboard.writeText(roomLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const forPct = Math.round((momentum.for / (momentum.for + momentum.against)) * 100);

  return (
    <main className="h-screen bg-[#08080f] text-white flex flex-col overflow-hidden">

      {/* Top bar — scoreboard */}
      <div className="flex-shrink-0 border-b border-white/[0.06] bg-[#0f0f1a]">
        {/* Momentum scoreboard */}
        <div className="flex items-center h-12 px-4 gap-4">
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs font-black text-green-400 tracking-widest w-8 text-right">{momentum.for}</span>
            <span className="text-xs font-bold text-gray-600">FOR</span>
          </div>

          <div className="flex-1 relative h-2 bg-white/[0.05] rounded-full overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-green-500 rounded-full momentum-fill" style={{ width: `${forPct}%` }} />
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs font-bold text-gray-600">AGAINST</span>
            <span className="text-xs font-black text-red-400 tracking-widest w-8">{momentum.against}</span>
          </div>

          <div className="flex items-center gap-2 ml-4">
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400 pulse-dot' : 'bg-red-500'}`} />
            <span className={`text-xs px-2.5 py-1 rounded-full font-bold text-xs ${
              stance === 'for' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
            }`}>
              {stance.toUpperCase()}
            </span>
            {status === 'active' && (
              <button onClick={endDebate} className="text-xs px-2.5 py-1 border border-red-800/60 text-red-500 hover:text-red-400 rounded-lg transition-colors ml-1">
                End
              </button>
            )}
          </div>
        </div>

        {/* Topic bar */}
        <div className="px-4 pb-2">
          <p className="text-xs text-gray-500 truncate">
            <span className="text-gray-700 mr-1">TOPIC</span>
            {sharpenedTopic || topic || 'Loading...'}
          </p>
        </div>
      </div>

      {/* Content area */}
      <div className="flex flex-1 overflow-hidden">

        {/* Main panel */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* BRIEFING */}
          {status === 'briefing' && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-lg mx-auto">
                <div className="mb-6">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Pre-debate Briefing</p>
                  <h2 className="text-2xl font-black text-white">You are arguing{' '}
                    <span className={stance === 'for' ? 'gradient-text-for' : 'gradient-text-against'}>
                      {stance.toUpperCase()}
                    </span>
                  </h2>
                </div>

                {briefing ? (
                  <div className="space-y-4 mb-6">
                    <div className="bg-green-500/8 border border-green-500/20 rounded-2xl p-5">
                      <p className="text-xs font-bold text-green-400 uppercase tracking-widest mb-3">Key Arguments</p>
                      <ul className="space-y-2">
                        {briefing.keyArguments.map((arg, i) => (
                          <li key={i} className="text-sm text-gray-300 flex gap-3">
                            <span className="text-gray-600 font-bold mt-0.5">{i + 1}</span>{arg}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-yellow-500/8 border border-yellow-500/20 rounded-2xl p-5">
                      <p className="text-xs font-bold text-yellow-400 uppercase tracking-widest mb-3">Expect These Counterarguments</p>
                      <ul className="space-y-2">
                        {briefing.counterarguments.map((arg, i) => (
                          <li key={i} className="text-sm text-gray-300 flex gap-3">
                            <span className="text-gray-600 font-bold mt-0.5">{i + 1}</span>{arg}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {briefing.statistics.length > 0 && (
                      <div className="bg-indigo-500/8 border border-indigo-500/20 rounded-2xl p-5">
                        <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3">Stats You Can Use</p>
                        <ul className="space-y-2">
                          {briefing.statistics.map((stat, i) => (
                            <li key={i} className="text-sm text-gray-300 flex gap-3">
                              <span className="text-gray-600 font-bold mt-0.5">{i + 1}</span>{stat}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-gray-600 mb-6">
                    <div className="w-4 h-4 border-2 border-indigo-500/40 border-t-indigo-500 rounded-full animate-spin" />
                    <span className="text-sm">Generating your briefing...</span>
                  </div>
                )}

                {/* Room link */}
                <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4 mb-5">
                  <p className="text-xs font-semibold text-gray-500 mb-2">Invite opponents — share room link</p>
                  <div className="flex gap-2">
                    <input readOnly value={roomLink} className="flex-1 bg-white/[0.04] border border-white/[0.07] text-xs text-gray-400 px-3 py-2 rounded-xl outline-none truncate" />
                    <button onClick={copyLink} className="text-xs font-semibold px-3 py-2 bg-white/[0.06] hover:bg-white/[0.1] rounded-xl transition-colors">
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                <button
                  onClick={startDebate}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 font-black text-base py-4 rounded-2xl transition-all glow-indigo"
                >
                  Start Debate
                </button>
              </div>
            </div>
          )}

          {/* ACTIVE DEBATE — Messages */}
          {(status === 'active' || status === 'completed') && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && status === 'active' && (
                <div className="text-center py-16">
                  <p className="text-gray-700 text-sm">Make the first argument.</p>
                </div>
              )}

              {messages.map(msg => {
                const isMe = msg.sender_name === userName && !msg.is_ai;
                const agentStyle = msg.is_ai ? AGENT_STYLES[msg.ai_role || ''] : null;

                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[72%] rounded-2xl px-4 py-3 border ${
                      msg.is_ai && agentStyle
                        ? `${agentStyle.bg} ${agentStyle.border}`
                        : isMe
                        ? 'bg-indigo-600/80 border-indigo-500/30'
                        : 'bg-white/[0.05] border-white/[0.08]'
                    }`}>
                      {/* Sender label */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-xs font-bold ${msg.is_ai && agentStyle ? agentStyle.color : 'text-gray-300'}`}>
                          {msg.is_ai && agentStyle ? agentStyle.label : msg.sender_name}
                        </span>
                        <span className="text-xs text-gray-700">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <p className="text-sm text-gray-100 leading-relaxed">{msg.content}</p>

                      {/* Fallacy tags */}
                      {msg.fallacies && msg.fallacies.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {msg.fallacies.map(f => (
                            <span key={f} className="text-xs bg-red-500/20 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full">{f}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Streaming AI messages */}
              {Object.entries(streamingMessages).map(([role, content]) => content && (
                <div key={role} className="flex justify-start">
                  <div className={`max-w-[72%] rounded-2xl px-4 py-3 border ${AGENT_STYLES[role]?.bg || 'bg-white/[0.05]'} ${AGENT_STYLES[role]?.border || 'border-white/[0.08]'}`}>
                    <span className={`text-xs font-bold block mb-1.5 ${AGENT_STYLES[role]?.color || 'text-gray-400'}`}>
                      {AGENT_STYLES[role]?.label || role}
                    </span>
                    <p className="text-sm text-gray-100 leading-relaxed">{content}<span className="typing-cursor" /></p>
                  </div>
                </div>
              ))}

              <div ref={messagesEndRef} />
            </div>
          )}

          {/* VERDICT */}
          {status === 'completed' && verdict && (
            <div className="flex-shrink-0 border-t border-white/[0.06] p-4 bg-[#0f0f1a] overflow-y-auto max-h-64">
              <div className="flex items-start gap-3 mb-3">
                <div>
                  <p className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-0.5">Verdict</p>
                  <p className="font-black text-xl text-white">{verdict.winner}</p>
                  <p className="text-sm text-gray-400 mt-1">{verdict.reasoning}</p>
                </div>
                <div className="ml-auto flex gap-3 flex-shrink-0">
                  <div className="text-center">
                    <div className="text-2xl font-black text-green-400">{verdict.final_scores.for}</div>
                    <div className="text-xs text-gray-600">FOR</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-black text-red-400">{verdict.final_scores.against}</div>
                    <div className="text-xs text-gray-600">AGAINST</div>
                  </div>
                </div>
              </div>

              {verdict.performance_cards.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {verdict.performance_cards.map(card => (
                    <div key={card.user_name} className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-bold text-white">{card.user_name}</span>
                        <span className="text-lg font-black text-indigo-400">{card.overall_score}</span>
                      </div>
                      <p className="text-xs text-green-400 mb-0.5">Best: {card.strongest_argument}</p>
                      <p className="text-xs text-amber-400">Missed: {card.what_you_missed}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Input */}
          {status === 'active' && (
            <div className="flex-shrink-0 border-t border-white/[0.06] p-4 bg-[#0f0f1a]">
              {coachTip && (
                <div className="mb-3 flex gap-2 bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-2.5">
                  <span className="text-xs font-bold text-orange-400 flex-shrink-0 mt-0.5">COACH</span>
                  <span className="text-xs text-orange-300">{coachTip}</span>
                </div>
              )}
              <div className="flex gap-3">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder={`Argue ${stance === 'for' ? 'FOR' : 'AGAINST'} the motion...`}
                  className="flex-1 bg-white/[0.04] border border-white/[0.08] focus:border-indigo-500/50 rounded-2xl px-4 py-3 text-sm text-white outline-none transition-colors placeholder-gray-700"
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed px-5 py-3 rounded-2xl font-bold text-sm transition-all"
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar — fallacy alerts */}
        {fallacyAlerts.length > 0 && (
          <div className="w-56 flex-shrink-0 border-l border-white/[0.06] bg-[#0f0f1a] p-3 overflow-y-auto hidden lg:block">
            <p className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-3">Fallacies Detected</p>
            <div className="space-y-2">
              {fallacyAlerts.map((alert, i) => (
                <div key={i} className="bg-red-500/10 border border-red-500/20 rounded-xl p-2.5">
                  <p className="text-xs font-bold text-red-400 mb-1">{alert.sender_name}</p>
                  <div className="flex flex-wrap gap-1">
                    {alert.fallacies.map(f => (
                      <span key={f} className="text-xs text-red-500">{f}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
