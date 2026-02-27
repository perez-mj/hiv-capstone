<!-- frontend/src/pages/patient/PatientDashboard.vue -->
<template>
  <v-container fluid class="pa-6">
    <!-- Welcome Header -->
    <div class="page-header d-flex justify-space-between align-center mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold text-primary">Welcome, {{ patient.first_name || 'Patient' }}</h1>
        <p class="text-body-1 text-medium-emphasis mt-2">
          <!-- CHANGED: from "Patient ID" to "Facility ID" -->
          Facility ID: {{ patient.patient_facility_code || patient.patient_id }}
        </p>
      </div>
      <v-btn 
        color="error" 
        variant="outlined"
        @click="logout"
        :loading="loggingOut"
        :disabled="loggingOut"
        prepend-icon="mdi-logout"
      >
        Logout
      </v-btn>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
      <p class="mt-4 text-medium-emphasis">Loading your dashboard...</p>
    </div>

    <!-- Error State -->
    <v-alert
      v-else-if="error"
      type="error"
      variant="tonal"
      class="mb-4"
      closable
      @click:close="error = null"
    >
      {{ error }}
    </v-alert>

    <!-- Dashboard Content -->
    <template v-else>
      <!-- Quick Stats -->
      <v-row class="mb-6">
        <v-col cols="12" sm="6" md="3">
          <v-card elevation="2" border @click="goToAppointments" class="cursor-pointer">
            <v-card-text class="text-center">
              <v-icon color="primary" size="48" class="mb-2">mdi-calendar</v-icon>
              <div class="text-h5 font-weight-bold">{{ stats.upcomingAppointments }}</div>
              <div class="text-body-2 text-medium-emphasis">Upcoming Appointments</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-card elevation="2" border @click="goToTestHistory" class="cursor-pointer">
            <v-card-text class="text-center">
              <v-icon color="success" size="48" class="mb-2">mdi-heart-pulse</v-icon>
              <div class="text-h5 font-weight-bold">{{ stats.totalTests }}</div>
              <div class="text-body-2 text-medium-emphasis">Lab Tests</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-card elevation="2" border @click="goToMessages" class="cursor-pointer">
            <v-card-text class="text-center">
              <v-icon color="warning" size="48" class="mb-2">mdi-message</v-icon>
              <div class="text-h5 font-weight-bold">{{ stats.unreadMessages }}</div>
              <div class="text-body-2 text-medium-emphasis">Unread Messages</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-card elevation="2" border @click="goToProfile" class="cursor-pointer">
            <v-card-text class="text-center">
              <v-icon color="info" size="48" class="mb-2">mdi-account-check</v-icon>
              <div class="text-h5 font-weight-bold">
                {{ consentStatus }}
              </div>
              <div class="text-body-2 text-medium-emphasis">Consent Status</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- HIV Status Summary -->
      <v-row class="mb-6">
        <v-col cols="12">
          <v-card elevation="2" border>
            <v-card-title>HIV Status Summary</v-card-title>
            <v-card-text>
              <v-row>
                <v-col cols="12" md="4">
                  <div class="text-body-2 text-medium-emphasis">Status</div>
                  <div class="text-h6" :class="hivStatusClass">
                    {{ hivStatus }}
                  </div>
                </v-col>
                <v-col cols="12" md="4">
                  <div class="text-body-2 text-medium-emphasis">Diagnosis Date</div>
                  <div class="text-h6">{{ formatDate(patient.diagnosis_date) || 'N/A' }}</div>
                </v-col>
                <v-col cols="12" md="4">
                  <div class="text-body-2 text-medium-emphasis">ART Start Date</div>
                  <div class="text-h6">{{ formatDate(patient.art_start_date) || 'N/A' }}</div>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Recent Activity -->
      <v-row>
        <v-col cols="12" md="6">
          <v-card elevation="2" border>
            <v-card-title class="d-flex justify-space-between align-center">
              <span>Upcoming Appointments</span>
              <v-btn variant="text" color="primary" @click="goToAppointments">
                View All
              </v-btn>
            </v-card-title>
            <v-card-text>
              <div v-if="recentAppointments.length > 0">
                <div 
                  v-for="appointment in recentAppointments" 
                  :key="appointment.id"
                  class="appointment-item py-3"
                >
                  <div class="d-flex justify-space-between align-center">
                    <div>
                      <div class="font-weight-medium">{{ formatDateTime(appointment.scheduled_at) }}</div>
                      <div class="text-caption text-medium-emphasis">
                        {{ appointment.type_name }} • Queue #{{ appointment.queue_number || 'Pending' }}
                      </div>
                    </div>
                    <v-chip size="small" :color="getAppointmentStatusColor(appointment.status)">
                      {{ appointment.status }}
                    </v-chip>
                  </div>
                </div>
              </div>
              <div v-else class="text-center py-4 text-medium-emphasis">
                <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-calendar-blank</v-icon>
                <p>No upcoming appointments</p>
                <v-btn color="primary" variant="tonal" @click="goToAppointments" class="mt-2">
                  Book Appointment
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="6">
          <v-card elevation="2" border>
            <v-card-title class="d-flex justify-space-between align-center">
              <span>Recent Lab Results</span>
              <v-btn variant="text" color="primary" @click="goToTestHistory">
                View All
              </v-btn>
            </v-card-title>
            <v-card-text>
              <div v-if="recentLabResults.length > 0">
                <div 
                  v-for="result in recentLabResults" 
                  :key="result.id"
                  class="lab-item py-3"
                >
                  <div class="d-flex justify-space-between align-center">
                    <div>
                      <div class="font-weight-medium">{{ result.test_type }}</div>
                      <div class="text-caption text-medium-emphasis">
                        {{ formatDate(result.test_date) }} • Value: {{ result.result_value }} {{ result.result_unit }}
                      </div>
                    </div>
                    <v-chip 
                      size="small" 
                      :color="getLabResultColor(result.interpretation)"
                    >
                      {{ result.interpretation || 'Normal' }}
                    </v-chip>
                  </div>
                </div>
              </div>
              <div v-else class="text-center py-4 text-medium-emphasis">
                <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-flask</v-icon>
                <p>No lab results available</p>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Queue Status -->
        <v-col cols="12" class="mt-4">
          <v-card elevation="2" border>
            <v-card-title>Current Queue Status</v-card-title>
            <v-card-text>
              <div v-if="queueInfo">
                <v-row>
                  <v-col cols="12" md="4">
                    <div class="text-center">
                      <div class="text-h3 font-weight-bold text-primary">{{ queueInfo.position || '-' }}</div>
                      <div class="text-body-2 text-medium-emphasis">Your Position</div>
                    </div>
                  </v-col>
                  <v-col cols="12" md="4">
                    <div class="text-center">
                      <div class="text-h3 font-weight-bold text-success">{{ queueInfo.waiting_count || 0 }}</div>
                      <div class="text-body-2 text-medium-emphasis">Waiting Ahead</div>
                    </div>
                  </v-col>
                  <v-col cols="12" md="4">
                    <div class="text-center">
                      <div class="text-h3 font-weight-bold text-warning">{{ queueInfo.estimated_wait || 0 }} min</div>
                      <div class="text-body-2 text-medium-emphasis">Est. Wait Time</div>
                    </div>
                  </v-col>
                </v-row>
              </div>
              <div v-else class="text-center py-4 text-medium-emphasis">
                <p>You are not currently in queue</p>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { patientApi } from '@/api'

