// frontend/src/api/index.js
import http from './http'

// ==========================================================================================================
// PATIENT API - ADD THIS SECTION (for patient portal)
// ==========================================================================================================
export const patientApi = {
  // Dashboard - get patient's own data
  getDashboard: () => http.get('/patients/me/dashboard'),
  
  // Profile - get/update patient's own profile
  getProfile: () => http.get('/patients/me'),
  updateProfile: (data) => http.put('/patients/me', data),
  
  // Appointments - patient's own appointments
  getAppointments: (params) => http.get('/appointments/patient/me/history', { params }),
  getUpcomingAppointments: () => http.get('/appointments/patient/me/upcoming'),
  getNextAppointment: () => http.get('/appointments/patient/me/next'),
  bookAppointment: (data) => http.post('/appointments/patient/me/book', data),
  cancelAppointment: (id) => http.delete(`/appointments/patient/me/cancel/${id}`),
  
  // Lab Results - patient's own lab results
  getLabResults: (params) => http.get('/lab-results/patient/me', { params }),
  
  // Queue - patient's queue position
  getQueuePosition: () => http.get('/queue/patient/me'),
  
  // Statistics - patient's own stats
  getStats: () => http.get('/patients/me/stats'),
  
  // Clinical Encounters - patient's own encounters
  getEncounters: (params) => http.get('/clinical-encounters/patient/me', { params })
}

// ==========================================================================================================
// ADMIN APIs (Updated for new schema)
// ==========================================================================================================

// Auth API
export const authApi = {
  login: (credentials) => http.post('/auth/login', credentials),
  check: () => http.get('/auth/check'),
  logout: () => http.post('/auth/logout'),
  changePassword: (data) => http.post('/auth/change-password', data),
  refreshToken: () => http.post('/auth/refresh')
}

export const patientsApi = {
  getAll: (params) => http.get('/patients', { params }),
  getStats: () => http.get('/patients/stats/overview'),
  search: (query, limit = 10) => http.get('/patients/search/query', { params: { q: query, limit } }),
  getById: (id) => http.get(`/patients/${id}`),
  create: (data) => http.post('/patients', data),
  update: (id, data) => http.put(`/patients/${id}`, data),
  delete: (id) => http.delete(`/patients/${id}`),
  getSummary: (id) => http.get(`/patients/${id}/summary`),
  getAppointments: (id, params) => http.get(`/patients/${id}/appointments`, { params }),
  getLabResults: (id, params) => http.get(`/patients/${id}/lab-results`, { params }),
  getEncounters: (id, params) => http.get(`/patients/${id}/encounters`, { params }),
  getQueueHistory: (id, params) => http.get(`/patients/${id}/queue-history`, { params }),
  import: (data) => http.post('/patients/import', data),
  exportCSV: (params) => http.get('/patients/export/csv', { 
    params, 
    responseType: 'blob' 
  })
}

// Appointments API - ALIGNED WITH YOUR BACKEND ROUTES
export const appointmentsApi = {
  // types
  getTypes: () => http.get('/appointments/types'),
  createType: (data) => http.post('/appointments/types', data),
  updateType: (id, data) => http.put(`/appointments/types/${id}`, data),
  deleteType: (id) => http.delete(`/appointments/types/${id}`),

  // appointments
  getAll: (params) => http.get('/appointments', { params }),
  getToday: () => http.get('/appointments/today'),
  getUpcoming: (params) => http.get('/appointments/upcoming', { params }),
  getCalendar: (params) => http.get('/appointments/calendar', { params }),
  getByPatientId: (patientId, params) => http.get(`/appointments/patient/${patientId}`, { params }),
  getNextPatientAppointment: (patientId) => http.get(`/appointments/patient/${patientId}/next`),
  getPatientHistory: (patientId, params) => http.get(`/appointments/patient/${patientId}/history`, { params }),
  getById: (id) => http.get(`/appointments/${id}`),
  create: (data) => http.post('/appointments', data),
  update: (id, data) => http.put(`/appointments/${id}`, data),
  updateStatus: (id, data) => http.patch(`/appointments/${id}/status`, data ),
  delete: (id) => http.delete(`/appointments/${id}`),

  // utility
  checkAvailability: (params) => http.get('/appointments/check-availability', { params }),

  // statistics
  getStats: (params) => http.get('/appointments/stats/summary', { params })
}

