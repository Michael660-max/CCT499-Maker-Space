import React from "react";
import { supabase } from "../lib/supabase";

export default function AuthButtons() {
  const signIn = async (provider) => {
    const options = {};
    
    // Add redirectTo for production
    if (process.env.NODE_ENV === 'production') {
      options.redirectTo = 'https://makers.up.railway.app';
    }
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options,
    });
    if (error) alert(error.message);
  };

  return (
    <div style={{ display: "flex", gap: 12 }}>
      <button onClick={() => signIn("google")}>Continue with Google</button>
      <button onClick={() => signIn("discord")}>Continue with Discord</button>
    </div>
  );
}
