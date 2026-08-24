// frontend/src/services/printerService.js

// Kiosk microservice URL (separate from main backend)
const KIOSK_API_URL = import.meta.env.VITE_KIOSK_API_URL || 'http://localhost:5000'

class PrinterService {
  /**
   * Print a ticket using the kiosk microservice
   * @param {Object} ticketData - Ticket data to print
   * @returns {Promise} Print response
   */
  async printTicket(ticketData) {
    try {
      // Send directly to kiosk microservice
      const response = await fetch(`${KIOSK_API_URL}/api/kiosk/print`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ticketData })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Print failed: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Print error:', error)
      // Don't throw - just log the error so the user flow isn't blocked
      console.warn('Printing failed but ticket was created successfully.')
      return { success: false, error: error.message }
    }
  }

  /**
   * Check printer status
   * @returns {Promise} Printer status
   */
  async checkPrinterStatus() {
    try {
      const response = await fetch(`${KIOSK_API_URL}/api/kiosk/printer-status`)
      return await response.json()
    } catch (error) {
      console.error('Failed to check printer status:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Print a test page
   * @returns {Promise} Test print response
   */
  async printTest() {
    try {
      const response = await fetch(`${KIOSK_API_URL}/api/kiosk/printer-test`, {
        method: 'POST'
      })
      return await response.json()
    } catch (error) {
      console.error('Test print failed:', error)
      return { success: false, error: error.message }
    }
  }
}

export default new PrinterService()