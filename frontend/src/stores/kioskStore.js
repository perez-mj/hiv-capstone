// frontend/src/stores/kioskStore.js
import { defineStore } from 'pinia';
import kioskService from '@/services/kioskService';

export const useKioskStore = defineStore('kiosk', {
  state: () => ({
    // Queue join state
    isJoiningQueue: false,
    queueJoinError: null,
    queueJoinSuccess: false,

    // Walk-in state
    isWalkingIn: false,
    walkInError: null,
    walkInSuccess: false,

    // Ticket data (local to this kiosk session — may include patient name
    // because it is shown only on the kiosk screen itself, not the public TV)
    currentTicket: null,

    displayData: {
      testing: { current_serving: null, waiting_count: 0, waiting_list: [], stats: { completed: 0, skipped: 0, noshow: 0 } },
      treatment: { current_serving: null, waiting_count: 0, waiting_list: [], stats: { completed: 0, skipped: 0, noshow: 0 } }
    },

    loading: false,
    lastUpdated: null
  }),

  getters: {
    testingQueue: (state) => state.displayData.testing,
    treatmentQueue: (state) => state.displayData.treatment,
    isQueued: (state) => !!state.currentTicket,

    ticketNumber: (state) => state.currentTicket?.queue_number ?? null,
    ticketOffice: (state) => state.currentTicket?.office ?? null,
    ticketPatientName: (state) => state.currentTicket?.patient_name ?? null,
    ticketPosition: (state) => state.currentTicket?.waiting_position ?? null,
    patientFacilityCode: (state) =>
      state.currentTicket?.patient_facility_code ??
      state.currentTicket?.Patient?.patient_facility_code ?? null
  },

  actions: {
    /**
     * Join the queue using an existing appointment.
     */
    async joinQueueWithAppointment(phone) {
      this.isJoiningQueue = true;
      this.queueJoinError = null;
      this.loading = true;

      try {
        const response = await kioskService.joinQueue(phone);

        if (response.success && response.data) {
          const ticket = response.data.ticket || {};
          const patient = response.data.patient || {};
          const appointment = response.data.appointment || {};

          this.currentTicket = {
            queue_number: ticket.queue_number ?? null,
            patient_name: ticket.patient_name ?? patient.name ?? null,
            patient_facility_code:
              patient.facility_code ?? patient.patient_facility_code ?? null,
            office: ticket.office ?? appointment.office ?? null,
            waiting_position: ticket.waiting_position ?? null,
            check_in_time: ticket.check_in_time ?? null,
            is_walk_in: false
          };

          this.queueJoinSuccess = true;

          if (this.currentTicket.office) {
            await this.refreshDisplay(this.currentTicket.office);
          }

          return response.data;
        }
        throw new Error(response.message || 'Queue join failed');
      } catch (error) {
        this.queueJoinError = error.message;
        throw error;
      } finally {
        this.isJoiningQueue = false;
        this.loading = false;
      }
    },

    async registerWalkIn(patientData, office = 'testing') {
      this.isWalkingIn = true;
      this.walkInError = null;
      this.loading = true;

      try {
        const response = await kioskService.walkIn(patientData, office);

        if (response.success && response.data) {
          const ticket = response.data.ticket || {};
          const patient = response.data.patient || {};

          this.currentTicket = {
            queue_number: ticket.queue_number ?? null,
            patient_name: ticket.patient_name ?? patient.name ?? null,
            patient_facility_code:
              patient.facility_code ?? patient.patient_facility_code ?? null,
            office: ticket.office ?? office,
            waiting_position: ticket.waiting_position ?? null,
            check_in_time: ticket.check_in_time ?? null,
            is_walk_in: true
          };

          this.walkInSuccess = true;

          if (this.currentTicket.office) {
            await this.refreshDisplay(this.currentTicket.office);
          }

          return response.data;
        }
        throw new Error(response.message || 'Walk-in registration failed');
      } catch (error) {
        this.walkInError = error.message;
        throw error;
      } finally {
        this.isWalkingIn = false;
        this.loading = false;
      }
    },

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

    async refreshAllDisplays() {
      await Promise.all([
        this.refreshDisplay('testing'),
        this.refreshDisplay('treatment')
      ]);
    },

    updateDisplayFromSocket(data) {
      if (data.office) this.refreshDisplay(data.office);
    },

    resetQueueState() {
      this.currentTicket = null;
      this.queueJoinSuccess = false;
      this.walkInSuccess = false;
      this.queueJoinError = null;
      this.walkInError = null;
    },

    clearErrors() {
      this.queueJoinError = null;
      this.walkInError = null;
    }
  }
});