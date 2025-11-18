import React, { useState, useEffect } from "react";
import { GrLocation } from "react-icons/gr";
import { LuClock } from "react-icons/lu";
import { FaLink } from "react-icons/fa6";
import { HiOutlineMail } from "react-icons/hi";
import { MdOutlineLocalPhone } from "react-icons/md";
import { useAuth } from "../context/AuthContext";

const MakerspaceModal = ({ isOpen, onClose, makerspace, preloadedPhotoUrl = null }) => {
  const { user } = useAuth();
  const [showAllHours, setShowAllHours] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [loadingPhoto, setLoadingPhoto] = useState(true);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);

  const showAiData = user?.user_metadata?.preferences?.show_ai_data ?? true;

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
  } = makerspace || {};

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

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      existingScript.onload = () => setGoogleMapsLoaded(true);
      if (window.google?.maps?.places) {
        setGoogleMapsLoaded(true);
      }
      return;
    }
  }, [googleMapsLoaded]);

  useEffect(() => {
    if (!isOpen) {
      setPhotoUrl(null);
      setLoadingPhoto(true);
      return;
    }

    if (preloadedPhotoUrl) {
      setPhotoUrl(preloadedPhotoUrl);
      setLoadingPhoto(false);
      return;
    }

    if (!address || !googleMapsLoaded) {
      setLoadingPhoto(false);
      return;
    }

    setLoadingPhoto(true);
    
    // Use new Place API - search by text
    const fetchPhoto = async () => {
      try {
        const query = name ? `${name}, ${address}` : address;
        const request = {
          textQuery: query,
          fields: ["id", "photos"],
        };

        const { places } = await window.google.maps.places.Place.searchByText(request);
        
        if (places && places.length > 0) {
          const place = places[0];
          
          // Fetch place details with photos
          await place.fetchFields({ fields: ["photos"] });
          
          if (place.photos && place.photos.length > 0) {
            const photoUrl = place.photos[0].getURI({ maxWidth: 1200, maxHeight: 900 });
            const img = new Image();
            img.onload = () => {
              setPhotoUrl(photoUrl);
              setLoadingPhoto(false);
            };
            img.onerror = () => {
              setPhotoUrl(null);
              setLoadingPhoto(false);
            };
            img.src = photoUrl;
            return;
          }
        }
        
        setPhotoUrl(null);
        setLoadingPhoto(false);
      } catch (error) {
        console.warn("Failed to fetch photo:", error);
        setPhotoUrl(null);
        setLoadingPhoto(false);
      }
    };
    
    fetchPhoto();
  }, [isOpen, address, name, googleMapsLoaded, preloadedPhotoUrl]);



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

        {/* PHOTO */}
        {!loadingPhoto && photoUrl && (
          <img
            src={photoUrl}
            alt={name}
            className="w-full h-56 object-cover pb-3"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
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
        </div>
      </div>
    </div>
  );
};

export default MakerspaceModal;
