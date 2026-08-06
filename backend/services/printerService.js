// backend/services/printerService.js
const axios = require('axios');

class PrinterService {
    constructor() {
    this.printerUrl = process.env.PRINTER_SERVICE_URL || 'http://localhost:5000';
    this.timeout = parseInt(process.env.PRINTER_TIMEOUT) || 5000;
    this.isAvailable = true;
  }

  /**
   * Print a queue ticket via the printer microservice
   */
  async printTicket(ticketData) {
    try {
      // Always try to print via microservice first
      const response = await axios.post(
        `${this.printerUrl}/api/kiosk/print`,
        { ticketData },
        { timeout: this.timeout }
      );
      
      if (response.data && response.data.success) {
        this.isAvailable = true;
        return {
          success: true,
          method: 'microservice',
          message: 'Ticket printed successfully',
          ...response.data
        };
      } else {
        throw new Error('Print service returned unsuccessful response');
      }
      
    } catch (error) {
      console.error('Printer microservice error:', error.message);
      this.isAvailable = false;
      
      // Log the print job for later recovery
      const fallbackData = {
        timestamp: new Date().toISOString(),
        ticket: ticketData,
        error: error.message
      };
      console.log('FALLBACK PRINT DATA:', JSON.stringify(fallbackData, null, 2));
      
      // Return error so frontend knows to use browser print fallback
      return {
        success: false,
        method: 'fallback',
        message: 'Microservice unavailable',
        error: error.message,
        ticketData,
        frontendFallback: true  // Tell frontend to use browser print
      };
    }
  }

  /**
   * Detect printer status via microservice
   */
  async detectPrinter() {
    try {
      const response = await axios.get(
        `${this.printerUrl}/api/kiosk/printer-status`,
        { timeout: this.timeout }
      );
      this.isAvailable = true;
      return {
        available: true,
        ...response.data.status,
        isAvailable: true
      };
    } catch (error) {
      console.error('Printer status check failed:', error.message);
      this.isAvailable = false;
      return {
        available: false,
        isAvailable: false,
        error: error.message
      };
    }
  }

  /**
   * Get printer service status
   */
  async getStatus() {
    try {
      const response = await axios.get(
        `${this.printerUrl}/api/kiosk/printer-status`,
        { timeout: this.timeout }
      );
      return {
        success: true,
        status: 'online',
        ...response.data
      };
    } catch (error) {
      return {
        success: false,
        status: 'offline',
        error: error.message
      };
    }
  }

  /**
   * Execute printer test
   */
  async testPrinter() {
    try {
      const response = await axios.post(
        `${this.printerUrl}/api/kiosk/printer-test`,
        {},
        { timeout: this.timeout }
      );
      return response.data;
    } catch (error) {
      console.error('Printer test failed:', error.message);
      return {
        success: false,
        message: 'Printer test failed: ' + error.message
      };
    }
  }
}

module.exports = new PrinterService();