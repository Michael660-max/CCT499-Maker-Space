// MakerspaceForms.js
import React, { useState, useRef, useEffect } from 'react';


const MakerspaceForms = () => {
 const [isMenuOpen, setIsMenuOpen] = useState(false);
 const [activeForm, setActiveForm] = useState(null);
 const [makerspaceForm, setMakerspaceForm] = useState({
   location: '',
   hours: {
     monday: '',
     tuesday: '',
     wednesday: '',
     thursday: '',
     friday: '',
     saturday: '',
     sunday: ''
   },
   website: '',
   equipment: []
 });
 const [eventForm, setEventForm] = useState({
   name: '',
   location: '',
   hours: '',
   description: '',
   difficulty: '',
   idealAges: [0, 100],
   rsvpLink: ''
 });
 const [currentEquipment, setCurrentEquipment] = useState('');
 const [locationSuggestions, setLocationSuggestions] = useState([]);
 const [isGeocoding, setIsGeocoding] = useState(false);


 const equipmentSuggestions = [
   '3D Printer', 'Laser Cutter', 'CNC Machine', 'Vinyl Cutter',
   'Soldering Station', 'Oscilloscope', 'Sewing Machine', 'Woodworking Tools',
   'Metalworking Tools', 'Electronics Lab', 'VR Equipment', 'Arduino',
   'Raspberry Pi', '3D Scanner', 'Embroidery Machine'
 ];


 // Geocoding function for location autocomplete - Focused on Ontario, Canada
 const geocodeLocation = async (query) => {
   if (!query || query.length < 3) {
     setLocationSuggestions([]);
     return;
   }


   setIsGeocoding(true);
   try {
     // Focus on Ontario, Canada with bounding box around Greater Toronto Area
     const bbox = '-79.8,43.5,-79.0,44.0'; // GTA bounding box
     const response = await fetch(
       `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
       `access_token=${process.env.REACT_APP_MAPBOX_ACCESS_TOKEN}&bbox=${bbox}&country=ca&types=address,place,poi,region&limit=5`
     );
     const data = await response.json();
     setLocationSuggestions(data.features || []);
   } catch (error) {
     console.error('Geocoding error:', error);
     setLocationSuggestions([]);
   }
   setIsGeocoding(false);
 };


 // Handle makerspace form changes
 const handleMakerspaceChange = (field, value) => {
   setMakerspaceForm(prev => ({
     ...prev,
     [field]: value
   }));
 };


 // Handle hours change
 const handleHoursChange = (day, value) => {
   setMakerspaceForm(prev => ({
     ...prev,
     hours: {
       ...prev.hours,
       [day]: value
     }
   }));
 };


 // Add equipment
 const handleAddEquipment = () => {
   if (currentEquipment.trim() && !makerspaceForm.equipment.includes(currentEquipment.trim())) {
     setMakerspaceForm(prev => ({
       ...prev,
       equipment: [...prev.equipment, currentEquipment.trim()]
     }));
     setCurrentEquipment('');
   }
 };


 // Remove equipment
 const handleRemoveEquipment = (index) => {
   setMakerspaceForm(prev => ({
     ...prev,
     equipment: prev.equipment.filter((_, i) => i !== index)
   }));
 };


 // Handle event form changes
 const handleEventChange = (field, value) => {
   setEventForm(prev => ({
     ...prev,
     [field]: value
   }));
 };


 // Handle age range change
 const handleAgeRangeChange = (min, max) => {
   setEventForm(prev => ({
     ...prev,
     idealAges: [min, max]
   }));
 };


 // Submit handlers
 const handleMakerspaceSubmit = (e) => {
   e.preventDefault();
   console.log('Makerspace Form Data:', makerspaceForm);
   // TODO: Connect to backend
   setActiveForm(null);
   setIsMenuOpen(false);
   // Reset form
   setMakerspaceForm({
     location: '',
     hours: {
       monday: '', tuesday: '', wednesday: '', thursday: '',
       friday: '', saturday: '', sunday: ''
     },
     website: '',
     equipment: []
   });
 };


 const handleEventSubmit = (e) => {
   e.preventDefault();
   console.log('Event Form Data:', eventForm);
   // TODO: Connect to backend
   setActiveForm(null);
   setIsMenuOpen(false);
   // Reset form
   setEventForm({
     name: '',
     location: '',
     hours: '',
     description: '',
     difficulty: '',
     idealAges: [0, 100],
     rsvpLink: ''
   });
 };


 // Close forms when clicking outside
 useEffect(() => {
   const handleClickOutside = (event) => {
     if (activeForm && !event.target.closest('.form-container') && !event.target.closest('.fab-container')) {
       setActiveForm(null);
       setIsMenuOpen(false);
     }
   };


   document.addEventListener('mousedown', handleClickOutside);
   return () => document.removeEventListener('mousedown', handleClickOutside);
 }, [activeForm]);


 return (
   <>
     {/* Floating Action Button */}
    <div className="fab-container fixed bottom-6 left-6 z-50">
      {isMenuOpen && (
        <div className="absolute bottom-16 left-0 mb-2 space-y-3 flex flex-col items-start">
           {/* Add Makerspace Button with clear text */}
           <button
             onClick={() => setActiveForm('makerspace')}
             className="flex items-center w-auto px-4 py-3 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-700 transition-all duration-200 transform hover:scale-105 group"
           >
             <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
             </svg>
             <span className="text-sm font-medium whitespace-nowrap">Add Makerspace</span>
           </button>
          
           {/* Add Event Button with clear text */}
           <button
             onClick={() => setActiveForm('event')}
             className="flex items-center w-auto px-4 py-3 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-700 transition-all duration-200 transform hover:scale-105 group"
           >
             <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
             </svg>
             <span className="text-sm font-medium whitespace-nowrap">Add Event</span>
           </button>
         </div>
       )}
      
       {/* Main FAB Button */}
       <button
         onClick={() => setIsMenuOpen(!isMenuOpen)}
         className="flex items-center justify-center w-14 h-14 bg-primary-500 text-white rounded-full shadow-xl hover:bg-primary-600 transition-all duration-200 transform hover:scale-110"
       >
         <svg
           className={`w-6 h-6 transition-transform duration-200 ${isMenuOpen ? 'rotate-45' : ''}`}
           fill="none"
           stroke="currentColor"
           viewBox="0 0 24 24"
         >
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
         </svg>
       </button>
     </div>


     {/* Makerspace Form Modal */}
     {activeForm === 'makerspace' && (
       <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
         <div className="form-container bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
           <div className="p-6">
             <div className="flex items-center justify-between mb-6">
               <h2 className="text-2xl font-bold text-gray-800">Add New Makerspace</h2>
               <button
                 onClick={() => setActiveForm(null)}
                 className="text-gray-400 hover:text-gray-600 transition-colors"
               >
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                 </svg>
               </button>
             </div>


             <form onSubmit={handleMakerspaceSubmit} className="space-y-6">
               {/* Location Field */}
               <div>
                 <label className="block text-base font-semibold text-gray-800 mb-2 text-left">
                   Location <span className="text-red-500">*</span>
                 </label>
                 <div className="relative">
                   <input
                     type="text"
                     value={makerspaceForm.location}
                     onChange={(e) => {
                       handleMakerspaceChange('location', e.target.value);
                       geocodeLocation(e.target.value);
                     }}
                     placeholder="Search locations in Ontario..."
                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all duration-200"
                     required
                   />
                   {isGeocoding && (
                     <div className="absolute right-3 top-3">
                       <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-500"></div>
                     </div>
                   )}
                 </div>
                
                 {/* Location Suggestions */}
                 {locationSuggestions.length > 0 && (
                   <div className="mt-2 border border-gray-200 rounded-lg shadow-sm bg-white">
                     {locationSuggestions.map((suggestion, index) => (
                       <button
                         key={index}
                         type="button"
                         onClick={() => {
                           handleMakerspaceChange('location', suggestion.place_name);
                           setLocationSuggestions([]);
                         }}
                         className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                       >
                         <div className="text-sm text-gray-800">{suggestion.place_name}</div>
                         <div className="text-xs text-gray-500">
                           {suggestion.properties?.address || suggestion.text}
                         </div>
                       </button>
                     ))}
                   </div>
                 )}
                 <p className="mt-1 text-xs text-gray-500">
                   Searching in Ontario, Canada
                 </p>
               </div>


               {/* Hours of Operation */}
               <div>
                 <label className="block text-base font-semibold text-gray-800 mb-3 text-left">
                   Hours of Operation
                 </label>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                   {Object.entries(makerspaceForm.hours).map(([day, hours]) => (
                     <div key={day} className="flex items-center space-x-3">
                       <label className="w-24 text-sm font-medium text-gray-600 capitalize text-left">
                         {day}:
                       </label>
                       <input
                         type="text"
                         value={hours}
                         onChange={(e) => handleHoursChange(day, e.target.value)}
                         placeholder="9:00 AM - 5:00 PM"
                         className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-400 focus:border-transparent text-sm"
                       />
                     </div>
                   ))}
                 </div>
               </div>


               {/* Website */}
               <div>
                 <label className="block text-base font-semibold text-gray-800 mb-2 text-left">
                   Website
                 </label>
                 <input
                   type="url"
                   value={makerspaceForm.website}
                   onChange={(e) => handleMakerspaceChange('website', e.target.value)}
                   placeholder="https://example.com"
                   className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all duration-200"
                 />
               </div>


               {/* Equipment */}
               <div>
                 <label className="block text-base font-semibold text-gray-800 mb-2 text-left">
                   Equipment
                 </label>
                 <div className="space-y-3">
                   <div className="flex space-x-2">
                     <input
                       type="text"
                       value={currentEquipment}
                       onChange={(e) => setCurrentEquipment(e.target.value)}
                       onKeyPress={(e) => {
                         if (e.key === 'Enter') {
                           e.preventDefault();
                           handleAddEquipment();
                         }
                       }}
                       placeholder="Type equipment and press Enter..."
                       className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                       list="equipment-suggestions"
                     />
                     <datalist id="equipment-suggestions">
                       {equipmentSuggestions.map((equipment, index) => (
                         <option key={index} value={equipment} />
                       ))}
                     </datalist>
                     <button
                       type="button"
                       onClick={handleAddEquipment}
                       className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                     >
                       Add
                     </button>
                   </div>
                  
                   {/* Equipment Tags */}
                   <div className="flex flex-wrap gap-2">
                     {makerspaceForm.equipment.map((equipment, index) => (
                       <div
                         key={index}
                         className="flex items-center bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-sm"
                       >
                         {equipment}
                         <button
                           type="button"
                           onClick={() => handleRemoveEquipment(index)}
                           className="ml-2 text-primary-600 hover:text-primary-800"
                         >
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                           </svg>
                         </button>
                       </div>
                     ))}
                   </div>
                 </div>
               </div>


               {/* Submit Buttons */}
               <div className="flex space-x-3 pt-4">
                 <button
                   type="button"
                   onClick={() => setActiveForm(null)}
                   className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                 >
                   Cancel
                 </button>
                 <button
                   type="submit"
                   className="flex-1 px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                 >
                   Create Makerspace
                 </button>
               </div>
             </form>
           </div>
         </div>
       </div>
     )}


     {/* Event Form Modal */}
     {activeForm === 'event' && (
       <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
         <div className="form-container bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
           <div className="p-6">
             <div className="flex items-center justify-between mb-6">
               <h2 className="text-2xl font-bold text-gray-800">Add New Event</h2>
               <button
                 onClick={() => setActiveForm(null)}
                 className="text-gray-400 hover:text-gray-600 transition-colors"
               >
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                 </svg>
               </button>
             </div>


             <form onSubmit={handleEventSubmit} className="space-y-6">
               {/* Event Name */}
               <div>
                 <label className="block text-base font-semibold text-gray-800 mb-2 text-left">
                   Event Name <span className="text-red-500">*</span>
                 </label>
                 <input
                   type="text"
                   value={eventForm.name}
                   onChange={(e) => handleEventChange('name', e.target.value)}
                   placeholder="Enter event name..."
                   className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all duration-200"
                   required
                 />
               </div>


               {/* Event Location */}
               <div>
                 <label className="block text-base font-semibold text-gray-800 mb-2 text-left">
                   Location <span className="text-red-500">*</span>
                 </label>
                 <div className="relative">
                   <input
                     type="text"
                     value={eventForm.location}
                     onChange={(e) => {
                       handleEventChange('location', e.target.value);
                       geocodeLocation(e.target.value);
                     }}
                     placeholder="Search locations in Ontario..."
                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all duration-200"
                     required
                   />
                   {isGeocoding && (
                     <div className="absolute right-3 top-3">
                       <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-500"></div>
                     </div>
                   )}
                 </div>
                
                 {/* Location Suggestions */}
                 {locationSuggestions.length > 0 && (
                   <div className="mt-2 border border-gray-200 rounded-lg shadow-sm bg-white">
                     {locationSuggestions.map((suggestion, index) => (
                       <button
                         key={index}
                         type="button"
                         onClick={() => {
                           handleEventChange('location', suggestion.place_name);
                           setLocationSuggestions([]);
                         }}
                         className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                       >
                         <div className="text-sm text-gray-800">{suggestion.place_name}</div>
                         <div className="text-xs text-gray-500">
                           {suggestion.properties?.address || suggestion.text}
                         </div>
                       </button>
                     ))}
                   </div>
                 )}
                 <p className="mt-1 text-xs text-gray-500">
                   Searching in Ontario, Canada
                 </p>
               </div>


               {/* Event Hours */}
               <div>
                 <label className="block text-base font-semibold text-gray-800 mb-2 text-left">
                   Event Hours <span className="text-red-500">*</span>
                 </label>
                 <input
                   type="text"
                   value={eventForm.hours}
                   onChange={(e) => handleEventChange('hours', e.target.value)}
                   placeholder="e.g., 6:00 PM - 8:00 PM, Saturday, March 15"
                   className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all duration-200"
                   required
                 />
               </div>


               {/* Description */}
               <div>
                 <label className="block text-base font-semibold text-gray-800 mb-2 text-left">
                   Description <span className="text-red-500">*</span>
                 </label>
                 <textarea
                   value={eventForm.description}
                   onChange={(e) => handleEventChange('description', e.target.value)}
                   placeholder="Describe the event..."
                   rows={4}
                   className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all duration-200 resize-none"
                   required
                 />
               </div>


               {/* Difficulty Level */}
               <div>
                 <label className="block text-base font-semibold text-gray-800 mb-2 text-left">
                   Level of Difficulty
                 </label>
                 <select
                   value={eventForm.difficulty}
                   onChange={(e) => handleEventChange('difficulty', e.target.value)}
                   className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all duration-200"
                 >
                   <option value="">Select difficulty level</option>
                   <option value="beginner" className="text-green-600">Beginner</option>
                   <option value="intermediate" className="text-yellow-600">Intermediate</option>
                   <option value="advanced" className="text-red-600">Advanced</option>
                   <option value="all-levels" className="text-blue-600">All Levels</option>
                 </select>
               </div>


               {/* Ideal Age Range - Fixed Version */}
               <div>
                 <label className="block text-base font-semibold text-gray-800 mb-4 text-left">
                   Ideal for Ages: {eventForm.idealAges[0]} - {eventForm.idealAges[1]}
                 </label>
                 <div className="space-y-4">
                   <div className="flex justify-between text-sm text-gray-600 mb-2">
                     <span>Min: {eventForm.idealAges[0]}</span>
                     <span>Max: {eventForm.idealAges[1]}</span>
                   </div>
                  
                   {/* Simple dual range slider */}
                   <div className="relative h-10 flex items-center">
                     {/* Track */}
                     <div className="absolute w-full h-2 bg-gray-200 rounded-full"></div>
                    
                     {/* Active Range */}
                     <div
                       className="absolute h-2 bg-primary-500 rounded-full"
                       style={{
                         left: `${(eventForm.idealAges[0] / 100) * 100}%`,
                         width: `${((eventForm.idealAges[1] - eventForm.idealAges[0]) / 100) * 100}%`
                       }}
                     ></div>
                    
                     {/* Min Thumb */}
                     <input
                       type="range"
                       min="0"
                       max="100"
                       value={eventForm.idealAges[0]}
                       onChange={(e) => {
                         const min = parseInt(e.target.value);
                         const max = Math.max(min, eventForm.idealAges[1]);
                         handleAgeRangeChange(min, max);
                       }}
                       className="absolute w-full h-2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:pointer-events-auto"
                     />
                    
                     {/* Max Thumb */}
                     <input
                       type="range"
                       min="0"
                       max="100"
                       value={eventForm.idealAges[1]}
                       onChange={(e) => {
                         const max = parseInt(e.target.value);
                         const min = Math.min(max, eventForm.idealAges[0]);
                         handleAgeRangeChange(min, max);
                       }}
                       className="absolute w-full h-2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:pointer-events-auto"
                     />
                   </div>
                  
                   {/* Quick age buttons */}
                   <div className="flex flex-wrap gap-2 justify-center">
                     {[[0, 12], [13, 17], [18, 25], [26, 35], [36, 100]].map(([min, max], index) => (
                       <button
                         key={index}
                         type="button"
                         onClick={() => handleAgeRangeChange(min, max)}
                         className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                       >
                         {min === 0 && max === 12 && 'Kids'}
                         {min === 13 && max === 17 && 'Teens'}
                         {min === 18 && max === 25 && 'Young Adults'}
                         {min === 26 && max === 35 && 'Adults'}
                         {min === 36 && max === 100 && 'All Ages'}
                       </button>
                     ))}
                   </div>
                 </div>
               </div>


               {/* RSVP Link */}
               <div>
                 <label className="block text-base font-semibold text-gray-800 mb-2 text-left">
                   RSVP Link
                 </label>
                 <input
                   type="url"
                   value={eventForm.rsvpLink}
                   onChange={(e) => handleEventChange('rsvpLink', e.target.value)}
                   placeholder="https://example.com/rsvp"
                   className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all duration-200"
                 />
               </div>


               {/* Submit Buttons */}
               <div className="flex space-x-3 pt-4">
                 <button
                   type="button"
                   onClick={() => setActiveForm(null)}
                   className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                 >
                   Cancel
                 </button>
                 <button
                   type="submit"
                   className="flex-1 px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                 >
                   Create Event
                 </button>
               </div>
             </form>
           </div>
         </div>
       </div>
     )}
   </>
 );
};


export default MakerspaceForms;
