// frontend/src/services/kioskService.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class KioskService {
  /**
   * Check in patient with existing appointment
   * @param {string} phone - Patient's phone number
   * @returns {Promise} Check-in result with ticket
   */
  async checkIn(phone) {
    try {
      const response = await axios.post(`${API_URL}/kiosk/checkin`, { phone });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message || 'Check-in failed');
      }
      throw new Error('Network error. Please check your connection.');
    }
  }

  /**
   * Register walk-in patient
   * @param {Object} patientData - Patient information
   * @param {string} patientData.first_name - First name
   * @param {string} patientData.last_name - Last name
   * @param {string} patientData.birth_date - Birth date (YYYY-MM-DD)
   * @param {string} patientData.gender - Gender (male/female/other)
   * @param {string} patientData.contact_number - Phone number
   * @param {string} patientData.address - Address (optional)
   * @param {string} patientData.guardian_name - Guardian name (optional)
   * @param {string} patientData.guardian_contact - Guardian contact (optional)
   * @param {string} office - Office to check in (testing/treatment)
   * @returns {Promise} Walk-in result with ticket
   */
  async walkIn(patientData, office = 'testing') {
    try {
      const response = await axios.post(`${API_URL}/kiosk/walkin`, {
        ...patientData,
        office
      });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message || 'Walk-in registration failed');
      }
      throw new Error('Network error. Please check your connection.');
    }
  }

  /**
   * Get display state for public screen
   * @param {string} office - Office (testing/treatment)
   * @returns {Promise} Display state with queue information
   */
  async getDisplayState(office) {
    try {
      const response = await axios.get(`${API_URL}/kiosk/display/${office}`);
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message || 'Failed to get display state');
      }
      throw new Error('Network error. Please check your connection.');
    }
  }

  /**
   * Get kiosk status
   * @returns {Promise} Kiosk status
   */
  async getStatus() {
    try {
      const response = await axios.get(`${API_URL}/kiosk/status`);
      return response.data;
    } catch (error) {
      return { status: 'offline', error: error.message };
    }
  }
}

export default new KioskService();