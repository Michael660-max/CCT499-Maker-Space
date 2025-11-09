const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.REACT_APP_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required Supabase environment variables');
  process.exit(1);
}

// Create Supabase client with service role key for backend operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: { 'x-my-custom-header': 'my-app-name' },
  },
});

module.exports = { supabase };