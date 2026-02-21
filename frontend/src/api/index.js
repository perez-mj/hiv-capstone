// frontend/src/api/index.js
import http from './http'

// ==========================================================================================================
// ADMIN APIs (Updated for new schema)
// ==========================================================================================================

// Auth API
export const authApi = {
  /**
   * POST /api/auth/login - Unified login for all users (Admin, Nurse, Patient)
   * Request Body: { username, password }
   * 
   * Returns: {
   *   token: "jwt_token_string",
   *   user: {
   *     id: 1,
   *     username: "admin",
   *     email: "admin@example.com",
   *     role: "ADMIN" | "NURSE" | "PATIENT",
   *     is_active: true,
   *     // For ADMIN/NURSE (from staff table):
   *     staff: {
   *       first_name: "John",
   *       last_name: "Doe",
   *       middle_name: "M",
   *       position: "System Administrator",
   *       contact_number: "1234567890"
   *     },
   *     // For PATIENT (from patients table):
   *     patient: {
   *       patient_id: "P001",
   *       first_name: "John",
   *       last_name: "Doe",
   *       middle_name: "M",
   *       date_of_birth: "1990-01-01",
   *       gender: "MALE",
   *       contact_number: "1234567890",
   *       address: "123 Main St",
   *       hiv_status: "REACTIVE",
   *       diagnosis_date: "2023-01-01",
   *       art_start_date: "2023-01-15"
   *     }
   *   }
   * }
   */
  login: (credentials) => http.post('/auth/login', credentials),

  /**
   * GET /api/auth/check - Verify if current token is valid and get user info
   * Headers: { Authorization: "Bearer token" }
   * 
   * Returns: {
   *   user: {
   *     id: 1,
   *     username: "admin",
   *     email: "admin@example.com",
   *     role: "ADMIN",
   *     is_active: true,
   *     // If staff:
   *     staff: { ...staff details },
   *     // If patient:
   *     patient: { ...patient details }
   *   }
   * }
   */
  check: () => http.get('/auth/check'),

  /**
   * POST /api/auth/logout - Logout current user
   * Headers: { Authorization: "Bearer token" }
   * 
   * Returns: { message: "Logout successful" }
   */
  logout: () => http.post('/auth/logout'),

  /**
   * POST /api/auth/change-password - Change user password
   * Headers: { Authorization: "Bearer token" }
   * Request Body: { currentPassword, newPassword }
   * 
   * Returns: { message: "Password changed successfully" }
   */
  changePassword: (data) => http.post('/auth/change-password', data),

  /**
   * POST /api/auth/refresh - Refresh expired token
   * Headers: { Authorization: "Bearer token" }
   * 
   * Returns: { token: "new_jwt_token_string" }
   */
  refreshToken: () => http.post('/auth/refresh')
}

