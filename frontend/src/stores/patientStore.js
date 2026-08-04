// frontend/src/stores/patientStore.js
import { defineStore } from 'pinia';
import api from '@/plugins/axios';

export const usePatientStore = defineStore('patient', {
  state: () => ({
    currentPatient: null,
    patients: [],
    loading: false
  }),

  actions: {
    async loadMyPatient() {
      this.loading = true;
      try {
        const response = await api.get('/patients/me');
        this.currentPatient = response.data;
        return this.currentPatient;
      } catch (error) {
        console.error('Error loading patient:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updatePatient(id, data) {
      try {
        const response = await api.put(`/patients/${id}`, data);
        if (this.currentPatient?.id === id) {
          this.currentPatient = response.data;
        }
        return response.data;
      } catch (error) {
        console.error('Error updating patient:', error);
        throw error;
      }
    }
  }
});