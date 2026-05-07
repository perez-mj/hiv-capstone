<template>
  <v-app>
    <!-- Connection Status Bar -->
    <v-system-bar
      v-if="!isOnline || !isAuthorized"
      :color="connectionColor"
      theme="dark"
      class="justify-center px-2"
      height="28"
    >
      <v-icon :icon="connectionIcon" size="small" class="mr-1" />
      <span class="text-caption">{{ connectionMessage }}</span>
      <v-spacer />
      <span class="text-caption">ID: {{ deviceIdShort }}</span>
    </v-system-bar>

    <!-- Loading Overlay -->
    <v-overlay v-model="isLoading" class="align-center justify-center" persistent>
      <div class="text-center">
        <v-progress-circular indeterminate size="48" width="4" color="primary" />
        <div class="text-primary mt-4 text-h6">{{ loadingMessage }}</div>
        <div v-if="errorMessage" class="text-error mt-2 text-caption">{{ errorMessage }}</div>
      </div>
    </v-overlay>

    <!-- Main Content -->
    <v-main v-if="!isLoading" class="kiosk-main">
      <v-container fluid class="pa-2 fill-height">
        
        <!-- Authorized View -->
        <v-row v-if="isAuthorized" no-gutters class="fill-height flex-column">
          <!-- Compact Header -->
          <v-col cols="auto" class="mb-2">
            <div class="d-flex justify-space-between align-center">
              <div>
                <div class="text-h5 font-weight-black text-primary">QUEUE DISPLAY</div>
                <div class="d-flex align-center text-caption text-medium-emphasis">
                  <v-icon icon="mdi-hospital-building" size="small" class="mr-1" />
                  HIV Care Facility
                </div>
              </div>
              <div class="text-right">
                <div class="text-h5 font-weight-bold text-primary">{{ currentTime }}</div>
                <div class="text-caption">{{ currentDateShort }}</div>
              </div>
            </div>
          </v-col>

          <!-- Split Screen: Testing | Consultation (Side by Side) -->
          <v-col cols="auto" class="flex-grow-1" style="min-height: 0">
            <v-row no-gutters class="fill-height">
              
              <!-- LEFT: TESTING SECTION -->
              <v-col cols="12" md="6" class="pr-md-1">
                <v-card class="fill-height" elevation="3" color="blue-lighten-5">
                  <v-card-text class="pa-2">
                    <!-- Header -->
                    <div class="d-flex align-center justify-space-between mb-2">
                      <div class="d-flex align-center">
                        <v-icon color="#1565C0" size="28" class="mr-1">mdi-flask</v-icon>
                        <h3 class="text-h6 font-weight-bold mb-0" style="color: #1565C0;">TESTING</h3>
                      </div>
                      <v-chip color="#1565C0" size="small" text-color="white">
                        {{ testingWaitingCount }}
                      </v-chip>
                    </div>

                    <!-- Now Serving -->
                    <v-card class="mb-2" :color="testingNowServing ? '#1565C0' : 'grey-lighten-2'" variant="tonal" density="compact">
                      <v-card-text class="pa-2 text-center">
                        <div class="text-caption font-weight-bold">NOW SERVING</div>
                        <div class="text-h3 font-weight-bold" :style="{ color: testingNowServing ? '#1565C0' : '#757575' }">
                          {{ testingNowServingCode }}
                        </div>
                        <div class="text-caption" :style="{ color: testingNowServing ? '#0D47A1' : '#757575' }">
                          {{ testingNowServingName }}
                        </div>
                        <div class="text-caption mt-1">
                          ~{{ testingWaitTime }} min
                        </div>
                      </v-card-text>
                    </v-card>

                    <!-- Next in Line -->
                    <v-card class="mb-2" color="#1565C0" variant="outlined" density="compact">
                      <v-card-text class="pa-2 text-center">
                        <div class="text-caption font-weight-bold">NEXT</div>
                        <div class="text-h4 font-weight-bold" style="color: #1565C0;">
                          {{ testingNextCode }}
                        </div>
                        <div class="text-caption">~{{ testingWaitTime }} min</div>
                      </v-card-text>
                    </v-card>

                    <!-- Waiting List -->
                    <v-list density="compact" style="background: transparent; max-height: 320px; overflow-y: auto;">
                      <v-list-subheader class="ps-0 text-subtitle-2 font-weight-bold">
                        WAITING LIST
                      </v-list-subheader>
                      <v-list-item
                        v-for="(patient, idx) in testingWaitingList.slice(0, 8)"
                        :key="patient.queue_code"
                        density="compact"
                        class="pa-0"
                      >
                        <div class="d-flex align-center justify-space-between py-1">
                          <div class="d-flex align-center">
                            <div class="queue-position-small">{{ idx + 1 }}</div>
                            <span class="font-weight-bold text-body-1">{{ patient.queue_code }}</span>
                          </div>
                          <v-chip size="x-small" color="#1565C0" variant="outlined">
                            {{ patient.time }}
                          </v-chip>
                        </div>
                      </v-list-item>
                      
                      <v-list-item v-if="testingWaitingList.length === 0">
                        <div class="text-center pa-4">
                          <v-icon size="32" color="grey-lighten-1">mdi-check-circle-outline</v-icon>
                          <div class="text-caption">Queue empty</div>
                        </div>
                      </v-list-item>
                      
                      <v-list-item v-if="testingWaitingList.length > 8">
                        <div class="text-center text-caption text-medium-emphasis pa-1">
                          +{{ testingWaitingList.length - 8 }} more
                        </div>
                      </v-list-item>
                    </v-list>
                  </v-card-text>
                </v-card>
              </v-col>

              <!-- RIGHT: CONSULTATION SECTION -->
              <v-col cols="12" md="6" class="pl-md-1">
                <v-card class="fill-height" elevation="3" color="green-lighten-5">
                  <v-card-text class="pa-2">
                    <!-- Header -->
                    <div class="d-flex align-center justify-space-between mb-2">
                      <div class="d-flex align-center">
                        <v-icon color="#2E7D32" size="28" class="mr-1">mdi-stethoscope</v-icon>
                        <h3 class="text-h6 font-weight-bold mb-0" style="color: #2E7D32;">CONSULTATION</h3>
                      </div>
                      <v-chip color="#2E7D32" size="small" text-color="white">
                        {{ consultationWaitingCount }}
                      </v-chip>
                    </div>

                    <!-- Now Serving -->
                    <v-card class="mb-2" :color="consultationNowServing ? '#2E7D32' : 'grey-lighten-2'" variant="tonal" density="compact">
                      <v-card-text class="pa-2 text-center">
                        <div class="text-caption font-weight-bold">NOW SERVING</div>
                        <div class="text-h3 font-weight-bold" :style="{ color: consultationNowServing ? '#2E7D32' : '#757575' }">
                          {{ consultationNowServingCode }}
                        </div>
                        <div class="text-caption" :style="{ color: consultationNowServing ? '#1B5E20' : '#757575' }">
                          {{ consultationNowServingName }}
                        </div>
                        <div class="text-caption mt-1">
                          ~{{ consultationWaitTime }} min
                        </div>
                      </v-card-text>
                    </v-card>

                    <!-- Next in Line -->
                    <v-card class="mb-2" color="#2E7D32" variant="outlined" density="compact">
                      <v-card-text class="pa-2 text-center">
                        <div class="text-caption font-weight-bold">NEXT</div>
                        <div class="text-h4 font-weight-bold" style="color: #2E7D32;">
                          {{ consultationNextCode }}
                        </div>
                        <div class="text-caption">~{{ consultationWaitTime }} min</div>
                      </v-card-text>
                    </v-card>

                    <!-- Waiting List -->
                    <v-list density="compact" style="background: transparent; max-height: 320px; overflow-y: auto;">
                      <v-list-subheader class="ps-0 text-subtitle-2 font-weight-bold">
                        WAITING LIST
                      </v-list-subheader>
                      <v-list-item
                        v-for="(patient, idx) in consultationWaitingList.slice(0, 8)"
                        :key="patient.queue_code"
                        density="compact"
                        class="pa-0"
                      >
                        <div class="d-flex align-center justify-space-between py-1">
                          <div class="d-flex align-center">
                            <div class="queue-position-small">{{ idx + 1 }}</div>
                            <span class="font-weight-bold text-body-1">{{ patient.queue_code }}</span>
                          </div>
                          <v-chip size="x-small" color="#2E7D32" variant="outlined">
                            {{ patient.time }}
                          </v-chip>
                        </div>
                      </v-list-item>
                      
                      <v-list-item v-if="consultationWaitingList.length === 0">
                        <div class="text-center pa-4">
                          <v-icon size="32" color="grey-lighten-1">mdi-check-circle-outline</v-icon>
                          <div class="text-caption">Queue empty</div>
                        </div>
                      </v-list-item>
                      
                      <v-list-item v-if="consultationWaitingList.length > 8">
                        <div class="text-center text-caption text-medium-emphasis pa-1">
                          +{{ consultationWaitingList.length - 8 }} more
                        </div>
                      </v-list-item>
                    </v-list>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-col>

          <!-- Compact Stats Bar -->
          <v-col cols="auto" class="mt-2">
            <v-card elevation="2" color="primary" density="compact">
              <v-card-text class="pa-2">
                <div class="d-flex justify-space-around align-center">
                  <div class="text-center">
                    <div class="text-h6 font-weight-bold text-white">{{ totalWaiting }}</div>
                    <div class="text-caption text-white opacity-70">Waiting</div>
                  </div>
                  <v-divider vertical class="bg-white opacity-30 mx-2"></v-divider>
                  <div class="text-center">
                    <div class="text-h6 font-weight-bold text-white">{{ totalServing }}</div>
                    <div class="text-caption text-white opacity-70">Serving</div>
                  </div>
                  <v-divider vertical class="bg-white opacity-30 mx-2"></v-divider>
                  <div class="text-center">
                    <div class="text-h6 font-weight-bold text-white">{{ avgWaitTime }}</div>
                    <div class="text-caption text-white opacity-70">Avg Min</div>
                  </div>
                  <v-divider vertical class="bg-white opacity-30 mx-2"></v-divider>
                  <div class="text-center">
                    <div class="text-caption font-weight-bold text-white">{{ lastUpdatedShort }}</div>
                    <div class="text-caption text-white opacity-70">Updated</div>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Unauthorized View -->
        <v-row v-else align="center" justify="center" class="fill-height">
          <v-col cols="10" sm="8" md="5">
            <v-card class="text-center pa-4" elevation="6">
              <v-icon size="48" :color="isRegistered ? 'warning' : 'primary'">
                {{ isRegistered ? 'mdi-shield-lock-outline' : 'mdi-cog-sync' }}
              </v-icon>
              <h3 class="text-h6 font-weight-bold mt-2">{{ isRegistered ? 'Authorization Required' : 'Initializing...' }}</h3>
              <p class="text-caption mt-2">{{ statusMessage }}</p>
              <v-chip variant="outlined" size="x-small" class="mt-2">ID: {{ deviceIdShort }}</v-chip>
              <v-progress-linear v-if="!errorMessage" indeterminate :color="isRegistered ? 'warning' : 'primary'" class="mt-3" height="2" />
              <v-btn v-if="errorMessage" color="primary" size="small" class="mt-3" @click="retryConnection">Retry</v-btn>
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
const loadingMessage = ref('Initializing...')
const errorMessage = ref('')

