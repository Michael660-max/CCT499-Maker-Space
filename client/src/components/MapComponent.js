import React, { useState, useEffect } from 'react';
import Map, { Marker, Popup } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './MapComponent.css';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN || '';

function MapComponent({ locations, selectedLocation, onSelectLocation }) {
  const [viewState, setViewState] = useState({
    longitude: -79.3832,
    latitude: 43.6532,
    zoom: 12
  });

  const [popupInfo, setPopupInfo] = useState(null);

  useEffect(() => {
    if (selectedLocation) {
      setViewState({
        ...viewState,
        longitude: selectedLocation.coordinates.coordinates[0],
        latitude: selectedLocation.coordinates.coordinates[1],
        zoom: 14
      });
      setPopupInfo(selectedLocation);
    }
  }, [selectedLocation]);

  const handleMarkerClick = (location) => {
    setPopupInfo(location);
    onSelectLocation(location);
  };

  return (
    <div className="map-wrapper">
      {!MAPBOX_TOKEN && (
        <div className="map-warning">
          <p>⚠️ Mapbox token not configured. Please add your Mapbox token to .env file.</p>
          <p>Get your free token at: <a href="https://account.mapbox.com/" target="_blank" rel="noopener noreferrer">https://account.mapbox.com/</a></p>
        </div>
      )}
      
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={MAPBOX_TOKEN}
      >
        {locations.map((location) => (
          <Marker
            key={location._id}
            longitude={location.coordinates.coordinates[0]}
            latitude={location.coordinates.coordinates[1]}
            anchor="bottom"
            onClick={() => handleMarkerClick(location)}
          >
            <div className="custom-marker">
              📍
            </div>
          </Marker>
        ))}

        {popupInfo && (
          <Popup
            longitude={popupInfo.coordinates.coordinates[0]}
            latitude={popupInfo.coordinates.coordinates[1]}
            anchor="top"
            onClose={() => {
              setPopupInfo(null);
              onSelectLocation(null);
            }}
            closeButton={true}
            closeOnClick={false}
          >
            <div className="popup-content">
              <h3>{popupInfo.name}</h3>
              <p>{popupInfo.description}</p>
              <span className="category-badge">{popupInfo.category}</span>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}

export default MapComponent;
