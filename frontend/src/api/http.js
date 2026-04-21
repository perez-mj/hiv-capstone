// frontend/src/api/http.js
import axios from 'axios'

const API_BASE_URL = 'http://localhost:5000/api'
const REQUEST_TIMEOUT = 10000

const TOKENS = {
  ADMIN: 'authToken',
  PATIENT: 'patientToken',
  ROLE: 'userRole'
}

const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: { 'Content-Type': 'application/json' }
})

// Helper functions
const getAuthToken = (url) => {
  const userRole = localStorage.getItem(TOKENS.ROLE)
  const adminToken = localStorage.getItem(TOKENS.ADMIN)
  const patientToken = localStorage.getItem(TOKENS.PATIENT)
  
  if (url?.includes('/patient/me/') || userRole === 'PATIENT') {
    return patientToken || adminToken
  }
  return adminToken
}

// Request interceptor
http.interceptors.request.use(
  (config) => {
    const token = getAuthToken(config.url)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    config.params = { ...config.params, _t: Date.now() }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`)
    }
    
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor
http.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ ${response.status} ${response.config.url}`)
    }
    
    // Return the data directly, not the whole response
    return response.data
  },
  (error) => {
    if (process.env.NODE_ENV === 'development') {
      console.error(`❌ ${error.response?.status} ${error.config?.url}`, error.message)
    }
    
    // Handle 401 Unauthorized and 403 Forbidden (expired token)
    if (error.response?.status === 401 || error.response?.status === 403) {
      const isPatientRoute = error.config?.url?.includes('/patient/')
      const isPatientRole = localStorage.getItem(TOKENS.ROLE) === 'PATIENT'
      const isPatient = isPatientRoute || isPatientRole
      
      // Clear tokens based on role
      localStorage.removeItem(isPatient ? TOKENS.PATIENT : TOKENS.ADMIN)
      localStorage.removeItem(TOKENS.ROLE)
      localStorage.removeItem('authToken')
      localStorage.removeItem('authUser')
      localStorage.removeItem('refreshToken')
      
      const loginPath = isPatient ? '/patient/login' : '/login'
      
      // Only redirect if not already on login page
      if (!window.location.pathname.includes(loginPath) && 
          !window.location.pathname.includes('/auth/check')) {
        console.log(`🔄 Redirecting to ${loginPath} due to ${error.response.status}`)
        window.location.href = loginPath
      }
    }
    
    return Promise.reject(error)
  }
)

export default http