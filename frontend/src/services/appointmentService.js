// frontend/src/services/appointmentService.js
import api from '@/plugins/axios'

let cachedSettings = null

// FIXED: Helper function to format date to YYYY-MM-DD
const formatDateToYYYYMMDD = (date) => {
  if (!date) return null
  
  // If it's already a string in YYYY-MM-DD format
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date
  }
  
  // If it's a Date object or parsable string
  const d = new Date(date)
  if (isNaN(d.getTime())) {
    return null
  }
  
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default {
async createAppointment(data) {
  try {
    // For patients, we don't need patient_id or office
    // The backend gets patient_id from the authenticated user
    // office is determined from transaction_type_id
    console.log('Creating appointment with data:', data)
    
    // Only send what's needed
    const payload = {
      transaction_type_id: data.transaction_type_id,
      appointment_date: data.appointment_date,
      time_slot: data.time_slot,
      notes: data.notes || ''
    }
    
    // Only include patient_id if provided (for staff/admin)
    if (data.patient_id) {
      payload.patient_id = data.patient_id
    }
    
    console.log('Sending payload:', payload)
    const response = await api.post('/appointments', payload)
    console.log('Create appointment response:', response.data)
    return response.data
  } catch (error) {
    console.error('Create appointment error:', error.response?.data || error)
    throw error
  }
},

  async getAppointment(id) {
    try {
      console.log(`[appointmentService] Fetching appointment with ID: ${id}`)
      const response = await api.get(`/appointments/${id}`)
      console.log('[appointmentService] Raw response:', response.data)
      
      let appointment = null
      
      if (response.data && response.data.data) {
        appointment = response.data.data
      } else if (response.data && response.data.id) {
        appointment = response.data
      } else if (response.data && response.data.appointment) {
        appointment = response.data.appointment
      } else if (Array.isArray(response.data) && response.data.length > 0) {
        appointment = response.data[0]
      } else {
        appointment = response.data
      }
      
      console.log('[appointmentService] Parsed appointment:', appointment)
      return appointment
    } catch (error) {
      console.error('[appointmentService] Get appointment error:', error)
      throw error
    }
  },

  async updateAppointment(id, data) {
    try {
      const response = await api.put(`/appointments/${id}`, data)
      return response.data
    } catch (error) {
      console.error('Update appointment error:', error)
      throw error
    }
  },

  async getMyAppointments() {
    try {
      const response = await api.get('/appointments/my')
      console.log('My appointments response:', response.data)
      
      if (Array.isArray(response.data)) {
        return response.data
      }
      
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        return response.data.data
      }
      
      if (response.data && response.data.appointments && Array.isArray(response.data.appointments)) {
        return response.data.appointments
      }
      
      if (response.data && typeof response.data === 'object' && response.data.id) {
        return [response.data]
      }
      
      console.warn('Unexpected appointments response format:', response.data)
      return []
    } catch (error) {
      console.error('Get my appointments error:', error)
      return []
    }
  },

  async getAppointmentsByDate(date, office = null) {
    try {
      // FIXED: Ensure date is in YYYY-MM-DD format
      const formattedDate = formatDateToYYYYMMDD(date)
      if (!formattedDate) {
        console.error('Invalid date format:', date)
        return []
      }
      
      const url = office ? `/appointments/date/${formattedDate}?office=${office}` : `/appointments/date/${formattedDate}`
      console.log(`[appointmentService] Fetching appointments for date: ${formattedDate}`)
      const response = await api.get(url)
      console.log('[appointmentService] Appointments response:', response.data)
      
      if (Array.isArray(response.data)) {
        return response.data
      }
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        return response.data.data
      }
      if (response.data && response.data.appointments && Array.isArray(response.data.appointments)) {
        return response.data.appointments
      }
      
      return []
    } catch (error) {
      console.error('Get appointments by date error:', error)
      return []
    }
  },