// Patients API
export const patientsApi = {
  /**
   * GET /api/patients/list - Get minimal patient list for dropdowns
   * Headers: { Authorization: "Bearer token" }
   * 
   * Returns: {
   *   patients: [
   *     {
   *       id: 1,
   *       patient_id: "P001",
   *       first_name: "John",
   *       last_name: "Doe",
   *       middle_name: "M",
   *       full_name: "John M Doe"
   *     }
   *   ]
   * }
   */
  getAll: () => http.get('/patients/list'),

  /**
   * GET /api/patients/:id - Get complete patient details by ID
   * Headers: { Authorization: "Bearer token" }
   * 
   * Returns: {
   *   patient: {
   *     id: 1,
   *     patient_id: "P001",
   *     user_id: 5, // if linked to user account
   *     first_name: "John",
   *     last_name: "Doe",
   *     middle_name: "M",
   *     full_name: "John M Doe",
   *     date_of_birth: "1990-01-01",
   *     gender: "MALE",
   *     address: "123 Main St",
   *     contact_number: "1234567890",
   *     consent: 1,
   *     hiv_status: "REACTIVE",
   *     diagnosis_date: "2023-01-01",
   *     art_start_date: "2023-01-15",
   *     latest_cd4_count: 500,
   *     latest_viral_load: 50,
   *     created_at: "2023-01-01T00:00:00.000Z",
   *     updated_at: "2023-01-01T00:00:00.000Z",
   *     created_by: 1,
   *     updated_by: 1,
   *     age: 33, // calculated age from date_of_birth
   *     has_user_account: !!user_id
   *   }
   * }
   */
  getById: (id) => http.get(`/patients/${id}`),

  /**
   * POST /api/patients - Create new patient
   * Headers: { Authorization: "Bearer token" }
   * Request Body: {
   *   patient_id: "P001", // optional, auto-generated if not provided
   *   first_name: "John",
   *   last_name: "Doe",
   *   middle_name: "M", // optional
   *   date_of_birth: "1990-01-01",
   *   gender: "MALE",
   *   address: "123 Main St", // optional
   *   contact_number: "1234567890", // optional
   *   consent: 1, // 0 or 1
   *   hiv_status: "REACTIVE", // REACTIVE or NON_REACTIVE
   *   diagnosis_date: "2023-01-01", // optional
   *   art_start_date: "2023-01-15", // optional
   *   latest_cd4_count: 500, // optional
   *   latest_viral_load: 50, // optional
   *   create_user_account: true, // optional: create user account for patient login
   *   username: "john.doe", // required if create_user_account true
   *   password: "password123" // required if create_user_account true
   * }
   * 
   * Returns: {
   *   message: "Patient created successfully",
   *   patient: { ...full patient object as above },
   *   user_account: { // included if create_user_account true
   *     id: 5,
   *     username: "john.doe",
   *     role: "PATIENT"
   *   }
   * }
   */
  create: (data) => http.post('/patients', data),

  /**
   * PUT /api/patients/:id - Update existing patient
   * Headers: { Authorization: "Bearer token" }
   * Request Body: { ... any fields to update from patient schema }
   * 
   * Returns: {
   *   message: "Patient updated successfully",
   *   patient: { ...updated patient object }
   * }
   */
  update: (id, data) => http.put(`/patients/${id}`, data),

  /**
   * DELETE /api/patients/:id - Delete patient
   * Headers: { Authorization: "Bearer token" } (ADMIN only)
   * 
   * Returns: { message: "Patient deleted successfully" }
   */
  delete: (id) => http.delete(`/patients/${id}`),

  /**
   * GET /api/patients/stats - Get patient statistics
   * Headers: { Authorization: "Bearer token" }
   * 
   * Returns: {
   *   stats: {
   *     total: 150,
   *     consented: 145,
   *     reactive: 120,
   *     non_reactive: 30,
   *     on_art: 115,
   *     consent_rate: 96.67,
   *     reactive_rate: 80,
   *     gender_breakdown: {
   *       male: 80,
   *       female: 68,
   *       other: 2
   *     },
   *     age_groups: {
   *       "0-18": 15,
   *       "19-35": 60,
   *       "36-50": 45,
   *       "51+": 30
   *     }
   *   },
   *   trends: {
   *     daily_enrollments: [
   *       { date: "2024-01-01", count: 5 }
   *     ]
   *   }
   * }
   */
  getStats: () => http.get('/patients/stats'),

  /**
   * GET /api/patients - Get paginated patient list with filters
   * Headers: { Authorization: "Bearer token" }
   * Query Parameters: {
   *   page: 1, // page number
   *   limit: 10, // items per page
   *   search: "john", // search in name/patient_id
   *   consent: 1, // filter by consent (0 or 1)
   *   hiv_status: "REACTIVE", // filter by status
   *   gender: "MALE", // filter by gender
   *   sort_by: "created_at", // field to sort by
   *   sort_order: "DESC" // ASC or DESC
   * }
   * 
   * Returns: {
   *   patients: [ ...array of patient objects (minimal fields for listing) ],
   *   pagination: {
   *     page: 1,
   *     limit: 10,
   *     total: 150,
   *     pages: 15,
   *     hasNext: true,
   *     hasPrev: false
   *   }
   * }
   */
  getPagination: (params) => http.get('/patients', { params }),

  /**
   * GET /api/patients/export - Export patients data
   * Headers: { Authorization: "Bearer token" }
   * Query Parameters: {
   *   format: "csv" | "excel",
   *   fields: ["patient_id", "full_name", "hiv_status"], // optional
   *   ...filters // same as getPagination filters
   * }
   * 
   * Returns: Blob (file download)
   */
  export: (params) => http.get('/patients/export', { 
    params, 
    responseType: 'blob' 
  })
}
/**
 * Appointments API
 */
