<!-- frontend/src/components/layout/Sidebar.vue -->
<template>
  <v-navigation-drawer 
    v-model="drawerSync" 
    app 
    :color="'surface'"
    :clipped="$vuetify.display.mdAndUp"
    :temporary="!$vuetify.display.mdAndUp" 
    :rail="railMode"
    :rail-width="72"
    class="custom-sidebar"
    :width="260"
    @update:rail="handleRailToggle"
  >
    <!-- Header with Logo - Click to toggle rail mode -->
    <div class="sidebar-header" :class="{ 'rail-mode': railMode }" @click="toggleRail">
      <div class="logo-container">
        <img src="@/assets/images/logo.png" alt="OMPH HIV Care Logo" class="logo" />
        <div class="logo-text" v-if="!railMode">
          <div class="logo-title">HIV Care</div>
          <div class="logo-subtitle">Enrollment System</div>
        </div>
      </div>
      <v-icon 
        v-if="!railMode" 
        size="small" 
        color="grey" 
        class="rail-toggle-icon"
      >mdi-chevron-left</v-icon>
    </div>

    <v-divider class="my-1" />

    <!-- Main Navigation -->
    <div class="navigation-container">
      <!-- Primary Menu -->
      <v-list nav density="compact" class="menu-list pa-0">
        <v-list-subheader v-if="!railMode" title="MAIN" class="menu-subheader" />
        
        <v-list-item
          v-for="item in mainMenu"
          :key="item.title"
          :to="item.to"
          :active="$route.path === item.to"
          :prepend-icon="item.icon"
          :title="!railMode ? item.title : undefined"
          class="menu-item"
          rounded="lg"
          active-color="primary"
          :density="railMode ? 'comfortable' : 'compact'"
        >
          <template v-if="item.badge && !railMode" #append>
            <v-badge :content="item.badge" color="error" inline />
          </template>
          
          <!-- Tooltip for rail mode -->
          <v-tooltip v-if="railMode" activator="parent" location="right">
            <span>{{ item.title }}</span>
            <span v-if="item.badge" class="ml-1">({{ item.badge }})</span>
          </v-tooltip>
        </v-list-item>
      </v-list>

      <!-- Management Menu -->
      <v-list nav density="compact" class="menu-list pa-0">
        <v-list-subheader v-if="!railMode" title="MANAGEMENT" class="menu-subheader" />
        
        <v-list-item
          v-for="item in managementMenu"
          :key="item.title"
          :to="item.to"
          :active="$route.path === item.to"
          :prepend-icon="item.icon"
          :title="!railMode ? item.title : undefined"
          class="menu-item"
          rounded="lg"
          active-color="primary"
          :density="railMode ? 'comfortable' : 'compact'"
        >
          <v-tooltip v-if="railMode" activator="parent" location="right">
            <span>{{ item.title }}</span>
          </v-tooltip>
        </v-list-item>
      </v-list>

      <!-- System Menu -->
      <v-list nav density="compact" class="menu-list pa-0">
        <v-list-subheader v-if="!railMode" title="SYSTEM" class="menu-subheader" />
        
        <v-list-item
          v-for="item in systemMenu"
          :key="item.title"
          :to="item.to"
          :active="$route.path === item.to"
          :prepend-icon="item.icon"
          :title="!railMode ? item.title : undefined"
          class="menu-item"
          rounded="lg"
          active-color="primary"
          :density="railMode ? 'comfortable' : 'compact'"
        >
          <v-tooltip v-if="railMode" activator="parent" location="right">
            <span>{{ item.title }}</span>
          </v-tooltip>
        </v-list-item>
      </v-list>
    </div>

    <!-- Footer with User Info and Logout -->
    <template #append>
      <div class="sidebar-footer">
        <v-divider class="my-1" />
        
        <!-- User Info Section - Click to logout -->
        <div class="user-info" :class="{ 'rail-mode': railMode }" @click="confirmLogout = true">
          <v-avatar size="40" color="primary" class="user-avatar">
            <span class="text-body-1">{{ userInitials }}</span>
          </v-avatar>
          <div class="user-details" v-if="!railMode">
            <div class="name">{{ userName }}</div>
            <div class="role">{{ userRole }}</div>
          </div>
          <v-icon 
            v-if="!railMode" 
            size="small" 
            color="grey" 
            class="logout-icon"
          >mdi-logout</v-icon>
          
          <!-- Tooltip for rail mode -->
          <v-tooltip v-if="railMode" activator="parent" location="right">
            <span>{{ userName }} ({{ userRole }}) - Click to logout</span>
          </v-tooltip>
        </div>
        
        <div class="version-text" v-if="!railMode">v3.0</div>
      </div>
    </template>

    <!-- Logout Confirmation Dialog -->
    <v-dialog v-model="confirmLogout" max-width="360" persistent>
      <v-card class="logout-dialog">
        <v-card-title class="text-subtitle-1 font-weight-bold pa-3 bg-error-lighten-5">
          <v-icon color="error" size="small" class="mr-2">mdi-logout</v-icon>
          Confirm Logout
        </v-card-title>
        
        <v-card-text class="pa-3">
          <p class="text-body-2 mb-0">Are you sure you want to logout?</p>
        </v-card-text>
        
        <v-card-actions class="pa-3 pt-0">
          <v-spacer />
          <v-btn 
            variant="text" 
            color="grey-darken-1" 
            @click="confirmLogout = false"
            :disabled="isLoggingOut"
            size="small"
          >
            Cancel
          </v-btn>
          <v-btn 
            color="error" 
            variant="elevated" 
            @click="logout"
            :loading="isLoggingOut"
            prepend-icon="mdi-logout"
            size="small"
          >
            Logout
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-navigation-drawer>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import { useDisplay } from 'vuetify'

