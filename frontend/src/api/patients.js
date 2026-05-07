// frontend/src/api/patients.js
import api from './http'

export const patientsApi = {
  // Get all patients with pagination and filters
  getAll: (params = {}) => {
    return api.get('/patients', { params })
  },
  
  // Get single patient by ID
  get: (id) => {
    return api.get(`/patients/${id}`)
  },
  
  // Create new patient
  create: (data) => {
    return api.post('/patients', data)
  },
  
  // Update existing patient
  update: (id, data) => {
    return api.put(`/patients/${id}`, data)
  },
  
  // Delete patient
  delete: (id) => {
    return api.delete(`/patients/${id}`)
  },
  
  // Search patients
  search: (query) => {
    return api.get('/patients/search', { params: { q: query } })
  },
  
  // Get patient statistics
  getStats: () => {
    return api.get('/patients/stats')
  },
  
  // Get patient by facility code
  getByFacilityCode: (code) => {
    return api.get(`/patients/code/${code}`)
  }
}