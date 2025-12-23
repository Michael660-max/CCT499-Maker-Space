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

const EQUIPMENT_GROUPS = {
  "3D Printing": [
    "3d printer", "3d printers", "3d printing", "3d printing materials",
    "ultimaker", "monochrome binder-jet 3d printer", "pla filament",
    "ultimaker s3", "ultimaker 3", "ultimaker 3 extended", "ultimaker 2+connect",
    "ultimaker 3 extended and 2+connect", "ultimaker 3 extended and 2+connect 3d printers",
    "lulzbot", "lulzbot taz 6", "lulzbot taz 6 3d printers", "fdm", "binder jet", 
    "three fused deposition modelling", "three fused deposition modelling rapid-prototyping systems",
    "two large binder-jet", "two large binder-jet full colour 3d printers",
    "pla filament in various colors", "eos p110", "eos p110 velocis", "eos p396",
    "mjf", "sla", "selective laser sintering", "3d cad design", "3d cad design services",
    "3d design imac", "3d design imac workstation", "3d printer ultimaker s3",
    "dmls", "sls", "rapid prototyping", "rapid-prototyping systems"
  ],
  "3D Scanning and Visualization": [
    "3d scanner", "3d scanners", "3d scanner shining 3d einstar", "3d digitizer", "3d visualization tools",
    "3d x-ray inspection", "3d laser scanner", "shining 3d", "shining 3d einstar",
    "scanner", "scanners", "digitization", "digitizing",
    "3d visualization", "3d x-ray", "sick vision", "sick vision cameras", "sick vision cameras and accessories",
    "digitization equipment"
  ],
  "Audio & Recording": [
    "audio", "audio equipment", "microphones", "sound booth", "studio equipment",
    "microphone", "recording studio", "recording", "recording space", "recording spaces",
    "recording studio equipment", "sound system", "individual recording", "individual recording station",
    "dynaudio", "dynaudio bm6 mkii", "dynaudio bm6 mkii powered studio monitor",
    "focusrite", "focusrite scarlett", "focusrite scarlett 2i2", "focusrite clarett", 
    "focusrite clarett 8prex", "focusrite clarett 8prex 26 28 thunderbolt",
    "universal audio", "universal audio la-610 mkii", "universal audio la-610 mkii compressor",
    "akai", "akai professional advance", "49 keyboard controller", "49 keyboard controller akai professional advance",
    "roland", "roland rd-800", "stage piano", "stage piano roland rd-800",
    "poineer", "poineer dj", "poineer dj ddj-sx2", "poineer dj ddj-sx2 serato dj controller",
    "serato dj", "slate media", "slate media raven", "slate media raven mti2", "slate media raven mti2 w raven 3.0",
    "logic pro", "garageband", "wireless mic", "wireless mic system", "wireless mic system with me2 lavalier mic",
    "studio", "mixer", "amplifier", "speaker", "studio monitor", "headphones",
    "photography and audio-visual", "photography and audio-visual resources"
  ],
  "Musical Instruments": [
    "guitar", "guitars", "ukulele", "banjo", "bass", "stage piano", "keyboard",
    "electronic instruments", "electronic instrument", "synthesizer",
    "roland rd-800"
  ],
  "CNC and Machining": [
    "cnc mill", "cnc milling", "cnc machines", "cnc milling machine", "laser cutter", "plasma cutter",
    "cnc", "laser", "waterjet", "waterjet cutter", "laser engraver", "laser engraving",
    "glowforge", "glowforge plus", "glowforge plus laser cutter engraver",
    "trotec", "trotec speedy 400", "trotec speedy 400 laser cutter",
    "epilog", "epilog fusion", "epilog fusion maker 24", "epilog fusion maker 24 laser cutter engraver",
    "cnc router", "mill", "milling machines", "bridgeport", "bridgeport-style", "bridgeport-style milling machines",
    "5-axis", "5-axis cnc", "5-axis cnc machining", "5-axis cnc machining centre", 
    "dmu", "dmu 50", "5-axis cnc machining centre dmu 50",
    "lathe", "lathe machine", "lathe machines", "saw", "bandsaw", "metal bandsaw",
    "drill press", "metal drill press", "jointer", "jointer planer",
    "table saw", "tablesaw", "miter saw", "mitre saw", "router table",
    "band saw", "circle saw", "scroll saw", "reciprocating saw", "tacksaw",
    "orbital sanders", "sander", "belt disk sander", "bandsaws",
    "five axis", "five-axis", "large three-axis", "laser cutting", "laser-cutting",
    "laser cutters", "six laser cutters", "large three-axis and four-axis cnc",
    "cmc milling machine", "drill presses", "drills", "laser-cutting systems"
  ],
  "Woodworking & Metalworking": [
    "woodworking", "woodworking tools", "metal working", "metal-working tools",
    "metal and woodworking tools", "metal bandsaws", "blacksmith",
    "blacksmith forge", "blacksmith tools", "bronze foundry",
    "planer", "thickness planer", "router table", "routers"
  ],
  "Fabrication & Sewing": [
    "button maker", "button maker 2.25", "craft tools", "sewing machines", "sewing machine", 
    "embroidery machine", "embroidery", "cricut", "heat press", "vinyl cutter", 
    "vinyl", "serger", "welder", "welding equipment", "button makers", 
    "cricut maker", "cricut maker 3", "cricut autopress", "cricut easypress", "cricut hat press", 
    "cricut mug press", "craft tool", "fabric printing", "sublimation",
    "sublimation printer", "epson surecolor", "epson 24 surecolor f570",
    "epson 24 surecolor f570 dye-sublimation printer",
    "heat presses", "vacuum former", "vacuum formers", "poster-size laminator",
    "cricut machines", "cricut vinyl cutter heat press", "sewing and embroidery machines",
    "embroidery machines", "digital embroidery machine"
  ],
  "Computers & Software": [
    "apple imac", "microsoft workstations", "autodesk autocad", "adobe suite",
    "imac", "workstation", "autocad", "adobe", "photoshop",
    "illustrator", "premiere", "final cut", "indesign", "cura",
    "pc", "mac", "computer", "iphone", "ipad", "mac studio", "mac mini",
    "apple", "apple mac mini", "apple mac studio", "microsoft", "autodesk", "inventor",
    "cad software", "computer lab", "computer lab with printers",
    "computer gear", "dual widescreen", "dual widescreen workstation", "lcd screen", "lcd screens",
    "software", "desktop", "workstations", "microsoft office", "microsoft office workstations",
    "computers with adobe creative cloud", "iMacs", "iMacs with adobe creative cloud",
    "apple garageband", "apple iMac computer workstation",
    "logic pro x", "inventor pro", "autodesk inventor",
    "adobe creative cloud", "adobe creative suite",
    "website creation", "relevant software", "mobile software development equipment",
    "computers"
  ],
  "Photography & Media": [
    "cameras", "photography", "studio cameras", "editing tools", "final cut pro",
    "camera", "nikon", "nikon cameras", "nikon cameras d750 and d5500", "nikon d750", "nikon d5500",
    "sony", "sony film cameras", "sony film cameras pxw-x70 hxr-nx3 pxw-x180", "sony pxw-x70", "sony hxr-nx3", "sony pxw-x180",
    "canon", "video", "film", "lighting", "lights", "green screen", "backdrop",
    "photography studio", "darkroom", "dye-sublimation", "sublimation printer",
    "lytro", "lytro illum", "lytro illum light field digital camera",
    "led video", "led go", "led go lg", "led go lg-600s", "led go lg-600s led video lights",
    "chromakey", "photo", "video studio", "digital media", "digital media lab",
    "media lab", "digital video editing", "editing",
    "revolution lightboard", "lightboard", "slate media", "slate media raven",
    "dj", "serato dj",
    "photography and audio-visual", "photography & video studio",
    "photography studio with darkroom", "green screens", "chromakey backdrops",
    "sublimation printing", "sublimation printers", "digital media equipment",
    "multimedia tools"
  ],
  "Electronics & Robotics": [
    "arduino", "arduino uno", "microcontroller", "multimeter", "multimeters",
    "oscilloscope", "oscilloscopes", "pcb assembly",
    "soldering", "soldering iron", "electronics", "electronics tools",
    "raspberry pi", "robotics", "industrial robotic", "collaborative robotic",
    "pepper humanoid", "makey makey", "transformer", "power supply",
    "arduino components", "microcontrollers",
    "soldering & electronics tools", "soldering irons",
    "industrial and collaborative robotic arms", "pepper humanoid robot",
    "transformers", "power supplies"
  ],
  "Virtual Reality & Gaming": [
    "virtual reality", "vr", "vr headset", "video game", "gaming",
    "augmented reality", "pc vr", "vr equipment",
    "video games", "video game console", "video game console vr headset",
    "virtual reality equipment",
    "pc vr headsets", "augmented reality maintenance tool",
    "video games & virtual reality", "tabletop gaming", "tabletop", "board games",
    "board game", "dice", "gaming table", "game table"
  ],
  "Arts & Sculpture": [
    "ceramics", "ceramics studio", "ceramics studio with 10 potter's wheels", "kiln", "pottery", "sculpture", "casting", "carving",
    "painting", "drawing", "printmaking", "printmaker",
    "sculpture studio", "drawing and painting studios",
    "printmaking studio", "kiln room",
    "drawing and painting studios with skylights",
    "sculpture studio with casting carving and fabrication areas",
    "printmaking studio with lithography and etching presses"
  ],
  "Office & Output Equipment": [
    "printer", "plotters", "photocopier", "scanner",
    "printers", "photocopiers",
    "computer lab with printers", "computer lab with printers 3d printer and computers",
    "roland gs-24", "roland gs-24 vinyl cutter", "vinyl cutter printer", "vinyl printer cutter"
  ],

  "Prototyping & Manufacturing": [
    "prototyping", "prototyping equipment", "manufacturing",
    "manufacturing tools", "manufacturing services",
    "manufacturing execution system", "post-processing solutions",
    "fabrication equipment"
  ],
  "Safety & Infrastructure": [
    "safety", "security features", "energy management",
    "power distribution", "safety and security features",
    "energy management and power distribution system"
  ],
  "Specialty & Hobby Equipment": [
    "biology tools", "food tools", "awesome toys",
    "amateur radio tools", "amateur radio", "ham radio", "ham radio equipment", "radio equipment",
    "model building", "model kit", "rc cars", "rc car", "rc drone", "drones", "drone", "miniatures", "model kits", "rc", "radio controlled", "scale models",
    "hobby electronics", "electronics hobby", "hobby soldering", "hobby circuits",
    "craft supplies", "hobby crafts", "craft hobby", "craft materials", "hobby materials",
    "collectibles", "display space", "display spaces", "collectibles display", "collection display",
    "multi tool", "tool", "camera mount", "lcd screen"
  ],
  "Glass Work": [
    "glass work", "fused glass", "glass blowing", "stained glass", "glass etching"
  ]
};

