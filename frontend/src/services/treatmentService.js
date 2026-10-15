// frontend/src/services/treatmentService.js
import api from '@/plugins/axios';

export default {
  async getEncounters(params = {}) {
    const { data } = await api.get('/encounters/office/treatment', { params });
    return data;
  },

  async getEncounter(id) {
    const { data } = await api.get(`/encounters/${id}`);
    return data;
  },

  async createEncounter(payload) {
    const { data } = await api.post('/encounters/office/treatment', payload);
    return data;
  },

  async updateEncounter(id, payload) {
    const { data } = await api.put(`/encounters/${id}`, payload);
    return data;
  },

  async voidEncounter(id, reason) {
    const { data } = await api.put(`/encounters/${id}/void`, { reason });
    return data;
  },
};