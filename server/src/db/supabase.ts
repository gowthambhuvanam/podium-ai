import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
// Prefer the service-role key if provided (bypasses RLS); otherwise fall back
// to the anon key, which works because we have permissive RLS policies.
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseKey =
  serviceKey && serviceKey !== 'your_service_role_key_here'
    ? serviceKey
    : process.env.SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
