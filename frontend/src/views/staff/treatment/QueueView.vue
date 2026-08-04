<!-- frontend/src/views/staff/treatment/QueueView.vue -->
<template>
  <v-container fluid class="pa-4">
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="text-h5">
            <v-icon left>mdi-pill</v-icon>
            Treatment Office Queue
            <v-spacer></v-spacer>
            <v-chip color="primary" small>
              {{ currentDate }}
            </v-chip>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <div class="d-flex justify-space-between align-center mb-4">
              <div>
                <v-btn color="primary" @click="callNext" :disabled="!hasWaiting" :loading="loading">
                  <v-icon left>mdi-arrow-right</v-icon>
                  Call Next
                </v-btn>
                <v-btn color="warning" class="ml-2" @click="skipCurrent" :disabled="!currentServing" :loading="loading">
                  <v-icon left>mdi-skip-next</v-icon>
                  Skip
                </v-btn>
                <v-btn color="error" class="ml-2" @click="markNoShow" :disabled="!currentServing" :loading="loading">
                  <v-icon left>mdi-account-off</v-icon>
                  No-Show
                </v-btn>
              </div>
              <div>
                <v-btn color="info" @click="refresh" :loading="loading">
                  <v-icon left>mdi-refresh</v-icon>
                  Refresh
                </v-btn>
              </div>
            </div>

            <!-- Current Serving Display -->
            <v-card outlined class="mb-4" :color="currentServing ? 'primary lighten-5' : ''">
              <v-card-text>
                <div class="d-flex align-center justify-space-between">
                  <div>
                    <span class="text-subtitle-1">Now Serving:</span>
                    <span v-if="currentServing" class="text-h5 ml-2">
                      {{ currentServing.queue_number }}
                    </span>
                    <span v-else class="text-h5 ml-2 text-grey">--</span>
                  </div>
                  <div v-if="currentServing">
                    <span class="text-h6">{{ currentServing.patient_name }}</span>
                    <v-chip color="primary" small class="ml-2">In Progress</v-chip>
                  </div>
                </div>
              </v-card-text>
            </v-card>

            <!-- Waiting List -->
            <v-data-table
              :headers="queueHeaders"
              :items="waitingList"
              :loading="loading"
              items-per-page="10"
            >
              <template v-slot:item.position="{ item }">
                <v-chip small color="grey lighten-2">{{ item.position }}</v-chip>
              </template>
              <template v-slot:item.patient_name="{ item }">
                <v-chip small :color="item.appointment_type === 'scheduled' ? 'primary' : 'orange'" text-color="white">
                  {{ item.appointment_type === 'scheduled' ? 'Scheduled' : 'Walk-in' }}
                </v-chip>
                {{ item.patient_name }}
              </template>
              <template v-slot:item.created_at="{ item }">
                {{ formatTime(item.created_at) }}
              </template>
              <template v-slot:item.actions="{ item }">
                <v-btn icon small color="primary" @click="selectPatient(item)">
                  <v-icon small>mdi-account</v-icon>
                </v-btn>
                <v-btn icon small color="success" @click="startEncounter(item)" v-if="item.patient_id">
                  <v-icon small>mdi-pill</v-icon>
                </v-btn>
              </template>
            </v-data-table>

            <!-- Queue Statistics -->
            <v-row class="mt-4">
              <v-col cols="12" md="3">
                <v-card outlined>
                  <v-card-text class="text-center">
                    <div class="text-h5 text-primary">{{ stats.completed }}</div>
                    <div class="text-caption">Completed</div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" md="3">
                <v-card outlined>
                  <v-card-text class="text-center">
                    <div class="text-h5 text-warning">{{ stats.skipped }}</div>
                    <div class="text-caption">Skipped</div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" md="3">
                <v-card outlined>
                  <v-card-text class="text-center">
                    <div class="text-h5 text-error">{{ stats.noShow }}</div>
                    <div class="text-caption">No-Show</div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" md="3">
                <v-card outlined>
                  <v-card-text class="text-center">
                    <div class="text-h5 text-info">{{ stats.total || 0 }}</div>
                    <div class="text-caption">Total Today</div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Patient Action Dialog -->
    <v-dialog v-model="patientDialog" max-width="600px">
      <v-card>
        <v-card-title>
          <span class="text-h6">Patient Actions</span>
          <v-spacer></v-spacer>
          <v-btn icon @click="patientDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pt-4">
          <div v-if="selectedPatient">
            <div class="text-subtitle-1 font-weight-bold">
              {{ selectedPatient.patient_name }}
            </div>
            <div class="text-caption text-grey">Queue: {{ selectedPatient.queue_number }}</div>
            <div class="text-caption text-grey">Type: {{ selectedPatient.appointment_type }}</div>
            
            <v-divider class="my-3"></v-divider>

            <v-row>
              <v-col cols="12">
                <v-btn block color="primary" @click="startEncounter(selectedPatient)">
                  <v-icon left>mdi-pill</v-icon>
                  Start Treatment
                </v-btn>
              </v-col>
              <v-col cols="12">
                <v-btn block outlined color="info" @click="viewPatientHistory">
                  <v-icon left>mdi-history</v-icon>
                  View History
                </v-btn>
              </v-col>
            </v-row>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import queueService from '@/services/queueService'
