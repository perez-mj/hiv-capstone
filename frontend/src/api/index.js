// frontend/src/api/index.js
import http from './http'

// ==========================================================================================================
// ADMIN APIs (Based on your schema and routes)
// ==========================================================================================================

// Auth API
export const authApi = {
  login: (credentials) => http.post('/auth/login', credentials),
  check: () => http.get('/auth/check'),
  logout: () => http.post('/auth/logout')
}

// Patients API
export const patientsApi = {
  // List for dropdown/search
  getAll: () => http.get('/patients/list'),
  // Single patient details
  getById: (id) => http.get(`/patients/${id}`),
  // Create new patient
  create: (data) => http.post('/patients', data),
  // Update patient
  update: (id, data) => http.put(`/patients/${id}`, data),
  // Delete patient
  delete: (id) => http.delete(`/patients/${id}`),
  // Dashboard statistics
  getStats: () => http.get('/patients/stats'),
  // Paginated patient list
  getPagination: (params) => http.get('/patients/pagination', { params })
}

// Audit API
export const auditApi = {
  getLogs: (params) => http.get('/audit/logs', { params }),
  getStats: () => http.get('/audit/stats')
}

// Users API (for admin management)
export const usersApi = {
  getAll: () => http.get('/admin/users'),
  getById: (id) => http.get(`/admin/users/${id}`),
  create: (data) => http.post('/admin/users', data),
  update: (id, data) => http.put(`/admin/users/${id}`, data),
  delete: (id) => http.delete(`/admin/users/${id}`),
  toggleStatus: (id) => http.put(`/admin/users/${id}/toggle-status`),
  changePassword: (id, data) => http.put(`/admin/users/${id}/password`, data)
}

// ==========================================================================================================
// SIMPLE VERSION - Only includes what's actually implemented based on your schema
// ==========================================================================================================

export default {
  // Currently implemented APIs
  auth: authApi,
  patients: patientsApi,
  audit: auditApi,
  users: usersApi
  // Note: dashboardApi removed since no backend route exists
}