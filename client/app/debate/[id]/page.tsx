'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
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
interface PerformanceCard { user_name: string; overall_score: number; strongest_argument: string; what_you_missed: string; }
interface Verdict { winner: string; reasoning: string; final_scores: { for: number; against: number }; performance_cards: PerformanceCard[]; }

const FALLACY_EXPLANATIONS: Record<string, string> = {
  'Hasty Generalization': 'Drawing a broad conclusion from too little evidence',
  'Unsubstantiated Claim': 'Stating something as fact without providing proof',
  'Slippery Slope': 'Assuming one event will inevitably lead to extreme consequences',
  'Ad Hominem': 'Attacking the person instead of their argument',
  'Straw Man': 'Misrepresenting the opposing argument to make it easier to attack',
  'Appeal to Emotion': 'Using emotion instead of logic to persuade',
  'False Dichotomy': 'Presenting only two options when more exist',
  'Circular Reasoning': 'Using the conclusion as evidence for itself',
};

const AGENT_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  participant:     { label: 'AI Participant',    color: '#818cf8', bg: 'rgba(129,140,248,0.1)', border: 'rgba(129,140,248,0.25)' },
  devils_advocate: { label: "Devil's Advocate",  color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)' },
  interrogator:   { label: 'Interrogator',       color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)' },
  steelman:       { label: 'Steelman',           color: '#34d399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.25)' },
  judge:          { label: 'Judge',              color: '#c084fc', bg: 'rgba(192,132,252,0.1)', border: 'rgba(192,132,252,0.25)' },
  coach:          { label: 'Coach',              color: '#fb923c', bg: 'rgba(251,146,60,0.1)',  border: 'rgba(251,146,60,0.25)' },
};

type Stage = 'pick-stance' | 'briefing' | 'active' | 'completed';

