// frontend/src/services/kioskService.js
import api from '@/plugins/axios'

class KioskService {
  /**
   * Check in patient with appointment
   * @param {string} phone - Patient's phone number
   * @returns {Promise} Check-in response
   */
  async checkIn(phone) {
    try {
      const response = await api.post('/kiosk/checkin', { phone })
      return response.data
    } catch (error) {
      console.error('Check-in failed:', error)
      // Extract error message from response if available
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message)
      }
      throw error
    }
  }

/**
 * Register walk-in patient
 * @param {Object} patientData - Patient information
 * @param {string} office - Office name (testing/treatment)
 * @returns {Promise} Walk-in response
 */
async walkIn(patientData, office = 'testing') {
  try {
    const response = await api.post('/kiosk/walkin', { 
      ...patientData, 
      office,
      transaction_type_id: patientData.transaction_type_id || null,
      is_returning: patientData.is_returning || false
    })
    return response.data
  } catch (error) {
    console.error('Walk-in failed:', error)
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message)
    }
    throw error
  }
}

  /**
   * Check if patient exists by phone number
   * This is used by the kiosk to auto-fill returning patient info
   * @param {string} phone - Patient's phone number
   * @returns {Promise<Object>} Patient existence check result
   */
  async checkPatientExists(phone) {
    try {
      const response = await api.get(`/kiosk/patient-exists/${encodeURIComponent(phone)}`)
      return response.data
    } catch (error) {
      // If the endpoint doesn't exist yet, return a friendly response
      if (error.response?.status === 404) {
        console.warn('Patient exists endpoint not implemented yet, falling back to check-in attempt')
        // Try to check in as a fallback - if it succeeds, patient exists
        try {
          await this.checkIn(phone)
          return { exists: true, patient: null }
        } catch {
          return { exists: false, patient: null }
        }
      }
      console.error('Failed to check patient existence:', error)
      return { exists: false, patient: null, error: error.message }
    }
  }

  /**
   * Get display state for public screen
   * @param {string} office - Office name (testing/treatment)
   * @returns {Promise} Display state
   */
  async getDisplayState(office) {
    try {
      const response = await api.get(`/kiosk/display/${office}`)
      return response.data
    } catch (error) {
      console.error('Failed to get display state:', error)
      throw error
    }
  }
}

export default new KioskService()