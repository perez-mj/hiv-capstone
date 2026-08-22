// backend/services/settingService.js
const db = require('../models');

class SettingService {
  /**
   * Get all settings as a flat object
   */
  static async getAllSettings() {
    return await db.SystemSetting.getSettingsObject();
  }

  /**
   * Get settings by category
   */
  static async getSettingsByCategory(category) {
    const settings = await db.SystemSetting.getByCategory(category);
    const result = {};
    for (const setting of settings) {
      result[setting.key] = setting.getTypedValue();
    }
    return result;
  }

  /**
   * Get categorized settings
   */
  static async getCategorizedSettings() {
    return await db.SystemSetting.getCategorizedSettings();
  }

  /**
   * Get a single setting by key
   */
  static async getSetting(key) {
    const setting = await db.SystemSetting.findOne({ where: { key } });
    if (!setting) return null;
    return setting.getTypedValue();
  }

  /**
   * Update a single setting
   */
  static async updateSetting(key, value, dataType = null) {
    const setting = await db.SystemSetting.findOne({ where: { key } });
    if (!setting) throw new Error(`Setting "${key}" not found`);

    // Auto-detect data type if not provided
    if (!dataType) {
      if (typeof value === 'boolean') dataType = 'boolean';
      else if (typeof value === 'number') dataType = 'number';
      else if (typeof value === 'object') dataType = 'json';
      else dataType = 'string';
    }

    let stringValue = String(value);
    if (dataType === 'json' && typeof value === 'object') {
      stringValue = JSON.stringify(value);
    }

    setting.value = stringValue;
    setting.data_type = dataType;
    await setting.save();
    
    return setting.getTypedValue();
  }

  /**
   * Update multiple settings
   */
  static async updateMultipleSettings(updates) {
    return await db.SystemSetting.updateMany(updates);
  }

  /**
   * Get clinic operational settings (for queue/clinic flow)
   */
  static async getOperationalSettings() {
    const categories = ['clinic_operations', 'appointment', 'queue'];
    const result = {};
    for (const category of categories) {
      const settings = await this.getSettingsByCategory(category);
      Object.assign(result, settings);
    }
    return result;
  }

  /**
   * Get clinical workflow settings
   */
  static async getClinicalSettings() {
    return await this.getSettingsByCategory('clinical');
  }

  /**
   * Get security settings
   */
  static async getSecuritySettings() {
    return await this.getSettingsByCategory('security');
  }

  /**
   * Get kiosk settings
   */
  static async getKioskSettings() {
    return await this.getSettingsByCategory('kiosk');
  }

  /**
   * Get appearance settings
   */
  static async getAppearanceSettings() {
    return await this.getSettingsByCategory('appearance');
  }

  /**
   * Validate if a booking time is within allowed hours
   */
  static async isValidBookingTime(date, timeSlot) {
    const settings = await this.getOperationalSettings();
    
    // Check if it's a working day
    const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const dayOfWeek = dayMap[date.getDay()];
    if (!settings.working_days || !settings.working_days.includes(dayOfWeek)) {
      return { valid: false, reason: 'Clinic is closed on this day' };
    }

    // Check if it's a holiday
    const dateStr = date.toISOString().split('T')[0];
    if (settings.holidays && settings.holidays.includes(dateStr)) {
      return { valid: false, reason: 'Clinic is closed on this date (holiday)' };
    }

    // Check if within clinic hours
    const [startHour, startMin] = settings.clinic_start_time.split(':').map(Number);
    const [endHour, endMin] = settings.clinic_end_time.split(':').map(Number);
    const [slotHour, slotMin] = timeSlot.split(':').map(Number);

    const slotMinutes = slotHour * 60 + slotMin;
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (slotMinutes < startMinutes || slotMinutes >= endMinutes) {
      return { valid: false, reason: 'Outside clinic operating hours' };
    }

    // Check lunch break
    if (settings.lunch_break_start && settings.lunch_break_end) {
      const [lunchStartH, lunchStartM] = settings.lunch_break_start.split(':').map(Number);
      const [lunchEndH, lunchEndM] = settings.lunch_break_end.split(':').map(Number);
      const lunchStart = lunchStartH * 60 + lunchStartM;
      const lunchEnd = lunchEndH * 60 + lunchEndM;

      if (slotMinutes >= lunchStart && slotMinutes < lunchEnd) {
        return { valid: false, reason: 'Clinic is closed for lunch break' };
      }
    }

    return { valid: true };
  }
}

module.exports = SettingService;