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

  // LAB RESULTS - COMMENTED OUT TO PREVENT 403 ERROR
  // getLabResults: (params) => http.get('/lab-results/patient/me', { params }),

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
  })
}

// Appointments API - ALIGNED WITH YOUR BACKEND ROUTES
export const appointmentsApi = {
  // Get all appointments
  getAll: (params) => http.get('/appointments', { params }),
  
  // Get single appointment
  getById: (id) => http.get(`/appointments/${id}`),
  
  // Get today's appointments
  getToday: () => http.get('/appointments/today'),
  
  // Get statistics
  getStatistics: (params) => http.get('/appointments/stats/overview', { params }),
  
  // Check availability
  checkAvailability: (params) => http.get('/appointments/check-availability', { params }),
  
  // Get appointments by patient
  getByPatientId: (patientId, params) => http.get(`/appointments/patient/${patientId}`, { params }),
  
  // CREATE appointment - includes patient_id
  create: (data) => {
    // Ensure required fields are present
    if (!data.patient_id || !data.appointment_type_id || !data.scheduled_at) {
      throw new Error('Missing required fields for appointment creation');
    }
    return http.post('/appointments', data);
  },
  
  // UPDATE appointment - EXCLUDES patient_id
  update: (id, data) => {
    // Create a clean update object without patient_id
    const updateData = {};
    
    // Only include allowed fields
    if (data.appointment_type_id !== undefined) {
      updateData.appointment_type_id = data.appointment_type_id;
    }
    if (data.scheduled_at !== undefined) {
      updateData.scheduled_at = data.scheduled_at;
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }
    if (data.status !== undefined) {
      updateData.status = data.status;
    }
    
    // Don't send patient_id, created_by, or other non-updatable fields
    
    console.log('Sending update data:', updateData); // Debug log
    return http.put(`/appointments/${id}`, updateData);
  },
  
  // Update status
  updateStatus: (id, status) => http.patch(`/appointments/${id}/status`, { status }),
  
  // Delete appointment
  delete: (id) => http.delete(`/appointments/${id}`),
  
  // Get appointment types
  getTypes: () => http.get('/appointments/types'),
  
  // Create appointment type (admin only)
  createType: (data) => http.post('/appointments/types', data),
  
  // Update appointment type (admin only)
  updateType: (id, data) => http.put(`/appointments/types/${id}`, data),
  
  // Delete appointment type (admin only)
  deleteType: (id) => http.delete(`/appointments/types/${id}`)
};

// Queue API - ALIGNED WITH YOUR BACKEND ROUTES
export const queueApi = {
  // Public routes
  getPublicQueue: () => http.get('/queue/public'), // Updated from getDisplayBoard

  // Current queue status
  getCurrent: () => http.get('/queue/current'),
  getSummary: () => http.get('/queue/current/summary'),

  // Patient-specific routes
  getPatientQueue: (patientId) => http.get(`/queue/patient/${patientId}`),
  getMyQueueStatus: () => http.get('/queue/patient/me'),

  // Queue management (Admin/Nurse only)
  getAll: () => http.get('/queue'),
  getHistory: (params) => http.get('/queue/history', { params }),

  // Queue operations
  addWalkin: (data) => http.post('/queue/walkin', data),
  confirmAppointment: (appointmentId) => http.post(`/queue/confirm/${appointmentId}`),
  callPatient: (id) => http.post(`/queue/call/${id}`), // id can be numeric or 'next'
  startServing: (id) => http.post(`/queue/start-serving/${id}`),
  completeServing: (id) => http.post(`/queue/complete/${id}`),
  skipPatient: (id, data = {}) => http.post(`/queue/skip/${id}`, data),
  reorderQueue: (data) => http.post('/queue/reorder', data),

  // Statistics
  getStatsOverview: () => http.get('/queue/stats/overview'),
  getDailyStats: (params) => http.get('/queue/stats/daily', { params }),
  getPeakHoursStats: () => http.get('/queue/stats/peak-hours'),

  // Utility
  resetQueue: (params) => http.delete('/queue/reset', { params }),
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

  getQueueStats: (deviceId) => http.get('/kiosk/queue-stats', {
    params: { device: deviceId }
  }),

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

// Staff API
export const staffApi = {
  getAll: (params) => http.get('/staff', { params }),
  getStats: () => http.get('/staff/stats'),
  getById: (id) => http.get(`/staff/${id}`),
  getPositions: () => http.get('/staff/positions/list'),
  create: (data) => http.post('/staff', data),
  createWithUser: (data) => http.post('/staff/with-user', data), // New method
  update: (id, data) => http.put(`/staff/${id}`, data),
  delete: (id) => http.delete(`/staff/${id}`)
}

// ==========================================================================================================
// DASHBOARD API - UPDATED TO MATCH YOUR BACKEND ROUTES
// ==========================================================================================================
export const dashboardApi = {
  // Admin dashboard
  getAdminDashboard: () => http.get('/dashboard/admin'),
  
  // Nurse dashboard
  getNurseDashboard: () => http.get('/dashboard/nurse'),
  getNurseSchedule: (params) => http.get('/dashboard/nurse/schedule', { params }),
  
  // Patient dashboard (though this is also covered by patientApi.getDashboard)
  getPatientDashboard: () => http.get('/dashboard/patient'),
  
  // Public queue display (kiosk/tv screen)
  getPublicQueueDisplay: () => http.get('/dashboard/queue/public')
}

// frontend/src/api/index.js

export const blockchainApi = {
  getInfo: async () => {
    const response = await http.get('/blockchain/info')
    // response already contains { success: true, data: {...} }
    return response
  },
  getBlocks: async (params) => {
    const response = await http.get('/blockchain/blocks', { params })
    return response
  },
  getStreams: async () => {
    const response = await http.get('/blockchain/streams')
    return response
  },
  verify: async () => {
    const response = await http.get('/blockchain/verify')
    return response
  },
  getBlockGrowth: async (params, config = {}) => {
    const response = await http.get('/blockchain/growth', { params, ...config })
    return response
  },
  diagnostics: async () => {
    const response = await http.get('/blockchain/diagnostics')
    return response
  }
};

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
  staff: staffApi,
  dashboard: dashboardApi
}