<!-- frontend/src/views/staff/testing/QueueView.vue -->
<template>
  <v-container fluid class="pa-4">
    <v-row>
      <v-col cols="12" lg="8">
        <!-- Queue Display -->
        <v-card>
          <v-card-title class="text-h5">
            <v-icon start>mdi-format-list-numbered</v-icon>
            Testing Queue
            <v-spacer></v-spacer>
            <v-chip color="primary" variant="flat">
              {{ waitingCount }} waiting
            </v-chip>
          </v-card-title>
          <v-divider></v-divider>
          
          <v-card-text>
            <!-- Now Serving -->
            <v-row class="mb-4">
              <v-col cols="12">
                <v-card color="success" variant="tonal" class="pa-4">
                  <v-row align="center">
                    <v-col cols="auto">
                      <v-icon size="48" color="success">mdi-account-check</v-icon>
                    </v-col>
                    <v-col>
                      <div class="text-overline">NOW SERVING</div>
                      <div class="text-h3 font-weight-bold">
                        {{ currentServing ? currentServing.queue_number : '---' }}
                      </div>
                      <div class="text-subtitle-1">
                        {{ currentServing ? currentServing.patient_name : 'No one' }}
                      </div>
                    </v-col>
                    <v-col cols="auto">
                      <v-btn 
                        color="error" 
                        variant="flat"
                        @click="skipCurrent"
                        :disabled="!currentServing"
                        :loading="loading"
                        class="mr-2"
                      >
                        <v-icon start>mdi-skip-forward</v-icon>
                        Skip
                      </v-btn>
                      <v-btn 
                        color="success" 
                        variant="flat"
                        @click="callNext"
                        :disabled="waitingCount === 0"
                        :loading="loading"
                      >
                        <v-icon start>mdi-chevron-right</v-icon>
                        Next
                      </v-btn>
                    </v-col>
                  </v-row>
                </v-card>
              </v-col>
            </v-row>

            <!-- Waiting List -->
            <v-row>
              <v-col cols="12">
                <div class="d-flex justify-space-between align-center mb-2">
                  <div class="text-subtitle-1 font-weight-medium">Waiting List</div>
                  <v-btn 
                    size="small" 
                    variant="text" 
                    @click="loadQueue"
                    :loading="loading"
                  >
                    <v-icon start>mdi-refresh</v-icon>
                    Refresh
                  </v-btn>
                </div>
                
                <v-list v-if="waitingList.length > 0" density="compact">
                  <v-list-item 
                    v-for="(item, index) in waitingList" 
                    :key="item.queue_number"
                    :class="{ 'bg-blue-lighten-5': index === 0 }"
                  >
                    <template v-slot:prepend>
                      <v-badge 
                        :content="index + 1" 
                        color="primary" 
                        inline
                      ></v-badge>
                    </template>
                    
                    <v-list-item-title>
                      <strong>{{ item.queue_number }}</strong> - {{ item.patient_name }}
                    </v-list-item-title>
                    
                    <v-list-item-subtitle>
                      {{ item.type || 'Walk-in' }} • {{ formatTime(item.created_at) }}
                    </v-list-item-subtitle>
                    
                    <template v-slot:append>
                      <v-btn 
                        size="small" 
                        color="primary" 
                        variant="text"
                        @click="startEncounter(item.patient_id)"
                      >
                        Start
                      </v-btn>
                    </template>
                  </v-list-item>
                </v-list>
                
                <v-empty-state
                  v-else
                  title="Queue is empty"
                  text="No patients waiting in the testing queue"
                  icon="mdi-queue"
                ></v-empty-state>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" lg="4">
        <!-- Quick Actions -->
        <v-card class="mb-4">
          <v-card-title class="text-subtitle-1 font-weight-medium">
            <v-icon start>mdi-rocket</v-icon>
            Quick Actions
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <v-btn 
              block 
              color="primary" 
              variant="flat"
              @click="navigateToEncounter"
              class="mb-2"
            >
              <v-icon start>mdi-clipboard-plus</v-icon>
              New Testing Session
            </v-btn>
            
            <v-btn 
              block 
              color="info" 
              variant="outlined"
              @click="navigateToPatientSearch"
              class="mb-2"
            >
              <v-icon start>mdi-account-search</v-icon>
              Find Patient
            </v-btn>
            
            <v-btn 
              block 
              color="warning" 
              variant="outlined"
              @click="showAddToQueueDialog = true"
            >
              <v-icon start>mdi-account-plus</v-icon>
              Add Walk-in to Queue
            </v-btn>
          </v-card-text>
        </v-card>

        <!-- Stats -->
        <v-card>
          <v-card-title class="text-subtitle-1 font-weight-medium">
            <v-icon start>mdi-chart-bar</v-icon>
            Today's Stats
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <v-row>
              <v-col cols="6">
                <div class="text-center">
                  <div class="text-h4 font-weight-bold text-success">
                    {{ stats.completed || 0 }}
                  </div>
                  <div class="text-caption text-grey">Completed</div>
                </div>
              </v-col>
              <v-col cols="6">
                <div class="text-center">
                  <div class="text-h4 font-weight-bold text-error">
                    {{ stats.skipped || 0 }}
                  </div>
                  <div class="text-caption text-grey">Skipped</div>
                </div>
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="6">
                <div class="text-center">
                  <div class="text-h4 font-weight-bold text-grey">
                    {{ stats.noShow || 0 }}
                  </div>
                  <div class="text-caption text-grey">No-Show</div>
                </div>
              </v-col>
              <v-col cols="6">
                <div class="text-center">
                  <div class="text-h4 font-weight-bold text-primary">
                    {{ waitingCount }}
                  </div>
                  <div class="text-caption text-grey">Waiting</div>
                </div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Add to Queue Dialog -->
    <v-dialog v-model="showAddToQueueDialog" max-width="500px">
      <v-card>
        <v-card-title>
          <span class="text-h6">Add Walk-in Patient</span>
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" variant="text" @click="showAddToQueueDialog = false"></v-btn>
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pt-4">
          <v-text-field
            v-model="searchQuery"
            label="Search Patient"
            placeholder="Type name or contact number..."
            variant="outlined"
            density="comfortable"
            @update:model-value="searchPatients"
            clearable
          >
            <template v-slot:append>
              <v-progress-circular
                v-if="searching"
                indeterminate
                size="24"
              ></v-progress-circular>
            </template>
          </v-text-field>
          
          <v-list v-if="searchResults.length > 0" density="compact">
            <v-list-item 
              v-for="patient in searchResults" 
              :key="patient.id"
              @click="selectPatient(patient)"
            >
              <v-list-item-title>
                {{ patient.first_name }} {{ patient.last_name }}
              </v-list-item-title>
              <v-list-item-subtitle>
                {{ patient.contact_number }} • {{ patient.patient_facility_code }}
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
          
          <v-btn 
            block 
            color="primary" 
            variant="tonal"
            @click="navigateToPatientCreate"
            class="mt-2"
          >
            <v-icon start>mdi-account-plus</v-icon>
            Register New Patient
          </v-btn>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Skip Dialog -->
    <v-dialog v-model="showSkipDialog" max-width="400px">
      <v-card>
        <v-card-title class="text-h6">
          <v-icon start color="error">mdi-alert-circle</v-icon>
          Skip Patient
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pt-4">
          <p>Why are you skipping {{ currentServing?.patient_name || 'this patient' }}?</p>
          <v-text-field
            v-model="skipReason"
            label="Reason"
            placeholder="Enter reason..."
            variant="outlined"
            density="comfortable"
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="outlined" @click="showSkipDialog = false">Cancel</v-btn>
          <v-btn color="error" @click="confirmSkip" :loading="loading">
            Skip Patient
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQueueStore } from '@/stores/queueStore'
import { usePatientStore } from '@/stores/patientStore'
import queueService from '@/services/queueService'
import patientService from '@/services/patientService'
import { io } from 'socket.io-client'