// Create reverse mapping: tag -> group names (tags can belong to multiple groups)
const TAG_TO_GROUPS = {};
Object.entries(EQUIPMENT_GROUPS).forEach(([groupName, tags]) => {
  tags.forEach(tag => {
    const normalized = normalizeStr(tag);
    if (!TAG_TO_GROUPS[normalized]) {
      TAG_TO_GROUPS[normalized] = [];
    }
    TAG_TO_GROUPS[normalized].push(groupName);
  });
});

const getEquipmentGroups = (tag) => {
  return TAG_TO_GROUPS[normalizeStr(tag)] || [];
};

// Backwards compatibility - gets first group
const getEquipmentGroup = (tag) => {
  const groups = getEquipmentGroups(tag);
  return groups.length > 0 ? groups[0] : null;
};

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
  const flyToMakerspaceRef = useRef(null);
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
    groupCounts,
    categoriesMap
  } = useMemo(() => {
    const equipSet = new Set();
    const facilitySet = new Set();
    const accessSet = new Set();
    const audienceSet = new Set();
    const sustainabilitySet = new Set();
    const counts = {};
    const groupCountsMap = {};

    function accumulateFromProps(p) {
      // For equipment tags, track which groups we've seen to count unique makerspaces per group
      const groupsSeenInThisItem = new Set();
      
      (p.tags || []).forEach(t => {
        const tag = String(t).trim();
        if (!tag) return;
        const groups = getEquipmentGroups(tag);
        if (groups.length > 0) {
          // Tag belongs to one or more groups - add to each group
          groups.forEach(group => {
            equipSet.add(group);
            // Count each group once per makerspace/event
            if (!groupsSeenInThisItem.has(group)) {
              groupCountsMap[group] = (groupCountsMap[group] || 0) + 1;
              groupsSeenInThisItem.add(group);
            }
          });
        } else {
          // Ungrouped tag
          equipSet.add(tag);
          counts[tag] = (counts[tag] || 0) + 1;
        }
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
      groupCounts: groupCountsMap,
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
    
    let source = searchCategory === "All" ? allSearchableTags : (categoriesMap[searchCategory] || []);
    
    // For Equipment category, also include ungrouped tags that are in the data
    if (searchCategory === "All" || searchCategory === "Equipment") {
      const ungroupedTags = Object.keys(countsByTag).filter(tag => {
        const isGrouped = Object.values(EQUIPMENT_GROUPS).some(tags => 
          tags.some(t => normalizeStr(t) === normalizeStr(tag))
        );
        return !isGrouped;
      });
      source = [...source, ...ungroupedTags];
    }
    
    return source.filter(t => normalizeStr(t).includes(q)).slice(0, 10);
  }, [tagSearch, searchCategory, allSearchableTags, categoriesMap, countsByTag, EQUIPMENT_GROUPS]);

  const aggregateTagsForMakerspace = useCallback((p) => {
    const tags = [
      ...(p.tags || []),
      ...(p.category ? [p.category] : []),
      ...(p.skills ? [p.skills] : []),
      ...(deriveAgeBuckets(p)),
      ...(p.sustainable ? [SUSTAINABILITY_TAG] : [])
    ].map(t => String(t).trim()).filter(Boolean);
    
    const result = new Set();
    tags.forEach(t => {
      const groups = getEquipmentGroups(t);
      if (groups.length > 0) {
        // Add all groups this tag belongs to
        groups.forEach(g => result.add(g));
      } else {
        // Add ungrouped tag as-is
        result.add(t);
      }
    });
    return Array.from(result);
  }, []);

  const aggregateTagsForEvent = useCallback((ev) => {
    const tags = [
      ...(ev.tags || []),
      ...(ev.category ? [ev.category] : []),
      ...(ev.skills ? [ev.skills] : []),
      ...(deriveAgeBuckets(ev)),
      ...(ev.sustainable ? [SUSTAINABILITY_TAG] : [])
    ].map(t => String(t).trim()).filter(Boolean);
    
    const result = new Set();
    tags.forEach(t => {
      const groups = getEquipmentGroups(t);
      if (groups.length > 0) {
        groups.forEach(g => result.add(g));
      } else {
        result.add(t);
      }
    });
    return Array.from(result);
  }, []);

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

    const handleApiLoaded = () => {
      if (window.google?.maps?.places) {
        setGoogleMapsLoaded(true);
      }
    };
    
    window.addEventListener('googlemapsapi:loaded', handleApiLoaded);

    const checkInterval = setInterval(() => {
      if (window.google?.maps?.places) {
        setGoogleMapsLoaded(true);
        clearInterval(checkInterval);
      }
    }, 100);

    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_API_KEY}&libraries=places&loading=async`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setTimeout(() => {
          if (window.google?.maps?.places) {
            setGoogleMapsLoaded(true);
          }
        }, 100);
      };
      script.onerror = () => console.error("Failed to load Google Maps API");
      document.head.appendChild(script);
    }

    const timeout = setTimeout(() => {
      clearInterval(checkInterval);
    }, 15000);

    return () => {
      window.removeEventListener('googlemapsapi:loaded', handleApiLoaded);
      clearInterval(checkInterval);
      clearTimeout(timeout);
    };
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

  // Update ref whenever flyToMakerspace changes
  useEffect(() => {
    flyToMakerspaceRef.current = flyToMakerspace;
  }, [flyToMakerspace]);

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
          if (feature && flyToMakerspaceRef.current) {
            flyToMakerspaceRef.current(feature);
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
                <div className="flex items-center gap-2 p-3 border-b border-gray-200 min-w-0">
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
                    className="flex-1 min-w-0 text-xs px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
                  />
                  <select
                    value={searchCategory}
                    onChange={e => setSearchCategory(e.target.value)}
                    className="text-xs px-2 py-2 rounded-md border border-gray-300 bg-white flex-shrink-0 max-w-[120px]"
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
                        {s} {(s in groupCounts ? groupCounts[s] : countsByTag[s]) !== undefined && <span className="ml-1 opacity-60">({s in groupCounts ? groupCounts[s] : countsByTag[s]})</span>}
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
                                    {cat === "Equipment" ? (groupCounts[tag] || countsByTag[tag] || 0) : (countsByTag[tag] || 0)}
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
                        const agg = aggregateTagsForMakerspace(p);
                        // Show only the original tags that match selected filters, not the group names
                        const aggMatched = (p.tags || [])
                          .filter(t => {
                            const group = getEquipmentGroup(String(t).trim());
                            return selectedTags.has(group || t);
                          })
                          .map(t => String(t).trim())
                          .slice(0, 6);
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
