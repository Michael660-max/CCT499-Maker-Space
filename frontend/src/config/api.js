// API configuration that switches between dev and production
const getApiUrl = () => {
  // In production, use Railway backend URL
  if (process.env.NODE_ENV === 'production') {
    return 'https://makerspace-backend-production.up.railway.app';
  } else {
      // In development, use localhost or environment variable
    return process.env.REACT_APP_API_URL || 'http://localhost:8080';
  }
  
};

export const API_URL = getApiUrl();

// Helper function for making API requests
export const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint}`;
  return fetch(url, options);
};