export const appointmentsApi = {
  // ==================== APPOINTMENT TYPES ====================

  /**
   * GET /api/appointments/types - Get all active appointment types
   * Headers: { Authorization: "Bearer token" }
   * 
   * Returns: [
   *   {
   *     id: 1,
   *     type_name: "Consultation",
   *     description: "Regular medical consultation with doctor",
   *     duration_minutes: 30,
   *     is_active: true
   *   },
   *   {
   *     id: 2,
   *     type_name: "Lab Test",
   *     description: "Blood work and laboratory tests",
   *     duration_minutes: 20,
   *     is_active: true
   *   },
   *   ...
   * ]
   */
  getTypes: () => http.get('/appointments/types'),

  /**
   * GET /api/appointments/types/:id - Get appointment type by ID
   * Headers: { Authorization: "Bearer token" }
   * 
   * Returns: {
   *   id: 1,
   *   type_name: "Consultation",
   *   description: "Regular medical consultation with doctor",
   *   duration_minutes: 30,
   *   is_active: true
   * }
   */
  getTypeById: (id) => http.get(`/appointments/types/${id}`),

  /**
   * POST /api/appointments/types - Create new appointment type (Admin only)
   * Headers: { Authorization: "Bearer token" }
   * 
   * Request Body: {
   *   type_name: "Telemedicine", // required
   *   description: "Virtual consultation via video call", // optional
   *   duration_minutes: 45 // required
   * }
   * 
   * Returns: {
   *   message: "Appointment type created successfully",
   *   id: 6,
   *   type_name: "Telemedicine",
   *   description: "Virtual consultation via video call",
   *   duration_minutes: 45
   * }
   */
  createType: (data) => http.post('/appointments/types', data),
  /**
   * PUT /api/appointments/types/:id - Update appointment type (Admin only)
   * Headers: { Authorization: "Bearer token" }
   * 
   * Request Body: {
   *   type_name: "Telemedicine Consultation", // optional
   *   description: "Updated description", // optional
   *   duration_minutes: 30, // optional
   *   is_active: true // optional
   * }
   * 
   * Returns: {
   *   message: "Appointment type updated successfully"
   * }
   */
  updateType: (id, data) => http.put(`/appointments/types/${id}`, data),

  /**
   * DELETE /api/appointments/types/:id - Delete appointment type (Admin only)
   * Headers: { Authorization: "Bearer token" }
   * 
   * Returns: {
   *   message: "Appointment type deleted successfully"
   * }
   * 
   * Note: Cannot delete types that are in use by appointments.
   * Consider deactivating instead of deleting.
   */
  deleteType: (id) => http.delete(`/appointments/types/${id}`),

  // ==================== APPOINTMENTS CRUD ====================


  /**
   * GET /api/appointments - Get paginated appointments with filters
   * Headers: { Authorization: "Bearer token" }
   * Query Parameters: {
   *   status: "SCHEDULED" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "NO_SHOW", // optional
   *   patient_id: "P001", // optional - filter by patient
   *   date_from: "2024-01-01", // optional - filter by date range
   *   date_to: "2024-01-31", // optional
   *   type_id: 1, // optional - filter by appointment type
   *   limit: 100, // optional - default 100
   *   offset: 0 // optional - for pagination
   * }
   * 
   * Returns: {
   *   appointments: [
   *     {
   *       id: 1,
   *       appointment_number: "APT2402150001",
   *       patient_id: "P001",
   *       appointment_type_id: 1,
   *       scheduled_at: "2024-02-15T10:00:00.000Z",
   *       status: "SCHEDULED",
   *       notes: "Follow-up visit",
   *       created_at: "2024-02-01T00:00:00.000Z",
   *       updated_at: "2024-02-01T00:00:00.000Z",
   *       type_name: "Consultation",
   *       duration_minutes: 30,
   *       patient_name: "John Doe",
   *       patient_first_name: "John",
   *       patient_last_name: "Doe",
   *       patient_contact: "1234567890",
   *       created_by_username: "admin"
   *     }
   *   ],
   *   pagination: {
   *     total: 150,
   *     limit: 100,
   *     offset: 0
   *   }
   * }
   */
  getAll: (params) => http.get('/appointments', { params }),

  /**
   * GET /api/appointments/today - Get today's appointments with queue information
   * Headers: { Authorization: "Bearer token" }
   * 
   * Returns: [
   *   {
   *     id: 1,
   *     appointment_number: "APT2402150001",
   *     patient_id: "P001",
   *     appointment_type_id: 1,
   *     scheduled_at: "2024-02-15T10:00:00.000Z",
   *     status: "SCHEDULED",
   *     notes: "Follow-up visit",
   *     type_name: "Consultation",
   *     duration_minutes: 30,
   *     patient_name: "John Doe",
   *     patient_first_name: "John",
   *     patient_last_name: "Doe",
   *     patient_contact: "1234567890",
   *     patient_age: 34,
   *     queue_id: 5,
   *     queue_number: 12,
   *     queue_status: "WAITING"
   *   },
   *   ...
   * ]
   */
  getToday: () => http.get('/appointments/today'),

  /**
   * GET /api/appointments/upcoming - Get upcoming appointments
   * Headers: { Authorization: "Bearer token" }
   * Query Parameters: {
   *   days: 7 // optional - number of days to look ahead (default 7)
   * }
   * 
   * Returns: [
   *   {
   *     id: 1,
   *     appointment_number: "APT2402150001",
   *     patient_id: "P001",
   *     scheduled_at: "2024-02-15T10:00:00.000Z",
   *     status: "SCHEDULED",
   *     notes: "Follow-up visit",
   *     type_name: "Consultation",
   *     duration_minutes: 30,
   *     patient_name: "John Doe",
   *     patient_contact: "1234567890",
   *     days_until: 3
   *   },
   *   ...
   * ]
   */
  getUpcoming: (params) => http.get('/appointments/upcoming', { params }),

  /**
   * GET /api/appointments/calendar - Get appointments for calendar view
   * Headers: { Authorization: "Bearer token" }
   * Query Parameters: {
   *   start: "2024-02-01", // required - start date for calendar range
   *   end: "2024-02-29" // required - end date for calendar range
   * }
   * 
   * Returns: [
   *   {
   *     id: 1,
   *     title: "APT2402150001", // appointment number as title
   *     start: "2024-02-15T10:00:00.000Z",
   *     end: "2024-02-15T10:30:00.000Z", // start + duration_minutes
   *     status: "SCHEDULED",
   *     patient_id: "P001",
   *     patient_name: "John Doe",
   *     type_name: "Consultation",
   *     duration_minutes: 30,
   *     color: "#3498db" // Color based on status
   *   },
   *   ...
   * ]
   */
  getCalendar: (params) => http.get('/appointments/calendar', { params }),

  /**
   * GET /api/appointments/patient/:patientId - Get appointments for specific patient
   * Headers: { Authorization: "Bearer token" }
   * Path Parameters: {
   *   patientId: "P001" // Patient ID in P001 format
   * }
   * Query Parameters: {
   *   limit: 50, // optional - default 50
   *   offset: 0 // optional - for pagination
   * }
   * 
   * Returns: {
   *   appointments: [
   *     {
   *       id: 1,
   *       appointment_number: "APT2402150001",
   *       appointment_type_id: 1,
   *       scheduled_at: "2024-02-15T10:00:00.000Z",
   *       status: "SCHEDULED",
   *       notes: "Follow-up visit",
   *       created_at: "2024-02-01T00:00:00.000Z",
   *       type_name: "Consultation",
   *       duration_minutes: 30,
   *       queue_number: 12,
   *       queue_status: "WAITING"
   *     }
   *   ],
   *   patient: {
   *     patient_id: "P001"
   *   },
   *   pagination: {
   *     total: 25,
   *     limit: 50,
   *     offset: 0
   *   }
   * }
   */
  getByPatientId: (patientId, params) => http.get(`/appointments/patient/${patientId}`, { params }),

  /**
   * GET /api/appointments/patient/:patientId/next - Get patient's next upcoming appointment
   * Headers: { Authorization: "Bearer token" }
   * Path Parameters: {
   *   patientId: "P001" // Patient ID in P001 format
   * }
   * 
   * Returns: {
   *   id: 1,
   *   appointment_number: "APT2402150001",
   *   scheduled_at: "2024-02-15T10:00:00.000Z",
   *   status: "SCHEDULED",
   *   type_name: "Consultation",
   *   days_until: 3
   * }
   * 
   * Or if no upcoming appointments:
   * {
   *   message: "No upcoming appointments"
   * }
   */
  getNextPatientAppointment: (patientId) => http.get(`/appointments/patient/${patientId}/next`),

  /**
   * GET /api/appointments/patient/:patientId/history - Get patient's appointment history
   * Headers: { Authorization: "Bearer token" }
   * Path Parameters: {
   *   patientId: "P001" // Patient ID in P001 format
   * }
   * Query Parameters: {
   *   limit: 20, // optional - default 20
   *   offset: 0 // optional - for pagination
   * }
   * 
   * Returns: {
   *   appointments: [
   *     {
   *       id: 1,
   *       appointment_number: "APT2402010001",
   *       scheduled_at: "2024-02-01T10:00:00.000Z",
   *       status: "COMPLETED",
   *       notes: "Follow-up visit",
   *       type_name: "Consultation",
   *       queue_number: 5,
   *       lab_count: 2, // number of lab results from this appointment
   *       prescription_count: 1 // number of prescriptions from this appointment
   *     }
   *   ],
   *   pagination: {
   *     total: 15,
   *     limit: 20,
   *     offset: 0
   *   }
   * }
   */
  getPatientHistory: (patientId, params) => http.get(`/appointments/patient/${patientId}/history`, { params }),

  /**
   * GET /api/appointments/:id - Get single appointment details by ID
   * Headers: { Authorization: "Bearer token" }
   * 
   * Returns: {
   *   id: 1,
   *   appointment_number: "APT2402150001",
   *   patient_id: "P001",
   *   appointment_type_id: 1,
   *   scheduled_at: "2024-02-15T10:00:00.000Z",
   *   status: "SCHEDULED",
   *   notes: "Follow-up visit",
   *   created_at: "2024-02-01T00:00:00.000Z",
   *   updated_at: "2024-02-01T00:00:00.000Z",
   *   created_by: 1,
   *   type_name: "Consultation",
   *   type_description: "Regular medical consultation with doctor",
   *   duration_minutes: 30,
   *   patient_first_name: "John",
   *   patient_last_name: "Doe",
   *   patient_middle_name: "M",
   *   patient_date_of_birth: "1990-01-01",
   *   patient_gender: "MALE",
   *   patient_contact: "1234567890",
   *   patient_address: "123 Main St",
   *   patient_hiv_status: "REACTIVE",
   *   created_by_username: "admin",
   *   queue_id: 5,
   *   queue_number: 12,
   *   queue_status: "WAITING",
   *   called_at: null,
   *   served_at: null,
   *   completed_at: null,
   *   lab_results: [
   *     {
   *       id: 1,
   *       test_type: "CD4",
   *       test_date: "2024-02-01",
   *       result_value: "500",
   *       result_unit: "cells/µL"
   *     }
   *   ],
   *   prescriptions: [
   *     {
   *       id: 1,
   *       medication_id: 1,
   *       medication_name: "Tenofovir/Emtricitabine",
   *       dosage_instructions: "Take once daily",
   *       quantity_prescribed: 30,
   *       refills_remaining: 2,
   *       status: "ACTIVE"
   *     }
   *   ]
   * }
   */
  getById: (id) => http.get(`/appointments/${id}`),

  /**
   * POST /api/appointments - Create new appointment (Admin/Nurse only)
   * Headers: { Authorization: "Bearer token" }
   * 
   * Request Body: {
   *   patient_id: "P001", // required - patient ID in P001 format
   *   appointment_type_id: 1, // required
   *   scheduled_at: "2024-02-15T10:00:00.000Z", // required - ISO datetime
   *   notes: "Follow-up visit for lab results" // optional
   * }
   * 
   * Returns: {
   *   message: "Appointment created successfully",
   *   appointment: {
   *     id: 1,
   *     appointment_number: "APT2402150001",
   *     patient_id: "P001",
   *     appointment_type_id: 1,
   *     scheduled_at: "2024-02-15T10:00:00.000Z",
   *     status: "SCHEDULED",
   *     notes: "Follow-up visit for lab results",
   *     created_at: "2024-02-10T05:30:00.000Z",
   *     type_name: "Consultation"
   *   }
   * }
   */
  create: (data) => http.post('/appointments', data),

  /**
   * PUT /api/appointments/:id - Update appointment (Admin/Nurse only)
   * Headers: { Authorization: "Bearer token" }
   * 
   * Request Body: {
   *   appointment_type_id: 2, // optional
   *   scheduled_at: "2024-02-16T11:00:00.000Z", // optional
   *   status: "CONFIRMED", // optional
   *   notes: "Updated notes" // optional
   * }
   * 
   * Returns: {
   *   message: "Appointment updated successfully"
   * }
   */
  update: (id, data) => http.put(`/appointments/${id}`, data),

  /**
   * PATCH /api/appointments/:id/status - Update appointment status (Admin/Nurse only)
   * Headers: { Authorization: "Bearer token" }
   * 
   * Request Body: {
   *   status: "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW" | "IN_PROGRESS"
   * }
   * 
   * Returns: {
   *   message: "Appointment status updated successfully",
   *   previousStatus: "SCHEDULED",
   *   newStatus: "CONFIRMED"
   * }
   */
  updateStatus: (id, status) => http.patch(`/appointments/${id}/status`, { status }),

  /**
   * DELETE /api/appointments/:id - Cancel/delete appointment (Admin only)
   * Headers: { Authorization: "Bearer token" }
   * 
   * Returns: {
   *   message: "Appointment deleted successfully"
   * }
   * 
   * Note: If appointment has associated records (queue, lab results, prescriptions),
   * it will be marked as CANCELLED instead of hard deleted.
   */
  delete: (id) => http.delete(`/appointments/${id}`),

  // ==================== UTILITY ENDPOINTS ====================

  /**
   * GET /api/appointments/check-availability - Check available time slots for a date
   * Headers: { Authorization: "Bearer token" }
   * Query Parameters: {
   *   date: "2024-02-15", // required - date to check
   *   type_id: 1 // optional - appointment type ID for duration
   * }
   * 
   * Returns: {
   *   date: "2024-02-15",
   *   slots: [
   *     {
   *       time: "08:00",
   *       datetime: "2024-02-15T08:00:00.000Z",
   *       available: true,
   *       duration_minutes: 30
   *     },
   *     {
   *       time: "08:30",
   *       datetime: "2024-02-15T08:30:00.000Z",
   *       available: false,
   *       duration_minutes: 30
   *     },
   *     ...
   *   ],
   *   appointment_count: 12 // number of existing appointments
   * }
   */
  checkAvailability: (params) => http.get('/appointments/check-availability', { params }),

  // ==================== STATISTICS ====================

  /**
   * GET /api/appointments/stats/summary - Get appointment statistics
   * Headers: { Authorization: "Bearer token" }
   * Query Parameters: {
   *   start_date: "2024-02-01", // optional - start of period
   *   end_date: "2024-02-29" // optional - end of period
   * }
   * 
   * Returns: {
   *   by_status: [
   *     { status: "SCHEDULED", count: 45 },
   *     { status: "CONFIRMED", count: 30 },
   *     { status: "COMPLETED", count: 120 },
   *     { status: "CANCELLED", count: 15 },
   *     { status: "NO_SHOW", count: 8 }
   *   ],
   *   by_type: [
   *     { type_name: "Consultation", count: 98 },
   *     { type_name: "Lab Test", count: 67 },
   *     { type_name: "Medication Refill", count: 45 }
   *   ],
   *   daily: [
   *     {
   *       date: "2024-02-01",
   *       total: 8,
   *       completed: 6,
   *       cancelled: 1,
   *       no_show: 1
   *     },
   *     ...
   *   ],
   *   peak_hours: [
   *     { hour: 10, count: 25 },
   *     { hour: 14, count: 23 },
   *     { hour: 9, count: 20 }
   *   ],
   *   period: {
   *     start_date: "2024-02-01",
   *     end_date: "2024-02-29"
   *   }
   * }
   */
  getStats: (params) => http.get('/appointments/stats/summary', { params })
};

