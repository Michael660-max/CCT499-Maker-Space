import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const MapboxBuildings = () => {
  const mapContainerRef = useRef();
  const mapRef = useRef();

  useEffect(() => {
    // Make sure to set your Mapbox access token in the .env file
    mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;

    try {
      mapRef.current = new mapboxgl.Map({
        style: "mapbox://styles/mapbox/standard",
        center: [-79.3832, 43.6532], // Toronto location
        zoom: 15.5,
        minZoom: 6,
        maxZoom: 18,
        pitch: 45,
        bearing: -17.6,
        container: mapContainerRef.current,
        antialias: true,
      });

      mapRef.current.on("style.load", () => {
        // Insert the layer beneath any symbol layer (labels)
        const layers = mapRef.current.getStyle().layers;
        const labelLayerId = layers.find(
          (layer) => layer.type === "symbol" && layer.layout["text-field"]
        )?.id;

        // Add 3D buildings layer - exactly like Mapbox docs example
        mapRef.current.addLayer(
          {
            id: "add-3d-buildings",
            source: "composite",
            "source-layer": "building",
            filter: ["==", "extrude", "true"],
            type: "fill-extrusion",
            minzoom: 15,
            paint: {
              "fill-extrusion-color": "#aaa",
              "fill-extrusion-height": [
                "interpolate",
                ["linear"],
                ["zoom"],
                15,
                0,
                15.05,
                ["get", "height"],
              ],
              "fill-extrusion-base": [
                "interpolate",
                ["linear"],
                ["zoom"],
                15,
                0,
                15.05,
                ["get", "min_height"],
              ],
              "fill-extrusion-opacity": 0.6,
            },
          },
          labelLayerId // This will be undefined if no label layer is found, which is fine
        );

        // Load and add markers after the map is fully loaded
        loadMakerspaceMarkers();
      });
    } catch (error) {
      console.error("❌ Error initializing Mapbox:", error.message);
    }

    return () => mapRef.current?.remove();
  }, []);

  const geocodeAddress = async (address, postalCode, name) => {
    const cacheKey = `geocode:${address}-${postalCode}`;
    
    // Check cache first
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.center)) {
          return parsed.center; // [lng, lat]
        }
      } catch (e) {
        // Cache corrupted, continue to geocode
      }
    }

    // Build query string
    let query = address;
    if (postalCode) query += `, ${postalCode}`;
    query += ", Ontario, Canada";

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
        `limit=1&proximity=-79.3832,43.6532&access_token=${mapboxgl.accessToken}`
      );
      
      if (!response.ok) throw new Error(`Geocoding failed: ${response.status}`);
      
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const coordinates = data.features[0].center; // [lng, lat]
        
        // Cache the result
        localStorage.setItem(cacheKey, JSON.stringify({ 
          center: coordinates,
          address: address,
          timestamp: new Date().toISOString()
        }));
        
        return coordinates;
      } else {
        console.warn(`No results for: ${name} (${address})`);
        return null;
      }
    } catch (error) {
      console.error(`Geocoding error for ${name}:`, error);
      return null;
    }
  };

  const loadMakerspaceMarkers = async () => {
    try {
      const response = await fetch('/gta_makerspace.json');
      const makerspaces = await response.json();
      
      // Filter out empty entries
      const validMakerspaces = makerspaces.filter(m => 
        m.r && m.r.trim() !== '' && 
        m.Address && m.Address.trim() !== ''
      );

      // Geocode and add markers one by one with delay
      for (let i = 0; i < validMakerspaces.length; i++) {
        const makerspace = validMakerspaces[i];
        
        const coordinates = await geocodeAddress(
          makerspace.Address,
          makerspace['Postal Code'],
          makerspace.r
        );

        if (coordinates) {
          addMarkerToMap(makerspace, coordinates);
        }

        // Add delay to avoid hitting API rate limits
        if (i < validMakerspaces.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 150));
        }
      }

    } catch (error) {
      console.error('Error loading makerspace data:', error);
    }
  };

  const addMarkerToMap = (makerspace, coordinates) => {
    // Create custom marker element
    const el = document.createElement('div');
    el.className = 'makerspace-marker';
    el.style.backgroundColor = '#ff4444';
    el.style.width = '12px';
    el.style.height = '12px';
    el.style.borderRadius = '50%';
    el.style.border = '2px solid white';
    el.style.cursor = 'pointer';
    el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

    // Create popup content with proper data from JSON
    const popupContent = `
      <div style="padding: 8px; max-width: 250px;">
        <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">${makerspace.r}</h3>
        <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">${makerspace['General Category'] || ''}</p>
        <p style="margin: 0 0 4px 0; font-size: 11px; color: #888;">${makerspace.Address}</p>
        ${makerspace['Phone Number'] ? `<p style="margin: 0 0 4px 0; font-size: 11px; color: #888;">${makerspace['Phone Number']}</p>` : ''}
        ${makerspace.Link ? `<a href="${makerspace.Link}" target="_blank" style="font-size: 11px; color: #007bff;">View Details</a>` : ''}
      </div>
    `;

    // Add marker to map
    new mapboxgl.Marker({ element: el })
      .setLngLat(coordinates)
      .setPopup(new mapboxgl.Popup({ offset: 25 })
        .setHTML(popupContent))
      .addTo(mapRef.current);
  };

  return (
    <div
      ref={mapContainerRef}
      style={{
        width: "100vw",
        height: "100vh",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 1,
      }}
    />
  );
};

export default MapboxBuildings;