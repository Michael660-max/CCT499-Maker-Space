import React, { useState } from "react";
import AuthModal from "./AuthModal";

const LandingPage = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState("signin");

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left side - Content */}
      <div className="flex-1 flex flex-col justify-center items-center bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-lg w-full space-y-8">
          <div className="text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
              Discover the GTA's
              <span className="text-primary-500 block">Maker Community</span>
            </h1>
            <p className="text-gray-600 mb-6">
              Explore makerspaces, find equipment, and connect with the maker community. 
              Get started instantly or create an account to save preferences and post events.
            </p>
          </div>

          <div className="space-y-3">
            {/* Continue as Guest Button - Red */}
            <button
              onClick={() => window.location.href = '/'}
              className="w-full bg-primary-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-600 transition-colors duration-200"
            >
              Continue as Guest - Explore Map
            </button>

            {/* Sign Up/In Button - Red Outline */}
            <button
              onClick={() => {
                setAuthMode("signin");
                setShowAuthModal(true);
              }}
              className="w-full border border-primary-500 text-primary-500 px-6 py-3 rounded-lg font-semibold hover:bg-primary-50 transition-colors duration-200"
            >
              Sign Up / Sign In
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">Guest Access Includes:</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• View all makerspaces on the map</li>
              <li>• Search and filter makerspaces</li>
              <li>• View detailed makerspace information</li>
              <li>• Use the AI chat assistant</li>
            </ul>
            <h3 className="font-semibold text-green-800 mt-3 mb-2">Create Account to:</h3>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Post events and makerspaces</li>
              <li>• Save preferences and personalization</li>
              <li>• Enable/disable chat features</li>
              <li>• Save your conversation history</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Right side - Map Preview */}
      <div
        className="flex-1 relative hidden md:block"
        style={{
          backgroundImage: "url('/maps.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/60"></div>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultMode={authMode}
      />
    </div>
  );
};

export default LandingPage;