<!-- frontend/src/layouts/PatientLayout.vue -->
<template>
  <v-app>
    <!-- Patient Header - Responsive -->
    <v-app-bar app color="primary" dark elevation="1" height="auto" class="pa-1 pa-sm-2">
      <v-container class="d-flex align-center" fluid>
        <!-- Logo and Brand -->
        <div class="d-flex align-center cursor-pointer" @click="$router.push('/patient/dashboard')">
          <v-icon icon="mdi-heart-pulse" size="28" class="mr-2" />
          <div class="d-none d-sm-block">
            <div class="text-h6 font-weight-bold">HealthConnect</div>
            <div class="text-caption opacity-70">Patient Portal</div>
          </div>
          <div class="d-sm-none">
            <div class="text-subtitle-1 font-weight-bold">HealthConnect</div>
          </div>
        </div>

        <v-spacer />

        <!-- Desktop Navigation (hidden on mobile) -->
        <div class="d-none d-md-flex align-center gap-4">
          <v-btn
            v-for="item in navItems"
            :key="item.route"
            :to="item.route"
            variant="text"
            :prepend-icon="item.icon"
            :color="$route.path === item.route ? 'white' : 'grey-lighten-3'"
            class="text-capitalize"
            size="small"
          >
            {{ item.title }}
          </v-btn>
        </div>

        <v-spacer class="d-none d-md-block" />

        <!-- Actions -->
        <div class="d-flex align-center gap-2 gap-sm-3">
          <!-- Queue Status Badge (if in queue) -->
          <v-btn
            v-if="queueStatus.in_queue"
            variant="text"
            color="white"
            class="position-relative"
            size="small"
            @click="showQueueDetails = !showQueueDetails"
          >
            <v-badge
              :content="queueStatus.queue_number"
              color="warning"
              inline
            >
              <v-icon>mdi-format-list-numbered</v-icon>
            </v-badge>
            <span class="ml-2 d-none d-sm-inline">Queue #{{ queueStatus.queue_number }}</span>
          </v-btn>

          <!-- Notifications - Simplified on mobile -->
          <v-menu location="bottom end" :close-on-content-click="false">
            <template v-slot:activator="{ props }">
              <v-badge
                :content="unreadCount"
                :model-value="unreadCount > 0"
                color="error"
              >
                <v-btn
                  v-bind="props"
                  icon
                  variant="text"
                  color="white"
                  size="small"
                  :loading="loading.notifications"
                >
                  <v-icon>mdi-bell</v-icon>
                </v-btn>
              </v-badge>
            </template>

            <v-card min-width="280" max-width="360">
              <v-card-title class="d-flex justify-space-between align-center py-2">
                <span class="text-subtitle-1">Notifications</span>
                <v-btn 
                  variant="text" 
                  size="x-small" 
                  @click="markAllAsRead"
                  :disabled="unreadCount === 0"
                >
                  Mark all read
                </v-btn>
              </v-card-title>
              
              <v-divider />
              
              <v-card-text class="pa-0" style="max-height: 350px; overflow-y: auto;">
                <v-list lines="two" density="compact">
                  <v-list-item
                    v-for="notification in notifications"
                    :key="notification.id"
                    :value="notification"
                    :class="{ 'bg-grey-lighten-3': !notification.read }"
                    @click="handleNotificationClick(notification)"
                  >
                    <template v-slot:prepend>
                      <v-avatar :color="getNotificationColor(notification.type)" size="32">
                        <v-icon color="white" size="16">
                          {{ getNotificationIcon(notification.type) }}
                        </v-icon>
                      </v-avatar>
                    </template>

                    <v-list-item-title class="font-weight-medium text-body-2">
                      {{ notification.title }}
                    </v-list-item-title>
                    
                    <v-list-item-subtitle class="text-caption text-wrap">
                      {{ notification.message }}
                    </v-list-item-subtitle>

                    <template v-slot:append>
                      <div class="text-caption text-disabled">
                        {{ formatTimeAgo(notification.created_at) }}
                      </div>
                    </template>
                  </v-list-item>
                </v-list>

                <div v-if="notifications.length === 0" class="text-center py-4">
                  <v-icon size="40" color="grey-lighten-2" class="mb-1">
                    mdi-bell-off-outline
                  </v-icon>
                  <div class="text-body-2 text-grey">No notifications</div>
                </div>
              </v-card-text>

              <v-divider v-if="notifications.length > 0" />
              
              <v-card-actions v-if="notifications.length > 0" class="pa-2">
                <v-btn
                  block
                  variant="text"
                  size="small"
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
              <v-btn v-bind="props" variant="text" color="white" class="d-flex align-center" size="small">
                <v-avatar size="32" color="white" class="mr-1 mr-sm-2">
                  <span class="text-primary text-caption font-weight-bold">
                    {{ initials }}
                  </span>
                </v-avatar>
                <div class="text-left d-none d-sm-block">
                  <div class="text-body-2 font-weight-medium">{{ patientShortName }}</div>
                </div>
                <v-icon size="small" class="ml-1 d-none d-sm-inline">mdi-chevron-down</v-icon>
              </v-btn>
            </template>

            <v-card min-width="240">
              <v-list density="compact">
                <v-list-item>
                  <template v-slot:prepend>
                    <v-avatar color="primary" size="40">
                      <span class="text-white text-subtitle-2 font-weight-bold">
                        {{ initials }}
                      </span>
                    </v-avatar>
                  </template>
                  <v-list-item-title class="font-weight-medium text-body-2">
                    {{ patientFullName }}
                  </v-list-item-title>
                  <v-list-item-subtitle class="text-caption">
                    ID: {{ patientId }}
                  </v-list-item-subtitle>
                </v-list-item>

                <v-divider class="my-1" />

                <v-list-item
                  to="/patient/profile"
                  prepend-icon="mdi-account"
                  title="My Profile"
                  density="compact"
                />
                
                <v-list-item
                  to="/patient/change-password"
                  prepend-icon="mdi-lock-reset"
                  title="Change Password"
                  density="compact"
                />

                <v-divider class="my-1" />

                <v-list-item
                  @click="logout"
                  prepend-icon="mdi-logout"
                  title="Logout"
                  color="error"
                  density="compact"
                />
              </v-list>
            </v-card>
          </v-menu>
        </div>

        <!-- Mobile menu button -->
        <v-btn
          class="d-md-none ml-1"
          icon
          variant="text"
          color="white"
          size="small"
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
      width="280"
    >
      <v-list>
        <v-list-item class="mb-2">
          <template v-slot:prepend>
            <v-avatar color="primary" size="40">
              <v-icon icon="mdi-heart-pulse" color="white" size="24" />
            </v-avatar>
          </template>
          <v-list-item-title class="text-subtitle-1 font-weight-bold">
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
          :prepend-icon="item.icon"
          :title="item.title"
          density="comfortable"
        />

        <v-divider class="my-2" />

        <!-- Mobile Queue Status -->
        <v-list-item v-if="queueStatus.in_queue">
          <template v-slot:prepend>
            <v-badge
              :content="queueStatus.queue_number"
              color="warning"
              inline
            >
              <v-icon color="warning">mdi-format-list-numbered</v-icon>
            </v-badge>
          </template>
          <v-list-item-title>Queue #{{ queueStatus.queue_number }}</v-list-item-title>
          <v-list-item-subtitle v-if="queueStatus.estimated_wait_minutes">
            {{ queueStatus.estimated_wait_minutes }} min wait
          </v-list-item-subtitle>
        </v-list-item>

        <!-- Mobile Profile Info -->
        <v-list-item>
          <template v-slot:prepend>
            <v-avatar size="32" color="primary">
              <span class="text-white text-caption font-weight-bold">{{ initials }}</span>
            </v-avatar>
          </template>
          <v-list-item-title class="text-body-2">{{ patientFullName }}</v-list-item-title>
          <v-list-item-subtitle class="text-caption">ID: {{ patientId }}</v-list-item-subtitle>
        </v-list-item>

        <v-list-item @click="logout" prepend-icon="mdi-logout" title="Logout" color="error" />
      </v-list>
    </v-navigation-drawer>

    <!-- Queue Details Card (floating) - Responsive -->
    <v-sheet
      v-if="showQueueDetails && queueStatus.in_queue"
      class="queue-details-card"
      color="white"
      elevation="4"
      rounded="lg"
    >
      <v-card-text class="pa-3 pa-sm-4">
        <div class="d-flex align-center mb-2">
          <v-icon color="primary" size="small" class="mr-1">mdi-information</v-icon>
          <span class="font-weight-medium text-body-2">Your Queue Status</span>
          <v-spacer />
          <v-btn icon variant="text" size="x-small" @click="showQueueDetails = false">
            <v-icon size="small">mdi-close</v-icon>
          </v-btn>
        </div>
        
        <v-divider class="mb-2" />
        
        <div class="d-flex justify-space-between align-center mb-1">
          <span class="text-caption text-medium-emphasis">Queue Number:</span>
          <span class="text-subtitle-1 font-weight-bold text-primary">
            #{{ queueStatus.queue_number }}
          </span>
        </div>
        
        <div class="d-flex justify-space-between align-center mb-1">
          <span class="text-caption text-medium-emphasis">Patients Ahead:</span>
          <span class="text-body-2 font-weight-medium">{{ queueStatus.patients_ahead || 0 }}</span>
        </div>
        
        <div class="d-flex justify-space-between align-center mb-1">
          <span class="text-caption text-medium-emphasis">Est. Wait Time:</span>
          <span class="text-body-2 font-weight-medium">{{ queueStatus.estimated_wait_minutes || 'N/A' }} min</span>
        </div>
        
        <div class="d-flex justify-space-between align-center">
          <span class="text-caption text-medium-emphasis">Status:</span>
          <v-chip
            :color="getQueueStatusColor(queueStatus.status)"
            size="x-small"
            class="font-weight-medium"
          >
            {{ queueStatus.status }}
          </v-chip>
        </div>
      </v-card-text>
    </v-sheet>

    <!-- Main content - Fixed padding to account for header -->
    <v-main class="bg-grey-lighten-4" :style="{ paddingTop: '80px' }">
      <!-- Loading overlay for initial load -->
      <v-overlay
        v-model="loading.initial"
        class="align-center justify-center"
        persistent
        scrim="white"
      >
        <v-progress-circular
          color="primary"
          indeterminate
          size="48"
        />
      </v-overlay>

      <!-- Page Content - Responsive padding -->
      <v-container class="py-2 py-sm-4 px-2 px-sm-4" fluid>
        <router-view />
      </v-container>
    </v-main>

    <!-- Emergency Contact Fab - Responsive -->
    <v-btn
      color="error"
      icon="mdi-alert-circle"
      class="emergency-fab"
      size="large"
      @click="showEmergencyDialog = true"
      fab
    />

    <!-- Emergency Contact Dialog -->
    <v-dialog v-model="showEmergencyDialog" max-width="400">
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center bg-error text-white py-2">
          <span class="text-subtitle-1">Emergency Contact</span>
          <v-btn icon dark size="small" @click="showEmergencyDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text class="pa-3">
          <div class="text-center mb-3">
            <v-icon color="error" size="48" class="mb-1">mdi-alert-circle</v-icon>
            <div class="text-subtitle-1">Need Immediate Assistance?</div>
            <div class="text-caption text-medium-emphasis">
              Contact your healthcare provider or emergency services
            </div>
          </div>

          <v-list density="compact">
            <v-list-item>
              <template v-slot:prepend>
                <v-avatar color="error" size="32">
                  <v-icon color="white" size="16">mdi-phone</v-icon>
                </v-avatar>
              </template>
              <v-list-item-title class="text-body-2">Emergency Hotline</v-list-item-title>
              <v-list-item-subtitle class="text-caption">1-800-HELP-NOW</v-list-item-subtitle>
              <template v-slot:append>
                <v-btn color="error" variant="text" icon="mdi-phone" size="small" href="tel:1-800-HELP-NOW" />
              </template>
            </v-list-item>

            <v-list-item>
              <template v-slot:prepend>
                <v-avatar color="primary" size="32">
                  <v-icon color="white" size="16">mdi-hospital-building</v-icon>
                </v-avatar>
              </template>
              <v-list-item-title class="text-body-2">Your Clinic</v-list-item-title>
              <v-list-item-subtitle class="text-caption">{{ clinicContact || '(555) 123-4567' }}</v-list-item-subtitle>
              <template v-slot:append>
                <v-btn color="primary" variant="text" icon="mdi-phone" size="small" :href="`tel:${clinicContact || '5551234567'}`" />
              </template>
            </v-list-item>
          </v-list>

          <v-alert
            type="warning"
            variant="tonal"
            class="mt-3 text-caption"
            density="compact"
          >
            <strong>For life-threatening emergencies, call 911 immediately</strong>
          </v-alert>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { queueApi, appointmentsApi } from '@/api'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const { user, isAuthenticated } = storeToRefs(authStore)

