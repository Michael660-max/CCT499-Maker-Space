import React, { useEffect, useRef, useCallback, useState, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import MakerspaceSearch from "./MakerspaceSearch";
import MakerspaceChat from "./MakerspaceChat";
import MakerspaceForms from "./MakerspaceForms";
import ProfileDropdown from './ProfileDropdown';
import MakerspaceModal from './MakerspaceModal';
import { useAuth } from '../context/AuthContext';
import { supabase } from "../lib/supabase";

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
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [showEventsView, setShowEventsView] = useState(false);
  const [showEventsEnabled, setShowEventsEnabled] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventCountMap, setEventCountMap] = useState({});
  const [makerspaceNameMap, setMakerspaceNameMap] = useState({});
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [ageRange, setAgeRange] = useState({ min: 0, max: 100 });
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [showFilters, setShowFilters] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [tempDateRange, setTempDateRange] = useState({ start: null, end: null });
  const [selectingDateRange, setSelectingDateRange] = useState(false);

  // Add guest mode detection
  const isGuest = !user;

  // Initialize filtered makerspaces when allMakerspaces changes
  useEffect(() => {
    setFilteredMakerspaces(allMakerspaces);
    const idNameMap = {};
    allMakerspaces.forEach((f) => {
      const id = f?.properties?.id;
      if (id != null) {
        idNameMap[id] = f.properties.name;
      }
    });
    setMakerspaceNameMap(idNameMap);
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

  // Fetch events once and build counts
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoadingEvents(true);
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .order("start_time", { ascending: true });
        if (error) throw error;
        setEvents(data || []);
      } catch (e) {
        console.error("Error fetching events:", e);
      } finally {
        setLoadingEvents(false);
      }
    };
    fetchEvents();
  }, []);

  // Build event count map for upcoming events
  useEffect(() => {
    const now = new Date();
    const counts = events.reduce((acc, evt) => {
      if (!evt?.makerspace_id || !evt?.start_time) return acc;
      const start = new Date(evt.start_time);
      if (Number.isNaN(start.getTime())) return acc;
      if (start >= now) {
        acc[evt.makerspace_id] = (acc[evt.makerspace_id] || 0) + 1;
      }
      return acc;
    }, {});
    setEventCountMap(counts);
  }, [events]);

  // Hide events view when toggle is off
  useEffect(() => {
    if (!showEventsEnabled) setShowEventsView(false);
  }, [showEventsEnabled]);

  // Update map source with latest event counts
  useEffect(() => {
    if (
      !mapRef.current ||
      !mapRef.current.isStyleLoaded ||
      !mapRef.current.isStyleLoaded()
    ) {
      return;
    }
    const source = mapRef.current.getSource("makerspaces");
    if (!source) return;
    const geojson = {
      type: "FeatureCollection",
      features: filteredMakerspaces.map((f) => ({
        ...f,
        properties: {
          ...f.properties,
          event_count: showEventsEnabled
            ? Number(eventCountMap[String(f?.properties?.id)]) || 0
            : 0,
        },
      })),
    };
    source.setData(geojson);
  }, [eventCountMap, filteredMakerspaces, showEventsEnabled]);

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
      const featuresWithCount = (initialGeoJSON.features || []).map((f) => ({
        ...f,
        properties: { ...f.properties, event_count: 0 },
      }));
      setAllMakerspaces(featuresWithCount);
      setFilteredMakerspaces(featuresWithCount);

      // Add source for makerspace points (no clustering)
      mapRef.current.addSource("makerspaces", {
        type: "geojson",
        data: { ...initialGeoJSON, features: featuresWithCount },
      });

      // Add individual points layer
      mapRef.current.addLayer({
        id: "makerspace-points",
        type: "circle",
        source: "makerspaces",
        paint: {
          "circle-color": "#FF6B6B",
          "circle-radius": 10,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fff",
        },
      });

      // Label for event counts on pins
      mapRef.current.addLayer({
        id: "makerspace-event-count",
        type: "symbol",
        source: "makerspaces",
        filter: [">", ["get", "event_count"], 0],
        layout: {
          "text-field": ["to-string", ["get", "event_count"]],
          "text-size": 12,
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-letter-spacing": 0.2,
          "text-allow-overlap": true,
          "text-ignore-placement": true,
          "text-optional": true,
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "#d94a4a",
          "text-halo-width": 2.6,
          "text-halo-blur": 0.4,
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
            onclick='window.showMakerspaceDetails(${JSON.stringify(e.features[0]).replace(/'/g, "\\'")})'
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
            features: filtered.map((f) => ({
              ...f,
              properties: {
                ...f.properties,
                event_count: showEventsEnabled
                  ? Number(eventCountMap[String(f?.properties?.id)]) || 0
                  : 0,
              },
            })),
          };
          source.setData(filteredGeoJSON);
        }
      } catch (error) {
        console.error("Error updating map data:", error);
      }
    }
  }, [eventCountMap, showEventsEnabled]);

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

  const formatEventDateRange = (start, end) => {
    const startDate = start ? new Date(start) : null;
    const endDate = end ? new Date(end) : null;
    if (!startDate || Number.isNaN(startDate.getTime())) return "Date TBA";
    const startStr = startDate.toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short",
    });
    if (!endDate || Number.isNaN(endDate.getTime())) return startStr;
    const sameDay = startDate.toDateString() === endDate.toDateString();
    const endStr = sameDay
      ? endDate.toLocaleTimeString([], { timeStyle: "short" })
      : endDate.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
    return sameDay ? `${startStr} - ${endStr}` : `${startStr} – ${endStr}`;
  };

  // Calendar functions
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const isDateInRange = (date) => {
    if (!tempDateRange.start || !tempDateRange.end) return false;
    return date >= tempDateRange.start && date <= tempDateRange.end;
  };

  const handleDateClick = (day) => {
    const clickedDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day);
    
    if (!tempDateRange.start || (tempDateRange.start && tempDateRange.end)) {
      // Start new selection
      setTempDateRange({ start: clickedDate, end: null });
      setSelectingDateRange(true);
    } else {
      // Complete the range
      if (clickedDate >= tempDateRange.start) {
        const finalRange = { start: tempDateRange.start, end: clickedDate };
        setTempDateRange(finalRange);
        setDateRange(finalRange);
        setSelectingDateRange(false);
      } else {
        // If clicked date is before start, swap them
        const finalRange = { start: clickedDate, end: tempDateRange.start };
        setTempDateRange(finalRange);
        setDateRange(finalRange);
        setSelectingDateRange(false);
      }
    }
  };

  const navigateMonth = (direction) => {
    setCalendarDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const formatDateForDisplay = (date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Dual-range age slider functions
  const handleAgeChange = (type, value) => {
    const numValue = parseInt(value);
    if (type === 'min') {
      setAgeRange(prev => ({
        min: Math.min(numValue, prev.max),
        max: prev.max
      }));
    } else {
      setAgeRange(prev => ({
        min: prev.min,
        max: Math.max(numValue, prev.min)
      }));
    }
  };

  const getAgeSliderBackground = () => {
    const min = ageRange.min;
    const max = ageRange.max;
    const percentageMin = (min / 100) * 100;
    const percentageMax = (max / 100) * 100;
    return `linear-gradient(to right, #ddd 0%, #ddd ${percentageMin}%, #4F46E5 ${percentageMin}%, #4F46E5 ${percentageMax}%, #ddd ${percentageMax}%, #ddd 100%)`;
  };

  // Render calendar
  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(calendarDate);
    const firstDayOfMonth = getFirstDayOfMonth(calendarDate);
    const today = new Date();
    
    const days = [];
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="w-6 h-6"></div>);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day);
      const isToday = currentDate.toDateString() === today.toDateString();
      const isInRange = isDateInRange(currentDate);
      const isStart = tempDateRange.start && currentDate.getTime() === tempDateRange.start.getTime();
      const isEnd = tempDateRange.end && currentDate.getTime() === tempDateRange.end.getTime();
      
      days.push(
        <button
          key={day}
          onClick={() => handleDateClick(day)}
          className={`w-6 h-6 rounded-full text-xs font-medium transition-all duration-200 ${
            isToday ? 'bg-blue-100 text-blue-700 border border-blue-300' : ''
          } ${
            isInRange ? 'bg-primary-100 text-primary-700' : ''
          } ${
            isStart || isEnd ? 'bg-primary-500 text-white' : ''
          } hover:bg-primary-200 hover:text-primary-800`}
        >
          {day}
        </button>
      );
    }
    
    return days;
  };

  const now = new Date();
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (!e.start_time) return false;
      const d = new Date(e.start_time);
      if (Number.isNaN(d.getTime())) return false;

      // Age filter (range)
      const min = ageRange.min;
      const max = ageRange.max;
      if (min !== null && !Number.isNaN(min)) {
        if (e.age_max != null && min > Number(e.age_max)) return false;
      }
      if (max !== null && !Number.isNaN(max)) {
        if (e.age_min != null && max < Number(e.age_min)) return false;
      }

      if (difficultyFilter && e.difficulty_level !== difficultyFilter) {
        return false;
      }

      // Date interval filter
      if (dateRange.start) {
        const start = new Date(dateRange.start);
        start.setHours(0, 0, 0, 0);
        if (d < start) return false;
      }
      if (dateRange.end) {
        const end = new Date(dateRange.end);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }

      return true;
    });
  }, [events, ageRange, difficultyFilter, dateRange]);

  const upcomingEvents = filteredEvents
    .filter((e) => new Date(e.start_time) >= now)
    .sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );
  const pastEvents = filteredEvents
    .filter((e) => new Date(e.start_time) < now)
    .sort(
      (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
    );

  const difficultyOptions = ["Beginner", "Intermediate", "Advanced"];

  const formatAgeText = (event) => {
    const hasMin = event.age_min != null && event.age_min !== "";
    const hasMax = event.age_max != null && event.age_max !== "";
    if (hasMin || hasMax) {
      return `${hasMin ? event.age_min : "0"} - ${hasMax ? event.age_max : "∞"} years`;
    }
    return event.age_category || "All ages";
  };

  const openMakerspaceFromEvent = (makerspaceId) => {
    const feature = allMakerspaces.find(
      (f) => String(f?.properties?.id) === String(makerspaceId)
    );
    if (feature) {
      flyToMakerspace(feature);
      setSelectedMakerspace(feature.properties);
      setIsModalOpen(true);
    }
  };

  const clearDateRange = () => {
    setDateRange({ start: null, end: null });
    setTempDateRange({ start: null, end: null });
    setSelectingDateRange(false);
  };

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

      {/* Top-right controls */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-3">
        <div className="flex items-center gap-2 bg-white/50 backdrop-blur-xl border border-white/40 px-3 py-2 rounded-full shadow-lg">
          <span className="text-xs font-semibold text-gray-700">Events</span>
          <button
            onClick={() => setShowEventsEnabled((v) => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              showEventsEnabled ? "bg-primary-500" : "bg-gray-300"
            }`}
            type="button"
            aria-pressed={showEventsEnabled}
            aria-label="Toggle events view"
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                showEventsEnabled ? "translate-x-5" : "translate-x-1"
              }`}
            />
            </button>
          </div>

        {/* Profile Dropdown - Only show for logged in users */}
        {!isGuest && <ProfileDropdown />}

        {/* Simple Sign Up/In Button for Guests */}
        {isGuest && (
          <button
            onClick={() => window.location.href = '/'}
            className="bg-primary-500 text-white px-4 py-2 rounded-full shadow-lg hover:bg-primary-600 transition-colors font-medium"
          >
            Sign In
          </button>
        )}
      </div>

      {/* Only show forms for admin users */}
      {!isGuest && (user?.email === "admin@gmail.com" || user?.email === "admin1@gmail.com") && <MakerspaceForms />}

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
            <div className="p-4 border-b border-gray-200/50 flex items-center justify-between gap-2">
              <div className="flex gap-2">
                <button
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    !showEventsView ? "bg-primary-500 text-white" : "bg-gray-100 text-gray-700"
                  }`}
                  onClick={() => setShowEventsView(false)}
                >
                  Makerspaces
                </button>
                {showEventsEnabled && (
                  <button
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      showEventsView ? "bg-primary-500 text-white" : "bg-gray-100 text-gray-700"
                    }`}
                    onClick={() => setShowEventsView(true)}
                  >
                    Events
                  </button>
                )}
              </div>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100/50 transition-colors"
                aria-label="Close sidebar"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Sidebar Body */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                {!showEventsView && (
                  <>
                    <div className="text-sm text-gray-500 mb-4 text-left">
                      {filteredMakerspaces.length} of {allMakerspaces.length} makerspaces
                    </div>
                    
                    <div className="space-y-3">
                      {filteredMakerspaces.map((makerspace, index) => {
                        const msId = makerspace?.properties?.id;
                        const count = showEventsEnabled
                          ? eventCountMap[msId] || 0
                          : 0;
                        return (
                          <div
                            key={index}
                            className="bg-white rounded-xl p-4 border border-gray-200/80 hover:border-primary-300 hover:shadow-lg transition-all duration-200 cursor-pointer group"
                            onClick={() => handleSidebarMakerspaceClick(makerspace)}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="font-semibold text-gray-800 text-sm leading-tight group-hover:text-primary-600 transition-colors text-left">
                                {makerspace.properties.name}
                              </h3>
                              <div className="flex items-center gap-2">
                                {makerspace.properties.category && (
                                  <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full whitespace-nowrap ml-1">
                                    {makerspace.properties.category}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <p className="text-xs text-gray-600 mb-3 line-clamp-2 text-left">
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
                        );
                      })}
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
                  </>
                )}

                {showEventsView && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm text-gray-500">
                        {upcomingEvents.length} upcoming • {pastEvents.length} past events
                      </div>
                      <button
                        className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-[#FF6B6B] text-white shadow-sm"
                        onClick={() => setShowFilters((v) => !v)}
                        type="button"
                      >
                        Filters
                        <span
                          className={`transform transition-transform ${
                            showFilters ? "rotate-180" : "rotate-0"
                          }`}
                        >
                          ▼
                        </span>
                      </button>
                    </div>

                    {showFilters && (
                      <div className="flex flex-col gap-3 text-sm text-gray-700 mb-3 border border-gray-200 rounded-lg p-4 bg-white/80">
                        {/* Difficulty Filter */}
                        <div className="flex flex-col gap-2">
                          <div className="text-xs font-semibold text-gray-800">Difficulty</div>
                          <select
                            value={difficultyFilter}
                            onChange={(e) => setDifficultyFilter(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                          >
                            <option value="">All levels</option>
                            {difficultyOptions.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Age Range - Dual Range Slider */}
                        <div className="flex flex-col gap-2">
                          <div className="text-xs font-semibold text-gray-800">
                            Age Range: {ageRange.min} - {ageRange.max} years
                          </div>
                          
                          {/* Dual Range Slider Container */}
                          <div className="relative h-8 flex items-center">
                            {/* Slider Track */}
                            <div 
                              className="absolute w-full h-2 rounded-full"
                              style={{ background: getAgeSliderBackground() }}
                            ></div>
                            
                            {/* Min Thumb */}
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={ageRange.min}
                              onChange={(e) => handleAgeChange('min', e.target.value)}
                              className="absolute w-full h-2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary-500 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:pointer-events-auto"
                            />
                            
                            {/* Max Thumb */}
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={ageRange.max}
                              onChange={(e) => handleAgeChange('max', e.target.value)}
                              className="absolute w-full h-2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary-500 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:pointer-events-auto"
                            />
                          </div>

                          {/* Age Labels */}
                          <div className="flex justify-between text-xs text-gray-600">
                            <span>0</span>
                            <span>100</span>
                          </div>

                          {/* Quick Age Presets */}
                          <div className="flex flex-wrap gap-1 justify-center mt-2">
                            {[
                              [0, 12, "Kids"],
                              [13, 17, "Teens"], 
                              [18, 25, "Young Adults"],
                              [26, 35, "Adults"],
                              [36, 100, "All Ages"]
                            ].map(([min, max, label], index) => (
                              <button
                                key={index}
                                type="button"
                                onClick={() => {
                                  setAgeRange({ min, max });
                                }}
                                className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Date Range - Calendar */}
                        <div className="flex flex-col gap-2">
                          <div className="text-xs font-semibold text-gray-800">Date Range</div>
                          
                          {/* Selected Range Display */}
                          <div className="text-xs text-gray-600 mb-2 p-2 bg-gray-50 rounded">
                            {dateRange.start && dateRange.end ? (
                              <span>Selected: {formatDateForDisplay(dateRange.start)} → {formatDateForDisplay(dateRange.end)}</span>
                            ) : selectingDateRange ? (
                              <span>Click start date, then end date</span>
                            ) : (
                              <span>No date range selected</span>
                            )}
                          </div>

                          {/* Calendar */}
                          <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                            {/* Calendar Header */}
                            <div className="flex items-center justify-between mb-3">
                              <button
                                type="button"
                                onClick={() => navigateMonth(-1)}
                                className="p-1 hover:bg-gray-100 rounded-full"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                              </button>
                              <h3 className="text-sm font-semibold text-gray-800">
                                {calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                              </h3>
                              <button
                                type="button"
                                onClick={() => navigateMonth(1)}
                                className="p-1 hover:bg-gray-100 rounded-full"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            </div>

                            {/* Calendar Days Grid */}
                            <div className="grid grid-cols-7 gap-1 mb-2">
                              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
                                <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
                                  {day}
                                </div>
                              ))}
                              {renderCalendar()}
                            </div>

                            {/* Clear Button */}
                            {(dateRange.start || selectingDateRange) && (
                              <button
                                onClick={clearDateRange}
                                className="w-full text-xs text-primary-600 hover:text-primary-700 font-medium py-1"
                              >
                                Clear Date Range
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Clear All Filters */}
                        <button
                          className="self-start text-xs text-primary-600 hover:underline font-medium"
                          onClick={() => {
                            setDifficultyFilter("");
                            setAgeRange({ min: 0, max: 100 });
                            clearDateRange();
                          }}
                        >
                          Clear all filters
                        </button>
                      </div>
                    )}

                    <div>
                      <h3 className="text-md font-semibold text-gray-900 mb-2">
                        Upcoming Events
                      </h3>
                      {loadingEvents && <p className="text-sm text-gray-600">Loading events...</p>}
                      {!loadingEvents && upcomingEvents.length === 0 && (
                        <p className="text-sm text-gray-600">No upcoming events.</p>
                      )}
                      <div className="space-y-3">
                        {upcomingEvents.map((event) => (
                          <div
                            key={event.id}
                            className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="text-sm font-semibold text-gray-900 text-left">
                                  {event.title || "Untitled event"}
                                </div>
                                <div className="text-xs text-gray-500 font-medium text-left">
                                  {makerspaceNameMap[event.makerspace_id] ||
                                    `Makerspace #${event.makerspace_id}`}
                                </div>
                              </div>
                              <span className="text-[11px] text-gray-600">
                                {formatEventDateRange(event.start_time, event.end_time)}
                              </span>
                            </div>
                            {event.location_text && (
                              <p className="text-xs text-gray-600 mt-1">
                                {event.location_text}
                              </p>
                            )}
                            <div className="flex gap-2 mt-2">
                              <button
                                className="text-xs px-3 py-1.5 rounded-lg bg-primary-500 text-white"
                                onClick={() => setSelectedEvent(event)}
                              >
                                View details
                              </button>
                              <button
                                className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-800"
                                onClick={() => openMakerspaceFromEvent(event.makerspace_id)}
                              >
                                Open makerspace
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100">
                      <h3 className="text-md font-semibold text-gray-900 mb-2">
                        Past Events
                      </h3>
                      {!loadingEvents && pastEvents.length === 0 && (
                        <p className="text-sm text-gray-600">No past events.</p>
                      )}
                      <div className="space-y-3">
                        {pastEvents.map((event) => (
                          <div
                            key={event.id}
                            className="bg-gray-50 rounded-lg border border-gray-200 p-3 opacity-80"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="text-sm font-semibold text-gray-900 text-left">
                                  {event.title || "Untitled event"}
                                </div>
                                <div className="text-xs text-gray-500 font-medium text-left">
                                  {makerspaceNameMap[event.makerspace_id] ||
                                    `Makerspace #${event.makerspace_id}`}
                                </div>
                              </div>
                              <span className="text-[11px] text-gray-600">
                                {formatEventDateRange(event.start_time, event.end_time)}
                              </span>
                            </div>
                            {event.location_text && (
                              <p className="text-xs text-gray-600 mt-1">
                                {event.location_text}
                              </p>
                            )}
                            <div className="flex gap-2 mt-2">
                              <button
                                className="text-xs px-3 py-1.5 rounded-lg bg-gray-200 text-gray-700"
                                onClick={() => setSelectedEvent(event)}
                              >
                                View details
                              </button>
                              <button
                                className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-800"
                                onClick={() => openMakerspaceFromEvent(event.makerspace_id)}
                              >
                                Open makerspace
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
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

      {/* Event Details Overlay */}
      {selectedEvent && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 relative">
            <button
              onClick={() => setSelectedEvent(null)}
              className="absolute top-3 right-3 text-gray-500 hover:text-[#FF6B6B]"
              aria-label="Close event details"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h4 className="text-xl font-semibold text-gray-900 mb-1">
              {selectedEvent.title || "Event details"}
            </h4>
            <div className="text-sm text-primary-700 mb-3">
              {makerspaceNameMap[selectedEvent.makerspace_id] ||
                `Makerspace #${selectedEvent.makerspace_id}`}
            </div>

            <div className="space-y-2 text-sm text-gray-700">
              <div>
                <span className="font-medium text-gray-800">When: </span>
                {formatEventDateRange(selectedEvent.start_time, selectedEvent.end_time)}
              </div>
              {selectedEvent.location_text && (
                <div><span className="font-medium text-gray-800">Location: </span>{selectedEvent.location_text}</div>
              )}
              {(selectedEvent.latitude || selectedEvent.longitude) && (
                <div>
                  <span className="font-medium text-gray-800">Coords: </span>
                  {selectedEvent.latitude ?? "?"}, {selectedEvent.longitude ?? "?"}
                </div>
              )}
              {selectedEvent.description && (
                <div>
                  <div className="font-medium text-gray-800">Description</div>
                  <p className="text-gray-700">{selectedEvent.description}</p>
                </div>
              )}
              {selectedEvent.difficulty_level && (
                <div><span className="font-medium text-gray-800">Difficulty: </span>{selectedEvent.difficulty_level}</div>
              )}
              {(selectedEvent.age_min != null ||
                selectedEvent.age_max != null ||
                selectedEvent.age_category) && (
                <div>
                  <span className="font-medium text-gray-800">Ages: </span>
                  {formatAgeText(selectedEvent)}
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-3 flex-wrap">
              {selectedEvent.rsvp_link && (
                <a
                  href={selectedEvent.rsvp_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex px-4 py-2 rounded-lg text-sm font-medium bg-primary-500 text-white"
                >
                  Open RSVP / More Info
                </a>
              )}
              <button
                onClick={() => openMakerspaceFromEvent(selectedEvent.makerspace_id)}
                className="inline-flex px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-800"
                type="button"
              >
                Open makerspace
              </button>
              <button
                onClick={() => setSelectedEvent(null)}
                className="inline-flex px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 text-gray-800"
                type="button"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MapboxBuildings;
