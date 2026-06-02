export type DebateMode = 'solo' | '1v1' | 'group';
export type Stance = 'for' | 'against' | 'neutral';
export type DebateStatus = 'waiting' | 'briefing' | 'active' | 'completed';
export type SkillLevel = 'beginner' | 'intermediate' | 'expert';

export type AIRole =
  | 'participant'
  | 'devils_advocate'
  | 'interrogator'
  | 'coach'
  | 'judge';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  skill_level: SkillLevel;
  credits_balance: number;
  created_at: string;
}

export interface Participant {
  id: string;
  user_id: string;
  name: string;
  stance: Stance;
  is_ai: boolean;
  ai_role?: AIRole;
  socket_id?: string;
}

export interface Message {
  id: string;
  debate_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  ai_role?: AIRole;
  is_ai: boolean;
  fallacies?: string[];
  timestamp: string;
}

export interface DebateRoom {
  id: string;
  topic: string;
  sharpened_topic?: string;
  mode: DebateMode;
  status: DebateStatus;
  skill_level: SkillLevel;
  ai_roles: AIRole[];
  participants: Participant[];
  messages: Message[];
  created_by: string;
  created_at: string;
  momentum: { for: number; against: number };
  // Devil's Advocate lifelines remaining per side (3 each, shared by the side)
  lifelines: { for: number; against: number };
}

export interface PerformanceCard {
  user_id: string;
  user_name: string;
  strongest_argument: string;
  weakest_argument: string;
  fallacy_count: number;
  logic_score: number;
  evidence_score: number;
  overall_score: number;
  what_you_missed: string;
}

export interface DebateVerdict {
  winner: string;
  winner_id?: string;
  reasoning: string;
  key_moments: string[];
  final_scores: { for: number; against: number };
  performance_cards: PerformanceCard[];
  mind_shift: string;
}