// State
const mobileDrawer = ref(false)
const showEmergencyDialog = ref(false)
const showQueueDetails = ref(false)
const notifications = ref([])
const nextAppointment = ref(null)
const clinicContact = ref('(555) 123-4567') // This could come from settings API
const queueStatus = ref({
  in_queue: false,
  queue_number: null,
  status: null,
  patients_ahead: 0,
  estimated_wait_minutes: null
})

const loading = ref({
  initial: true,
  notifications: false,
  queue: false
})

// Computed patient info from auth store
const patientInfo = computed(() => user.value?.patient || null)
const patientId = computed(() => patientInfo.value?.patient_id || '')
const patientFullName = computed(() => {
  const p = patientInfo.value
  if (!p) return 'Patient'
  
  const parts = [
    p.first_name,
    p.middle_name,
    p.last_name
  ].filter(Boolean)
  
  return parts.join(' ') || 'Patient'
})

const patientShortName = computed(() => {
  const p = patientInfo.value
  if (!p || !p.first_name) return 'Patient'
  
  if (p.first_name && p.last_name) {
    return `${p.first_name} ${p.last_name.charAt(0)}.`
  }
  return p.first_name || 'Patient'
})

const initials = computed(() => {
  const p = patientInfo.value
  if (!p || !p.first_name) return 'PT'
  
  const first = p.first_name?.charAt(0) || ''
  const last = p.last_name?.charAt(0) || ''
  return (first + last).toUpperCase() || 'PT'
})

