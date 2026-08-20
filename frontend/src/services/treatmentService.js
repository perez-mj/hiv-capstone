// frontend/src/services/treatmentService.js
import api from '@/plugins/axios'

export default {
  async createEncounter(data) {
    const response = await api.post('/treatment/encounter', data)
    return response.data
  },

  async getPatientEncounters(patientId) {
    const response = await api.get(`/treatment/encounters/${patientId}`)
    return response.data
  },

  async getEncounter(id) {
    const response = await api.get(`/treatment/encounter/${id}`)
    return response.data
  },

  async updateEncounter(id, data) {
    const response = await api.put(`/treatment/encounter/${id}`, data)
    return response.data
  }
}