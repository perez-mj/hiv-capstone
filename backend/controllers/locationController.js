// backend/controllers/locationController.js
const db = require('../models');

class LocationController {
  /**
   * GET /api/locations/regions
   */
  async getRegions(req, res) {
    try {
      const regions = await db.Region.findAll({
        attributes: [
          'id',
          'psgcCode',
          'name',
          'correspondenceCode'
        ],
        order: [['name', 'ASC']]
      });

      return res.json({
        success: true,
        data: regions
      });
    } catch (error) {
      console.error('Get regions error:', error);

      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve regions'
      });
    }
  }

  /**
   * GET /api/locations/regions/:regionId/provinces
   */
  async getProvincesByRegion(req, res) {
    try {
      const { regionId } = req.params;

      const provinces = await db.Province.findAll({
        where: {
          regionId
        },
        attributes: [
          'id',
          'psgcCode',
          'name',
          'correspondenceCode',
          'incomeClassification'
        ],
        order: [['name', 'ASC']]
      });

      return res.json({
        success: true,
        data: provinces
      });
    } catch (error) {
      console.error('Get provinces error:', error);

      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve provinces'
      });
    }
  }

  /**
   * GET /api/locations/provinces/:provinceId/cities
   */
  async getCitiesByProvince(req, res) {
    try {
      const { provinceId } = req.params;

      const cities = await db.CityMunicipality.findAll({
        where: {
          provinceId
        },
        attributes: [
          'id',
          'psgcCode',
          'name',
          'geographicLevel',
          'cityClass',
          'incomeClassification'
        ],
        order: [['name', 'ASC']]
      });

      return res.json({
        success: true,
        data: cities
      });
    } catch (error) {
      console.error('Get cities by province error:', error);

      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve cities and municipalities'
      });
    }
  }

  /**
   * GET /api/locations/regions/:regionId/cities
   *
   * Useful for NCR and other locations where province_id is NULL.
   */
  async getCitiesByRegion(req, res) {
    try {
      const { regionId } = req.params;

      const cities = await db.CityMunicipality.findAll({
        where: {
          regionId
        },
        attributes: [
          'id',
          'psgcCode',
          'name',
          'geographicLevel',
          'cityClass',
          'incomeClassification',
          'provinceId'
        ],
        order: [['name', 'ASC']]
      });

      return res.json({
        success: true,
        data: cities
      });
    } catch (error) {
      console.error('Get cities by region error:', error);

      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve cities and municipalities'
      });
    }
  }

  /**
   * GET /api/locations/cities/:cityMunicipalityId/barangays
   */
  async getBarangaysByCity(req, res) {
    try {
      const { cityMunicipalityId } = req.params;

      const barangays = await db.Barangay.findAll({
        where: {
          cityMunicipalityId
        },
        attributes: [
          'id',
          'psgcCode',
          'name',
          'correspondenceCode',
          'urbanRural',
          'population2024'
        ],
        order: [['name', 'ASC']]
      });

      return res.json({
        success: true,
        data: barangays
      });
    } catch (error) {
      console.error('Get barangays error:', error);

      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve barangays'
      });
    }
  }
}

module.exports = new LocationController();