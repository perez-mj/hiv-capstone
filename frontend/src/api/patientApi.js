import http from './http'

export const patientApi = {
  // Get all patients
  async getPatients() {
    const response = await http.get('/patients')
    return response
  },

  // Get patient by ID
  async getPatientById(patientId) {
    const response = await http.get(`/patients/${patientId}`)
    return response
  },

  // Create new patient
  async createPatient(patientData) {
    const response = await http.post('/patients/enroll', patientData)
    return response
  },

  // Update patient
  async updatePatient(patientId, patientData) {
    const response = await http.put(`/patients/${patientId}`, patientData)
    return response
  },

  // Delete patient
  async deletePatient(patientId) {
    const response = await http.delete(`/patients/${patientId}`)
    return response
  },

  // Verify DLT integrity
  async verifyDlt(patientId) {
    const response = await http.get(`/dlt/verify/${patientId}`)
    return response
  },

  // Get DLT history
  async getDltHistory(patientId) {
    const response = await http.get(`/dlt/history/${patientId}`)
    return response
  },

  // Get patient statistics
  async getPatientStats() {
    const response = await http.get('/patients/stats/overview')
    return response
  },

  // Search patients
  async searchPatients(query) {
    const response = await http.get(`/patients/search?q=${encodeURIComponent(query)}`)
    return response
  }
}

export default patientApi