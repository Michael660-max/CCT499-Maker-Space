import React, { useEffect, useRef, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const MapboxBuildings = () => {
  const mapContainerRef = useRef();
  const mapRef = useRef();

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

  // Geocode address to coordinates using Mapbox API
  const geocodeAddress = useCallback(async (address, postalCode, name) => {
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
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json?` +
          `limit=1&proximity=-79.3832,43.6532&access_token=${mapboxgl.accessToken}`
      );

      if (!response.ok) throw new Error(`Geocoding failed: ${response.status}`);

      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const coordinates = data.features[0].center; // [lng, lat]

        // Cache the result
        localStorage.setItem(
          cacheKey,
          JSON.stringify({
            center: coordinates,
            address: address,
            timestamp: new Date().toISOString(),
          })
        );

        return coordinates;
      } else {
        console.warn(`No results for: ${name} (${address})`);
        return null;
      }
    } catch (error) {
      console.error(`Geocoding error for ${name}:`, error);
      return null;
    }
  }, []);

  // Add individual marker to map using DOM elements
  const addMarkerToMap = useCallback((makerspace, coordinates) => {
    // Create custom marker element
    const el = document.createElement("div");
    el.className = "makerspace-marker";
    el.style.backgroundColor = "#FF6B6B";
    el.style.width = "12px";
    el.style.height = "12px";
    el.style.borderRadius = "50%";
    el.style.border = "2px solid white";
    el.style.cursor = "pointer";
    el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";

    // Create popup content with proper data from JSON
    const popupContent = `
      <div style="padding: 10px; max-width: 280px;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: #333;">${
          makerspace.r
        }</h3>
        ${
          makerspace["General Category"]
            ? `<p style="margin: 4px 0; color: #666; font-size: 12px; background: #f0f0f0; padding: 2px 6px; border-radius: 3px; display: inline-block;"><strong>${makerspace["General Category"]}</strong></p>`
            : ""
        }
        <p style="margin: 8px 0 4px 0; font-size: 13px; color: #666;"><strong>📍 Address:</strong> ${
          makerspace.Address
        }</p>
        ${
          makerspace["Phone Number"]
            ? `<p style="margin: 4px 0; font-size: 12px; color: #888;"><strong>📞 Phone:</strong> ${makerspace["Phone Number"]}</p>`
            : ""
        }
        ${
          makerspace["Email Address"]
            ? `<p style="margin: 4px 0; font-size: 12px; color: #888;"><strong>✉️ Email:</strong> ${makerspace["Email Address"]}</p>`
            : ""
        }
        ${
          makerspace["Primary Access Models"]
            ? `<p style="margin: 4px 0; font-size: 12px; color: #555;"><strong>🚪 Access:</strong> ${makerspace["Primary Access Models"]}</p>`
            : ""
        }
        ${
          makerspace["Skills Required"]
            ? `<p style="margin: 4px 0; font-size: 12px; color: #555;"><strong>🎯 Skills:</strong> ${makerspace["Skills Required"]}</p>`
            : ""
        }
        ${
          makerspace.Link
            ? `<p style="margin: 8px 0 4px 0;"><a href="${makerspace.Link}" target="_blank" style="color: #FF6B6B; text-decoration: none; font-weight: 500; padding: 4px 8px; background: #fff2f2; border-radius: 4px; display: inline-block;">🔗 View Details</a></p>`
            : ""
        }
        ${
          makerspace.Notes
            ? `<p style="margin: 8px 0 0 0; color: #555; font-size: 11px; line-height: 1.4; font-style: italic;">${makerspace.Notes}</p>`
            : ""
        }
      </div>
    `;

    // Add marker to map
    new mapboxgl.Marker({ element: el })
      .setLngLat(coordinates)
      .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(popupContent))
      .addTo(mapRef.current);
  }, []);

  // Load makerspace markers with improved data handling
  const loadMakerspaceMarkers = useCallback(async () => {
    try {
      const response = await fetch("/gta_makerspace.json");
      const makerspaces = await response.json();

      // Filter out empty entries that have names and addresses
      const validMakerspaces = makerspaces.filter(
        (m) => m.r && m.r.trim() !== "" && m.Address && m.Address.trim() !== ""
      );

      // Process in parallel for faster loading (but respect rate limits)
      const batchSize = 5; // Process 5 at a time to avoid overwhelming the API

      for (let i = 0; i < validMakerspaces.length; i += batchSize) {
        const batch = validMakerspaces.slice(i, i + batchSize);

        // Process batch in parallel
        const geocodePromises = batch.map(async (makerspace, index) => {
          try {
            const coordinates = await geocodeAddress(
              makerspace.Address,
              makerspace["Postal Code"],
              makerspace.r
            );

            if (coordinates) {
              addMarkerToMap(makerspace, coordinates);
            }
          } catch (error) {
            console.warn(`Failed to geocode ${makerspace.r}:`, error);
          }
        });

        // Wait for batch to complete
        await Promise.all(geocodePromises);

        // Small delay only between batches (not between individual markers)
        if (i + batchSize < validMakerspaces.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

    } catch (error) {
      console.error("Error loading makerspace data:", error);
    }
  }, [geocodeAddress, addMarkerToMap]);

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

        // Load and add markers after the map is fully loaded
        loadMakerspaceMarkers();
      });
    } catch (error) {
      console.error("❌ Error initializing Mapbox:", error.message);
    }

    return () => mapRef.current?.remove();
  }, [removePerformanceLabels, add3DBuildingsLayer, loadMakerspaceMarkers]);

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
