import React, { useState } from 'react';
import './LocationForm.css';

function LocationForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    latitude: '',
    longitude: '',
    category: 'general'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate coordinates
    const lat = parseFloat(formData.latitude);
    const lng = parseFloat(formData.longitude);
    
    if (isNaN(lat) || isNaN(lng)) {
      alert('Please enter valid coordinates');
      return;
    }

    if (lat < -90 || lat > 90) {
      alert('Latitude must be between -90 and 90');
      return;
    }

    if (lng < -180 || lng > 180) {
      alert('Longitude must be between -180 and 180');
      return;
    }

    onSubmit({
      name: formData.name,
      description: formData.description,
      latitude: lat,
      longitude: lng,
      category: formData.category
    });

    // Reset form
    setFormData({
      name: '',
      description: '',
      latitude: '',
      longitude: '',
      category: 'general'
    });
  };

  return (
    <div className="location-form">
      <h2>Add New Location</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Name *</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="Enter location name"
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description *</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            placeholder="Enter location description"
            rows="3"
          />
        </div>

        <div className="form-group">
          <label htmlFor="latitude">Latitude *</label>
          <input
            type="number"
            id="latitude"
            name="latitude"
            value={formData.latitude}
            onChange={handleChange}
            required
            placeholder="e.g., 43.6532"
            step="any"
          />
        </div>

        <div className="form-group">
          <label htmlFor="longitude">Longitude *</label>
          <input
            type="number"
            id="longitude"
            name="longitude"
            value={formData.longitude}
            onChange={handleChange}
            required
            placeholder="e.g., -79.3832"
            step="any"
          />
        </div>

        <div className="form-group">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
          >
            <option value="general">General</option>
            <option value="makerspace">Maker Space</option>
            <option value="workshop">Workshop</option>
            <option value="lab">Lab</option>
            <option value="studio">Studio</option>
          </select>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            Add Location
          </button>
          <button type="button" onClick={onCancel} className="btn btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default LocationForm;
