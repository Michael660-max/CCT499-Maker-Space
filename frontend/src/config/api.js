// API configuration that switches between dev and production
const getApiUrl = () => {
  // Check if we're running on Railway (production)
  const isProduction = 
    window.location.hostname.includes('railway.app') ||
    window.location.hostname.includes('makers.up.railway.app') ||
    process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    console.log('Using Railway backend URL');
    return 'https://makerspace-backend-production.up.railway.app';
  } else {
    console.log('Using localhost backend URL');
    // Development - use localhost
    return 'http://localhost:8080';
  }
};

export const API_URL = getApiUrl();

// Helper function for making API requests
export const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint}`;
  return fetch(url, options);
};