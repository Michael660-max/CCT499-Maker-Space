import React, { useEffect, useRef, useCallback, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import MakerspaceSearch from "./MakerspaceSearch";
import MakerspaceChat from "./MakerspaceChat";
import MakerspaceForms from "./MakerspaceForms";
import ProfileDropdown from './ProfileDropdown';
import MakerspaceModal from './MakerspaceModal';
import { useAuth } from '../context/AuthContext';

const MapboxBuildings = () => {
  const mapContainerRef = useRef();
  const mapRef = useRef();
  const [allMakerspaces, setAllMakerspaces] = useState([]);
  const [selectedMakerspace, setSelectedMakerspace] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [preloadedPhotos, setPreloadedPhotos] = useState({});
  const preloadedPhotosRef = useRef({});
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [filteredMakerspaces, setFilteredMakerspaces] = useState([]);

  // Add guest mode detection
  const isGuest = !user;

  // Initialize filtered makerspaces when allMakerspaces changes
  useEffect(() => {
    setFilteredMakerspaces(allMakerspaces);
  }, [allMakerspaces]);

  // Load Google Maps API script for photo fetching
  useEffect(() => {
    if (googleMapsLoaded || !process.env.REACT_APP_GOOGLE_API_KEY) return;
    if (window.google?.maps?.places) {
      setGoogleMapsLoaded(true);
      return;
    }

    // Check if script is already in the DOM
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      existingScript.onload = () => setGoogleMapsLoaded(true);
      if (window.google?.maps?.places) {
        setGoogleMapsLoaded(true);
      }
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_API_KEY}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => setGoogleMapsLoaded(true);
    script.onerror = () => console.error("Failed to load Google Maps API");
    document.head.appendChild(script);
  }, [googleMapsLoaded]);

  // Preload photo for a makerspace using new Place API
  const preloadPhoto = useCallback(async (makerspaceProps) => {
    if (!googleMapsLoaded || !makerspaceProps.address || preloadedPhotosRef.current[makerspaceProps.address]) {
      return;
    }

    try {
      const query = makerspaceProps.name ? `${makerspaceProps.name}, ${makerspaceProps.address}` : makerspaceProps.address;
      
      const request = {
        textQuery: query,
        fields: ["id", "photos"],
      };

      const { places } = await window.google.maps.places.Place.searchByText(request);
      
      if (places && places.length > 0) {
        const place = places[0];
        
        await place.fetchFields({ fields: ["photos"] });
        
        if (place.photos && place.photos.length > 0) {
          const photoUrl = place.photos[0].getURI({ maxWidth: 1200, maxHeight: 900 });
          const img = new Image();
          img.onload = () => {
            preloadedPhotosRef.current[makerspaceProps.address] = photoUrl;
            setPreloadedPhotos(prev => ({ ...prev, [makerspaceProps.address]: photoUrl }));
          };
          img.src = photoUrl;
        }
      }
    } catch (error) {
      console.warn("Failed to preload photo:", error);
    }
  }, [googleMapsLoaded]);

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

  // Fly to a makerspace and show popup
  const flyToMakerspace = useCallback((makerspace) => {
    if (!mapRef.current || !makerspace.geometry) return;

    const coordinates = makerspace.geometry.coordinates.slice();
    const props = makerspace.properties;

    // Start preloading photo immediately
    preloadPhoto(props);

    // Fly to the makerspace location with optimized zoom
    mapRef.current.flyTo({
      center: coordinates,
      zoom: 17,
      duration: 1500,
      essential: true,
    });

    // Wait for flyTo to complete, then show popup
    setTimeout(() => {
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
          <p style="margin: 8px 0 4px 0; font-size: 13px; color: #666; line-height: 1.4;"><strong>📍</strong> ${
            props.address
          }</p>
          <button 
            onclick='window.showMakerspaceDetails(${JSON.stringify(props).replace(/'/g, "\\'")})' 
            style="width: 100%; margin-top: 8px; padding: 8px; background: #FF6B6B; color: white; border: none; border-radius: 12px; font-size: 13px; cursor: pointer; font-weight: 500;"
          >
            View Full Details →
          </button>
        </div>
      `;

      // Remove any existing popups
      const existingPopups = document.getElementsByClassName("mapboxgl-popup");
      while (existingPopups[0]) {
        existingPopups[0].remove();
      }

      // Create new popup
      new mapboxgl.Popup({
        offset: 15,
        closeButton: true,
        closeOnClick: false,
        className: 'custom-popup',
        closeButtonClassName: 'custom-popup-close',
      })
        .setLngLat(coordinates)
        .setHTML(popupContent)
        .addTo(mapRef.current);
    }, 2000);
  }, [preloadPhoto]);

  // Fetch points from Supabase and add to map
  const setupMakerspaceLayer = useCallback(async () => {
    try {
      const REST_URL = process.env.REACT_APP_REST_URL;
      const ANON = process.env.REACT_APP_ANON_KEY;

      if (!REST_URL || !ANON) {
        console.error("Missing environment variables for Supabase");
        return;
      }

      function bboxParams(map) {
        const [[w, s], [e, n]] = map.getBounds().toArray();
        return `minx=${w}&miny=${s}&maxx=${e}&maxy=${n}`;
      }

      async function fetchGeoJSON(map) {
        try {
          const url = `${REST_URL}/rest/v1/rpc/makerspaces_geojson?${bboxParams(
            map
          )}`;
          const res = await fetch(url, {
            headers: {
              apikey: ANON,
              Authorization: `Bearer ${ANON}`,
              "Content-Type": "application/json",
            },
          });

          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }

          return res.json(); // a FeatureCollection
        } catch (error) {
          console.error("Error fetching GeoJSON:", error);
          return { type: "FeatureCollection", features: [] };
        }
      }

      // Initial load of data - fetch all data once
      const initialGeoJSON = await fetchGeoJSON(mapRef.current);
      setAllMakerspaces(initialGeoJSON.features || []);

      // Add source for makerspace points (no clustering)
      mapRef.current.addSource("makerspaces", {
        type: "geojson",
        data: initialGeoJSON,
      });

      // Add individual points layer
      mapRef.current.addLayer({
        id: "makerspace-points",
        type: "circle",
        source: "makerspaces",
        paint: {
          "circle-color": "#FF6B6B",
          "circle-radius": 8,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fff",
        },
      });

      // Click handler for individual points
      mapRef.current.on("click", "makerspace-points", (e) => {
        const coordinates = e.features[0].geometry.coordinates.slice();
        const props = e.features[0].properties;

        // Start preloading photo when makerspace is clicked
        preloadPhoto(props);

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
          <p style="margin: 8px 0 4px 0; font-size: 13px; color: #666; line-height: 1.4;"><strong>📍</strong> ${
            props.address
          }</p>
          <button 
            onclick='window.showMakerspaceDetails(${JSON.stringify(props).replace(/'/g, "\\'")})' 
            style="width: 100%; margin-top: 8px; padding: 8px; background: #FF6B6B; color: white; border: none; border-radius: 12px; font-size: 13px; cursor: pointer; font-weight: 500;"
          >
            View Full Details →
          </button>
        </div>
      `;

      new mapboxgl.Popup({
        offset: 15,
        closeButton: true,
        closeOnClick: false,
        className: 'custom-popup',
        closeButtonClassName: 'custom-popup-close',
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

      console.log(
        "Makerspace layers setup complete - using Supabase PostGIS data"
      );
    } catch (error) {
      console.error("Error setting up makerspace layer:", error);
    }
  }, [preloadPhoto]);

  // Handle filtering from search component
  const handleFilter = useCallback((filtered) => {
    setFilteredMakerspaces(filtered);
    
    if (
      mapRef.current &&
      mapRef.current.isStyleLoaded &&
      mapRef.current.isStyleLoaded()
    ) {
      try {
        const source = mapRef.current.getSource("makerspaces");
        if (source) {
          // Update map to show only filtered results
          const filteredGeoJSON = {
            type: "FeatureCollection",
            features: filtered,
          };
          source.setData(filteredGeoJSON);
        }
      } catch (error) {
        console.error("Error updating map data:", error);
      }
    }
  }, []);

  // Handle suggestion selection from search component
  const handleSuggestionSelect = useCallback(
    (makerspace) => {
      flyToMakerspace(makerspace);
    },
    [flyToMakerspace]
  );

  // Handler for 'see more' button
  useEffect(() => {
    window.showMakerspaceDetails = (props) => {
      setSelectedMakerspace(props);
      setIsModalOpen(true);
    };

    return () => {
      delete window.showMakerspaceDetails;
    };
  }, []);

  // Handler for sidebar makerspace click
  const handleSidebarMakerspaceClick = useCallback((makerspace) => {
    flyToMakerspace(makerspace);
  }, [flyToMakerspace]);

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

      // Optimize performance during zoom
      mapRef.current.on("zoomstart", () => {
        const buildingLayer = mapRef.current.getLayer("add-3d-buildings");
        if (buildingLayer) {
          mapRef.current.setPaintProperty("add-3d-buildings", "fill-extrusion-opacity", 0.3);
        }
      });

      mapRef.current.on("zoomend", () => {
        const buildingLayer = mapRef.current.getLayer("add-3d-buildings");
        if (buildingLayer) {
          const zoom = mapRef.current.getZoom();
          const opacity = zoom < 14 ? 0.4 : zoom < 16 ? 0.6 : 0.8;
          mapRef.current.setPaintProperty("add-3d-buildings", "fill-extrusion-opacity", opacity);
        }
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

      {/* Profile Dropdown - Only show for logged in users */}
      {!isGuest && (
        <div className="fixed top-4 right-4 z-50">
          <ProfileDropdown />
        </div>
      )}

      {/* Simple Sign Up/In Button for Guests */}
      {isGuest && (
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={() => window.location.href = '/'}
            className="bg-primary-500 text-white px-4 py-2 rounded-full shadow-lg hover:bg-primary-600 transition-colors font-medium"
          >
            Sign In
          </button>
        </div>
      )}

      {/* Only show forms for admin users */}
      {!isGuest && user?.email === "admin@gmail.com" && <MakerspaceForms />}

      {/* Search Bar - Always in original position */}
      <MakerspaceSearch
        makerspaces={allMakerspaces}
        onFilter={handleFilter}
        onSuggestionSelect={handleSuggestionSelect}
      />

      {/* Sidebar */}
      <div className={`fixed top-0 left-0 h-full z-40 transition-all duration-300 ${
        isSidebarOpen ? 'w-80 bg-white/95 backdrop-blur-md shadow-2xl' : 'w-0'
      }`}>
        {/* Sidebar Content - Only show when open */}
        {isSidebarOpen && (
          <div className="flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-gray-200/50 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">Makerspaces</h2>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100/50 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Makerspace List */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                <div className="text-sm text-gray-500 mb-4">
                  {filteredMakerspaces.length} of {allMakerspaces.length} makerspaces
                </div>
                
                <div className="space-y-3">
                  {filteredMakerspaces.map((makerspace, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-xl p-4 border border-gray-200/80 hover:border-primary-300 hover:shadow-lg transition-all duration-200 cursor-pointer group"
                      onClick={() => handleSidebarMakerspaceClick(makerspace)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-gray-800 text-sm leading-tight group-hover:text-primary-600 transition-colors">
                          {makerspace.properties.name}
                        </h3>
                        {makerspace.properties.category && (
                          <span className="bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded-full whitespace-nowrap ml-2">
                            {makerspace.properties.category}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                        {makerspace.properties.address}
                      </p>

                      <div className="flex justify-between items-center">
                        <span className="text-xs text-primary-600 font-medium">
                          Click to view on map
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMakerspace(makerspace.properties);
                            setIsModalOpen(true);
                          }}
                          className="bg-primary-500 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-primary-600 transition-colors font-medium shadow-sm"
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {filteredMakerspaces.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <p>No makerspaces found</p>
                    <p className="text-sm">Try adjusting your search</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Collapsed Sidebar Toggle - Only show when sidebar is closed */}
      {!isSidebarOpen && (
        <div className="fixed top-4 left-4 z-40">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="bg-white/90 backdrop-blur-md rounded-xl p-3 shadow-lg hover:shadow-xl transition-all duration-200 hover:bg-white"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      )}

      {/* Chat is available for both guests and logged in users */}
      <MakerspaceChat makerspaces={allMakerspaces} />
      
      {/* Detailed Modal */}
      <MakerspaceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        makerspace={selectedMakerspace}
        preloadedPhotoUrl={selectedMakerspace?.address ? preloadedPhotos[selectedMakerspace.address] : null}
        preloadedPhotos={preloadedPhotos}
      />
    </>
  );
};

export default MapboxBuildings;