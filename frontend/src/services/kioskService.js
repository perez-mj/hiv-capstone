// Configuration
const API_BASE_URL = import.meta.env.VITE_KIOSK_API_URL || 'http://localhost:5000';
const SHUTDOWN_TOKEN = import.meta.env.VITE_SHUTDOWN_TOKEN || 'your_secure_token_here';

class KioskApiService {
  // Print ticket
  async printTicket(ticketData) {
    const response = await fetch(`${API_BASE_URL}/api/kiosk/print`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ticketData })
    });
    
    if (!response.ok) {
      throw new Error(`Print failed: ${response.status}`);
    }
    
    return response.json();
  }

  // Check printer status
  async getPrinterStatus() {
    const response = await fetch(`${API_BASE_URL}/api/kiosk/printer-status`);
    return response.json();
  }

  // Test printer
  async testPrinter() {
    const response = await fetch(`${API_BASE_URL}/api/kiosk/printer-test`, {
      method: 'POST'
    });
    return response.json();
  }

  // Shutdown system
  async shutdownSystem() {
    const response = await fetch(`${API_BASE_URL}/api/system/shutdown`, {
      method: 'POST',
      headers: {
        'Authorization': SHUTDOWN_TOKEN,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Shutdown failed');
    }
    
    return response.json();
  }

  // Reboot system
  async rebootSystem() {
    const response = await fetch(`${API_BASE_URL}/api/system/reboot`, {
      method: 'POST',
      headers: {
        'Authorization': SHUTDOWN_TOKEN,
        'Content-Type': 'application/json'
      }
    });
    return response.json();
  }

  // Cancel shutdown
  async cancelShutdown() {
    const response = await fetch(`${API_BASE_URL}/api/system/cancel-shutdown`, {
      method: 'POST',
      headers: {
        'Authorization': SHUTDOWN_TOKEN,
        'Content-Type': 'application/json'
      }
    });
    return response.json();
  }

  // Health check
  async getHealth() {
    const response = await fetch(`${API_BASE_URL}/api/system/health`);
    return response.json();
  }
}

export default new KioskApiService();