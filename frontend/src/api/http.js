// frontend/src/api/http.js
import axios from 'axios'

const API_BASE_URL = 'http://localhost:5000/api'
const REQUEST_TIMEOUT = 10000

// Single token storage key for consistency
const TOKEN_KEY = 'authToken'
const USER_KEY = 'authUser'
const REFRESH_TOKEN_KEY = 'refreshToken'

const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: { 'Content-Type': 'application/json' }
})

// Request interceptor
http.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Add cache buster for GET requests
    if (config.method === 'get') {
      config.params = { ...config.params, _t: Date.now() }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`, config.data)
    }
    
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - EXTRACTS response.data automatically
http.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ ${response.status} ${response.config.url}`)
    }
    
    // Return the data property directly (not the whole response)
    // Response structure: { success, message, timestamp, data, pagination? }
    return response.data
  },
  (error) => {
    if (process.env.NODE_ENV === 'development') {
      console.error(`❌ ${error.response?.status} ${error.config?.url}`, error.message)
    }
    
    // Handle 401 Unauthorized and 403 Forbidden
    if (error.response?.status === 401 || error.response?.status === 403) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || ''
      const isExpired = errorMessage.toLowerCase().includes('expired') || errorMessage.toLowerCase().includes('invalid')
      
      // Clear all auth data
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      
      // Only redirect if not already on login page
      const currentPath = window.location.pathname
      const isLoginPage = currentPath === '/login' || currentPath === '/patient/login'
      const isAuthCheck = error.config?.url?.includes('/auth/check')
      
      if (!isLoginPage && !isAuthCheck) {
        console.log(`🔄 Redirecting to login due to ${error.response.status}`)
        window.location.href = '/login'
      }
    }
    
    // Throw the error response data for consistent error handling
    const errorData = error.response?.data || { error: error.message }
    return Promise.reject(errorData)
  }
)

export default http