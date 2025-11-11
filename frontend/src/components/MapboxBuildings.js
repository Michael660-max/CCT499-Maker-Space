import React, { useEffect, useRef, useCallback, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import MakerspaceSearch from "./MakerspaceSearch";
import MakerspaceChat from "./MakerspaceChat";
import MakerspaceForms from "./MakerspaceForms";
import ProfileDropdown from "./ProfileDropdown";
import MakerspaceModal from "./MakerspaceModal";
import MakerspaceFilter from "./MakerspaceFilters";
import { useAuth } from "../context/AuthContext";

// Fixed categories with expanded keywords/brands
const TECHNOLOGY_KEYWORDS = {
  "3D Printing": [
    "3d print","3d printer","fdm","resin","sla","msla","sls","dmls","printer",
    "ender","prusa","ultimaker","makerbot","flashforge","bambu","bambu lab","anycubic",
    "elegoo","formlabs","form 2","form 3","raise3d","creality"
  ],
  "Laser Cutting": [
    "laser","laser cutter","lasercut","engraver","engraving","co2","fiber laser",
    "epilog","trotec","glowforge","boss laser","universal laser"
  ],
  "CNC / Router": [
    "cnc","router","cnc router","mill","cnc mill","shapeoko","x-carve","nomad","tormach","haas","bridgeport"
  ],
  "Vinyl Cutter": [
    "vinyl","vinyl cutter","plotter","silhouette","cameo","cricut","roland","graphtec","sticker","decal","htv","heat transfer vinyl"
  ],
  "Electronics / Soldering": [
    "solder","soldering","rework","hot air","electronics","pcb","bench supply","power supply",
    "oscilloscope","logic analyzer","multimeter","breadboard"
  ],
  "Woodworking": [
    "wood","table saw","sawstop","bandsaw","band saw","lathe","planer","jointer","miter saw",
    "router table","drill press","sander","panel saw","dust collection","chisel"
  ],
  "Metalworking / Welding": [
    "weld","welding","mig","tig","stick","oxy","oxy-acetylene","metal","lathe","mill",
    "plasma","plasma cutter","angle grinder","anvil","forge","shear","brake","roll"
  ],
  "Textiles / Sewing": [
    "sew","sewing","serger","overlock","textile","fabric","embroidery","embroider","loom",
    "weaving","knitting","heat press","sublimation","dye sub"
  ],
  "Ceramics / Pottery": [
    "ceramic","pottery","kiln","clay","wheel","throwing","glaze","slipcast","slip casting"
  ],
  "Robotics / Embedded": [
    "robot","arduino","raspberry","raspberry pi","pi","embedded","microcontroller","esp32","esp8266",
    "teensy","stm32","micro:bit","lego mindstorms","lego spike","vex","servo","sensor"
  ],
};

// Helpers
function asArray(value) {
  if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map(s => s.trim()).filter(Boolean);
  return [];
}

function makeUid(feat, idx) {
  const p = feat?.properties || {};
  const c = Array.isArray(feat?.geometry?.coordinates) ? feat.geometry.coordinates.join(",") : "noc";
  return String(p.id || p.uid || `${p.name || "ms"}|${c}|${idx}`);
}

// match with word-ish boundaries; also allows brand names
function includesKeyword(hay, kw) {
  const esc = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = esc.replace(/\s+/g, "[\\s-]+");
  const re = new RegExp(`(^|\\W)${pattern}s?(\\W|$)`, "i");
  return re.test(hay);
}

function detectTechCategories(props = {}) {
  const hay = [
    props.equipment,
    props.technologies,
    props.description,
    props.notes,
    props.about
  ].filter(Boolean).map(String).join(" ").toLowerCase();

  const found = [];
  Object.entries(TECHNOLOGY_KEYWORDS).forEach(([label, kws]) => {
    if (kws.some(k => includesKeyword(hay, k))) found.push(label);
  });
  return Array.from(new Set(found));
}

function augmentFeature(feat, idx) {
  const p = feat?.properties || {};
  const techCategories = detectTechCategories(p);

  // Type categories normalization (if you need later)
  let typeCategories = asArray(p.typeCategories);
  if (!typeCategories.length) typeCategories = asArray(p.space_type);
  if (!typeCategories.length) typeCategories = asArray(p.primary_access_models);

  const uid = makeUid(feat, idx);
  return { ...feat, id: uid, properties: { ...p, techCategories, typeCategories, uid } };
}

const MapboxBuildings = ({ onMakerspaceLoad }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);

  const [allMakerspaces, setAllMakerspaces] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [filteredMakerspaces, setFilteredMakerspaces] = useState([]); // from sidebar
  const [filteredEvents, setFilteredEvents] = useState([]); // from event filter
  const [searchFiltered, setSearchFiltered] = useState([]); // from search box
  const [selectedMakerspace, setSelectedMakerspace] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [styleReady, setStyleReady] = useState(false);
  const { user } = useAuth();

  // Combine sidebar + search filters (intersection if both active)
  const effectiveFeatures = (() => {
    const base = filteredMakerspaces.length ? filteredMakerspaces : allMakerspaces;
    const withSearch = searchFiltered.length ? searchFiltered : base;
    if (filteredMakerspaces.length && searchFiltered.length) {
      const keys = new Set(searchFiltered.map(f => f.properties?.uid || f.id));
      return base.filter(f => keys.has(f.properties?.uid || f.id));
    }
    return withSearch;
  })();

  // Effective events based on filter
  const effectiveEvents = filteredEvents.length ? filteredEvents : allEvents;

  // Fast layer filter (do not mutate source data repeatedly)
  const applyFilterToLayer = useCallback((features, hasAnyFilter) => {
    const map = mapRef.current;
    if (!map || !styleReady || !map.isStyleLoaded?.() || !map.getLayer?.("makerspace-points")) return;

    if (!hasAnyFilter) {
      map.setFilter("makerspace-points", null);
      return;
    }
    const ids = Array.from(new Set((features || []).map(f => f.properties?.uid || f.id))).filter(Boolean);
    map.setFilter("makerspace-points", ["in", ["get", "uid"], ["literal", ids]]);
  }, [styleReady]);

  const applyEventFilterToLayer = useCallback((events) => {
    const map = mapRef.current;
    if (!map || !styleReady || !map.isStyleLoaded?.() || !map.getLayer?.("event-icons")) return;

    if (!events.length) {
      map.setFilter("event-icons", null);
      return;
    }
    const eventIds = Array.from(new Set(events.map(e => e.properties?.eventId))).filter(Boolean);
    map.setFilter("event-icons", ["in", ["get", "eventId"], ["literal", eventIds]]);
  }, [styleReady]);

  useEffect(() => {
    if (!styleReady) return;
    const hasAnyFilter = filteredMakerspaces.length > 0 || searchFiltered.length > 0;
    applyFilterToLayer(effectiveFeatures, hasAnyFilter);
  }, [styleReady, effectiveFeatures, filteredMakerspaces.length, searchFiltered.length, applyFilterToLayer]);

  useEffect(() => {
    if (!styleReady) return;
    applyEventFilterToLayer(effectiveEvents);
  }, [styleReady, effectiveEvents, applyEventFilterToLayer]);

  const removePerformanceLabels = useCallback(() => {
    const labels = [
      "poi-label","transit-label","road-label","place-label-city","place-label-town",
      "natural-label-line","natural-label-point","water-label-line","water-label-point"
    ];
    setTimeout(() => {
      labels.forEach(id => {
        try { if (mapRef.current?.getLayer(id)) mapRef.current.removeLayer(id); } catch {}
      });
    }, 800);
  }, []);

  const add3DBuildingsLayer = useCallback(() => {
    const layers = mapRef.current.getStyle().layers;
    const labelLayerId = layers.find(l => l.type === "symbol" && l.layout["text-field"])?.id;
    mapRef.current.addLayer({
      id: "add-3d-buildings",
      source: "composite",
      "source-layer": "building",
      filter: ["==","extrude","true"],
      type: "fill-extrusion",
      minzoom: 14,
      paint: {
        "fill-extrusion-color": "#aaa",
        "fill-extrusion-height": ["interpolate",["linear"],["zoom"],14,0,14.5,["*",["get","height"],0.5],16,["get","height"]],
        "fill-extrusion-base": ["interpolate",["linear"],["zoom"],14,0,14.5,["*",["get","min_height"],0.5],16,["get","min_height"]],
        "fill-extrusion-opacity": ["interpolate",["linear"],["zoom"],14,0.4,16,0.6,18,0.8]
      }
    }, labelLayerId);
  }, []);

  const flyToMakerspace = useCallback((makerspace) => {
    if (!mapRef.current || !makerspace.geometry) return;
    const coordinates = makerspace.geometry.coordinates.slice();
    const props = makerspace.properties;
    mapRef.current.flyTo({ center: coordinates, zoom: 20, duration: 1200, essential: true });
    setTimeout(() => {
      const popupContent = `
        <div style="padding:12px;max-width:300px;font-family:system-ui,-apple-system,sans-serif;">
          <h3 style="margin:0 0 8px;font-size:16px;font-weight:600;">${props.name}</h3>
          ${props.category ? `<div style="margin:6px 0;background:#FF6B6B;color:#fff;padding:4px 8px;border-radius:12px;font-size:11px;font-weight:500;display:inline-block;">${props.category}</div>` : ""}
          <p style="margin:8px 0 4px;font-size:13px;color:#555;"><strong>📍</strong> ${props.address || ""}</p>
          <button onclick='window.showMakerspaceDetails(${JSON.stringify(props).replace(/'/g,"\\'")})'
            style="width:100%;margin-top:8px;padding:8px;background:#FF6B6B;color:#fff;border:none;border-radius:12px;font-size:13px;font-weight:500;cursor:pointer;">
            View Full Details →
          </button>
        </div>`;
      document.querySelectorAll(".mapboxgl-popup").forEach(p => p.remove());
      new mapboxgl.Popup({ offset: 15, closeButton: true, closeOnClick: false })
        .setLngLat(coordinates).setHTML(popupContent).addTo(mapRef.current);
    }, 1200);
  }, []);

  const setupMakerspaceLayer = useCallback(async () => {
    try {
      const REST_URL = process.env.REACT_APP_REST_URL;
      const ANON = process.env.REACT_APP_ANON_KEY;
      if (!REST_URL || !ANON) {
        console.error("Missing Supabase env vars");
        return;
      }
      const bboxParams = (map) => {
        const [[w,s],[e,n]] = map.getBounds().toArray();
        return `minx=${w}&miny=${s}&maxx=${e}&maxy=${n}`;
      };
      const fetchGeoJSON = async (map) => {
        try {
          const url = `${REST_URL}/rest/v1/rpc/makerspaces_geojson?${bboxParams(map)}`;
          const res = await fetch(url, {
            headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
          });
          if (!res.ok) throw new Error(res.status);
          return res.json();
        } catch (e) {
          console.error("Fetch error:", e);
          return { type:"FeatureCollection", features:[] };
        }
      };

      const fc = await fetchGeoJSON(mapRef.current);
      const augmented = {
        type: "FeatureCollection",
        features: (fc.features || []).map((f, i) => augmentFeature(f, i)),
      };

      // Debug: see category counts to verify classification
      const counts = {};
      for (const f of augmented.features) {
        (f.properties.techCategories || []).forEach(c => counts[c] = (counts[c] || 0) + 1);
      }
      console.log("📊 Equipment Category Counts:");
      console.table(counts);

      setAllMakerspaces(augmented.features);
      if (typeof onMakerspaceLoad === "function") onMakerspaceLoad(augmented.features);

      // Makerspace points layer
      if (!mapRef.current.getSource("makerspaces")) {
        mapRef.current.addSource("makerspaces", { type:"geojson", data: augmented, promoteId: "uid" });
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
        mapRef.current.on("click","makerspace-points",(e)=>{
          const feat = e.features[0];
          flyToMakerspace({ geometry: feat.geometry, properties: feat.properties });
        });
        mapRef.current.on("mouseenter","makerspace-points",()=>{ mapRef.current.getCanvas().style.cursor="pointer"; });
        mapRef.current.on("mouseleave","makerspace-points",()=>{ mapRef.current.getCanvas().style.cursor=""; });
      } else {
        mapRef.current.getSource("makerspaces").setData(augmented);
      }

      // Sample events - randomly assign to ~40% of makerspaces
      const eventTypes = ["Drop-In", "Open House", "Workshop", "Kids (Under 13)", "Youth (13-17)", "Adults (18+)", "Recurring Events", "Community Events"];
      const eventNames = [
        "3D Printing Workshop",
        "Arduino Basics",
        "Kids Robotics Club",
        "Open Lab Hours",
        "Laser Cutting Demo",
        "Sewing Circle",
        "Woodworking 101",
        "Electronics Drop-In",
        "Youth Maker Night",
        "CNC Training",
        "Community Build Day",
        "Teen Tech Time",
        "Adult Open House",
        "Vinyl Cutting Class",
        "Pottery Wheel Demo",
        "Beginner Welding",
        "Knitting & Crochet",
        "Digital Fabrication",
        "Robotics Competition Prep",
        "Family Maker Day"
      ];

      const sampleEvents = {
        type: "FeatureCollection",
        features: augmented.features
          .filter(() => Math.random() < 0.4) // 40% chance to have event
          .map((f, i) => ({
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: f.geometry.coordinates
            },
            properties: {
              eventId: `event-${f.properties.uid}-${i}`,
              makerspaceId: f.properties.uid,
              makerspaceName: f.properties.name,
              eventType: eventTypes[Math.floor(Math.random() * eventTypes.length)],
              eventName: eventNames[Math.floor(Math.random() * eventNames.length)],
              eventDate: ["Nov 15", "Nov 16", "Nov 17", "Weekly", "Nov 18", "Nov 19", "Nov 20", "Daily", "Bi-weekly"][Math.floor(Math.random() * 9)],
              eventTime: ["2pm-4pm", "6pm-8pm", "4pm-6pm", "3pm-7pm", "10am-12pm", "1pm-3pm"][Math.floor(Math.random() * 6)]
            }
          }))
      };

      setAllEvents(sampleEvents.features);
      console.log(`📅 Created ${sampleEvents.features.length} sample events from ${augmented.features.length} makerspaces`);

      if (!mapRef.current.getSource("events")) {
        // Load calendar icon - classic red and white
        const img = new Image(40, 40);
        img.onload = () => {
          if (mapRef.current && !mapRef.current.hasImage("calendar-icon")) {
            mapRef.current.addImage("calendar-icon", img);
            console.log("✅ Calendar icon loaded");
          }
        };
        img.onerror = () => console.error("❌ Calendar icon failed to load");
        img.src = 'data:image/svg+xml;base64,' + btoa(`
          <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <rect x="8" y="10" width="24" height="22" rx="3" fill="#fff" stroke="#DC143C" stroke-width="2"/>
            <rect x="8" y="10" width="24" height="6" rx="3" fill="#DC143C"/>
            <line x1="14" y1="7" x2="14" y2="13" stroke="#DC143C" stroke-width="2" stroke-linecap="round"/>
            <line x1="26" y1="7" x2="26" y2="13" stroke="#DC143C" stroke-width="2" stroke-linecap="round"/>
            <text x="20" y="25" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="#DC143C" text-anchor="middle">15</text>
          </svg>
        `);

        setTimeout(() => {
          if (!mapRef.current.getSource("events")) {
            mapRef.current.addSource("events", { type: "geojson", data: sampleEvents, promoteId: "eventId" });
            mapRef.current.addLayer({
              id: "event-icons",
              type: "symbol",
              source: "events",
              layout: {
                "icon-image": "calendar-icon",
                "icon-size": 0.7,
                "icon-allow-overlap": true,
                "icon-ignore-placement": true,
                "icon-offset": [0, -20]
              }
            });

            console.log("✅ Event layer added");

            mapRef.current.on("click", "event-icons", (e) => {
              e.originalEvent.stopPropagation();
              const props = e.features[0].properties;
              new mapboxgl.Popup({ offset: [0, -30], closeButton: true })
                .setLngLat(e.features[0].geometry.coordinates)
                .setHTML(`
                  <div style="padding:12px;font-family:system-ui;min-width:220px;">
                    <div style="font-weight:700;margin-bottom:6px;font-size:15px;color:#1f2937;">📅 ${props.eventName}</div>
                    <div style="font-size:13px;color:#666;margin-bottom:4px;">at <strong>${props.makerspaceName}</strong></div>
                    <div style="display:inline-block;background:#DC143C;color:#fff;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:600;margin-top:4px;">
                      ${props.eventType}
                    </div>
                    <div style="font-size:12px;color:#999;margin-top:8px;border-top:1px solid #eee;padding-top:6px;">
                      📆 ${props.eventDate} • ⏰ ${props.eventTime}
                    </div>
                  </div>
                `)
                .addTo(mapRef.current);
            });

            mapRef.current.on("mouseenter", "event-icons", () => { 
              mapRef.current.getCanvas().style.cursor = "pointer";
            });
            mapRef.current.on("mouseleave", "event-icons", () => { 
              mapRef.current.getCanvas().style.cursor = "";
            });
          }
        }, 500);
      }

    } catch (err) {
      console.error("Layer setup error:", err);
    }
  }, [flyToMakerspace, onMakerspaceLoad]);

  const handleSearchFilter = useCallback((features) => {
    setSearchFiltered(features);
  }, []);

  const handleSuggestionSelect = useCallback((makerspace) => {
    flyToMakerspace(makerspace);
  }, [flyToMakerspace]);

  useEffect(() => {
    window.showMakerspaceDetails = (props) => {
      setSelectedMakerspace(props);
      setIsModalOpen(true);
    };
    return () => { delete window.showMakerspaceDetails; };
  }, []);

  useEffect(() => {
    mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;
    try {
      setStyleReady(false);
      mapRef.current = new mapboxgl.Map({
        style: "mapbox://styles/mapbox/standard",
        center: [-79.3832, 43.6532],
        zoom: 11,
        minZoom: 6,
        maxZoom: 18,
        pitch: 45,
        bearing: -17.6,
        container: mapContainerRef.current,
        antialias: true,
      });
      mapRef.current.on("style.load", () => {
        setStyleReady(true);
        removePerformanceLabels();
        add3DBuildingsLayer();
        setupMakerspaceLayer();
      });
    } catch (e) {
      console.error("Map init error:", e);
    }
    return () => {
      setStyleReady(false);
      mapRef.current?.remove();
    };
  }, [removePerformanceLabels, add3DBuildingsLayer, setupMakerspaceLayer]);

  return (
    <>
      <div ref={mapContainerRef} style={{ width:"100vw", height:"100vh", position:"fixed", top:0, left:0, zIndex:1 }} />
      <MakerspaceFilter
        makerspaces={allMakerspaces}
        events={allEvents}
        onFilter={setFilteredMakerspaces}
        onEventFilter={setFilteredEvents}
      />
      {user && (
        <div className="fixed top-4 right-4 z-50">
          <ProfileDropdown />
        </div>
      )}
      {user?.email === "admin@gmail.com" && <MakerspaceForms />}
      <MakerspaceSearch
        makerspaces={allMakerspaces}
        onFilter={handleSearchFilter}
        onSuggestionSelect={handleSuggestionSelect}
      />
      <MakerspaceChat makerspaces={allMakerspaces} />
      <MakerspaceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        makerspace={selectedMakerspace}
      />
    </>
  );
};

export default MapboxBuildings;