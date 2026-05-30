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
interface CoachWhisper { content: string; stance: string; }

const ROLE_COLORS: Record<string, string> = {
  participant: 'text-blue-400',
  devils_advocate: 'text-red-400',
  interrogator: 'text-yellow-400',
  steelman: 'text-green-400',
  judge: 'text-purple-400',
  coach: 'text-orange-400',
};

const ROLE_LABELS: Record<string, string> = {
  participant: 'AI Participant',
  devils_advocate: "Devil's Advocate",
  interrogator: 'Interrogator',
  steelman: 'Steelman',
  judge: 'Judge',
  coach: 'Coach',
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
  const [briefing, setBriefing] = useState<{ keyArguments: string[]; counterarguments: string[]; statistics: string[] } | null>(null);
  const [verdict, setVerdict] = useState<Record<string, unknown> | null>(null);
  const [coachTip, setCoachTip] = useState('');
  const [fallacyAlerts, setFallacyAlerts] = useState<FallacyAlert[]>([]);
  const [topic, setTopic] = useState('');
  const [sharpenedTopic, setSharpenedTopic] = useState('');
  const [connected, setConnected] = useState(false);
  const [roomLink, setRoomLink] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef(connectSocket());

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages, streamingMessages]);

  useEffect(() => {
    setRoomLink(window.location.href);
  }, []);

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
      setStatus(room.status as 'waiting' | 'briefing' | 'active' | 'completed');
      loadBriefing(room.sharpened_topic || room.topic);
      setStatus('briefing');
    });

    socket.on('participant_joined', () => {});

    socket.on('new_message', (msg: Message) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on('ai_chunk', ({ role, chunk }: { role: string; chunk: string }) => {
      setStreamingMessages(prev => ({
        ...prev,
        [role]: (prev[role] || '') + chunk,
      }));
    });

    socket.on('ai_message_complete', (msg: Message) => {
      setStreamingMessages(prev => {
        const next = { ...prev };
        delete next[msg.ai_role || ''];
        return next;
      });
      setMessages(prev => [...prev, msg]);
    });

    socket.on('momentum_update', (m: Momentum) => setMomentum(m));

    socket.on('fallacy_detected', (alert: FallacyAlert) => {
      setFallacyAlerts(prev => [alert, ...prev].slice(0, 5));
    });

    socket.on('coach_whisper', ({ content }: CoachWhisper) => {
      setCoachTip(content);
      setTimeout(() => setCoachTip(''), 15000);
    });

    socket.on('debate_started', () => setStatus('active'));
    socket.on('debate_ending', () => setStatus('completed'));
    socket.on('debate_ended', ({ verdict: v }: { verdict: Record<string, unknown> }) => {
      setVerdict(v);
      setStatus('completed');
    });

    // Join room
    socket.emit('join_room', { debate_id: debateId, user_id: userId, user_name: userName, stance });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('room_joined');
      socket.off('participant_joined');
      socket.off('new_message');
      socket.off('ai_chunk');
      socket.off('ai_message_complete');
      socket.off('momentum_update');
      socket.off('fallacy_detected');
      socket.off('coach_whisper');
      socket.off('debate_started');
      socket.off('debate_ending');
      socket.off('debate_ended');
      disconnectSocket();
    };
  }, [debateId, userId, userName, stance, loadBriefing]);

  const startDebate = () => {
    socketRef.current.emit('start_debate', { debate_id: debateId });
    setStatus('active');
  };

  const sendMessage = () => {
    if (!input.trim() || status !== 'active') return;
    socketRef.current.emit('send_message', {
      debate_id: debateId,
      user_id: userId,
      user_name: userName,
      content: input.trim(),
      stance,
    });
    setInput('');
  };

  const endDebate = () => {
    socketRef.current.emit('end_debate', { debate_id: debateId });
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-800 px-4 py-3 flex items-center justify-between bg-gray-900">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Podium</p>
          <h1 className="text-sm font-semibold text-white truncate">{sharpenedTopic || topic || 'Loading...'}</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`}></span>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
            stance === 'for' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
          }`}>
            {stance === 'for' ? 'FOR' : 'AGAINST'}
          </span>
          {status === 'active' && (
            <button onClick={endDebate} className="text-xs text-red-400 hover:text-red-300 border border-red-800 px-2 py-1 rounded-lg">
              End debate
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main debate area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Momentum bar */}
          <div className="px-4 py-2 border-b border-gray-800">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <span className="text-green-400 font-medium">FOR {momentum.for}</span>
              <div className="flex-1 bg-gray-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-red-500 transition-all duration-500"
                  style={{ width: `${momentum.for}%` }}
                />
              </div>
              <span className="text-red-400 font-medium">AGAINST {momentum.against}</span>
            </div>
          </div>

          {/* Briefing state */}
          {status === 'briefing' && briefing && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="max-w-xl mx-auto">
                <h2 className="text-lg font-bold mb-1">Your Briefing</h2>
                <p className="text-gray-400 text-sm mb-4">You are arguing <strong className={stance === 'for' ? 'text-green-400' : 'text-red-400'}>{stance.toUpperCase()}</strong></p>

                <div className="space-y-4 mb-6">
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-green-400 mb-2">Key Arguments</h3>
                    <ul className="space-y-1">
                      {briefing.keyArguments.map((arg, i) => (
                        <li key={i} className="text-sm text-gray-300 flex gap-2"><span className="text-gray-600">{i + 1}.</span>{arg}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-yellow-400 mb-2">Expect These Counterarguments</h3>
                    <ul className="space-y-1">
                      {briefing.counterarguments.map((arg, i) => (
                        <li key={i} className="text-sm text-gray-300 flex gap-2"><span className="text-gray-600">{i + 1}.</span>{arg}</li>
                      ))}
                    </ul>
                  </div>
                  {briefing.statistics.length > 0 && (
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                      <h3 className="text-sm font-semibold text-blue-400 mb-2">Statistics You Can Use</h3>
                      <ul className="space-y-1">
                        {briefing.statistics.map((stat, i) => (
                          <li key={i} className="text-sm text-gray-300 flex gap-2"><span className="text-gray-600">{i + 1}.</span>{stat}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="bg-gray-800 rounded-xl p-3 mb-4">
                  <p className="text-xs text-gray-400 mb-1">Share room link</p>
                  <div className="flex gap-2">
                    <input readOnly value={roomLink} className="flex-1 bg-gray-900 text-xs text-gray-300 px-2 py-1.5 rounded border border-gray-700 truncate" />
                    <button onClick={() => navigator.clipboard.writeText(roomLink)} className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1.5 rounded">Copy</button>
                  </div>
                </div>

                <button onClick={startDebate} className="w-full bg-indigo-600 hover:bg-indigo-500 font-semibold py-3 rounded-xl transition">
                  Start Debate
                </button>
              </div>
            </div>
          )}

          {/* Messages */}
          {(status === 'active' || status === 'completed') && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender_name === userName ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-lg rounded-2xl px-4 py-2.5 ${
                    msg.is_ai
                      ? 'bg-gray-800 border border-gray-700'
                      : msg.sender_name === userName
                      ? 'bg-indigo-600'
                      : 'bg-gray-700'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold ${msg.is_ai ? (ROLE_COLORS[msg.ai_role || ''] || 'text-gray-400') : 'text-gray-200'}`}>
                        {msg.is_ai ? ROLE_LABELS[msg.ai_role || ''] || msg.sender_name : msg.sender_name}
                      </span>
                    </div>
                    <p className="text-sm text-gray-100 leading-relaxed">{msg.content}</p>
                    {msg.fallacies && msg.fallacies.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {msg.fallacies.map(f => (
                          <span key={f} className="text-xs bg-red-900 text-red-300 px-1.5 py-0.5 rounded">{f}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Streaming messages */}
              {Object.entries(streamingMessages).map(([role, content]) => content && (
                <div key={role} className="flex justify-start">
                  <div className="max-w-lg rounded-2xl px-4 py-2.5 bg-gray-800 border border-gray-700">
                    <span className={`text-xs font-semibold ${ROLE_COLORS[role] || 'text-gray-400'}`}>
                      {ROLE_LABELS[role] || role}
                    </span>
                    <p className="text-sm text-gray-100 mt-1 leading-relaxed">{content}<span className="animate-pulse">|</span></p>
                  </div>
                </div>
              ))}

              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Verdict */}
          {status === 'completed' && verdict && (
            <div className="border-t border-gray-800 p-4 bg-gray-900">
              <h2 className="font-bold text-lg mb-2">Verdict</h2>
              <p className="text-indigo-400 font-semibold mb-1">Winner: {verdict.winner as string}</p>
              <p className="text-gray-300 text-sm mb-3">{verdict.reasoning as string}</p>
              {Array.isArray(verdict.performance_cards) && verdict.performance_cards.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(verdict.performance_cards as Array<{user_name: string; overall_score: number; strongest_argument: string; what_you_missed: string}>).map((card) => (
                    <div key={card.user_name} className="bg-gray-800 rounded-xl p-3 border border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm">{card.user_name}</span>
                        <span className="text-indigo-400 font-bold">{card.overall_score}/100</span>
                      </div>
                      <p className="text-xs text-green-400 mb-1">Best: {card.strongest_argument}</p>
                      <p className="text-xs text-amber-400">Missed: {card.what_you_missed}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Input */}
          {status === 'active' && (
            <div className="border-t border-gray-800 p-4 bg-gray-900">
              {coachTip && (
                <div className="mb-2 bg-amber-950 border border-amber-800 rounded-lg px-3 py-2 text-xs text-amber-300">
                  Coach: {coachTip}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Make your argument..."
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 placeholder-gray-600"
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 px-4 py-2.5 rounded-xl font-semibold text-sm transition"
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: fallacy alerts */}
        {fallacyAlerts.length > 0 && (
          <div className="w-64 border-l border-gray-800 p-3 overflow-y-auto hidden lg:block">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Fallacy Alerts</h3>
            <div className="space-y-2">
              {fallacyAlerts.map((alert, i) => (
                <div key={i} className="bg-red-950 border border-red-900 rounded-lg p-2">
                  <p className="text-xs font-medium text-red-300">{alert.sender_name}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {alert.fallacies.map(f => (
                      <span key={f} className="text-xs text-red-400">{f}</span>
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