const props = defineProps({
  modelValue: Boolean
})
const emit = defineEmits(['update:modelValue'])

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const display = useDisplay()

const confirmLogout = ref(false)
const isLoggingOut = ref(false)
const railMode = ref(false)

const drawerSync = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Handle rail toggle on mobile
const handleRailToggle = (value) => {
  if (display.mobile.value) {
    railMode.value = false
  }
}

// Toggle rail mode when logo is clicked
const toggleRail = () => {
  railMode.value = !railMode.value
}

// Auto-expand when drawer is opened on mobile
watch(drawerSync, (newVal) => {
  if (display.mobile.value && newVal) {
    railMode.value = false
  }
})

// Menu organization
const mainMenu = ref([
  { 
    title: 'Dashboard', 
    to: '/admin/dashboard', 
    icon: 'mdi-view-dashboard',
    badge: null
  },
  { 
    title: 'Calendar', 
    to: '/admin/appointments-calendar', 
    icon: 'mdi-calendar',
    badge: null
  },
  { 
    title: 'Queue', 
    to: '/admin/queue', 
    icon: 'mdi-human-queue',
    badge: null
  },
])

const managementMenu = ref([
  { 
    title: 'Patients', 
    to: '/admin/patients', 
    icon: 'mdi-account-group',
  },
  { 
    title: 'Kiosk Devices', 
    to: '/admin/kiosks', 
    icon: 'mdi-monitor',
  },
  { 
    title: 'Users', 
    to: '/admin/users', 
    icon: 'mdi-account-cog',
  },
])

const systemMenu = ref([
  { 
    title: 'Administration', 
    to: '/admin/administration', 
    icon: 'mdi-security',
  },
  { 
    title: 'Settings', 
    to: '/admin/settings', 
    icon: 'mdi-cog',
  },
])

// Auth computed properties
const userName = computed(() => authStore.user?.name || 'System Administrator')
const userRole = computed(() => authStore.user?.role || 'Admin')

const userInitials = computed(() => {
  const name = authStore.user?.name || 'SA'
  return name
    .split(' ')
    .map(word => word[0]?.toUpperCase() || '')
    .slice(0, 2)
    .join('')
})

async function logout() {
  isLoggingOut.value = true
  
  try {
    await authStore.logout()
    router.push('/login')
  } catch (error) {
    console.error('Logout failed:', error)
  } finally {
    isLoggingOut.value = false
    confirmLogout.value = false
  }
}
</script>

<style scoped>
.custom-sidebar {
  border-right: 1px solid var(--color-border);
  box-shadow: var(--shadow-md);
  display: flex;
  flex-direction: column;
  transition: width var(--transition-normal);
}

