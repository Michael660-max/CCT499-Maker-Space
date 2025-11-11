import React, { useEffect, useMemo, useState } from "react";

const TECHNOLOGY_KEYWORDS = {
  "3D Printing": [],
  "Laser Cutting": [],
  "CNC / Router": [],
  "Vinyl Cutter": [],
  "Electronics / Soldering": [],
  "Woodworking": [],
  "Metalworking / Welding": [],
  "Textiles / Sewing": [],
  "Ceramics / Pottery": [],
  "Robotics / Embedded": [],
};

const EVENT_TYPES = {
  "Drop-In": [],
  "Open House": [],
  "Kids (Under 13)": [],
  "Youth (13-17)": [],
  "Adults (18+)": [],
  "Recurring Events": [],
  "Workshops": [],
  "Community Events": [],
};

export default function MakerspaceFilters({ makerspaces = [], events = [], onFilter, onEventFilter }) {
  const { options, counts } = useMemo(() => {
    const count = {};
    for (const f of makerspaces) {
      const cats = Array.isArray(f?.properties?.techCategories) ? f.properties.techCategories : [];
      cats.forEach(c => count[c] = (count[c] || 0) + 1);
    }
    const fixed = Object.keys(TECHNOLOGY_KEYWORDS);
    const opts = fixed.filter(c => (count[c] || 0) > 0);
    return { options: opts, counts: count };
  }, [makerspaces]);

  const { eventOptions, eventCounts } = useMemo(() => {
    const count = {};
    for (const e of events) {
      const type = e?.properties?.eventType;
      if (type) count[type] = (count[type] || 0) + 1;
    }
    const fixed = Object.keys(EVENT_TYPES);
    const opts = fixed.filter(c => (count[c] || 0) > 0);
    return { eventOptions: opts, eventCounts: count };
  }, [events]);

  const [selectedEquipment, setSelectedEquipment] = useState(new Set());
  const [selectedEvents, setSelectedEvents] = useState(new Set());
  const [expandedEquipment, setExpandedEquipment] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState(false);

  useEffect(() => {
    if (!onFilter) return;
    if (selectedEquipment.size === 0) {
      onFilter([]);
      return;
    }
    const sel = new Set(selectedEquipment);
    const filtered = makerspaces.filter(f => {
      const cats = Array.isArray(f?.properties?.techCategories) ? f.properties.techCategories : [];
      return cats.some(c => sel.has(c));
    });
    onFilter(filtered);
  }, [selectedEquipment, makerspaces, onFilter]);

  useEffect(() => {
    if (!onEventFilter) return;
    if (selectedEvents.size === 0) {
      onEventFilter([]);
      return;
    }
    const sel = new Set(selectedEvents);
    const filtered = events.filter(e => {
      const type = e?.properties?.eventType;
      return type && sel.has(type);
    });
    onEventFilter(filtered);
  }, [selectedEvents, events, onEventFilter]);

  const toggleEquipment = (label) => {
    setSelectedEquipment(prev => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  const toggleEvent = (label) => {
    setSelectedEvents(prev => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  const clearAll = () => {
    setSelectedEquipment(new Set());
    setSelectedEvents(new Set());
    onFilter && onFilter([]);
    onEventFilter && onEventFilter([]);
  };

  const IconChevron = ({ expanded }) => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
      <path d="M4 6L8 10L12 6" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  return (
    <div style={{
      position: "fixed", top: 16, left: 16, zIndex: 999,
      width: 280, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      maxHeight: "calc(100vh - 32px)", overflowY: "auto",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      borderRadius: 12, boxShadow: "0 15px 40px rgba(0,0,0,0.25)",
      padding: 3
    }}>
      <div style={{ background: "#fff", borderRadius: 10, padding: 14 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1f2937", letterSpacing: "-0.3px" }}>Filters</div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}>
              {selectedEquipment.size + selectedEvents.size} active
            </div>
          </div>
          <button
            onClick={clearAll}
            style={{
              fontSize: 11, fontWeight: 600, color: "#667eea",
              background: "#f3f4f6", border: "none",
              padding: "6px 12px", borderRadius: 6, cursor: "pointer",
              transition: "all 0.2s"
            }}
            onMouseEnter={e => e.target.style.background = "#e5e7eb"}
            onMouseLeave={e => e.target.style.background = "#f3f4f6"}
          >
            Clear All
          </button>
        </div>

        {/* Equipment Section */}
        <div style={{
          background: "#f9fafb",
          borderRadius: 10,
          marginBottom: 10,
          border: "1px solid #e5e7eb"
        }}>
          <div
            onClick={() => setExpandedEquipment(!expandedEquipment)}
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 12px", cursor: "pointer",
              borderBottom: expandedEquipment ? "1px solid #e5e7eb" : "none"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>🛠️</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Equipment</div>
                <div style={{ fontSize: 10, color: "#6b7280" }}>
                  {selectedEquipment.size > 0 ? `${selectedEquipment.size} selected` : "Select types"}
                </div>
              </div>
            </div>
            <IconChevron expanded={expandedEquipment} />
          </div>

          {expandedEquipment && (
            <div style={{ padding: "10px 12px", maxHeight: 240, overflowY: "auto" }}>
              {options.length === 0 && (
                <div style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", padding: "16px 0" }}>
                  Loading...
                </div>
              )}
              {options.map(opt => (
                <label
                  key={opt}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "8px 10px", marginBottom: 5,
                    background: selectedEquipment.has(opt) ? "#eef2ff" : "#fff",
                    border: selectedEquipment.has(opt) ? "1.5px solid #667eea" : "1.5px solid #e5e7eb",
                    borderRadius: 8, cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={e => {
                    if (!selectedEquipment.has(opt)) e.target.style.borderColor = "#d1d5db";
                  }}
                  onMouseLeave={e => {
                    if (!selectedEquipment.has(opt)) e.target.style.borderColor = "#e5e7eb";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={selectedEquipment.has(opt)}
                      onChange={() => toggleEquipment(opt)}
                      style={{
                        width: 15, height: 15, cursor: "pointer",
                        accentColor: "#667eea"
                      }}
                    />
                    <span style={{ fontSize: 12, fontWeight: 500, color: "#374151" }}>{opt}</span>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 600,
                    color: "#fff", background: "#667eea",
                    padding: "2px 6px", borderRadius: 5
                  }}>
                    {counts[opt] || 0}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Events Section */}
        <div style={{
          background: "#fef3c7",
          borderRadius: 10,
          border: "1px solid #fbbf24"
        }}>
          <div
            onClick={() => setExpandedEvents(!expandedEvents)}
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 12px", cursor: "pointer",
              borderBottom: expandedEvents ? "1px solid #fbbf24" : "none"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>📅</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#78350f" }}>Events</div>
                <div style={{ fontSize: 10, color: "#92400e" }}>
                  {selectedEvents.size > 0 ? `${selectedEvents.size} selected` : `${events.length} available`}
                </div>
              </div>
            </div>
            <IconChevron expanded={expandedEvents} />
          </div>

          {expandedEvents && (
            <div style={{ padding: "10px 12px", maxHeight: 240, overflowY: "auto" }}>
              {eventOptions.length === 0 && (
                <div style={{ fontSize: 11, color: "#92400e", textAlign: "center", padding: "16px 0" }}>
                  No events available
                </div>
              )}
              {eventOptions.map(opt => (
                <label
                  key={opt}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "8px 10px", marginBottom: 5,
                    background: selectedEvents.has(opt) ? "#fef3c7" : "#fffbeb",
                    border: selectedEvents.has(opt) ? "1.5px solid #f59e0b" : "1.5px solid #fbbf24",
                    borderRadius: 8, cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={e => {
                    if (!selectedEvents.has(opt)) e.target.style.borderColor = "#f59e0b";
                  }}
                  onMouseLeave={e => {
                    if (!selectedEvents.has(opt)) e.target.style.borderColor = "#fbbf24";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={selectedEvents.has(opt)}
                      onChange={() => toggleEvent(opt)}
                      style={{
                        width: 15, height: 15, cursor: "pointer",
                        accentColor: "#f59e0b"
                      }}
                    />
                    <span style={{ fontSize: 12, fontWeight: 500, color: "#78350f" }}>{opt}</span>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 600,
                    color: "#78350f", background: "#fbbf24",
                    padding: "2px 6px", borderRadius: 5
                  }}>
                    {eventCounts[opt] || 0}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}