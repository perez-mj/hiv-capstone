<!-- frontend/src/layouts/PatientLayout.vue -->
<template>
  <v-app>
    <!-- Mobile Bottom Navigation Bar -->
    <v-bottom-navigation v-if="isMobile" v-model="bottomNav" grow mandatory class="mobile-nav">
      <v-btn value="dashboard" @click="navigateTo('/patient/dashboard')">
        <v-icon>mdi-view-dashboard</v-icon>
        <span>Dashboard</span>
      </v-btn>
      <v-btn value="appointments" @click="navigateTo('/patient/appointments')">
        <v-icon>mdi-calendar</v-icon>
        <span>Appointments</span>
      </v-btn>
      <v-btn value="history" @click="navigateTo('/patient/history')">
        <v-icon>mdi-history</v-icon>
        <span>History</span>
      </v-btn>
      <v-btn value="profile" @click="navigateTo('/patient/profile')">
        <v-icon>mdi-account</v-icon>
        <span>Profile</span>
      </v-btn>
    </v-bottom-navigation>

    <!-- Desktop Sidebar -->
    <v-navigation-drawer v-else v-model="drawer" app permanent class="desktop-sidebar">
      <v-list>
        <v-list-item class="text-center mb-4">
          <v-avatar size="80" color="primary" class="mb-2">
            <v-icon size="48" color="white">mdi-hospital</v-icon>
          </v-avatar>
          <v-list-item-title class="text-h6">{{ patientName }}</v-list-item-title>
          <v-list-item-subtitle>Patient Portal</v-list-item-subtitle>
        </v-list-item>

        <v-divider></v-divider>

        <v-list-item v-for="item in menuItems" :key="item.value" :value="item.value"
          :active="activeMenu === item.value" @click="navigateTo(item.path)" link>
          <template v-slot:prepend>
            <v-icon :icon="item.icon"></v-icon>
          </template>
          <v-list-item-title>{{ item.title }}</v-list-item-title>
        </v-list-item>

        <v-divider class="mt-4"></v-divider>

        <v-list-item @click="logout" link class="mt-auto">
          <template v-slot:prepend>
            <v-icon>mdi-logout</v-icon>
          </template>
          <v-list-item-title>Logout</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <!-- App Bar -->
    <v-app-bar :elevation="2" app>
      <v-app-bar-nav-icon v-if="!isMobile" @click="drawer = !drawer"></v-app-bar-nav-icon>
      <v-app-bar-title>
        <span class="text-primary">HIV Patient Portal</span>
      </v-app-bar-title>
      <v-spacer></v-spacer>
      <v-btn icon @click="logout" v-if="isMobile">
        <v-icon>mdi-logout</v-icon>
      </v-btn>
    </v-app-bar>

    <!-- Main Content -->
    <v-main>
      <v-container :fluid="isMobile" class="pa-3 pa-md-6">
        <router-view />
      </v-container>
    </v-main>

    <!-- Loading Overlay -->
    <v-overlay :model-value="loadingStore.loading" class="align-center justify-center">
      <v-progress-circular indeterminate size="64" color="primary"></v-progress-circular>
    </v-overlay>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000" location="top">
      {{ snackbar.text }}
      <template v-slot:actions>
        <v-btn variant="text" icon="mdi-close" @click="snackbar.show = false"></v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useLoadingStore } from '@/stores/loading'
import { useSnackbarStore } from '@/stores/snackbar'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const loadingStore = useLoadingStore()
const snackbarStore = useSnackbarStore()

// UI State
const drawer = ref(true)
const bottomNav = ref('dashboard')
const isMobile = ref(window.innerWidth < 960)

// Snackbar
const snackbar = computed(() => snackbarStore.snackbar)

// Patient name
const patientName = computed(() => authStore.patientName || authStore.userName || 'Patient')

// Active menu
const activeMenu = computed(() => {
  const path = route.path
  if (path.includes('/patient/dashboard')) return 'dashboard'
  if (path.includes('/patient/appointments')) return 'appointments'
  if (path.includes('/patient/history')) return 'history'
  if (path.includes('/patient/profile')) return 'profile'
  if (path.includes('/patient/change-password')) return 'profile'
  return 'dashboard'
})

// Menu items
const menuItems = [
  { title: 'Dashboard', value: 'dashboard', path: '/patient/dashboard', icon: 'mdi-view-dashboard' },
  { title: 'Appointments', value: 'appointments', path: '/patient/appointments', icon: 'mdi-calendar' },
  { title: 'Medical History', value: 'history', path: '/patient/history', icon: 'mdi-history' },
  { title: 'My Profile', value: 'profile', path: '/patient/profile', icon: 'mdi-account' },
]

// Methods
const navigateTo = (path) => {
  router.push(path)
}

const logout = async () => {
  await authStore.logout()
}

// Handle window resize
const handleResize = () => {
  isMobile.value = window.innerWidth < 960
}

// Watch bottom nav for mobile
watch(bottomNav, (newVal) => {
  if (isMobile.value) {
    const item = menuItems.find(i => i.value === newVal)
    if (item && route.path !== item.path) {
      router.push(item.path)
    }
  }
})

// Lifecycle
onMounted(() => {
  window.addEventListener('resize', handleResize)
  // Set initial bottom nav based on current route
  const current = activeMenu.value
  if (current) bottomNav.value = current
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.mobile-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000;
}

.desktop-sidebar {
  background: linear-gradient(180deg, #f5f7fa 0%, #ffffff 100%);
}

@media (max-width: 960px) {
  :deep(.v-main) {
    padding-bottom: 65px;
  }
}
</style>