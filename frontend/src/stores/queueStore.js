// frontend/src/stores/queueStore.js
import { defineStore } from 'pinia';
import queueService from '@/services/queueService';

// Helper function to format date consistently
function formatDate(date) {
  if (!date) {
    return new Date().toISOString().split('T')[0];
  }
  
  if (typeof date === 'string') {
    // Check if it's already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    // Try to parse it
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  }
  
  if (date instanceof Date && !isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
  
  // Default to today if all else fails
  return new Date().toISOString().split('T')[0];
}

export const useQueueStore = defineStore('queue', {
  state: () => ({
    currentServing: null,
    waitingList: [],
    waitingCount: 0,
    stats: {
      completed: 0,
      skipped: 0,
      noShow: 0
    },
    loading: false,
    error: null,
    currentDate: null // Store the current date being viewed
  }),

  actions: {
    async loadQueue(office, date = null) {
      this.loading = true;
      this.error = null;
      this.currentDate = date;
      
      try {
        // Ensure date is properly formatted
        const formattedDate = formatDate(date);
        const data = await queueService.getQueueState(office, formattedDate);
        
        this.currentServing = data.current_serving;
        this.waitingList = data.waiting_list;
        this.waitingCount = data.waiting_count;
        this.stats = data.stats;
        
        return data;
      } catch (error) {
        this.error = error.message;
        console.error('Failed to load queue:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async addToQueue(office, patientId, appointmentId = null, date = null) {
      this.loading = true;
      this.error = null;
      
      try {
        const formattedDate = formatDate(date);
        const result = await queueService.addToQueue(office, patientId, appointmentId, formattedDate);
        await this.loadQueue(office, formattedDate);
        return result;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async callNext(office, date = null) {
      this.loading = true;
      this.error = null;
      
      try {
        const formattedDate = formatDate(date);
        const result = await queueService.callNext(office, formattedDate);
        await this.loadQueue(office, formattedDate);
        return result;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async skipCurrent(office, reason = 'Skipped', date = null) {
      this.loading = true;
      this.error = null;
      
      try {
        const formattedDate = formatDate(date);
        const result = await queueService.skipCurrent(office, reason, formattedDate);
        await this.loadQueue(office, formattedDate);
        return result;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async completeCurrent(office, date = null) {
      this.loading = true;
      this.error = null;
      
      try {
        const formattedDate = formatDate(date);
        const result = await queueService.completeCurrent(office, formattedDate);
        await this.loadQueue(office, formattedDate);
        return result;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async markNoShow(office, queueEntryId, date = null) {
      this.loading = true;
      this.error = null;
      
      try {
        const formattedDate = formatDate(date);
        const result = await queueService.markNoShow(office, queueEntryId, formattedDate);
        await this.loadQueue(office, formattedDate);
        return result;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async resetQueue(office, date = null) {
      this.loading = true;
      this.error = null;
      
      try {
        // Ensure date is properly formatted as YYYY-MM-DD
        const formattedDate = formatDate(date);
        const result = await queueService.resetQueue(office, formattedDate);
        return result;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    updateQueueFromSocket(data) {
      if (data.office) {
        this.loadQueue(data.office, this.currentDate);
      }
    },

    // Helper method to clear queue state
    clearQueue() {
      this.currentServing = null;
      this.waitingList = [];
      this.waitingCount = 0;
      this.stats = {
        completed: 0,
        skipped: 0,
        noShow: 0
      };
      this.error = null;
    },

    // Get a specific waiting patient by queue entry ID
    getWaitingPatient(queueEntryId) {
      return this.waitingList.find(item => item.id === queueEntryId);
    },

    // Check if a patient is currently being served
    isPatientServing(patientId) {
      return this.currentServing && this.currentServing.patient_id === patientId;
    }
  },

  getters: {
    // Get the position of a patient in the waiting list
    getPatientPosition: (state) => (patientId) => {
      const index = state.waitingList.findIndex(item => item.patient_id === patientId);
      return index >= 0 ? index + 1 : -1;
    },

    // Get the next patient in waiting list
    getNextPatient: (state) => {
      return state.waitingList.length > 0 ? state.waitingList[0] : null;
    },

    // Get waiting count by status
    getWaitingCountByStatus: (state) => (status) => {
      return state.waitingList.filter(item => item.status === status).length;
    },

    // Check if there are any waiting patients
    hasWaitingPatients: (state) => {
      return state.waitingList.length > 0;
    },

    // Get average wait time (if implemented in backend)
    getAverageWaitTime: (state) => {
      // This would need to be calculated from the data
      // For now, return a placeholder
      return state.stats.average_wait_time || 0;
    }
  }
});