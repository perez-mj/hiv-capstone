// frontend/src/api/index.js
import http from './http'

// ==========================================================================================================
// ADMIN APIs (Updated for new users.js route)
// ==========================================================================================================

// Auth API
export const authApi = {
  login: (credentials) => http.post('/auth/login', credentials),
  check: () => http.get('/auth/check'),
  logout: () => http.post('/auth/logout')
}

// Patients API - UPDATED for /patients endpoint
export const patientsApi = {
  getAll: () => http.get('/patients/list'),
  getById: (id) => http.get(`/patients/${id}`),
  create: (data) => http.post('/patients', data),
  update: (id, data) => http.put(`/patients/${id}`, data),
  delete: (id) => http.delete(`/patients/${id}`),
  getStats: () => http.get('/patients/stats'),
  // Use the main endpoint for pagination
  getPagination: (params) => http.get('/patients', { params })
}

// Appointments API
export const appointmentsApi = {
  getAll: (params) => http.get('/admin/appointments', { params }),
  getCalendar: (params) => http.get('/admin/appointments/calendar', { params }),
  create: (data) => http.post('/admin/appointments', data),
  update: (id, data) => http.put(`/admin/appointments/${id}`, data),
  cancel: (id) => http.put(`/admin/appointments/${id}/cancel`),
  getStats: () => http.get('/admin/appointments/stats')
}

// Audit API
export const auditApi = {
  getLogs: (params) => http.get('/audit/logs', { params }),
  getStats: () => http.get('/audit/stats')
}

// Users API (Updated for new route structure)
export const usersApi = {
  // Get all users
  getAll: () => http.get('/users'),
  // Get single user by ID
  getById: (id) => http.get(`/users/${id}`),
  // Create new user
  create: (data) => http.post('/users', data),
  // Update user
  update: (id, data) => http.put(`/users/${id}`, data),
  // Delete user
  delete: (id) => http.delete(`/users/${id}`),
  // Toggle user status (activate/deactivate)
  toggleStatus: (id) => http.put(`/users/${id}/toggle-status`),
  // Change user password
  changePassword: (id, data) => http.put(`/users/${id}/password`, data),
  // Get user statistics
  getStats: () => http.get('/users/stats')
}

// ==========================================================================================================
// SIMPLE VERSION - Only includes what's actually implemented
// ==========================================================================================================

export default {
  auth: authApi,
  patients: patientsApi,
  appointments: appointmentsApi,
  audit: auditApi,
  users: usersApi
}