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

// Patients API - COMPLETELY ALIGNED WITH YOUR BACKEND ROUTES
export const patientsApi = {
  // GET all patients with pagination and filters - matches your /patients route
  getAll: (params) => http.get('/patients', { params }),
  
  // Alias for getAll to maintain compatibility
  getPagination: (params) => http.get('/patients', { params }),

  // GET patient statistics - matches your /patients/stats/overview route
  getStats: () => http.get('/patients/stats/overview'),

  // SEARCH patients for dropdown - matches your /patients/search/query route
  search: (query, limit = 10) => http.get('/patients/search/query', { 
    params: { q: query, limit } 
  }),

  // GET single patient by ID - matches your /patients/:id route
  getById: (id) => http.get(`/patients/${id}`),

  // CREATE new patient - matches your POST /patients route
  create: (data) => http.post('/patients', data),

  // UPDATE patient - matches your PUT /patients/:id route
  update: (id, data) => http.put(`/patients/${id}`, data),

  // DELETE patient (soft delete) - matches your DELETE /patients/:id route
  delete: (id) => http.delete(`/patients/${id}`),

  // GET patient summary/dashboard data - matches your /patients/:id/summary route
  getSummary: (id) => http.get(`/patients/${id}/summary`),

  // GET patient appointments - matches your /patients/:id/appointments route
  getAppointments: (id, params) => http.get(`/patients/${id}/appointments`, { params }),

  // GET patient lab results - matches your /patients/:id/lab-results route
  getLabResults: (id, params) => http.get(`/patients/${id}/lab-results`, { params }),

  // GET patient clinical encounters - matches your /patients/:id/encounters route
  getEncounters: (id, params) => http.get(`/patients/${id}/encounters`, { params }),

  // GET patient queue history - matches your /patients/:id/queue-history route
  getQueueHistory: (id, params) => http.get(`/patients/${id}/queue-history`, { params }),

  // Export functionality (if you add this route later)
  export: (params) => http.get('/patients/export', {
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
  updateStatus: (id, status) => http.patch(`/appointments/${id}/status`, { status }),
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
  getAll: () => http.get('/users'),
  getById: (id) => http.get(`/users/${id}`),
  create: (data) => http.post('/users', data),
  update: (id, data) => http.put(`/users/${id}`, data),
  delete: (id) => http.delete(`/users/${id}`),
  toggleStatus: (id) => http.put(`/users/${id}/toggle-status`),
  changePassword: (id, data) => http.put(`/users/${id}/password`, data),
  getStats: () => http.get('/users/stats')
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
  patient: patientApi, // ADD THIS
  patients: patientsApi,
  appointments: appointmentsApi,
  queue: queueApi,
  audit: auditApi,
  users: usersApi,
  labResults: labResultsApi,
  kiosk: kioskApi,
  dashboard: dashboardApi
}