export default function DebateRoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const debateId = params.id as string;
  const urlStance = searchParams.get('stance') || '';
  const urlName = searchParams.get('name') || 'Debater';
  const urlUserId = searchParams.get('user_id') || 'guest';

  const [stage, setStage] = useState<Stage>(urlStance ? 'briefing' : 'pick-stance');
  const [stance, setStance] = useState(urlStance || '');
  const [userName] = useState(urlName);
  const [userId] = useState(urlUserId);

  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingMessages, setStreamingMessages] = useState<Record<string, string>>({});
  const [input, setInput] = useState('');
  const [momentum, setMomentum] = useState<Momentum>({ for: 50, against: 50 });
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [coachTip, setCoachTip] = useState('');
  const [fallacyAlerts, setFallacyAlerts] = useState<FallacyAlert[]>([]);
  const [topic, setTopic] = useState('');
  const [sharpenedTopic, setSharpenedTopic] = useState('');
  const [connected, setConnected] = useState(false);
  const [roomLink, setRoomLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [hoveredFallacy, setHoveredFallacy] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef(connectSocket());
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, streamingMessages]);
  useEffect(() => { setRoomLink(window.location.href.split('?')[0]); }, []);

  const loadBriefing = useCallback(async (topicText: string, s: string) => {
    try {
      const data = await getBriefing({ topic: topicText, stance: s, skill_level: 'intermediate' });
      setBriefing(data);
    } catch { /* silent */ }
  }, []);

  const joinRoom = useCallback((s: string) => {
    socketRef.current.emit('join_room', { debate_id: debateId, user_id: userId, user_name: userName, stance: s });
  }, [debateId, userId, userName]);

  useEffect(() => {
    const socket = socketRef.current;
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('room_joined', ({ room }: { room: { topic: string; sharpened_topic: string; status: string; messages?: Message[]; momentum?: Momentum } }) => {
      setTopic(room.topic);
      setSharpenedTopic(room.sharpened_topic || room.topic);
      // Load any messages already in the room (for people who join mid-debate)
      if (room.messages && room.messages.length > 0) setMessages(room.messages);
      if (room.momentum) setMomentum(room.momentum);
      // If the debate is already running, jump straight into it — do not get
      // stuck on the briefing screen (this was the 1v1 second-player bug)
      if (room.status === 'active') {
        setStage('active');
      } else if (stance) {
        loadBriefing(room.sharpened_topic || room.topic, stance);
      }
    });

    socket.on('new_message', (msg: Message) => setMessages(prev => [...prev, msg]));

    socket.on('ai_chunk', ({ role, chunk }: { role: string; chunk: string }) => {
      setStreamingMessages(prev => ({ ...prev, [role]: (prev[role] || '') + chunk }));
    });

    socket.on('ai_message_complete', (msg: Message) => {
      setStreamingMessages(prev => { const n = { ...prev }; delete n[msg.ai_role || '']; return n; });
      setMessages(prev => [...prev, msg]);
    });

    socket.on('momentum_update', (m: Momentum) => setMomentum(m));

    socket.on('fallacy_detected', (alert: FallacyAlert) => {
      setFallacyAlerts(prev => [alert, ...prev].slice(0, 8));
    });

    socket.on('coach_whisper', ({ content }: { content: string }) => {
      setCoachTip(content);
      setTimeout(() => setCoachTip(''), 15000);
    });

    socket.on('debate_started', () => setStage('active'));
    socket.on('debate_ended', ({ verdict: v }: { verdict: Verdict }) => { setVerdict(v); setStage('completed'); });

    if (stance) joinRoom(stance);

    return () => {
      ['connect','disconnect','room_joined','new_message','ai_chunk','ai_message_complete',
       'momentum_update','fallacy_detected','coach_whisper','debate_started','debate_ended']
        .forEach(e => socket.off(e));
      disconnectSocket();
    };
  }, [stance, joinRoom, loadBriefing]);

  const handlePickStance = (s: string) => {
    setStance(s);
    setStage('briefing');
    joinRoom(s);
    if (sharpenedTopic || topic) loadBriefing(sharpenedTopic || topic, s);
  };

  const startDebate = () => {
    socketRef.current.emit('start_debate', { debate_id: debateId });
    setStage('active');
  };

  const sendMessage = (text?: string) => {
    const content = (text || input).trim();
    if (!content || stage !== 'active') return;
    socketRef.current.emit('send_message', { debate_id: debateId, user_id: userId, user_name: userName, content, stance });
    setInput('');
  };

  const endDebate = () => socketRef.current.emit('end_debate', { debate_id: debateId });

  const copyLink = () => {
    navigator.clipboard.writeText(roomLink + `?stance=${stance === 'for' ? 'against' : 'for'}&name=Opponent&user_id=guest`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Voice input
  const toggleVoice = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice input is not supported in this browser. Try Chrome.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setIsListening(false); return; }
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      // Fill the text box live so the user can review and edit.
      // Do NOT auto-send — the user reviews, edits, then clicks Send.
      setInput(transcript);
      if (event.results[event.results.length - 1].isFinal) {
        setIsListening(false);
      }
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const forPct = Math.round((momentum.for / (momentum.for + momentum.against)) * 100);
  const stanceColor = stance === 'for' ? '#22c55e' : '#ef4444';
  const stanceLabel = stance === 'for' ? 'FOR' : 'AGAINST';

  // ─── PICK STANCE ──────────────────────────────────────────────────────────
  if (stage === 'pick-stance') {
    return (
      <div style={{ minHeight: '100vh', background: '#09090f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '560px', width: '100%', textAlign: 'center' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '12px' }}>Before you enter</p>
          <h1 style={{ fontSize: '36px', fontWeight: 900, color: '#fff', letterSpacing: '-1px', marginBottom: '8px' }}>Pick your side</h1>
          {(sharpenedTopic || topic) && (
            <p style={{ fontSize: '15px', color: '#6b7280', marginBottom: '40px', lineHeight: 1.6 }}>&ldquo;{sharpenedTopic || topic}&rdquo;</p>
          )}
          {!(sharpenedTopic || topic) && <p style={{ fontSize: '14px', color: '#374151', marginBottom: '40px' }}>Connecting to debate room...</p>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '32px' }}>
            <button
              onClick={() => handlePickStance('for')}
              style={{ background: 'rgba(34,197,94,0.08)', border: '2px solid rgba(34,197,94,0.3)', borderRadius: '20px', padding: '32px 24px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(34,197,94,0.15)'; (e.target as HTMLElement).style.borderColor = 'rgba(34,197,94,0.6)'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.background = 'rgba(34,197,94,0.08)'; (e.target as HTMLElement).style.borderColor = 'rgba(34,197,94,0.3)'; }}
            >
              <div style={{ fontSize: '40px', fontWeight: 900, color: '#22c55e', letterSpacing: '-2px', marginBottom: '8px' }}>FOR</div>
              <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.5 }}>Argue in favor of the motion. Make the case.</div>
            </button>
            <button
              onClick={() => handlePickStance('against')}
              style={{ background: 'rgba(239,68,68,0.08)', border: '2px solid rgba(239,68,68,0.3)', borderRadius: '20px', padding: '32px 24px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(239,68,68,0.15)'; (e.target as HTMLElement).style.borderColor = 'rgba(239,68,68,0.6)'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.background = 'rgba(239,68,68,0.08)'; (e.target as HTMLElement).style.borderColor = 'rgba(239,68,68,0.3)'; }}
            >
              <div style={{ fontSize: '40px', fontWeight: 900, color: '#ef4444', letterSpacing: '-2px', marginBottom: '8px' }}>AGAINST</div>
              <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.5 }}>Challenge the motion. Find the flaws.</div>
            </button>
          </div>
          <p style={{ fontSize: '12px', color: '#1f2937' }}>Your briefing will be tailored to the side you pick</p>
        </div>
      </div>
    );
  }

  // ─── SHARED HEADER ────────────────────────────────────────────────────────
  const againstPct = 100 - forPct;
  const Header = () => (
    <div style={{ flexShrink: 0, background: '#0d0d18', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Top row: label + status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 6px' }}>
        <span style={{ fontSize: '10px', fontWeight: 800, color: '#4b5563', letterSpacing: '2px' }}>MOMENTUM — who is winning the room</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: connected ? '#22c55e' : '#ef4444', display: 'inline-block' }} />
          <span style={{ fontSize: '11px', fontWeight: 800, color: stanceColor, background: `rgba(${stance === 'for' ? '34,197,94' : '239,68,68'},0.12)`, padding: '3px 10px', borderRadius: '999px' }}>
            YOU: {stanceLabel}
          </span>
          {stage === 'active' && (
            <button onClick={endDebate} style={{ fontSize: '11px', fontWeight: 700, color: '#fca5a5', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', padding: '4px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
              End Debate
            </button>
          )}
        </div>
      </div>

      {/* Tug-of-war meter */}
      <div style={{ padding: '0 16px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '13px', fontWeight: 900, color: '#22c55e', minWidth: '54px' }}>FOR {forPct}%</span>
          <div style={{ flex: 1, height: '10px', borderRadius: '999px', overflow: 'hidden', display: 'flex', background: 'rgba(255,255,255,0.04)' }}>
            <div style={{ width: `${forPct}%`, background: 'linear-gradient(90deg, #16a34a, #22c55e)', transition: 'width 0.6s ease' }} />
            <div style={{ width: `${againstPct}%`, background: 'linear-gradient(90deg, #ef4444, #b91c1c)', transition: 'width 0.6s ease' }} />
          </div>
          <span style={{ fontSize: '13px', fontWeight: 900, color: '#ef4444', minWidth: '64px', textAlign: 'right' }}>{againstPct}% AGAINST</span>
        </div>
      </div>

      {/* Topic bar */}
      <div style={{ padding: '0 16px 10px' }}>
        <p style={{ fontSize: '12px', color: '#374151', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          <span style={{ color: '#1f2937', marginRight: '8px', fontWeight: 700 }}>TOPIC</span>
          <span style={{ color: '#6b7280' }}>{sharpenedTopic || topic || 'Loading...'}</span>
        </p>
      </div>
    </div>
  );

  // ─── BRIEFING ─────────────────────────────────────────────────────────────
  if (stage === 'briefing') {
    return (
      <div style={{ height: '100vh', background: '#09090f', color: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header />
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 24px' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ marginBottom: '28px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '6px' }}>Pre-debate Briefing</p>
              <h2 style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-1px' }}>
                You are arguing{' '}
                <span style={{ color: stanceColor }}>{stanceLabel}</span>
              </h2>
            </div>

            {!briefing && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#4b5563', marginBottom: '24px' }}>
                <div style={{ width: '16px', height: '16px', border: '2px solid rgba(99,102,241,0.3)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '14px' }}>Preparing your briefing...</span>
              </div>
            )}

            {briefing && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
                {/* Key Arguments */}
                <div style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '16px', padding: '20px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 800, color: '#22c55e', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '14px' }}>Key Arguments</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {briefing.keyArguments.map((arg, i) => (
                      <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#166534', minWidth: '20px', marginTop: '2px' }}>{i + 1}</span>
                        <span style={{ fontSize: '13px', color: '#d1fae5', lineHeight: 1.6 }}>{arg}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Counterarguments */}
                <div style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '16px', padding: '20px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 800, color: '#fbbf24', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '14px' }}>Expect These Counterarguments</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {briefing.counterarguments.map((arg, i) => (
                      <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#713f12', minWidth: '20px', marginTop: '2px' }}>{i + 1}</span>
                        <span style={{ fontSize: '13px', color: '#fef3c7', lineHeight: 1.6 }}>{arg}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                {briefing.statistics.length > 0 && (
                  <div style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '16px', padding: '20px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 800, color: '#818cf8', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '14px' }}>Stats You Can Use</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {briefing.statistics.map((stat, i) => (
                        <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#3730a3', minWidth: '20px', marginTop: '2px' }}>{i + 1}</span>
                          <span style={{ fontSize: '13px', color: '#e0e7ff', lineHeight: 1.6 }}>{stat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Invite link */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px', marginBottom: '20px' }}>
              <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '10px', fontWeight: 600 }}>
                Invite opponents — share this link (they will join the {stance === 'for' ? 'AGAINST' : 'FOR'} side)
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input readOnly value={roomLink + `?stance=${stance === 'for' ? 'against' : 'for'}&name=Opponent&user_id=guest`}
                  style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '10px 14px', color: '#6b7280', fontSize: '12px', outline: 'none', fontFamily: 'inherit' }}
                />
                <button onClick={copyLink}
                  style={{ padding: '10px 16px', background: copied ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: copied ? '#22c55e' : '#9ca3af', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <button onClick={startDebate}
              style={{ width: '100%', padding: '16px', fontSize: '15px', fontWeight: 900, color: '#fff', background: '#6366f1', border: 'none', borderRadius: '14px', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 0 32px rgba(99,102,241,0.35)', letterSpacing: '0.5px' }}>
              Start Debate
            </button>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ─── ACTIVE + COMPLETED ───────────────────────────────────────────────────
  // ─── COMPLETED — dedicated full-page results ──────────────────────────────
  if (stage === 'completed') {
    const winnerHasFor = verdict?.winner?.toUpperCase().includes('FOR');
    const winnerHasAgainst = verdict?.winner?.toUpperCase().includes('AGAINST');
    const winnerColor = winnerHasFor ? '#22c55e' : winnerHasAgainst ? '#ef4444' : '#818cf8';

    return (
      <div style={{ minHeight: '100vh', background: '#09090f', color: '#fff' }}>
        {/* Slim top bar */}
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 24px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0d0d18' }}>
          <span style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '-0.5px' }}>PODIUM</span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => router.push('/debate/create')} style={{ fontSize: '13px', fontWeight: 700, color: '#fff', background: '#6366f1', border: 'none', borderRadius: '10px', padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit' }}>New Debate</button>
            <button onClick={() => router.push('/dashboard')} style={{ fontSize: '13px', color: '#9ca3af', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit' }}>Dashboard</button>
          </div>
        </div>

        <div style={{ maxWidth: '880px', margin: '0 auto', padding: '40px 24px 60px' }}>
          {/* Topic */}
          <p style={{ fontSize: '13px', color: '#4b5563', marginBottom: '6px', textAlign: 'center' }}>{sharpenedTopic || topic}</p>

          {!verdict && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '60px 0' }}>
              <div style={{ width: '24px', height: '24px', border: '3px solid rgba(99,102,241,0.3)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <p style={{ color: '#6b7280', fontSize: '14px' }}>The judge is analyzing the debate...</p>
            </div>
          )}

          {verdict && (
            <>
              {/* Verdict hero */}
              <div style={{ textAlign: 'center', marginBottom: '36px' }}>
                <p style={{ fontSize: '11px', fontWeight: 800, color: '#c084fc', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '12px' }}>Final Verdict</p>
                <h1 style={{ fontSize: '44px', fontWeight: 900, color: winnerColor, letterSpacing: '-1.5px', marginBottom: '16px' }}>{verdict.winner}</h1>
                <p style={{ fontSize: '15px', color: '#9ca3af', lineHeight: 1.7, maxWidth: '640px', margin: '0 auto' }}>{verdict.reasoning}</p>
              </div>

              {/* Score split */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', marginBottom: '40px', padding: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', fontWeight: 900, color: '#22c55e', lineHeight: 1 }}>{verdict.final_scores.for}</div>
                  <div style={{ fontSize: '11px', color: '#4b5563', fontWeight: 700, letterSpacing: '2px', marginTop: '4px' }}>FOR</div>
                </div>
                <div style={{ width: '1px', background: 'rgba(255,255,255,0.08)' }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', fontWeight: 900, color: '#ef4444', lineHeight: 1 }}>{verdict.final_scores.against}</div>
                  <div style={{ fontSize: '11px', color: '#4b5563', fontWeight: 700, letterSpacing: '2px', marginTop: '4px' }}>AGAINST</div>
                </div>
              </div>

              {/* Performance cards */}
              {verdict.performance_cards.length > 0 && (
                <div style={{ marginBottom: '36px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 800, color: '#6b7280', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '14px' }}>Performance Breakdown</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '12px' }}>
                    {verdict.performance_cards.map(card => (
                      <div key={card.user_name} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                          <span style={{ fontWeight: 800, fontSize: '16px', color: '#fff' }}>{card.user_name}</span>
                          <span style={{ fontSize: '28px', fontWeight: 900, color: '#818cf8' }}>{card.overall_score}<span style={{ fontSize: '14px', color: '#4b5563' }}>/100</span></span>
                        </div>
                        <div style={{ marginBottom: '10px' }}>
                          <p style={{ fontSize: '10px', fontWeight: 700, color: '#22c55e', letterSpacing: '1px', marginBottom: '3px' }}>STRONGEST POINT</p>
                          <p style={{ fontSize: '13px', color: '#d1d5db', lineHeight: 1.5 }}>{card.strongest_argument}</p>
                        </div>
                        <div>
                          <p style={{ fontSize: '10px', fontWeight: 700, color: '#fbbf24', letterSpacing: '1px', marginBottom: '3px' }}>WHAT YOU MISSED</p>
                          <p style={{ fontSize: '13px', color: '#d1d5db', lineHeight: 1.5 }}>{card.what_you_missed}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fallacies detected */}
              {fallacyAlerts.length > 0 && (
                <div style={{ marginBottom: '36px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 800, color: '#6b7280', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>Fallacies Detected</p>
                  <p style={{ fontSize: '12px', color: '#374151', marginBottom: '14px' }}>Logical errors flagged during the debate</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                    {fallacyAlerts.map((alert, i) => (
                      <div key={i} style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '14px', padding: '14px 16px' }}>
                        <p style={{ fontSize: '13px', fontWeight: 800, color: '#f87171', marginBottom: '8px' }}>{alert.sender_name}</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {alert.fallacies.map(f => (
                            <div key={f}>
                              <span style={{ fontSize: '12px', color: '#fca5a5', fontWeight: 700 }}>{f}</span>
                              {FALLACY_EXPLANATIONS[f] && <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px', lineHeight: 1.4 }}>{FALLACY_EXPLANATIONS[f]}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button onClick={() => router.push('/debate/create')} style={{ padding: '14px 32px', fontSize: '15px', fontWeight: 800, color: '#fff', background: '#6366f1', border: 'none', borderRadius: '14px', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 0 32px rgba(99,102,241,0.3)' }}>
                  Start New Debate
                </button>
              </div>
            </>
          )}
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ─── ACTIVE ───────────────────────────────────────────────────────────────
  return (
    <div style={{ height: '100vh', background: '#09090f', color: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Header />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* MAIN CHAT */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.length === 0 && stage === 'active' && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: '#374151', fontSize: '14px' }}>Make the first argument — the debate is live.</p>
              </div>
            )}

            {messages.map(msg => {
              const isMe = msg.sender_name === userName && !msg.is_ai;
              const agent = msg.is_ai ? AGENT_CONFIG[msg.ai_role || ''] : null;
              return (
                <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '70%', borderRadius: '18px', padding: '14px 18px', border: '1px solid', background: msg.is_ai && agent ? agent.bg : isMe ? 'rgba(99,102,241,0.7)' : 'rgba(255,255,255,0.05)', borderColor: msg.is_ai && agent ? agent.border : isMe ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: msg.is_ai && agent ? agent.color : isMe ? '#e0e7ff' : '#9ca3af' }}>
                        {msg.is_ai && agent ? agent.label : msg.sender_name}
                      </span>
                      <span style={{ fontSize: '11px', color: '#374151' }}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p style={{ fontSize: '14px', color: '#e5e7eb', lineHeight: 1.65, margin: 0 }}>{msg.content}</p>
                    {msg.fallacies && msg.fallacies.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                        {msg.fallacies.map(f => (
                          <div key={f} style={{ position: 'relative', display: 'inline-block' }}
                            onMouseEnter={() => setHoveredFallacy(f)}
                            onMouseLeave={() => setHoveredFallacy(null)}>
                            <span style={{ fontSize: '11px', background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', padding: '2px 8px', borderRadius: '999px', cursor: 'help', fontWeight: 600 }}>
                              {f}
                            </span>
                            {hoveredFallacy === f && FALLACY_EXPLANATIONS[f] && (
                              <div style={{ position: 'absolute', bottom: '120%', left: '50%', transform: 'translateX(-50%)', background: '#1a1a2e', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '8px 12px', width: '220px', fontSize: '12px', color: '#d1d5db', lineHeight: 1.5, zIndex: 100, whiteSpace: 'normal' }}>
                                <span style={{ fontWeight: 700, color: '#f87171', display: 'block', marginBottom: '4px' }}>{f}</span>
                                {FALLACY_EXPLANATIONS[f]}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Streaming */}
            {Object.entries(streamingMessages).map(([role, content]) => content && (
              <div key={role} style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ maxWidth: '70%', borderRadius: '18px', padding: '14px 18px', background: AGENT_CONFIG[role]?.bg || 'rgba(255,255,255,0.05)', border: `1px solid ${AGENT_CONFIG[role]?.border || 'rgba(255,255,255,0.08)'}` }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: AGENT_CONFIG[role]?.color || '#9ca3af', display: 'block', marginBottom: '8px' }}>
                    {AGENT_CONFIG[role]?.label || role}
                  </span>
                  <p style={{ fontSize: '14px', color: '#e5e7eb', lineHeight: 1.65, margin: 0 }}>
                    {content}<span style={{ color: '#6366f1', animation: 'blink 1s infinite' }}>|</span>
                  </p>
                </div>
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>

          {/* INPUT */}
          {stage === 'active' && (
            <div style={{ flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.06)', padding: '14px 16px', background: '#0d0d18' }}>
              {coachTip && (
                <div style={{ marginBottom: '10px', display: 'flex', gap: '10px', background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.25)', borderRadius: '12px', padding: '10px 14px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#fb923c', letterSpacing: '1.5px', flexShrink: 0, marginTop: '2px' }}>COACH</span>
                  <span style={{ fontSize: '13px', color: '#fed7aa', lineHeight: 1.5 }}>{coachTip}</span>
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder={`Argue ${stanceLabel} the motion... (or use the mic)`}
                  style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '14px', padding: '12px 16px', color: '#fff', fontSize: '14px', outline: 'none', fontFamily: 'inherit' }}
                />
                {/* Voice button */}
                <button
                  onClick={toggleVoice}
                  title={isListening ? 'Stop listening' : 'Speak your argument'}
                  style={{ width: '44px', height: '44px', borderRadius: '12px', background: isListening ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)', border: `1px solid ${isListening ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}
                >
                  {isListening ? '⏹' : '🎤'}
                </button>
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim()}
                  style={{ padding: '12px 20px', background: input.trim() ? '#6366f1' : 'rgba(99,102,241,0.2)', border: 'none', borderRadius: '14px', color: input.trim() ? '#fff' : '#4b5563', fontSize: '14px', fontWeight: 800, cursor: input.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', flexShrink: 0, transition: 'all 0.15s' }}>
                  Send
                </button>
              </div>
              {isListening && (
                <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '8px', textAlign: 'center' }}>Listening... speak your argument, then review and edit before sending</p>
              )}
            </div>
          )}
        </div>

        {/* FALLACY SIDEBAR */}
        {fallacyAlerts.length > 0 && (
          <div className="fallacy-sidebar" style={{ width: '220px', flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,0.06)', background: '#0d0d18', padding: '16px', overflowY: 'auto' }}>
            <p style={{ fontSize: '10px', fontWeight: 800, color: '#374151', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '12px' }}>Fallacies Detected</p>
            <p style={{ fontSize: '11px', color: '#1f2937', lineHeight: 1.5, marginBottom: '12px' }}>Logical errors in arguments, flagged in real time</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {fallacyAlerts.map((alert, i) => (
                <div key={i} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', padding: '10px 12px' }}>
                  <p style={{ fontSize: '12px', fontWeight: 800, color: '#f87171', marginBottom: '6px' }}>{alert.sender_name}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {alert.fallacies.map(f => (
                      <div key={f}>
                        <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 600 }}>{f}</span>
                        {FALLACY_EXPLANATIONS[f] && <p style={{ fontSize: '10px', color: '#374151', marginTop: '1px', lineHeight: 1.4 }}>{FALLACY_EXPLANATIONS[f]}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @media (min-width: 1024px) { .fallacy-sidebar { display: block !important; } }
      `}</style>
    </div>
  );
}