import socketService from '@/services/socketService'

export default {
  name: 'TreatmentQueue',
  setup() {
    const router = useRouter()
    const office = ref('treatment')
    const loading = ref(false)
    const currentServing = ref(null)
    const waitingList = ref([])
    const stats = ref({
      completed: 0,
      skipped: 0,
      noShow: 0,
      total: 0
    })
    const patientDialog = ref(false)
    const selectedPatient = ref(null)
    const currentDate = ref(new Date().toLocaleDateString())

    const snackbar = ref({
      show: false,
      message: '',
      color: 'success'
    })

    const queueHeaders = [
      { title: '#', key: 'position', align: 'center', width: '80' },
      { title: 'Queue #', key: 'queue_number', align: 'center' },
      { title: 'Patient Name', key: 'patient_name' },
      { title: 'Type', key: 'patient_name' },
      { title: 'Arrived', key: 'created_at', align: 'center' },
      { title: 'Actions', key: 'actions', align: 'center', sortable: false }
    ]

    const hasWaiting = computed(() => waitingList.value.length > 0)

    const loadQueue = async () => {
      loading.value = true
      try {
        const response = await queueService.getQueueState(office.value)
        currentServing.value = response.current_serving
        waitingList.value = response.waiting_list
        stats.value = {
          completed: response.stats?.completed || 0,
          skipped: response.stats?.skipped || 0,
          noShow: response.stats?.noshow || 0,
          total: (response.stats?.completed || 0) + (response.stats?.skipped || 0) + (response.stats?.noshow || 0)
        }
      } catch (error) {
        showSnackbar('Failed to load queue: ' + error.message, 'error')
      } finally {
        loading.value = false
      }
    }

    const callNext = async () => {
      try {
        const result = await queueService.callNext(office.value)
        showSnackbar(`Called: ${result.queue_number} - ${result.patient_name}`, 'success')
        await loadQueue()
      } catch (error) {
        showSnackbar('Failed to call next: ' + error.message, 'error')
      }
    }

    const skipCurrent = async () => {
      if (!confirm('Skip current patient?')) return
      try {
        await queueService.skipCurrent(office.value, 'Skipped by staff')
        showSnackbar('Patient skipped', 'warning')
        await loadQueue()
      } catch (error) {
        showSnackbar('Failed to skip: ' + error.message, 'error')
      }
    }

    const markNoShow = async () => {
      if (!confirm('Mark current patient as no-show?')) return
      try {
        await queueService.skipCurrent(office.value, 'No-show')
        showSnackbar('Patient marked as no-show', 'error')
        await loadQueue()
      } catch (error) {
        showSnackbar('Failed to mark no-show: ' + error.message, 'error')
      }
    }

    const refresh = () => {
      loadQueue()
    }

    const selectPatient = (patient) => {
      selectedPatient.value = patient
      patientDialog.value = true
    }

    const startEncounter = (patient) => {
      patientDialog.value = false
      router.push(`/treatment/encounter/${patient.patient_id}`)
    }

    const viewPatientHistory = () => {
      patientDialog.value = false
      router.push(`/treatment/history/${selectedPatient.value.patient_id}`)
    }

    const formatTime = (timestamp) => {
      if (!timestamp) return 'N/A'
      const date = new Date(timestamp)
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    const showSnackbar = (message, color = 'success') => {
      snackbar.value = { show: true, message, color }
    }

    // Socket listeners
    const handleQueueUpdate = (data) => {
      if (data.office === office.value) {
        loadQueue()
      }
    }

    const handleNextCalled = (data) => {
      if (data.office === office.value) {
        loadQueue()
        showSnackbar(`Now serving: ${data.queue_number}`, 'info')
      }
    }

    onMounted(() => {
      loadQueue()
      
      socketService.connect()
      socketService.joinRoom(office.value)
      socketService.on('queue-updated', handleQueueUpdate)
      socketService.on('next-called', handleNextCalled)
    })

    onBeforeUnmount(() => {
      socketService.leaveRoom(office.value)
      socketService.off('queue-updated', handleQueueUpdate)
      socketService.off('next-called', handleNextCalled)
    })

    return {
      office,
      loading,
      currentServing,
      waitingList,
      stats,
      patientDialog,
      selectedPatient,
      currentDate,
      queueHeaders,
      hasWaiting,
      loadQueue,
      callNext,
      skipCurrent,
      markNoShow,
      refresh,
      selectPatient,
      startEncounter,
      viewPatientHistory,
      formatTime,
      snackbar
    }
  }
}
</script>