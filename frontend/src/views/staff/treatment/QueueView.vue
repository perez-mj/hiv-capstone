<!-- frontend/src/views/staff/treatment/QueueView.vue -->
<template>
  <v-container fluid class="pa-4">
    <v-row>
      <v-col cols="12" lg="8">
        <!-- Queue Display -->
        <v-card>
          <v-card-title class="text-h5">
            <v-icon start>mdi-format-list-numbered</v-icon>
            Treatment Queue
            <v-spacer></v-spacer>
            <v-chip color="primary" variant="flat">
              {{ waitingCount }} waiting
            </v-chip>
            <v-chip color="warning" variant="flat" class="ml-2">
              {{ inProgressCount }} in progress
            </v-chip>
            <v-btn 
              color="error" 
              variant="tonal" 
              class="ml-3"
              @click="showEndDayDialog = true"
            >
              <v-icon start>mdi-clock-end</v-icon>
              End Day
            </v-btn>
          </v-card-title>
          <v-divider></v-divider>
          
          <v-card-text>
            <!-- Now Serving -->
            <v-row class="mb-4">
              <v-col cols="12">
                <v-card 
                  :color="currentServing ? 'success' : 'grey'"
                  variant="tonal" 
                  class="pa-4"
                >
                  <v-row align="center">
                    <v-col cols="auto">
                      <v-icon size="48" :color="currentServing ? 'success' : 'grey'">
                        mdi-account-check
                      </v-icon>
                    </v-col>
                    <v-col>
                      <div class="text-overline">NOW SERVING</div>
                      <div class="text-h3 font-weight-bold">
                        {{ currentServing ? currentServing.queue_number : '---' }}
                      </div>
                      <div class="text-subtitle-1">
                        {{ currentServing ? currentServing.patient_name : 'No one' }}
                      </div>
                      <div class="text-caption" v-if="currentServing">
                        Status: {{ currentServing.status }}
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
                        :disabled="waitingCount === 0 && !currentServing"
                        :loading="loading"
                      >
                        <v-icon start>mdi-chevron-right</v-icon>
                        {{ currentServing ? 'Complete & Next' : 'Call Next' }}
                      </v-btn>
                    </v-col>
                  </v-row>
                  
                  <!-- Current patient action buttons -->
                  <v-row v-if="currentServing" class="mt-2">
                    <v-col cols="12">
                      <v-btn 
                        color="primary" 
                        variant="tonal"
                        @click="continueEncounter(currentServing.patient_id)"
                        class="mr-2"
                      >
                        <v-icon start>mdi-clipboard-pulse</v-icon>
                        Continue Encounter
                      </v-btn>
                      <v-btn 
                        color="success" 
                        variant="tonal"
                        @click="completeCurrentPatient"
                        :loading="completing"
                      >
                        <v-icon start>mdi-check-circle</v-icon>
                        Mark as Completed
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
                  <div>
                    <v-btn 
                      size="small" 
                      variant="text" 
                      @click="loadQueue"
                      :loading="loading"
                      class="mr-2"
                    >
                      <v-icon start>mdi-refresh</v-icon>
                      Refresh
                    </v-btn>
                  </div>
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
                      <v-chip 
                        v-if="item.appointment_id" 
                        size="x-small" 
                        color="info"
                      >
                        Scheduled
                      </v-chip>
                    </v-list-item-subtitle>
                    
                    <template v-slot:append>
                      <v-btn 
                        size="small" 
                        color="primary" 
                        variant="flat"
                        @click="startEncounter(item.patient_id)"
                        :loading="starting === item.patient_id"
                      >
                        <v-icon start size="16">mdi-play</v-icon>
                        Start
                      </v-btn>
                      <v-btn 
                        size="small" 
                        color="grey" 
                        variant="text"
                        @click="markNoShow(item)"
                        class="ml-1"
                      >
                        <v-icon start size="16">mdi-account-remove</v-icon>
                        No-Show
                      </v-btn>
                    </template>
                  </v-list-item>
                </v-list>
                
                <v-empty-state
                  v-else
                  title="Queue is empty"
                  text="No patients waiting in the treatment queue"
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
              New Treatment Session
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
          <v-alert type="info" variant="tonal" class="mb-3">
            <strong>Note:</strong> Only patients with status "treatment" can be added to the treatment queue.
          </v-alert>
          
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
                <v-chip 
                  :color="patient.status === 'treatment' ? 'success' : 'warning'" 
                  size="x-small"
                  class="ml-2"
                >
                  {{ patient.status }}
                </v-chip>
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

    <!-- End Day Dialog -->
    <v-dialog v-model="showEndDayDialog" max-width="600px" persistent>
      <v-card>
        <v-card-title class="text-h6">
          <v-icon start color="warning">mdi-clock-end</v-icon>
          End Day - Treatment Office
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pt-4">
          <v-alert 
            type="warning" 
            variant="tonal"
            class="mb-4"
          >
            <div class="font-weight-medium">End of Day Summary</div>
            <div>Completed: {{ stats.completed || 0 }}</div>
            <div>Skipped: {{ stats.skipped || 0 }}</div>
            <div>No-Show: {{ stats.noShow || 0 }}</div>
            <div class="font-weight-medium mt-2">
              Waiting: {{ waitingList.length }}
            </div>
          </v-alert>

          <div v-if="waitingList.length > 0" class="mb-4">
            <div class="text-subtitle-1 font-weight-medium mb-2">
              {{ waitingList.length }} patients still waiting:
            </div>
            <v-list density="compact">
              <v-list-item v-for="item in waitingList" :key="item.id">
                <v-list-item-title>{{ item.queue_number }} - {{ item.patient_name }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </div>

          <v-select
            v-model="endDayAction"
            :items="endDayOptions"
            label="Action for remaining patients"
            variant="outlined"
            density="comfortable"
            required
          ></v-select>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="outlined" @click="showEndDayDialog = false">Cancel</v-btn>
          <v-btn color="error" @click="confirmEndDay" :loading="endingDay">
            <v-icon start>mdi-check</v-icon>
            End Day
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
import patientService from '@/services/patientService'
import { io } from 'socket.io-client'

export default {
  name: 'TreatmentQueueView',
  setup() {
    const router = useRouter()
    const queueStore = useQueueStore()
    
    const loading = ref(false)
    const searching = ref(false)
    const starting = ref(null)
    const completing = ref(false)
    const endingDay = ref(false)
    
    const showAddToQueueDialog = ref(false)
    const showSkipDialog = ref(false)
    const showEndDayDialog = ref(false)
    
    const searchQuery = ref('')
    const searchResults = ref([])
    const skipReason = ref('')
    const endDayAction = ref('noshow')
    
    let socket = null

    const snackbar = ref({
      show: false,
      message: '',
      color: 'success'
    })

    const endDayOptions = [
      { title: 'Mark all as No-Show', value: 'noshow' },
      { title: 'Carry over to tomorrow', value: 'carryover' },
      { title: 'Mark as Skipped', value: 'skipped' }
    ]

    // Computed
    const currentServing = computed(() => queueStore.currentServing)
    const waitingList = computed(() => queueStore.waitingList)
    const waitingCount = computed(() => queueStore.waitingCount)
    const stats = computed(() => queueStore.stats)
    
    const inProgressCount = computed(() => {
      return waitingList.value.filter(item => item.status === 'in-progress').length
    })

    // Methods
    const loadQueue = async () => {
      await queueStore.loadQueue('treatment')
    }

    const callNext = async () => {
      if (currentServing.value && currentServing.value.status === 'in-progress') {
        const confirmComplete = confirm(
          `${currentServing.value.patient_name} is currently in progress. Complete them first?`
        )
        if (confirmComplete) {
          await completeCurrentPatient()
        } else {
          return
        }
      }

      loading.value = true
      try {
        const result = await queueStore.callNext('treatment')
        showSnackbar('Next patient called', 'success')
      } catch (error) {
        showSnackbar('Failed to call next: ' + error.message, 'error')
      } finally {
        loading.value = false
      }
    }

    const startEncounter = async (patientId) => {
      if (!patientId) return
      
      starting.value = patientId
      try {
        router.push(`/treatment/encounter/${patientId}`)
      } catch (error) {
        showSnackbar('Failed to start encounter: ' + error.message, 'error')
      } finally {
        starting.value = null
      }
    }

    const continueEncounter = (patientId) => {
      if (patientId) {
        router.push(`/treatment/encounter/${patientId}`)
      }
    }

    const completeCurrentPatient = async () => {
      if (!currentServing.value) return
      
      completing.value = true
      try {
        await queueStore.completeCurrent('treatment')
        showSnackbar('Patient marked as completed', 'success')
      } catch (error) {
        showSnackbar('Failed to complete: ' + error.message, 'error')
      } finally {
        completing.value = false
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
        await queueStore.skipCurrent('treatment', skipReason.value || 'Skipped by staff')
        showSkipDialog.value = false
        showSnackbar('Patient skipped', 'warning')
      } catch (error) {
        showSnackbar('Failed to skip: ' + error.message, 'error')
      } finally {
        loading.value = false
      }
    }

    const markNoShow = async (item) => {
      if (!confirm(`Mark ${item.patient_name} as No-Show?`)) return
      
      loading.value = true
      try {
        await queueStore.markNoShow('treatment', item.id)
        showSnackbar(`${item.patient_name} marked as No-Show`, 'warning')
      } catch (error) {
        showSnackbar('Failed to mark no-show: ' + error.message, 'error')
      } finally {
        loading.value = false
      }
    }

    const confirmEndDay = async () => {
      endingDay.value = true
      try {
        // The store will handle date formatting automatically
        const result = await queueStore.resetQueue('treatment')
        
        showEndDayDialog.value = false
        showSnackbar(`Day ended successfully. ${result.message}`, 'success')
        
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      } catch (error) {
        showSnackbar('Failed to end day: ' + error.message, 'error')
      } finally {
        endingDay.value = false
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
        // Only show treatment patients
        searchResults.value = results.filter(p => p.status === 'treatment').slice(0, 10)
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        searching.value = false
      }
    }

    const selectPatient = async (patient) => {
      if (patient.status !== 'treatment') {
        showSnackbar('Patient must be in treatment status', 'warning')
        return
      }
      
      loading.value = true
      try {
        await queueStore.addToQueue('treatment', patient.id)
        showAddToQueueDialog.value = false
        searchQuery.value = ''
        searchResults.value = []
        showSnackbar(`${patient.first_name} ${patient.last_name} added to queue`, 'success')
      } catch (error) {
        showSnackbar('Failed to add to queue: ' + error.message, 'error')
      } finally {
        loading.value = false
      }
    }

    const navigateToEncounter = () => {
      router.push('/treatment/encounter')
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
        socket.emit('join-queue', 'treatment')
      })

      socket.on('queue-updated', (data) => {
        if (data.office === 'treatment') {
          // Use the store's update method
          queueStore.updateQueueFromSocket(data)
        }
      })

      socket.on('next-called', (data) => {
        if (data.office === 'treatment') {
          queueStore.loadQueue('treatment')
        }
      })

      socket.on('encounter-completed', (data) => {
        if (data.office === 'treatment') {
          queueStore.loadQueue('treatment')
        }
      })
    }

    onMounted(() => {
      loadQueue()
      setupSocket()
    })

    onUnmounted(() => {
      if (socket) {
        socket.emit('leave-queue', 'treatment')
        socket.disconnect()
      }
    })

    return {
      loading,
      searching,
      starting,
      completing,
      endingDay,
      showAddToQueueDialog,
      showSkipDialog,
      showEndDayDialog,
      searchQuery,
      searchResults,
      skipReason,
      endDayAction,
      snackbar,
      currentServing,
      waitingList,
      waitingCount,
      stats,
      inProgressCount,
      endDayOptions,
      loadQueue,
      callNext,
      startEncounter,
      continueEncounter,
      completeCurrentPatient,
      skipCurrent,
      confirmSkip,
      markNoShow,
      confirmEndDay,
      searchPatients,
      selectPatient,
      navigateToEncounter,
      navigateToPatientSearch,
      navigateToPatientCreate,
      formatTime
    }
  }
}
</script>