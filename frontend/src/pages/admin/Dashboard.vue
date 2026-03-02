<!-- frontend/src/pages/Dashboard.vue -->
<template>
  <div>
    <!-- Role-based dashboard selector -->
    <AdminDashboard v-if="isAdmin" />
    <NurseDashboard v-else-if="isNurse" />
    
    <!-- Fallback for unauthorized or unknown roles -->
    <v-container v-else fluid class="pa-4 pa-md-6">
      <v-row>
        <v-col cols="12">
          <v-alert
            :color="'error'"
            variant="tonal"
            icon="mdi-shield-alert"
            class="mb-4"
          >
            <template v-slot:title>
              <span class="text-h6">Access Denied</span>
            </template>
            <p>You don't have permission to access the dashboard.</p>
            <template v-slot:append>
              <v-btn
                :color="'error'"
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
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AdminDashboard from '@/pages/admin/AdminDashboard.vue'
import NurseDashboard from '@/pages/admin/NurseDashboard.vue'

// Router and stores
const router = useRouter()
const authStore = useAuthStore()
const userRole = computed(() => authStore.user?.role)
const isAdmin = computed(() => {
  const role = userRole.value?.toUpperCase()
  return role === 'ADMIN'
})
const isNurse = computed(() => {
  const role = userRole.value?.toUpperCase()
  return role === 'NURSE'
})

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
</script>
