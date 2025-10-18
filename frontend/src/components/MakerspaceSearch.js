import React, { useState, useEffect, useCallback } from 'react';

const MakerspaceSearch = ({ onFilter, makerspaces = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredMakerspaces, setFilteredMakerspaces] = useState([]);

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

  useEffect(() => {
    filterMakerspaces();
  }, [filterMakerspaces]);

  const clearSearch = () => {
    setSearchTerm('');
  };

  return (
    <div className="fixed top-5 left-1/2 transform -translate-x-1/2 z-50 w-96 max-w-[90vw]">
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search makerspaces..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
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

//   return (
//     <div className={`fixed top-5 left-5 z-50 transition-all duration-300 ease-in-out ${
//       isExpanded ? 'w-80' : 'w-12'
//     }`}>
//       {/* Toggle Button */}
//       <button 
//         className={`w-12 h-12 bg-gradient-to-r from-primary-400 to-primary-500 hover:from-primary-500 hover:to-primary-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center text-lg font-semibold ${
//           isExpanded ? 'rounded-b-none' : ''
//         }`}
//         onClick={() => setIsExpanded(!isExpanded)}
//         aria-label={isExpanded ? 'Hide search' : 'Show search'}
//       >
//         {isExpanded ? '✕' : '🔍'}
//       </button>

//       {/* Search Panel */}
//       {isExpanded && (
//         <div className="bg-white/95 backdrop-blur-md rounded-xl rounded-tl-none shadow-2xl border border-gray-100 max-h-[calc(100vh-6rem)] overflow-hidden animate-fade-in">
//           <div className="p-5">
//             {/* Header */}
//             <div className="mb-5 pb-4 border-b border-gray-100">
//               <h3 className="text-lg font-bold text-gray-800 mb-2">Search Makerspaces</h3>
//               <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-700">
//                 {filteredMakerspaces.length} of {makerspaces.length} results
//               </span>
//             </div>

//             {/* Search Input */}
//             <div className="mb-4">
//               <div className="relative">
//                 <input
//                   type="text"
//                   placeholder="Search by name, address, skills..."
//                   value={searchTerm}
//                   onChange={(e) => setSearchTerm(e.target.value)}
//                   className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all duration-200 bg-white/70"
//                 />
//                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
//                   <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
//                   </svg>
//                 </div>
//               </div>
//             </div>

//             {/* Filter Controls */}
//             <div className="space-y-3 mb-4">
//               <div>
//                 <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">
//                   Category
//                 </label>
//                 <select
//                   value={selectedCategory}
//                   onChange={(e) => setSelectedCategory(e.target.value)}
//                   className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all duration-200 bg-white/70 text-sm"
//                 >
//                   <option value="">All Categories</option>
//                   {categories.map(category => (
//                     <option key={category} value={category}>
//                       {category}
//                     </option>
//                   ))}
//                 </select>
//               </div>

//               <div>
//                 <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">
//                   Access Model
//                 </label>
//                 <select
//                   value={selectedAccess}
//                   onChange={(e) => setSelectedAccess(e.target.value)}
//                   className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all duration-200 bg-white/70 text-sm"
//                 >
//                   <option value="">All Access Types</option>
//                   {accessModels.map(access => (
//                     <option key={access} value={access}>
//                       {access}
//                     </option>
//                   ))}
//                 </select>
//               </div>
//             </div>

//             {/* Clear Filters Button */}
//             {(searchTerm || selectedCategory || selectedAccess) && (
//               <button 
//                 onClick={clearFilters} 
//                 className="w-full mb-4 px-4 py-2 text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors duration-200 border border-gray-200"
//               >
//                 Clear All Filters
//               </button>
//             )}
//           </div>

//           {/* Results List */}
//           <div className="max-h-80 overflow-y-auto border-t border-gray-100">
//             {filteredMakerspaces.map((makerspace, index) => {
//               const props = makerspace.properties;
//               return (
//                 <div
//                   key={`${props.name}-${index}`}
//                   className="p-4 hover:bg-primary-50 cursor-pointer transition-all duration-200 border-b border-gray-50 last:border-b-0 group"
//                   onClick={() => handleMakerspaceClick(makerspace)}
//                 >
//                   <div className="flex justify-between items-start mb-2">
//                     <h4 className="font-semibold text-gray-800 text-sm group-hover:text-primary-600 transition-colors duration-200 line-clamp-1">
//                       {props.name}
//                     </h4>
//                     {props.category && (
//                       <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700 whitespace-nowrap">
//                         {props.category}
//                       </span>
//                     )}
//                   </div>
                  
//                   <p className="text-xs text-gray-600 mb-2 line-clamp-2">
//                     📍 {props.address}
//                   </p>
                  
//                   {props.skills && (
//                     <p className="text-xs text-gray-500 mb-1 line-clamp-1">
//                       🛠️ {props.skills}
//                     </p>
//                   )}
                  
//                   {props.accessModels && (
//                     <p className="text-xs text-gray-500 line-clamp-1">
//                       🔑 {props.accessModels}
//                     </p>
//                   )}
//                 </div>
//               );
//             })}
            
//             {filteredMakerspaces.length === 0 && (
//               <div className="p-8 text-center">
//                 <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
//                   <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47.58-6.344 1.621A.75.75 0 014.75 16H3a2 2 0 01-2-2V6a2 2 0 012-2h18a2 2 0 012 2v8a2 2 0 01-2 2h-1.75a.75.75 0 00-.906.644zM3.75 12H12" />
//                   </svg>
//                 </div>
//                 <p className="text-gray-500 text-sm mb-3">No makerspaces found</p>
//                 <button 
//                   onClick={clearFilters} 
//                   className="px-4 py-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
//                 >
//                   Clear Filters
//                 </button>
//               </div>
//             )}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default MakerspaceSearch;