// frontend/src/stores/queueStore.js
import { defineStore } from 'pinia';
import queueService from '@/services/queueService';

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
    error: null
  }),

  actions: {
    async loadQueue(office, date = null) {
      this.loading = true;
      this.error = null;
      try {
        const data = await queueService.getQueueState(office, date);
        this.currentServing = data.current_serving;
        this.waitingList = data.waiting_list;
        this.waitingCount = data.waiting_count;
        this.stats = data.stats;
      } catch (error) {
        this.error = error.message;
        console.error('Failed to load queue:', error);
      } finally {
        this.loading = false;
      }
    },

    async callNext(office) {
      try {
        const result = await queueService.callNext(office);
        await this.loadQueue(office);
        return result;
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },

    async skipCurrent(office, reason = 'Skipped') {
      try {
        const result = await queueService.skipCurrent(office, reason);
        await this.loadQueue(office);
        return result;
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },

    updateQueueFromSocket(data) {
      if (data.office) {
        this.loadQueue(data.office);
      }
    }
  }
});