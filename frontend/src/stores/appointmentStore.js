// frontend/src/stores/appointmentStore.js
import { defineStore } from 'pinia'
import appointmentService from '@/services/appointmentService'

export const useAppointmentStore = defineStore('appointment', {
  state: () => ({
    appointments: [],
    currentAppointment: null,
    loading: false,
    error: null,
    settings: null,
    availableSlots: [],
    // Dynamic values from settings
    slotDuration: 30,
    clinicStartTime: '08:00',
    clinicEndTime: '17:00',
    lunchBreakStart: '12:00',
    lunchBreakEnd: '13:00',
    workingDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
    holidays: [],
    advanceBookingDays: 30,
    bookingLeadTimeMinutes: 60,
    maxSlotsPerTime: 5
  }),

  getters: {
    getAppointmentsByDate: (state) => (date) => {
      return state.appointments.filter(
        app => app.appointment_date === date
      )
    },

    getUpcomingAppointments: (state) => {
      const today = new Date().toISOString().split('T')[0]
      return state.appointments
        .filter(app => app.appointment_date >= today && app.status !== 'cancelled')
        .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date))
    },

    getPastAppointments: (state) => {
      const today = new Date().toISOString().split('T')[0]
      return state.appointments
        .filter(app => app.appointment_date < today || app.status === 'completed')
        .sort((a, b) => b.appointment_date.localeCompare(a.appointment_date))
    },

    getAvailableTimeSlots: (state) => {
      return state.availableSlots || []
    },

    // Dynamic getters that use settings
    isOnlineBookingEnabled: (state) => {
      return state.settings?.allow_online_booking !== false
    },

    isOnlineCancellationEnabled: (state) => {
      return state.settings?.allow_online_cancellation !== false
    },

    getCancellationDeadlineHours: (state) => {
      return state.settings?.cancellation_deadline_hours || 24
    },

    getMaxAppointmentsPerDay: (state) => {
      return state.settings?.max_appointments_per_patient_per_day || 1
    }
  },

  actions: {
async bookAppointment(data) {
  this.loading = true
  this.error = null
  try {
    console.log('Store: Booking appointment with data:', data)
    
    // Ensure we have the required fields
    const appointmentData = { ...data }
    
    // If patient_id is not provided, the backend will get it from the authenticated user
    // For patients, we don't need to send patient_id - backend handles it
    // Only send patient_id for staff/admin booking on behalf of patients
    
    // Ensure office is set (should come from transaction_type_id)
    // The backend will determine office from transaction_type_id
    
    const result = await appointmentService.createAppointment(appointmentData)
    await this.loadMyAppointments()
    return result
  } catch (error) {
    console.error('Failed to book appointment:', error)
    this.error = error.message
    throw error
  } finally {
    this.loading = false
  }
},

    async loadMyAppointments() {
      this.loading = true
      this.error = null
      try {
        const data = await appointmentService.getMyAppointments()
        if (Array.isArray(data)) {
          this.appointments = data
        } else if (data && data.data && Array.isArray(data.data)) {
          this.appointments = data.data
        } else if (data && data.appointments && Array.isArray(data.appointments)) {
          this.appointments = data.appointments
        } else {
          this.appointments = []
          console.warn('Unexpected appointments response format:', data)
        }
        return this.appointments
      } catch (error) {
        console.error('Failed to load appointments:', error)
        this.error = error.message
        this.appointments = []
        throw error
      } finally {
        this.loading = false
      }
    },

    async loadAppointmentsByDate(date, office = null) {
      this.loading = true
      this.error = null
      try {
        const data = await appointmentService.getAppointmentsByDate(date, office)
        if (Array.isArray(data)) {
          this.appointments = data
          return data
        } else if (data && data.data && Array.isArray(data.data)) {
          this.appointments = data.data
          return data.data
        } else if (data && data.appointments && Array.isArray(data.appointments)) {
          this.appointments = data.appointments
          return data.appointments
        }
        this.appointments = []
        return []
      } catch (error) {
        console.error('Failed to load appointments by date:', error)
        this.error = error.message
        this.appointments = []
        throw error
      } finally {
        this.loading = false
      }
    },

    // Load available slots for a date
    async loadAvailableSlots(date, office = null, patientId = null) {
      this.loading = true
      this.error = null
      try {
        const result = await appointmentService.getAvailableSlots(date, office, patientId)
        this.availableSlots = result.slots || []
        return result
      } catch (error) {
        console.error('Failed to load available slots:', error)
        this.error = error.message
        this.availableSlots = []
        throw error
      } finally {
        this.loading = false
      }
    },

    // Load appointment settings and update state
    async loadAppointmentSettings(forceRefresh = false) {
      try {
        const settings = await appointmentService.getAppointmentSettings(forceRefresh)
        this.settings = settings
        
        // Update dynamic state values from settings
        this.slotDuration = settings.slot_duration_minutes || 30
        this.clinicStartTime = settings.clinic_start_time || '08:00'
        this.clinicEndTime = settings.clinic_end_time || '17:00'
        this.lunchBreakStart = settings.lunch_break_start || '12:00'
        this.lunchBreakEnd = settings.lunch_break_end || '13:00'
        this.workingDays = settings.working_days || ['mon', 'tue', 'wed', 'thu', 'fri']
        this.holidays = settings.holidays || []
        this.advanceBookingDays = settings.advance_booking_days || 30
        this.bookingLeadTimeMinutes = settings.booking_lead_time_minutes || 60
        this.maxSlotsPerTime = settings.max_capacity_per_slot || 5
        
        return settings
      } catch (error) {
        console.error('Failed to load appointment settings:', error)
        this.error = error.message
        throw error
      }
    },

    // Load date availability
    async loadDateAvailability(startDate, endDate, office = null) {
      try {
        return await appointmentService.getDateAvailability(startDate, endDate, office)
      } catch (error) {
        console.error('Failed to load date availability:', error)
        throw error
      }
    },

    async getAppointment(id) {
      this.loading = true
      this.error = null
      try {
        const appointment = await appointmentService.getAppointment(id)
        this.currentAppointment = appointment
        return appointment
      } catch (error) {
        console.error('Failed to get appointment:', error)
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    async createAppointment(data) {
      this.loading = true
      this.error = null
      try {
        const result = await appointmentService.createAppointment(data)
        await this.loadMyAppointments()
        return result
      } catch (error) {
        console.error('Failed to create appointment:', error)
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    async updateAppointment(id, data) {
      this.loading = true
      this.error = null
      try {
        const result = await appointmentService.updateAppointment(id, data)
        const index = this.appointments.findIndex(app => app.id === id)
        if (index !== -1) {
          this.appointments[index] = { ...this.appointments[index], ...data }
        }
        if (this.currentAppointment?.id === id) {
          this.currentAppointment = { ...this.currentAppointment, ...data }
        }
        return result
      } catch (error) {
        console.error('Failed to update appointment:', error)
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    async cancelAppointment(id, reason) {
      this.loading = true
      this.error = null
      try {
        // Check if cancellation is allowed based on settings
        if (!this.isOnlineCancellationEnabled) {
          throw new Error('Online cancellation is currently disabled')
        }
        
        const result = await appointmentService.cancelAppointment(id, reason)
        const index = this.appointments.findIndex(app => app.id === id)
        if (index !== -1) {
          this.appointments[index].status = 'cancelled'
          this.appointments[index].cancellation_reason = reason
        }
        if (this.currentAppointment?.id === id) {
          this.currentAppointment.status = 'cancelled'
          this.currentAppointment.cancellation_reason = reason
        }
        await this.loadMyAppointments()
        return result
      } catch (error) {
        console.error('Failed to cancel appointment:', error)
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    async rescheduleAppointment(id, date, timeSlot) {
      this.loading = true
      this.error = null
      try {
        // Check if rescheduling is allowed
        if (!this.isOnlineBookingEnabled) {
          throw new Error('Online booking is currently disabled')
        }
        
        const result = await appointmentService.rescheduleAppointment(id, date, timeSlot)
        const index = this.appointments.findIndex(app => app.id === id)
        if (index !== -1) {
          this.appointments[index].appointment_date = date
          this.appointments[index].time_slot = timeSlot
        }
        if (this.currentAppointment?.id === id) {
          this.currentAppointment.appointment_date = date
          this.currentAppointment.time_slot = timeSlot
        }
        await this.loadMyAppointments()
        return result
      } catch (error) {
        console.error('Failed to reschedule appointment:', error)
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    async checkInPatient(id) {
      this.loading = true
      this.error = null
      try {
        const result = await appointmentService.checkInPatient(id)
        const index = this.appointments.findIndex(app => app.id === id)
        if (index !== -1) {
          this.appointments[index].status = 'checked-in'
        }
        if (this.currentAppointment?.id === id) {
          this.currentAppointment.status = 'checked-in'
        }
        await this.loadMyAppointments()
        return result
      } catch (error) {
        console.error('Failed to check in:', error)
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    // Helper to check if a date is a working day
    isWorkingDay(dateStr) {
      const date = new Date(dateStr)
      const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
      const dayOfWeek = dayNames[date.getDay()]
      return this.workingDays.includes(dayOfWeek)
    },

    // Helper to check if a date is a holiday
    isHoliday(dateStr) {
      return this.holidays.includes(dateStr)
    },

    // Helper to check if a date is available for booking
    isDateAvailableForBooking(dateStr) {
      return this.isWorkingDay(dateStr) && !this.isHoliday(dateStr)
    },

    // Helper to get available dates within a range
    getAvailableDates(startDate, endDate) {
      const dates = []
      const current = new Date(startDate)
      const end = new Date(endDate)
      
      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0]
        if (this.isDateAvailableForBooking(dateStr)) {
          dates.push(dateStr)
        }
        current.setDate(current.getDate() + 1)
      }
      
      return dates
    },

    // Helper to format time based on settings
    formatTime(timeStr) {
      if (!timeStr) return ''
      const [hours, minutes] = timeStr.split(':').map(Number)
      const ampm = hours >= 12 ? 'PM' : 'AM'
      const hour12 = hours % 12 || 12
      return `${hour12}:${String(minutes).padStart(2, '0')} ${ampm}`
    },

    // Helper to format date based on settings
    formatDate(dateStr) {
      try {
        const timezone = this.settings?.timezone || 'Asia/Manila'
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

    clearStore() {
      this.appointments = []
      this.currentAppointment = null
      this.loading = false
      this.error = null
      this.settings = null
      this.availableSlots = []
      // Reset dynamic values
      this.slotDuration = 30
      this.clinicStartTime = '08:00'
      this.clinicEndTime = '17:00'
      this.lunchBreakStart = '12:00'
      this.lunchBreakEnd = '13:00'
      this.workingDays = ['mon', 'tue', 'wed', 'thu', 'fri']
      this.holidays = []
      this.advanceBookingDays = 30
      this.bookingLeadTimeMinutes = 60
      this.maxSlotsPerTime = 5
    }
  }
})