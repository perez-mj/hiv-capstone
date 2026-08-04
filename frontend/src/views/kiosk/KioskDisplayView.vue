<template>
  <div class="kiosk-display">
    <v-row>
      <!-- Testing Office -->
      <v-col cols="12" md="6">
        <v-card 
          class="office-display"
          elevation="4"
          border="primary"
        >
          <v-card-title class="text-h4 font-weight-bold pa-4" style="background: linear-gradient(135deg, rgb(var(--v-theme-primary)), rgb(var(--v-theme-primary-darken-2))); color: white;">
            <v-icon color="white" class="mr-2" :style="{ opacity: 0.9 }">mdi-test-tube</v-icon>
            Testing Office
          </v-card-title>
          
          <v-card-text class="pa-4">
            <div class="text-center mb-4">
              <div class="text-caption text-medium-emphasis font-weight-medium">Now Serving</div>
              <div class="text-h1 font-weight-bold" style="color: rgb(var(--v-theme-primary));">
                {{ testingQueue.currentServing || '---' }}
              </div>
              <div class="text-subtitle-1 text-medium-emphasis">
                {{ testingQueue.currentPatientName || 'Waiting for next patient...' }}
              </div>
            </div>

            <v-divider class="my-4"></v-divider>

            <div class="d-flex justify-space-around align-center">
              <div class="text-center">
                <div class="text-caption text-medium-emphasis font-weight-medium">Waiting</div>
                <div class="text-h3 font-weight-bold" style="color: rgb(var(--v-theme-primary));">
                  {{ testingQueue.waitingCount || 0 }}
                </div>
              </div>
              <v-divider vertical class="mx-2" style="height: 48px;"></v-divider>
              <div class="text-center">
                <div class="text-caption text-medium-emphasis font-weight-medium">Completed</div>
                <div class="text-h4 font-weight-bold" style="color: rgb(var(--v-theme-success));">
                  {{ testingQueue.completedCount || 0 }}
                </div>
              </div>
              <v-divider vertical class="mx-2" style="height: 48px;"></v-divider>
              <div class="text-center">
                <div class="text-caption text-medium-emphasis font-weight-medium">Est. Wait</div>
                <div class="text-h5 font-weight-bold" style="color: rgb(var(--v-theme-warning));">
                  {{ estimatedWaitTime(testingQueue.waitingCount) }}
                </div>
              </div>
            </div>

            <v-divider class="my-4"></v-divider>

            <!-- Waiting List -->
            <div v-if="testingQueue.waitingList && testingQueue.waitingList.length > 0">
              <div class="text-subtitle-2 font-weight-bold mb-2 text-medium-emphasis">
                Next in Line
              </div>
              <div class="waiting-list">
                <div 
                  v-for="(item, index) in testingQueue.waitingList.slice(0, 5)" 
                  :key="index"
                  class="waiting-item d-flex align-center pa-2"
                  :class="{ 
                    'bg-primary': index === 0,
                    'text-white': index === 0
                  }"
                  :style="index === 0 ? { backgroundColor: `rgb(var(--v-theme-primary))` } : {}"
                >
                  <v-chip 
                    size="small" 
                    :color="index === 0 ? 'white' : 'primary'" 
                    :text-color="index === 0 ? 'primary' : 'white'"
                    class="mr-2"
                    variant="flat"
                  >
                    #{{ item.queue_number }}
                  </v-chip>
                  <span class="text-body-1" :class="{ 'text-white': index === 0 }">
                    {{ item.patient_name }}
                  </span>
                  <v-spacer></v-spacer>
                  <v-chip 
                    size="x-small" 
                    color="surface-variant" 
                    variant="text"
                    :class="{ 'text-white': index === 0 }"
                  >
                    {{ item.position }}
                  </v-chip>
                </div>
                <div v-if="testingQueue.waitingList.length > 5" class="text-caption text-medium-emphasis mt-1">
                  + {{ testingQueue.waitingList.length - 5 }} more waiting
                </div>
              </div>
            </div>
            <div v-else class="text-center py-4">
              <v-icon size="48" color="surface-variant">mdi-queue</v-icon>
              <div class="text-subtitle-1 text-medium-emphasis mt-2">No patients waiting</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Treatment Office -->
      <v-col cols="12" md="6">
        <v-card 
          class="office-display"
          elevation="4"
          border="success"
        >
          <v-card-title class="text-h4 font-weight-bold pa-4" style="background: linear-gradient(135deg, rgb(var(--v-theme-secondary)), rgb(var(--v-theme-secondary-darken-2))); color: white;">
            <v-icon color="white" class="mr-2" :style="{ opacity: 0.9 }">mdi-pill</v-icon>
            Treatment Office
          </v-card-title>
          
          <v-card-text class="pa-4">
            <div class="text-center mb-4">
              <div class="text-caption text-medium-emphasis font-weight-medium">Now Serving</div>
              <div class="text-h1 font-weight-bold" style="color: rgb(var(--v-theme-success));">
                {{ treatmentQueue.currentServing || '---' }}
              </div>
              <div class="text-subtitle-1 text-medium-emphasis">
                {{ treatmentQueue.currentPatientName || 'Waiting for next patient...' }}
              </div>
            </div>

            <v-divider class="my-4"></v-divider>

            <div class="d-flex justify-space-around align-center">
              <div class="text-center">
                <div class="text-caption text-medium-emphasis font-weight-medium">Waiting</div>
                <div class="text-h3 font-weight-bold" style="color: rgb(var(--v-theme-success));">
                  {{ treatmentQueue.waitingCount || 0 }}
                </div>
              </div>
              <v-divider vertical class="mx-2" style="height: 48px;"></v-divider>
              <div class="text-center">
                <div class="text-caption text-medium-emphasis font-weight-medium">Completed</div>
                <div class="text-h4 font-weight-bold" style="color: rgb(var(--v-theme-success));">
                  {{ treatmentQueue.completedCount || 0 }}
                </div>
              </div>
              <v-divider vertical class="mx-2" style="height: 48px;"></v-divider>
              <div class="text-center">
                <div class="text-caption text-medium-emphasis font-weight-medium">Est. Wait</div>
                <div class="text-h5 font-weight-bold" style="color: rgb(var(--v-theme-warning));">
                  {{ estimatedWaitTime(treatmentQueue.waitingCount) }}
                </div>
              </div>
            </div>

            <v-divider class="my-4"></v-divider>

            <!-- Waiting List -->
            <div v-if="treatmentQueue.waitingList && treatmentQueue.waitingList.length > 0">
              <div class="text-subtitle-2 font-weight-bold mb-2 text-medium-emphasis">
                Next in Line
              </div>
              <div class="waiting-list">
                <div 
                  v-for="(item, index) in treatmentQueue.waitingList.slice(0, 5)" 
                  :key="index"
                  class="waiting-item d-flex align-center pa-2"
                  :class="{ 
                    'bg-success': index === 0,
                    'text-white': index === 0
                  }"
                  :style="index === 0 ? { backgroundColor: `rgb(var(--v-theme-success))` } : {}"
                >
                  <v-chip 
                    size="small" 
                    :color="index === 0 ? 'white' : 'success'" 
                    :text-color="index === 0 ? 'success' : 'white'"
                    class="mr-2"
                    variant="flat"
                  >
                    #{{ item.queue_number }}
                  </v-chip>
                  <span class="text-body-1" :class="{ 'text-white': index === 0 }">
                    {{ item.patient_name }}
                  </span>
                  <v-spacer></v-spacer>
                  <v-chip 
                    size="x-small" 
                    color="surface-variant" 
                    variant="text"
                    :class="{ 'text-white': index === 0 }"
                  >
                    {{ item.position }}
                  </v-chip>
                </div>
                <div v-if="treatmentQueue.waitingList.length > 5" class="text-caption text-medium-emphasis mt-1">
                  + {{ treatmentQueue.waitingList.length - 5 }} more waiting
                </div>
              </div>
            </div>
            <div v-else class="text-center py-4">
              <v-icon size="48" color="surface-variant">mdi-queue</v-icon>
              <div class="text-subtitle-1 text-medium-emphasis mt-2">No patients waiting</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Status Bar -->
    <v-card class="mt-4" elevation="2" color="surface-variant">
      <v-card-text class="d-flex justify-space-between align-center pa-3">
        <div class="d-flex align-center">
          <v-icon color="success" class="mr-2" size="24">mdi-check-circle</v-icon>
          <span class="text-body-2 font-weight-medium">System Online</span>
        </div>
        <div class="text-body-2 text-medium-emphasis">
          <v-icon size="16" class="mr-1">mdi-clock-outline</v-icon>
          Last updated: {{ lastUpdated }}
        </div>
        <v-btn
          color="primary"
          variant="text"
          size="small"
          @click="refreshQueue"
          prepend-icon="mdi-refresh"
          class="font-weight-medium"
        >
          Refresh
        </v-btn>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import queueService from '@/services/queueService'
