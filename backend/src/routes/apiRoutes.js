const express = require('express');
const router = express.Router();
const makerspaceController = require('../controllers/makerspaceController');

// GET /api/makerspaces.geojson
router.get('/makerspaces.geojson', makerspaceController.getMakerspaces);

// GET /api/
router.get('/', makerspaceController.getApiStatus);

module.exports = router;