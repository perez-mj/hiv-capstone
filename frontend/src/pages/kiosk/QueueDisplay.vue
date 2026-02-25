<template>
  <v-app :style="{ background: 'linear-gradient(135deg, ' + colors.primary + ' 0%, ' + colors.primaryDark + ' 100%)' }">
    <!-- Connection Status Bar - Always on top with high z-index -->
    <v-snackbar
      v-model="showConnectionStatus"
      :color="connectionColor"
      location="top"
      :timeout="-1"
      class="connection-snackbar"
      :style="{ 'z-index': 2000 }"
    >
      <div class="d-flex align-center justify-space-between w-100">
        <div class="d-flex align-center">
          <v-icon :icon="connectionIcon" class="mr-2" />
          <span>{{ connectionMessage }}</span>
        </div>
        <div class="d-flex align-center">
          <v-chip
            v-if="!isAuthorized && isOnline && isRegistered"
            color="warning"
            size="small"
            class="ml-2"
          >
            Pending Authorization
          </v-chip>
          <v-chip
            v-if="isRegistered && !isAuthorized"
            variant="outlined"
            size="small"
            class="ml-2"
            color="white"
          >
            ID: {{ deviceId }}
          </v-chip>
          <v-btn
            v-if="!isOnline"
            color="white"
            variant="text"
            size="small"
            @click="initializeKiosk"
            :loading="isLoading"
            class="ml-2"
          >
            Retry
          </v-btn>
        </div>
      </div>
    </v-snackbar>

    <!-- Loading Overlay - Lower z-index so it doesn't block the snackbar -->
    <v-overlay 
      v-model="isLoading" 
      class="align-center justify-center" 
      persistent
      :style="{ 'z-index': 1000 }"
    >
      <v-progress-circular
        indeterminate
        size="64"
        color="white"
      ></v-progress-circular>
      <div class="text-white mt-4 text-h6">{{ loadingMessage }}</div>
    </v-overlay>

    <!-- Main Content Area -->
    <div v-if="!isLoading || isAuthorized || isRegistered">
      <!-- Main Display (Authorized) -->
      <v-container v-if="isAuthorized" fluid class="kiosk-content pa-6">
        <!-- Header -->
        <v-row class="mb-8">
          <v-col>
            <v-card class="header-card" elevation="4">
              <v-card-text class="d-flex justify-space-between align-center">
                <h1 class="text-h4 font-weight-bold" style="color: rgb(var(--v-theme-primary))">
                  Queue Management System
                </h1>
                <div class="text-right">
                  <div class="text-h3 font-weight-bold">{{ currentTime }}</div>
                  <div class="text-subtitle-1 text-medium-emphasis">{{ currentDate }}</div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Currently Serving Section -->
        <v-row class="mb-8">
          <v-col>
            <h2 class="text-h5 text-white mb-4">Now Serving</h2>
            <v-card
              class="serving-card mx-auto"
              elevation="8"
              :class="{ 'empty': !currentServing }"
            >
              <v-card-text v-if="currentServing" class="text-center">
                <div class="text-h1 font-weight-bold" style="color: rgb(var(--v-theme-primary))">
                  {{ currentServing.queue_number }}
                </div>
                <div class="text-h5 mt-2 text-medium-emphasis">{{ currentServing.window }}</div>
              </v-card-text>
              <v-card-text v-else class="text-center">
                <v-icon size="64" color="grey-lighten-1" class="mb-2">mdi-clock-outline</v-icon>
                <div class="text-h6 text-grey">No patient currently being served</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Waiting List Section -->
        <v-row>
          <v-col>
            <h2 class="text-h5 text-white mb-4">Waiting Queue</h2>
            <v-card class="waiting-card" elevation="4">
              <v-card-text>
                <v-row v-if="waitingList.length > 0">
                  <v-col
                    v-for="(item, index) in waitingList"
                    :key="item.queue_number"
                    cols="12" sm="6" md="4" lg="3"
                  >
                    <v-card
                      :class="['queue-item', { 'next-item': index === 0 }]"
                      :elevation="index === 0 ? 8 : 2"
                    >
                      <v-card-text class="d-flex align-center justify-space-between">
                        <v-avatar :color="index === 0 ? 'success' : 'primary'" size="32">
                          <span class="text-white font-weight-bold">{{ index + 1 }}</span>
                        </v-avatar>
                        <span class="text-h6 font-weight-bold">{{ item.queue_number }}</span>
                        <span class="text-caption text-medium-emphasis">{{ item.time }}</span>
                      </v-card-text>
                    </v-card>
                  </v-col>
                </v-row>
                
                <!-- Empty State -->
                <v-empty-state
                  v-else
                  icon="mdi-format-list-numbered"
                  title="Queue is Empty"
                  text="No patients in queue"
                ></v-empty-state>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Footer -->
        <v-footer class="justify-center mt-8 bg-transparent text-white">
          <div class="text-center">
            <p class="text-subtitle-1">Please wait for your number to be called</p>
            <p class="text-caption">Last updated: {{ lastUpdated }}</p>
          </div>
        </v-footer>
      </v-container>

      <!-- Unauthorized but Registered -->
      <v-container v-else-if="isRegistered" fluid class="fill-height">
        <v-row align="center" justify="center">
          <v-col cols="12" sm="8" md="6" lg="4">
            <v-card class="message-card" elevation="8">
              <v-card-text class="text-center">
                <v-icon size="64" color="warning" class="mb-4">mdi-timer-sand</v-icon>
                <h2 class="text-h4 mb-2">Device Pending Authorization</h2>
                <p class="text-body-1 mb-4 text-medium-emphasis">
                  This kiosk device has been registered and is waiting for administrator approval.
                </p>
                <v-chip class="mb-2" variant="outlined">Device ID: {{ deviceId }}</v-chip>
                <p class="text-caption text-medium-emphasis mt-4">
                  Please contact the system administrator to authorize this device.
                </p>
                
                <div class="mt-6">
                  <span class="text-caption">Checking for authorization every 10 seconds...</span>
                  <v-progress-linear
                    indeterminate
                    color="primary"
                    class="mt-2"
                  ></v-progress-linear>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>

      <!-- Not Registered / Initial State -->
      <v-container v-else fluid class="fill-height">
        <v-row align="center" justify="center">
          <v-col cols="12" sm="8" md="6" lg="4">
            <v-card class="message-card" elevation="8">
              <v-card-text class="text-center">
                <v-icon size="64" color="info" class="mb-4">mdi-information</v-icon>
                <h2 class="text-h4 mb-2">Initializing Kiosk</h2>
                <p class="text-body-1 mb-6 text-medium-emphasis">
                  Setting up kiosk device...
                </p>
                
                <v-progress-linear
                  indeterminate
                  color="primary"
                  class="mt-2"
                ></v-progress-linear>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </div>
  </v-app>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { kioskApi } from '@/api'
