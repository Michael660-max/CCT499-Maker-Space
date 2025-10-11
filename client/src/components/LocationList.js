import React from 'react';
import './LocationList.css';

function LocationList({ locations, onSelectLocation, onDeleteLocation, selectedLocation }) {
  return (
    <div className="location-list">
      <h2>Locations ({locations.length})</h2>
      {locations.length === 0 ? (
        <p className="empty-message">No locations yet. Add your first location!</p>
      ) : (
        <div className="location-items">
          {locations.map((location) => (
            <div
              key={location._id}
              className={`location-item ${selectedLocation && selectedLocation._id === location._id ? 'selected' : ''}`}
              onClick={() => onSelectLocation(location)}
            >
              <div className="location-info">
                <h3>{location.name}</h3>
                <p>{location.description}</p>
                <div className="location-meta">
                  <span className="category">{location.category}</span>
                  <span className="coordinates">
                    {location.coordinates.coordinates[1].toFixed(4)}, {location.coordinates.coordinates[0].toFixed(4)}
                  </span>
                </div>
              </div>
              <button
                className="delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm('Are you sure you want to delete this location?')) {
                    onDeleteLocation(location._id);
                  }
                }}
                title="Delete location"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default LocationList;
