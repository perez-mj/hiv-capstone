import axios from 'axios'

const http = axios.create({
  baseURL: 'http://10.70.42.99:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add auth token to requests - SIMPLIFIED VERSION
http.interceptors.request.use(
  (config) => {
    // Always try to use admin token first
    const adminToken = localStorage.getItem('authToken')
    
    if (adminToken) {
      config.headers.Authorization = `Bearer ${adminToken}`
      console.log('🔐 Adding ADMIN token to request:', config.url)
    } else {
      // If no admin token, check for patient token (for patient-specific routes)
      const patientToken = localStorage.getItem('patientToken')
      if (patientToken && config.url.includes('/patient/')) {
        config.headers.Authorization = `Bearer ${patientToken}`
        console.log('🔐 Adding PATIENT token to request:', config.url)
      }
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Handle auth errors - SIMPLIFIED VERSION
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
      
      if (url.includes('/patient/')) {
        console.log('❌ Patient token invalid - clearing patient auth data')
        localStorage.removeItem('patientToken')
        localStorage.removeItem('patientData')
        
        if (!window.location.pathname.includes('/patient/login') && 
            !window.location.pathname.includes('/login')) {
          window.location.href = '/patient/login'
        }
      } else {
        console.log('❌ Admin token invalid - clearing admin auth data')
        localStorage.removeItem('authToken')
        localStorage.removeItem('authUser')
        
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login'
        }
      }
    }
    
    return Promise.reject(error)
  }
)

export default http