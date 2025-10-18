import React, { useEffect, useRef, useCallback, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import MakerspaceSearch from "./MakerspaceSearch";

const MapboxBuildings = () => {
  const mapContainerRef = useRef();
  const mapRef = useRef();
  const [allMakerspaces, setAllMakerspaces] = useState([]);
  const [filteredMakerspaces, setFilteredMakerspaces] = useState([]);

  // Remove performance-heavy label layers to improve responsiveness
  const removePerformanceLabels = useCallback(() => {
    const labelsToRemove = [
      "poi-label",
      "transit-label",
      "road-label",
      "place-label-city",
      "place-label-town",
      "natural-label-line",
      "natural-label-point",
      "water-label-line",
      "water-label-point",
    ];

    // Wait for style to fully load before removing labels
    setTimeout(() => {
      labelsToRemove.forEach((layerId) => {
        if (mapRef.current.getLayer(layerId)) {
          try {
            mapRef.current.removeLayer(layerId);
            console.log(`Removed performance layer: ${layerId}`);
          } catch (e) {
            console.log(`Could not remove layer: ${layerId}`);
          }
        }
      });
    }, 1000);
  }, []);

  // Create optimized 3D buildings layer with performance improvements
  const add3DBuildingsLayer = useCallback(() => {
    const layers = mapRef.current.getStyle().layers;
    const labelLayerId = layers.find(
      (layer) => layer.type === "symbol" && layer.layout["text-field"]
    )?.id;

    mapRef.current.addLayer(
      {
        id: "add-3d-buildings",
        source: "composite",
        "source-layer": "building",
        filter: ["==", "extrude", "true"],
        type: "fill-extrusion",
        minzoom: 14, // Show buildings earlier for smoother experience
        paint: {
          "fill-extrusion-color": "#aaa",
          "fill-extrusion-height": [
            "interpolate",
            ["linear"],
            ["zoom"],
            14,
            0, // Start with no height
            14.5,
            ["*", ["get", "height"], 0.5], // Gradually increase
            16,
            ["get", "height"], // Full height at zoom 16
          ],
          "fill-extrusion-base": [
            "interpolate",
            ["linear"],
            ["zoom"],
            14,
            0,
            14.5,
            ["*", ["get", "min_height"], 0.5],
            16,
            ["get", "min_height"],
          ],
          "fill-extrusion-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            14,
            0.4, // Lower opacity at distance
            16,
            0.6,
            18,
            0.8, // Higher opacity when close
          ],
        },
      },
      labelLayerId
    );
  }, []);

  // Fetch points from Supabase and add to map
  const setupMakerspaceLayer = useCallback(async () => {
    try {
      const REST_URL = process.env.REACT_APP_REST_URL;
      const ANON = process.env.REACT_APP_ANON_KEY;

      if (!REST_URL || !ANON) {
        console.error('Missing environment variables for Supabase');
        return;
      }

      function bboxParams(map) {
        const [[w, s], [e, n]] = map.getBounds().toArray();
        return `minx=${w}&miny=${s}&maxx=${e}&maxy=${n}`;
      }

    async function fetchGeoJSON(map) {
      try {
        const url = `${REST_URL}/rest/v1/rpc/makerspaces_geojson?${bboxParams(map)}`;
        const res = await fetch(url, {
          headers: { 
            apikey: ANON, 
            Authorization: `Bearer ${ANON}`,
            'Content-Type': 'application/json'
          },
        });
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        return res.json(); // a FeatureCollection
      } catch (error) {
        console.error('Error fetching GeoJSON:', error);
        return { type: 'FeatureCollection', features: [] };
      }
    }

    // Initial load of data - fetch all data once
    const initialGeoJSON = await fetchGeoJSON(mapRef.current);
    setAllMakerspaces(initialGeoJSON.features || []);
    
    // Add source for makerspace points (no clustering)
    mapRef.current.addSource('makerspaces', {
      type: 'geojson',
      data: initialGeoJSON
    });

    // Add individual points layer
    mapRef.current.addLayer({
      id: 'makerspace-points',
      type: 'circle',
      source: 'makerspaces',
      paint: {
        'circle-color': '#FF6B6B',
        'circle-radius': 8,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#fff'
      }
    });

    // Note: Removed moveend event to keep data persistent across zoom levels

    // Click handler for individual points
    mapRef.current.on("click", "makerspace-points", (e) => {
      const coordinates = e.features[0].geometry.coordinates.slice();
      const props = e.features[0].properties;

      const popupContent = `
        <div style="border-width: 4px; padding: 12px; max-width: 300px; font-family: system-ui, -apple-system, sans-serif;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: #333; line-height: 1.3;">${
            props.name
          }</h3>
          ${
            props.category
              ? `<div style="margin: 6px 0; background: #FF6B6B; color: white; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 500; display: inline-block;">${props.category}</div>`
              : ""
          }
          <p style="margin: 8px 0 4px 0; font-size: 13px; color: #666; line-height: 1.4;"><strong>📍 Address:</strong><br>${
            props.address
          }</p>
          ${
            props.phone
              ? `<p style="margin: 4px 0; font-size: 12px; color: #555;"><strong>📞 Phone:</strong> ${props.phone}</p>`
              : ""
          }
          ${
            props.email
              ? `<p style="margin: 4px 0; font-size: 12px; color: #555;"><strong>✉️ Email:</strong> ${props.email}</p>`
              : ""
          }
          ${
            props.accessModels
              ? `<p style="margin: 6px 0; font-size: 12px; color: #666;"><strong>🔑 Access:</strong> ${props.accessModels}</p>`
              : ""
          }
          ${
            props.skills
              ? `<p style="margin: 6px 0; font-size: 12px; color: #666;"><strong>🛠️ Skills:</strong> ${props.skills}</p>`
              : ""
          }
          ${
            props.website
              ? `<p style="margin: 8px 0 4px 0;"><a href="${props.website}" target="_blank" style="color: #FF6B6B; text-decoration: none; font-weight: 500; font-size: 13px;">🔗 Visit Website</a></p>`
              : ""
          }
          ${
            props.notes
              ? `<p style="margin: 8px 0 0 0; font-size: 11px; color: #777; font-style: italic; border-top: 1px solid #eee; padding-top: 6px;">${props.notes}</p>`
              : ""
          }
        </div>
      `;

      new mapboxgl.Popup({
        offset: 15,
        closeButton: true,
        closeOnClick: false,
      })
        .setLngLat(coordinates)
        .setHTML(popupContent)
        .addTo(mapRef.current);
    });

    // Cursor changes for individual points
    mapRef.current.on("mouseenter", "makerspace-points", () => {
      mapRef.current.getCanvas().style.cursor = "pointer";
    });

    mapRef.current.on("mouseleave", "makerspace-points", () => {
      mapRef.current.getCanvas().style.cursor = "";
    });

    console.log("Makerspace layers setup complete - using Supabase PostGIS data");
    } catch (error) {
      console.error('Error setting up makerspace layer:', error);
    }
  }, []);

  // Handle filtering from search component
  const handleFilter = useCallback((filtered) => {
    setFilteredMakerspaces(filtered);
    
    if (mapRef.current && mapRef.current.isStyleLoaded && mapRef.current.isStyleLoaded()) {
      try {
        const source = mapRef.current.getSource('makerspaces');
        if (source) {
          // Update map to show only filtered results
          const filteredGeoJSON = {
            type: 'FeatureCollection',
            features: filtered
          };
          source.setData(filteredGeoJSON);
        }
      } catch (error) {
        console.error('Error updating map data:', error);
      }
    }
  }, []);

  useEffect(() => {
    // Make sure to set your Mapbox access token in the .env file
    mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;

    try {
      mapRef.current = new mapboxgl.Map({
        style: "mapbox://styles/mapbox/standard",
        center: [-79.3832, 43.6532], // Toronto location
        zoom: 11, // Start zoomed out to see more makerspaces
        minZoom: 6,
        maxZoom: 18,
        pitch: 45,
        bearing: -17.6,
        container: mapContainerRef.current,
        antialias: true,
        // Performance optimizations for better responsiveness
        preserveDrawingBuffer: false,
        failIfMajorPerformanceCaveat: false,
        fadeDuration: 100,
        // Additional performance settings
        renderWorldCopies: false,
        optimizeForTerrain: true,
      });

      mapRef.current.on("style.load", () => {
        // Apply performance improvements
        removePerformanceLabels();

        // Add optimized 3D buildings layer
        add3DBuildingsLayer();

        // Setup makerspace layers using static GeoJSON
        setupMakerspaceLayer();
      });
    } catch (error) {
      console.error("Error initializing Mapbox:", error.message);
    }

    return () => mapRef.current?.remove();
  }, [removePerformanceLabels, add3DBuildingsLayer, setupMakerspaceLayer]);

  return (
    <>
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
      <MakerspaceSearch
        makerspaces={allMakerspaces}
        onFilter={handleFilter}
      />
    </>
  );
};

export default MapboxBuildings;
