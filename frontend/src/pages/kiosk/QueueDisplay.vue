<template>
  <v-app>
    <!-- Connection Status Bar -->
    <v-system-bar
      v-if="!isOnline || !isAuthorized"
      :color="connectionColor"
      theme="dark"
      class="justify-center px-4"
      height="30"
    >
      <v-icon :icon="connectionIcon" size="small" class="mr-2" />
      <span class="text-caption font-weight-medium">{{ connectionMessage }}</span>
      <v-spacer />
      <span class="text-caption opacity-70">ID: {{ deviceIdShort }}</span>
    </v-system-bar>

    <!-- Loading Overlay -->
    <v-overlay v-model="isLoading" class="align-center justify-center" persistent>
      <div class="text-center">
        <v-progress-circular indeterminate size="64" width="6" color="primary" />
        <div class="text-primary mt-6 text-h5 font-weight-light">{{ loadingMessage }}</div>
        <div v-if="errorMessage" class="text-error mt-4">{{ errorMessage }}</div>
      </div>
    </v-overlay>

    <!-- Main Content -->
    <v-main v-if="!isLoading" class="kiosk-main">
      <v-container fluid class="fill-height pa-2 pa-md-4">
        
        <!-- Authorized View - Queue Display -->
        <v-row v-if="isAuthorized" justify="center" class="fill-height">
          <v-col cols="12" xl="10" class="d-flex flex-column">
            <!-- Header -->
            <header class="d-flex flex-column flex-sm-row justify-space-between align-start align-sm-end mb-4">
              <div class="brand-section">
                <h1 class="text-h4 text-md-h3 font-weight-black mb-1 text-primary">QUEUE DISPLAY</h1>
                <div class="d-flex align-center opacity-80 text-medium-emphasis">
                  <v-icon icon="mdi-hospital-building" size="small" class="mr-1" />
                  <span class="text-subtitle-1">HIV Care Facility</span>
                </div>
              </div>
              <div class="text-right mt-2 mt-sm-0">
                <div class="text-h4 text-md-h3 font-weight-light mb-0 text-primary">{{ currentTime }}</div>
                <div class="text-subtitle-2 text-medium-emphasis">{{ currentDate }}</div>
              </div>
            </header>

            <!-- Currently Serving Banner -->
            <v-row class="mb-4">
              <v-col cols="12">
                <v-card class="serving-banner" elevation="4">
                  <v-card-text class="pa-4">
                    <div class="d-flex align-center flex-wrap">
                      <div class="serving-label mr-4">NOW SERVING</div>
                      <div class="serving-numbers d-flex flex-wrap">
                        <template v-if="currentServing.length > 0">
                          <div
                            v-for="(serving, index) in currentServing"
                            :key="index"
                            class="serving-item mr-4"
                          >
                            <span 
                              class="serving-badge"
                              :style="{ backgroundColor: getTypeColor(serving.appointment_type) }"
                            >
                              {{ serving.queue_number }}
                            </span>
                            <span class="serving-type ml-2">{{ serving.appointment_type || 'Consultation' }}</span>
                          </div>
                        </template>
                        <span v-else class="text-h6 text-medium-emphasis">No patients currently being served</span>
                      </div>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>

            <!-- Queue by Type - Main Display -->
            <v-row>
              <v-col
                v-for="(group, index) in waitingByType"
                :key="index"
                cols="12"
                sm="6"
                md="3"
                class="py-2"
              >
                <v-card class="type-card" elevation="3">
                  <v-card-item class="pa-3">
                    <!-- Type Header -->
                    <div class="type-header mb-3">
                      <div class="d-flex align-center">
                        <div 
                          class="type-indicator mr-2"
                          :style="{ backgroundColor: getTypeColor(group.type) }"
                        ></div>
                        <span class="text-h6 font-weight-bold">{{ group.type }}</span>
                      </div>
                      <div class="type-stats mt-1">
                        <span class="text-h5 font-weight-bold">{{ group.count }}</span>
                        <span class="text-caption text-medium-emphasis ml-1">waiting</span>
                      </div>
                    </div>

                    <!-- Next Up -->
                    <div class="next-up-section mb-3">
                      <div class="text-caption text-medium-emphasis text-uppercase">Next Up</div>
                      <div class="d-flex align-center">
                        <div 
                          class="next-badge"
                          :style="{ backgroundColor: getTypeColor(group.type) }"
                        >
                          {{ group.next_number }}
                        </div>
                        <div class="ml-2">
                          <div class="text-caption font-weight-bold">{{ formatTime(group.oldest_waiting) }}</div>
                        </div>
                      </div>
                    </div>

                    <!-- Queue List -->
                    <div class="queue-list">
                      <div
                        v-for="(patient, idx) in group.patients.slice(0, 3)"
                        :key="patient.queue_number"
                        class="queue-item d-flex align-center justify-space-between"
                      >
                        <div class="d-flex align-center">
                          <span class="queue-number mr-2">{{ patient.queue_number }}</span>
                          <span class="text-caption">{{ patient.patient }}</span>
                        </div>
                        <span class="text-caption text-medium-emphasis">{{ patient.time }}</span>
                      </div>
                      
                      <div v-if="group.count > 3" class="text-caption text-medium-emphasis text-center mt-2">
                        +{{ group.count - 3 }} more
                      </div>
                    </div>

                    <!-- Wait Time Info -->
                    <div class="wait-time mt-3 pt-2">
                      <v-icon size="x-small" color="medium-emphasis" class="mr-1">mdi-clock-outline</v-icon>
                      <span class="text-caption text-medium-emphasis">
                        Est. wait: ~{{ waitTimes[group.type]?.wait || 15 }} min
                      </span>
                    </div>
                  </v-card-item>
                </v-card>
              </v-col>
            </v-row>

            <!-- Quick Stats Bar -->
            <v-row class="mt-4">
              <v-col cols="12">
                <v-card class="stats-bar" elevation="2">
                  <v-card-text class="d-flex justify-space-around pa-3">
                    <div class="stat-item">
                      <span class="stat-value">{{ stats.total_in_queue || 0 }}</span>
                      <span class="stat-label">Total</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-value text-primary">{{ stats.waiting_count || 0 }}</span>
                      <span class="stat-label">Waiting</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-value text-success">{{ stats.serving_count || 0 }}</span>
                      <span class="stat-label">Serving</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-value">{{ estimatedTotalWait }}</span>
                      <span class="stat-label">Est. Min</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-value text-caption">{{ lastUpdated }}</span>
                      <span class="stat-label">Updated</span>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-col>
        </v-row>

        <!-- Unauthorized View -->
        <v-row v-else align="center" justify="center" class="fill-height">
          <v-col cols="12" sm="8" md="6" lg="4">
            <v-card class="auth-card text-center pa-6" elevation="6">
              <v-icon size="64" :color="isRegistered ? 'warning' : 'primary'" class="mb-4">
                {{ isRegistered ? 'mdi-shield-lock-outline' : 'mdi-cog-sync' }}
              </v-icon>
              
              <h2 class="text-h5 font-weight-bold mb-3">
                {{ isRegistered ? 'Authorization Required' : 'Initializing Device' }}
              </h2>
              
              <p class="text-body-2 text-medium-emphasis mb-4">
                {{ statusMessage }}
              </p>
              
              <v-chip variant="outlined" label class="mb-4" size="small">
                DEVICE ID: {{ deviceIdShort }}
              </v-chip>
              
              <v-alert
                v-if="errorMessage"
                type="error"
                variant="tonal"
                class="mb-4"
                density="compact"
              >
                {{ errorMessage }}
              </v-alert>
              
              <v-progress-linear
                v-if="!errorMessage"
                indeterminate
                :color="isRegistered ? 'warning' : 'primary'"
                rounded
                height="4"
              />
              
              <v-btn
                v-if="errorMessage"
                color="primary"
                variant="tonal"
                size="small"
                class="mt-4"
                @click="retryConnection"
                prepend-icon="mdi-refresh"
              >
                Retry Connection
              </v-btn>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { kioskApi } from '@/api'

