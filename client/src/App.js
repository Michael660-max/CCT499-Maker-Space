import React, { useState, useEffect } from 'react';
import MapComponent from './components/MapComponent';
import LocationForm from './components/LocationForm';
import LocationList from './components/LocationList';
import { getLocations, createLocation, deleteLocation } from './services/api';
import './App.css';

function App() {
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const data = await getLocations();
      setLocations(data);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const handleAddLocation = async (locationData) => {
    try {
      await createLocation(locationData);
      await fetchLocations();
      setShowForm(false);
    } catch (error) {
      console.error('Error adding location:', error);
    }
  };

  const handleDeleteLocation = async (id) => {
    try {
      await deleteLocation(id);
      await fetchLocations();
      if (selectedLocation && selectedLocation._id === id) {
        setSelectedLocation(null);
      }
    } catch (error) {
      console.error('Error deleting location:', error);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>CCT499 Maker Space - Location Tracker</h1>
        <button onClick={() => setShowForm(!showForm)} className="add-location-btn">
          {showForm ? 'Cancel' : 'Add Location'}
        </button>
      </header>

      <div className="content-container">
        <div className="sidebar">
          {showForm && (
            <LocationForm 
              onSubmit={handleAddLocation}
              onCancel={() => setShowForm(false)}
            />
          )}
          
          <LocationList 
            locations={locations}
            onSelectLocation={setSelectedLocation}
            onDeleteLocation={handleDeleteLocation}
            selectedLocation={selectedLocation}
          />
        </div>

        <div className="map-container">
          <MapComponent 
            locations={locations}
            selectedLocation={selectedLocation}
            onSelectLocation={setSelectedLocation}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
