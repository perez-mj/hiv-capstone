// backend/services/systemSettingService.js
const { SystemSetting } = require('../models');

class SystemSettingService {
  /**
   * Get all settings (raw rows)
   */
  async getAll() {
    return await SystemSetting.findAll({
      order: [['category', 'ASC'], ['key', 'ASC']]
    });
  }

  /**
   * Get a single setting by ID
   */
  async getById(id) {
    const setting = await SystemSetting.findByPk(id);
    if (!setting) {
      const error = new Error(`System setting with id ${id} not found`);
      error.statusCode = 404;
      throw error;
    }
    return setting;
  }

  /**
   * Get a single setting by key
   */
  async getByKey(key) {
    const setting = await SystemSetting.findOne({ where: { key } });
    if (!setting) {
      const error = new Error(`System setting with key "${key}" not found`);
      error.statusCode = 404;
      throw error;
    }
    return setting;
  }

  /**
   * Get all settings as a flat object (typed)
   */
  async getSettingsObject() {
    return await SystemSetting.getSettingsObject();
  }

  /**
   * Get settings by category
   */
  async getByCategory(category) {
    return await SystemSetting.getByCategory(category);
  }

  /**
   * Get settings grouped by category
   */
  async getCategorizedSettings() {
    return await SystemSetting.getCategorizedSettings();
  }

  /**
   * Create a new setting
   */
  async create(data) {
    const { key, value, description, data_type, category } = data;

    if (!key || value === undefined || value === null) {
      const error = new Error('Both "key" and "value" are required');
      error.statusCode = 400;
      throw error;
    }

    // Check for duplicate key
    const existing = await SystemSetting.findOne({ where: { key } });
    if (existing) {
      const error = new Error(`System setting with key "${key}" already exists`);
      error.statusCode = 409;
      throw error;
    }

    // Normalise value and data_type
    const { stringValue, detectedType } = this._normalizeValue(value);

    return await SystemSetting.create({
      key,
      value: stringValue,
      description: description || null,
      data_type: data_type || detectedType,
      category: category || null
    });
  }

  /**
   * Update a setting by ID
   */
  async update(id, data) {
    const setting = await this.getById(id);
    const { key, value, description, data_type, category } = data;

    // Check key uniqueness if changed
    if (key && key !== setting.key) {
      const existing = await SystemSetting.findOne({ where: { key } });
      if (existing) {
        const error = new Error(`System setting with key "${key}" already exists`);
        error.statusCode = 409;
        throw error;
      }
      setting.key = key;
    }

    if (value !== undefined) {
      const { stringValue, detectedType } = this._normalizeValue(value);
      setting.value = stringValue;
      setting.data_type = data_type || detectedType;
    } else if (data_type) {
      setting.data_type = data_type;
    }

    if (description !== undefined) setting.description = description;
    if (category !== undefined) setting.category = category;

    await setting.save();
    return setting;
  }

  /**
   * Update a setting by key
   */
  async updateByKey(key, data) {
    const setting = await this.getByKey(key);
    return await this.update(setting.id, data);
  }

  /**
   * Bulk update multiple settings by key
   */
  async updateMany(updates) {
    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
      const error = new Error('Request body must be an object of { key: value } pairs');
      error.statusCode = 400;
      throw error;
    }
    return await SystemSetting.updateMany(updates);
  }

  /**
   * Delete a setting by ID
   */
  async delete(id) {
    const setting = await this.getById(id);
    await setting.destroy();
    return { success: true, message: `Setting "${setting.key}" deleted` };
  }

  /**
   * Delete a setting by key
   */
  async deleteByKey(key) {
    const setting = await this.getByKey(key);
    await setting.destroy();
    return { success: true, message: `Setting "${setting.key}" deleted` };
  }

  /**
   * Helper: normalize any JS value into a string + detected data type
   */
  _normalizeValue(value) {
    let detectedType = 'string';
    let stringValue = String(value);

    if (typeof value === 'boolean') {
      detectedType = 'boolean';
      stringValue = String(value);
    } else if (typeof value === 'number') {
      detectedType = 'number';
      stringValue = String(value);
    } else if (value !== null && typeof value === 'object') {
      detectedType = 'json';
      stringValue = JSON.stringify(value);
    }

    return { stringValue, detectedType };
  }
}

module.exports = new SystemSettingService();