<!-- frontend/src/layouts/DefaultLayout.vue -->
<template>
  <v-app>
    <!-- Navigation Drawer -->
    <v-navigation-drawer 
      v-model="drawer" 
      app 
      :permanent="!isMobile"
      :temporary="isMobile"
      :width="isMobile ? 280 : 280"
      color="surface"
      class="sidebar-custom"
      :class="{ 'sidebar-mobile': isMobile }"
    >
      <!-- Mobile Close Button -->
      <div v-if="isMobile" class="d-flex justify-end pa-2">
        <v-btn icon variant="text" size="small" @click="drawer = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </div>

      <!-- Brand Section -->
      <div class="drawer-header">
        <div class="d-flex align-center px-4 py-3">
          <img 
            src="@/assets/logo.svg" 
            alt="HIV System Logo" 
            class="logo-icon mr-3"
          />
          <div class="brand-text">
            <div class="text-h6 font-weight-bold" :style="{ color: $vuetify.theme.current.colors.primary }"
              style="line-height: 1.2;">
              OMPH HIV CARE
            </div>
            <div class="caption text-uppercase"
              :style="{ color: $vuetify.theme.current.dark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }"
              style="font-size: 10px; letter-spacing: 0.5px;">
              {{ user?.role?.toUpperCase() }} Portal
            </div>
          </div>
        </div>
        <v-divider class="mx-3"></v-divider>
      </div>

      <!-- Navigation Links - Scrollable -->
      <div class="sidebar-scrollable">
        <v-list nav dense class="pt-2">
          <v-list-item v-for="item in menuItems" :key="item.to" :to="item.to" exact class="rounded-lg mx-2 my-1"
            :class="{ 'active-nav-item': $route.path === item.to }" :ripple="false" @click="closeDrawerOnMobile">
            <template v-slot:prepend>
              <v-icon :color="$route.path === item.to ? 'primary' : ''">
                {{ item.icon }}
              </v-icon>
            </template>
            <v-list-item-title class="font-weight-medium">
              {{ item.title }}
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </div>

      <!-- User Profile & Logout -->
      <template v-slot:append>
        <v-divider></v-divider>
        <div class="pa-3">
          <!-- Profile Button with Animation -->
          <div class="profile-toggle" @click="toggleProfile">
            <div class="d-flex align-center mb-2 cursor-pointer profile-trigger">
              <v-avatar size="40" :color="$vuetify.theme.current.colors.primary" class="mr-3">
                <span class="white--text text-subtitle-1 font-weight-bold">
                  {{ userInitials }}
                </span>
              </v-avatar>
              <div class="flex-grow-1" :class="{ 'd-none': isMobile && !showProfileDetails }">
                <div class="text-subtitle-2 font-weight-medium"
                  :style="{ color: $vuetify.theme.current.dark ? '#FFFFFF' : '#000000' }">
                  {{ user?.fullName || user?.username }}
                </div>
                <div class="caption"
                  :style="{ color: $vuetify.theme.current.dark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }">
                  {{ user?.email || 'user@example.com' }}
                </div>
              </div>
              <v-icon size="20" :class="{ 'rotate-icon': showProfileDetails }" class="ms-auto">
                mdi-chevron-up
              </v-icon>
            </div>
          </div>

          <!-- Profile Details with Slide Animation -->
          <transition name="slide-details">
            <div v-if="showProfileDetails" class="profile-details">
              
                <!-- Admin Links (Hidden in sidebar, available here) -->
                <template v-if="isAdmin">
                  <v-divider class="my-2"></v-divider>
                  <div class="px-3 mb-1">
                    <span class="caption font-weight-bold text-uppercase"
                      :style="{ color: $vuetify.theme.current.dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }">
                      Administration
                    </span>
                  </div>
                  
                  <v-list-item v-for="item in adminItems" :key="item.to" :to="item.to" class="rounded-lg my-1" @click="closeDrawerOnMobile">
                    <template v-slot:prepend>
                      <v-icon size="20" color="primary">{{ item.icon }}</v-icon>
                    </template>
                    <v-list-item-title>{{ item.title }}</v-list-item-title>
                  </v-list-item>
                </template>

                <v-divider class="my-2"></v-divider>
                
                <v-list-item @click="showLogoutDialog = true" class="rounded-lg my-1" :style="{ color: $vuetify.theme.current.colors.error }">
                  <template v-slot:prepend>
                    <v-icon size="20" :color="$vuetify.theme.current.colors.error">mdi-logout</v-icon>
                  </template>
                  <v-list-item-title>Logout</v-list-item-title>
                </v-list-item>
            </div>
          </transition>
        </div>
      </template>
    </v-navigation-drawer>

    <!-- App Bar -->
    <v-app-bar 
      app 
      color="surface"
      elevation="0" 
      class="app-bar"
    >
      <!-- Mobile Menu Toggle -->
      <v-btn 
        v-if="isMobile" 
        icon 
        variant="text" 
        class="mr-2"
        @click="drawer = !drawer"
      >
        <v-icon>mdi-menu</v-icon>
      </v-btn>

      <!-- Mobile Logo -->
      <div v-if="isMobile" class="d-flex align-center">
        <img 
          src="@/assets/logo.svg" 
          alt="HIV System Logo" 
          class="logo-icon-mobile mr-2"
        />
        <span class="text-subtitle-1 font-weight-bold" :style="{ color: $vuetify.theme.current.colors.primary }">
          OMPH HIV
        </span>
      </div>

      <v-spacer></v-spacer>

      <!-- Theme Toggle -->
      <v-btn icon variant="text" :color="$vuetify.theme.current.dark ? 'primary' : 'grey'" class="mr-2"
        @click="toggleTheme">
        <v-icon>
          {{ $vuetify.theme.current.dark ? 'mdi-white-balance-sunny' : 'mdi-moon-waning-crescent' }}
        </v-icon>
      </v-btn>

      <!-- User Menu -->
      <v-menu v-model="userMenuOpen" offset-y transition="slide-y-transition" :close-on-content-click="false"
        location="bottom end">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" variant="text" class="user-menu-btn">
            <v-avatar size="36" :color="$vuetify.theme.current.colors.primary" class="mr-2">
              <span class="white--text text-subtitle-2 font-weight-bold">
                {{ userInitials }}
              </span>
            </v-avatar>
            <span v-if="!isMobile" class="text-body-2 font-weight-medium mr-2"
              :style="{ color: $vuetify.theme.current.dark ? '#FFFFFF' : '#000000' }">
              {{ user?.fullName || user?.username }}
            </span>
            <v-icon size="20" :color="$vuetify.theme.current.dark ? '#FFFFFF' : '#000000'">mdi-chevron-down</v-icon>
          </v-btn>
        </template>

        <v-card min-width="200" class="mt-1" color="surface">
          <v-list>
            <v-list-item>
              <v-list-item-title class="font-weight-medium"
                :style="{ color: $vuetify.theme.current.dark ? '#FFFFFF' : '#000000' }">
                {{ user?.fullName || user?.username }}
              </v-list-item-title>
              <v-list-item-subtitle>{{ user?.email }}</v-list-item-subtitle>
            </v-list-item>
            <v-divider></v-divider>
            <v-list-item to="/profile">
              <v-list-item-icon>
                <v-icon size="20">mdi-account</v-icon>
              </v-list-item-icon>
              <v-list-item-title>Profile</v-list-item-title>
            </v-list-item>
            <v-list-item to="/change-password">
              <v-list-item-icon>
                <v-icon size="20">mdi-lock</v-icon>
              </v-list-item-icon>
              <v-list-item-title>Change Password</v-list-item-title>
            </v-list-item>
            <v-list-item @click="showLogoutDialog = true" :style="{ color: $vuetify.theme.current.colors.error }">
              <v-list-item-icon>
                <v-icon size="20" :color="$vuetify.theme.current.colors.error">mdi-logout</v-icon>
              </v-list-item-icon>
              <v-list-item-title>Logout</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card>
      </v-menu>
    </v-app-bar>

    <!-- Main Content -->
    <v-main>
      <v-container fluid class="pa-3 pa-sm-4 pa-md-6">
        <!-- Page Content -->
        <router-view v-slot="{ Component }">
          <transition name="fade-slide" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </v-container>
    </v-main>

    <!-- Logout Confirmation Dialog -->
    <v-dialog v-model="showLogoutDialog" max-width="400" persistent>
      <v-card>
        <v-card-title class="text-h5">
          <v-icon color="error" start>mdi-logout</v-icon>
          Confirm Logout
        </v-card-title>

        <v-card-text class="pt-4">
          Are you sure you want to logout?
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showLogoutDialog = false">
            Cancel
          </v-btn>
          <v-btn color="error" variant="flat" @click="confirmLogout" :loading="logoutLoading">
            Logout
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Global Snackbar -->
    <GlobalSnackbar />
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useSnackbar } from '@/plugins/snackbar'
import { useTheme } from 'vuetify'
import GlobalSnackbar from '@/components/common/GlobalSnackbar.vue'

