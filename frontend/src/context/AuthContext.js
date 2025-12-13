import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

// Load Google Maps API
const loadGoogleMapsAPI = () => {
  if (window.google?.maps?.places) {
    window.dispatchEvent(new CustomEvent('googlemapsapi:loaded'));
    return;
  }
  
  if (!process.env.REACT_APP_GOOGLE_API_KEY) return;

  const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
  if (existingScript) {
    if (!window.google?.maps?.places) {
      if (!existingScript.hasAttribute('data-googlemaps-loaded')) {
        existingScript.setAttribute('data-googlemaps-loaded', 'true');
        existingScript.onload = () => {
          // Small delay to ensure API is fully initialized
          setTimeout(() => {
            if (window.google?.maps?.places) {
              window.dispatchEvent(new CustomEvent('googlemapsapi:loaded'));
            }
          }, 100);
        };
      }
      
      const checkInterval = setInterval(() => {
        if (window.google?.maps?.places) {
          clearInterval(checkInterval);
          window.dispatchEvent(new CustomEvent('googlemapsapi:loaded'));
        }
      }, 100);
      setTimeout(() => clearInterval(checkInterval), 10000);
    } else {
      window.dispatchEvent(new CustomEvent('googlemapsapi:loaded'));
    }
    return;
  }

  const script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_API_KEY}&libraries=places&loading=async`;
  script.async = true;
  script.defer = true;
  script.onload = () => {
    setTimeout(() => {
      if (window.google?.maps?.places) {
        window.dispatchEvent(new CustomEvent('googlemapsapi:loaded'));
      }
    }, 100);
  };
  script.onerror = () => {
    console.error("Failed to load Google Maps API");
  };
  document.head.appendChild(script);
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGoogleMapsAPI();

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session?.user) {
        loadGoogleMapsAPI();
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session?.user) {
        loadGoogleMapsAPI();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);