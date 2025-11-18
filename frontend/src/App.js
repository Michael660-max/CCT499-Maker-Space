import "./App.css";
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { supabase } from "./lib/supabase";
import MapboxBuildings from "./components/MapboxBuildings";
import ProtectedRoute from "./components/ProtectedRoute";
import LandingPage from "./components/LandingPage";

// Auth callback component that waits for Supabase to process auth
function AuthCallback() {
  React.useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Let Supabase process the auth tokens in the URL
        await supabase.auth.getSession();
        window.location.replace('/');
        
      } catch (error) {
        console.error('Auth callback error:', error);
        window.location.replace('/');
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
          
          {/* Landing page route */}
          <Route path="/welcome" element={<LandingPage />} />
          
          {/* Main app - accessible to guests */}
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