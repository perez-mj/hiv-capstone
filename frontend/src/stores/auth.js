// src/stores/auth.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import http from '@/api/http'
import { useRouter } from 'vue-router'

export const useAuthStore = defineStore('auth', () => {
  const router = useRouter()

  // State - initialize from localStorage
  const token = ref(localStorage.getItem('authToken'))
  const user = ref(JSON.parse(localStorage.getItem('authUser') || 'null'))
  const loading = ref(false)

  // Getters
  const isAuthenticated = computed(() => !!token.value)
  const userRole = computed(() => user.value?.role)
  const userName = computed(() => user.value?.username)

  // Actions
  const login = async (credentials) => {
    loading.value = true
    try {
      console.log('\U0001f504 Attempting login...', credentials)

      const response = await http.post('/auth/login', credentials)
      const { token: newToken, user: userData } = response.data

      console.log('\u2705 Login response:', response.data)

      // Update state
      token.value = newToken
      user.value = userData

      // Persist to localStorage
      localStorage.setItem('authToken', newToken)
      localStorage.setItem('authUser', JSON.stringify(userData))

      console.log('\U0001f4be Stored in localStorage:', {
        token: newToken,
        user: userData
      })

      // \u2705 FIX: Use the correct route path
      if (router) {
        console.log('\U0001f680 Navigating to admin dashboard...')
        // Use the full path to ensure navigation works
        await router.push('/admin/dashboard')
      } else {
        console.error('\u274c Router not available')
        // Fallback: force page reload to ensure navigation
        window.location.href = '/admin/dashboard'
      }

      return response.data
    } catch (error) {
      console.error('\u274c Login error:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  const logout = () => {
    console.log('\U0001f6aa Logging out...')
    token.value = null
    user.value = null
    localStorage.removeItem('authToken')
    localStorage.removeItem('authUser')

    if (router) {
      router.push('/login')
    }
  }

  const checkAuth = async () => {
    const storedToken = localStorage.getItem('authToken')
    const storedUser = localStorage.getItem('authUser')

    console.log('\U0001f50d Checking auth:', { storedToken: !!storedToken, storedUser: !!storedUser })

    if (storedToken && storedUser) {
      token.value = storedToken
      user.value = JSON.parse(storedUser)
      return true
    }
    return false
  }

  // Initialize from localStorage on store creation
  const initialize = () => {
    checkAuth()
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