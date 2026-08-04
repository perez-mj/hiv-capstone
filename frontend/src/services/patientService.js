// frontend/src/services/patientService.js
import api from '@/plugins/axios'

export default {
  async getPatient(id) {
    try {
      const response = await api.get(`/patients/${id}`)
      return response.data
    } catch (error) {
      console.error('Get patient error:', error)
      throw error
    }
  },

  async searchPatients(query) {
    try {
      if (!query || query.length < 2) {
        return []
      }
      const response = await api.get(`/patients/search/${encodeURIComponent(query)}`)
      return response.data
    } catch (error) {
      console.error('Search patients error:', error)
      return []
    }
  },

  async getMyProfile() {
    try {
      const response = await api.get('/patients/me')
      return response.data
    } catch (error) {
      console.error('Get my profile error:', error)
      throw error
    }
  },

  async updatePatient(id, data) {
    try {
      const response = await api.put(`/patients/${id}`, data)
      return response.data
    } catch (error) {
      console.error('Update patient error:', error)
      throw error
    }
  },

  async getPatientHistory(id) {
    try {
      const response = await api.get(`/patients/${id}/history`)
      return response.data
    } catch (error) {
      console.error('Get patient history error:', error)
      throw error
    }
  },

  async createPatient(data) {
    try {
      const response = await api.post('/patients', data)
      return response.data
    } catch (error) {
      console.error('Create patient error:', error)
      throw error
    }
  },

  async getPatients(page = 1, limit = 20, search = '') {
    try {
      const response = await api.get('/patients', {
        params: { page, limit, search }
      })
      return response.data
    } catch (error) {
      console.error('Get patients error:', error)
      throw error
    }
  }
}