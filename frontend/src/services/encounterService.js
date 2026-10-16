// frontend/src/services/encounterService.js
import api from '@/plugins/axios';

export default {
  /**
   * List encounters for a patient. Staff/admin only.
   * @param {Object} params - { patient_id, office?, from?, to?, include_voided? }
   */
  async list(params = {}) {
    const { data } = await api.get('/encounters', { params });
    return Array.isArray(data) ? data : [];
  },

  async get(id) {
    const { data } = await api.get(`/encounters/${id}`);
    return data;
  },
};