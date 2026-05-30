import { Router, Request, Response } from 'express';
import { supabase } from '../db/supabase.js';

const router = Router();

// Sign up
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      email_confirm: true,
    });

    if (error) return res.status(400).json({ error: error.message });

    // Create user profile
    await supabase.from('users').insert({
      id: data.user.id,
      email,
      name,
      skill_level: 'intermediate',
      credits_balance: 10, // Free starter credits
      created_at: new Date().toISOString(),
    });

    return res.json({ user: data.user });
  } catch (err) {
    return res.status(500).json({ error: 'Signup failed' });
  }
});

// Get user profile
router.get('/profile/:user_id', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.params.user_id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'User not found' });
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update skill level
router.patch('/skill-level', async (req: Request, res: Response) => {
  try {
    const { user_id, skill_level } = req.body;
    const { error } = await supabase
      .from('users')
      .update({ skill_level })
      .eq('id', user_id);

    if (error) throw error;
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update skill level' });
  }
});

export default router;
