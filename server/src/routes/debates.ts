import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../db/supabase.js';
import { createRoom, getRoom } from '../socket/roomManager.js';
import {
  sharpenTopic,
  predictStance,
  generateBriefing,
  suggestTopics,
} from '../ai/agentOrchestrator.js';
import { DebateRoom, AIRole, DebateMode, SkillLevel, Stance } from '../types/index.js';

const router = Router();

// Create a new debate
router.post('/create', async (req: Request, res: Response) => {
  try {
    const {
      topic,
      mode,
      ai_roles,
      skill_level,
      user_id,
      user_name,
    }: {
      topic: string;
      mode: DebateMode;
      ai_roles: AIRole[];
      skill_level: SkillLevel;
      user_id: string;
      user_name: string;
    } = req.body;

    if (!topic || !mode || !user_id) {
      return res.status(400).json({ error: 'topic, mode, and user_id are required' });
    }

    // Enforce role rules by mode (mirror of the client rules engine):
    // - solo: AI must be the Participant; Devil's Advocate is redundant
    // - 1v1: both sides are humans, so no AI Participant
    let safeRoles = Array.isArray(ai_roles) ? [...ai_roles] : [];
    if (mode === 'solo') {
      // Devil's Advocate and Interrogator are redundant in solo — the AI
      // participant already argues the opposite side and rebuts the human
      safeRoles = safeRoles.filter(r => r !== 'devils_advocate' && r !== 'interrogator');
      if (!safeRoles.includes('participant')) safeRoles.push('participant');
    } else if (mode === '1v1') {
      safeRoles = safeRoles.filter(r => r !== 'participant');
    }
    const finalRoles = Array.from(new Set(safeRoles));

    // Sharpen the topic
    const sharpened_topic = await sharpenTopic(topic);

    // Predict stance distribution
    const stance_prediction = await predictStance(sharpened_topic);

    const debate_id = uuidv4();

    const room: DebateRoom = {
      id: debate_id,
      topic,
      sharpened_topic,
      mode,
      status: 'waiting',
      skill_level: skill_level || 'intermediate',
      ai_roles: finalRoles,
      participants: [],
      messages: [],
      created_by: user_id,
      created_at: new Date().toISOString(),
      momentum: { for: 50, against: 50 },
    };

    // Store in memory
    createRoom(room);

    // Store in Supabase
    await supabase.from('debates').insert({
      id: debate_id,
      topic,
      sharpened_topic,
      mode,
      status: 'waiting',
      skill_level: skill_level || 'intermediate',
      ai_roles: finalRoles,
      created_by: user_id,
      created_at: new Date().toISOString(),
    });

    return res.json({
      debate_id,
      topic,
      sharpened_topic,
      stance_prediction,
      mode,
      skill_level,
      ai_roles: finalRoles,
    });
  } catch (err) {
    console.error('Create debate error:', err);
    return res.status(500).json({ error: 'Failed to create debate' });
  }
});

// Suggest debate topics for a category
router.post('/suggest-topics', async (req: Request, res: Response) => {
  try {
    const { category } = req.body as { category: string };
    if (!category) return res.status(400).json({ error: 'category is required' });
    const topics = await suggestTopics(category);
    return res.json({ topics });
  } catch (err) {
    console.error('Suggest topics error:', err);
    return res.status(500).json({ error: 'Failed to suggest topics' });
  }
});

// Get briefing for a participant
router.post('/briefing', async (req: Request, res: Response) => {
  try {
    const { topic, stance, skill_level } = req.body as {
      topic: string;
      stance: Stance;
      skill_level: SkillLevel;
    };

    const briefing = await generateBriefing(topic, stance, skill_level || 'intermediate');
    return res.json(briefing);
  } catch (err) {
    console.error('Briefing error:', err);
    return res.status(500).json({ error: 'Failed to generate briefing' });
  }
});

// Get debate details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const room = getRoom(req.params.id);
    if (room) return res.json(room);

    // Fall back to Supabase if not in memory
    const { data, error } = await supabase
      .from('debates')
      .select('*, analysis(*)')
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Debate not found' });
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to get debate' });
  }
});

// Get debate history for a user
router.get('/history/:user_id', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('debates')
      .select('*, analysis(*)')
      .eq('created_by', req.params.user_id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return res.json(data || []);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to get history' });
  }
});

export default router;