// Raw queue data from backend
const rawQueueData = ref({
  currentServing: [],
  waitingByType: [],
  waitingList: [],
  stats: {},
  waitTimes: {}
})

const lastUpdated = ref('')
const reconnectAttempts = ref(0)
const MAX_RECONNECT_ATTEMPTS = 5

// Time and date
const currentTime = ref('')
const currentDateShort = ref('')
let timeInterval = null
let queueInterval = null
let authCheckInterval = null

// ========== HELPER FUNCTIONS ==========

const formatTimeOnly = (datetime) => {
  if (!datetime) return ''
  const date = new Date(datetime)
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

const generateDeviceId = () => {
  const array = new Uint8Array(4)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('').substring(0, 8)
}

// ========== DATA TRANSFORMATION ==========

// Helper to determine stream from appointment type
const getStreamFromType = (typeName) => {
  if (!typeName) return 'CONSULTATION'
  const type = typeName.toUpperCase()
  if (type === 'TESTING') return 'TESTING'
  return 'CONSULTATION'
}

// Get the current serving patient for a stream from currentServing array
const getCurrentServingForStream = (stream) => {
  const currentServing = rawQueueData.value.currentServing || []
  
  // First try to find SERVING status
  let serving = currentServing.find(s => {
    const patientStream = getStreamFromType(s.type)
    return patientStream === stream && s.status === 'SERVING'
  })
  
  if (serving) return serving
  
  // If no SERVING, try CALLED status
  let called = currentServing.find(s => {
    const patientStream = getStreamFromType(s.type)
    return patientStream === stream && s.status === 'CALLED'
  })
  
  return called || null
}

// Get stream data from waitingByType
const getStreamGroup = (stream) => {
  const waitingByType = rawQueueData.value.waitingByType || []
  return waitingByType.find(g => g.type === stream) || { patients: [], waiting_count: 0, called_count: 0 }
}

// Testing Stream Computed
const testingStreamGroup = computed(() => getStreamGroup('Testing'))
const testingCurrentServing = computed(() => getCurrentServingForStream('TESTING'))

const testingNowServing = computed(() => {
  // First check currentServing
  if (testingCurrentServing.value) {
    return testingCurrentServing.value
  }
  // Fallback: check if there's a called patient in the group
  const calledPatients = (testingStreamGroup.value.patients || []).filter(p => p.status === 'CALLED')
  if (calledPatients.length > 0) {
    return calledPatients[0]
  }
  return null
})

const testingNowServingCode = computed(() => testingNowServing.value?.queue_code || '---')
const testingNowServingName = computed(() => {
  const patient = testingNowServing.value
  if (!patient) return ''
  return `${patient.patient_first_name || ''} ${patient.patient_last_name || ''}`.trim() || ''
})

const testingWaitingList = computed(() => {
  const patients = testingStreamGroup.value.patients || []
  // Only show WAITING status (not CALLED)
  const waiting = patients.filter(p => p.status === 'WAITING')
  return waiting.map(p => ({
    queue_code: p.queue_code,
    time: p.time || formatTimeOnly(new Date())
  }))
})

const testingWaitingCount = computed(() => {
  const patients = testingStreamGroup.value.patients || []
  return patients.filter(p => p.status === 'WAITING').length
})

const testingNextCode = computed(() => {
  const waiting = testingWaitingList.value
  return waiting.length > 0 ? waiting[0].queue_code : '---'
})

const testingWaitTime = computed(() => {
  const waitTime = rawQueueData.value.waitTimes?.Testing || 
                   (testingWaitingCount.value * 15) || 0
  return waitTime
})

// Consultation Stream Computed
const consultationStreamGroup = computed(() => getStreamGroup('Consultation'))
const consultationCurrentServing = computed(() => getCurrentServingForStream('CONSULTATION'))

const consultationNowServing = computed(() => {
  // First check currentServing
  if (consultationCurrentServing.value) {
    return consultationCurrentServing.value
  }
  // Fallback: check if there's a called patient in the group
  const calledPatients = (consultationStreamGroup.value.patients || []).filter(p => p.status === 'CALLED')
  if (calledPatients.length > 0) {
    return calledPatients[0]
  }
  return null
})

const consultationNowServingCode = computed(() => consultationNowServing.value?.queue_code || '---')
const consultationNowServingName = computed(() => {
  const patient = consultationNowServing.value
  if (!patient) return ''
  return `${patient.patient_first_name || ''} ${patient.patient_last_name || ''}`.trim() || ''
})

const consultationWaitingList = computed(() => {
  const patients = consultationStreamGroup.value.patients || []
  // Only show WAITING status (not CALLED)
  const waiting = patients.filter(p => p.status === 'WAITING')
  return waiting.map(p => ({
    queue_code: p.queue_code,
    time: p.time || formatTimeOnly(new Date())
  }))
})

const consultationWaitingCount = computed(() => {
  const patients = consultationStreamGroup.value.patients || []
  return patients.filter(p => p.status === 'WAITING').length
})

const consultationNextCode = computed(() => {
  const waiting = consultationWaitingList.value
  return waiting.length > 0 ? waiting[0].queue_code : '---'
})

const consultationWaitTime = computed(() => {
  const waitTime = rawQueueData.value.waitTimes?.Consultation || 
                   rawQueueData.value.waitTimes?.Refill || 
                   rawQueueData.value.waitTimes?.Other || 
                   (consultationWaitingCount.value * 15) || 0
  return waitTime
})

// Global Stats
const totalWaiting = computed(() => testingWaitingCount.value + consultationWaitingCount.value)
const totalServing = computed(() => {
  const currentServing = rawQueueData.value.currentServing || []
  return currentServing.filter(s => s.status === 'SERVING').length
})

const avgWaitTime = computed(() => {
  if (totalWaiting.value === 0) return 0
  const total = testingWaitTime.value + consultationWaitTime.value
  return Math.round(total / 2)
})

const lastUpdatedShort = computed(() => {
  if (!lastUpdated.value) return '---'
  return lastUpdated.value.slice(0, 5)
})

// Connection Status Computed
const deviceIdShort = computed(() => {
  if (!deviceId.value) return ''
  return deviceId.value.length > 8 ? deviceId.value.substring(0, 8) : deviceId.value
})

const statusMessage = computed(() => {
  if (!isOnline.value) return 'Connection lost...'
  if (errorMessage.value) return errorMessage.value
  if (!isRegistered.value) return 'Registering device...'
  if (!isAuthorized.value) return 'Waiting for approval'
  return 'Connected'
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
  if (!isOnline.value) return 'Reconnecting...'
  if (!isAuthorized.value && isRegistered.value) return 'Pending auth'
  if (isAuthorized.value) return 'Connected'
  return 'Init...'
})

// ========== DATA FETCHING ==========

const fetchQueueData = async () => {
  if (!isAuthorized.value) return
  
  try {
    const response = await kioskApi.getQueueData(deviceId.value)
    
    let data = response
    
    if (response?.data && !response.waitingByType) {
      data = response.data
    }
    
    console.log('📊 Queue data:', {
      currentServing: data.currentServing?.length || 0,
      waitingByType: data.waitingByType?.length || 0,
      testingServing: data.currentServing?.filter(s => getStreamFromType(s.type) === 'TESTING').length || 0,
      consultationServing: data.currentServing?.filter(s => getStreamFromType(s.type) === 'CONSULTATION').length || 0
    })
    
    rawQueueData.value = {
      currentServing: data.currentServing || [],
      waitingByType: data.waitingByType || [],
      waitingList: data.waitingList || [],
      stats: data.stats || {},
      waitTimes: data.waitTimes || {}
    }
    
    lastUpdated.value = new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    })
    isOnline.value = true
    errorMessage.value = ''
    
  } catch (error) {
    console.error('Queue fetch failed:', error)
    
    if (error.response?.status === 403) {
      isAuthorized.value = false
      startAuthCheck()
    } else if (error.message?.includes('Network Error') || !navigator.onLine) {
      isOnline.value = false
    }
  }
}

