<!-- frontend/src/pages/admin/QueueManagement.vue -->
<template>
  <v-container fluid class="pa-4 pa-md-6 queue-management">
    <!-- Header Section -->
    <v-row class="mb-4 align-center">
      <v-col cols="12" md="6">
        <div class="d-flex align-center">
          <v-btn icon variant="text" @click="goToCalendar" class="mr-2" color="primary">
            <v-icon>mdi-arrow-left</v-icon>
          </v-btn>
          <h1 class="text-h4 font-weight-medium text-primary">
            Queue Management
          </h1>
        </div>
      </v-col>

      <v-col cols="12" md="6" class="text-md-right">
        <v-btn 
          color="primary" 
          prepend-icon="mdi-calendar" 
          @click="goToCalendar"
          variant="outlined"
        >
          Back to Calendar
        </v-btn>
      </v-col>
    </v-row>

    <!-- Queue Stats -->
    <v-row class="mb-4">
      <v-col cols="12" sm="6" md="3">
        <v-card class="stat-card" elevation="2" :style="{ borderLeft: '4px solid #FFC107' }">
          <v-card-text class="text-center">
            <div class="text-subtitle-2 text-medium-emphasis">Waiting</div>
            <div class="text-h3 font-weight-bold text-warning">{{ stats.waiting_count || 0 }}</div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="stat-card" elevation="2" :style="{ borderLeft: '4px solid #2196F3' }">
          <v-card-text class="text-center">
            <div class="text-subtitle-2 text-medium-emphasis">Called</div>
            <div class="text-h3 font-weight-bold text-info">{{ stats.called_count || 0 }}</div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="stat-card" elevation="2" :style="{ borderLeft: '4px solid #9C27B0' }">
          <v-card-text class="text-center">
            <div class="text-subtitle-2 text-medium-emphasis">In Service</div>
            <div class="text-h3 font-weight-bold text-purple">{{ stats.serving_count || 0 }}</div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="stat-card" elevation="2" :style="{ borderLeft: '4px solid #4CAF50' }">
          <v-card-text class="text-center">
            <div class="text-subtitle-2 text-medium-emphasis">Est. Wait Time</div>
            <div class="text-h5 font-weight-bold text-success">{{ estimatedWaitTime }} min</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Add Walk-in Patient Card -->
    <v-row class="mb-4">
      <v-col cols="12">
        <v-card elevation="4">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-walk</v-icon>
            Add Walk-in Patient
            <v-spacer />
            <v-btn
              color="primary"
              @click="showWalkinDialog = true"
            >
              <v-icon left>mdi-plus</v-icon>
              Add Walk-in
            </v-btn>
          </v-card-title>
        </v-card>
      </v-col>
    </v-row>

    <!-- Now Serving Banner -->
    <v-row v-if="nowServing" class="mb-4">
      <v-col cols="12">
        <v-card class="now-serving-card" elevation="4" color="primary" dark>
          <v-card-text class="d-flex align-center justify-space-between pa-6">
            <div class="d-flex align-center">
              <v-icon size="48" class="mr-4">mdi-account-check</v-icon>
              <div>
                <div class="text-h6">Now Serving</div>
                <div class="text-h2 font-weight-bold">{{ nowServing.number }}</div>
                <div class="text-h5">{{ nowServing.name }} - {{ nowServing.type }}</div>
              </div>
            </div>
            <v-btn
              color="success"
              size="large"
              @click="completeServing(nowServing.id)"
              :loading="actionLoading === nowServing.id"
            >
              <v-icon left>mdi-check</v-icon>
              Complete Service
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Main Queue Display -->
    <v-row>
      <!-- Waiting Queue -->
      <v-col cols="12" md="4">
        <v-card class="queue-column" elevation="4">
          <v-card-title class="bg-warning text-white d-flex align-center">
            <v-icon class="mr-2">mdi-clock-outline</v-icon>
            Waiting ({{ queue.waiting?.length || 0 }})
            <v-spacer />
            <v-btn
              v-if="queue.waiting?.length > 0 && !nowServing"
              color="success"
              size="small"
              @click="callNextPatient"
              :loading="actionLoading === 'next'"
            >
              <v-icon left>mdi-phone</v-icon>
              Call Next
            </v-btn>
          </v-card-title>

          <v-card-text class="pa-0">
            <v-list lines="three" class="queue-list">
              <v-list-item
                v-for="(patient, index) in queue.waiting"
                :key="patient.id"
                :class="{ 'priority-high': patient.priority > 0 }"
              >
                <template v-slot:prepend>
                  <v-avatar :color="getPriorityColor(patient.priority)" size="40">
                    <span class="text-h6">{{ patient.queue_number }}</span>
                  </v-avatar>
                </template>

                <v-list-item-title class="font-weight-bold">
                  {{ patient.patient_first_name }} {{ patient.patient_last_name }}
                </v-list-item-title>
                
                <v-list-item-subtitle>
                  <div class="d-flex align-center">
                    <v-icon size="small" class="mr-1">mdi-calendar</v-icon>
                    {{ formatTime(patient.scheduled_at) }}
                    <v-chip size="x-small" class="ml-2">{{ patient.type_name }}</v-chip>
                    <v-chip 
                      v-if="patient.is_walkin" 
                      size="x-small" 
                      color="success" 
                      class="ml-2"
                    >
                      Walk-in
                    </v-chip>
                  </div>
                  <div v-if="patient.priority > 0" class="text-error">
                    <v-icon size="small">mdi-alert</v-icon>
                    Priority Patient
                  </div>
                </v-list-item-subtitle>

                <template v-slot:append>
                  <div class="d-flex flex-column align-end">
                    <div class="text-caption text-medium-emphasis mb-2">
                      Est: {{ index * 15 }} min
                    </div>
                    <div class="d-flex">
                      <v-btn
                        icon="mdi-phone"
                        size="small"
                        color="info"
                        class="mr-1"
                        @click="callPatient(patient)"
                        :disabled="nowServing"
                        :loading="actionLoading === patient.id"
                      />
                      <v-btn
                        icon="mdi-skip-next"
                        size="small"
                        color="warning"
                        @click="showSkipDialog(patient)"
                      />
                    </div>
                  </div>
                </template>
              </v-list-item>

              <v-list-item v-if="!queue.waiting?.length" class="text-center pa-8">
                <v-icon size="48" color="grey-lighten-1">mdi-account-off</v-icon>
                <div class="text-grey">No patients waiting</div>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Called Queue -->
      <v-col cols="12" md="4">
        <v-card class="queue-column" elevation="4">
          <v-card-title class="bg-info text-white">
            <v-icon class="mr-2">mdi-phone</v-icon>
            Called ({{ queue.called?.length || 0 }})
          </v-card-title>

          <v-card-text class="pa-0">
            <v-list lines="three" class="queue-list">
              <v-list-item
                v-for="patient in queue.called"
                :key="patient.id"
              >
                <template v-slot:prepend>
                  <v-avatar color="info" size="40">
                    <span class="text-h6">{{ patient.queue_number }}</span>
                  </v-avatar>
                </template>

                <v-list-item-title class="font-weight-bold">
                  {{ patient.patient_first_name }} {{ patient.patient_last_name }}
                </v-list-item-title>
                
                <v-list-item-subtitle>
                  <div>
                    <v-icon size="small" class="mr-1">mdi-clock</v-icon>
                    Called: {{ formatTime(patient.called_at) }}
                  </div>
                </v-list-item-subtitle>

                <template v-slot:append>
                  <div class="d-flex">
                    <v-btn
                      icon="mdi-play"
                      size="small"
                      color="success"
                      class="mr-1"
                      @click="startServing(patient)"
                      :loading="actionLoading === patient.id"
                    />
                    <v-btn
                      icon="mdi-skip-next"
                      size="small"
                      color="warning"
                      @click="showSkipDialog(patient)"
                    />
                  </div>
                </template>
              </v-list-item>

              <v-list-item v-if="!queue.called?.length" class="text-center pa-8">
                <v-icon size="48" color="grey-lighten-1">mdi-phone-off</v-icon>
                <div class="text-grey">No patients called</div>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Serving Queue -->
      <v-col cols="12" md="4">
        <v-card class="queue-column" elevation="4">
          <v-card-title class="bg-purple text-white">
            <v-icon class="mr-2">mdi-account-check</v-icon>
            In Service ({{ queue.serving?.length || 0 }})
          </v-card-title>

          <v-card-text class="pa-0">
            <v-list lines="three" class="queue-list">
              <v-list-item
                v-for="patient in queue.serving"
                :key="patient.id"
              >
                <template v-slot:prepend>
                  <v-avatar color="purple" size="40">
                    <span class="text-h6">{{ patient.queue_number }}</span>
                  </v-avatar>
                </template>

                <v-list-item-title class="font-weight-bold">
                  {{ patient.patient_first_name }} {{ patient.patient_last_name }}
                </v-list-item-title>
                
                <v-list-item-subtitle>
                  <div>
                    <v-icon size="small" class="mr-1">mdi-clock-start</v-icon>
                    Started: {{ formatTime(patient.served_at) }}
                  </div>
                  <div v-if="patient.served_at" class="text-caption">
                    Elapsed: {{ getElapsedTime(patient.served_at) }}
                  </div>
                </v-list-item-subtitle>

                <template v-slot:append>
                  <v-btn
                    icon="mdi-check"
                    size="small"
                    color="success"
                    @click="completeServing(patient)"
                    :loading="actionLoading === patient.id"
                  />
                </template>
              </v-list-item>

              <v-list-item v-if="!queue.serving?.length" class="text-center pa-8">
                <v-icon size="48" color="grey-lighten-1">mdi-account-off</v-icon>
                <div class="text-grey">No patients in service</div>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- History Section -->
    <v-row class="mt-6">
      <v-col cols="12">
        <v-card elevation="4">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-history</v-icon>
            Today's Queue History
            <v-spacer />
            <v-btn
              color="error"
              variant="text"
              @click="showResetDialog"
              :disabled="!hasQueueEntries"
            >
              <v-icon left>mdi-delete-sweep</v-icon>
              Reset Queue
            </v-btn>
          </v-card-title>

          <v-card-text>
            <v-table>
              <thead>
                <tr>
                  <th>Queue #</th>
                  <th>Patient</th>
                  <th>Type</th>
                  <th>Called</th>
                  <th>Served</th>
                  <th>Completed</th>
                  <th>Status</th>
                  <th>Wait Time</th>
                  <th>Service Time</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="entry in history" :key="entry.id">
                  <td class="font-weight-bold">#{{ entry.queue_number }}</td>
                  <td>{{ entry.patient_first_name }} {{ entry.patient_last_name }}</td>
                  <td>{{ entry.type_name }}</td>
                  <td>{{ entry.called_at ? formatShortTime(entry.called_at) : '-' }}</td>
                  <td>{{ entry.served_at ? formatShortTime(entry.served_at) : '-' }}</td>
                  <td>{{ entry.completed_at ? formatShortTime(entry.completed_at) : '-' }}</td>
                  <td>
                    <v-chip :color="getHistoryStatusColor(entry.status)" size="x-small">
                      {{ entry.status }}
                    </v-chip>
                  </td>
                  <td>{{ entry.wait_duration || 0 }} min</td>
                  <td>{{ entry.service_duration || 0 }} min</td>
                </tr>
                <tr v-if="!history.length">
                  <td colspan="9" class="text-center pa-4 text-grey">
                    No queue history for today
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Walk-in Dialog -->
    <v-dialog v-model="walkinDialog" max-width="600px">
      <v-card>
        <v-card-title class="bg-primary text-white">
          <v-icon class="mr-2">mdi-walk</v-icon>
          Add Walk-in Patient to Queue
        </v-card-title>

        <v-card-text class="pa-4">
          <v-form ref="walkinForm" v-model="walkinFormValid">
            <v-row>
              <v-col cols="12">
                <v-autocomplete
                  v-model="walkinData.patient"
                  :items="patients"
                  :item-title="(item) => `${item.last_name}, ${item.first_name} (${item.patient_facility_code})`"
                  :item-value="(item) => item"
                  label="Search Patient"
                  color="primary"
                  :rules="[v => !!v || 'Patient is required']"
                  prepend-inner-icon="mdi-account"
                  :loading="searchingPatients"
                  @update:search="searchPatients"
                  return-object
                  required
                  clearable
                >
                  <template v-slot:item="{ props, item }">
                    <v-list-item
                      v-bind="props"
                      :title="`${item.raw.last_name}, ${item.raw.first_name}`"
                      :subtitle="`${item.raw.patient_facility_code} | ${item.raw.hiv_status}`"
                    />
                  </template>
                </v-autocomplete>
              </v-col>

              <v-col cols="12">
                <v-select
                  v-model="walkinData.appointment_type_id"
                  :items="appointmentTypes"
                  item-title="type_name"
                  item-value="id"
                  label="Service Type"
                  color="primary"
                  :rules="[v => !!v || 'Service type is required']"
                  prepend-inner-icon="mdi-clipboard-text"
                  required
                />
              </v-col>

              <v-col cols="12">
                <v-textarea
                  v-model="walkinData.notes"
                  label="Notes"
                  color="primary"
                  prepend-inner-icon="mdi-note-text"
                  rows="2"
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeWalkinDialog">
            Cancel
          </v-btn>
          <v-btn 
            color="primary" 
            @click="addWalkinPatient"
            :loading="walkinLoading"
          >
            Add to Queue
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Skip Dialog -->
    <v-dialog v-model="skipDialog" max-width="400px">
      <v-card>
        <v-card-title class="bg-warning text-white">
          Skip Patient
        </v-card-title>

        <v-card-text class="pa-4">
          <p>Are you sure you want to skip 
            <strong>{{ skipPatient?.patient_first_name }} {{ skipPatient?.patient_last_name }}</strong>?
          </p>
          <v-textarea
            v-model="skipReason"
            label="Reason for skipping (optional)"
            rows="2"
            class="mt-2"
          />
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="skipDialog = false">
            Cancel
          </v-btn>
          <v-btn color="warning" @click="skipPatientConfirm" :loading="actionLoading">
            Skip Patient
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Reset Queue Dialog -->
    <v-dialog v-model="resetDialog" max-width="400px">
      <v-card>
        <v-card-title class="bg-error text-white">
          Reset Queue
        </v-card-title>

        <v-card-text class="pa-4">
          <p class="font-weight-bold text-error">Warning: This action cannot be undone!</p>
          <p>Are you sure you want to reset today's queue? All active queue entries will be removed.</p>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="resetDialog = false">
            Cancel
          </v-btn>
          <v-btn color="error" @click="resetQueue" :loading="actionLoading">
            Reset Queue
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar for notifications -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="3000"
      location="top"
    >
      {{ snackbar.text }}
      <template v-slot:actions>
        <v-btn color="white" variant="text" @click="snackbar.show = false">
          Close
        </v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { format, parseISO, formatDistanceToNow } from 'date-fns'
