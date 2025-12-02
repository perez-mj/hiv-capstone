// frontend/src/stores/patient.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { patientsApi, dltApi } from '@/api'

export const usePatientStore = defineStore('patient', () => {
  // State
  const patients = ref([])
  const loading = ref(false)
  const error = ref(null)
  const stats = ref({})

  // Getters
  const totalPatients = computed(() => patients.value.length)
  const consentedPatients = computed(() =>
    patients.value.filter(p => p.consent_status === 'YES').length
  )
  const reactivePatients = computed(() =>
    patients.value.filter(p => p.hiv_status === 'Reactive').length
  )
  const verifiedPatients = computed(() =>
    patients.value.filter(p => p.dlt_status === 'verified').length
  )

  // Actions
  const fetchPatients = async () => {
    loading.value = true
    error.value = null
    try {
      const response = await patientsApi.getAll({ limit: 1000 })
      patients.value = response.data.patients || []
    } catch (err) {
      error.value = err.message
      console.error('Failed to fetch patients:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchPatientStats = async () => {
    try {
      const response = await patientsApi.getStats()
      stats.value = response.data
    } catch (err) {
      console.error('Failed to fetch patient stats:', err)
    }
  }

  const createPatient = async (patientData) => {
    loading.value = true
    try {
      const response = await patientsApi.create(patientData)
      await fetchPatients() // Refresh the list to get DLT status from view
      return response.data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const updatePatient = async (patientId, patientData) => {
    loading.value = true
    try {
      const response = await patientsApi.update(patientId, patientData)
      await fetchPatients() // Refresh the list to get updated DLT status
      return response.data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const deletePatient = async (patientId) => {
    loading.value = true
    try {
      await patientsApi.delete(patientId)
      patients.value = patients.value.filter(p => p.patient_id !== patientId)
      return true
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const verifyDltIntegrity = async (patientId) => {
    try {
      const response = await dltApi.verify(patientId)
      
      // Refresh patients to get updated DLT status from the view
      await fetchPatients()
      
      return response.data
    } catch (err) {
      error.value = err.response?.data?.error || err.message
      throw err
    }
  }

  const getDltHistory = async (patientId) => {
    try {
      const response = await dltApi.getHashes(patientId)
      return response.data
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  // Search and filter utilities
  const searchPatients = (query) => {
    if (!query) return patients.value

    const q = query.toLowerCase()
    return patients.value.filter(patient =>
      patient.name.toLowerCase().includes(q) ||
      patient.patient_id.toLowerCase().includes(q) ||
      (patient.contact_info && patient.contact_info.toLowerCase().includes(q)) ||
      (patient.contact && patient.contact.toLowerCase().includes(q)) ||
      patient.hiv_status.toLowerCase().includes(q)
    )
  }

  // Clear errors
  const clearError = () => {
    error.value = null
  }

  return {
    // State
    patients,
    loading,
    error,
    stats,

    // Getters
    totalPatients,
    consentedPatients,
    reactivePatients,
    verifiedPatients,

    // Actions
    fetchPatients,
    fetchPatientStats,
    createPatient,
    updatePatient,
    deletePatient,
    verifyDltIntegrity,
    getDltHistory,
    searchPatients,
    clearError
  }
})