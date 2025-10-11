const Location = require('../models/Location');

// Get all locations
exports.getAllLocations = async (req, res) => {
  try {
    const locations = await Location.find();
    res.json(locations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a single location by ID
exports.getLocationById = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({ message: 'Location not found' });
    }
    res.json(location);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new location
exports.createLocation = async (req, res) => {
  const location = new Location({
    name: req.body.name,
    description: req.body.description,
    coordinates: {
      type: 'Point',
      coordinates: [req.body.longitude, req.body.latitude], // [longitude, latitude]
    },
    category: req.body.category || 'general',
  });

  try {
    const newLocation = await location.save();
    res.status(201).json(newLocation);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update a location
exports.updateLocation = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({ message: 'Location not found' });
    }

    if (req.body.name) location.name = req.body.name;
    if (req.body.description) location.description = req.body.description;
    if (req.body.category) location.category = req.body.category;
    if (req.body.longitude && req.body.latitude) {
      location.coordinates = {
        type: 'Point',
        coordinates: [req.body.longitude, req.body.latitude],
      };
    }

    const updatedLocation = await location.save();
    res.json(updatedLocation);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete a location
exports.deleteLocation = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({ message: 'Location not found' });
    }

    await location.deleteOne();
    res.json({ message: 'Location deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
