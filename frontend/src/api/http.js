// frontend/src/api/http.js
import axios from 'axios'

// Try multiple possible backend URLs
const BACKEND_URLS = [
  'http://localhost:5000/api',
  'http://127.0.0.1:5000/api',
  'http://localhost:5001/api',
  'http://127.0.0.1:5001/api'
]

// Use the first one that works or default to localhost:5000
const baseURL = BACKEND_URLS[0]

const http = axios.create({
  baseURL: baseURL,
  timeout: 10000, // Bawasan sa 10 seconds para hindi masyadong matagal maghintay
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor - FIXED VERSION
http.interceptors.request.use(
  (config) => {
    // Check user role from localStorage
    const userRole = localStorage.getItem('userRole')
    const adminToken = localStorage.getItem('authToken')
    const patientToken = localStorage.getItem('patientToken')
    
    // Log request details for debugging
    console.log('📤 Request:', {
      method: config.method,
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
      role: userRole,
      hasToken: !!(adminToken || patientToken)
    })
    
    // Determine which token to use based on the URL or user role
    if (config.url?.includes('/patient/me/') || userRole === 'PATIENT') {
      // For patient-specific routes, use patient token
      if (patientToken) {
        config.headers.Authorization = `Bearer ${patientToken}`
        console.log('🔐 Adding PATIENT token to request:', config.url)
      } else if (adminToken) {
        // Fallback to admin token if no patient token
        config.headers.Authorization = `Bearer ${adminToken}`
        console.log('🔐 Adding ADMIN token (fallback) to request:', config.url)
      } else {
        console.log('⚠️ No token found for patient request')
      }
    } else {
      // For admin routes, use admin token
      if (adminToken) {
        config.headers.Authorization = `Bearer ${adminToken}`
        console.log('🔐 Adding ADMIN token to request:', config.url)
      } else {
        console.log('⚠️ No token found for admin request')
      }
    }
    
    // Add timestamp to prevent caching
    config.params = {
      ...config.params,
      _t: Date.now()
    }
    
    return config
  },
  (error) => {
    console.error('❌ Request interceptor error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor - FIXED VERSION
http.interceptors.response.use(
  (response) => {
    console.log('✅ Response success:', {
      url: response.config.url,
      status: response.status,
      dataSize: JSON.stringify(response.data).length
    })
    return response
  },
  (error) => {
    const errorInfo = {
      url: error.config?.url,
      method: error.config?.method,
      baseURL: error.config?.baseURL,
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
      code: error.code
    }
    
    console.log('🚨 HTTP Error:', errorInfo)
    
    // Handle timeout errors
    if (error.code === 'ECONNABORTED') {
      console.error('⏰ REQUEST TIMEOUT - Server not responding!')
      console.error('👉 Make sure backend is running at:', error.config?.baseURL)
      
      // Show user-friendly message (if you have a notification system)
      if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('api-error', { 
          detail: { message: 'Cannot connect to server. Please check if backend is running.' }
        }))
      }
    }
    
    // Handle network errors (server down)
    if (!error.response) {
      console.error('🌐 NETWORK ERROR - Cannot reach backend!')
      console.error('👉 Check if backend is running at:', error.config?.baseURL)
      console.error('👉 Try: cd backend && npm run dev')
      
      // Try alternative URL
      if (error.config) {
        const currentIndex = BACKEND_URLS.indexOf(error.config.baseURL)
        if (currentIndex < BACKEND_URLS.length - 1) {
          const nextUrl = BACKEND_URLS[currentIndex + 1]
          console.log(`🔄 Trying alternative URL: ${nextUrl}`)
          error.config.baseURL = nextUrl
          return http(error.config)
        }
      }
    }
    
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      const url = error.config?.url || ''
      console.log('🔒 401 Unauthorized:', url)
      
      if (url.includes('/patient/') || localStorage.getItem('userRole') === 'PATIENT') {
        console.log('❌ Patient token invalid - clearing patient data')
        localStorage.removeItem('patientToken')
        localStorage.removeItem('patientData')
        localStorage.removeItem('userRole')
        
        // Redirect to patient login if not already there
        if (!window.location.pathname.includes('/patient/login')) {
          console.log('➡️ Redirecting to patient login')
          window.location.href = '/patient/login'
        }
      } else {
        console.log('❌ Admin token invalid - clearing admin data')
        localStorage.removeItem('authToken')
        localStorage.removeItem('authUser')
        localStorage.removeItem('userRole')
        
        // Redirect to admin login if not already there
        if (!window.location.pathname.includes('/login')) {
          console.log('➡️ Redirecting to admin login')
          window.location.href = '/login'
        }
      }
    }
    
    // Handle 404 Not Found
    if (error.response?.status === 404) {
      console.error('❌ 404 Not Found - Endpoint does not exist:', error.config?.url)
      console.error('👉 Check if the route is defined in backend')
    }
    
    // Handle 500 Internal Server Error
    if (error.response?.status === 500) {
      console.error('❌ 500 Internal Server Error - Backend error')
      console.error('👉 Check backend console for errors')
    }
    
    return Promise.reject(error)
  }
)

// Utility function to test backend connection
export const testBackendConnection = async () => {
  console.log('🔍 Testing backend connection...')
  
  for (const url of BACKEND_URLS) {
    try {
      console.log(`Testing ${url}...`)
      const response = await axios.get(url.replace('/api', '/'), { 
        timeout: 3000 
      })
      console.log(`✅ Connected to ${url}:`, response.data)
      return { success: true, url, data: response.data }
    } catch (error) {
      console.log(`❌ Failed to connect to ${url}:`, error.message)
    }
  }
  
  console.error('❌ Could not connect to any backend URL')
  return { success: false, error: 'No backend available' }
}

// Utility function to check if backend is running
export const isBackendRunning = async () => {
  try {
    await axios.get('http://localhost:5000/', { timeout: 2000 })
    return true
  } catch {
    return false
  }
}

export default http