// Fix: Import from the correct path
import socketService from '@/services/socketService'

const testingQueue = ref({
  currentServing: null,
  currentPatientName: null,
  waitingCount: 0,
  completedCount: 0,
  waitingList: []
})

const treatmentQueue = ref({
  currentServing: null,
  currentPatientName: null,
  waitingCount: 0,
  completedCount: 0,
  waitingList: []
})

const lastUpdated = ref('')
let updateInterval = null

const estimatedWaitTime = (count) => {
  if (!count || count === 0) return 'Now'
  const avgTimePerPatient = 15 // minutes
  const totalMinutes = count * avgTimePerPatient
  if (totalMinutes < 60) {
    return `${totalMinutes}m`
  }
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}h ${minutes}m`
}

const fetchQueueData = async () => {
  try {
    const [testing, treatment] = await Promise.all([
      queueService.getQueueState('testing'),
      queueService.getQueueState('treatment')
    ])
    
    testingQueue.value = testing
    treatmentQueue.value = treatment
    lastUpdated.value = new Date().toLocaleTimeString()
  } catch (error) {
    console.error('Failed to fetch queue data:', error)
  }
}

const refreshQueue = () => {
  fetchQueueData()
}

// Socket.IO setup using the correct socket service
const setupSocketListeners = () => {
  // Connect socket if not already connected
  socketService.connect()
  
  // Join queue rooms
  socketService.joinRoom('testing')
  socketService.joinRoom('treatment')

  // Listen for queue updates
  socketService.on('queue-updated', (data) => {
    fetchQueueData()
  })

  socketService.on('next-called', (data) => {
    fetchQueueData()
  })
}

onMounted(() => {
  fetchQueueData()
  setupSocketListeners()
  updateInterval = setInterval(fetchQueueData, 30000) // Refresh every 30 seconds
})

onUnmounted(() => {
  if (updateInterval) {
    clearInterval(updateInterval)
  }
  // Leave rooms and disconnect socket
  socketService.leaveRoom('testing')
  socketService.leaveRoom('treatment')
  // Optional: disconnect socket when component unmounts
  // socketService.disconnect()
})
</script>

<style scoped>
.kiosk-display {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px;
}

.office-display {
  min-height: 400px;
  transition: all 0.3s ease;
}

.office-display:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12) !important;
}

.waiting-list {
  max-height: 220px;
  overflow-y: auto;
  border-radius: 8px;
}

.waiting-item {
  border-radius: 6px;
  margin-bottom: 4px;
  transition: all 0.2s ease;
}

.waiting-item:not(.bg-primary):not(.bg-success):hover {
  background-color: rgba(var(--v-theme-surface-variant), 0.1);
}

/* Touchscreen optimization */
:deep(.v-btn) {
  min-height: 44px;
  font-weight: 500;
  letter-spacing: 0.3px;
}

/* Scrollbar styling - matching theme */
.waiting-list::-webkit-scrollbar {
  width: 6px;
}

.waiting-list::-webkit-scrollbar-track {
  background: rgba(var(--v-theme-surface-variant), 0.1);
  border-radius: 3px;
}

.waiting-list::-webkit-scrollbar-thumb {
  background: rgba(var(--v-theme-primary), 0.3);
  border-radius: 3px;
  transition: background 0.2s ease;
}

.waiting-list::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--v-theme-primary), 0.5);
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .kiosk-display {
    padding: 12px;
  }
  
  .office-display {
    min-height: 300px;
  }
  
  .office-display :deep(.v-card-title) {
    font-size: 1.25rem !important;
    padding: 12px 16px !important;
  }
  
  .office-display :deep(.v-card-text) {
    padding: 12px !important;
  }
}
</style>