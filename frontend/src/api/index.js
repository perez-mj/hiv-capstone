// frontend/src/api/index.js
import http from './http'  // FIXED: Now properly imports the axios instance

// ==========================================================================================================
// PATIENT API (Patient portal - for logged in patients)
// ==========================================================================================================

export const patientApi = {
  // Profile
  getProfile: () => http.get('/patients/me/profile'),
  updateProfile: (data) => http.put('/patients/me/profile', data),
  getStats: () => http.get('/patients/me/statistics'),
  
  // Appointments - FIXED endpoints
  getAppointments: (params) => http.get('/patients/me/appointments', { params }),
  getUpcomingAppointments: (params) => http.get('/patients/me/appointments/upcoming'),
  getNextAppointment: () => http.get('/patients/me/appointments/next'),
  bookAppointment: (data) => http.post('/patients/me/appointments/book', data),
  cancelAppointment: (id) => http.put(`/patients/me/appointments/${id}/cancel`),
  
  // Lab Results
  getLabResults: (params) => http.get('/patients/me/lab-results', { params }),
  
  // Encounters
  getEncounters: (params) => http.get('/patients/me/encounters', { params }),
  
  // Queue
  getMyQueueStatus: () => http.get('/patients/me/queue'),
  
  // Appointment Types
  getAppointmentTypes: () => http.get('/appointments/types'),
  
  // Availability
  checkAvailability: (datetime, typeId) => http.get('/appointments/availability/check', {
    params: { datetime, type_id: typeId }
  })
}

// ==========================================================================================================
// APPOINTMENT TYPES API (Admin)
// ==========================================================================================================
export const appointmentTypesApi = {
  // FIXED: Use /appointments/types
  getAll: () => http.get('/appointments/types'),
  getById: (id) => http.get(`/appointments/types/${id}`),
  create: (data) => http.post('/appointments/types', data),
  update: (id, data) => http.put(`/appointments/types/${id}`, data),
  delete: (id) => http.delete(`/appointments/types/${id}`)
}

// ==========================================================================================================
// AUTH API
// ==========================================================================================================
export const authApi = {
  login: (credentials) => http.post('/auth/login', credentials),
  check: () => http.get('/auth/check'),
  logout: () => http.post('/auth/logout'),
  changePassword: (data) => http.post('/auth/change-password', data),
  refreshToken: () => http.post('/auth/refresh')
}

// ==========================================================================================================
// PATIENTS API (Admin)
// ==========================================================================================================
export const patientsApi = {
  getAll: (params) => http.get('/patients', { params }),
  getStats: () => http.get('/patients/stats/overview'),
  search: (query, limit = 10) => http.get('/patients/search/query', { params: { q: query, limit } }),
  getById: (id) => http.get(`/patients/${id}`),
  getToday: () => http.get('/appointments/today'),
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
  }),
  linkUserAccount: (id, userId) => http.put(`/patients/${id}/link-user`, { user_id: userId })
}

// ==========================================================================================================
// APPOINTMENTS API (Admin)
// ==========================================================================================================
export const appointmentsApi = {
  getAll: (params) => http.get('/appointments', { params }),
  getById: (id) => http.get(`/appointments/${id}`),
  getToday: () => http.get('/appointments/today'),
  getStatistics: (params) => http.get('/appointments/stats/overview', { params }),
  checkAvailability: (params) => http.get('/appointments/availability/check', { params }),
  getByPatientId: (patientId, params) => http.get(`/appointments/patient/${patientId}`, { params }),
  create: (data) => {
    if (!data.patient_id || !data.appointment_type_id || !data.scheduled_at) {
      throw new Error('Missing required fields for appointment creation');
    }
    return http.post('/appointments', data);
  },
  update: (id, data) => {
    const updateData = {};
    if (data.appointment_type_id !== undefined) updateData.appointment_type_id = data.appointment_type_id;
    if (data.scheduled_at !== undefined) updateData.scheduled_at = data.scheduled_at;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.status !== undefined) updateData.status = data.status;
    return http.put(`/appointments/${id}`, updateData);
  },
  updateStatus: (id, status) => http.patch(`/appointments/${id}/status`, { status }),
  delete: (id) => http.delete(`/appointments/${id}`),
  // Types endpoints
  getTypes: () => http.get('/appointments/types'),
  createType: (data) => http.post('/appointments/types', data),
  updateType: (id, data) => http.put(`/appointments/types/${id}`, data),
  deleteType: (id) => http.delete(`/appointments/types/${id}`)
}

