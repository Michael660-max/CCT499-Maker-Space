import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Get all locations
export const getLocations = async () => {
  try {
    const response = await axios.get(`${API_URL}/locations`);
    return response.data;
  } catch (error) {
    console.error('Error fetching locations:', error);
    throw error;
  }
};

// Get a single location by ID
export const getLocationById = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/locations/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching location:', error);
    throw error;
  }
};

// Create a new location
export const createLocation = async (locationData) => {
  try {
    const response = await axios.post(`${API_URL}/locations`, locationData);
    return response.data;
  } catch (error) {
    console.error('Error creating location:', error);
    throw error;
  }
};

// Update a location
export const updateLocation = async (id, locationData) => {
  try {
    const response = await axios.put(`${API_URL}/locations/${id}`, locationData);
    return response.data;
  } catch (error) {
    console.error('Error updating location:', error);
    throw error;
  }
};

// Delete a location
export const deleteLocation = async (id) => {
  try {
    const response = await axios.delete(`${API_URL}/locations/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting location:', error);
    throw error;
  }
};
