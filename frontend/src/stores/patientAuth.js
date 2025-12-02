// frontend/src/stores/patientAuth.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import http from '@/api/http'
import { useRouter } from 'vue-router'

export const usePatientAuthStore = defineStore('patientAuth', () => {
  const router = useRouter()

  // State - initialize from localStorage
  const token = ref(localStorage.getItem('patientToken'))
  const patient = ref(JSON.parse(localStorage.getItem('patientData') || 'null'))
  const loading = ref(false)

  // Getters
  const isAuthenticated = computed(() => !!token.value)
  const patientName = computed(() => patient.value?.name)
  const patientId = computed(() => patient.value?.patient_id)

  // Actions
  const login = async (credentials) => {
    loading.value = true
    try {
      console.log('\U0001f510 Patient login attempt:', credentials)

      const response = await http.post('/patient/auth/login', credentials)
      const { token: newToken, patient: patientData } = response.data

      console.log('\u2705 Patient login response received')

      // CRITICAL: Update the store state
      token.value = newToken
      patient.value = patientData

      // Persist to localStorage
      localStorage.setItem('patientToken', newToken)
      localStorage.setItem('patientData', JSON.stringify(patientData))

      console.log('\U0001f4be Store and localStorage updated:', {
        tokenSet: !!newToken,
        patientData: !!patientData,
        isAuthenticated: isAuthenticated.value
      })

      // Navigate to patient dashboard
      console.log('\U0001f504 Navigating to patient dashboard...')
      await router.push('/patient/dashboard')

      return response.data

    } catch (error) {
      console.error('\u274c Patient login error in store:', error)
      // Clear any partial authentication
      token.value = null
      patient.value = null
      localStorage.removeItem('patientToken')
      localStorage.removeItem('patientData')
      throw error
    } finally {
      loading.value = false
    }
  }

  const logout = () => {
    console.log('\U0001f6aa Patient logging out...')
    token.value = null
    patient.value = null
    localStorage.removeItem('patientToken')
    localStorage.removeItem('patientData')

    if (router) {
      router.push('/patient/login')
    }
  }

  const checkAuth = async () => {
    const storedToken = localStorage.getItem('patientToken')
    const storedPatient = localStorage.getItem('patientData')

    console.log('\U0001f50d Checking patient auth:', { 
      storedToken: !!storedToken, 
      storedPatient: !!storedPatient 
    })

    if (storedToken && storedPatient) {
      try {
        // Verify token is still valid
        const response = await http.get('/patient/auth/check', {
          headers: { Authorization: `Bearer ${storedToken}` }
        })
        
        // Update store state
        token.value = storedToken
        patient.value = JSON.parse(storedPatient)
        
        console.log('\u2705 Patient auth check passed')
        return true
      } catch (error) {
        console.error('\u274c Patient token validation failed:', error)
        logout()
        return false
      }
    }
    
    console.log('\u274c No patient auth data found')
    return false
  }

  // Initialize from localStorage
  const initialize = () => {
    console.log('\U0001f504 Initializing patient auth store...')
    checkAuth()
  }

  // Call initialize
  initialize()

  return {
    // State
    token,
    patient,
    loading,

    // Getters
    isAuthenticated,
    patientName,
    patientId,

    // Actions
    login,
    logout,
    checkAuth
  }
})