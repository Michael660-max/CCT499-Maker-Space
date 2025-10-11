const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');

// GET all locations
router.get('/', locationController.getAllLocations);

// GET a single location
router.get('/:id', locationController.getLocationById);

// POST a new location
router.post('/', locationController.createLocation);

// PUT update a location
router.put('/:id', locationController.updateLocation);

// DELETE a location
router.delete('/:id', locationController.deleteLocation);

module.exports = router;