const router = useRouter()

// State
const loading = ref(true)
const error = ref(null)
const loggingOut = ref(false)
const patient = ref({})
const stats = ref({
  upcomingAppointments: 0,
  totalTests: 0,
  unreadMessages: 0
})
const recentAppointments = ref([])
const recentLabResults = ref([])
const queueInfo = ref(null)

// Computed properties
const consentStatus = computed(() => {
  if (patient.value.consent === true || patient.value.consent === 1) return 'YES'
  if (patient.value.consent === false || patient.value.consent === 0) return 'NO'
  return patient.value.consent_status || 'Pending'
})

const hivStatus = computed(() => {
  return patient.value.hiv_status || 'Unknown'
})

const hivStatusClass = computed(() => {
  const status = patient.value.hiv_status?.toLowerCase()
  if (status === 'reactive') return 'text-error'
  if (status === 'non-reactive') return 'text-success'
  return 'text-warning'
})

// Lifecycle
onMounted(async () => {
  await loadPatientData()
  await loadDashboardData()
})

// Methods
async function loadPatientData() {
  try {
    const patientData = localStorage.getItem('patientData')
    if (patientData) {
      patient.value = JSON.parse(patientData)
    }
    
    const response = await patientApi.getProfile()
    if (response.data.success) {
      patient.value = response.data.data
      localStorage.setItem('patientData', JSON.stringify(response.data.data))
    }
  } catch (err) {
    console.error('Error loading patient data:', err)
    if (!patient.value.first_name) {
      error.value = 'Failed to load patient information'
    }
  }
}

