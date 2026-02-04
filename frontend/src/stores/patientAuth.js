// src/stores/patientAuth.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import http from '@/api/http'
import { useRouter } from 'vue-router'

export const usePatientAuthStore = defineStore('patientAuth', () => {
  const router = useRouter()

  // State
  const token = ref(localStorage.getItem('patientToken'))
  const patient = ref(JSON.parse(localStorage.getItem('patientData') || 'null'))
  const loading = ref(false)

  // Getters
  const isAuthenticated = computed(() => {
    const hasToken = !!token.value
    const hasPatient = !!patient.value
    console.log('🔍 Patient Auth check:', { hasToken, hasPatient })
    return hasToken && hasPatient
  })
  
  const patientName = computed(() => patient.value?.name || 'Patient')

  // Actions
  const login = async (credentials) => {
    loading.value = true
    try {
      console.log('🔐 Patient login attempt:', credentials.patientId)

      const response = await http.post('/patient/auth/login', credentials)
      console.log('✅ Patient login response:', response.data)

      const { token: newToken, patient: patientData } = response.data

      // Validate response
      if (!newToken) {
        throw new Error('No token received from server')
      }

      // Update state
      token.value = newToken
      patient.value = patientData

      // Persist to localStorage
      localStorage.setItem('patientToken', newToken)
      localStorage.setItem('patientData', JSON.stringify(patientData))

      console.log('💾 Patient auth stored in localStorage')

      // Navigate to patient dashboard
      if (router) {
        await router.push('/patient/dashboard')
      } else {
        window.location.href = '/patient/dashboard'
      }

      return response.data
    } catch (error) {
      console.error('❌ Patient login failed:', error)
      
      let errorMessage = 'Login failed'
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      }
      
      throw new Error(errorMessage)
    } finally {
      loading.value = false
    }
  }

  const logout = async () => {
    console.log('🚪 Patient logging out...')
    
    try {
      // Call logout API
      await http.post('/patient/auth/logout').catch(() => {
        // Ignore if API fails
      })
    } finally {
      // Clear local state
      token.value = null
      patient.value = null
      localStorage.removeItem('patientToken')
      localStorage.removeItem('patientData')
      
      // Redirect to patient login
      if (router) {
        router.push('/patient/login')
      } else {
        window.location.href = '/patient/login'
      }
    }
  }

  const checkAuth = async () => {
    try {
      console.log('🔄 Checking patient auth status...')
      
      if (!token.value) {
        console.log('⚠️ No patient token found')
        return false
      }

      const response = await http.get('/patient/auth/check')
      
      if (response.data && response.data.patient) {
        console.log('✅ Patient auth check successful')
        return true
      }
      
      return false
    } catch (error) {
      console.error('❌ Patient auth check failed:', error.message)
      
      if (error.response?.status === 401) {
        logout()
      }
      
      return false
    }
  }

  // Initialize
  const initialize = () => {
    const storedToken = localStorage.getItem('patientToken')
    const storedPatient = localStorage.getItem('patientData')
    
    if (storedToken && storedPatient) {
      try {
        token.value = storedToken
        patient.value = JSON.parse(storedPatient)
        console.log('📋 Patient auth initialized from localStorage')
      } catch (e) {
        console.error('Failed to parse stored patient:', e)
        logout()
      }
    }
  }

  initialize()

  return {
    // State
    token,
    patient,
    loading,

    // Getters
    isAuthenticated,
    patientName,

    // Actions
    login,
    logout,
    checkAuth
  }
})