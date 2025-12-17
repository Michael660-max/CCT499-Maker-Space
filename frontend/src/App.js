import "./App.css";
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from "./lib/supabase";
import MapboxBuildings from "./components/MapboxBuildings";
import ProtectedRoute from "./components/ProtectedRoute";
import LandingPage from "./components/LandingPage";

// Auth callback component that waits for Supabase to process auth
function AuthCallback() {
  React.useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Let Supabase process the OAuth callback, then take the user to the map
        await supabase.auth.getSession();
        window.location.replace('/map');
      } catch (error) {
        console.error('Auth callback error:', error);
        window.location.replace('/map');
      }
    };

    handleAuthCallback();
  }, []);

  return <p></p>;
}

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Auth callback route */}
          <Route path="/auth/callback" element={<AuthCallback />} />
          
          {/* Landing page */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Protected map route */}
          <Route 
            path="/map" 
            element={
              <ProtectedRoute allowGuest>
                <MapboxBuildings />
              </ProtectedRoute>
            } 
          />
          
          {/* Redirect any unknown routes to landing page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
