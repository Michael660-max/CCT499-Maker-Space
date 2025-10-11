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
      });
    } catch (error) {
      console.error("❌ Error initializing Mapbox:", error.message);
    }

    return () => mapRef.current?.remove();
  }, []);

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
