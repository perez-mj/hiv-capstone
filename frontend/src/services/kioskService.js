// frontend/src/services/kioskService.js
import api from '@/plugins/axios'

class KioskService {
  async checkIn(phone) {
    try {
      const response = await api.post('/kiosk/checkin', { phone })
      return response.data
    } catch (error) {
      console.error('Check-in failed:', error)
      throw error
    }
  }

  async walkIn(patientData, office = 'testing') {
    try {
      const response = await api.post('/kiosk/walkin', { 
        ...patientData, 
        office 
      })
      return response.data
    } catch (error) {
      console.error('Walk-in failed:', error)
      throw error
    }
  }

  /**
   * Check if patient exists by phone number
   * This is used by the kiosk to auto-fill returning patient info
   */
  async checkPatientExists(phone) {
    try {
      const response = await api.get(`/kiosk/patient-exists/${phone}`)
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
      return { exists: false, patient: null }
    }
  }

  async getDisplayState(office) {
    try {
      const response = await api.get(`/kiosk/display/${office}`)
      return response.data
    } catch (error) {
      console.error('Failed to get display state:', error)
      throw error
    }
  }

  async getStatus() {
    try {
      const response = await api.get('/kiosk/status')
      return response.data
    } catch (error) {
      console.error('Failed to get kiosk status:', error)
      throw error
    }
  }

  async printTicket(ticketData) {
    try {
      const response = await api.post('/kiosk/print', ticketData)
      return response.data
    } catch (error) {
      console.error('Failed to print ticket:', error)
      throw error
    }
  }

  async getPrinterStatus() {
    try {
      const response = await api.get('/kiosk/printer-status')
      return response.data
    } catch (error) {
      console.error('Failed to get printer status:', error)
      throw error
    }
  }

  async testPrinter() {
    try {
      const response = await api.post('/kiosk/printer-test')
      return response.data
    } catch (error) {
      console.error('Printer test failed:', error)
      throw error
    }
  }
}

export default new KioskService()