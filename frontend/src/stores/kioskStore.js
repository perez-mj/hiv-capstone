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
    ticketNumber: null,
    ticketOffice: null,
    ticketPosition: null,
    ticketPatientName: null,
    ticketPatientFacilityCode: null,

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
    ticketNumber: (state) => {
      // First try from currentTicket
      if (state.currentTicket?.queue_number) {
        return state.currentTicket.queue_number;
      }
      // Then try from state
      if (state.ticketNumber) {
        return state.ticketNumber;
      }
      // Fallback
      return null;
    },

    // Get ticket office
    ticketOffice: (state) => {
      if (state.currentTicket?.office) {
        return state.currentTicket.office;
      }
      return state.ticketOffice || null;
    },

    // Get patient name from ticket
    ticketPatientName: (state) => {
      if (state.currentTicket?.patient_name) {
        return state.currentTicket.patient_name;
      }
      return state.ticketPatientName || null;
    },

    // Get waiting position from ticket
    ticketPosition: (state) => {
      if (state.currentTicket?.waiting_position) {
        return state.currentTicket.waiting_position;
      }
      return state.ticketPosition || null;
    },

    // Get patient facility code
    patientFacilityCode: (state) => {
      if (state.currentTicket?.patient_facility_code) {
        return state.currentTicket.patient_facility_code;
      }
      if (state.currentTicket?.Patient?.patient_facility_code) {
        return state.currentTicket.Patient.patient_facility_code;
      }
      return state.ticketPatientFacilityCode || null;
    }
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
        console.log('=== RAW CHECK-IN RESPONSE ===');
console.log(JSON.stringify(response, null, 2));
console.log('==============================');

        if (response.success && response.data) {
          // Store ticket data
          const ticket = response.data.ticket;
          const patient = response.data.patient;
          const appointment = response.data.appointment;

          // Ensure queue_number is properly set from the ticket
          const queueNumber = ticket?.queue_number || response.data.queue_number || null;
          const waitingPosition = ticket?.waiting_position || response.data.waiting_position || null;

          // Set all ticket data with explicit values
          this.currentTicket = {
            queue_number: queueNumber,
            patient_name: ticket?.patient_name || patient?.name || null,
            patient_facility_code: patient?.facility_code || patient?.patient_facility_code || null,
            office: ticket?.office || appointment?.office || null,
            waiting_position: waitingPosition,
            ...ticket
          };

          this.ticketNumber = queueNumber;
          this.ticketOffice = ticket?.office || appointment?.office || null;
          this.ticketPosition = waitingPosition;
          this.ticketPatientName = ticket?.patient_name || patient?.name || null;
          this.ticketPatientFacilityCode = patient?.facility_code || patient?.patient_facility_code || null;

          this.checkInSuccess = true;

          // Update display data for the office
          if (this.ticketOffice) {
            await this.refreshDisplay(this.ticketOffice);
          }

          console.log('Check-in successful. Ticket data:', {
            queueNumber: this.ticketNumber,
            position: this.ticketPosition,
            office: this.ticketOffice,
            ticket: this.currentTicket
          });

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

        console.log('=== RAW WALK-IN RESPONSE ===');
console.log(JSON.stringify(response, null, 2));
console.log('============================');

        if (response.success && response.data) {
          // Store ticket data
          const ticket = response.data.ticket;
          const patient = response.data.patient;
          const appointment = response.data.appointment;

          // Ensure queue_number is properly set from the ticket
          const queueNumber = ticket?.queue_number || response.data.queue_number || null;
          const waitingPosition = ticket?.waiting_position || response.data.waiting_position || null;

          // Set all ticket data with explicit values
          this.currentTicket = {
            queue_number: queueNumber,
            patient_name: ticket?.patient_name || patient?.name || null,
            patient_facility_code: patient?.facility_code || patient?.patient_facility_code || null,
            office: ticket?.office || appointment?.office || office,
            waiting_position: waitingPosition,
            ...ticket
          };

          this.ticketNumber = queueNumber;
          this.ticketOffice = ticket?.office || appointment?.office || office;
          this.ticketPosition = waitingPosition;
          this.ticketPatientName = ticket?.patient_name || patient?.name || null;
          this.ticketPatientFacilityCode = patient?.facility_code || patient?.patient_facility_code || null;

          this.walkInSuccess = true;

          // Update display data for the office
          if (this.ticketOffice) {
            await this.refreshDisplay(this.ticketOffice);
          }

          console.log('Walk-in successful. Ticket data:', {
            queueNumber: this.ticketNumber,
            position: this.ticketPosition,
            office: this.ticketOffice,
            ticket: this.currentTicket
          });

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
      this.ticketNumber = null;
      this.ticketOffice = null;
      this.ticketPosition = null;
      this.ticketPatientName = null;
      this.ticketPatientFacilityCode = null;
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