// frontend/src/services/settingService.js
import api from '@/plugins/axios';

class SettingService {
  /**
   * Get all settings
   */
  static async getAllSettings() {
    try {
      const response = await api.get('/admin/settings');
      // Transform response to array format with proper typing
      return this.transformSettings(response.data);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get categorized settings
   */
  static async getCategorizedSettings() {
    try {
      const response = await api.get('/admin/settings/categorized');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get settings by category
   */
  static async getSettingsByCategory(category) {
    try {
      const response = await api.get(`/admin/settings/category/${category}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get a single setting by key
   */
  static async getSetting(key) {
    try {
      const response = await api.get(`/admin/settings/${key}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update a setting
   */
  static async updateSetting(key, value, dataType = null) {
    try {
      const response = await api.put(`/admin/settings/${key}`, { 
        value, 
        data_type: dataType 
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update multiple settings
   */
  static async updateMultipleSettings(updates) {
    try {
      const response = await api.put('/admin/settings/batch', { updates });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Create a new setting
   */
  static async createSetting(settingData) {
    try {
      const response = await api.post('/admin/settings', settingData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Delete a setting
   */
  static async deleteSetting(key) {
    try {
      const response = await api.delete(`/admin/settings/${key}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get operational settings (clinic flow)
   */
  static async getOperationalSettings() {
    try {
      const response = await api.get('/admin/settings/operational');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get clinical settings
   */
  static async getClinicalSettings() {
    try {
      const response = await api.get('/admin/settings/clinical');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get kiosk settings
   */
  static async getKioskSettings() {
    try {
      const response = await api.get('/admin/settings/kiosk');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get security settings
   */
  static async getSecuritySettings() {
    try {
      const response = await api.get('/admin/settings/security');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get appearance settings
   */
  static async getAppearanceSettings() {
    try {
      const response = await api.get('/admin/settings/appearance');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Transform settings from API to frontend format
   */
  static transformSettings(settingsData) {
    if (!settingsData || typeof settingsData !== 'object') {
      return [];
    }

    // If settings are categorized, flatten them
    let flatSettings = {};
    if (settingsData.categories || settingsData.data) {
      const data = settingsData.data || settingsData;
      for (const category of Object.values(data)) {
        if (typeof category === 'object' && category !== null) {
          flatSettings = { ...flatSettings, ...category };
        }
      }
    } else {
      flatSettings = settingsData;
    }

    // Convert to array format
    return Object.entries(flatSettings).map(([key, value]) => ({
      key,
      value: this.formatValueForDisplay(value),
      data_type: this.detectDataType(value),
      description: this.getDescriptionForKey(key)
    }));
  }

  /**
   * Format value for display
   */
  static formatValueForDisplay(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }
    return String(value);
  }

  /**
   * Detect data type from value
   */
  static detectDataType(value) {
    if (value === null || value === undefined) return 'string';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'object') return 'json';
    // Check if string is a JSON
    if (typeof value === 'string') {
      try {
        JSON.parse(value);
        return 'json';
      } catch {
        return 'string';
      }
    }
    return 'string';
  }

  /**
   * Get description for common keys
   */
  static getDescriptionForKey(key) {
    const descriptions = {
      // Clinic Operations
      'clinic_start_time': 'Daily clinic opening time',
      'clinic_end_time': 'Daily clinic closing time',
      'slot_duration_minutes': 'Duration of each appointment slot in minutes',
      'max_capacity_per_slot': 'Maximum patients per time slot',
      'lunch_break_start': 'Lunch break start time',
      'lunch_break_end': 'Lunch break end time',
      'daily_capacity_testing': 'Max patients per day in Testing office',
      'daily_capacity_treatment': 'Max patients per day in Treatment office',
      'max_walk_in_per_day': 'Hard limit on unscheduled walk-ins',
      'queue_prefix_testing': 'Prefix for testing queue numbers (T-001)',
      'queue_prefix_treatment': 'Prefix for treatment queue numbers (R-001)',
      'no_show_grace_minutes': 'Minutes after "called" before patient is marked as no-show',

      // Appointment
      'booking_lead_time_minutes': 'Minimum time before a slot a patient can book',
      'advance_booking_days': 'How far into the future patients can book',
      'max_appointments_per_patient_per_day': 'Prevents patients from booking multiple service slots on same day',
      'working_days': 'Days of week when clinic operates',
      'holidays': 'Specific closed dates',

      // Clinical
      'auto_refer_on_positive': 'Automatically change patient status to "treatment" on positive result',
      'default_art_refill_days': 'Default days until next ART refill',
      'default_next_appointment_days': 'Default follow-up interval for stable ART patients',
      'cd4_threshold_critical': 'Low CD4 threshold triggering alerts',
      'viral_load_suppression_threshold': 'Copies/mL threshold used in suppression rate reports',
      'require_pretest_counseling': 'Blocks saving test result without completed pre-test checklist',
      'require_posttest_counseling': 'Blocks saving test result without completed post-test counseling',

      // Kiosk
      'kiosk_print_header': 'Header text printed on thermal receipts',
      'kiosk_print_footer': 'Footer text printed on the slip',
      'kiosk_refresh_interval_seconds': 'How often the Kiosk display polls Socket.IO for updates',

      // Security
      'blockchain_enabled': 'Master toggle for MultiChain logging',
      'max_login_attempts': 'Lock account temporarily after X failed logins',
      'audit_log_retention_years': 'Overrides the standard retention period',
      'access_token_expiry_minutes': 'Access token expiry time in minutes',
      'refresh_token_expiry_days': 'Refresh token expiry time in days',
      'enable_refresh_token_rotation': 'Enable refresh token rotation for enhanced security',
      'session_timeout_minutes': 'User session timeout in minutes',
      'lockout_duration_minutes': 'Account lockout duration after max attempts',

      // Appearance
      'clinic_name': 'Displayed on web portal headers and printed slips',
      'clinic_address': 'Printed on slips and email footers',
      'clinic_contact': 'Emergency contact number',
      'primary_color': 'Vue.js/Vuetify primary theme color',
      'timezone': 'Ensures correct date/time logic offset',

      // Additional
      'appointment_reminder_days': 'Days before appointment to send reminder',
      'appointment_reminder_hours': 'Hours before appointment to send reminder',
      'walkin_priority': 'Walk-in patient priority (after_scheduled or interleaved)',
      'allow_online_booking': 'Allow patients to book appointments online',
      'allow_online_cancellation': 'Allow patients to cancel appointments online',
      'cancellation_deadline_hours': 'Hours before appointment when cancellation is allowed',
      'require_guardian_for_minors': 'Require guardian information for patients under 18',
      'minor_age_limit': 'Age below which patient is considered a minor',
      'blockchain_verify_on_read': 'Verify blockchain hash when reading records',
      'audit_log_retention_days': 'Number of days to retain audit logs (7 years)',
      'enable_sms_notifications': 'Send SMS notifications for appointments',
      'enable_email_notifications': 'Send email notifications for appointments',
      'default_art_regimen': 'Default first-line ART regimen',
      'cd4_threshold': 'CD4 count threshold for treatment initiation'
    };
    return descriptions[key] || '';
  }

  /**
   * Handle API errors
   */
  static handleError(error) {
    const message = error.response?.data?.message || 
                   error.response?.data?.error ||
                   error.message || 
                   'An error occurred';
    return new Error(message);
  }
}

export default SettingService;