// ==========================================================================================================
// QUEUE API - Updated with stream support
// ==========================================================================================================
export const queueApi = {
  // Public endpoints
  getPublicQueue: () => http.get('/queue/public'),
  getQueueByStream: () => http.get('/queue/current/stream'),
  getWaitingTimeEstimation: () => http.get('/queue/waiting-time'),
  
  // Current queue
  getCurrent: () => http.get('/queue/current'),
  getSummary: () => http.get('/queue/current/summary'),
  
  // Patient specific
  getPatientQueue: (patientId) => http.get(`/queue/patient/${patientId}`),
  getMyQueueStatus: () => http.get('/queue/patient/me'),
  
  // Admin endpoints
  getAll: () => http.get('/queue'),
  getHistory: (params) => http.get('/queue/history', { params }),
  
  // Queue management
  addWalkin: (data) => http.post('/queue/walkin', data),
  confirmAppointment: (appointmentId) => http.post(`/queue/confirm/${appointmentId}`),
  
  // Stream-based calling (NEW - for dual stream system)
  callPatientByStream: (stream) => http.post(`/queue/call-stream/${stream}`),
  
  // Legacy calling methods
  callPatient: (id) => http.post(`/queue/call/${id}`),
  startServing: (id) => http.post(`/queue/start-serving/${id}`),
  completeServing: (id) => http.post(`/queue/complete/${id}`),
  skipPatient: (id, data = {}) => http.post(`/queue/skip/${id}`, data),
  reorderQueue: (data) => http.post('/queue/reorder', data),
  
  // Statistics
  getStatsOverview: () => http.get('/queue/stats/overview'),
  getDailyStats: (params) => http.get('/queue/stats/daily', { params }),
  getPeakHoursStats: () => http.get('/queue/stats/peak-hours'),
  
  // Batch operations
  batchUpdateStatus: (updates) => http.post('/queue/batch-update', updates),
  resetQueue: (params) => http.delete('/queue/reset', { params }),
  checkAppointmentInQueue: (appointmentId) => http.get(`/queue/check-appointment/${appointmentId}`)
}

// ==========================================================================================================
// DASHBOARD API - Updated
// ==========================================================================================================
export const dashboardApi = {
  getAdminDashboard: () => http.get('/dashboard/admin'),
  getNurseDashboard: () => http.get('/dashboard/nurse'),
  getNurseSchedule: (params) => http.get('/dashboard/nurse/schedule', { params }),
  getPatientDashboard: () => http.get('/dashboard/patient'),
  getPublicQueueDisplay: () => http.get('/dashboard/queue/public'),
  
  // Stream-specific dashboard data
  getQueueStreamStats: () => http.get('/queue/current/stream')
}

// ==========================================================================================================
// AUDIT API
// ==========================================================================================================
export const auditApi = {
  getLogs: (params) => http.get('/audit/logs', { params }),
  getStats: () => http.get('/audit/stats'),
  export: (params) => http.get('/audit/export', { params, responseType: 'blob' })
}

// ==========================================================================================================
// USERS API
// ==========================================================================================================
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

// ==========================================================================================================
// LAB RESULTS API
// ==========================================================================================================
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

// ==========================================================================================================
// STAFF API
// ==========================================================================================================
export const staffApi = {
  getAll: (params) => http.get('/staff', { params }),
  getStats: () => http.get('/staff/stats'),
  getById: (id) => http.get(`/staff/${id}`),
  getPositions: () => http.get('/staff/positions/list'),
  create: (data) => http.post('/staff', data),
  createWithUser: (data) => http.post('/staff/with-user', data),
  update: (id, data) => http.put(`/staff/${id}`, data),
  delete: (id) => http.delete(`/staff/${id}`)
}

// ==========================================================================================================
// BLOCKCHAIN API
// ==========================================================================================================
export const blockchainApi = {
  getInfo: () => http.get('/blockchain/info'),
  getBlocks: (params) => http.get('/blockchain/blocks', { params }),
  getStreams: () => http.get('/blockchain/streams'),
  verify: () => http.get('/blockchain/verify'),
  getBlockGrowth: (params, config = {}) => http.get('/blockchain/growth', { params, ...config }),
  diagnostics: () => http.get('/blockchain/diagnostics')
}

// ==========================================================================================================
// KIOSK API
// ==========================================================================================================
export const kioskApi = {
  // Public: Check device status and auto-register if needed
  checkStatus: (deviceId) => http.get(`/kiosk/status/${deviceId}`),
  getQueueStats: (deviceId) => http.get('/kiosk/queue-stats', {
    params: { device: deviceId }
  }),
  getQueueData: (deviceId) => http.get('/kiosk/queue-data', {
    params: { device: deviceId }
  }),
  getDevices: () => http.get('/kiosk/admin/devices'),
  authorizeDevice: (deviceId) => http.post(`/kiosk/admin/devices/${deviceId}/authorize`),
  deauthorizeDevice: (deviceId) => http.post(`/kiosk/admin/devices/${deviceId}/deauthorize`),
  // Admin: Update device name/information
  updateDevice: (deviceId, data) => http.put(`/kiosk/admin/devices/${deviceId}`, data),
  deleteDevice: (deviceId) => http.delete(`/kiosk/admin/devices/${deviceId}`)
}

// ==========================================================================================================
// EXPORT ALL
// ==========================================================================================================
export default {
  auth: authApi,
  patient: patientApi,
  patients: patientsApi,
  appointments: appointmentsApi,
  appointmentTypes: appointmentTypesApi,
  queue: queueApi,
  audit: auditApi,
  users: usersApi,
  labResults: labResultsApi,
  staff: staffApi,
  dashboard: dashboardApi,
  blockchain: blockchainApi,
  kiosk: kioskApi,
}