// Queue API
export const queueApi = {
  /**
   * GET /api/queue/current - Get current queue status
   * Headers: { Authorization: "Bearer token" }
   * 
   * Returns: {
   *   queue: {
   *     now_serving: 5,
   *     waiting_count: 8,
   *     estimated_wait_time: 45, // minutes
   *     items: [
   *       {
   *         id: 1,
   *         queue_number: 6,
   *         appointment: {
   *           id: 1,
   *           patient: {
   *             patient_id: "P001",
   *             full_name: "John Doe"
   *           },
   *           appointment_type: {
   *             type_name: "Consultation"
   *           }
   *         },
   *         priority: 0,
   *         status: "WAITING",
   *         called_at: null,
   *         estimated_start_time: "2024-01-01T10:15:00.000Z"
   *       }
   *     ]
   *   }
   * }
   */
  getCurrent: () => http.get('/queue/current'),

  /**
   * POST /api/queue - Add appointment to queue
   * Headers: { Authorization: "Bearer token" }
   * Request Body: { appointment_id: 1, priority: 0 }
   * 
   * Returns: {
   *   message: "Added to queue successfully",
   *   queue: {
   *     id: 1,
   *     queue_number: 6,
   *     appointment_id: 1,
   *     status: "WAITING"
   *   }
   * }
   */
  addToQueue: (data) => http.post('/queue', data),

  /**
   * PUT /api/queue/:id/call - Call next patient
   * Headers: { Authorization: "Bearer token" }
   * 
   * Returns: {
   *   message: "Patient called",
   *   queue: { ...queue item with called_at timestamp }
   * }
   */
  callPatient: (id) => http.put(`/queue/${id}/call`),

  /**
   * PUT /api/queue/:id/start - Start serving patient
   * Headers: { Authorization: "Bearer token" }
   * 
   * Returns: {
   *   message: "Now serving patient",
   *   queue: { ...queue item with served_at timestamp }
   * }
   */
  startServing: (id) => http.put(`/queue/${id}/start`),

  /**
   * PUT /api/queue/:id/complete - Complete serving patient
   * Headers: { Authorization: "Bearer token" }
   * 
   * Returns: {
   *   message: "Service completed",
   *   next_queue_number: 6 // next number to call
   * }
   */
  completeServing: (id) => http.put(`/queue/${id}/complete`),

  /**
   * PUT /api/queue/:id/skip - Skip patient (moves to next)
   * Headers: { Authorization: "Bearer token" }
   * 
   * Returns: {
   *   message: "Patient skipped",
   *   next_queue_number: 6
   * }
   */
  skipPatient: (id) => http.put(`/queue/${id}/skip`),

  /**
   * GET /api/queue/history - Get queue history
   * Headers: { Authorization: "Bearer token" }
   * Query Parameters: { date: "2024-01-01", page: 1, limit: 20 }
   * 
   * Returns: {
   *   items: [ ...queue items with complete history ],
   *   pagination: { page, limit, total }
   * }
   */
  getHistory: (params) => http.get('/queue/history', { params })
}

