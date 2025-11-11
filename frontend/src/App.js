import "./App.css";
import React, { useState, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { supabase } from "./lib/supabase";
import MapboxBuildings from "./components/MapboxBuildings";
import ProtectedRoute from './components/ProtectedRoute';
import MakerspaceFilter from "./components/MakerspaceFilters";

// Auth callback component that waits for Supabase to process auth
function AuthCallback() {
  React.useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        await supabase.auth.getSession();
        window.location.replace('/');
      } catch (error) {
        console.error('Auth callback error:', error);
        window.location.replace('/');
      }
    };
    handleAuthCallback();
  }, []);

  return <p>Processing authentication...</p>;
}

// Main map component with filter
function MapWithFilter() {
  const [makerspaces, setMakerspaces] = useState([]);
  const mapRef = useRef(null);

  const handleFilter = (filtered) => {
    console.log("Filtered makerspaces:", filtered);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <MakerspaceFilter 
        makerspaces={makerspaces} 
        mapRef={mapRef}
        onFilter={handleFilter}
      />
      <MapboxBuildings 
        ref={mapRef}
        onMakerspaceLoad={setMakerspaces}
      />
    </div>
  );
}

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route 
            path="*" 
            element={
              <ProtectedRoute>
                <MapWithFilter />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;