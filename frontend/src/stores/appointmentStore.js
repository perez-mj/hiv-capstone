// frontend/src/stores/appointmentStore.js
import { defineStore } from 'pinia'
import { appointmentsApi } from '@/api'

export const useAppointmentStore = defineStore('appointment', {
  state: () => ({
    appointments: [],
    types: [],
    loading: false,
    error: null
  }),

  actions: {
    async fetchTypes() {
      try {
        const response = await appointmentsApi.getTypes()
        this.types = response.data.data || []
        return this.types
      } catch (error) {
        console.error('Error in fetchTypes:', error)
        this.error = error.message
        throw error
      }
    },

    async fetchAppointments(params) {
      this.loading = true
      try {
        const response = await appointmentsApi.getAll(params)
        this.appointments = response.data.data || []
        return this.appointments
      } catch (error) {
        console.error('Error in fetchAppointments:', error)
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    async createAppointment(data) {
      try {
        // Ensure IDs are numbers
        const payload = {
          patient_id: parseInt(data.patient_id),
          appointment_type_id: parseInt(data.appointment_type_id),
          scheduled_at: data.scheduled_at,
          notes: data.notes
        }
        
        console.log('Creating appointment with payload:', payload)
        const response = await appointmentsApi.create(payload)
        return response.data
      } catch (error) {
        console.error('Error in createAppointment:', error)
        this.error = error.message
        throw error
      }
    },

    async updateAppointment(id, data) {
      try {
        // Ensure IDs are numbers
        const payload = {
          patient_id: parseInt(data.patient_id),
          appointment_type_id: parseInt(data.appointment_type_id),
          scheduled_at: data.scheduled_at,
          notes: data.notes
        }
        
        console.log('Updating appointment with payload:', payload)
        const response = await appointmentsApi.update(id, payload)
        return response.data
      } catch (error) {
        console.error('Error in updateAppointment:', error)
        this.error = error.message
        throw error
      }
    },

    async updateAppointmentStatus(id, status) {
      try {
        const response = await appointmentsApi.updateStatus(id, { status })
        return response.data
      } catch (error) {
        console.error('Error in updateAppointmentStatus:', error)
        this.error = error.message
        throw error
      }
    },

    async checkAvailability(params) {
      try {
        // Ensure type_id is a number
        const queryParams = {
          date: params.date,
          type_id: parseInt(params.type_id)
        }
        
        const response = await appointmentsApi.checkAvailability(queryParams)
        return response.data
      } catch (error) {
        console.error('Error in checkAvailability:', error)
        this.error = error.message
        throw error
      }
    }
  }
})