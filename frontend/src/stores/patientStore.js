// frontend/src/stores/patientStore.js
import { defineStore } from 'pinia'
import { patientsApi } from '@/api'

export const usePatientStore = defineStore('patient', {
  state: () => ({
    patients: [],
    currentPatient: null,
    loading: false,
    error: null
  }),

  actions: {
    async searchPatients(query) {
      this.loading = true
      try {
        // The backend returns the array directly, not wrapped in a data property
        const response = await patientsApi.search(query)
        // response.data contains the actual array from the backend
        this.patients = response.data || []
        return this.patients
      } catch (error) {
        console.error('Error in searchPatients:', error)
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchPatient(id) {
      this.loading = true
      try {
        const response = await patientsApi.getById(id)
        this.currentPatient = response.data.patient
        return this.currentPatient
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    async createPatient(data) {
      try {
        const response = await patientsApi.create(data)
        return response.data
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    async updatePatient(id, data) {
      try {
        const response = await patientsApi.update(id, data)
        return response.data
      } catch (error) {
        this.error = error.message
        throw error
      }
    }
  }
})