/* Header Styles - Clickable */
.sidebar-header {
  padding: var(--spacing-md) var(--spacing-md);
  background: linear-gradient(135deg, var(--color-surface-light) 0%, var(--color-surface-dark) 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.sidebar-header:hover {
  background: linear-gradient(135deg, var(--color-surface) 0%, var(--color-surface-dark) 100%);
}

.sidebar-header:hover .rail-toggle-icon {
  opacity: 1;
  transform: translateX(-2px);
}

.sidebar-header.rail-mode {
  padding: var(--spacing-md) 0;
  justify-content: center;
}

.logo-container {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.rail-mode .logo-container {
  gap: 0;
}

.logo {
  width: 40px;
  height: 40px;
  object-fit: contain;
  transition: transform var(--transition-fast);
}

.sidebar-header:hover .logo {
  transform: scale(1.05);
}

.logo-text {
  display: flex;
  flex-direction: column;
}

.logo-title {
  font-weight: 700;
  font-size: var(--font-size-lg); /* Increased from base */
  color: var(--color-primary);
  line-height: 1.2;
}

.logo-subtitle {
  font-size: var(--font-size-xs); /* Increased from 9px */
  color: var(--color-text-secondary);
  line-height: 1.2;
}

.rail-toggle-icon {
  opacity: 0.5;
  transition: all var(--transition-fast);
}

/* Navigation Container */
.navigation-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 var(--spacing-xs);
}

/* Menu Styles - Larger Text */
.menu-subheader {
  font-size: var(--font-size-sm); /* Increased from 10px */
  font-weight: 600;
  letter-spacing: 0.3px;
  color: var(--color-text-secondary);
  padding-left: var(--spacing-sm);
  height: 28px; /* Increased from 24px */
}

:deep(.menu-item) {
  margin: 2px 0; /* Slightly increased */
  min-height: 36px !important; /* Increased from 32px */
  padding: 0 var(--spacing-md) !important;
  transition: all var(--transition-fast);
  border-radius: var(--radius-md);
}

.rail-mode :deep(.menu-item) {
  min-height: 48px !important;
  justify-content: center;
  padding: 0 !important;
  margin: 4px auto;
  width: 48px;
}

:deep(.menu-item .v-list-item__prepend) {
  padding-inline-end: var(--spacing-md) !important;
  margin-inline-end: 0 !important;
}

.rail-mode :deep(.menu-item .v-list-item__prepend) {
  padding-inline-end: 0 !important;
  margin-inline-end: 0 !important;
}

:deep(.menu-item .v-icon) {
  font-size: 20px !important; /* Increased from 18px */
}

.rail-mode :deep(.menu-item .v-icon) {
  font-size: 24px !important;
}

:deep(.menu-item .v-list-item-title) {
  font-size: var(--font-size-sm); /* Increased from xs */
  font-weight: 500;
  line-height: 1.3;
}

:deep(.menu-item.v-list-item--active) {
  background: rgba(var(--color-primary-rgb), 0.12);
}

:deep(.menu-item.v-list-item--active .v-list-item-title) {
  color: var(--color-primary);
  font-weight: 600;
}

/* Footer Styles - Larger Text */
.sidebar-footer {
  padding-bottom: var(--spacing-sm);
}

.user-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-md);
  margin: 2px var(--spacing-sm);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  background: rgba(var(--color-primary-rgb), 0.02);
}

.user-info.rail-mode {
  padding: var(--spacing-md) 0;
  justify-content: center;
  margin: 2px auto;
  width: 56px;
}

.user-info:hover {
  background: rgba(var(--color-error-rgb), 0.08);
}

.user-info:hover .logout-icon {
  color: var(--color-error) !important;
  transform: translateX(2px);
}

.user-avatar {
  font-weight: 600;
  box-shadow: var(--shadow-sm);
  font-size: var(--font-size-md) !important; /* Larger initials */
}

.rail-mode .user-avatar {
  width: 44px !important;
  height: 44px !important;
}

.user-details {
  flex: 1;
  min-width: 0;
}

.name {
  font-weight: 600;
  font-size: var(--font-size-sm); /* Increased from xs */
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
}

.role {
  font-size: var(--font-size-xs); /* Increased from 10px */
  color: var(--color-text-secondary);
  line-height: 1.3;
}

.logout-icon {
  transition: all var(--transition-fast);
  opacity: 0.7;
}

.version-text {
  text-align: center;
  font-size: var(--font-size-xs); /* Increased from 9px */
  color: var(--color-text-disabled);
  margin-top: var(--spacing-xs);
  margin-bottom: var(--spacing-xs);
}

/* Logout Dialog */
.logout-dialog {
  border-radius: var(--radius-md);
  overflow: hidden;
}

.bg-error-lighten-5 {
  background-color: rgba(var(--color-error-rgb), 0.05);
}

/* Scrollbar styling */
.navigation-container::-webkit-scrollbar {
  width: 4px;
}

.navigation-container::-webkit-scrollbar-track {
  background: transparent;
}

.navigation-container::-webkit-scrollbar-thumb {
  background-color: var(--color-border);
  border-radius: var(--radius-full);
}

/* Remove extra spacing */
:deep(.v-list) {
  padding: 0 !important;
}

:deep(.v-list-item__append) {
  padding-inline-start: var(--spacing-sm) !important;
}

:deep(.v-divider) {
  margin-top: 4px !important;
  margin-bottom: 4px !important;
}
</style>