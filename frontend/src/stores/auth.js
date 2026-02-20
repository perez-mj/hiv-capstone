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
    return !!token.value && !!user.value
  })
  
  const userRole = computed(() => user.value?.role || null)
  
  const userName = computed(() => {
    return user.value?.fullName || user.value?.username || 'User'
  })

  const isAdmin = computed(() => userRole.value === 'ADMIN')
  const isNurse = computed(() => userRole.value === 'NURSE')
  const isPatient = computed(() => userRole.value === 'PATIENT')
  const isStaff = computed(() => isAdmin.value || isNurse.value)

  // Actions
  const login = async (credentials) => {
    loading.value = true
    try {
      console.log('🔐 Login attempt:', credentials.username)

      const response = await http.post('/auth/login', credentials)
      console.log('✅ Login response:', response.data)

      const { token: newToken, user: userData } = response.data

      if (!newToken) {
        throw new Error('No token received from server')
      }

      // Update state
      token.value = newToken
      user.value = userData

      // Persist to localStorage
      localStorage.setItem('authToken', newToken)
      localStorage.setItem('authUser', JSON.stringify(userData))

      console.log('💾 Auth stored in localStorage, role:', userData.role)

      // Navigate based on role
      if (router) {
        if (userData.role === 'PATIENT') {
          await router.push('/patient/dashboard')
        } else {
          await router.push('/admin/dashboard')
        }
      }

      return response.data
    } catch (error) {
      console.error('❌ Login failed:', error)
      
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
    console.log('🚪 Logging out...')
    
    try {
      await http.post('/auth/logout').catch(() => {})
    } finally {
      // Clear local state
      token.value = null
      user.value = null
      localStorage.removeItem('authToken')
      localStorage.removeItem('authUser')
      
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
      console.log('🔄 Checking auth status...')
      
      if (!token.value) {
        console.log('⚠️ No token found')
        return false
      }

      const response = await http.get('/auth/check')
      
      if (response.data && response.data.user) {
        console.log('✅ Auth check successful, role:', response.data.user.role)
        // Update user data in case it changed
        user.value = response.data.user
        localStorage.setItem('authUser', JSON.stringify(response.data.user))
        return true
      }
      
      return false
    } catch (error) {
      console.error('❌ Auth check failed:', error.message)
      
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

    // Actions
    login,
    logout,
    checkAuth
  }
})