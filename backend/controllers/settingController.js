// backend/controllers/settingController.js
const SettingService = require('../services/settingService');

class SettingController {
  /**
   * Get all settings
   */
  static async getAllSettings(req, res) {
    try {
      const categorized = await SettingService.getCategorizedSettings();
      res.json({
        success: true,
        data: categorized
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get settings by category
   */
  static async getSettingsByCategory(req, res) {
    try {
      const { category } = req.params;
      const settings = await SettingService.getSettingsByCategory(category);
      res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Update a setting
   */
  static async updateSetting(req, res) {
    try {
      const { key } = req.params;
      const { value } = req.body;
      
      const updated = await SettingService.updateSetting(key, value);
      res.json({
        success: true,
        data: updated
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Update multiple settings
   */
  static async updateMultipleSettings(req, res) {
    try {
      const { updates } = req.body;
      const results = await SettingService.updateMultipleSettings(updates);
      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get clinic operational settings
   */
  static async getOperationalSettings(req, res) {
    try {
      const settings = await SettingService.getOperationalSettings();
      res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Validate booking time
   */
  static async validateBookingTime(req, res) {
    try {
      const { date, timeSlot } = req.body;
      const result = await SettingService.isValidBookingTime(
        new Date(date),
        timeSlot
      );
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = SettingController;