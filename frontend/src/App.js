import "./App.css";
import MapboxBuildings from "./components/MapboxBuildings";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <div className="App">
      <ProtectedRoute>
        <MapboxBuildings />
      </ProtectedRoute>
    </div>
  );
}

export default App;