// backend/routes/location.js
const express = require('express');
const locationController = require('../controllers/locationController');

const router = express.Router();

// Regions
router.get('/regions', locationController.getRegions);

// Provinces
router.get(
  '/regions/:regionId/provinces',
  locationController.getProvincesByRegion
);

// Cities / municipalities
router.get(
  '/provinces/:provinceId/cities',
  locationController.getCitiesByProvince
);

// Cities / municipalities directly under a region
// Useful for NCR
router.get(
  '/regions/:regionId/cities',
  locationController.getCitiesByRegion
);

// Barangays
router.get(
  '/cities/:cityMunicipalityId/barangays',
  locationController.getBarangaysByCity
);

module.exports = router;