async getAppointmentsByPatient(patientId) {
  try {
    console.log(`[appointmentService] Fetching appointments for patient: ${patientId}`)
    
    // Use the /my endpoint with patient_id query parameter
    // This works for staff/admin users
    const response = await api.get(`/appointments/my?patient_id=${patientId}`)
    console.log('[appointmentService] Patient appointments response:', response.data)
    
    // Handle different response formats
    if (Array.isArray(response.data)) {
      return response.data
    }
    
    if (response.data && response.data.data && Array.isArray(response.data.data)) {
      return response.data.data
    }
    
    if (response.data && response.data.appointments && Array.isArray(response.data.appointments)) {
      return response.data.appointments
    }
    
    return []
  } catch (error) {
    console.error('[appointmentService] Get appointments by patient error:', error)
    return []
  }
},

  async getAvailableSlots(date, office = null, patientId = null) {
    try {
      // Ensure date is in YYYY-MM-DD format
      const formattedDate = formatDateToYYYYMMDD(date)
      if (!formattedDate) {
        console.error('Invalid date format for available slots:', date)
        return { available: false, slots: [], message: 'Invalid date format' }
      }
      
      let url = `/appointments/available-slots/${formattedDate}`
      const params = new URLSearchParams()
      if (office) params.append('office', office)
      if (patientId) params.append('patientId', patientId)
      
      if (params.toString()) {
        url += `?${params.toString()}`
      }
      
      console.log(`[appointmentService] Fetching available slots for date: ${formattedDate}`)
      const response = await api.get(url)
      console.log('[appointmentService] Available slots response:', response.data)
      
      if (response.data && response.data.success && response.data.data) {
        return response.data.data
      }
      
      if (response.data && response.data.data) {
        return response.data.data
      }
      
      if (response.data && response.data.slots) {
        return response.data
      }
      
      return { available: false, slots: [], message: 'No response data' }
    } catch (error) {
      console.error('Get available slots error:', error)
      return { available: false, slots: [], message: error.message }
    }
  },

  async getDateAvailability(startDate, endDate, office = null) {
    try {
      // FIXED: Ensure dates are in YYYY-MM-DD format
      const formattedStart = formatDateToYYYYMMDD(startDate)
      const formattedEnd = formatDateToYYYYMMDD(endDate)
      
      if (!formattedStart || !formattedEnd) {
        console.error('Invalid date format:', { startDate, endDate })
        return []
      }
      
      let url = `/appointments/date-availability?startDate=${formattedStart}&endDate=${formattedEnd}`
      if (office) url += `&office=${office}`
      
      console.log(`[appointmentService] Fetching date availability from ${formattedStart} to ${formattedEnd}`)
      const response = await api.get(url)
      console.log('[appointmentService] Date availability response:', response.data)
      
      if (response.data && response.data.data) {
        return response.data.data
      }
      
      return []
    } catch (error) {
      console.error('Get date availability error:', error)
      return []
    }
  },

  async getNextAvailableDate(office = null, daysToCheck = 30) {
    try {
      let url = `/appointments/next-available?daysToCheck=${daysToCheck}`
      if (office) url += `&office=${office}`
      
      console.log('[appointmentService] Fetching next available date')
      const response = await api.get(url)
      console.log('[appointmentService] Next available date response:', response.data)
      
      if (response.data && response.data.data) {
        return response.data.data.nextAvailableDate
      }
      
      return null
    } catch (error) {
      console.error('Get next available date error:', error)
      return null
    }
  },

  async checkSlotAvailability(date, timeSlot, office = null) {
    try {
      // FIXED: Ensure date is in YYYY-MM-DD format
      const formattedDate = formatDateToYYYYMMDD(date)
      if (!formattedDate) {
        console.error('Invalid date format:', date)
        return { available: false }
      }
      
      let url = `/appointments/check-availability?date=${formattedDate}&timeSlot=${timeSlot}`
      if (office) url += `&office=${office}`
      
      console.log(`[appointmentService] Checking availability for ${formattedDate} at ${timeSlot}`)
      const response = await api.get(url)
      console.log('[appointmentService] Slot availability response:', response.data)
      
      if (response.data && response.data.data) {
        return response.data.data
      }
      
      return { available: false }
    } catch (error) {
      console.error('Check slot availability error:', error)
      return { available: false }
    }
  },

  async getAppointmentSettings(forceRefresh = false) {
    try {
      if (cachedSettings && !forceRefresh) {
        console.log('[appointmentService] Using cached settings')
        return cachedSettings
      }
      
      console.log('[appointmentService] Fetching appointment settings')
      const response = await api.get('/appointments/settings')
      console.log('[appointmentService] Settings response:', response.data)
      
      if (response.data && response.data.data) {
        cachedSettings = response.data.data
        return cachedSettings
      }
      
      return {}
    } catch (error) {
      console.error('Get appointment settings error:', error)
      return cachedSettings || {}
    }
  },

  clearSettingsCache() {
    cachedSettings = null
  },

  async cancelAppointment(id, reason) {
    try {
      const response = await api.put(`/appointments/${id}/cancel`, { 
        reason: reason || 'Cancelled by patient' 
      })
      return response.data
    } catch (error) {
      console.error('Cancel appointment error:', error)
      throw error
    }
  },

  async rescheduleAppointment(id, date, timeSlot) {
    try {
      // FIXED: Ensure date is in YYYY-MM-DD format
      const formattedDate = formatDateToYYYYMMDD(date)
      if (!formattedDate) {
        throw new Error('Invalid date format')
      }
      
      const response = await api.put(`/appointments/${id}/reschedule`, {
        appointment_date: formattedDate,
        time_slot: timeSlot
      })
      return response.data
    } catch (error) {
      console.error('Reschedule appointment error:', error)
      throw error
    }
  },

  async checkInPatient(id) {
    try {
      const response = await api.put(`/appointments/${id}/checkin`)
      return response.data
    } catch (error) {
      console.error('Check-in error:', error)
      throw error
    }
  }
}