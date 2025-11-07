import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function AuthCallback() {
  useEffect(() => {
    // Supabase processes the URL fragment automatically; just bounce home (or /app).
    const go = async () => {
      await supabase.auth.getSession(); // ensures session is cached
      window.location.replace('/app');
    };
    go();
  }, []);

  return <p>Signing you in…</p>;
}