// Audit API
export const auditApi = {
  /**
   * GET /api/audit/logs - Get paginated audit logs
   * Headers: { Authorization: "Bearer token" } (ADMIN only)
   * Query Parameters: {
   *   page: 1,
   *   limit: 20,
   *   user_id: 1,
   *   table_name: "patients",
   *   action_type: "USER_LOGIN",
   *   date_from: "2024-01-01",
   *   date_to: "2024-01-31"
   * }
   * 
   * Returns: {
   *   logs: [
   *     {
   *       id: 1,
   *       user: {
   *         id: 1,
   *         username: "admin"
   *       },
   *       action_type: "USER_LOGIN",
   *       table_name: "users",
   *       record_id: "1",
   *       old_values: null,
   *       new_values: null,
   *       description: "User logged in",
   *       ip_address: "192.168.1.1",
   *       user_agent: "Mozilla/5.0...",
   *       timestamp: "2024-01-01T00:00:00.000Z"
   *     }
   *   ],
   *   pagination: { page, limit, total, pages }
   * }
   */
  getLogs: (params) => http.get('/audit/logs', { params }),

  /**
   * GET /api/audit/stats - Get audit statistics
   * Headers: { Authorization: "Bearer token" } (ADMIN only)
   * 
   * Returns: {
   *   stats: {
   *     total_logs: 1500,
   *     by_action: [
   *       { action: "USER_LOGIN", count: 500 },
   *       { action: "PATIENT_CREATE", count: 150 }
   *     ],
   *     by_user: [
   *       { user: "admin", count: 800 }
   *     ],
   *     activity_trends: {
   *       daily: [10, 15, 12, 18, 14],
   *       labels: ["Mon", "Tue", "Wed", "Thu", "Fri"]
   *     }
   *   },
   *   recent_activities: [ ...last 10 logs ]
   * }
   */
  getStats: () => http.get('/audit/stats'),

  /**
   * GET /api/audit/export - Export audit logs
   * Headers: { Authorization: "Bearer token" } (ADMIN only)
   * Query Parameters: { format: "csv", ...filters }
   * 
   * Returns: Blob (file download)
   */
  export: (params) => http.get('/audit/export', { params, responseType: 'blob' })
}

