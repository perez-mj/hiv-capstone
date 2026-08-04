// frontend/src/stores/appointmentStore.js
import { defineStore } from 'pinia'
import appointmentService from '@/services/appointmentService'

export const useAppointmentStore = defineStore('appointment', {
  state: () => ({
    appointments: [],
    currentAppointment: null,
    loading: false,
    error: null
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
    }
  },

  actions: {
    // FIXED: Book appointment for patients
    async bookAppointment(data) {
      this.loading = true
      this.error = null
      try {
        console.log('Store: Booking appointment with data:', data);
        // Data already has the correct format from the component
        const result = await appointmentService.createAppointment(data)
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
        // Handle different response formats
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
        // Reload appointments to refresh list
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
        // Update the appointment in the list
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
        const result = await appointmentService.cancelAppointment(id, reason)
        // Update the appointment status in the list
        const index = this.appointments.findIndex(app => app.id === id)
        if (index !== -1) {
          this.appointments[index].status = 'cancelled'
          this.appointments[index].cancellation_reason = reason
        }
        if (this.currentAppointment?.id === id) {
          this.currentAppointment.status = 'cancelled'
          this.currentAppointment.cancellation_reason = reason
        }
        // Reload appointments to refresh list
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
        const result = await appointmentService.rescheduleAppointment(id, date, timeSlot)
        // Update the appointment in the list
        const index = this.appointments.findIndex(app => app.id === id)
        if (index !== -1) {
          this.appointments[index].appointment_date = date
          this.appointments[index].time_slot = timeSlot
        }
        if (this.currentAppointment?.id === id) {
          this.currentAppointment.appointment_date = date
          this.currentAppointment.time_slot = timeSlot
        }
        // Reload appointments to refresh list
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
        // Update the appointment status in the list
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

    // Clear store data
    clearStore() {
      this.appointments = []
      this.currentAppointment = null
      this.loading = false
      this.error = null
    }
  }
})