import { queueApi, appointmentsApi, patientsApi } from '@/api'
import debounce from 'lodash/debounce'

export default {
  name: 'QueueManagement',

  setup() {
    const router = useRouter()

    // State
    const loading = ref(false)
    const actionLoading = ref(null)
    const queue = ref({
      waiting: [],
      called: [],
      serving: []
    })
    const nowServing = ref(null)
    const stats = ref({})
    const history = ref([])
    const skipDialog = ref(false)
    const resetDialog = ref(false)
    const skipPatient = ref(null)
    const skipReason = ref('')

    // Walk-in state
    const walkinDialog = ref(false)
    const walkinFormValid = ref(false)
    const walkinForm = ref(null)
    const walkinLoading = ref(false)
    const appointmentTypes = ref([])
    const patients = ref([])
    const searchingPatients = ref(false)

    const walkinData = reactive({
      patient: null,
      appointment_type_id: null,
      notes: ''
    })

    const snackbar = ref({
      show: false,
      text: '',
      color: 'info'
    })

    // Computed
    const estimatedWaitTime = computed(() => {
      return (queue.value.waiting?.length || 0) * 15
    })

    const hasQueueEntries = computed(() => {
      return (queue.value.waiting?.length || 0) + 
             (queue.value.called?.length || 0) + 
             (queue.value.serving?.length || 0) > 0
    })

    // Methods
    const fetchQueueData = async () => {
      loading.value = true
      try {
        // Fetch current queue
        const queueResponse = await queueApi.getCurrent()
        
        if (queueResponse.data?.success) {
          queue.value = queueResponse.data.data || {
            waiting: [],
            called: [],
            serving: []
          }
          nowServing.value = queueResponse.data.now_serving || null
          stats.value = queueResponse.data.stats || {}
        } else {
          // Handle unwrapped response
          queue.value = {
            waiting: queueResponse.data?.waiting || [],
            called: queueResponse.data?.called || [],
            serving: queueResponse.data?.serving || []
          }
          nowServing.value = queueResponse.data?.now_serving || null
          stats.value = queueResponse.data?.stats || {}
        }

        // Fetch today's history
        await fetchQueueHistory()
      } catch (error) {
        console.error('Error fetching queue data:', error)
        showSnackbar('Failed to load queue data', 'error')
      } finally {
        loading.value = false
      }
    }

    const fetchQueueHistory = async () => {
      try {
        const today = format(new Date(), 'yyyy-MM-dd')
        const response = await queueApi.getHistory({
          start_date: today,
          end_date: today
        })

        if (response.data?.success) {
          history.value = response.data.data || []
        } else {
          history.value = response.data || []
        }
      } catch (error) {
        console.error('Error fetching queue history:', error)
        history.value = []
      }
    }

    const fetchAppointmentTypes = async () => {
      try {
        const response = await appointmentsApi.getTypes()
        if (response.data?.success) {
          appointmentTypes.value = response.data.data
        } else {
          appointmentTypes.value = response.data || []
        }
      } catch (error) {
        console.error('Error fetching appointment types:', error)
      }
    }

    // Search patients with debounce
    const searchPatients = debounce(async (search) => {
      if (!search || search.length < 2) {
        patients.value = []
        return
      }

      searchingPatients.value = true
      try {
        const response = await patientsApi.search(search, 10)
        patients.value = response.data || []
      } catch (error) {
        console.error('Error searching patients:', error)
        showSnackbar('Failed to search patients', 'error')
      } finally {
        searchingPatients.value = false
      }
    }, 500)

    const addWalkinPatient = async () => {
      if (!walkinForm.value?.validate()) return
      if (!walkinData.patient) {
        showSnackbar('Please select a patient', 'error')
        return
      }

      walkinLoading.value = true
      try {
        const response = await queueApi.addWalkin({
          patient_id: walkinData.patient.id,
          appointment_type_id: parseInt(walkinData.appointment_type_id),
          notes: walkinData.notes
        })

        if (response.data?.success) {
          showSnackbar(`Walk-in patient added to queue as #${response.data.data.queue_number}`, 'success')
          closeWalkinDialog()
          await fetchQueueData()
        }
      } catch (error) {
        console.error('Error adding walk-in:', error)
        showSnackbar(error.response?.data?.error || 'Failed to add walk-in patient', 'error')
      } finally {
        walkinLoading.value = false
      }
    }

    const closeWalkinDialog = () => {
      walkinDialog.value = false
      walkinData.patient = null
      walkinData.appointment_type_id = null
      walkinData.notes = ''
      if (walkinForm.value) {
        walkinForm.value.reset()
      }
    }

    const callNextPatient = async () => {
      actionLoading.value = 'next'
      try {
        const response = await queueApi.callPatient('next')
        
        if (response.data?.success) {
          showSnackbar('Next patient called successfully', 'success')
          await fetchQueueData()
        }
      } catch (error) {
        console.error('Error calling next patient:', error)
        showSnackbar(error.response?.data?.error || 'Failed to call next patient', 'error')
      } finally {
        actionLoading.value = null
      }
    }

    const callPatient = async (patient) => {
      actionLoading.value = patient.id
      try {
        const response = await queueApi.callPatient(patient.id)
        
        if (response.data?.success) {
          showSnackbar(`Patient #${patient.queue_number} called`, 'success')
          await fetchQueueData()
        }
      } catch (error) {
        console.error('Error calling patient:', error)
        showSnackbar(error.response?.data?.error || 'Failed to call patient', 'error')
      } finally {
        actionLoading.value = null
      }
    }

    const startServing = async (patient) => {
      actionLoading.value = patient.id
      try {
        const response = await queueApi.startServing(patient.id)
        
        if (response.data?.success) {
          showSnackbar(`Started serving patient #${patient.queue_number}`, 'success')
          await fetchQueueData()
        }
      } catch (error) {
        console.error('Error starting service:', error)
        showSnackbar(error.response?.data?.error || 'Failed to start service', 'error')
      } finally {
        actionLoading.value = null
      }
    }

    const completeServing = async (patient) => {
      actionLoading.value = patient.id
      try {
        const response = await queueApi.completeServing(patient.id)
        
        if (response.data?.success) {
          showSnackbar(`Completed service for patient #${patient.queue_number}`, 'success')
          await fetchQueueData()
        }
      } catch (error) {
        console.error('Error completing service:', error)
        showSnackbar(error.response?.data?.error || 'Failed to complete service', 'error')
      } finally {
        actionLoading.value = null
      }
    }

    const showSkipDialog = (patient) => {
      skipPatient.value = patient
      skipReason.value = ''
      skipDialog.value = true
    }

    const skipPatientConfirm = async () => {
      if (!skipPatient.value) return

      actionLoading.value = skipPatient.value.id
      try {
        const response = await queueApi.skipPatient(skipPatient.value.id, {
          reason: skipReason.value || undefined
        })
        
        if (response.data?.success) {
          showSnackbar(`Patient #${skipPatient.value.queue_number} skipped`, 'warning')
          await fetchQueueData()
          skipDialog.value = false
          skipPatient.value = null
          skipReason.value = ''
        }
      } catch (error) {
        console.error('Error skipping patient:', error)
        showSnackbar(error.response?.data?.error || 'Failed to skip patient', 'error')
      } finally {
        actionLoading.value = null
      }
    }

    const showResetDialog = () => {
      resetDialog.value = true
    }

    const resetQueue = async () => {
      actionLoading.value = 'reset'
      try {
        const response = await queueApi.resetQueue()
        
        if (response.data?.success) {
          showSnackbar('Queue reset successfully', 'success')
          await fetchQueueData()
          resetDialog.value = false
        }
      } catch (error) {
        console.error('Error resetting queue:', error)
        showSnackbar(error.response?.data?.error || 'Failed to reset queue', 'error')
      } finally {
        actionLoading.value = null
      }
    }

    const goToCalendar = () => {
      router.push('/admin/appointments')
    }

    // Utility functions
    const formatTime = (datetime) => {
      if (!datetime) return '-'
      return format(parseISO(datetime), 'h:mm a')
    }

    const formatShortTime = (datetime) => {
      if (!datetime) return '-'
      return format(parseISO(datetime), 'h:mm a')
    }

    const getElapsedTime = (startTime) => {
      if (!startTime) return '0 min'
      const start = parseISO(startTime)
      return formatDistanceToNow(start, { addSuffix: false, includeSeconds: false })
    }

    const getPriorityColor = (priority) => {
      if (priority > 0) return 'error'
      return 'warning'
    }

    const getHistoryStatusColor = (status) => {
      const colors = {
        'WAITING': 'warning',
        'CALLED': 'info',
        'SERVING': 'purple',
        'COMPLETED': 'success',
        'SKIPPED': 'error'
      }
      return colors[status] || 'grey'
    }

    const showSnackbar = (text, color = 'info') => {
      snackbar.value = {
        show: true,
        text,
        color
      }
    }

    // Auto-refresh queue data every 10 seconds
    let refreshInterval
    onMounted(() => {
      fetchQueueData()
      fetchAppointmentTypes()
      refreshInterval = setInterval(fetchQueueData, 10000)
    })

    // Cleanup on unmount
    onMounted(() => {
      return () => {
        if (refreshInterval) {
          clearInterval(refreshInterval)
        }
      }
    })

    return {
      // State
      loading,
      actionLoading,
      queue,
      nowServing,
      stats,
      history,
      skipDialog,
      resetDialog,
      skipPatient,
      skipReason,
      snackbar,

      // Walk-in state
      walkinDialog,
      walkinFormValid,
      walkinForm,
      walkinLoading,
      appointmentTypes,
      patients,
      searchingPatients,
      walkinData,

      // Computed
      estimatedWaitTime,
      hasQueueEntries,

      // Methods
      callNextPatient,
      callPatient,
      startServing,
      completeServing,
      showSkipDialog,
      skipPatientConfirm,
      showResetDialog,
      resetQueue,
      goToCalendar,
      
      // Walk-in methods
      searchPatients,
      addWalkinPatient,
      closeWalkinDialog,

      // Utilities
      formatTime,
      formatShortTime,
      getElapsedTime,
      getPriorityColor,
      getHistoryStatusColor
    }
  }
}
</script>

<style scoped>
.queue-management {
  max-width: 1600px;
  margin: 0 auto;
}

.stat-card {
  transition: transform 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.now-serving-card {
  background: linear-gradient(135deg, var(--v-primary-base) 0%, #1565C0 100%);
}

.queue-column {
  height: calc(100vh - 300px);
  display: flex;
  flex-direction: column;
}

.queue-list {
  height: 100%;
  overflow-y: auto;
}

.queue-list .v-list-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

.queue-list .v-list-item.priority-high {
  background-color: rgba(244, 67, 54, 0.05);
}

.queue-list .v-list-item:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.bg-warning {
  background-color: #FFC107 !important;
}

.bg-info {
  background-color: #2196F3 !important;
}

.bg-purple {
  background-color: #9C27B0 !important;
}

.bg-error {
  background-color: #F44336 !important;
}

.text-purple {
  color: #9C27B0 !important;
}

/* Responsive */
@media (max-width: 960px) {
  .queue-column {
    height: 500px;
    margin-bottom: 16px;
  }
}

@media (max-width: 600px) {
  .now-serving-card .v-card-text {
    flex-direction: column;
    text-align: center;
  }
  
  .now-serving-card .v-icon {
    margin-bottom: 16px;
  }
}
</style>