import "./App.css";
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MapboxBuildings from "./components/MapboxBuildings";
import ProtectedRoute from "./components/ProtectedRoute";

// Simple auth callback component since we deleted the file
function AuthCallback() {
  React.useEffect(() => {
    // Redirect to home after auth processing
    window.location.replace('/');
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