import colors from '@/config/colors'

const route = useRoute()
const deviceId = ref(route.query.device || '')
const isRegistered = ref(false)
const isAuthorized = ref(false)
const isOnline = ref(true)
const isLoading = ref(true)
const loadingMessage = ref('Initializing kiosk...')
const errorMessage = ref('')
const currentServing = ref(null)
const waitingList = ref([])
const lastUpdated = ref('')
const showConnectionStatus = ref(true)

// Computed properties for connection status
const connectionColor = computed(() => {
  if (!isOnline.value) return 'error'
  if (!isAuthorized.value && isRegistered.value) return 'warning'
  if (isAuthorized.value) return 'success'
  return 'info'
})

const connectionIcon = computed(() => {
  if (!isOnline.value) return 'mdi-wifi-off'
  if (!isAuthorized.value && isRegistered.value) return 'mdi-timer-sand'
  if (isAuthorized.value) return 'mdi-check-circle'
  return 'mdi-information'
})

const connectionMessage = computed(() => {
  if (!isOnline.value) return 'Connection lost - Attempting to reconnect...'
  if (!isAuthorized.value && isRegistered.value) return 'Waiting for authorization'
  if (isAuthorized.value) return 'Connected'
  return 'Initializing...'
})

// Time and date
const currentTime = ref('')
const currentDate = ref('')
let timeInterval = null
let queueInterval = null
let authCheckInterval = null
let reconnectInterval = null
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 5

// Initialize kiosk on mount
onMounted(async () => {
  await initializeKiosk()
  startTimeUpdates()
})

onUnmounted(() => {
  clearInterval(timeInterval)
  clearInterval(queueInterval)
  clearInterval(authCheckInterval)
  clearInterval(reconnectInterval)
})

// Main initialization function
const initializeKiosk = async () => {
  isLoading.value = true
  errorMessage.value = ''
  
  // Generate device ID if not provided
  if (!deviceId.value) {
    deviceId.value = generateDeviceId()
    // Update URL without reload
    const url = new URL(window.location)
    url.searchParams.set('device', deviceId.value)
    window.history.replaceState({}, '', url)
  }
  
  loadingMessage.value = 'Registering device...'
  await checkDeviceStatus()
}