const router = useRouter()
const authStore = useAuthStore()
const snackbar = useSnackbar()
const theme = useTheme()

// State
const drawer = ref(false)
const userMenuOpen = ref(false)
const showLogoutDialog = ref(false)
const logoutLoading = ref(false)
const showProfileDetails = ref(false)
const windowWidth = ref(window.innerWidth)

// Computed
const isMobile = computed(() => windowWidth.value < 960)

const user = computed(() => authStore.user)
const isAdmin = computed(() => authStore.isAdmin)
const isStaff = computed(() => authStore.userRole === 'staff')
const userOffice = computed(() => authStore.userOffice)

const userInitials = computed(() => {
  if (user.value?.fullName) {
    return user.value.fullName
      .split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  return user.value?.username?.charAt(0).toUpperCase() || 'U'
})

// Dynamic Menu Items - REMOVED DASHBOARD
const menuItems = computed(() => {
  const items = []
  
  // Staff menu items
  if (isStaff.value && userOffice.value) {
    const officeName = userOffice.value.charAt(0).toUpperCase() + userOffice.value.slice(1)
    items.push(
      { 
        title: `${officeName} Queue`, 
        icon: 'mdi-human-queue', 
        to: `/${userOffice.value}/queue` 
      },
    )
  }
  
  // Admin menu items
  if (isAdmin.value) {
    items.push(
      { title: 'Testing Queue', icon: 'mdi-test-tube', to: '/testing/queue' },
      { title: 'Treatment Queue', icon: 'mdi-hospital', to: '/treatment/queue' }
    )
  }
  
  // Common items for staff and admin
  if (isStaff.value || isAdmin.value) {
    items.push(
      { title: 'Patients', icon: 'mdi-account-multiple', to: '/patients' },
      { title: 'Appointments', icon: 'mdi-calendar', to: '/appointments' },
      { title: 'Reports', icon: 'mdi-chart-bar', to: '/reports' }
    )
  }
  
  // Patient menu items
  if (authStore.userRole === 'patient') {
    items.push(
      { title: 'Dashboard', icon: 'mdi-view-dashboard', to: '/patient/dashboard' },
      { title: 'Appointments', icon: 'mdi-calendar', to: '/patient/appointments' },
      { title: 'Results', icon: 'mdi-file-document', to: '/patient/results' },
      { title: 'Profile', icon: 'mdi-account', to: '/patient/profile' }
    )
  }
  
  return items
})

// Admin items (shown in profile dropdown)
const adminItems = [
  { title: 'Admin Dashboard', icon: 'mdi-chart-line', to: '/admin' },
  { title: 'User Management', icon: 'mdi-account-group', to: '/admin/users' },
  { title: 'System Settings', icon: 'mdi-cog', to: '/admin/settings' },
  { title: 'Audit Logs', icon: 'mdi-history', to: '/admin/audit-logs' },
  { title: 'Blockchain', icon: 'mdi-shield-key', to: '/admin/blockchain' },
  { title: 'Backup & Restore', icon: 'mdi-backup-restore', to: '/admin/backup' },
]

// Methods
const toggleProfile = () => {
  showProfileDetails.value = !showProfileDetails.value
}

const closeDrawerOnMobile = () => {
  if (isMobile.value) {
    drawer.value = false
  }
}

const toggleTheme = () => {
  const newTheme = theme.current.value.dark ? 'myCustomLightTheme' : 'myCustomDarkTheme'
  theme.global.name.value = newTheme
  localStorage.setItem('theme', newTheme)
  snackbar.info(`Switched to ${newTheme.includes('Dark') ? 'Dark' : 'Light'} mode`)
}

const confirmLogout = async () => {
  logoutLoading.value = true
  try {
    await authStore.logout()
    snackbar.success('Logged out successfully')
    router.push('/login')
  } catch (error) {
    snackbar.error('Failed to logout: ' + (error.message || 'Unknown error'))
  } finally {
    logoutLoading.value = false
    showLogoutDialog.value = false
  }
}

const handleResize = () => {
  windowWidth.value = window.innerWidth
  if (!isMobile.value) {
    drawer.value = true
  }
}

// Lifecycle
onMounted(() => {
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme) {
    theme.global.name.value = savedTheme
  }
  
  drawer.value = !isMobile.value
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
/* Sidebar Custom Styles */
.sidebar-custom {
  z-index: 1000;
  height: 100vh !important;
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
}

.sidebar-mobile {
  box-shadow: 4px 0 20px rgba(0, 0, 0, 0.1) !important;
}

:deep(.v-navigation-drawer) {
  position: fixed !important;
  height: 100vh !important;
  top: 0 !important;
  left: 0 !important;
}

.sidebar-scrollable {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.sidebar-scrollable::-webkit-scrollbar {
  width: 4px;
}

.sidebar-scrollable::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-scrollable::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.3);
  border-radius: 2px;
}

.drawer-header {
  transition: all 0.2s ease;
}

.brand-text {
  transition: opacity 0.2s ease;
  white-space: nowrap;
}

.logo-icon {
  height: 32px;
  width: 32px;
  object-fit: contain;
  flex-shrink: 0;
}

.logo-icon-mobile {
  height: 28px;
  width: 28px;
  object-fit: contain;
}

/* Navigation Items */
.v-list-item {
  transition: all 0.2s ease;
  min-height: 40px;
  position: relative;
}

.v-list-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.04);
}

