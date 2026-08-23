// frontend/src/services/appointmentSettingService.js
import api from '@/plugins/axios';

const BASE_URL = '/appointment-settings';

export default {
  // Get all appointment settings
  async getAll() {
    const response = await api.get(BASE_URL);
    return response.data;
  },

  // Get settings for a specific office
  async getByOffice(office = null) {
    const url = office ? `${BASE_URL}/office/${office}` : `${BASE_URL}/office/null`;
    const response = await api.get(url);
    return response.data;
  },

  // Get a single setting by ID
  async getById(id) {
    const response = await api.get(`${BASE_URL}/${id}`);
    return response.data;
  },

  // Create a new appointment setting
  async create(data) {
    const response = await api.post(BASE_URL, data);
    return response.data;
  },

  // Update an appointment setting
  async update(id, data) {
    const response = await api.put(`${BASE_URL}/${id}`, data);
    return response.data;
  },

  // Delete an appointment setting
  async delete(id) {
    const response = await api.delete(`${BASE_URL}/${id}`);
    return response.data;
  },

  // Toggle active status
  async toggleActive(id) {
    const response = await api.patch(`${BASE_URL}/${id}/toggle`);
    return response.data;
  },

  // Apply settings to all offices
  async applyToAll(sourceSettingId, targetOffice = null) {
    const response = await api.post(`${BASE_URL}/apply-to-all`, {
      sourceSettingId,
      targetOffice
    });
    return response.data;
  }
};