const unreadCount = computed(() => {
  return notifications.value.filter(n => !n.read).length
})

// Navigation items
const navItems = ref([
  {
    title: 'Dashboard',
    route: '/patient/dashboard',
    icon: 'mdi-view-dashboard'
  },
  {
    title: 'Appointments',
    route: '/patient/appointments',
    icon: 'mdi-calendar'
  },
  {
    title: 'Test Results',
    route: '/patient/lab-results',
    icon: 'mdi-flask'
  },
  {
    title: 'Prescriptions',
    route: '/patient/prescriptions',
    icon: 'mdi-pill'
  }
])

// Methods
async function loadInitialData() {
  try {
    loading.value.initial = true
    
    // Check authentication
    if (!isAuthenticated.value) {
      await router.push('/login')
      return
    }
    
    // Load data in parallel
    await Promise.allSettled([
      loadNotifications(),
      checkQueueStatus(),
      getNextAppointment()
    ])
  } catch (error) {
    console.error('Failed to load initial data:', error)
  } finally {
    loading.value.initial = false
  }
}

async function loadNotifications() {
  loading.value.notifications = true
  try {
    // TODO: Replace with actual notifications endpoint
    // Using mock data for now
    notifications.value = [
      {
        id: 1,
        type: 'appointment',
        title: 'Upcoming Appointment',
        message: 'You have an appointment tomorrow at 10:00 AM',
        created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
        read: false,
        data: { appointment_id: 123 }
      },
      {
        id: 2,
        type: 'lab_result',
        title: 'New Lab Results',
        message: 'Your lab results are now available',
        created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
        read: true,
        data: { result_id: 456 }
      }
    ]
  } catch (error) {
    console.error('Failed to load notifications:', error)
  } finally {
    loading.value.notifications = false
  }
}