.active-nav-item {
  background-color: rgba(var(--v-theme-primary), 0.08) !important;
}

.active-nav-item .v-icon {
  color: rgb(var(--v-theme-primary));
}

/* Profile Toggle */
.profile-toggle {
  cursor: pointer;
}

.profile-trigger {
  transition: all 0.2s ease;
  border-radius: 8px;
  padding: 4px 8px;
}

.profile-trigger:hover {
  background-color: rgba(var(--v-theme-primary), 0.04);
}

.rotate-icon {
  transform: rotate(180deg);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Profile Details Slide Animation */
.profile-details {
  overflow: hidden;
}

.slide-details-enter-active {
  animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-details-leave-active {
  animation: slideUp 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
    max-height: 0;
  }
  to {
    opacity: 1;
    transform: translateY(0);
    max-height: 500px;
  }
}

@keyframes slideUp {
  from {
    opacity: 1;
    transform: translateY(0);
    max-height: 500px;
  }
  to {
    opacity: 0;
    transform: translateY(-10px);
    max-height: 0;
  }
}

/* App Bar */
.app-bar {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  position: fixed !important;
}

:deep(.v-app-bar) {
  position: fixed !important;
}

.user-menu-btn {
  text-transform: none;
  letter-spacing: 0;
}

/* Page Transitions */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(12px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}

/* Container */
.v-container {
  max-width: 1600px;
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.3);
  border-radius: 3px;
  transition: background 0.3s ease;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.5);
}

/* Accessibility */
:deep(.v-btn:focus-visible),
:deep(.v-list-item:focus-visible) {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

.cursor-pointer {
  cursor: pointer;
}

/* Responsive adjustments */
@media (max-width: 959px) {
  .sidebar-custom:deep(.v-navigation-drawer__content) {
    padding-top: 0 !important;
  }
}

@media (max-width: 600px) {
  .v-container {
    padding-left: 12px !important;
    padding-right: 12px !important;
  }
  
  .profile-trigger .flex-grow-1 {
    min-width: 0;
  }
}
</style>