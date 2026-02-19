// frontend/src/api/index.js
import http from './http'

// ==========================================================================================================
// ADMIN APIs (Updated for new schema)
// ==========================================================================================================

// Auth API
export const authApi = {
  // POST /auth/login - Returns { token, user: { id, username, role } }
  login: (credentials) => http.post('/auth/login', credentials),
  // GET /auth/check - Returns { user: { id, username, role } } if authenticated
  check: () => http.get('/auth/check'),
  // POST /auth/logout - Returns { message: 'Logged out successfully' }
  logout: () => http.post('/auth/logout')
}

// Patients API - UPDATED for new schema with field comments
export const patientsApi = {
  // GET /patients/list - Returns { patients: [{ patient_id, full_name, first_name, last_name, middle_name }] }
  // Used for dropdowns and simple lists
  getAll: () => http.get('/patients/list'),
  
  // GET /patients/:id - Returns single patient object with all fields:
  // id, patient_id, first_name, last_name, middle_name, full_name, date_of_birth, gender,
  // address, contact_number, consent, hiv_status, diagnosis_date, art_start_date,
  // latest_cd4_count, latest_viral_load, created_at, updated_at, created_by, updated_by, age
  getById: (id) => http.get(`/patients/${id}`),
  
  // POST /patients - Creates new patient, returns { message, patient: { all patient fields } }
  // Automatically generates patient_id if not provided (format: P/PR + YY + - + Initials + 3 random letters)
  create: (data) => http.post('/patients', data),
  
  // PUT /patients/:id - Updates patient, returns { message, new_patient_id (if changed) }
  update: (id, data) => http.put(`/patients/${id}`, data),
  
  // DELETE /patients/:id - Returns { message: 'Patient deleted successfully' }
  delete: (id) => http.delete(`/patients/${id}`),
  
  // GET /patients/stats - Returns stats object:
  // { total, consented, reactive, non_reactive, daily_enrollments, consent_rate, 
  //   reactive_rate, non_reactive_rate, enrollment_trends, consent_breakdown }
  getStats: () => http.get('/patients/stats'),
  
  // GET /patients - Returns paginated list: { patients: [], pagination: { page, limit, total, pages } }
  // Accepts query params: page, limit, search, consent, hiv_status
  getPagination: (params) => http.get('/patients', { params })
}

// Appointments API
export const appointmentsApi = {
  // GET /admin/appointments - Returns paginated appointments
  getAll: (params) => http.get('/admin/appointments', { params }),
  // GET /admin/appointments/calendar - Returns appointments for calendar view
  getCalendar: (params) => http.get('/admin/appointments/calendar', { params }),
  // POST /admin/appointments - Creates new appointment
  create: (data) => http.post('/admin/appointments', data),
  // PUT /admin/appointments/:id - Updates appointment
  update: (id, data) => http.put(`/admin/appointments/${id}`, data),
  // PUT /admin/appointments/:id/cancel - Cancels appointment
  cancel: (id) => http.put(`/admin/appointments/${id}/cancel`),
  // GET /admin/appointments/stats - Returns appointment statistics
  getStats: () => http.get('/admin/appointments/stats')
}

// Audit API
export const auditApi = {
  // GET /audit/logs - Returns paginated audit logs
  getLogs: (params) => http.get('/audit/logs', { params }),
  // GET /audit/stats - Returns audit statistics
  getStats: () => http.get('/audit/stats')
}

// Users API
export const usersApi = {
  // GET /users - Returns array of all users with their details
  getAll: () => http.get('/users'),
  
  // GET /users/:id - Returns single user object with staff details
  getById: (id) => http.get(`/users/${id}`),
  
  // POST /users - Creates new user, returns { message, user }
  // Data should include: username, password, email, role, staff details
  create: (data) => http.post('/users', data),
  
  // PUT /users/:id - Updates user, returns { message }
  update: (id, data) => http.put(`/users/${id}`, data),
  
  // DELETE /users/:id - Deletes user, returns { message }
  delete: (id) => http.delete(`/users/${id}`),
  
  // PUT /users/:id/toggle-status - Toggles user active status, returns { message, is_active }
  toggleStatus: (id) => http.put(`/users/${id}/toggle-status`),
  
  // PUT /users/:id/password - Changes user password, returns { message }
  // Data should include: current_password, new_password
  changePassword: (id, data) => http.put(`/users/${id}/password`, data),
  
  // GET /users/stats - Returns user statistics: total, by_role, active_count
  getStats: () => http.get('/users/stats')
}

// ==========================================================================================================
// EXPORT ALL APIS
// ==========================================================================================================

export default {
  auth: authApi,
  patients: patientsApi,
  appointments: appointmentsApi,
  audit: auditApi,
  users: usersApi
}