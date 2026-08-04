// frontend/src/services/appointmentService.js
import api from '@/plugins/axios'

export default {
  async createAppointment(data) {
    try {
      // For patients, we need to get their patient ID from the backend
      // The backend will use the authenticated user to find the patient
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
      
      // Handle different response formats
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
      
      // Return the data directly if it's an array
      if (Array.isArray(response.data)) {
        return response.data
      }
      
      // If it's wrapped in a data property
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        return response.data.data
      }
      
      // If it's wrapped in an appointments property
      if (response.data && response.data.appointments && Array.isArray(response.data.appointments)) {
        return response.data.appointments
      }
      
      // If it's a single object, wrap it in an array
      if (response.data && typeof response.data === 'object' && response.data.id) {
        return [response.data]
      }
      
      // Return empty array if nothing matches
      console.warn('Unexpected appointments response format:', response.data)
      return []
    } catch (error) {
      console.error('Get my appointments error:', error)
      return []
    }
  },

  async getAppointmentsByDate(date, office = null) {
    try {
      // Validate date
      if (!date) {
        console.warn('No date provided, using today')
        const today = new Date()
        date = today.toISOString().split('T')[0]
      }
      
      const url = office ? `/appointments/date/${date}?office=${office}` : `/appointments/date/${date}`
      console.log(`[appointmentService] Fetching appointments for date: ${date}`)
      const response = await api.get(url)
      console.log('[appointmentService] Appointments response:', response.data)
      
      // Return data in a consistent format
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