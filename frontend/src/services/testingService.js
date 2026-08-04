// frontend/src/services/testingService.js
import api from '@/plugins/axios'

export default {
  async createEncounter(data) {
    const response = await api.post('/testing/encounter', data)
    return response.data
  },

  async getPatientEncounters(patientId) {
    const response = await api.get(`/testing/encounters/${patientId}`)
    return response.data
  },

  async getEncounter(id) {
    const response = await api.get(`/testing/encounter/${id}`)
    return response.data
  },

  async updateEncounter(id, data) {
    const response = await api.put(`/testing/encounter/${id}`, data)
    return response.data
  }
}