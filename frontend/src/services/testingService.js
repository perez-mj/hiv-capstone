// frontend/src/services/testingService.js
import api from '@/plugins/axios';

export default {
  /**
   * List encounters for the testing office.
   * @param {Object} params - { patient_id?, from?, to?, include_voided? }
   */
  async getEncounters(params = {}) {
    const { data } = await api.get('/encounters/office/testing', { params });
    return data;
  },

  /**
   * Get a single encounter by id.
   */
  async getEncounter(id) {
    const { data } = await api.get(`/encounters/${id}`);
    return data;
  },

  /**
   * Create a new testing encounter.
   * @param {Object} payload - { patient_id, transaction_type_id, data, notes?, occurred_at? }
   */
  async createEncounter(payload) {
    const { data } = await api.post('/encounters/office/testing', payload);
    return data;
  },

  /**
   * Update an existing encounter (data/notes/transaction_type_id).
   */
  async updateEncounter(id, payload) {
    const { data } = await api.put(`/encounters/${id}`, payload);
    return data;
  },

  /**
   * Void an encounter (soft delete).
   */
  async voidEncounter(id, reason) {
    const { data } = await api.put(`/encounters/${id}/void`, { reason });
    return data;
  },
};