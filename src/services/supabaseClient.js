import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';

export const supabase = createClient(config.supabaseUrl, config.supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}
