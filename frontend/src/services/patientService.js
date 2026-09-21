// frontend/src/services/patientService.js
import api from '@/plugins/axios'

export default {
  /**
   * List patients with pagination and search
   */
  async getPatients(page = 1, limit = 20, search = '') {
    const response = await api.get('/patients', {
      params: { page, limit, search }
    })
    return response.data
  },

  /**
   * Get a single patient by ID
   */
  async getPatient(id) {
    const response = await api.get(`/patients/${id}`)
    return response.data
  },

  /**
   * Search patients by facility code (backend supports LIKE on code)
   */
  async searchPatients(query, limit = 10) {
    if (!query || query.length < 2) return []
    const response = await api.get(
      `/patients/search/${encodeURIComponent(query)}`,
      { params: { limit } }
    )
    return response.data
  },

  /**
   * Get own patient profile (patient role)
   */
  async getMyProfile() {
    const response = await api.get('/patients/me')
    return response.data
  },

  /**
   * Create a new patient
   * Payload may include portal account fields:
   *   create_portal_account, username, email, password
   */
  async createPatient(data) {
    const response = await api.post('/patients', data)
    return response.data
  },

  /**
   * Update a patient
   */
  async updatePatient(id, data) {
    const response = await api.put(`/patients/${id}`, data)
    return response.data
  },

  /**
   * Delete a patient (soft by default, hard=true for admin)
   */
  async deletePatient(id, hard = false) {
    const response = await api.delete(`/patients/${id}`, {
      params: { hard }
    })
    return response.data
  },

  /**
   * Patient history (appointments, testing, treatment)
   */
  async getPatientHistory(id) {
    const response = await api.get(`/patients/${id}/history`)
    return response.data
  },

  /**
   * Patient stats
   */
  async getStats() {
    const response = await api.get('/patients/stats')
    return response.data
  },

  /**
   * Regenerate facility code (admin only)
   */
  async regenerateCode(id) {
    const response = await api.post(`/patients/${id}/regenerate-code`)
    return response.data
  },

  /**
   * Validate a facility code format
   */
  async validateCode(code) {
    const response = await api.get(
      `/patients/validate-code/${encodeURIComponent(code)}`
    )
    return response.data
  },

  /**
   * Export patients as JSON or CSV
   */
  async exportPatients(format = 'json', search = '') {
    const response = await api.get('/patients/export', {
      params: { format, search },
      responseType: format === 'csv' ? 'blob' : 'json'
    })
    return response.data
  }
}