const checkDeviceStatus = async () => {
  try {
    console.log('🔍 Checking device status for:', deviceId.value)
    const response = await kioskApi.checkStatus(deviceId.value)
    
    let authorized = false
    
    if (response && typeof response === 'object') {
      if (response.authorized !== undefined) {
        authorized = response.authorized
      }
      else if (response.data && response.data.authorized !== undefined) {
        authorized = response.data.authorized
      }
      else if (response.success && response.data && response.data.authorized !== undefined) {
        authorized = response.data.authorized
      }
    }
    
    console.log('🔐 Authorization status:', authorized)
    
    isRegistered.value = true
    isAuthorized.value = authorized === true || authorized === 1
    isOnline.value = true
    errorMessage.value = ''
    reconnectAttempts.value = 0
    
    clearInterval(queueInterval)
    clearInterval(authCheckInterval)
    
    if (isAuthorized.value) {
      console.log('✅ Device authorized, loading queue data...')
      loadingMessage.value = 'Loading queue...'
      await fetchQueueData()
      startQueueUpdates()
      
      setTimeout(() => {
        isLoading.value = false
      }, 500)
    } else {
      console.log('⏳ Device not authorized, waiting for approval...')
      startAuthCheck()
      setTimeout(() => {
        isLoading.value = false
      }, 500)
    }
    
  } catch (error) {
    console.error('Status check failed:', error)
    
    if (error.message?.includes('Network Error') || !navigator.onLine) {
      isOnline.value = false
      isRegistered.value = false
      isAuthorized.value = false
      handleReconnect()
    } else {
      isOnline.value = true
      isRegistered.value = false
      isAuthorized.value = false
      errorMessage.value = error.response?.data?.message || error.response?.data?.error || 'Server error'
    }
    
    setTimeout(() => {
      isLoading.value = false
    }, 500)
  }
}

