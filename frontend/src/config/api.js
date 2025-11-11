// API configuration that switches between dev and production
const getApiUrl = () => {
  // In production, use Railway backend URL
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:8080';
  } else {
      // In development, use localhost or environment variable
    return 'https://makerspace-backend-production.up.railway.app';
  }
};

export const API_URL = getApiUrl();

// Helper function for making API requests
export const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint}`;
  return fetch(url, options);
};