export default {
  name: 'TestingQueueView',
  setup() {
    const router = useRouter()
    const queueStore = useQueueStore()
    const patientStore = usePatientStore()
    
    const loading = ref(false)
    const searching = ref(false)
    const showAddToQueueDialog = ref(false)
    const showSkipDialog = ref(false)
    const searchQuery = ref('')
    const searchResults = ref([])
    const skipReason = ref('')
    let socket = null

    const snackbar = ref({
      show: false,
      message: '',
      color: 'success'
    })

    // Computed
    const currentServing = computed(() => queueStore.currentServing)
    const waitingList = computed(() => queueStore.waitingList)
    const waitingCount = computed(() => queueStore.waitingCount)
    const stats = computed(() => queueStore.stats)

    // Methods
    const loadQueue = async () => {
      await queueStore.loadQueue('testing')
    }

    const callNext = async () => {
      loading.value = true
      try {
        await queueStore.callNext('testing')
        showSnackbar('Next patient called', 'success')
      } catch (error) {
        showSnackbar('Failed to call next: ' + error.message, 'error')
      } finally {
        loading.value = false
      }
    }

    const skipCurrent = () => {
      if (!currentServing.value) return
      skipReason.value = ''
      showSkipDialog.value = true
    }

    const confirmSkip = async () => {
      loading.value = true
      try {
        await queueStore.skipCurrent('testing', skipReason.value || 'Skipped by staff')
        showSkipDialog.value = false
        showSnackbar('Patient skipped', 'warning')
      } catch (error) {
        showSnackbar('Failed to skip: ' + error.message, 'error')
      } finally {
        loading.value = false
      }
    }

    const searchPatients = async () => {
      if (searchQuery.value.length < 2) {
        searchResults.value = []
        return
      }
      
      searching.value = true
      try {
        const results = await patientService.searchPatients(searchQuery.value)
        searchResults.value = results.slice(0, 10)
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        searching.value = false
      }
    }

    const selectPatient = async (patient) => {
      loading.value = true
      try {
        const result = await queueService.addToQueue('testing', patient.id)
        showAddToQueueDialog.value = false
        searchQuery.value = ''
        searchResults.value = []
        showSnackbar(`${patient.first_name} ${patient.last_name} added to queue`, 'success')
        await loadQueue()
      } catch (error) {
        showSnackbar('Failed to add to queue: ' + error.message, 'error')
      } finally {
        loading.value = false
      }
    }

    const startEncounter = (patientId) => {
      if (patientId) {
        router.push(`/testing/encounter/${patientId}`)
      }
    }

    const navigateToEncounter = () => {
      router.push('/testing/encounter')
    }

    const navigateToPatientSearch = () => {
      router.push('/patients')
    }

    const navigateToPatientCreate = () => {
      showAddToQueueDialog.value = false
      router.push('/patients/create')
    }

    const formatTime = (date) => {
      if (!date) return 'N/A'
      try {
        const d = new Date(date)
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      } catch {
        return 'N/A'
      }
    }

    const showSnackbar = (message, color = 'success') => {
      snackbar.value = { show: true, message, color }
    }

    // Socket.IO setup
    const setupSocket = () => {
      const token = localStorage.getItem('token')
      if (!token) return

      socket = io(import.meta.env.VITE_WS_URL || 'http://localhost:3000', {
        auth: { token }
      })

      socket.on('connect', () => {
        socket.emit('join-queue', 'testing')
      })

      socket.on('queue-updated', (data) => {
        if (data.office === 'testing') {
          loadQueue()
        }
      })

      socket.on('next-called', (data) => {
        if (data.office === 'testing') {
          loadQueue()
        }
      })
    }

    // Lifecycle
    onMounted(() => {
      loadQueue()
      setupSocket()
    })

    onUnmounted(() => {
      if (socket) {
        socket.emit('leave-queue', 'testing')
        socket.disconnect()
      }
    })

    return {
      // State
      loading,
      searching,
      showAddToQueueDialog,
      showSkipDialog,
      searchQuery,
      searchResults,
      skipReason,
      snackbar,
      
      // Computed
      currentServing,
      waitingList,
      waitingCount,
      stats,
      
      // Methods
      loadQueue,
      callNext,
      skipCurrent,
      confirmSkip,
      searchPatients,
      selectPatient,
      startEncounter,
      navigateToEncounter,
      navigateToPatientSearch,
      navigateToPatientCreate,
      formatTime
    }
  }
}
</script>