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
.kiosk-main {
  background: linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 50%, var(--color-primary-light) 100%);
  min-height: 100vh;
}

/* Serving Banner */
.serving-banner {
  background: var(--color-surface) !important;
  border-radius: 60px !important;
  border-left: 8px solid var(--color-primary);
}

.serving-label {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--color-primary);
  letter-spacing: 2px;
  white-space: nowrap;
}

.serving-numbers {
  flex: 1;
}

.serving-item {
  display: flex;
  align-items: center;
}

.serving-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  height: 48px;
  background: var(--color-primary);
  color: var(--color-text-on-primary);
  font-size: 1.5rem;
  font-weight: 800;
  border-radius: 24px;
  padding: 0 12px;
}

.serving-type {
  font-size: 1.1rem;
  font-weight: 500;
  color: var(--color-text-primary);
}

/* Type Cards */
.type-card {
  background: var(--color-surface) !important;
  border-radius: 20px !important;
  transition: transform var(--transition-normal);
  height: 100%;
}

.type-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg) !important;
}

.type-header {
  border-bottom: 2px solid var(--color-border);
  padding-bottom: 8px;
}

.type-indicator {
  width: 16px;
  height: 16px;
  border-radius: var(--radius-sm);
}

.type-stats {
  display: flex;
  align-items: baseline;
}

/* Next Up Section */
.next-up-section {
  background: var(--color-surface-dark);
  border-radius: var(--radius-lg);
  padding: 8px;
}

.next-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  height: 40px;
  color: var(--color-text-on-primary);
  font-size: 1.2rem;
  font-weight: 700;
  border-radius: 20px;
}

/* Queue List */
.queue-list {
  min-height: 100px;
}

.queue-item {
  padding: 6px 0;
  border-bottom: 1px solid var(--color-border-light);
}

.queue-item:last-child {
  border-bottom: none;
}

.queue-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 24px;
  background: var(--color-surface-dark);
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

/* Stats Bar */
.stats-bar {
  background: var(--color-surface) !important;
  border-radius: var(--radius-full) !important;
  opacity: 0.95;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 1.3rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--color-text-primary);
}

.stat-label {
  font-size: 0.7rem;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Auth Card */
.auth-card {
  background: var(--color-surface) !important;
  border-radius: var(--radius-2xl) !important;
}

.wait-time {
  border-top: 1px dashed var(--color-border);
}

/* Mobile Responsive */
@media (max-width: 600px) {
  .serving-label {
    font-size: 1rem;
    margin-right: var(--spacing-sm) !important;
  }
  
  .serving-badge {
    min-width: 36px;
    height: 36px;
    font-size: 1.1rem;
  }
  
  .serving-type {
    font-size: 0.9rem;
  }
  
  .stat-value {
    font-size: 1rem;
  }
  
  .stat-label {
    font-size: 0.6rem;
  }
  
  .type-card .text-h6 {
    font-size: 1rem !important;
  }
}

/* Animations */
@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.7; }
  100% { opacity: 1; }
}

.pulse {
  animation: pulse var(--transition-slow) infinite;
}
</style>