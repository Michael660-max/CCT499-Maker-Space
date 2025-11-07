import React from 'react';
import { supabase } from '../lib/supabase';


export default function AuthButtons() {
 const redirectTo = process.env.REACT_APP_AUTH_REDIRECT_URL;


 const signIn = async (provider) => {
   const { error } = await supabase.auth.signInWithOAuth({
     provider,
     options: { redirectTo }
   });
   if (error) alert(error.message);
 };


 return (
   <div style={{ display: 'flex', gap: 12 }}>
     <button onClick={() => signIn('google')}>Continue with Google</button>
     <button onClick={() => signIn('discord')}>Continue with Discord</button>
   </div>
  
 );
}



