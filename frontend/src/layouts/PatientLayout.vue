<!-- frontend/src/layouts/PatientLayout.vue -->
<template>
  <v-app>
    <!-- Theme Toggle Button (Floating Action Button) -->
    <v-btn
      class="theme-toggle-btn"
      :color="isDarkMode ? 'primary' : 'secondary'"
      icon
      size="small"
      @click="toggleTheme"
      :title="isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
    >
      <v-icon>{{ isDarkMode ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
    </v-btn>

    <!-- Mobile Bottom Navigation Bar -->
    <v-bottom-navigation v-if="isMobile" v-model="bottomNav" grow mandatory class="mobile-nav" :bg-color="isDarkMode ? 'surface' : undefined">
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
    <v-navigation-drawer v-else v-model="drawer" app permanent class="desktop-sidebar" :class="{ 'dark-sidebar': isDarkMode }">
      <v-list>
        <v-list-item class="text-center mb-4">
          <v-avatar size="80" :color="isDarkMode ? 'primary-dark' : 'primary'" class="mb-2">
            <v-icon size="48" color="white">mdi-hospital</v-icon>
          </v-avatar>
          <v-list-item-title class="text-h6" :class="{ 'text-white': isDarkMode }">{{ patientName }}</v-list-item-title>
          <v-list-item-subtitle :class="{ 'text-grey-lighten-1': isDarkMode }">Patient Portal</v-list-item-subtitle>
        </v-list-item>

        <v-divider :class="{ 'border-white-opacity-1': isDarkMode }"></v-divider>

        <v-list-item 
          v-for="item in menuItems" 
          :key="item.value" 
          :value="item.value"
          :active="activeMenu === item.value" 
          @click="navigateTo(item.path)" 
          link
          :class="{ 'dark-list-item': isDarkMode }"
        >
          <template v-slot:prepend>
            <v-icon :icon="item.icon" :color="activeMenu === item.value ? 'primary' : undefined"></v-icon>
          </template>
          <v-list-item-title :class="{ 'text-white': isDarkMode }">{{ item.title }}</v-list-item-title>
        </v-list-item>

        <v-divider class="mt-4" :class="{ 'border-white-opacity-1': isDarkMode }"></v-divider>

        <v-list-item @click="showLogoutDialog = true" link class="mt-auto" :class="{ 'dark-list-item': isDarkMode }">
          <template v-slot:prepend>
            <v-icon color="error">mdi-logout</v-icon>
          </template>
          <v-list-item-title>Logout</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <!-- App Bar -->
    <v-app-bar :elevation="2" app :color="isDarkMode ? 'surface' : undefined">
      <v-app-bar-nav-icon v-if="!isMobile" @click="drawer = !drawer"></v-app-bar-nav-icon>
      <v-app-bar-title>
        <span class="text-primary">HIV Patient Portal</span>
      </v-app-bar-title>
      <v-spacer></v-spacer>
      
      <v-btn icon @click="showLogoutDialog = true" v-if="isMobile">
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

    <!-- Logout Confirmation Dialog -->
    <v-dialog v-model="showLogoutDialog" persistent max-width="400">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="error" size="28" class="mr-2">mdi-logout</v-icon>
          <span class="text-h6">Confirm Logout</span>
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" variant="text" @click="showLogoutDialog = false"></v-btn>
        </v-card-title>
        
        <v-card-text class="pt-4">
          <p class="text-body-1 mb-0">Are you sure you want to logout?</p>
        </v-card-text>
        
        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn variant="outlined" @click="showLogoutDialog = false">Cancel</v-btn>
          <v-btn color="error" @click="logout" :loading="logoutLoading">Logout</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useTheme } from 'vuetify'
import { useAuthStore } from '@/stores/auth'
import { useLoadingStore } from '@/stores/loading'
import { useSnackbarStore } from '@/stores/snackbar'

const router = useRouter()
const route = useRoute()
const theme = useTheme()
const authStore = useAuthStore()
const loadingStore = useLoadingStore()
const snackbarStore = useSnackbarStore()

// UI State
const drawer = ref(true)
const bottomNav = ref('dashboard')
const isMobile = ref(window.innerWidth < 960)
const showLogoutDialog = ref(false)
const logoutLoading = ref(false)

// Theme State
const isDarkMode = computed(() => theme.global.name.value === 'myCustomDarkTheme')

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
  logoutLoading.value = true
  try {
    await authStore.logout()
    showLogoutDialog.value = false
  } finally {
    logoutLoading.value = false
  }
}

const toggleTheme = () => {
  const newTheme = isDarkMode.value ? 'myCustomLightTheme' : 'myCustomDarkTheme'
  theme.global.name.value = newTheme
  localStorage.setItem('theme', newTheme)
}

// Load saved theme preference
const loadSavedTheme = () => {
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme && (savedTheme === 'myCustomLightTheme' || savedTheme === 'myCustomDarkTheme')) {
    theme.global.name.value = savedTheme
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (prefersDark) {
      theme.global.name.value = 'myCustomDarkTheme'
    }
  }
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
  const current = activeMenu.value
  if (current) bottomNav.value = current
  loadSavedTheme()
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

.dark-sidebar {
  background: linear-gradient(180deg, #1a1a1a 0%, #1e1e1e 100%);
}

.dark-list-item:hover {
  background: rgba(255, 255, 255, 0.05) !important;
}

.theme-toggle-btn {
  position: fixed;
  bottom: 80px;
  right: 20px;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.border-white-opacity-1 {
  border-color: rgba(255, 255, 255, 0.12) !important;
}

@media (max-width: 960px) {
  :deep(.v-main) {
    padding-bottom: 65px;
  }
  
  .theme-toggle-btn {
    bottom: 70px;
    right: 16px;
  }
}
</style>