// Queue API - ALIGNED WITH YOUR BACKEND ROUTES
export const queueApi = {
  getCurrent: () => http.get('/queue/current'),
  getPosition: (queueNumber) => http.get(`/queue/position/${queueNumber}`),
  getPatientQueue: (patientId) => http.get(`/queue/patient/${patientId}`),
  addToQueue: (data) => http.post('/queue/add', data),
  callPatient: (id, data = {}) => http.post(`/queue/call/${id}`, data),
  startServing: (id) => http.post(`/queue/start-serving/${id}`),
  completeServing: (id) => http.post(`/queue/complete/${id}`),
  skipPatient: (id, data = {}) => http.post(`/queue/skip/${id}`, data),
  reorderQueue: (data) => http.post('/queue/reorder', data),
  getHistory: (params) => http.get('/queue/history', { params }),

  // statistics
  getDailyStats: (params) => http.get('/queue/stats/daily', { params }),
  getPeakHoursStats: () => http.get('/queue/stats/peak-hours'),

  // utility
  resetQueue: (params) => http.delete('/queue/reset', { params }),
  getSummary: () => http.get('/queue/current/summary'),
  checkAppointmentInQueue: (appointmentId) => http.get(`/queue/check-appointment/${appointmentId}`)
}

// Audit API - ALIGNED WITH YOUR BACKEND ROUTES
export const auditApi = {
  getLogs: (params) => http.get('/audit/logs', { params }),
  getStats: () => http.get('/audit/stats'),
  export: (params) => http.get('/audit/export', { params, responseType: 'blob' })
}

// Users API (Admin/Staff/Patient Account Management)
export const usersApi = {
  getAll: (params) => http.get('/users', { params }),
  getStats: () => http.get('/users/stats'),
  getById: (id) => http.get(`/users/${id}`),
  getActivity: (id, params) => http.get(`/users/${id}/activity`, { params }),
  create: (data) => http.post('/users', data),
  update: (id, data) => http.put(`/users/${id}`, data),
  toggleStatus: (id) => http.put(`/users/${id}/toggle-status`),
  changePassword: (id, data) => http.put(`/users/${id}/password`, data),
  delete: (id) => http.delete(`/users/${id}`)
}

// Lab Results API - ALIGNED WITH YOUR BACKEND ROUTES
export const labResultsApi = {
  getAll: (params) => http.get('/lab-results', { params }),
  create: (data) => http.post('/lab-results', data),
  uploadFile: (id, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return http.post(`/lab-results/${id}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  getTrends: (patientId) => http.get(`/lab-results/trends/${patientId}`)
}

// Kiosk API - ALIGNED WITH YOUR BACKEND ROUTES
export const kioskApi = {
  // Public: Check device status and auto-register if needed
  checkStatus: (deviceId) => http.get(`/kiosk/status/${deviceId}`),
  
  // Public: Get queue data for display on kiosk
  getQueueData: (deviceId) => http.get('/kiosk/queue-data', { 
    params: { device: deviceId } 
  }),

  // Admin: Get all kiosk devices
  getDevices: () => http.get('/kiosk/admin/devices'),
  
  // Admin: Authorize a specific device
  authorizeDevice: (deviceId) => http.post(`/kiosk/admin/devices/${deviceId}/authorize`),
  
  // Admin: Deauthorize a specific device
  deauthorizeDevice: (deviceId) => http.post(`/kiosk/admin/devices/${deviceId}/deauthorize`),
  
  // Admin: Update device name/information
  updateDevice: (deviceId, data) => http.put(`/kiosk/admin/devices/${deviceId}`, data),
  
  // Admin: Delete/remove a device
  deleteDevice: (deviceId) => http.delete(`/kiosk/admin/devices/${deviceId}`)
}

// Dashboard API
export const dashboardApi = {
  getStats: () => http.get('/dashboard/stats'),
  getCharts: () => http.get('/dashboard/charts')
}

// ==========================================================================================================
// EXPORT ALL APIS
// ==========================================================================================================

export default {
  auth: authApi,
  patient: patientApi, 
  patients: patientsApi,
  appointments: appointmentsApi,
  queue: queueApi,
  audit: auditApi,
  users: usersApi,
  labResults: labResultsApi,
  kiosk: kioskApi,
  dashboard: dashboardApi
}