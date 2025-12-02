import axios from 'axios'

const http = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 10000,
})

// Add auth token to requests
http.interceptors.request.use(
  (config) => {
    // Check if this is a patient route (excluding patient login)
    const isPatientRoute = config.url.includes('/patient/') && 
                          !config.url.includes('/patient/auth/login')
    
    if (isPatientRoute) {
      // Use patient token for patient routes
      const patientToken = localStorage.getItem('patientToken')
      if (patientToken) {
        config.headers.Authorization = `Bearer ${patientToken}`
        console.log('🔐 Adding PATIENT token to request:', config.url)
      } else {
        console.log('⚠️ No patient token found for patient route:', config.url)
      }
    } else {
      // Use admin token for all other routes
      const adminToken = localStorage.getItem('authToken')
      if (adminToken) {
        config.headers.Authorization = `Bearer ${adminToken}`
        console.log('🔐 Adding ADMIN token to request:', config.url)
      }
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Handle auth errors
http.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log('🚨 HTTP Error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.response?.data?.error || error.message
    })
    
    if (error.response?.status === 401) {
      const url = error.config?.url || ''
      
      // Check if this is a patient route
      if (url.includes('/patient/')) {
        console.log('❌ Patient token invalid - clearing patient auth data')
        // Clear invalid patient auth data
        localStorage.removeItem('patientToken')
        localStorage.removeItem('patientData')
        
        // Only redirect if we're not already on the patient login page
        if (!window.location.pathname.includes('/patient/login')) {
          console.log('🔄 Redirecting to patient login')
          window.location.href = '/patient/login'
        }
      } else {
        console.log('❌ Admin token invalid - clearing admin auth data')
        // Clear invalid admin auth data
        localStorage.removeItem('authToken')
        localStorage.removeItem('authUser')
        
        // Only redirect if we're not already on the login page
        if (!window.location.pathname.includes('/login')) {
          console.log('🔄 Redirecting to admin login')
          window.location.href = '/login'
        }
      }
    }
    
    return Promise.reject(error)
  }
)

export default http