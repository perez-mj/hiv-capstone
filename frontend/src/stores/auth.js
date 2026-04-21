// frontend/src/stores/auth.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import http from '@/api/http'
import { useRouter } from 'vue-router'

export const useAuthStore = defineStore('auth', () => {
  const router = useRouter()

  // State
  const token = ref(localStorage.getItem('authToken'))
  const user = ref(JSON.parse(localStorage.getItem('authUser') || 'null'))
  const loading = ref(false)

  // Getters
  const isAuthenticated = computed(() => {
    return !!token.value && !!user.value
  })
  
  const userRole = computed(() => user.value?.role || null)
  
  const userName = computed(() => {
    return user.value?.fullName || user.value?.first_name && user.value?.last_name 
      ? `${user.value.first_name} ${user.value.last_name}`
      : user.value?.username || 'User'
  })

  const isAdmin = computed(() => userRole.value === 'ADMIN')
  const isNurse = computed(() => userRole.value === 'NURSE')
  const isPatient = computed(() => userRole.value === 'PATIENT')
  const isStaff = computed(() => isAdmin.value || isNurse.value)

  // Patient-specific getters
  const patientId = computed(() => user.value?.patient_facility_code || user.value?.id || null)
  const patientName = computed(() => {
    if (user.value?.first_name && user.value?.last_name) {
      return `${user.value.first_name} ${user.value.last_name}`
    }
    return userName.value
  })

  // Actions
  const login = async (credentials) => {
    loading.value = true
    try {
      console.log('🔐 Login attempt:', credentials.username)

      const response = await http.post('/auth/login', credentials)
      console.log('✅ Full login response:', response.data)

      // FIX: Extract token from the nested data structure
      // Your response structure: { success, message, timestamp, data: { user, token, refreshToken } }
      const responseData = response.data
      
      // Check if the response has the expected structure
      let newToken = null
      let userData = null
      let refreshToken = null

      if (responseData.data && responseData.data.token) {
        // Format: { success, data: { token, user, refreshToken } }
        newToken = responseData.data.token
        userData = responseData.data.user
        refreshToken = responseData.data.refreshToken
      } else if (responseData.token) {
        // Format: { token, user } (direct)
        newToken = responseData.token
        userData = responseData.user
        refreshToken = responseData.refreshToken
      } else {
        throw new Error('No token received from server')
      }

      if (!newToken) {
        throw new Error('No token received from server')
      }

      console.log('✅ Token extracted successfully')
      console.log('👤 User role:', userData?.role)

      // Update state
      token.value = newToken
      user.value = userData

      // Persist to localStorage
      localStorage.setItem('authToken', newToken)
      localStorage.setItem('authUser', JSON.stringify(userData))
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken)
      }

      console.log('💾 Auth stored in localStorage, role:', userData.role)

      // Navigate based on role
      if (router) {
        if (userData.role === 'PATIENT') {
          await router.push('/patient/dashboard')
        } else {
          // For ADMIN, NURSE, or any other role
          await router.push('/admin/dashboard')
        }
      }

      return response.data
    } catch (error) {
      console.error('❌ Login failed:', error)
      
      let errorMessage = 'Login failed'
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message.includes('Network Error')) {
        errorMessage = 'Cannot connect to server. Please check your connection.'
      }
      
      throw new Error(errorMessage)
    } finally {
      loading.value = false
    }
  }

  const logout = async () => {
  console.log('🚪 Logging out...')
  
  try {
    // Call logout endpoint if it exists
    await http.post('/auth/logout').catch(() => {})
  } catch (error) {
    console.log('Logout endpoint error (ignored):', error.message)
  } finally {
    // Clear local state
    token.value = null
    user.value = null
    localStorage.removeItem('authToken')
    localStorage.removeItem('authUser')
    localStorage.removeItem('refreshToken')
    
    // Redirect to login
    if (router && router.currentRoute.value.path !== '/login') {
      await router.push('/login')
    } else if (!router) {
      // Fallback if router not available
      window.location.href = '/login'
    }
  }
}

  const checkAuth = async () => {
  try {
    console.log('🔄 Checking auth status...')
    
    if (!token.value) {
      console.log('⚠️ No token found')
      // Clear any stale user data
      await logout()
      return false
    }

    const response = await http.get('/auth/check')
    
    // Handle nested response structure
    const userData = response.data?.user || response.user
    
    if (userData) {
      console.log('✅ Auth check successful, role:', userData.role)
      // Update user data in case it changed
      user.value = userData
      localStorage.setItem('authUser', JSON.stringify(userData))
      return true
    }
    
    return false
  } catch (error) {
    console.error('❌ Auth check failed:', error.message)
    
    // Handle different error status codes
    const status = error.response?.status
    
    if (status === 401 || status === 403) {
      // Token is invalid or expired - force logout
      console.log('🔒 Token invalid/expired, logging out...')
      await logout()
    } else if (status === 404) {
      // Endpoint not found, but token might still be valid
      console.warn('⚠️ Auth check endpoint not found')
      // Don't logout automatically for 404
    } else if (error.message.includes('Network Error')) {
      console.log('🌐 Network error during auth check')
      // Don't logout on network errors, just return false
      return false
    }
    
    return false
  }
}

  // Initialize from localStorage
  const initialize = () => {
    const storedToken = localStorage.getItem('authToken')
    const storedUser = localStorage.getItem('authUser')
    
    if (storedToken && storedUser) {
      try {
        token.value = storedToken
        user.value = JSON.parse(storedUser)
        console.log('📋 Auth initialized from localStorage, role:', user.value?.role)
      } catch (e) {
        console.error('Failed to parse stored user:', e)
        logout()
      }
    }
  }

  // Call initialize
  initialize()

  return {
    // State
    token,
    user,
    loading,

    // Getters
    isAuthenticated,
    userRole,
    userName,
    isAdmin,
    isNurse,
    isPatient,
    isStaff,
    patientId,
    patientName,

    // Actions
    login,
    logout,
    checkAuth
  }
})