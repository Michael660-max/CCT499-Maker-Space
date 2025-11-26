import React, { useEffect, useRef, useCallback, useState, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import MakerspaceSearch from "./MakerspaceSearch";
import MakerspaceChat from "./MakerspaceChat";
import MakerspaceForms from "./MakerspaceForms";
import ProfileDropdown from './ProfileDropdown';
import MakerspaceModal from './MakerspaceModal';
import { useAuth } from '../context/AuthContext';

function normalizeStr(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function deriveAgeBuckets(props) {
  const text = [
    props.audience,
    props.age,
    props.age_range,
    props.description,
    props.notes,
    props.access,
    props.requirements
  ].filter(Boolean).join(" | ").toLowerCase();
  const buckets = new Set();
  if (/(0\s*[-to]*\s*6|early childhood|preschool|kindergarten)/i.test(text)) buckets.add("0-6");
  if (/(6\s*[-to]*\s*13|elementary|grade\s?[1-8]|middle school)/i.test(text)) buckets.add("6-13");
  if (/(13\s*[-to]*\s*17|high school|teen|youth)/i.test(text)) buckets.add("13-17");
  if (/(18\+|adult|college|faculty|staff)/i.test(text)) buckets.add("Only 18+");
  return Array.from(buckets);
}

const SUSTAINABILITY_TAG = "Sustainable Makerspace";

const MapboxBuildings = () => {
  const mapContainerRef = useRef();
  const mapRef = useRef();
  const [mapReady, setMapReady] = useState(false);
  const [allMakerspaces, setAllMakerspaces] = useState([]);
  const [selectedMakerspace, setSelectedMakerspace] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [preloadedPhotos, setPreloadedPhotos] = useState({});
  const preloadedPhotosRef = useRef({});
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const { user } = useAuth();

  // Events
  const [allEvents, setAllEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [viewMode, setViewMode] = useState("makerspaces");
  const [eventSearch, setEventSearch] = useState("");
  const [showUpcomingOnly, setShowUpcomingOnly] = useState(false);

  // Filters
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [filteredMakerspaces, setFilteredMakerspaces] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [selectedTags, setSelectedTags] = useState(new Set());
  const [tagSearch, setTagSearch] = useState("");
  const [searchCategory, setSearchCategory] = useState("All");
  const [openCategories, setOpenCategories] = useState({
    Equipment: false,
    Facility: false,
    Access: false,
    Audience: false,
    Sustainability: false
  });

  const isGuest = !user;

  const {
    equipmentTags,
    facilityTags,
    accessTags,
    audienceTags,
    sustainabilityTags,
    countsByTag,
    categoriesMap
  } = useMemo(() => {
    const equipSet = new Set();
    const facilitySet = new Set();
    const accessSet = new Set();
    const audienceSet = new Set();
    const sustainabilitySet = new Set();
    const counts = {};

    function accumulateFromProps(p) {
      (p.tags || []).forEach(t => {
        const tag = String(t).trim();
        if (!tag) return;
        equipSet.add(tag);
        counts[tag] = (counts[tag] || 0) + 1;
      });
      if (p.category) {
        const catTag = String(p.category).trim();
        if (catTag) {
          facilitySet.add(catTag);
          counts[catTag] = (counts[catTag] || 0) + 1;
        }
      }
      if (p.skills) {
        const skillTag = String(p.skills).trim();
        if (skillTag) {
          accessSet.add(skillTag);
          counts[skillTag] = (counts[skillTag] || 0) + 1;
        }
      }
      deriveAgeBuckets(p).forEach(ageTag => {
        audienceSet.add(ageTag);
        counts[ageTag] = (counts[ageTag] || 0) + 1;
      });
      if (p.sustainable) {
        sustainabilitySet.add(SUSTAINABILITY_TAG);
        counts[SUSTAINABILITY_TAG] = (counts[SUSTAINABILITY_TAG] || 0) + 1;
      }
    }

    for (const ms of allMakerspaces) accumulateFromProps(ms.properties || {});
    allEvents.forEach(ev => accumulateFromProps(ev));

    sustainabilitySet.add(SUSTAINABILITY_TAG);
    if (!counts[SUSTAINABILITY_TAG]) counts[SUSTAINABILITY_TAG] = 0;

    const sortAlpha = (a, b) => a.localeCompare(b);
    const audienceOrder = ["0-6", "6-13", "13-17", "Only 18+"];
    const audienceArr = Array.from(audienceSet)
      .sort((a, b) => audienceOrder.indexOf(a) - audienceOrder.indexOf(b))
      .filter(v => audienceOrder.includes(v));

    const categoriesMapInner = {
      Equipment: Array.from(equipSet).sort(sortAlpha),
      Facility: Array.from(facilitySet).sort(sortAlpha),
      Access: Array.from(accessSet).sort(sortAlpha),
      Audience: audienceArr,
      Sustainability: Array.from(sustainabilitySet).sort(sortAlpha)
    };

    return {
      equipmentTags: categoriesMapInner.Equipment,
      facilityTags: categoriesMapInner.Facility,
      accessTags: categoriesMapInner.Access,
      audienceTags: categoriesMapInner.Audience,
      sustainabilityTags: categoriesMapInner.Sustainability,
      countsByTag: counts,
      categoriesMap: categoriesMapInner
    };
  }, [allMakerspaces, allEvents]);

  const allSearchableTags = useMemo(() => [
    ...equipmentTags,
    ...facilityTags,
    ...accessTags,
    ...audienceTags,
    ...sustainabilityTags
  ], [equipmentTags, facilityTags, accessTags, audienceTags, sustainabilityTags]);

  const searchSuggestions = useMemo(() => {
    const q = normalizeStr(tagSearch);
    if (!q) return [];
    const source = searchCategory === "All" ? allSearchableTags : (categoriesMap[searchCategory] || []);
    return source.filter(t => normalizeStr(t).includes(q)).slice(0, 10);
  }, [tagSearch, searchCategory, allSearchableTags, categoriesMap]);

  const aggregateTagsForMakerspace = useCallback((p) => [
    ...(p.tags || []),
    ...(p.category ? [p.category] : []),
    ...(p.skills ? [p.skills] : []),
    ...(deriveAgeBuckets(p)),
    ...(p.sustainable ? [SUSTAINABILITY_TAG] : [])
  ].map(t => String(t).trim()).filter(Boolean), []);

  const aggregateTagsForEvent = useCallback((ev) => [
    ...(ev.tags || []),
    ...(ev.category ? [ev.category] : []),
    ...(ev.skills ? [ev.skills] : []),
    ...(deriveAgeBuckets(ev)),
    ...(ev.sustainable ? [SUSTAINABILITY_TAG] : [])
  ].map(t => String(t).trim()).filter(Boolean), []);

  const updateMakerspaceSource = useCallback((features) => {
    if (!mapReady || !mapRef.current) return;
    try {
      const src = mapRef.current.getSource("makerspaces");
      if (src) src.setData({ type: "FeatureCollection", features });
    } catch (e) {
      console.warn("Source update skipped:", e);
    }
  }, [mapReady]);

  useEffect(() => {
    if (!mapReady) return;
    if (selectedTags.size === 0) {
      setFilteredMakerspaces(allMakerspaces);
      updateMakerspaceSource(allMakerspaces);
      return;
    }
    const filtered = allMakerspaces.filter(m => {
      const agg = aggregateTagsForMakerspace(m.properties || {});
      return agg.some(t => selectedTags.has(t));
    });
    setFilteredMakerspaces(filtered);
    updateMakerspaceSource(filtered);
  }, [selectedTags, allMakerspaces, mapReady, updateMakerspaceSource, aggregateTagsForMakerspace]);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    let evs = [...allEvents];
    if (selectedTags.size > 0) {
      evs = evs.filter(ev => aggregateTagsForEvent(ev).some(t => selectedTags.has(t)));
    }
    if (showUpcomingOnly) {
      evs = evs.filter(ev => ev.start_date && ev.start_date >= today);
    }
    evs.sort((a, b) => {
      const ad = a.start_date || "";
      const bd = b.start_date || "";
      const ua = ad >= today;
      const ub = bd >= today;
      if (ua !== ub) return ua ? -1 : 1;
      return ad.localeCompare(bd);
    });
    setFilteredEvents(evs);
  }, [allEvents, selectedTags, showUpcomingOnly, aggregateTagsForEvent]);

  const toggleTag = useCallback((tag) => {
    const key = String(tag).trim();
    setSelectedTags(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => setSelectedTags(new Set()), []);
  
  const toggleCategoryOpen = useCallback((cat) => {
    setOpenCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  }, []);

  useEffect(() => {
    if (googleMapsLoaded || !process.env.REACT_APP_GOOGLE_API_KEY) return;
    if (window.google?.maps?.places) {
      setGoogleMapsLoaded(true);
      return;
    }
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      existingScript.onload = () => setGoogleMapsLoaded(true);
      if (window.google?.maps?.places) setGoogleMapsLoaded(true);
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

  const preloadPhoto = useCallback(async (props) => {
    if (!googleMapsLoaded || !props.address || preloadedPhotosRef.current[props.address]) return;
    try {
      const query = props.name ? `${props.name}, ${props.address}` : props.address;
      const request = { textQuery: query, fields: ["id", "photos"] };
      const { places } = await window.google.maps.places.Place.searchByText(request);
      if (places?.length) {
        const place = places[0];
        await place.fetchFields({ fields: ["photos"] });
        if (place.photos?.length) {
          const photoUrl = place.photos[0].getURI({ maxWidth: 1200, maxHeight: 900 });
          const img = new Image();
          img.onload = () => {
            preloadedPhotosRef.current[props.address] = photoUrl;
            setPreloadedPhotos(prev => ({ ...prev, [props.address]: photoUrl }));
          };
          img.src = photoUrl;
        }
      }
    } catch (e) {
      console.warn("Photo preload failed", e);
    }
  }, [googleMapsLoaded]);

  const flyToMakerspace = useCallback((makerspace) => {
    if (!mapRef.current || !makerspace?.geometry) return;
    const coords = makerspace.geometry.coordinates.slice();
    const props = makerspace.properties;
    preloadPhoto(props);

    const todayISO = new Date().toISOString().split("T")[0];
    const msId = props.id || props.makerspace_id;
    const relatedEvents = allEvents.filter(ev => ev.makerspace_id === msId);
    const sortedEvents = [...relatedEvents].sort((a, b) => {
      const ad = a.start_date || "";
      const bd = b.start_date || "";
      const ua = ad >= todayISO;
      const ub = bd >= todayISO;
      if (ua !== ub) return ua ? -1 : 1;
      return ad.localeCompare(bd);
    });

    const eventsMarkup = sortedEvents.length === 0
      ? `<div style="font-size:12px;color:#666;">No events yet.</div>`
      : sortedEvents.slice(0, 6).map(ev => {
          const upcoming = ev.start_date && ev.start_date >= todayISO;
          return `
            <div style="margin:4px 0;padding:6px 8px;border:1px solid #eee;border-radius:8px;background:#fafafa;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:12px;font-weight:600;color:#333;">${ev.name || "Untitled"}</span>
                <span style="font-size:10px;padding:2px 6px;border-radius:12px;background:${upcoming ? '#DCFCE7' : '#E5E7EB'};color:${upcoming ? '#166534' : '#374151'};">
                  ${upcoming ? 'Upcoming' : 'Past'}
                </span>
              </div>
              <div style="font-size:11px;color:#555;margin-top:2px;">
                ${ev.start_date ? ev.start_date : 'TBD'}${ev.end_date ? ' → ' + ev.end_date : ''}
              </div>
              <button
                onclick='window.showEventDetails(${JSON.stringify(ev).replace(/'/g,"\\'")})'
                style="margin-top:4px;width:100%;background:#FF6B6B;color:#fff;border:none;border-radius:8px;padding:4px 6px;font-size:11px;cursor:pointer;">
                View Event
              </button>
            </div>
          `;
        }).join("");

    mapRef.current.flyTo({ center: coords, zoom: 17, duration: 1200, essential: true });
    setTimeout(() => {
      const popupContent = `
        <div style="padding:12px;max-width:320px;font-family:system-ui,-apple-system,sans-serif;">
          <h3 style="margin:0 0 8px;font-size:16px;font-weight:600;color:#333;">${props.name}</h3>
          ${props.category ? `<div style="margin:6px 0;background:#FF6B6B;color:#fff;padding:4px 8px;border-radius:12px;font-size:11px;font-weight:500;display:inline-block;">${props.category}</div>` : ""}
          <p style="margin:8px 0 8px;font-size:13px;color:#555;line-height:1.4;"><strong>📍</strong> ${props.address || "Address unavailable"}</p>
          <button
            onclick='window.showMakerspaceDetails(${JSON.stringify(props).replace(/'/g,"\\'")})'
            style="width:100%;margin-top:4px;padding:8px;background:#FF6B6B;color:#fff;border:none;border-radius:12px;font-size:13px;font-weight:500;cursor:pointer;">
            View Full Details →
          </button>
          <div style="margin-top:12px;">
            <h4 style="margin:0 0 6px;font-size:13px;font-weight:600;color:#222;">Past & Upcoming Events</h4>
            <div style="max-height:220px;overflow-y:auto;padding-right:4px;">
              ${eventsMarkup}
            </div>
          </div>
        </div>`;
      document.querySelectorAll(".mapboxgl-popup").forEach(p => p.remove());
      new mapboxgl.Popup({ offset:15, closeButton:true, closeOnClick:false })
        .setLngLat(coords)
        .setHTML(popupContent)
        .addTo(mapRef.current);
    }, 600);
  }, [preloadPhoto, allEvents]);

  const handleFilter = useCallback((filtered) => {
    setFilteredMakerspaces(filtered);
    updateMakerspaceSource(filtered);
  }, [updateMakerspaceSource]);

  const handleSuggestionSelect = useCallback(m => flyToMakerspace(m), [flyToMakerspace]);

  const handleSidebarMakerspaceClick = useCallback(m => flyToMakerspace(m), [flyToMakerspace]);

  useEffect(() => {
    window.showMakerspaceDetails = (props) => {
      setSelectedMakerspace(props);
      setIsModalOpen(true);
    };
    window.showEventDetails = (ev) => setSelectedEvent(ev);
    return () => {
      delete window.showMakerspaceDetails;
      delete window.showEventDetails;
    };
  }, []);

  // Map initialization - run ONCE on mount
  useEffect(() => {
    mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;
    
    const map = new mapboxgl.Map({
      style: "mapbox://styles/mapbox/standard",
      center: [-79.3832, 43.6532],
      zoom: 11,
      minZoom: 6,
      maxZoom: 18,
      pitch: 45,
      bearing: -17.6,
      container: mapContainerRef.current,
      antialias: true
    });

    mapRef.current = map;

    const removeLabels = () => {
      const labels = ["poi-label","transit-label","road-label","place-label-city","place-label-town","natural-label-line","natural-label-point","water-label-line","water-label-point"];
      setTimeout(() => {
        labels.forEach(id => {
          if (map.getLayer(id)) {
            try { map.removeLayer(id); } catch {}
          }
        });
      }, 1000);
    };

    const add3DBuildings = () => {
      const layers = map.getStyle().layers;
      const labelLayerId = layers.find(l => l.type === "symbol" && l.layout["text-field"])?.id;
      map.addLayer({
        id: "add-3d-buildings",
        source: "composite",
        "source-layer": "building",
        filter: ["==", "extrude", "true"],
        type: "fill-extrusion",
        minzoom: 14,
        paint: {
          "fill-extrusion-color": "#aaa",
          "fill-extrusion-height": [
            "interpolate", ["linear"], ["zoom"],
            14, 0,
            14.5, ["*", ["get", "height"], 0.5],
            16, ["get", "height"]
          ],
          "fill-extrusion-base": [
            "interpolate", ["linear"], ["zoom"],
            14, 0,
            14.5, ["*", ["get", "min_height"], 0.5],
            16, ["get", "min_height"]
          ],
          "fill-extrusion-opacity": [
            "interpolate", ["linear"], ["zoom"],
            14, 0.4,
            16, 0.6,
            18, 0.8
          ]
        }
      }, labelLayerId);
    };

    const setupLayers = async () => {
      try {
        const REST_URL = process.env.REACT_APP_REST_URL;
        const ANON = process.env.REACT_APP_ANON_KEY;
        
        if (!REST_URL || !ANON) {
          console.error("Missing Supabase env");
          return;
        }

        const bboxParams = (map) => {
          const [[w, s],[e, n]] = map.getBounds().toArray();
          return `minx=${w}&miny=${s}&maxx=${e}&maxy=${n}`;
        };

        const fetchMakerspaces = async (map) => {
          try {
            const url = `${REST_URL}/rest/v1/rpc/makerspaces_geojson?${bboxParams(map)}`;
            const res = await fetch(url, {
              headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" }
            });
            if (!res.ok) throw new Error(res.status);
            const data = await res.json();
            if (data?.features) {
              data.features = data.features.map(f => {
                const p = f.properties || {};
                let tags = [];
                const eq = p.equipment;
                if (Array.isArray(eq)) tags = eq;
                else if (typeof eq === "string") {
                  let parsed = null;
                  try { parsed = JSON.parse(eq); } catch {}
                  if (Array.isArray(parsed)) tags = parsed;
                  else {
                    const m = eq.match(/^\{(.+)\}$/);
                    if (m && m[1]) tags = m[1].split(",").map(s => s.trim().replace(/^"(.*)"$/,"$1"));
                  }
                }
                p.tags = (tags || []).map(t => String(t).trim()).filter(Boolean);
                if (p.skills) p.skills = String(p.skills).trim();
                p.ageBuckets = deriveAgeBuckets(p);
                f.properties = p;
                return f;
              });
            }
            return data;
          } catch (e) {
            console.error("Makerspaces fetch error", e);
            return { type:"FeatureCollection", features: [] };
          }
        };

        const fetchEvents = async () => {
          try {
            const url = `${REST_URL}/rest/v1/events?select=id,name,description,start_date,end_date,category,skills,equipment,tags,makerspace_id,sustainable,created_at&order=start_date.asc.nullsLast`;
            const res = await fetch(url, {
              headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" }
            });
            if (!res.ok) throw new Error(res.status);
            const data = await res.json();
            return data.map(ev => {
              let tags = [];
              const raw = ev.tags || ev.equipment;
              if (Array.isArray(raw)) tags = raw;
              else if (typeof raw === "string") {
                let parsed = null;
                try { parsed = JSON.parse(raw); } catch {}
                if (Array.isArray(parsed)) tags = parsed;
                else {
                  const m = raw.match(/^\{(.+)\}$/);
                  if (m && m[1]) tags = m[1].split(",").map(s => s.trim().replace(/^"(.*)"$/,"$1"));
                }
              }
              ev.tags = (tags || []).map(t => String(t).trim()).filter(Boolean);
              if (ev.skills) ev.skills = String(ev.skills).trim();
              ev.ageBuckets = deriveAgeBuckets(ev);
              return ev;
            });
          } catch (e) {
            console.error("Events fetch error", e);
            return [];
          }
        };

        const geoJSON = await fetchMakerspaces(map);
        setAllMakerspaces(geoJSON.features || []);
        const eventsData = await fetchEvents();
        setAllEvents(eventsData);

        map.addSource("makerspaces", { type: "geojson", data: geoJSON });
        map.addLayer({
          id: "makerspace-points",
          type: "circle",
          source: "makerspaces",
          paint: {
            "circle-color": "#FF6B6B",
            "circle-radius": 8,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#fff"
          }
        });

        map.on("click", "makerspace-points", e => {
          const feature = e.features[0];
          // Call flyToMakerspace directly since it's stable
          if (mapRef.current && feature?.geometry) {
            const coords = feature.geometry.coordinates.slice();
            map.flyTo({ center: coords, zoom: 17, duration: 1200, essential: true });
          }
        });

        map.on("mouseenter", "makerspace-points", () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "makerspace-points", () => {
          map.getCanvas().style.cursor = "";
        });
      } catch (e) {
        console.error("Layer setup error", e);
      }
    };

    map.on("load", () => {
      setMapReady(true);
      removeLabels();
      add3DBuildings();
      setupLayers();
    });

    return () => {
      setMapReady(false);
      map.remove();
    };
  }, []); // Empty dependency array - run once on mount

  useEffect(() => {
    if (!allEvents.length || !allMakerspaces.length) return;
    setAllEvents(prev =>
      prev.map(ev => {
        if ((!ev.tags || ev.tags.length === 0) && ev.makerspace_id) {
          const ms = allMakerspaces.find(f => f.properties.id === ev.makerspace_id || f.properties.makerspace_id === ev.makerspace_id);
          if (ms?.properties?.tags?.length) {
            return { ...ev, tags: [...ms.properties.tags] };
          }
        }
        return ev;
      })
    );
  }, [allMakerspaces, allEvents.length]);

  const DISPLAY_ORDER = ["Equipment","Facility","Access","Audience","Sustainability"];
  const todayISO = new Date().toISOString().split("T")[0];

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
          zIndex: 1
        }}
      />

      {!isGuest && (
        <div className="fixed top-4 right-4 z-50">
          <ProfileDropdown />
        </div>
      )}

      {isGuest && (
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={() => window.location.href='/'}
            className="bg-primary-500 text-white px-4 py-2 rounded-full shadow-lg hover:bg-primary-600 transition-colors font-medium"
          >
            Sign In
          </button>
        </div>
      )}

      {!isGuest && (user?.email === "admin@gmail.com" || user?.email === "admin1@gmail.com") && <MakerspaceForms />}

      <MakerspaceSearch
        makerspaces={allMakerspaces}
        onFilter={handleFilter}
        onSuggestionSelect={handleSuggestionSelect}
      />

      <div className={`fixed top-0 left-0 h-full z-40 transition-all duration-300 ${isSidebarOpen ? 'w-80 bg-white shadow-xl' : 'w-0'}`}>
        {isSidebarOpen && (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-200/70">
              <div className="flex items-center justify-between mb-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode("makerspaces")}
                    className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
                      viewMode === "makerspaces" ? "bg-primary-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Makerspaces
                  </button>
                  <button
                    onClick={() => setViewMode("events")}
                    className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
                      viewMode === "events" ? "bg-primary-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Events
                  </button>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="bg-white rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 p-3 border-b border-gray-200">
                  <input
                    type="text"
                    value={tagSearch}
                    onChange={e => setTagSearch(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && searchSuggestions[0]) {
                        toggleTag(searchSuggestions[0]);
                        setTagSearch("");
                      }
                    }}
                    placeholder="Search tags..."
                    className="flex-1 text-xs px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
                  />
                  <select
                    value={searchCategory}
                    onChange={e => setSearchCategory(e.target.value)}
                    className="text-xs px-2 py-2 rounded-md border border-gray-300 bg-white"
                  >
                    <option value="All">All</option>
                    {DISPLAY_ORDER.filter(c => categoriesMap[c]?.length).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {tagSearch && searchSuggestions.length > 0 && (
                  <div className="px-3 py-2 flex flex-wrap gap-1 border-b border-gray-200">
                    {searchSuggestions.map(s => (
                      <button
                        key={s}
                        onClick={() => { toggleTag(s); setTagSearch(""); }}
                        className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
                          selectedTags.has(s)
                            ? 'bg-primary-100 border-primary-400 text-primary-800'
                            : 'bg-white border-gray-200 text-gray-700 hover:border-primary-300'
                        }`}
                      >
                        {s} {countsByTag[s] !== undefined && <span className="ml-1 opacity-60">({countsByTag[s]})</span>}
                      </button>
                    ))}
                  </div>
                )}

                <div className="p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] text-gray-500">
                      {allSearchableTags.length} tags
                    </span>
                    <button
                      onClick={clearFilters}
                      className="text-[10px] font-medium text-primary-600 hover:text-primary-700 px-2 py-1 rounded bg-white hover:bg-gray-50 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>

                  {DISPLAY_ORDER.map(cat => {
                    const tags = categoriesMap[cat] || [];
                    if (cat === "Audience" && tags.length === 0) return null;
                    return (
                      <div key={cat} className="mb-3 border border-gray-200 rounded-lg bg-white">
                        <button
                          onClick={() => toggleCategoryOpen(cat)}
                          className="w-full flex items-center justify-between px-3 py-2"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-800">{cat}</span>
                            <span className="text-[10px] text-gray-500">{tags.length}</span>
                          </div>
                          <svg
                            className={`w-4 h-4 text-gray-600 transition-transform ${openCategories[cat] ? 'rotate-180' : ''}`}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {openCategories[cat] && (
                          <div className="px-3 pb-3 max-h-44 overflow-y-auto custom-scrollbar">
                            {tags
                              .filter(t => !tagSearch || normalizeStr(t).includes(normalizeStr(tagSearch)))
                              .map(tag => (
                                <label
                                  key={tag}
                                  className={`flex items-center justify-between p-2 mb-1 rounded-lg cursor-pointer transition-all ${
                                    selectedTags.has(tag)
                                      ? 'bg-primary-100 border border-primary-400'
                                      : 'bg-white border border-gray-200 hover:bg-gray-50'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <input
                                      type="checkbox"
                                      checked={selectedTags.has(tag)}
                                      onChange={() => toggleTag(tag)}
                                      className="w-3.5 h-3.5 rounded cursor-pointer accent-primary-500 flex-shrink-0"
                                    />
                                    <span className="text-[11px] font-medium text-gray-700 truncate">{tag}</span>
                                  </div>
                                  <span className="text-[10px] font-semibold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full ml-2 flex-shrink-0 border border-primary-200">
                                    {countsByTag[tag] || 0}
                                  </span>
                                </label>
                              ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-4">
                {viewMode === "makerspaces" && (
                  <>
                    <div className="text-sm text-gray-500 mb-4">
                      {filteredMakerspaces.length} of {allMakerspaces.length} makerspaces
                      {selectedTags.size > 0 && <span className="text-primary-600 font-medium"> (filtered)</span>}
                    </div>
                    <div className="space-y-3">
                      {filteredMakerspaces.map((m, i) => {
                        const p = m.properties;
                        const aggMatched = aggregateTagsForMakerspace(p).filter(t => selectedTags.has(t)).slice(0, 6);
                        return (
                          <div
                            key={i}
                            className="bg-white rounded-xl p-4 border border-gray-200 hover:border-primary-300 hover:shadow-md transition cursor-pointer group"
                            onClick={() => handleSidebarMakerspaceClick(m)}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="font-semibold text-gray-800 text-sm leading-tight group-hover:text-primary-600">
                                {p.name}
                              </h3>
                              {p.category && (
                                <span className="bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded-full ml-2">
                                  {p.category}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 mb-3 line-clamp-2">{p.address}</p>
                            {selectedTags.size > 0 && aggMatched.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-3">
                                {aggMatched.map(tag => (
                                  <span key={tag} className="text-[9px] bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full border border-primary-200">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-primary-600 font-medium">View on map</span>
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setSelectedMakerspace(p);
                                  setIsModalOpen(true);
                                }}
                                className="bg-primary-500 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-primary-600 transition font-medium shadow-sm"
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
                        <p>No makerspaces found</p>
                      </div>
                    )}
                  </>
                )}

                {viewMode === "events" && (
                  <>
                    <div className="mb-4 flex items-center gap-2">
                      <input
                        type="text"
                        value={eventSearch}
                        onChange={e => setEventSearch(e.target.value)}
                        placeholder="Search events..."
                        className="flex-1 text-xs px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-300"
                      />
                      <label className="flex items-center gap-1 text-[11px]">
                        <input
                          type="checkbox"
                          checked={showUpcomingOnly}
                          onChange={e => setShowUpcomingOnly(e.target.checked)}
                          className="accent-primary-500"
                        />
                        Upcoming
                      </label>
                    </div>
                    <div className="text-sm text-gray-500 mb-4">
                      {filteredEvents.length} of {allEvents.length} events
                      {showUpcomingOnly && <span className="text-primary-600 font-medium"> (upcoming)</span>}
                      {selectedTags.size > 0 && <span className="text-primary-600 font-medium"> (filtered)</span>}
                    </div>
                    <div className="space-y-3">
                      {filteredEvents
                        .filter(ev => !eventSearch || normalizeStr(ev.name).includes(normalizeStr(eventSearch)))
                        .map(ev => {
                          const isUpcoming = ev.start_date && ev.start_date >= todayISO;
                          const matchedTags = aggregateTagsForEvent(ev).filter(t => selectedTags.has(t)).slice(0, 5);
                          return (
                            <div
                              key={ev.id || ev.name}
                              className="bg-white rounded-xl p-4 border border-gray-200 hover:border-primary-300 hover:shadow-md transition cursor-pointer group"
                              onClick={() => {
                                if (ev.makerspace_id) {
                                  const ms = allMakerspaces.find(f => f.properties.id === ev.makerspace_id || f.properties.makerspace_id === ev.makerspace_id);
                                  if (ms) flyToMakerspace(ms);
                                }
                                setSelectedEvent(ev);
                              }}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <h3 className="font-semibold text-gray-800 text-sm leading-tight group-hover:text-primary-600">
                                  {ev.name || "Untitled Event"}
                                </h3>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  isUpcoming ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-700"
                                }`}>
                                  {isUpcoming ? "Upcoming" : "Expired"}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-600 mb-1">
                                {ev.start_date ? `Starts: ${ev.start_date}` : "Date TBD"}
                                {ev.end_date ? ` • Ends: ${ev.end_date}` : ""}
                              </p>
                              {ev.category && (
                                <p className="text-[11px] text-primary-600 mb-2">{ev.category}</p>
                              )}
                              <p className="text-xs text-gray-600 line-clamp-2 mb-3">
                                {ev.description || "No description provided."}
                              </p>
                              {selectedTags.size > 0 && matchedTags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-3">
                                  {matchedTags.map(tag => (
                                    <span key={tag} className="text-[9px] bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full border border-primary-200">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-primary-600 font-medium">Click for details</span>
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    setSelectedEvent(ev);
                                  }}
                                  className="bg-primary-500 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-primary-600 transition font-medium shadow-sm"
                                >
                                  Details
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                    {filteredEvents.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <p>No events found</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {!isSidebarOpen && (
        <div className="fixed top-4 left-4 z-40">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="bg-white rounded-xl p-3 shadow-lg hover:shadow-xl transition hover:bg-gray-50"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      )}

      <MakerspaceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        makerspace={selectedMakerspace}
        preloadedPhotoUrl={selectedMakerspace?.address ? preloadedPhotos[selectedMakerspace.address] : null}
        preloadedPhotos={preloadedPhotos}
      />

      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedEvent(null)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md max-height-[80vh] overflow-y-auto custom-scrollbar p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                {selectedEvent.name || "Untitled Event"}
              </h2>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-2 rounded hover:bg-gray-100"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <span className="font-medium">Status: </span>
                {selectedEvent.start_date && selectedEvent.start_date >= todayISO ? (
                  <span className="text-green-600">Upcoming</span>
                ) : (
                  <span className="text-gray-600">Expired</span>
                )}
              </div>
              {selectedEvent.start_date && (
                <div><span className="font-medium">Start:</span> {selectedEvent.start_date}</div>
              )}
              {selectedEvent.end_date && (
                <div><span className="font-medium">End:</span> {selectedEvent.end_date}</div>
              )}
              {selectedEvent.category && (
                <div><span className="font-medium">Category:</span> {selectedEvent.category}</div>
              )}
              {selectedEvent.skills && (
                <div><span className="font-medium">Access:</span> {selectedEvent.skills}</div>
              )}
              {selectedEvent.description && (
                <div className="text-gray-700 whitespace-pre-wrap">{selectedEvent.description}</div>
              )}
              {aggregateTagsForEvent(selectedEvent).length > 0 && (
                <div>
                  <span className="font-medium">Tags:</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {aggregateTagsForEvent(selectedEvent).map(t => (
                      <span key={t} className="text-[10px] bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full border border-primary-200">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {selectedEvent.makerspace_id && (
                <button
                  onClick={() => {
                    const ms = allMakerspaces.find(f => f.properties.id === selectedEvent.makerspace_id || f.properties.makerspace_id === selectedEvent.makerspace_id);
                    if (ms) {
                      flyToMakerspace(ms);
                      setSelectedEvent(null);
                    }
                  }}
                  className="mt-2 w-full bg-primary-500 text-white text-sm py-2 rounded-lg hover:bg-primary-600 transition"
                >
                  Go To Makerspace →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <MakerspaceChat makerspaces={allMakerspaces} />
    </>
  );
};

export default MapboxBuildings;