// Check if device is registered and authorized
const checkDeviceStatus = async () => {
  try {
    console.log('🔍 Checking device status for:', deviceId.value)
    
    const response = await kioskApi.checkStatus(deviceId.value)
    console.log('📡 Status response:', response.data)
    
    isRegistered.value = true
    isAuthorized.value = response.data.authorized
    isOnline.value = true
    reconnectAttempts = 0
    
    // Clear any existing intervals
    clearInterval(queueInterval)
    clearInterval(authCheckInterval)
    clearInterval(reconnectInterval)
    
    if (isAuthorized.value) {
      // Start fetching queue data if authorized
      loadingMessage.value = 'Loading queue data...'
      await fetchQueueData()
      startQueueUpdates()
      
      // Keep loading false for a moment to show the content
      setTimeout(() => {
        isLoading.value = false
      }, 500)
    } else {
      // Check for authorization status every 10 seconds
      startAuthCheck()
      setTimeout(() => {
        isLoading.value = false
      }, 500)
    }
    
  } catch (error) {
    console.error('❌ Status check failed:', error)
    
    // Check if it's a network error vs server error
    if (error.message.includes('Network Error') || !navigator.onLine) {
      isOnline.value = false
      isRegistered.value = false
      isAuthorized.value = false
      handleReconnect()
    } else {
      // Server responded with an error but we're online
      isOnline.value = true
      isRegistered.value = false
      isAuthorized.value = false
      errorMessage.value = error.response?.data?.error || 'Server error occurred'
    }
    
    setTimeout(() => {
      isLoading.value = false
    }, 500)
  }
}

// Check authorization status periodically
const startAuthCheck = () => {
  authCheckInterval = setInterval(async () => {
    if (!isAuthorized.value && isOnline.value) {
      try {
        console.log('⏳ Checking authorization status...')
        const response = await kioskApi.checkStatus(deviceId.value)
        
        if (response.data.authorized) {
          console.log('✅ Device authorized!')
          isAuthorized.value = true
          clearInterval(authCheckInterval)
          
          // Start queue updates
          await fetchQueueData()
          startQueueUpdates()
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        // Don't set offline for auth check failures
        if (error.message.includes('Network Error')) {
          isOnline.value = false
        }
      }
    }
  }, 10000) // Check every 10 seconds
}

// Fetch queue data
const fetchQueueData = async () => {
  if (!isAuthorized.value) return
  
  try {
    console.log('🔄 Fetching queue data...')
    const response = await kioskApi.getQueueData(deviceId.value)
    currentServing.value = response.data.currentServing
    waitingList.value = response.data.waitingList
    lastUpdated.value = new Date().toLocaleTimeString()
    isOnline.value = true
  } catch (error) {
    console.error('Queue data fetch failed:', error)
    
    if (error.response?.status === 403) {
      isAuthorized.value = false
      startAuthCheck()
    } else if (error.message.includes('Network Error')) {
      isOnline.value = false
    }
    // Don't set isOnline to false for other errors
  }
}

// Start queue updates (every 5 seconds)
const startQueueUpdates = () => {
  fetchQueueData()
  queueInterval = setInterval(fetchQueueData, 5000)
}

// Reconnection logic
const handleReconnect = () => {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    return
  }
  
  reconnectAttempts++
  setTimeout(async () => {
    console.log(`🔄 Reconnection attempt ${reconnectAttempts}...`)
    await checkDeviceStatus()
  }, 5000 * reconnectAttempts) // Exponential backoff
}

// Time updates
const startTimeUpdates = () => {
  updateDateTime()
  timeInterval = setInterval(updateDateTime, 1000)
}

const updateDateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  })
  currentDate.value = now.toLocaleDateString('en-US', { 
    weekday: 'long',
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
}

// Generate a device ID if not provided
const generateDeviceId = () => {
  const array = new Uint8Array(4)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('').substring(0, 8)
}

// Handle online/offline events
window.addEventListener('online', () => {
  console.log('📶 Network connection restored')
  isOnline.value = true
  checkDeviceStatus()
})

window.addEventListener('offline', () => {
  console.log('📶 Network connection lost')
  isOnline.value = false
})
</script>

<style scoped>
.connection-snackbar :deep(.v-snackbar__wrapper) {
  min-width: 100%;
  border-radius: 0;
  position: fixed;
  top: 0;
  z-index: 2000 !important;
}

.serving-card {
  max-width: 400px;
  transition: all 0.3s ease;
}

.serving-card.empty {
  opacity: 0.8;
}

.queue-item {
  transition: transform 0.2s ease;
}

.queue-item:hover {
  transform: translateY(-2px);
}

.next-item {
  border: 2px solid rgb(var(--v-theme-success));
}

.message-card {
  backdrop-filter: blur(10px);
  background-color: rgba(255, 255, 255, 0.9);
}

:deep(.v-empty-state) {
  padding: 32px 0;
}

:deep(.v-overlay__content) {
  z-index: 1000 !important;
}
</style>