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
        <img src="@/assets/images/logo.png" alt="OMPH HIV AQMS Logo" class="logo" />
        <div class="logo-text" v-if="!railMode">
          <div class="logo-title">OMPH HIV AQMS</div>
          <div class="logo-subtitle">Appointment & Queue System</div>
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
const userName = computed(() => authStore.user?.username || 'System Administrator')
const userRole = computed(() => authStore.user?.role || 'Admin')

const userInitials = computed(() => {
  const name = authStore.user?.username || 'SA'
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
/* Main Sidebar - Deep Forest Foundation */
.custom-sidebar {
  background-color: #0d2111 !important; /* Deepest Forest Green */
  border-right: 1px solid #1b2e1b !important;
  display: flex;
  flex-direction: column;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  color: #e8f5e9;
  box-shadow: 4px 0 10px rgba(0, 0, 0, 0.3);
}

/* Sidebar Header - Logo remains small as requested */
.sidebar-header {
  padding: 16px;
  background: linear-gradient(180deg, #122916 0%, #0d2111 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.sidebar-header:hover {
  background: #1b2e1b;
}

.logo {
  width: 40px; /* Small logo maintained */
  height: 40px;
  object-fit: contain;
  filter: drop-shadow(0 0 4px rgba(165, 214, 167, 0.2));
}

.logo-title {
  font-weight: 700;
  font-size: 1.1rem;
  color: #a5d6a7; /* Mint Green Title */
  line-height: 1.2;
}

.logo-subtitle {
  font-size: 0.7rem;
  color: rgba(165, 214, 167, 0.6);
  line-height: 1.2;
}

/* Navigation List Container */
.navigation-container {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px;
}

.menu-subheader {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 1px;
  color: #4a634a !important; /* Muted Moss Green */
  margin-top: 16px;
  margin-bottom: 4px;
  text-transform: uppercase;
}

/* Menu Items Styling */
:deep(.menu-item) {
  margin: 4px 0 !important;
  color: #c8d6c8 !important; /* Pale Leaf Green */
  transition: all 0.2s ease;
  border-radius: 8px !important;
}

:deep(.menu-item:hover) {
  background: rgba(165, 214, 167, 0.08) !important;
  color: #ffffff !important;
  transform: translateX(4px);
}

/* Active State - Glowing Forest Accent */
:deep(.menu-item.v-list-item--active) {
  background: #2d5a27 !important; /* Vibrant Forest Green */
  color: #ffffff !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

:deep(.menu-item.v-list-item--active .v-icon) {
  color: #a5d6a7 !important;
}

/* Sidebar Footer (User Info) */
.sidebar-footer {
  padding: 12px;
  background: #0a1a0d; /* Slightly darker base */
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.user-info:hover {
  background: rgba(231, 76, 60, 0.1); /* Subtle red logout hint */
  border-color: rgba(231, 76, 60, 0.3);
}

.user-avatar {
  background-color: #2d5a27 !important; /* Forest Avatar */
  color: #ffffff;
  border: 1px solid rgba(165, 214, 167, 0.3);
}

.name {
  font-weight: 600;
  font-size: 0.85rem;
  color: #e8f5e9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.role {
  font-size: 0.7rem;
  color: #81a181; /* Sage Green */
}

/* Logout Icon styling */
.logout-icon {
  color: rgba(255, 255, 255, 0.5) !important;
  transition: color 0.2s ease;
}

.user-info:hover .logout-icon {
  color: #ff5252 !important; /* Highlight red on hover */
}

/* Scrollbar Customization */
.navigation-container::-webkit-scrollbar {
  width: 4px;
}

.navigation-container::-webkit-scrollbar-thumb {
  background: #1b2e1b;
  border-radius: 10px;
}

.navigation-container::-webkit-scrollbar-thumb:hover {
  background: #2d5a27;
}

/* Version Text */
.version-text {
  text-align: center;
  font-size: 0.65rem;
  color: #4a634a;
  margin-top: 8px;
  opacity: 0.8;
}

/* Utilities */
:deep(.v-divider) {
  border-color: rgba(255, 255, 255, 0.08) !important;
}

/* Rail Mode Adjustment */
.rail-mode :deep(.menu-item) {
  margin: 8px auto !important;
}
</style>