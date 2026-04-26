import { createClient } from '@supabase/supabase-js';

const supabaseUrl = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co`;
const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, publicAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});