async function checkQueueStatus() {
  if (!patientId.value) return
  
  loading.value.queue = true
  try {
    const response = await queueApi.getPatientQueue(patientId.value)
    if (response.data.in_queue) {
      queueStatus.value = {
        in_queue: true,
        queue_number: response.data.queue_number,
        status: response.data.status,
        patients_ahead: response.data.patients_ahead,
        estimated_wait_minutes: response.data.estimated_wait_minutes
      }
      
      // Auto-show queue details if waiting
      if (response.data.status === 'WAITING') {
        showQueueDetails.value = true
      }
    } else {
      queueStatus.value = { in_queue: false }
    }
  } catch (error) {
    console.error('Failed to check queue status:', error)
  } finally {
    loading.value.queue = false
  }
}

async function getNextAppointment() {
  if (!patientId.value) return
  
  try {
    const response = await appointmentsApi.getNextPatientAppointment(patientId.value)
    if (response.data.id) {
      nextAppointment.value = response.data
    }
  } catch (error) {
    console.error('Failed to get next appointment:', error)
  }
}

// Notification helpers
function getNotificationColor(type) {
  const colors = {
    appointment: 'primary',
    lab_result: 'success',
    prescription: 'info',
    message: 'secondary',
    emergency: 'error',
    system: 'grey'
  }
  return colors[type] || 'grey'
}

