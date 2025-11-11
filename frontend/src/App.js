import "./App.css";
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { supabase } from "./lib/supabase";
import MapboxBuildings from "./components/MapboxBuildings";
import ProtectedRoute from "./components/ProtectedRoute";

// Auth callback component that waits for Supabase to process auth
function AuthCallback() {
  React.useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Let Supabase process the auth tokens in the URL
        await supabase.auth.getSession();
        
        // Small delay to ensure session is processed
        setTimeout(() => {
          window.location.replace('/');
        }, 1000);
      } catch (error) {
        console.error('Auth callback error:', error);
        window.location.replace('/');
      }
    };

    handleAuthCallback();
  }, []);

  return <p>Processing authentication...</p>;
}

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Auth callback route */}
          <Route path="/auth/callback" element={<AuthCallback />} />
          
          {/* Main app */}
          <Route 
            path="*" 
            element={
              <ProtectedRoute>
                <MapboxBuildings />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;