const route = useRoute()
const deviceId = ref(route.query.device || '')
const isRegistered = ref(false)
const isAuthorized = ref(false)
const isOnline = ref(true)
const isLoading = ref(true)
const loadingMessage = ref('Initializing kiosk...')
const errorMessage = ref('')
const currentServing = ref([])
const waitingByType = ref([])
const waitingList = ref([])
const stats = ref({ waiting_count: 0, serving_count: 0, total_in_queue: 0 })
const waitTimes = ref({})
const lastUpdated = ref('')
const reconnectAttempts = ref(0)
const MAX_RECONNECT_ATTEMPTS = 5

// Time and date
const currentTime = ref('')
const currentDate = ref('')
let timeInterval = null
let queueInterval = null
let authCheckInterval = null

// Colors for different appointment types using theme colors
const getTypeColor = (type) => {
  const colors = {
    'Consultation': 'var(--color-primary)',
    'Testing': 'var(--color-success)',
    'Refill': 'var(--color-warning)',
    'Others': 'var(--color-accent)',
    'Other': 'var(--color-accent)'
  }
  return colors[type] || 'var(--color-secondary)'
}

// Format time
const formatTime = (timestamp) => {
  if (!timestamp) return '--:--'
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

// Computed properties
const deviceIdShort = computed(() => {
  if (!deviceId.value) return ''
  return deviceId.value.length > 8 ? deviceId.value.substring(0, 8) + '...' : deviceId.value
})

const statusMessage = computed(() => {
  if (!isOnline.value) return 'Connection lost. Attempting to reconnect...'
  if (errorMessage.value) return errorMessage.value
  if (!isRegistered.value) return 'Registering device with server...'
  if (!isAuthorized.value) return 'Waiting for administrator approval. Please contact IT support.'
  return 'Connected and authorized'
})

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
  if (!isOnline.value) return 'Connection lost - Reconnecting...'
  if (!isAuthorized.value && isRegistered.value) return 'Waiting for authorization'
  if (isAuthorized.value) return 'Connected'
  return 'Initializing...'
})

