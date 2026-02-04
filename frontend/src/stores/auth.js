// src/stores/auth.js
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
    const hasToken = !!token.value
    const hasUser = !!user.value
    console.log('🔍 Admin Auth check:', { hasToken, hasUser, token: token.value?.slice(0, 20) + '...' })
    return hasToken && hasUser
  })
  
  const userRole = computed(() => user.value?.role || 'admin')
  const userName = computed(() => user.value?.username || user.value?.fullName || 'Admin User')

  // Actions
  const login = async (credentials) => {
    loading.value = true
    try {
      console.log('🔐 Admin login attempt:', credentials.username)

      const response = await http.post('/auth/login', credentials)
      console.log('✅ Admin login response:', response.data)

      const { token: newToken, user: userData } = response.data

      // Validate response
      if (!newToken) {
        throw new Error('No token received from server')
      }

      // Update state
      token.value = newToken
      user.value = userData

      // Persist to localStorage
      localStorage.setItem('authToken', newToken)
      localStorage.setItem('authUser', JSON.stringify(userData))

      console.log('💾 Admin auth stored in localStorage')

      // Navigate to admin dashboard
      if (router) {
        await router.push('/admin/dashboard')
      } else {
        window.location.href = '/admin/dashboard'
      }

      return response.data
    } catch (error) {
      console.error('❌ Admin login failed:', error)
      
      // Provide user-friendly error message
      let errorMessage = 'Login failed'
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (error.message.includes('Network Error')) {
        errorMessage = 'Cannot connect to server. Please check your connection.'
      }
      
      throw new Error(errorMessage)
    } finally {
      loading.value = false
    }
  }

  const logout = async () => {
    console.log('🚪 Admin logging out...')
    
    try {
      // Call logout API
      await http.post('/auth/logout').catch(() => {
        // Ignore if API fails
      })
    } finally {
      // Clear local state
      token.value = null
      user.value = null
      localStorage.removeItem('authToken')
      localStorage.removeItem('authUser')
      
      // Clear any patient data too
      localStorage.removeItem('patientToken')
      localStorage.removeItem('patientData')
      
      // Redirect to login
      if (router) {
        router.push('/login')
      } else {
        window.location.href = '/login'
      }
    }
  }

  const checkAuth = async () => {
    try {
      console.log('🔄 Checking admin auth status...')
      
      // If no token stored, return false
      if (!token.value) {
        console.log('⚠️ No admin token found')
        return false
      }

      // Verify token with server
      const response = await http.get('/auth/check')
      
      if (response.data && response.data.user) {
        console.log('✅ Admin auth check successful')
        return true
      }
      
      return false
    } catch (error) {
      console.error('❌ Admin auth check failed:', error.message)
      
      // Clear invalid auth data
      if (error.response?.status === 401) {
        logout()
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
        console.log('📋 Admin auth initialized from localStorage')
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

    // Actions
    login,
    logout,
    checkAuth
  }
})