// Users API (Admin/Staff/Patient Account Management)
export const usersApi = {
  /**
   * GET /api/users - Get all users with their details
   * Headers: { Authorization: "Bearer token" } (ADMIN only)
   * 
   * Returns: {
   *   users: [
   *     {
   *       id: 1,
   *       username: "admin",
   *       email: "admin@example.com",
   *       role: "ADMIN",
   *       is_active: 1,
   *       last_login: "2024-01-01T00:00:00.000Z",
   *       created_at: "2024-01-01T00:00:00.000Z",
   *       updated_at: "2024-01-01T00:00:00.000Z",
   *       // Staff details (if role is ADMIN/NURSE)
   *       staff: {
   *         first_name: "John",
   *         last_name: "Doe",
   *         middle_name: "M",
   *         position: "System Administrator",
   *         contact_number: "1234567890"
   *       },
   *       // Patient details (if role is PATIENT)
   *       patient: {
   *         patient_id: "P001",
   *         first_name: "John",
   *         last_name: "Doe",
   *         contact_number: "1234567890"
   *       }
   *     }
   *   ]
   * }
   */
  getAll: () => http.get('/users'),

  /**
   * GET /api/users/:id - Get single user by ID
   * Headers: { Authorization: "Bearer token" } (ADMIN only)
   * 
   * Returns: {
   *   user: { ...full user object with role-specific details }
   * }
   */
  getById: (id) => http.get(`/users/${id}`),

  /**
   * POST /api/users - Create new user (staff or patient account)
   * Headers: { Authorization: "Bearer token" } (ADMIN only)
   * Request Body (for ADMIN/NURSE): {
   *   username: "jane.doe",
   *   password: "SecurePass123",
   *   email: "jane@example.com",
   *   role: "NURSE",
   *   staff: {
   *     first_name: "Jane",
   *     last_name: "Doe",
   *     middle_name: "M",
   *     position: "Head Nurse",
   *     contact_number: "1234567890"
   *   }
   * }
   * OR (for PATIENT, linking to existing patient):
   * {
   *   username: "john.patient",
   *   password: "SecurePass123",
   *   email: "john@example.com",
   *   role: "PATIENT",
   *   patient_id: "P001" // link to existing patient
   * }
   * 
   * Returns: {
   *   message: "User created successfully",
   *   user: { ...created user object }
   * }
   */
  create: (data) => http.post('/users', data),

  /**
   * PUT /api/users/:id - Update user
   * Headers: { Authorization: "Bearer token" } (ADMIN only)
   * Request Body: {
   *   email: "newemail@example.com",
   *   role: "NURSE", // optional
   *   is_active: 1, // optional
   *   // Staff details (if applicable)
   *   staff: {
   *     first_name: "Updated",
   *     last_name: "Name",
   *     position: "New Position"
   *   }
   * }
   * 
   * Returns: {
   *   message: "User updated successfully",
   *   user: { ...updated user }
   * }
   */
  update: (id, data) => http.put(`/users/${id}`, data),

  /**
   * DELETE /api/users/:id - Delete user
   * Headers: { Authorization: "Bearer token" } (ADMIN only)
   * 
   * Returns: { message: "User deleted successfully" }
   */
  delete: (id) => http.delete(`/users/${id}`),

  /**
   * PUT /api/users/:id/toggle-status - Activate/deactivate user
   * Headers: { Authorization: "Bearer token" } (ADMIN only)
   * 
   * Returns: {
   *   message: "User status updated successfully",
   *   user: { ...updated user with new is_active status }
   * }
   */
  toggleStatus: (id) => http.put(`/users/${id}/toggle-status`),

  /**
   * PUT /api/users/:id/password - Change user password (admin only)
   * Headers: { Authorization: "Bearer token" } (ADMIN only)
   * Request Body: { password: "NewSecurePass123" }
   * 
   * Returns: { message: "Password updated successfully" }
   */
  changePassword: (id, data) => http.put(`/users/${id}/password`, data),

  /**
   * GET /api/users/stats - Get user statistics
   * Headers: { Authorization: "Bearer token" } (ADMIN only)
   * 
   * Returns: {
   *   stats: {
   *     total: 25,
   *     by_role: {
   *       ADMIN: 1,
   *       NURSE: 8,
   *       PATIENT: 16
   *     },
   *     active: 23,
   *     inactive: 2,
   *     active_today: 5,
   *     new_this_week: 3
   *   }
   * }
   */
  getStats: () => http.get('/users/stats')
}

