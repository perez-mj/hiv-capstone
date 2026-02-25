// frontend/src/api/index.js
import http from './http'

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

// Patients API
export const patientsApi = {
  getAll: () => http.get('/patients/list'),
  getById: (id) => http.get(`/patients/${id}`),
  create: (data) => http.post('/patients', data),
  update: (id, data) => http.put(`/patients/${id}`, data),
  delete: (id) => http.delete(`/patients/${id}`),
  getStats: () => http.get('/patients/stats'),

  getPagination: (params) => http.get('/patients', { params }),

  export: (params) => http.get('/patients/export', {
    params,
    responseType: 'blob'
  })
}

// Appointments API
export const appointmentsApi = {
  // types
  getTypes: () => http.get('/appointments/types'),
  createType: (data) => http.post('/appointments/types', data),
  updateType: (id, data) => http.put(`/appointments/types/${id}`, data),
  deleteType: (id) => http.delete(`/appointments/types/${id}`),

  // apointments
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

  // statistic
  getStats: (params) => http.get('/appointments/stats/summary', { params })
};

// Queue API
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

  // statistic
  getDailyStats: (params) => http.get('/queue/stats/daily', { params }),
  getPeakHoursStats: () => http.get('/queue/stats/peak-hours'),

  // utility
  resetQueue: (params) => http.delete('/queue/reset', { params }),
  getSummary: () => http.get('/queue/current/summary'),
  checkAppointmentInQueue: (appointmentId) => http.get(`/queue/check-appointment/${appointmentId}`)
};

// Audit API
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


// Lab Results API
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


// Kiosk API - Public endpoints (no authentication required)
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
};


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
  patients: patientsApi,
  appointments: appointmentsApi,
  queue: queueApi,
  audit: auditApi,
  users: usersApi,
  labResults: labResultsApi,
   kiosk: kioskApi,
  dashboard: dashboardApi
}