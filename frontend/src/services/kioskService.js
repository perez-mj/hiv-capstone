// frontend/src/services/kioskService.js
import api from '@/plugins/axios';

class KioskService {
  /**
   * Join the queue using an existing appointment.
   */
  async joinQueue(phone) {
    try {
      const response = await api.post('/kiosk/queue', { phone });
      return response.data;
    } catch (error) {
      console.error('Queue join failed:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  }

  async walkIn(patientData, office = 'testing') {
    try {
      const response = await api.post('/kiosk/walkin', {
        ...patientData,
        office,
        transaction_type_id: patientData.transaction_type_id || null,
        is_returning: patientData.is_returning || false
      });
      return response.data;
    } catch (error) {
      console.error('Walk-in failed:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  }

  /**
   * Patient existence check — read-only.
   */
  async checkPatientExists(phone) {
    try {
      const response = await api.get(
        `/kiosk/patient-exists/${encodeURIComponent(phone)}`
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        console.warn('patient-exists endpoint not implemented.');
        return { exists: false, patient: null };
      }
      console.error('Failed to check patient existence:', error);
      return { exists: false, patient: null, error: error.message };
    }
  }

  async getDisplayState(office) {
    try {
      const response = await api.get(`/kiosk/display/${office}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get display state:', error);
      throw error;
    }
  }
}

export default new KioskService();