// frontend/src/services/patientService.js
import api from '@/plugins/axios'

export default {
  /**
   * List patients with pagination and search.
   *
   * @param {number} page
   * @param {number} limit
   * @param {string} search
   * @param {string|null} purpose - 'testing' | 'treatment' | null
   * @param {number|string|null} year - filter by enrollment year
   */
  async getPatients(page = 1, limit = 20, search = '', purpose = null, year = null) {
    const response = await api.get('/patients', {
      params: { page, limit, search, purpose, year }
    })
    return response.data
  },

  /**
   * Get a single patient by ID.
   * Response includes: current address (sitio_street, barangay_id,
   * city_municipality_id, province_id) and permanent address
   * (permanent_sitio_street, permanent_barangay_id,
   * permanent_city_municipality_id, permanent_province_id,
   * same_as_current_address).
   */
  async getPatient(id) {
    const response = await api.get(`/patients/${id}`)
    return response.data
  },

  /**
   * Search patients by facility code (backend supports LIKE on code).
   */
  async searchPatients(query, limit = 10) {
    if (!query || query.length < 2) return []
    const response = await api.get(
      `/patients/search/${encodeURIComponent(query)}`,
      { params: { limit } }
    )
    return response.data
  },

  /**
   * Get own patient profile (patient role).
   */
  async getMyProfile() {
    const response = await api.get('/patients/me')
    return response.data
  },

  /**
   * Create a new patient.
   *
   * Payload may include portal account fields:
   *   create_portal_account, username, email, password
   *
   * Payload may also include permanent-address fields. If
   * same_as_current_address is true, the backend hook mirrors the
   * current address into the permanent_* columns automatically.
   */
  async createPatient(data) {
    const response = await api.post('/patients', data)
    return response.data
  },

  /**
   * Update a patient.
   *
   * For address-only updates (used by the patient self-service profile
   * screen), prefer updateAddress() below — it strips the payload down
   * to the fields the patient role is allowed to change.
   */
  async updatePatient(id, data) {
    const response = await api.put(`/patients/${id}`, data)
    return response.data
  },

  /**
   * Address-only update. Sends only the current + permanent address
   * fields (plus the same_as_current_address flag). Useful when a
   * patient updates their own address from the portal — the backend
   * updatePatient() whitelist allows exactly these keys for the
   * 'patient' role.
   */
  async updateAddress(id, {
    sitio_street,
    barangay_id,
    city_municipality_id,
    province_id,
    same_as_current_address,
    permanent_sitio_street,
    permanent_barangay_id,
    permanent_city_municipality_id,
    permanent_province_id
  }) {
    const payload = {
      sitio_street,
      barangay_id,
      city_municipality_id,
      province_id,
      same_as_current_address,
      permanent_sitio_street,
      permanent_barangay_id,
      permanent_city_municipality_id,
      permanent_province_id
    }
    // Strip undefined so we don't overwrite fields the caller didn't set
    Object.keys(payload).forEach((k) => {
      if (payload[k] === undefined) delete payload[k]
    })
    const response = await api.put(`/patients/${id}`, payload)
    return response.data
  },

  /**
   * Delete a patient (soft by default, hard=true for admin).
   */
  async deletePatient(id, hard = false) {
    const response = await api.delete(`/patients/${id}`, {
      params: { hard }
    })
    return response.data
  },

  /**
   * Patient history (appointments, testing, treatment).
   */
  async getPatientHistory(id) {
    const response = await api.get(`/patients/${id}/history`)
    return response.data
  },

  /**
   * Patient stats.
   */
  async getStats() {
    const response = await api.get('/patients/stats')
    return response.data
  },

  /**
   * Regenerate facility code (admin only).
   */
  async regenerateCode(id) {
    const response = await api.post(`/patients/${id}/regenerate-code`)
    return response.data
  },

  /**
   * Validate a facility code format.
   */
  async validateCode(code) {
    const response = await api.get(
      `/patients/validate-code/${encodeURIComponent(code)}`
    )
    return response.data
  },

  /**
   * Export patients as JSON or CSV.
   */
  async exportPatients(format = 'json', search = '') {
    const response = await api.get('/patients/export', {
      params: { format, search },
      responseType: format === 'csv' ? 'blob' : 'json'
    })
    return response.data
  }
}