// Medications API
export const medicationsApi = {
  /**
   * GET /api/medications - Get all medications
   * Headers: { Authorization: "Bearer token" }
   * 
   * Returns: {
   *   medications: [
   *     {
   *       id: 1,
   *       medication_name: "Tenofovir/Emtricitabine",
   *       generic_name: "Truvada",
   *       dosage_form: "Tablet",
   *       strength: "300mg/200mg",
   *       stock_quantity: 150,
   *       reorder_level: 30,
   *       is_active: 1,
   *       created_at: "2024-01-01T00:00:00.000Z",
   *       updated_at: "2024-01-01T00:00:00.000Z"
   *     }
   *   ]
   * }
   */
  getAll: () => http.get('/medications'),

  /**
   * GET /api/medications/low-stock - Get medications below reorder level
   * Headers: { Authorization: "Bearer token" }
   * 
   * Returns: {
   *   medications: [ ...array of medications with low stock ]
   * }
   */
  getLowStock: () => http.get('/medications/low-stock'),

  /**
   * POST /api/medications - Create new medication
   * Headers: { Authorization: "Bearer token" } (ADMIN only)
   * Request Body: {
   *   medication_name: "New Drug",
   *   generic_name: "Generic Name",
   *   dosage_form: "Tablet",
   *   strength: "100mg",
   *   stock_quantity: 100,
   *   reorder_level: 20
   * }
   * 
   * Returns: {
   *   message: "Medication created successfully",
   *   medication: { ...created medication }
   * }
   */
  create: (data) => http.post('/medications', data),

  /**
   * PUT /api/medications/:id - Update medication
   * Headers: { Authorization: "Bearer token" } (ADMIN only)
   * 
   * Returns: {
   *   message: "Medication updated successfully",
   *   medication: { ...updated medication }
   * }
   */
  update: (id, data) => http.put(`/medications/${id}`, data),

  /**
   * PUT /api/medications/:id/stock - Update stock quantity
   * Headers: { Authorization: "Bearer token" }
   * Request Body: { quantity: 50, operation: "add" | "remove" }
   * 
   * Returns: {
   *   message: "Stock updated successfully",
   *   medication: { ...updated medication with new stock_quantity }
   * }
   */
  updateStock: (id, data) => http.put(`/medications/${id}/stock`, data)
}

