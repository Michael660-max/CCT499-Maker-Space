import React, { useState } from "react";
import { supabase } from "../lib/supabase";

export default function AuthModal({ isOpen, onClose, defaultMode = "signup" }) {
  const [isSignUp, setIsSignUp] = useState(defaultMode === "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [showVerificationNotice, setShowVerificationNotice] = useState(false);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    // Validate password strength for sign up
    if (isSignUp && password.length < 6) {
      setMessage({
        type: "error",
        text: "Password must be at least 6 characters",
      });
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              is_new_user: true, // Mark as new user for phone verification
              account_setup_complete: false,
            },
          },
        });

        if (error) throw error;

        if (data.user && !data.user.identities?.length) {
          setMessage({
            type: "error",
            text: "An account with this email already exists. Please sign in instead.",
          });
        } else {
          setShowVerificationNotice(true);
          setMessage({
            type: "success",
            text: "Verification email sent! Please check your inbox.",
          });
        }
      } else {
        const { error, data } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        console.log('Sign in successful:', data);
        
        // Close modal immediately
        setLoading(false);
        onClose();
        
        // Force page reload to ensure auth state is properly detected
        setTimeout(() => {
          window.location.href = '/map';
        }, 500);
      }
    } catch (error) {
      console.error("Auth error:", error);

      // Handle specific error cases
      if (error.message.includes("Invalid login credentials")) {
        setMessage({ type: "error", text: "Invalid email or password" });
      } else if (error.message.includes("Email not confirmed")) {
        setMessage({
          type: "error",
          text: "Please verify your email before signing in",
        });
      } else if (error.message.includes("User already registered")) {
        setMessage({
          type: "error",
          text: "An account with this email already exists. Please sign in.",
        });
        setIsSignUp(false);
      } else {
        setMessage({ type: "error", text: error.message });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider) => {
    setMessage({ type: "", text: "" });

    const redirectTo = `${window.location.origin}/auth/callback`; // works in dev and prod

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
    }
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setFullName("");
    setMessage({ type: "", text: "" });
    setShowVerificationNotice(false);
  };

  //  const handleClose = () => {
  //    resetForm();
  //    onClose();
  //  };

  const handleAuthSwitch = (isSignUpMode) => {
    resetForm();
    setIsSignUp(isSignUpMode);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto transform transition-all">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-800 text-center w-full">
              {showVerificationNotice
                ? "Check Your Email"
                : isSignUp
                ? "Sign Up"
                : "Sign In"}
            </h2>
          </div>
          <p className="text-gray-600 text-center">
            {showVerificationNotice
              ? "We sent a verification link to your email"
              : isSignUp
              ? "Create your account to get started"
              : "Welcome back to your account"}
          </p>
        </div>

        {showVerificationNotice ? (
          <div className="p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2 text-center">
                Verify Your Email
              </h3>
              <p className="text-gray-600 mb-4 text-center">
                We've sent a verification link to <strong>{email}</strong>.
                Click the link in the email to activate your account.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-700 text-center">
                  💡 <strong>Tip:</strong> Check your spam folder if you don't
                  see the email within a few minutes.
                </p>
              </div>
              <button
                onClick={() => setShowVerificationNotice(false)}
                className="text-primary-500 font-medium hover:text-primary-600 transition-colors text-center w-full"
              >
                Back to sign in
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {/* OAuth Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => handleOAuth("google")}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors duration-200 opacity-60 cursor-not-allowed"
                disabled
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="font-medium text-gray-700">
                  Continue with Google
                </span>
              </button>

              <button
                onClick={() => handleOAuth("discord")}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors duration-200"
              >
                <svg className="w-5 h-5" fill="#5865F2" viewBox="0 0 24 24">
                  <path d="M19.73 4.87a18.2 18.2 0 0 0-4.6-1.44c-.21.4-.4.8-.58 1.21a16.6 16.6 0 0 0-4.33 0c-.18-.41-.37-.82-.59-1.21-1.6.27-3.14.75-4.6 1.44A19 19 0 0 0 .96 17.7a18.4 18.4 0 0 0 5.63 2.87c.45-.6.85-1.24 1.2-1.91a12 12 0 0 1-1.89-.92c.16-.12.31-.24.46-.37 3.58 1.7 7.7 1.7 11.26 0l.46.37c-.61.36-1.25.67-1.89.92.35.67.75 1.31 1.2 1.91 2.1-.68 4.04-1.82 5.63-3.28a19 19 0 0 0-2.28-12.83zm-12.1 10.7c-1.1 0-2-1.02-2-2.27 0-1.25.88-2.27 2-2.27 1.12 0 2.02 1.02 2 2.27 0 1.25-.88 2.27-2 2.27zm8.74 0c-1.1 0-2-1.02-2-2.27 0-1.25.88-2.27 2-2.27 1.12 0 2.02 1.02 2 2.27 0 1.25-.88 2.27-2 2.27z" />
                </svg>
                <span className="font-medium text-gray-700">
                  Continue with Discord
                </span>
              </button>

              {/* Facebook Button - Placeholder */}
              <button
                onClick={() =>
                  setMessage({
                    type: "info",
                    text: "Facebook login coming soon!",
                  })
                }
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors duration-200 opacity-60 cursor-not-allowed"
                disabled
              >
                <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span className="font-medium text-gray-700">
                  Continue with Facebook
                </span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative flex items-center py-4">
              <div className="flex-grow border-t border-gray-300"></div>
              <span className="flex-shrink mx-4 text-gray-500 text-sm text-center">
                or continue with email
              </span>
              <div className="flex-grow border-t border-gray-300"></div>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleEmailAuth} className="space-y-4">
              {isSignUp && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 text-center"
                    placeholder="Enter your full name"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
                  Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 text-center"
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
                  Password *
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 text-center"
                  placeholder={
                    isSignUp
                      ? "Choose a password (min. 6 characters)"
                      : "Enter your password"
                  }
                  required
                  minLength={6}
                />
              </div>

              {message.text && (
                <div
                  className={`p-3 rounded-lg text-sm ${
                    message.type === "success"
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : message.type === "error"
                      ? "bg-red-50 text-red-700 border border-red-200"
                      : "bg-blue-50 text-blue-700 border border-blue-200"
                  }`}
                >
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-500 text-white py-3 rounded-xl font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {isSignUp ? "Creating Account..." : "Signing In..."}
                  </div>
                ) : isSignUp ? (
                  "Create Account"
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            {/* Toggle between sign in and sign up */}
            <div className="text-center pt-4">
              <p className="text-gray-600">
                {isSignUp
                  ? "Already have an account?"
                  : "Don't have an account?"}
                <button
                  onClick={() => handleAuthSwitch(!isSignUp)}
                  className="ml-2 text-primary-500 font-medium hover:text-primary-600 transition-colors"
                >
                  {isSignUp ? "Sign In" : "Sign Up"}
                </button>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
