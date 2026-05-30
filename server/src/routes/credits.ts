import { Router, Request, Response } from 'express';
import { supabase } from '../db/supabase.js';

const router = Router();

// Get credit balance
router.get('/balance/:user_id', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('credits_balance')
      .eq('id', req.params.user_id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'User not found' });
    return res.json({ balance: data.credits_balance });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to get balance' });
  }
});

// Get usage history
router.get('/usage/:user_id', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('usage')
      .select('*')
      .eq('user_id', req.params.user_id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return res.json(data || []);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to get usage' });
  }
});

// Deduct credits after a debate
router.post('/deduct', async (req: Request, res: Response) => {
  try {
    const { user_id, debate_id, ai_roles_count, session_minutes } = req.body;

    // Credit cost: base 1 + 0.5 per extra AI role + 0.1 per minute
    const credits = Math.ceil(1 + (ai_roles_count - 1) * 0.5 + session_minutes * 0.1);

    const { data: user } = await supabase
      .from('users')
      .select('credits_balance')
      .eq('id', user_id)
      .single();

    if (!user) return res.status(404).json({ error: 'User not found' });

    const new_balance = Math.max(0, user.credits_balance - credits);

    await supabase
      .from('users')
      .update({ credits_balance: new_balance })
      .eq('id', user_id);

    await supabase.from('usage').insert({
      debate_id,
      user_id,
      credits_consumed: credits,
      ai_roles_used: ai_roles_count,
      session_duration: session_minutes,
      created_at: new Date().toISOString(),
    });

    return res.json({ credits_used: credits, new_balance });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to deduct credits' });
  }
});

// STRIPE PLACEHOLDER — uncomment when ready to charge
// router.post('/purchase', async (req, res) => {
//   const { user_id, pack } = req.body;
//   const packs = {
//     starter: { credits: 100, price: 1500 },   // $15.00
//     growth:  { credits: 500, price: 6000 },   // $60.00
//     university: { credits: 2000, price: 20000 } // $200.00
//   };
//   const selected = packs[pack];
//   if (!selected) return res.status(400).json({ error: 'Invalid pack' });
//
//   const session = await stripe.checkout.sessions.create({
//     payment_method_types: ['card'],
//     line_items: [{ price_data: { currency: 'usd', product_data: { name: `Podium ${pack} pack` }, unit_amount: selected.price }, quantity: 1 }],
//     mode: 'payment',
//     success_url: `${process.env.CLIENT_URL}/credits/success?pack=${pack}`,
//     cancel_url: `${process.env.CLIENT_URL}/credits`,
//     metadata: { user_id, credits: selected.credits },
//   });
//   return res.json({ url: session.url });
// });

export default router;
