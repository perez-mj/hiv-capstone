<template>
  <v-navigation-drawer 
    v-model="drawerSync" 
    app 
    color="white" 
    :clipped="$vuetify.display.mdAndUp"
    :temporary="!$vuetify.display.mdAndUp" 
    class="custom-sidebar"
    width="280"
  >
    <!-- Header with Logo -->
    <div class="sidebar-header">
      <div class="logo-container">
        <v-icon size="32" color="primary" class="logo-icon">mdi-heart-pulse</v-icon>
        <div class="logo-text">
          <div class="logo-title">HIV Care</div>
          <div class="logo-subtitle">Enrollment System</div>
        </div>
      </div>
    </div>

    <v-divider class="my-2" />

    <!-- User Info Section -->
    <div class="user-info">
      <v-avatar size="48" color="primary" class="user-avatar">
        {{ userInitials }}
      </v-avatar>
      <div class="user-details">
        <div class="name">{{ userName }}</div>
        <div class="role">{{ userRole }}</div>
        <v-chip small color="green" text-color="white" class="status-chip">
          <v-icon small left>mdi-check-circle</v-icon>
          Online
        </v-chip>
      </div>
    </div>

    <v-divider class="my-3" />

    <!-- Menu Items -->
    <v-list nav dense class="menu-list">
      <v-list-item
        v-for="item in menu"
        :key="item.title"
        :to="item.to"
        link
        :class="{ 'active-menu-item': $route.path === item.to }"
        class="menu-item"
      >
        <template #prepend>
          <v-icon :icon="item.icon" :color="$route.path === item.to ? 'primary' : 'grey-darken-1'" />
        </template>
        
        <v-list-item-title class="menu-item-title">
          {{ item.title }}
        </v-list-item-title>

        <template v-if="item.badge" #append>
          <v-badge :content="item.badge" color="red" inline />
        </template>
      </v-list-item>
    </v-list>

    <!-- Quick Actions -->
    <div class="quick-actions">
      <v-divider class="my-3" />
      <div class="actions-title">Quick Actions</div>
      <v-btn 
        block 
        color="primary" 
        class="mt-2 mb-1"
        prepend-icon="mdi-account-plus"
        variant="flat"
        @click="navigateToEnrollment"
      >
        New Enrollment
      </v-btn>
      <v-btn 
        block 
        color="green" 
        class="mb-2"
        prepend-icon="mdi-shield-check"
        variant="outlined"
        @click="navigateToVerification"
      >
        Verify Record
      </v-btn>
    </div>

    <!-- Footer -->
    <template #append>
      <div class="sidebar-footer">
        <v-divider />
        <v-list-item 
          class="logout-item"
          @click="logout"
        >
          <template #prepend>
            <v-icon icon="mdi-logout" color="red" />
          </template>
          <v-list-item-title class="logout-text">Logout</v-list-item-title>
        </v-list-item>
        <div class="version-text">v1.0.0</div>
      </div>
    </template>
  </v-navigation-drawer>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'

const props = defineProps({
  modelValue: Boolean
})
const emit = defineEmits(['update:modelValue'])

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const drawerSync = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Enhanced menu with icons and badges
const menu = ref([
  { 
    title: 'Dashboard', 
    to: '/admin/dashboard', 
    icon: 'mdi-view-dashboard',
    badge: null,
    description: 'System overview and analytics'
  },
  { 
    title: 'Patient Management', 
    to: '/admin/patients', 
    icon: 'mdi-account-group',
    badge: null,
    description: 'Manage patient records and data'
  },
  { 
    title: 'Audit & Security', 
    to: '/admin/audit-security', 
    icon: 'mdi-shield-account',
    badge: null,
    description: 'System logs and security monitoring'
  },
  { 
    title: 'User Management', 
    to: '/admin/users', 
    icon: 'mdi-account-cog',
    badge: null,
    description: 'Manage users'
  },
  { 
    title: 'Messaging Center', 
    to: '/admin/messaging-center', 
    icon: 'mdi-message-text',
    badge: null,
    description: 'Centralized messaging and communication'
  },
  { 
    title: 'Appointments Calendar', 
    to: '/admin/appointments-calendar', 
    icon: 'mdi-calendar',
    badge: null,
    description: 'Appointment scheduling and management'
  },
])

// Auth computed properties
const userName = computed(() => authStore.user?.name || 'System Administrator')
const userRole = computed(() => authStore.user?.role || 'Admin')

// Generate initials from name
const userInitials = computed(() => {
  const name = authStore.user?.name || 'SA'
  return name
    .split(' ')
    .map(word => word[0]?.toUpperCase() || '')
    .slice(0, 2)
    .join('')
})

// Navigation methods
function navigateToEnrollment() {
  router.push('/admin/enrollment')
}

function navigateToVerification() {
  router.push('/admin/verification')
}

function logout() {
  authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.custom-sidebar {
  border-right: 1px solid rgba(0, 0, 0, 0.12);
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
}

/* Header Styles */
.sidebar-header {
  padding: 16px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.logo-text {
  display: flex;
  flex-direction: column;
}

.logo-title {
  font-weight: 700;
  font-size: 18px;
  color: #1976d2;
  line-height: 1.2;
}

.logo-subtitle {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.6);
  line-height: 1.2;
}

/* User Info Styles */
.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(25, 118, 210, 0.04);
  margin: 8px;
  border-radius: 12px;
}

.user-avatar {
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.3);
}

.user-details {
  flex: 1;
  min-width: 0; /* Prevent text overflow */
}

.name {
  font-weight: 600;
  font-size: 14px;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.role {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.6);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-chip {
  margin-top: 4px;
  height: 20px;
  font-size: 10px;
}

/* Menu Styles */
.menu-list {
  padding: 0 8px;
}

.menu-item {
  border-radius: 8px;
  margin: 2px 0;
  transition: all 0.3s ease;
}

.menu-item:hover {
  background: rgba(25, 118, 210, 0.08);
}

.menu-item.active-menu-item {
  background: rgba(25, 118, 210, 0.12);
  border-left: 3px solid #1976d2;
}

.menu-item-title {
  font-size: 14px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.8);
}

.menu-item.active-menu-item .menu-item-title {
  color: #1976d2;
  font-weight: 600;
}

/* Quick Actions */
.quick-actions {
  padding: 0 16px;
}

.actions-title {
  font-size: 12px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

/* Footer Styles */
.sidebar-footer {
  padding-bottom: 8px;
}

.logout-item {
  border-radius: 8px;
  margin: 4px 8px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.logout-item:hover {
  background: rgba(244, 67, 54, 0.08);
}

.logout-text {
  color: #f44336;
  font-weight: 500;
}

.version-text {
  text-align: center;
  font-size: 11px;
  color: rgba(0, 0, 0, 0.4);
  margin-top: 8px;
}

/* Responsive adjustments */
@media (max-width: 1264px) {
  .custom-sidebar {
    width: 260px !important;
  }
}

/* Scrollbar styling */
.custom-sidebar ::v-deep(.v-navigation-drawer__content) {
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
}

.custom-sidebar ::v-deep(.v-navigation-drawer__content)::-webkit-scrollbar {
  width: 4px;
}

.custom-sidebar ::v-deep(.v-navigation-drawer__content)::-webkit-scrollbar-track {
  background: transparent;
}

.custom-sidebar ::v-deep(.v-navigation-drawer__content)::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}
</style>