async function loadDashboardData() {
  try {
    loading.value = true
    error.value = null
    
    console.log('Loading patient dashboard data...')
    
    const [appointmentsRes, labResultsRes, queueRes, statsRes] = await Promise.allSettled([
      patientApi.getAppointments({ limit: 3 }).catch(err => {
        console.error('Appointments error:', err)
        return { data: { data: [] } }
      }),
      patientApi.getLabResults({ limit: 3 }).catch(err => {
        console.error('Lab results error:', err)
        return { data: { data: [] } }
      }),
      patientApi.getQueuePosition().catch(err => {
        console.error('Queue error:', err)
        return { data: null }
      }),
      patientApi.getStats().catch(err => {
        console.error('Stats error:', err)
        return { data: { data: {} } }
      })
    ])

    if (appointmentsRes.status === 'fulfilled') {
      const appointmentsData = appointmentsRes.value.data
      recentAppointments.value = appointmentsData.data || appointmentsData || []
      stats.value.upcomingAppointments = recentAppointments.value.length
    }

    if (labResultsRes.status === 'fulfilled') {
      const labData = labResultsRes.value.data
      recentLabResults.value = labData.data || labData || []
      stats.value.totalTests = recentLabResults.value.length
    }

    if (queueRes.status === 'fulfilled' && queueRes.value.data) {
      queueInfo.value = queueRes.value.data
    }

    if (statsRes.status === 'fulfilled' && statsRes.value.data) {
      const statsData = statsRes.value.data
      stats.value = {
        ...stats.value,
        ...(statsData.data || statsData)
      }
    }

    console.log('Dashboard data loaded successfully')
  } catch (err) {
    console.error('Error loading dashboard data:', err)
    error.value = 'Unable to load some dashboard data. Please refresh the page.'
  } finally {
    loading.value = false
  }
}

// Navigation methods
function goToAppointments() {
  router.push('/patient/appointments')
}

function goToTestHistory() {
  router.push('/patient/history')
}

function goToMessages() {
  router.push('/patient/messages')
}

function goToProfile() {
  router.push('/patient/profile')
}

// Utility methods
function getAppointmentStatusColor(status) {
  const colors = {
    'SCHEDULED': 'primary',
    'CONFIRMED': 'success',
    'IN_PROGRESS': 'warning',
    'COMPLETED': 'info',
    'CANCELLED': 'error',
    'NO_SHOW': 'grey'
  }
  return colors[status] || 'grey'
}

function getLabResultColor(interpretation) {
  const interpretation_lower = (interpretation || '').toLowerCase()
  if (interpretation_lower.includes('abnormal') || interpretation_lower.includes('reactive')) {
    return 'error'
  }
  if (interpretation_lower.includes('normal') || interpretation_lower.includes('non-reactive')) {
    return 'success'
  }
  return 'warning'
}

function formatDate(dateString) {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function formatDateTime(dateString) {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// FIXED: Logout function
async function logout() {
  if (loggingOut.value) return
  
  loggingOut.value = true
  console.log('Logging out...')
  
  try {
    localStorage.removeItem('patientToken')
    localStorage.removeItem('patientData')
    localStorage.removeItem('authToken')
    localStorage.removeItem('authUser')
    localStorage.removeItem('userRole')
    
    sessionStorage.clear()
    
    console.log('Storage cleared, redirecting to login...')
    
    window.location.href = '/patient/login'
    
  } catch (error) {
    console.error('Logout error:', error)
    window.location.href = '/patient/login'
  }
}
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.cursor-pointer:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1) !important;
}

.appointment-item, .lab-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  transition: background-color 0.2s;
}

.appointment-item:hover, .lab-item:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.appointment-item:last-child, .lab-item:last-child {
  border-bottom: none;
}

@media (max-width: 600px) {
  .v-container {
    padding: 12px !important;
  }
  
  .text-h4 {
    font-size: 1.5rem !important;
  }
}
</style>