function getNotificationIcon(type) {
  const icons = {
    appointment: 'mdi-calendar',
    lab_result: 'mdi-flask',
    prescription: 'mdi-pill',
    message: 'mdi-message',
    emergency: 'mdi-alert',
    system: 'mdi-information'
  }
  return icons[type] || 'mdi-bell'
}

function getQueueStatusColor(status) {
  const colors = {
    WAITING: 'warning',
    CALLED: 'info',
    SERVING: 'primary',
    COMPLETED: 'success',
    SKIPPED: 'grey'
  }
  return colors[status] || 'grey'
}

function formatTimeAgo(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diffSeconds = Math.floor((now - date) / 1000)
  
  if (diffSeconds < 60) return 'now'
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m`
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h`
  if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function handleNotificationClick(notification) {
  // Mark as read
  if (!notification.read) {
    markAsRead(notification.id)
  }
  
  // Navigate based on notification type
  if (notification.data) {
    if (notification.type === 'appointment' && notification.data.appointment_id) {
      router.push(`/patient/appointments/${notification.data.appointment_id}`)
    } else if (notification.type === 'lab_result' && notification.data.result_id) {
      router.push(`/patient/lab-results/${notification.data.result_id}`)
    }
  }
}

async function markAsRead(notificationId) {
  const notification = notifications.value.find(n => n.id === notificationId)
  if (notification) {
    notification.read = true
    // TODO: Call API to mark as read
  }
}

async function markAllAsRead() {
  notifications.value.forEach(n => n.read = true)
  // TODO: Call API to mark all as read
}

function logout() {
  authStore.logout()
}

// Auto-refresh queue status
let queueInterval
function startQueuePolling() {
  if (queueInterval) clearInterval(queueInterval)
  
  queueInterval = setInterval(() => {
    if (queueStatus.value.in_queue) {
      checkQueueStatus()
    }
  }, 30000)
}

// Lifecycle
onMounted(async () => {
  await loadInitialData()
  startQueuePolling()
})

onBeforeUnmount(() => {
  if (queueInterval) clearInterval(queueInterval)
})
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}

.gap-2 {
  gap: 8px;
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

.queue-details-card {
  position: fixed;
  top: 80px;
  right: 16px;
  width: 280px;
  z-index: 1000;
  animation: slideIn 0.3s ease;
}

.emergency-fab {
  position: fixed;
  bottom: 16px;
  right: 16px;
  z-index: 1000;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Mobile adjustments */
@media (max-width: 600px) {
  .queue-details-card {
    top: auto;
    bottom: 80px;
    right: 16px;
    left: 16px;
    width: auto;
  }
  
  .emergency-fab {
    bottom: 16px;
    right: 16px;
  }
}

/* Notification list styling */
:deep(.v-list-item) {
  cursor: pointer;
  transition: background-color 0.2s;
  min-height: 56px;
}

:deep(.v-list-item:hover) {
  background-color: rgba(0, 0, 0, 0.04);
}

/* Custom scrollbar */
:deep(.v-card-text::-webkit-scrollbar) {
  width: 4px;
}

:deep(.v-card-text::-webkit-scrollbar-track) {
  background: transparent;
}

:deep(.v-card-text::-webkit-scrollbar-thumb) {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 2px;
}
</style>