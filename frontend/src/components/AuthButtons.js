import React from "react";
import { supabase } from "../lib/supabase";

export default function AuthButtons() {
  const signIn = async (provider) => {
    const redirectTo = `${window.location.origin}/auth/callback`; // works in dev and prod
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo }
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
