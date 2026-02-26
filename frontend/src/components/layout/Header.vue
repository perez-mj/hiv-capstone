<!-- frontend/src/components/layout/Header.vue -->
<template>
  <v-app-bar 
    app 
    elevation="2"
    height="56"
    class="app-header"
  >
    <div class="d-flex align-center w-100">
      <!-- Sidebar Toggle and Search in one row -->
      <div class="d-flex align-center flex-grow-1">
        <v-app-bar-nav-icon @click="$emit('toggle-drawer')" class="text-white mr-2" />
        
        <!-- Global Search -->
        <div class="search-container">
          <v-autocomplete
            v-model="selectedRoute"
            :items="searchableRoutes"
            item-title="title"
            item-value="path"
            placeholder="Search pages... (Ctrl+K)"
            prepend-inner-icon="mdi-magnify"
            variant="solo"
            density="compact"
            hide-details
            clearable
            @update:model-value="navigateToRoute"
            @keydown.ctrl.k.prevent="focusSearch"
            ref="searchInput"
          >
            <template v-slot:item="{ props, item }">
              <v-list-item
                v-bind="props"
                :subtitle="item.raw.category"
              >
                <template v-slot:prepend>
                  <v-icon :icon="item.raw.icon" color="primary" size="small" />
                </template>
              </v-list-item>
            </template>
            
            <template v-slot:no-data>
              <v-list-item title="No pages found" />
            </template>
          </v-autocomplete>
        </div>
      </div>
    </div>
  </v-app-bar>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const emit = defineEmits(['toggle-drawer'])
const router = useRouter()

const searchInput = ref(null)
const selectedRoute = ref(null)

// Searchable routes configuration
const searchableRoutes = computed(() => [
  // Dashboard
  { title: 'Dashboard', path: '/admin/dashboard', icon: 'mdi-view-dashboard', category: 'Dashboard' },
  
  // Patient Management
  { title: 'All Patients', path: '/admin/patients', icon: 'mdi-account-group', category: 'Patient Management' },
  
  // Kiosk Management
  { title: 'Kiosk Devices', path: '/admin/kiosks', icon: 'mdi-monitor', category: 'Kiosk Management' },
  
  // Appointments
  { title: 'Calendar', path: '/admin/appointments-calendar', icon: 'mdi-calendar', category: 'Appointments' },
  { title: 'Upcoming Appointments', path: '/admin/appointments/upcoming', icon: 'mdi-calendar-clock', category: 'Appointments' },
  { title: 'Schedule Appointment', path: '/admin/appointments/new', icon: 'mdi-calendar-plus', category: 'Appointments' },
  
  // User Management
  { title: 'Users', path: '/admin/users', icon: 'mdi-account-cog', category: 'User Management' },
  { title: 'Roles & Permissions', path: '/admin/users/roles', icon: 'mdi-shield-account', category: 'User Management' },
  { title: 'Activity Logs', path: '/admin/users/logs', icon: 'mdi-history', category: 'User Management' },
  
  // Settings
  { title: 'System Settings', path: '/admin/settings', icon: 'mdi-cog', category: 'Settings' },
  { title: 'Profile', path: '/admin/profile', icon: 'mdi-account', category: 'Settings' },
  { title: 'Security', path: '/admin/security', icon: 'mdi-shield-lock', category: 'Settings' },
])

// Keyboard shortcut handler
const handleKeyDown = (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    focusSearch()
  }
}

// Focus search input
const focusSearch = () => {
  const input = document.querySelector('.global-search input')
  if (input) {
    input.focus()
    input.select()
  }
}

// Navigate to selected route
const navigateToRoute = (path) => {
  if (path) {
    router.push(path)
    selectedRoute.value = null
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped>
.app-header {
  background: linear-gradient(135deg, var(--color-secondary) 0%, var(--color-primary) 100%);
  position: relative;
  overflow: hidden;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  height: 56px !important;
}

.app-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  z-index: 0;
  opacity: 0.3;
}

:deep(.v-toolbar__content) {
  position: relative;
  z-index: 1;
  background: transparent !important;
  height: 56px !important;
  padding: 0 var(--spacing-md);
}

/* Search Container */
.search-container {
  max-width: 400px;
  width: 100%;
}

:deep(.global-search) {
  transition: all var(--transition-fast);
}

:deep(.global-search .v-field) {
  background: rgba(255, 255, 255, 0.15);
  border-radius: var(--radius-full);
  min-height: 36px;
  backdrop-filter: blur(4px);
}

:deep(.global-search .v-field:hover) {
  background: rgba(255, 255, 255, 0.25);
}

:deep(.global-search .v-field--focused) {
  background: white;
}

:deep(.global-search .v-field .v-icon) {
  color: rgba(255, 255, 255, 0.8);
  opacity: 1;
}

:deep(.global-search .v-field--focused .v-icon) {
  color: var(--color-primary);
}

:deep(.global-search .v-field__input) {
  color: white;
  font-size: var(--font-size-sm);
  padding: 0 var(--spacing-sm);
}

:deep(.global-search .v-field--focused .v-field__input) {
  color: var(--color-text-primary);
}

:deep(.global-search .v-field__input::placeholder) {
  color: rgba(255, 255, 255, 0.6);
  opacity: 1;
}

:deep(.global-search .v-field--focused .v-field__input::placeholder) {
  color: var(--color-text-secondary);
}

:deep(.v-field--focused) .search-shortcut {
  background: rgba(0, 0, 0, 0.1) !important;
  color: var(--color-text-secondary) !important;
}

/* Responsive */
@media (max-width: 960px) {
  .search-container {
    max-width: 250px;
  }
}

@media (max-width: 600px) {
  .search-container {
    max-width: 150px;
  }
  
  :deep(.global-search .v-field__input) {
    min-width: 100px;
  }
}

/* Animation */
:deep(.v-app-bar-nav-icon) {
  transition: transform var(--transition-fast);
}

:deep(.v-app-bar-nav-icon:hover) {
  transform: scale(1.1);
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-sm);
}

.app-header {
  animation: slideDown var(--transition-normal) ease-out;
}

@keyframes slideDown {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>