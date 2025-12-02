<!-- frontend/src/layouts/PatientLayout.vue -->
<template>
  <v-app>
    <!-- Patient Header -->
    <v-app-bar app color="primary" dark elevation="1">
      <v-container class="d-flex align-center">
        <!-- Logo and Brand -->
        <div class="d-flex align-center cursor-pointer" @click="$router.push('/patient/dashboard')">
          <v-icon icon="mdi-heart-pulse" size="32" class="mr-3" />
          <div>
            <div class="text-h6 font-weight-bold">HealthConnect</div>
            <div class="text-caption opacity-70">Patient Portal</div>
          </div>
        </div>

        <v-spacer />

        <!-- Desktop Navigation -->
        <div class="d-none d-md-flex align-center gap-4">
          <v-btn
            v-for="item in navItems"
            :key="item.route"
            :to="item.route"
            variant="text"
            :prepend-icon="item.icon"
            :color="$route.path === item.route ? 'white' : 'grey-lighten-3'"
            class="text-capitalize"
          >
            {{ item.title }}
          </v-btn>
        </div>

        <v-spacer />

        <!-- Patient Info and Actions -->
        <div class="d-flex align-center gap-3">
          <!-- Notifications -->
          <v-menu location="bottom">
            <template v-slot:activator="{ props }">
              <v-badge
                :content="unreadNotifications"
                :model-value="unreadNotifications > 0"
                color="error"
                dot
              >
                <v-btn
                  v-bind="props"
                  icon
                  variant="text"
                  color="white"
                >
                  <v-icon>mdi-bell</v-icon>
                </v-btn>
              </v-badge>
            </template>

            <v-card min-width="300">
              <v-card-title class="d-flex justify-space-between align-center">
                <span>Notifications</span>
                <v-btn variant="text" size="small" @click="markAllAsRead">
                  Mark all read
                </v-btn>
              </v-card-title>
              <v-card-text class="pa-0">
                <div v-if="notifications.length > 0">
                  <div
                    v-for="notification in notifications.slice(0, 5)"
                    :key="notification.id"
                    class="notification-item pa-3"
                    :class="{ 'bg-grey-lighten-4': !notification.read }"
                  >
                    <div class="d-flex align-start">
                      <v-icon
                        :color="getNotificationColor(notification.type)"
                        size="20"
                        class="mr-3 mt-1"
                      >
                        {{ getNotificationIcon(notification.type) }}
                      </v-icon>
                      <div class="flex-grow-1">
                        <div class="text-body-2 font-weight-medium">
                          {{ notification.title }}
                        </div>
                        <div class="text-caption text-medium-emphasis">
                          {{ notification.message }}
                        </div>
                        <div class="text-caption text-disabled mt-1">
                          {{ formatTimeAgo(notification.created_at) }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-else class="text-center py-4">
                  <v-icon size="48" color="grey-lighten-2" class="mb-2">
                    mdi-bell-off
                  </v-icon>
                  <div class="text-body-2 text-grey">No notifications</div>
                </div>
              </v-card-text>
              <v-card-actions v-if="notifications.length > 0">
                <v-btn
                  block
                  variant="text"
                  @click="$router.push('/patient/notifications')"
                >
                  View All Notifications
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-menu>

          <!-- Patient Menu -->
          <v-menu location="bottom end">
            <template v-slot:activator="{ props }">
              <v-btn v-bind="props" variant="text" color="white" class="d-flex align-center">
                <v-avatar size="36" color="white" class="mr-2">
                  <span class="text-primary text-caption font-weight-bold">
                    {{ getInitials(patient.name) }}
                  </span>
                </v-avatar>
                <div class="text-left d-none d-sm-block">
                  <div class="text-body-2 font-weight-medium">{{ patient.name }}</div>
                  <div class="text-caption opacity-70">Patient ID: {{ patient.patient_id }}</div>
                </div>
                <v-icon class="ml-2">mdi-chevron-down</v-icon>
              </v-btn>
            </template>

            <v-card min-width="250">
              <v-list>
                <v-list-item>
                  <template v-slot:prepend>
                    <v-avatar color="primary" size="40">
                      <span class="text-white text-caption font-weight-bold">
                        {{ getInitials(patient.name) }}
                      </span>
                    </v-avatar>
                  </template>
                  <v-list-item-title>{{ patient.name }}</v-list-item-title>
                  <v-list-item-subtitle>Patient ID: {{ patient.patient_id }}</v-list-item-subtitle>
                </v-list-item>

                <v-divider class="my-2" />

                <v-list-item
                  v-for="item in userMenuItems"
                  :key="item.title"
                  :to="item.route"
                  @click="item.action"
                >
                  <template v-slot:prepend>
                    <v-icon :color="item.color">{{ item.icon }}</v-icon>
                  </template>
                  <v-list-item-title>{{ item.title }}</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-card>
          </v-menu>
        </div>

        <!-- Mobile menu button -->
        <v-btn
          class="d-md-none"
          icon
          variant="text"
          color="white"
          @click="mobileDrawer = true"
        >
          <v-icon>mdi-menu</v-icon>
        </v-btn>
      </v-container>
    </v-app-bar>

    <!-- Mobile Navigation Drawer -->
    <v-navigation-drawer
      v-model="mobileDrawer"
      location="left"
      temporary
      app
    >
      <v-list>
        <v-list-item class="mb-4">
          <template v-slot:prepend>
            <v-icon icon="mdi-heart-pulse" color="primary" size="32" />
          </template>
          <v-list-item-title class="text-h6 font-weight-bold">
            HealthConnect
          </v-list-item-title>
          <v-list-item-subtitle>Patient Portal</v-list-item-subtitle>
        </v-list-item>

        <v-divider />

        <v-list-item
          v-for="item in navItems"
          :key="item.route"
          :to="item.route"
          @click="mobileDrawer = false"
        >
          <template v-slot:prepend>
            <v-icon :color="item.color">{{ item.icon }}</v-icon>
          </template>
          <v-list-item-title>{{ item.title }}</v-list-item-title>
        </v-list-item>

        <v-divider class="my-2" />

        <v-list-item @click="logout">
          <template v-slot:prepend>
            <v-icon color="error">mdi-logout</v-icon>
          </template>
          <v-list-item-title>Logout</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <!-- Main content -->
    <v-main>
      <v-container fluid class="pa-0">
        <!-- Page Content -->
        <v-container class="py-6">
          <router-view />
        </v-container>
      </v-container>
    </v-main>

    <!-- Patient Footer -->
    <v-footer color="grey-lighten-4" app inset>
      <v-container>
        <v-row align="center">
          <v-col cols="12" md="6">
            <div class="d-flex align-center">
              <v-icon icon="mdi-heart-pulse" color="primary" class="mr-2" />
              <span class="text-body-2 text-medium-emphasis">
                HealthConnect Patient Portal &copy; {{ new Date().getFullYear() }}
              </span>
            </div>
          </v-col>
          <v-col cols="12" md="6" class="text-right">
            <div class="d-flex justify-end gap-4">
              <router-link to="/patient/help" class="text-primary text-decoration-none text-body-2">
                Help Center
              </router-link>
              <router-link to="/patient/privacy" class="text-primary text-decoration-none text-body-2">
                Privacy Policy
              </router-link>
              <router-link to="/patient/terms" class="text-primary text-decoration-none text-body-2">
                Terms of Service
              </router-link>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </v-footer>

    <!-- Emergency Contact Fab -->
    <v-fab
      v-if="showEmergencyFab"
      location="bottom end"
      position="fixed"
      app
      class="mr-4 mb-4"
    >
      <v-btn
        color="error"
        fab
        dark
        size="large"
        @click="showEmergencyDialog = true"
      >
        <v-icon>mdi-alert-circle</v-icon>
      </v-btn>
    </v-fab>

    <!-- Emergency Contact Dialog -->
    <v-dialog v-model="showEmergencyDialog" max-width="500">
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center error">
          <span class="text-white">Emergency Contact</span>
          <v-btn icon dark @click="showEmergencyDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text class="pa-4">
          <div class="text-center mb-4">
            <v-icon color="error" size="64" class="mb-2">mdi-alert-circle</v-icon>
            <div class="text-h6">Emergency Assistance</div>
            <div class="text-body-2 text-medium-emphasis">
              Contact your healthcare provider immediately for urgent medical concerns
            </div>
          </div>

          <v-list>
            <v-list-item>
              <template v-slot:prepend>
                <v-icon color="primary">mdi-phone</v-icon>
              </template>
              <v-list-item-title>Emergency Hotline</v-list-item-title>
              <v-list-item-subtitle>1-800-HELP-NOW</v-list-item-subtitle>
              <template v-slot:append>
                <v-btn color="primary" variant="text" icon="mdi-phone" />
              </template>
            </v-list-item>

            <v-list-item>
              <template v-slot:prepend>
                <v-icon color="primary">mdi-hospital-building</v-icon>
              </template>
              <v-list-item-title>Your Primary Clinic</v-list-item-title>
              <v-list-item-subtitle>(555) 123-4567</v-list-item-subtitle>
              <template v-slot:append>
                <v-btn color="primary" variant="text" icon="mdi-phone" />
              </template>
            </v-list-item>

            <v-list-item>
              <template v-slot:prepend>
                <v-icon color="primary">mdi-account</v-icon>
              </template>
              <v-list-item-title>Primary Doctor</v-list-item-title>
              <v-list-item-subtitle>Dr. {{ patient.doctor_name || 'Smith' }}</v-list-item-subtitle>
              <template v-slot:append>
                <v-btn color="primary" variant="text" icon="mdi-phone" />
              </template>
            </v-list-item>
          </v-list>

          <v-alert
            type="info"
            variant="tonal"
            class="mt-4"
          >
            <strong>For life-threatening emergencies, call 911 immediately</strong>
          </v-alert>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const mobileDrawer = ref(false)
const showEmergencyDialog = ref(false)
const notifications = ref([])

const patient = ref({
  name: '',
  patient_id: '',
  consent_status: '',
  doctor_name: ''
})

// Navigation items
const navItems = ref([
  {
    title: 'Dashboard',
    route: '/patient/dashboard',
    icon: 'mdi-view-dashboard',
    color: 'primary'
  },
  {
    title: 'My Profile',
    route: '/patient/profile',
    icon: 'mdi-account',
    color: 'primary'
  },
  {
    title: 'Test History',
    route: '/patient/test-history',
    icon: 'mdi-heart-pulse',
    color: 'primary'
  },
  {
    title: 'Appointments',
    route: '/patient/appointments',
    icon: 'mdi-calendar',
    color: 'primary'
  },
  {
    title: 'Messages',
    route: '/patient/messages',
    icon: 'mdi-message',
    color: 'primary'
  }
])

// User menu items
const userMenuItems = ref([
  {
    title: 'My Profile',
    route: '/patient/profile',
    icon: 'mdi-account',
    color: 'primary'
  },
  {
    title: 'Settings',
    route: '/patient/settings',
    icon: 'mdi-cog',
    color: 'primary'
  },
  {
    title: 'Help & Support',
    route: '/patient/help',
    icon: 'mdi-help-circle',
    color: 'primary'
  },
  {
    title: 'Logout',
    icon: 'mdi-logout',
    color: 'error',
    action: () => logout()
  }
])

// Computed properties
const unreadNotifications = computed(() => {
  return notifications.value.filter(n => !n.read).length
})

const showEmergencyFab = computed(() => {
  // Show emergency FAB on all pages except login
  return route.path !== '/patient/login'
})

// Methods
function getInitials(name) {
  if (!name) return 'PT'
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

function getNotificationColor(type) {
  const colors = {
    appointment: 'primary',
    test_result: 'success',
    message: 'info',
    emergency: 'error',
    general: 'grey'
  }
  return colors[type] || 'grey'
}

function getNotificationIcon(type) {
  const icons = {
    appointment: 'mdi-calendar',
    test_result: 'mdi-heart-pulse',
    message: 'mdi-message',
    emergency: 'mdi-alert',
    general: 'mdi-information'
  }
  return icons[type] || 'mdi-information'
}

function formatTimeAgo(dateString) {
  if (!dateString) return ''
  const now = new Date()
  const time = new Date(dateString)
  const diffMs = now - time
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${Math.floor(diffHours / 24)}d ago`
}

function markAllAsRead() {
  notifications.value.forEach(notification => {
    notification.read = true
  })
}

function logout() {
  // Clear patient data from localStorage
  localStorage.removeItem('patientToken')
  localStorage.removeItem('patientData')
  
  // Redirect to login page
  router.push('/patient/login')
}

// Load sample notifications (replace with API call)
function loadSampleNotifications() {
  notifications.value = [
    {
      id: 1,
      type: 'appointment',
      title: 'Appointment Reminder',
      message: 'You have an appointment tomorrow at 2:00 PM',
      created_at: new Date(Date.now() - 30 * 60000).toISOString(), // 30 minutes ago
      read: false
    },
    {
      id: 2,
      type: 'test_result',
      title: 'Test Results Available',
      message: 'Your recent HIV test results are now available',
      created_at: new Date(Date.now() - 2 * 3600000).toISOString(), // 2 hours ago
      read: true
    },
    {
      id: 3,
      type: 'message',
      title: 'New Message',
      message: 'You have a new message from Dr. Smith',
      created_at: new Date(Date.now() - 5 * 3600000).toISOString(), // 5 hours ago
      read: false
    }
  ]
}

// Lifecycle
onMounted(() => {
  // Load patient data from localStorage
  const patientData = localStorage.getItem('patientData')
  if (patientData) {
    patient.value = JSON.parse(patientData)
  }
  
  loadSampleNotifications()
})
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}

.gap-3 {
  gap: 12px;
}

.gap-4 {
  gap: 16px;
}

.opacity-70 {
  opacity: 0.7;
}

.opacity-80 {
  opacity: 0.8;
}

.notification-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  transition: background-color 0.2s ease;
}

.notification-item:hover {
  background: rgba(0, 0, 0, 0.04);
}

.notification-item:last-child {
  border-bottom: none;
}

/* Custom scrollbar for notifications */
:deep(.v-card-text) {
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
}

:deep(.v-card-text)::-webkit-scrollbar {
  width: 6px;
}

:deep(.v-card-text)::-webkit-scrollbar-track {
  background: transparent;
}

:deep(.v-card-text)::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}
</style>