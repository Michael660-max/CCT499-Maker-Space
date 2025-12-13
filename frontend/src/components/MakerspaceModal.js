import React, { useState, useEffect } from "react";
import { GrLocation } from "react-icons/gr";
import { LuClock } from "react-icons/lu";
import { FaLink } from "react-icons/fa6";
import { HiOutlineMail } from "react-icons/hi";
import { MdOutlineLocalPhone } from "react-icons/md";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

const MakerspaceModal = ({ isOpen, onClose, makerspace, preloadedPhotoUrl = null, preloadedPhotos = {} }) => {
  const { user } = useAuth();
  const [showAllHours, setShowAllHours] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [loadingPhoto, setLoadingPhoto] = useState(true);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const showAiData = user?.user_metadata?.preferences?.show_ai_data ?? true;
  const makerspaceId =
    makerspace?.id ||
    makerspace?.properties?.id ||
    makerspace?.makerspace_id ||
    makerspace?.properties?.makerspace_id;
  const ms = makerspace?.properties || makerspace;

  const {
    name,
    address,
    category,
    accessmodels,
    phone,
    email,
    website,
    description,
    hours_of_operation,
    age,
    cost,
    equipment,
    ai,
    sustainability,
    difficulty_level,
    training_required,
  } = ms || {};

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    address || ""
  )}`;

  const days = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];
  const todayIdx = new Date().getDay();
  const todayName = days[(todayIdx + 6) % 7];

  const formatEquipment = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map(String);
    if (typeof raw === "string") {
      const cleaned = raw.replace(/[\u2018\u2019\u201c\u201d]/g, '"').replace(/\[|\]|"/g, "");
      return cleaned
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [];
  };

  const equipmentArray = formatEquipment(equipment);

  const getDomain = (url) => {
    try {
      const u = new URL(url.startsWith("http") ? url : `https://${url}`);
      return u.hostname.replace(/^www\./, "");
    } catch (e) {
      return url;
    }
  };

  const renderCostValue = (costVal) => {
    if (!costVal) return null;
    if (typeof costVal !== "string")
      return <div className="text-sm text-gray-600">{String(costVal)}</div>;

    const httpMatch = costVal.match(/https?:\/\/[^\s)]+/i);
    const wwwMatch = costVal.match(/\bwww\.[^\s)]+/i);
    const match = httpMatch || wwwMatch;
    if (!match)
      return <div className="text-sm text-gray-600">{costVal}</div>;

    const matchedText = match[0];
    const href = matchedText.startsWith("http")
      ? matchedText
      : `http://${matchedText}`;

    const parts = costVal.split(matchedText);
    return (
      <div className="text-sm text-gray-600">
        {parts[0]}
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-700 hover:underline"
        >
          {matchedText}
        </a>
        {parts[1]}
      </div>
    );
  };

  const parseEmails = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw))
      return raw.map(String).map((s) => s.trim()).filter(Boolean);
    if (typeof raw === "string") {
      return raw
        .split(/;|,/)
        .map((s) => s.trim().replace(/^mailto:/i, ""))
        .filter(Boolean);
    }
    return [];
  };

  const emails = parseEmails(email);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape" || e.key === "Esc") {
        if (typeof onClose === "function") onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const normalizeHours = (raw) => {
    if (!raw) return null;
    let obj = raw;
    if (typeof raw === "string") {
      try {
        obj = JSON.parse(raw);
      } catch (e) {
        return null;
      }
    }
    if (typeof obj !== "object" || obj === null) return null;

    const normalized = {};
    days.forEach((d) => {
      const v = Object.prototype.hasOwnProperty.call(obj, d) ? obj[d] : null;
      normalized[d] = v == null ? null : String(v).trim();
    });
    return normalized;
  };

  const normalizedHours = normalizeHours(hours_of_operation);

  useEffect(() => {
    if (googleMapsLoaded) return;
    
    // Check if already loaded
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

    const timeout = setTimeout(() => {
      clearInterval(checkInterval);
    }, 15000);

    return () => {
      window.removeEventListener('googlemapsapi:loaded', handleApiLoaded);
      clearInterval(checkInterval);
      clearTimeout(timeout);
    };
  }, [googleMapsLoaded]);

  useEffect(() => {
    if (!isOpen) {
      setPhotos([]);
      setCurrentPhotoIndex(0);
      setLoadingPhoto(true);
      return;
    }
    

    // Get custom photos from database (if any)
    const customPhotos = makerspace?.photos && Array.isArray(makerspace.photos) && makerspace.photos.length > 0
      ? makerspace.photos
          .filter(p => p.source === 'custom' && !p.skip_google_photos)
          .map(p => ({
            url: p.url,
            attribution: p.attribution || '',
            attributionUrl: p.attribution_url,
            source: 'custom'
          }))
      : [];

    const skipGooglePhotos = makerspace?.skip_google_photos === true || 
                             (makerspace?.photos && Array.isArray(makerspace.photos) && 
                              makerspace.photos.some(p => p.skip_google_photos === true));

    // Function to fetch Google Maps photos and merge with custom photos
    const fetchAndMergePhotos = async () => {
      let googlePhotos = [];

      if (skipGooglePhotos) {
        console.log(`Skipping Google Maps photos for ${name} (skip_google_photos flag set)`);
        if (customPhotos.length > 0) {
          setPhotos(customPhotos);
        } else {
          setPhotos([]);
        }
        setLoadingPhoto(false);
        return;
      }

      const preloadedPhoto = preloadedPhotoUrl || (address ? preloadedPhotos[address] : null);
      if (preloadedPhoto) {
        if (typeof preloadedPhoto === 'string') {
          googlePhotos = [{ url: preloadedPhoto, attribution: "© Google Maps", source: "google_maps" }];
        } else if (Array.isArray(preloadedPhoto)) {
          googlePhotos = preloadedPhoto.filter(p => p.source === 'google_maps' || !p.source);
        }
      }

      if (googlePhotos.length === 0 && address && googleMapsLoaded) {
        try {
          const query = name ? `${name}, ${address}` : address;
          const request = {
            textQuery: query,
            fields: ["id", "photos"],
          };

          const { places } = await window.google.maps.places.Place.searchByText(request);
          
          if (places && places.length > 0) {
            const place = places[0];
            await place.fetchFields({ fields: ["photos"] });
            
            if (place.photos && place.photos.length > 0) {
              const photoCount = Math.min(place.photos.length, 10);
              const photoPromises = [];
              
              for (let i = 0; i < photoCount; i++) {
                const photo = place.photos[i];
                const photoUrl = photo.getURI({ maxWidth: 1200, maxHeight: 900 });
                
                let attribution = "© Google Maps";
                try {
                  const attributions = photo.attributions;
                  if (attributions && attributions.length > 0) {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = attributions[0];
                    attribution = tempDiv.textContent || tempDiv.innerText || "© Google Maps";
                  }
                } catch (e) {
                  attribution = "© Google Maps";
                }
                
                photoPromises.push(
                  new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => {
                      resolve({
                        url: photoUrl,
                        attribution: attribution,
                        source: "google_maps"
                      });
                    };
                    img.onerror = () => resolve(null);
                    img.src = photoUrl;
                  })
                );
              }
              
              googlePhotos = (await Promise.all(photoPromises)).filter(Boolean);
            }
          }
        } catch (error) {
          console.warn("Failed to fetch Google Maps photos:", error);
        }
      }

      const allPhotos = [...customPhotos, ...googlePhotos];
      
      if (allPhotos.length > 0) {
        console.log(`Loaded ${customPhotos.length} custom + ${googlePhotos.length} Google Maps photos for ${name}`);
        setPhotos(allPhotos);
      } else {
        setPhotos([]);
      }
      setLoadingPhoto(false);
    };

    setLoadingPhoto(true);
    fetchAndMergePhotos();
  }, [isOpen, address, name, googleMapsLoaded, preloadedPhotoUrl, preloadedPhotos, makerspace]);

  useEffect(() => {
    if (!isOpen) return;

    if (!makerspaceId) {
      setEvents([]);
      setLoadingEvents(false);
      return;
    }

    // Supabase column is bigint, so try numeric match first
    const makerspaceIdNumber = Number.isFinite(Number(makerspaceId))
      ? Number(makerspaceId)
      : null;

    let isCancelled = false;

    const fetchEvents = async () => {
      setLoadingEvents(true);

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("makerspace_id", makerspaceIdNumber ?? makerspaceId)
        .order("start_time", { ascending: true });

      if (error) {
        console.error("Error fetching events:", error, {
          makerspaceId,
          makerspaceIdNumber,
        });
        if (!isCancelled) setLoadingEvents(false);
        return;
      }

      if (!isCancelled) {
        setEvents(data || []);
        if (process.env.NODE_ENV === "development") {
          console.log("Events fetched", {
            makerspaceId,
            makerspaceIdNumber,
            count: data?.length,
            sample: data?.slice(0, 2),
          });
        }
        setLoadingEvents(false);
      }
    };

    fetchEvents();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, makerspaceId]);


  const renderHours = () => {
    if (!normalizedHours) return null;
    const validDays = days.filter(
      (d) => normalizedHours[d] && normalizedHours[d] !== "closed"
    );
    if (validDays.length === 0) return null;

    const todayHours = normalizedHours[todayName];

    return (
      <div className="mt-4">
        <div className="mt-2 flex items-center justify-between">
          <div className="flex gap-2 items-center">
            <LuClock />
            <div className="text-md text-gray-900 capitalize font-medium">
              {todayName}
            </div>
          </div>
          <div className="text-md text-gray-900 font-medium">
            {todayHours && todayHours !== "closed"
              ? todayHours
              : "Closed"}
          </div>
        </div>

        <div>
          <button
            onClick={() => setShowAllHours((v) => !v)}
            className="text-sm text-blue-700 hover:underline focus:outline-none"
          >
            {showAllHours ? "Hide Full Hours" : "View Full Hours"}
          </button>
        </div>

        {showAllHours && (
          <div className="mt-3 border-t border-gray-100 pt-3 space-y-1">
            {days.map((d) => (
              <div
                key={d}
                className="flex font-medium items-center justify-between text-sm text-gray-700"
              >
                <div className="capitalize">{d}</div>
                <div className="font-medium text-gray-900">
                  {normalizedHours[d] && normalizedHours[d] !== "closed"
                    ? normalizedHours[d]
                    : "Closed"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderEquipment = () => {
    if (!equipmentArray?.length) return null;
    return (
      <div className="mt-4 pb-2 border-t border-gray-100 pt-4">
        <div className="text-base font-semibold text-gray-900 mb-2">
          Equipment
        </div>
        <div className="flex flex-wrap gap-2 place-content-center">
          {equipmentArray.map((it, i) => (
            <span
              key={i}
              className="text-sm text-gray-800 bg-gray-100 border border-gray-200 px-3 py-1 rounded"
            >
              {it}
            </span>
          ))}
        </div>
      </div>
    );
  };

  if (!isOpen || !makerspace) return null;
  const now = new Date();
  const upcomingEvents = events.filter((event) => {
    if (!event.start_time) return false;
    const start = new Date(event.start_time);
    if (Number.isNaN(start.getTime())) return false;
    return start >= now;
  });
  const pastEvents = events.filter((event) => {
    if (!event.start_time) return false;
    const start = new Date(event.start_time);
    if (Number.isNaN(start.getTime())) return false;
    return start < now;
  });
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl border border-gray-100">

        {/* TOP BAR */}
        <div className="sticky top-0 bg-white pt-5 pb-2 px-5">
          <div className="flex items-start justify-center">
            <div className="w-10 flex-shrink-0" />

            <div className="flex-1 text-center px-4">
              <h2 className="text-2xl font-semibold text-gray-900 mx-auto break-words">
                {name}
              </h2>
            </div>

            <div className="w-10 flex-shrink-0 flex items-start justify-end">
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-[#FF6B6B]"
                aria-label="Close dialog"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* PHOTOS CAROUSEL */}
        {!loadingPhoto && photos.length > 0 && (
          <div className="relative w-full">
            <div className="relative w-full h-56 overflow-hidden">
              {photos.map((photo, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 transition-opacity duration-300 ${
                    index === currentPhotoIndex ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <img
                    src={photo.url}
                    alt={`${name} ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              ))}
            </div>
            
            {photos[currentPhotoIndex]?.attribution && (
              <div className="text-xs text-gray-700 font-medium px-3 py-1.5 text-left border-t border-gray-100">
                {photos[currentPhotoIndex].attributionUrl ? (
                  <a
                    href={photos[currentPhotoIndex].attributionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline text-gray-800"
                  >
                    {photos[currentPhotoIndex].attribution}
                  </a>
                ) : (
                  <span>{photos[currentPhotoIndex].attribution}</span>
                )}
              </div>
            )}

            {photos.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentPhotoIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1))}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-70 hover:bg-opacity-90 text-white rounded-full p-2.5 transition-all z-10 shadow-lg"
                  aria-label="Previous photo"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => setCurrentPhotoIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-70 hover:bg-opacity-90 text-white rounded-full p-2.5 transition-all z-10 shadow-lg"
                  aria-label="Next photo"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
          </div>
        )}

        {/* CATEGORY */}
        <div>
          {category && (
            <div className="mb-2 ml-2 inline-block text-xs text-white bg-[#FF6B6B] px-2 py-1 rounded uppercase tracking-wide">
              {category}
            </div>
          )}
        </div>

        {/* AI + SUSTAINABILITY TAGS */}
        {showAiData && (
          <div className="items-center">
            {(ai || sustainability) && (
              <div className="pb-2 flex gap-2 place-content-center">
                {ai && (
                  <span className="text-xs font-medium text-purple-800 bg-purple-100 px-2 py-1 rounded">
                    May use AI
                  </span>
                )}
                {sustainability && (
                  <span className="text-xs font-medium text-green-800 bg-green-100 px-2 py-1 rounded">
                    Sustainable focus
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* CONTENT */}
        <div className="pb-6 px-6 space-y-4">
          {showAiData && description && (
            <p className="text-gray-700 text-sm leading-relaxed">
              {description}
            </p>
          )}

          {address && (
            <div className="text-left">
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="items-center gap-2 flex text-gray-800 border-t pt-4 border-gray-100"
              >
                <GrLocation className="text-lg -ml-0.5" />
                <span className="text-base font-medium hover:text-blue-700 hover:underline">
                  {address}
                </span>
              </a>
            </div>
          )}

          {showAiData && renderHours()}

          {(accessmodels || (showAiData && difficulty_level)) && (
            <div
              className={`grid ${
                accessmodels && showAiData && difficulty_level
                  ? "grid-cols-1 sm:grid-cols-2"
                  : "grid-cols-1"
              } gap-4 pt-4 border-t border-gray-100`}
            >
              {accessmodels && (
                <div>
                  <div className="text-md font-medium text-gray-800">
                    Access
                  </div>
                  <div className="text-sm text-gray-600">
                    {accessmodels}
                  </div>
                </div>
              )}

              {showAiData && difficulty_level && (
                <div>
                  <div className="text-md font-medium text-gray-800">
                    Difficulty
                  </div>
                  <div className="text-sm text-gray-600 capitalize">
                    {difficulty_level}
                  </div>
                </div>
              )}
            </div>
          )}

          {showAiData && renderEquipment()}

          {(website ||
            email ||
            phone ||
            (showAiData && (age || cost || training_required))) && (
            <div className="pt-4 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-4">
                {(website || email || phone) && (
                  <div>
                    <div className="text-left text-md font-medium text-gray-800 mb-2">
                      Contact
                    </div>
                    <div className="space-y-1">
                      {website && (
                        <div className="flex gap-2 items-center">
                          <FaLink />
                          <a
                            href={website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-gray-600 hover:text-blue-700 hover:underline block truncate max-w-full"
                          >
                            {getDomain(website)}
                          </a>
                        </div>
                      )}

                      {emails?.map((em, idx) => (
                        <div
                          className="flex gap-2 items-center"
                          key={`email-${idx}`}
                        >
                          <HiOutlineMail />
                          <a
                            className="text-sm text-gray-600 hover:text-blue-700 hover:underline block"
                            href={`mailto:${em}`}
                          >
                            {em}
                          </a>
                        </div>
                      ))}

                      {phone && (
                        <div className="flex gap-2 items-center">
                          <MdOutlineLocalPhone className="text-md" />
                          <a
                            className="text-sm text-gray-600 hover:text-blue-700 hover:underline block"
                            href={`tel:${phone}`}
                          >
                            {phone}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {showAiData && (age || cost || training_required) && (
                  <div className="text-left space-y-4">
                    {age && (
                      <div>
                        <div className="text-md font-medium text-gray-800">
                          Age/Experience
                        </div>
                        <div className="text-sm text-gray-600">{age}</div>
                      </div>
                    )}
                    {cost && (
                      <div>
                        <div className="text-md font-medium text-gray-800">
                          Cost
                        </div>
                        {renderCostValue(cost)}
                      </div>
                    )}
                    {training_required && (
                      <div>
                        <div className="text-md font-medium text-gray-800">
                          Training
                        </div>
                        <div className="text-sm text-gray-600">
                          {training_required}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          {/* EVENTS SECTION */}
          <div className="px-6 pb-8 mt-6 border-t border-gray-200 pt-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Events</h3>

            {loadingEvents && (
              <p className="text-gray-600 text-sm">Loading events...</p>
            )}

            {!loadingEvents && events.length === 0 && (
              <p className="text-gray-600 text-sm">
                No events found for this makerspace.
              </p>
            )}

            {!loadingEvents && events.length > 0 && (
              <>
                {/* UPCOMING EVENTS */}
                <h4 className="text-lg font-semibold mt-4 mb-2">
                  Upcoming Events
                </h4>
                {upcomingEvents.length === 0 && (
                  <p className="text-gray-600">No upcoming events.</p>
                )}

                <div className="space-y-4">
                  {upcomingEvents.map((event) => (
                    <div
                      key={event.id}
                      className="p-4 bg-gray-100 border border-gray-300 rounded-xl"
                    >
                      <h5 className="font-semibold text-gray-900">
                        {event.title || "Untitled event"}
                      </h5>
                      <p className="text-gray-700 text-sm">
                        {formatEventDateRange(event.start_time, event.end_time)}
                      </p>
                      {event.location_text && (
                        <p className="text-gray-600 text-xs mt-1">
                          Location: {event.location_text}
                        </p>
                      )}
                      {event.difficulty_level && (
                        <p className="text-gray-600 text-sm mt-1">
                          Difficulty:{" "}
                          <strong className="font-semibold">
                            {event.difficulty_level}
                          </strong>
                        </p>
                      )}
                      <button
                        onClick={() => setSelectedEvent(event)}
                        className="mt-3 inline-flex px-3 py-1.5 rounded-lg text-sm font-medium bg-primary-500 text-white"
                        type="button"
                      >
                        View Details
                      </button>
                    </div>
                  ))}
                </div>

                {/* PAST EVENTS */}
                <h4 className="text-lg font-semibold mt-6 mb-2">Past Events</h4>
                {pastEvents.length === 0 && (
                  <p className="text-gray-600">No past events.</p>
                )}

                <div className="space-y-4">
                  {pastEvents.map((event) => (
                    <div
                      key={event.id}
                      className="p-4 bg-gray-50 border border-gray-200 rounded-xl opacity-75"
                    >
                      <h5 className="font-semibold text-gray-900">
                        {event.title || "Untitled event"}
                      </h5>
                      <p className="text-gray-700 text-sm">
                        {formatEventDateRange(event.start_time, event.end_time)}
                      </p>
                      {event.location_text && (
                        <p className="text-gray-600 text-xs mt-1">
                          Location: {event.location_text}
                        </p>
                      )}
                      {event.difficulty_level && (
                        <p className="text-gray-600 text-sm mt-1">
                          Difficulty:{" "}
                          <strong className="font-semibold">
                            {event.difficulty_level}
                          </strong>
                        </p>
                      )}
                      <button
                        onClick={() => setSelectedEvent(event)}
                        className="mt-3 inline-flex px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-300 text-gray-800"
                        type="button"
                      >
                        View Details
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* EVENT DETAILS POPUP */}
          {selectedEvent && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4">
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

                <h4 className="text-xl font-semibold text-gray-900 mb-3">
                  {selectedEvent.title || "Event details"}
                </h4>
                <div className="space-y-2 text-sm text-gray-700">
                  <div><span className="font-medium text-gray-800">When: </span>{formatEventDateRange(selectedEvent.start_time, selectedEvent.end_time)}</div>
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
                      {selectedEvent.age_category ||
                        `${selectedEvent.age_min ?? 0} - ${selectedEvent.age_max ?? "∞"} years`}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex gap-3">
                  {selectedEvent.rsvp_link && (
                    <a
                      href={selectedEvent.rsvp_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex px-4 py-2 rounded-lg text-sm font-medium bg-primary-500 text-white"
                    >
                      Open RSVP
                    </a>
                  )}
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

        </div>
      </div>
    </div>
  );
};

export default MakerspaceModal;
