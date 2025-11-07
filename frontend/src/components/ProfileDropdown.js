import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import ProfileSettings from './ProfileSettings';


export default function ProfileDropdown() {
 const { user } = useAuth();
 const [isOpen, setIsOpen] = useState(false);
 const [showSettings, setShowSettings] = useState(false);
 const dropdownRef = useRef(null);


 useEffect(() => {
   const handleClickOutside = (event) => {
     if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
       setIsOpen(false);
     }
   };


   document.addEventListener('mousedown', handleClickOutside);
   return () => document.removeEventListener('mousedown', handleClickOutside);
 }, []);


 const handleLogout = async () => {
   await supabase.auth.signOut();
   setIsOpen(false);
 };


 const getProfileImage = () => {
   // Check for Google avatar first, then Discord, then use default
   if (user?.user_metadata?.avatar_url) {
     return user.user_metadata.avatar_url;
   }
   if (user?.user_metadata?.picture) {
     return user.user_metadata.picture;
   }
   return null;
 };


 const openSettings = () => {
   setIsOpen(false);
   setShowSettings(true);
 };

 const closeSettings = () => {
   setShowSettings(false);
 };

 return (
   <div ref={dropdownRef} className="relative">
     {/* Profile Button */}
     <button
       onClick={() => setIsOpen(!isOpen)}
       className="flex items-center justify-center w-10 h-10 bg-primary-500 text-white rounded-full shadow-lg hover:bg-primary-600 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2"
       aria-label="Profile menu"
     >
       {getProfileImage() ? (
         <img
           src={getProfileImage()}
           alt="Profile"
           className="w-full h-full rounded-full object-cover"
           onError={(e) => {
             e.target.style.display = 'none';
             e.target.nextSibling.style.display = 'flex';
           }}
         />
       ) : null}
       <div className={`w-full h-full rounded-full flex items-center justify-center ${getProfileImage() ? 'hidden' : 'flex'}`}>
         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
         </svg>
       </div>
     </button>


     {/* Dropdown Menu */}
     {isOpen && (
       <div className="absolute right-0 top-12 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50">
         {/* User Info */}
         <div className="px-4 py-3 border-b border-gray-100">
           <p className="text-sm font-medium text-gray-800 truncate">
             {user?.email}
           </p>
           <p className="text-xs text-gray-500 mt-1">
             {user?.user_metadata?.full_name || user?.user_metadata?.name || 'MakerSpace User'}
           </p>
         </div>


         {/* Menu Items */}
         <div className="py-2">
           <button
             onClick={openSettings}
             className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
           >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
             </svg>
             Profile Settings
           </button>


           <button
             onClick={openSettings}
             className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
           >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
             </svg>
             Preferences
           </button>
         </div>


         {/* Logout Button */}
         <div className="pt-2 border-t border-gray-100">
           <button
             onClick={handleLogout}
             className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150 flex items-center gap-3"
           >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
             </svg>
             Sign Out
           </button>
         </div>
       </div>
     )}

     <ProfileSettings isOpen={showSettings} onClose={closeSettings} />
   </div>
 );
}
