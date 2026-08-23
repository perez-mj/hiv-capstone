// frontend/src/services/appointmentService.js
import api from '@/plugins/axios'

// Constants that should come from backend settings
let cachedSettings = null

export default {
  async createAppointment(data) {
    try {
      console.log('Creating appointment with data:', data)
      const response = await api.post('/appointments', data)
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
      if (!date) {
        console.warn('No date provided, using today')
        const today = new Date()
        date = today.toISOString().split('T')[0]
      }
      
      const url = office ? `/appointments/date/${date}?office=${office}` : `/appointments/date/${date}`
      console.log(`[appointmentService] Fetching appointments for date: ${date}`)
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

  // Get available time slots for a specific date
  async getAvailableSlots(date, office = null, patientId = null) {
    try {
      let url = `/appointments/available-slots/${date}`
      const params = new URLSearchParams()
      if (office) params.append('office', office)
      if (patientId) params.append('patientId', patientId)
      
      if (params.toString()) {
        url += `?${params.toString()}`
      }
      
      console.log(`[appointmentService] Fetching available slots for date: ${date}`)
      const response = await api.get(url)
      console.log('[appointmentService] Available slots response:', response.data)
      
      if (response.data && response.data.data) {
        return response.data.data
      }
      
      return { available: false, slots: [], message: 'No response data' }
    } catch (error) {
      console.error('Get available slots error:', error)
      return { available: false, slots: [], message: error.message }
    }
  },

  // Get date availability for a range
  async getDateAvailability(startDate, endDate, office = null) {
    try {
      let url = `/appointments/date-availability?startDate=${startDate}&endDate=${endDate}`
      if (office) url += `&office=${office}`
      
      console.log(`[appointmentService] Fetching date availability from ${startDate} to ${endDate}`)
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

  // Get next available date
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

  // Check specific slot availability
  async checkSlotAvailability(date, timeSlot, office = null) {
    try {
      let url = `/appointments/check-availability?date=${date}&timeSlot=${timeSlot}`
      if (office) url += `&office=${office}`
      
      console.log(`[appointmentService] Checking availability for ${date} at ${timeSlot}`)
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

  // Get appointment settings with caching
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
      // Return cached settings if available, otherwise empty object
      return cachedSettings || {}
    }
  },

  // Helper to clear cached settings
  clearSettingsCache() {
    cachedSettings = null
  },

  // Helper to format date based on settings
  async formatDateForDisplay(dateStr) {
    try {
      const settings = await this.getAppointmentSettings()
      const timezone = settings.timezone || 'Asia/Manila'
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-PH', { 
        timeZone: timezone,
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    } catch (error) {
      console.error('Error formatting date:', error)
      return dateStr
    }
  },

  // Helper to get working days from settings
  async getWorkingDays() {
    try {
      const settings = await this.getAppointmentSettings()
      return settings.working_days || ['mon', 'tue', 'wed', 'thu', 'fri']
    } catch (error) {
      console.error('Error getting working days:', error)
      return ['mon', 'tue', 'wed', 'thu', 'fri']
    }
  },

  // Helper to check if a date is a working day
  async isWorkingDay(dateStr) {
    try {
      const workingDays = await this.getWorkingDays()
      const date = new Date(dateStr)
      const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
      const dayOfWeek = dayNames[date.getDay()]
      return workingDays.includes(dayOfWeek)
    } catch (error) {
      console.error('Error checking working day:', error)
      // Default to Monday-Friday
      const date = new Date(dateStr)
      return date.getDay() >= 1 && date.getDay() <= 5
    }
  },

  // Helper to get slot duration from settings
  async getSlotDuration() {
    try {
      const settings = await this.getAppointmentSettings()
      return settings.slot_duration_minutes || 30
    } catch (error) {
      console.error('Error getting slot duration:', error)
      return 30
    }
  },

  // Helper to get clinic hours from settings
  async getClinicHours() {
    try {
      const settings = await this.getAppointmentSettings()
      return {
        start: settings.clinic_start_time || '08:00',
        end: settings.clinic_end_time || '17:00',
        lunchStart: settings.lunch_break_start || '12:00',
        lunchEnd: settings.lunch_break_end || '13:00'
      }
    } catch (error) {
      console.error('Error getting clinic hours:', error)
      return {
        start: '08:00',
        end: '17:00',
        lunchStart: '12:00',
        lunchEnd: '13:00'
      }
    }
  },

  // Helper to generate time slots based on settings
  async generateTimeSlots(date, office = null) {
    try {
      // Use the backend to generate slots
      const result = await this.getAvailableSlots(date, office)
      return result.slots || []
    } catch (error) {
      console.error('Error generating time slots:', error)
      return []
    }
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
      const response = await api.put(`/appointments/${id}/reschedule`, {
        appointment_date: date,
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