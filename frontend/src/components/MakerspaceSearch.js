import React, { useState, useEffect, useCallback, useRef } from 'react';

const MakerspaceSearch = ({ onFilter, onSuggestionSelect, makerspaces = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredMakerspaces, setFilteredMakerspaces] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const containerRef = useRef(null);

  // Filter makerspaces based on search criteria
  const filterMakerspaces = useCallback(() => {
    let filtered = makerspaces;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(ms => {
        const props = ms.properties;
        return (
          props.name?.toLowerCase().includes(term) ||
          props.address?.toLowerCase().includes(term) ||
          props.category?.toLowerCase().includes(term) ||
          props.skills?.toLowerCase().includes(term) ||
          props.notes?.toLowerCase().includes(term)
        );
      });
    }

    setFilteredMakerspaces(filtered);
    onFilter && onFilter(filtered);
  }, [searchTerm, makerspaces, onFilter]);

  // Update suggestions based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filteredSuggestions = makerspaces
      .filter(ms => {
        const props = ms.properties;
        return (
          props.name?.toLowerCase().includes(term) ||
          props.address?.toLowerCase().includes(term) ||
          props.category?.toLowerCase().includes(term)
        );
      })
      .slice(0, 5); // Limit to 5 suggestions

    setSuggestions(filteredSuggestions);
    setShowSuggestions(filteredSuggestions.length > 0);
  }, [searchTerm, makerspaces]);

  useEffect(() => {
    filterMakerspaces();
  }, [filterMakerspaces]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const clearSearch = () => {
    setSearchTerm('');
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleSuggestionClick = (makerspace) => {
    setSearchTerm(makerspace.properties.name);
    setShowSuggestions(false); // This is the key fix - hide suggestions immediately
    onSuggestionSelect && onSuggestionSelect(makerspace);
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    setShowSuggestions(true);
  };

  const handleInputFocus = () => {
    if (searchTerm && suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div ref={containerRef} className="fixed top-5 left-1/2 transform -translate-x-1/2 z-50 w-96 max-w-[90vw]">
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search makerspaces..."
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleInputKeyDown}
          className="w-full pl-12 pr-12 py-4 bg-white/95 backdrop-blur-md border border-gray-200 rounded-2xl shadow-xl focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all duration-200 text-gray-800 placeholder-gray-500"
        />
        
        {/* Search Icon */}
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Clear Button */}
        {searchTerm && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-md border border-gray-200 rounded-2xl shadow-xl overflow-hidden z-50">
            <div className="py-2">
              {suggestions.map((makerspace, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(makerspace)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors duration-150 border-b border-gray-100 last:border-b-0"
                >
                  <div className="font-medium text-gray-800 text-sm">
                    {makerspace.properties.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {makerspace.properties.category} • {makerspace.properties.address}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results Counter */}
      {searchTerm && (
        <div className="mt-2 text-center">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/90 backdrop-blur-md text-gray-700 shadow-md">
            {filteredMakerspaces.length} of {makerspaces.length} results
          </span>
        </div>
      )}
    </div>
  );
};

export default MakerspaceSearch;