// backend/controllers/systemSettingController.js
const systemSettingService = require('../services/systemSettingService');

class SystemSettingController {
  /**
   * GET /api/system-settings
   */
  async getAll(req, res, next) {
    try {
      const settings = await systemSettingService.getAll();
      res.json({ success: true, data: settings });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/system-settings/object
   */
  async getSettingsObject(req, res, next) {
    try {
      const data = await systemSettingService.getSettingsObject();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/system-settings/categorized
   */
  async getCategorized(req, res, next) {
    try {
      const data = await systemSettingService.getCategorizedSettings();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/system-settings/category/:category
   */
  async getByCategory(req, res, next) {
    try {
      const data = await systemSettingService.getByCategory(req.params.category);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/system-settings/:id
   */
  async getById(req, res, next) {
    try {
      const setting = await systemSettingService.getById(req.params.id);
      res.json({ success: true, data: setting });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/system-settings/key/:key
   */
  async getByKey(req, res, next) {
    try {
      const setting = await systemSettingService.getByKey(req.params.key);
      res.json({ success: true, data: setting });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/system-settings
   */
  async create(req, res, next) {
    try {
      const setting = await systemSettingService.create(req.body);
      res.status(201).json({ success: true, data: setting });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/system-settings/:id
   */
  async update(req, res, next) {
    try {
      const setting = await systemSettingService.update(req.params.id, req.body);
      res.json({ success: true, data: setting });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/system-settings/key/:key
   */
  async updateByKey(req, res, next) {
    try {
      const setting = await systemSettingService.updateByKey(req.params.key, req.body);
      res.json({ success: true, data: setting });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/system-settings/bulk
   */
  async updateMany(req, res, next) {
    try {
      const results = await systemSettingService.updateMany(req.body);
      res.json({ success: true, data: results });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/system-settings/:id
   */
  async delete(req, res, next) {
    try {
      const result = await systemSettingService.delete(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/system-settings/key/:key
   */
  async deleteByKey(req, res, next) {
    try {
      const result = await systemSettingService.deleteByKey(req.params.key);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new SystemSettingController();