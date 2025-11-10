import { createClient } from '@supabase/supabase-js';

console.log('URL loaded?', process.env.REACT_APP_SUPABASE_URL);

export const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY,
  { 
    auth: { 
      persistSession: true, 
      detectSessionInUrl: true,
      autoRefreshToken: true,
      flowType: 'pkce'
    } 
  }
);