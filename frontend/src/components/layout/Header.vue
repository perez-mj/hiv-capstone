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
/* Main Header Background - Deep Forest Gradient */
.app-header {
  background: linear-gradient(135deg, #0d2111 0%, #1b2e1b 100%) !important;
  position: relative;
  overflow: hidden;
  border-bottom: 2px solid #2d5a27; /* Forest Green border */
  height: 56px !important;
  color: #e8f5e9 !important;
}

/* Subtle Leaf/Nature Pattern Overlay */
.app-header::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5c-5 0-9 4-9 9 0 5 9 16 9 16s9-11 9-16c0-5-4-9-9-9z' fill='%23ffffff' fill-opacity='0.05'/%3E%3C/svg%3E");
  z-index: 0;
}

:deep(.v-toolbar__content) {
  position: relative;
  z-index: 1;
  background: transparent !important;
  height: 56px !important;
  padding: 0 16px;
}

/* Search Container Refinement */
.search-container {
  max-width: 400px;
  width: 100%;
}

/* Search Field Styling */
:deep(.v-autocomplete .v-field) {
  background: rgba(255, 255, 255, 0.08) !important;
  border-radius: 24px !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  transition: all 0.3s ease;
  color: #e8f5e9 !important;
}

:deep(.v-autocomplete .v-field--focused) {
  background: #ffffff !important;
  color: #1b2e1b !important;
  border-color: #2d5a27 !important;
  box-shadow: 0 0 10px rgba(45, 90, 39, 0.3);
}

:deep(.v-autocomplete .v-field__input) {
  font-size: 0.9rem;
  color: inherit !important;
}

/* Placeholder color when not focused */
:deep(.v-field:not(.v-field--focused) input::placeholder) {
  color: rgba(232, 245, 233, 0.6) !important;
  opacity: 1;
}

/* Icon colors */
:deep(.v-field__prepend-inner .v-icon) {
  color: #a5d6a7 !important; /* Mint Green icon */
}

:deep(.v-field--focused .v-field__prepend-inner .v-icon) {
  color: #1b2e1b !important; /* Deep Green icon when focused */
}

/* Navigation Icon (Hamburger Menu) */
:deep(.v-app-bar-nav-icon) {
  color: #e8f5e9 !important;
  transition: all 0.2s ease;
}

:deep(.v-app-bar-nav-icon:hover) {
  background: rgba(255, 255, 255, 0.1) !important;
  color: #a5d6a7 !important;
  transform: rotate(90deg);
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .search-container {
    max-width: 180px;
  }
}

/* Animation */
.app-header {
  animation: slideDown 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideDown {
  from {
    transform: translateY(-100%);
  }
  to {
    transform: translateY(0);
  }
}

/* Scrollbar for the search dropdown */
:deep(.v-list) {
  background: #ffffff !important;
  border: 1px solid #cddbc9 !important;
}

:deep(.v-list-item:hover) {
  background: #f1f8f1 !important;
  color: #1b2e1b !important;
}
</style>