const estimatedTotalWait = computed(() => {
  return (stats.value.waiting_count || 0) * 15
})

// Lifecycle hooks
onMounted(async () => {
  await initializeKiosk()
  startTimeUpdates()
  
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
})

onUnmounted(() => {
  clearInterval(timeInterval)
  clearInterval(queueInterval)
  clearInterval(authCheckInterval)
  
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOffline)
})

// Methods
const handleOnline = () => {
  console.log('📶 Network connection restored')
  isOnline.value = true
  errorMessage.value = ''
  reconnectAttempts.value = 0
  checkDeviceStatus()
}

const handleOffline = () => {
  console.log('📶 Network connection lost')
  isOnline.value = false
  clearInterval(queueInterval)
  clearInterval(authCheckInterval)
}

const initializeKiosk = async () => {
  isLoading.value = true
  errorMessage.value = ''
  
  if (!deviceId.value) {
    deviceId.value = generateDeviceId()
    const url = new URL(window.location)
    url.searchParams.set('device', deviceId.value)
    window.history.replaceState({}, '', url)
  }
  
  loadingMessage.value = 'Registering device...'
  await checkDeviceStatus()
}

const checkDeviceStatus = async () => {
  try {
    console.log('🔍 Checking device status for:', deviceId.value)
    
    const response = await kioskApi.checkStatus(deviceId.value)
    console.log('📡 Status response:', response.data)
    
    isRegistered.value = true
    isAuthorized.value = response.data.authorized
    isOnline.value = true
    errorMessage.value = ''
    reconnectAttempts.value = 0
    
    clearInterval(queueInterval)
    clearInterval(authCheckInterval)
    
    if (isAuthorized.value) {
      loadingMessage.value = 'Loading queue data...'
      await fetchQueueData()
      startQueueUpdates()
      
      setTimeout(() => {
        isLoading.value = false
      }, 500)
    } else {
      startAuthCheck()
      setTimeout(() => {
        isLoading.value = false
      }, 500)
    }
    
  } catch (error) {
    console.error('❌ Status check failed:', error)
    
    if (error.message.includes('Network Error') || !navigator.onLine) {
      isOnline.value = false
      isRegistered.value = false
      isAuthorized.value = false
      handleReconnect()
    } else {
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

const startAuthCheck = () => {
  authCheckInterval = setInterval(async () => {
    if (!isAuthorized.value && isOnline.value) {
      try {
        const response = await kioskApi.checkStatus(deviceId.value)
        
        if (response.data.authorized) {
          console.log('✅ Device authorized!')
          isAuthorized.value = true
          clearInterval(authCheckInterval)
          
          await fetchQueueData()
          startQueueUpdates()
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        if (error.message.includes('Network Error')) {
          isOnline.value = false
        }
      }
    }
  }, 10000)
}

const fetchQueueData = async () => {
  if (!isAuthorized.value) return
  
  try {
    console.log('🔄 Fetching queue data...')
    const response = await kioskApi.getQueueData(deviceId.value)
    currentServing.value = response.data.currentServing || []
    waitingByType.value = response.data.waitingByType || []
    waitingList.value = response.data.waitingList || []
    stats.value = response.data.stats || { waiting_count: 0, serving_count: 0, total_in_queue: 0 }
    waitTimes.value = response.data.waitTimes || {}
    lastUpdated.value = new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    })
    isOnline.value = true
  } catch (error) {
    console.error('Queue data fetch failed:', error)
    
    if (error.response?.status === 403) {
      isAuthorized.value = false
      startAuthCheck()
    } else if (error.message.includes('Network Error')) {
      isOnline.value = false
    }
  }
}

const startQueueUpdates = () => {
  fetchQueueData()
  queueInterval = setInterval(fetchQueueData, 10000) // Update every 10 seconds
}

const handleReconnect = () => {
  if (reconnectAttempts.value >= MAX_RECONNECT_ATTEMPTS) {
    errorMessage.value = 'Unable to connect to server. Please check your network and refresh the page.'
    return
  }
  
  reconnectAttempts.value++
  setTimeout(async () => {
    console.log(`🔄 Reconnection attempt ${reconnectAttempts.value}...`)
    await checkDeviceStatus()
  }, 5000 * reconnectAttempts.value)
}

const retryConnection = () => {
  errorMessage.value = ''
  reconnectAttempts.value = 0
  initializeKiosk()
}

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

const generateDeviceId = () => {
  const array = new Uint8Array(4)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('').substring(0, 8)
}
</script>

<style scoped>
/* High-Visibility Forest Kiosk Palette
   Primary Dark: #0D261D (Deep Moss)
   Primary: #1A4D3A (Dark Forest)
   Accent: #2E7D32 (Success Green)
   Surface: #FFFFFF
*/

.kiosk-main {
  /* Dynamic forest background */
  background: radial-gradient(circle at top right, #1A4D3A 0%, #0D261D 100%);
  min-height: 100vh;
  overflow: hidden;
}

/* Header Text */
h1.text-primary {
  color: #FFFFFF !important; /* White text para lumutang sa dark background */
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

.brand-section .text-subtitle-1 {
  color: rgba(255, 255, 255, 0.7) !important;
}

header div.text-primary {
  color: #FFFFFF !important;
}

/* Serving Banner - Ang "Star" ng Display */
.serving-banner {
  background: rgba(255, 255, 255, 0.95) !important;
  border-radius: 24px !important;
  border-bottom: 8px solid #2E7D32; /* Success green accent */
  box-shadow: 0 20px 40px rgba(0,0,0,0.4) !important;
}

.serving-label {
  font-size: 2rem;
  font-weight: 900;
  color: #1A4D3A;
  letter-spacing: 3px;
  border-right: 3px solid rgba(26, 77, 58, 0.2);
  padding-right: 24px;
}

.serving-badge {
  min-width: 80px;
  height: 80px;
  background: #1A4D3A !important; /* Solid Forest Green */
  color: #FFFFFF !important;
  font-size: 3rem;
  font-weight: 900;
  border-radius: 16px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.2);
}

.serving-type {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1A4D3A;
  text-transform: uppercase;
}

/* Type Cards (Waiting Lists) */
.type-card {
  background: #FFFFFF !important;
  border-radius: 24px !important;
  border: 1px solid rgba(26, 77, 58, 0.1);
}

.type-header {
  border-bottom: 2px solid #F0F4F2;
}

.type-header .text-h6 {
  color: #1A4D3A;
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* Next Up Section - Focus on the next person */
.next-up-section {
  background: #F8FAF9; /* Minty White */
  border: 1px solid #1A4D3A;
  border-radius: 16px;
}

.next-badge {
  min-width: 50px;
  height: 50px;
  background: #1A4D3A !important;
  font-size: 1.5rem;
  box-shadow: 0 4px 8px rgba(26, 77, 58, 0.2);
}

/* Queue List Rows */
.queue-item {
  padding: 12px 8px;
  border-bottom: 1px solid #F0F4F2;
}

.queue-number {
  background: #E8F0ED !important;
  color: #1A4D3A !important;
  font-weight: 800 !important;
  padding: 4px 12px;
}

/* Stats Bar at the bottom */
.stats-bar {
  background: rgba(255, 255, 255, 0.1) !important;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px !important;
}

.stat-value {
  color: #FFFFFF !important;
  font-size: 1.8rem;
}

.stat-label {
  color: rgba(255, 255, 255, 0.8) !important;
  font-weight: 600;
}

/* Unauthorized/Loading View */
.auth-card {
  background: #FFFFFF !important;
  border-top: 10px solid #1A4D3A !important;
}

/* Animations for "New Call" visibility */
@keyframes flash {
  0% { background-color: #FFFFFF; }
  50% { background-color: #E8F5E9; }
  100% { background-color: #FFFFFF; }
}

.new-call {
  animation: flash 1s ease-in-out infinite;
}

/* Mobile Adjustments */
@media (max-width: 600px) {
  .serving-label {
    font-size: 1.2rem;
    border-right: none;
    border-bottom: 2px solid rgba(0,0,0,0.1);
    padding-bottom: 8px;
    margin-bottom: 12px;
  }
  
  .serving-badge {
    min-width: 60px;
    height: 60px;
    font-size: 2rem;
  }
}
</style>