// Prescriptions API
export const prescriptionsApi = {
  /**
   * GET /api/prescriptions - Get prescriptions
   * Headers: { Authorization: "Bearer token" }
   * Query Parameters: {
   *   patient_id: "P001",
   *   status: "ACTIVE",
   *   page: 1,
   *   limit: 10
   * }
   * 
   * Returns: {
   *   prescriptions: [
   *     {
   *       id: 1,
   *       patient: {
   *         patient_id: "P001",
   *         first_name: "John",
   *         last_name: "Doe",
   *         full_name: "John Doe"
   *       },
   *       appointment: {
   *         id: 1,
   *         appointment_number: "APP-20240101-001"
   *       },
   *       medication: {
   *         id: 1,
   *         medication_name: "Tenofovir/Emtricitabine"
   *       },
   *       dosage_instructions: "Take one tablet daily",
   *       quantity_prescribed: 30,
   *       refills_remaining: 2,
   *       prescribed_by: {
   *         id: 1,
   *         username: "dr.smith"
   *       },
   *       prescribed_date: "2024-01-01",
   *       status: "ACTIVE",
   *       created_at: "2024-01-01T00:00:00.000Z"
   *     }
   *   ],
   *   pagination: { page, limit, total }
   * }
   */
  getAll: (params) => http.get('/prescriptions', { params }),

  /**
   * POST /api/prescriptions - Create prescription
   * Headers: { Authorization: "Bearer token" }
   * Request Body: {
   *   patient_id: "P001",
   *   appointment_id: 1, // optional
   *   medication_id: 1,
   *   dosage_instructions: "Take one tablet daily",
   *   quantity_prescribed: 30,
   *   refills_remaining: 2,
   *   prescribed_date: "2024-01-01"
   * }
   * 
   * Returns: {
   *   message: "Prescription created successfully",
   *   prescription: { ...created prescription }
   * }
   */
  create: (data) => http.post('/prescriptions', data),

  /**
   * PUT /api/prescriptions/:id/status - Update prescription status
   * Headers: { Authorization: "Bearer token" }
   * Request Body: { status: "COMPLETED" | "CANCELLED" | "EXPIRED" }
   * 
   * Returns: {
   *   message: "Prescription status updated",
   *   prescription: { ...updated prescription }
   * }
   */
  updateStatus: (id, status) => http.put(`/prescriptions/${id}/status`, { status }),

  /**
   * PUT /api/prescriptions/:id/refill - Refill prescription
   * Headers: { Authorization: "Bearer token" }
   * 
   * Returns: {
   *   message: "Prescription refilled",
   *   prescription: { ...updated prescription with new refills_remaining }
   * }
   */
  refill: (id) => http.put(`/prescriptions/${id}/refill`)
}

// Lab Results API
export const labResultsApi = {
  /**
   * GET /api/lab-results - Get lab results
   * Headers: { Authorization: "Bearer token" }
   * Query Parameters: {
   *   patient_id: "P001",
   *   test_type: "CD4",
   *   date_from: "2024-01-01",
   *   date_to: "2024-01-31"
   * }
   * 
   * Returns: {
   *   lab_results: [
   *     {
   *       id: 1,
   *       patient: {
   *         patient_id: "P001",
   *         full_name: "John Doe"
   *       },
   *       appointment: {
   *         id: 1,
   *         appointment_number: "APP-20240101-001"
   *       },
   *       test_type: "CD4",
   *       test_date: "2024-01-01",
   *       result_value: "500",
   *       result_unit: "cells/mm³",
   *       reference_range: "500-1500",
   *       interpretation: "Normal",
   *       performed_by: {
   *         id: 1,
   *         username: "lab.tech"
   *       },
   *       file_path: "/uploads/lab/result1.pdf",
   *       created_at: "2024-01-01T00:00:00.000Z"
   *     }
   *   ]
   * }
   */
  getAll: (params) => http.get('/lab-results', { params }),

  /**
   * POST /api/lab-results - Create lab result
   * Headers: { Authorization: "Bearer token" }
   * Request Body: {
   *   patient_id: "P001",
   *   appointment_id: 1, // optional
   *   test_type: "CD4",
   *   test_date: "2024-01-01",
   *   result_value: "500",
   *   result_unit: "cells/mm³",
   *   reference_range: "500-1500",
   *   interpretation: "Normal"
   * }
   * 
   * Returns: {
   *   message: "Lab result created successfully",
   *   lab_result: { ...created lab result }
   * }
   */
  create: (data) => http.post('/lab-results', data),

  /**
   * POST /api/lab-results/:id/upload - Upload lab result file
   * Headers: { Authorization: "Bearer token", Content-Type: "multipart/form-data" }
   * Form Data: { file: File }
   * 
   * Returns: {
   *   message: "File uploaded successfully",
   *   lab_result: { ...updated lab result with file_path }
   * }
   */
  uploadFile: (id, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return http.post(`/lab-results/${id}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  /**
   * GET /api/lab-results/trends/:patient_id - Get lab trends
   * Headers: { Authorization: "Bearer token" }
   * 
   * Returns: {
   *   trends: {
   *     cd4: [
   *       { date: "2024-01-01", value: 500 },
   *       { date: "2024-02-01", value: 520 }
   *     ],
   *     viral_load: [
   *       { date: "2024-01-01", value: 50 },
   *       { date: "2024-02-01", value: 40 }
   *     ]
   *   }
   * }
   */
  getTrends: (patientId) => http.get(`/lab-results/trends/${patientId}`)
}


// Dashboard API
export const dashboardApi = {
  /**
   * GET /api/dashboard/stats - Get dashboard statistics
   * Headers: { Authorization: "Bearer token" }
   * 
   * Returns: {
   *   stats: {
   *     patients: {
   *       total: 150,
   *       new_today: 3,
   *       reactive: 120,
   *       on_art: 115
   *     },
   *     appointments: {
   *       today: 12,
   *       upcoming: 8,
   *       completed: 4,
   *       cancelled: 1
   *     },
   *     queue: {
   *       waiting: 5,
   *       now_serving: 3,
   *       average_wait_time: 15
   *     },
   *     medications: {
   *       low_stock: 3,
   *       total_items: 25
   *     }
   *   },
   *   recent_activities: [ ...last 5 activities ]
   * }
   */
  getStats: () => http.get('/dashboard/stats'),

  /**
   * GET /api/dashboard/charts - Get chart data
   * Headers: { Authorization: "Bearer token" }
   * 
   * Returns: {
   *   charts: {
   *     enrollment: { labels: [...], data: [...] },
   *     hiv_status: { labels: [...], data: [...] },
   *     appointments: { labels: [...], data: [...] }
   *   }
   * }
   */
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
  medications: medicationsApi,
  prescriptions: prescriptionsApi,
  labResults: labResultsApi,
  dashboard: dashboardApi
}