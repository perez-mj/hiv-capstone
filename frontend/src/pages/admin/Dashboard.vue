<!-- frontend/src/pages/Dashboard.vue -->
<template>
  <div>
    <!-- Role-based dashboard selector -->
    <AdminDashboard v-if="isAdmin && dashboardData" :dashboard-data="dashboardData" />
    <NurseDashboard v-else-if="isNurse && dashboardData" :dashboard-data="dashboardData" />
    
    <!-- Loading state -->
    <v-container v-else-if="isLoading" fluid class="pa-4 pa-md-6">
      <v-row justify="center">
        <v-col cols="12" class="text-center">
          <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
          <p class="mt-4 text-body-1">Loading dashboard...</p>
        </v-col>
      </v-row>
    </v-container>
    
    <!-- Fallback for unauthorized or unknown roles -->
    <v-container v-else fluid class="pa-4 pa-md-6">
      <v-row>
        <v-col cols="12">
          <v-alert
            color="error"
            variant="tonal"
            icon="mdi-shield-alert"
            class="mb-4"
          >
            <template v-slot:title>
              <span class="text-h6">Access Denied</span>
            </template>
            <p>You don't have permission to access the dashboard or your session has expired.</p>
            <template v-slot:append>
              <v-btn
                color="error"
                variant="text"
                @click="handleLogout"
              >
                <v-icon left>mdi-logout</v-icon>
                Logout
              </v-btn>
            </template>
          </v-alert>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { dashboardApi } from '@/api'
import AdminDashboard from '@/pages/admin/AdminDashboard.vue'
import NurseDashboard from '@/pages/admin/NurseDashboard.vue'

// Router and stores
const router = useRouter()
const authStore = useAuthStore()

// State
const isLoading = ref(true)
const dashboardData = ref(null)
const error = ref(null)

// Computed
const userRole = computed(() => authStore.user?.role)
const isAdmin = computed(() => {
  const role = userRole.value?.toUpperCase()
  return role === 'ADMIN'
})
const isNurse = computed(() => {
  const role = userRole.value?.toUpperCase()
  return role === 'NURSE'
})

// Fetch dashboard data based on role
const fetchDashboardData = async () => {
  isLoading.value = true
  error.value = null
  
  try {
    let response
    
    if (isAdmin.value) {
      response = await dashboardApi.getAdminDashboard()
    } else if (isNurse.value) {
      response = await dashboardApi.getNurseDashboard()
    } else {
      // No valid role
      isLoading.value = false
      return
    }
    
    // Since http.js interceptor returns response.data directly,
    // response here contains the actual data from the API
    console.log('Dashboard data received:', response)
    dashboardData.value = response
  } catch (err) {
    console.error('Error fetching dashboard:', err)
    error.value = err.message || 'Failed to load dashboard data'
    
    // If unauthorized, redirect to login
    if (err.status === 401 || err.status === 403) {
      await handleLogout()
    }
  } finally {
    isLoading.value = false
  }
}

const handleLogout = async () => {
  try {
    await authStore.logout()
    router.push('/login')
  } catch (error) {
    console.error('Logout error:', error)
    // Force redirect to login even if logout fails
    router.push('/login')
  }
}

// Fetch data when component mounts
onMounted(() => {
  fetchDashboardData()
})
</script>