const startQueueUpdates = () => {
  fetchQueueData()
  queueInterval = setInterval(fetchQueueData, 5000)
}

const startAuthCheck = () => {
  if (authCheckInterval) clearInterval(authCheckInterval)
  
  authCheckInterval = setInterval(async () => {
    if (!isAuthorized.value && isOnline.value) {
      try {
        const response = await kioskApi.checkStatus(deviceId.value)
        
        let authorized = false
        if (response && typeof response === 'object') {
          if (response.authorized !== undefined) {
            authorized = response.authorized
          } else if (response.data && response.data.authorized !== undefined) {
            authorized = response.data.authorized
          }
        }
        
        if (authorized === true || authorized === 1) {
          console.log('✅ Device authorized!')
          isAuthorized.value = true
          clearInterval(authCheckInterval)
          await fetchQueueData()
          startQueueUpdates()
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        if (error.message?.includes('Network Error')) {
          isOnline.value = false
        }
      }
    }
  }, 5000)
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
  
  loadingMessage.value = 'Registering...'
  await checkDeviceStatus()
}

const handleReconnect = () => {
  if (reconnectAttempts.value >= MAX_RECONNECT_ATTEMPTS) {
    errorMessage.value = 'Cannot connect to server'
    return
  }
  
  reconnectAttempts.value++
  setTimeout(async () => {
    console.log(`🔄 Reconnect attempt ${reconnectAttempts.value}...`)
    await checkDeviceStatus()
  }, 5000 * reconnectAttempts.value)
}

const retryConnection = () => {
  errorMessage.value = ''
  reconnectAttempts.value = 0
  initializeKiosk()
}

// ========== TIME UPDATES ==========

const updateDateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  })
  currentDateShort.value = now.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric'
  })
}

const startTimeUpdates = () => {
  updateDateTime()
  timeInterval = setInterval(updateDateTime, 1000)
}

// ========== EVENT HANDLERS ==========

const handleOnline = () => {
  console.log('📶 Network restored')
  isOnline.value = true
  errorMessage.value = ''
  reconnectAttempts.value = 0
  checkDeviceStatus()
}

const handleOffline = () => {
  console.log('📶 Network lost')
  isOnline.value = false
  clearInterval(queueInterval)
  clearInterval(authCheckInterval)
}

// Debug helper
if (typeof window !== 'undefined') {
  window.debugKiosk = () => ({
    deviceId: deviceId.value,
    isAuthorized: isAuthorized.value,
    testingNowServing: testingNowServing.value,
    consultationNowServing: consultationNowServing.value,
    currentServing: rawQueueData.value.currentServing
  })
}

// ========== LIFECYCLE ==========

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
  
  if (typeof window !== 'undefined') {
    delete window.debugKiosk
  }
})
</script>

<style scoped>
.queue-position-small {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  font-size: 11px;
  font-weight: bold;
  margin-right: 12px;
  color: rgba(0, 0, 0, 0.6);
}

.opacity-70 {
  opacity: 0.7;
}
</style>