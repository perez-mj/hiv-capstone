// frontend/src/stores/kioskStore.js
import { defineStore } from 'pinia';
import kioskService from '@/services/kioskService';
import queueService from '@/services/queueService';

export const useKioskStore = defineStore('kiosk', {
  state: () => ({
    // Check-in state
    isCheckingIn: false,
    checkInError: null,
    checkInSuccess: false,
    
    // Walk-in state
    isWalkingIn: false,
    walkInError: null,
    walkInSuccess: false,
    
    // Ticket data
    currentTicket: null,
    
    // Display state
    displayData: {
      testing: {
        current_serving: null,
        waiting_count: 0,
        waiting_list: [],
        stats: { completed: 0, skipped: 0, noshow: 0 }
      },
      treatment: {
        current_serving: null,
        waiting_count: 0,
        waiting_list: [],
        stats: { completed: 0, skipped: 0, noshow: 0 }
      }
    },
    
    // UI state
    loading: false,
    lastUpdated: null
  }),

  getters: {
    // Testing office display
    testingQueue: (state) => state.displayData.testing,
    
    // Treatment office display
    treatmentQueue: (state) => state.displayData.treatment,
    
    // Check if patient is checked in
    isCheckedIn: (state) => !!state.currentTicket,
    
    // Get ticket queue number
    ticketNumber: (state) => state.currentTicket?.queue_number || null,
    
    // Get ticket office
    ticketOffice: (state) => state.currentTicket?.office || null,
    
    // Get patient name from ticket
    ticketPatientName: (state) => state.currentTicket?.patient_name || null,
    
    // Get waiting position from ticket
    ticketPosition: (state) => state.currentTicket?.waiting_position || null
  },

  actions: {
    /**
     * Check in patient with appointment
     */
    async checkInPatient(phone) {
      this.isCheckingIn = true;
      this.checkInError = null;
      this.loading = true;
      
      try {
        const response = await kioskService.checkIn(phone);
        
        if (response.success && response.data) {
          this.currentTicket = response.data.ticket;
          this.checkInSuccess = true;
          
          // Update display data for the office
          if (response.data.ticket?.office) {
            await this.refreshDisplay(response.data.ticket.office);
          }
          
          return response.data;
        } else {
          throw new Error(response.message || 'Check-in failed');
        }
      } catch (error) {
        this.checkInError = error.message;
        throw error;
      } finally {
        this.isCheckingIn = false;
        this.loading = false;
      }
    },

    /**
     * Register walk-in patient
     */
    async registerWalkIn(patientData, office = 'testing') {
      this.isWalkingIn = true;
      this.walkInError = null;
      this.loading = true;
      
      try {
        const response = await kioskService.walkIn(patientData, office);
        
        if (response.success && response.data) {
          this.currentTicket = response.data.ticket;
          this.walkInSuccess = true;
          
          // Update display data for the office
          if (response.data.ticket?.office) {
            await this.refreshDisplay(response.data.ticket.office);
          }
          
          return response.data;
        } else {
          throw new Error(response.message || 'Walk-in registration failed');
        }
      } catch (error) {
        this.walkInError = error.message;
        throw error;
      } finally {
        this.isWalkingIn = false;
        this.loading = false;
      }
    },

    /**
     * Refresh display data for a specific office
     */
    async refreshDisplay(office) {
      try {
        const response = await kioskService.getDisplayState(office);
        
        if (response.success && response.data) {
          this.displayData[office] = response.data;
          this.lastUpdated = new Date().toISOString();
        }
      } catch (error) {
        console.error(`Failed to refresh display for ${office}:`, error);
      }
    },

    /**
     * Refresh all office displays
     */
    async refreshAllDisplays() {
      await Promise.all([
        this.refreshDisplay('testing'),
        this.refreshDisplay('treatment')
      ]);
    },

    /**
     * Update display from socket event
     */
    updateDisplayFromSocket(data) {
      if (data.office) {
        this.refreshDisplay(data.office);
      }
    },

    /**
     * Reset check-in state (clear ticket)
     */
    resetCheckIn() {
      this.currentTicket = null;
      this.checkInSuccess = false;
      this.walkInSuccess = false;
      this.checkInError = null;
      this.walkInError = null;
    },

    /**
     * Clear all errors
     */
    clearErrors() {
      this.checkInError = null;
      this.walkInError = null;
    }
  }
});