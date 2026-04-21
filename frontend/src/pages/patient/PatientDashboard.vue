<!-- frontend/src/pages/patient/PatientDashboard.vue -->
<!-- frontend/src/pages/patient/PatientDashboard.vue -->
<template>
  <v-container fluid class="pa-6">
    <!-- Welcome Header -->
    <div class="page-header d-flex justify-space-between align-center mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold text-primary">Welcome, {{ patient.first_name || 'Patient' }}</h1>
        <p class="text-body-1 text-medium-emphasis mt-2">
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
        <v-col cols="12" sm="6" md="4">
          <v-card elevation="2" border @click="goToAppointments" class="cursor-pointer">
            <v-card-text class="text-center">
              <v-icon color="primary" size="48" class="mb-2">mdi-calendar</v-icon>
              <div class="text-h5 font-weight-bold">{{ stats.upcomingAppointments }}</div>
              <div class="text-body-2 text-medium-emphasis">Upcoming Appointments</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" sm="6" md="4">
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
        <v-col cols="12" sm="6" md="4">
          <v-card elevation="2" border @click="goToHistory" class="cursor-pointer">
            <v-card-text class="text-center">
              <v-icon color="success" size="48" class="mb-2">mdi-history</v-icon>
              <div class="text-h5 font-weight-bold">{{ stats.totalRecords || 0 }}</div>
              <div class="text-body-2 text-medium-emphasis">Medical Records</div>
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
                        {{ appointment.type_name || 'Appointment' }}
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
            <v-card-title>
              <span>Quick Links</span>
            </v-card-title>
            <v-card-text>
              <v-list density="compact" class="quick-links-list">
                <v-list-item 
                  @click="goToProfile"
                  prepend-icon="mdi-account"
                  title="Update Profile"
                  class="cursor-pointer"
                />
                <v-list-item 
                  @click="goToAppointments"
                  prepend-icon="mdi-calendar-plus"
                  title="Book Appointment"
                  class="cursor-pointer"
                />
                <v-list-item 
                  @click="goToHistory"
                  prepend-icon="mdi-folder-open"
                  title="View Medical History"
                  class="cursor-pointer"
                />
                <v-list-item 
                  @click="showEmergencyDialog = true"
                  prepend-icon="mdi-alert-circle"
                  title="Emergency Contact"
                  class="cursor-pointer text-error"
                />
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Queue Status -->
        <v-col cols="12" class="mt-4">
          <v-card elevation="2" border>
            <v-card-title>Current Queue Status</v-card-title>
            <v-card-text>
              <div v-if="queueInfo && queueInfo.in_queue">
                <v-row>
                  <v-col cols="12" md="4">
                    <div class="text-center">
                      <div class="text-h3 font-weight-bold text-primary">{{ queueInfo.queue_number || '-' }}</div>
                      <div class="text-body-2 text-medium-emphasis">Queue Number</div>
                    </div>
                  </v-col>
                  <v-col cols="12" md="4">
                    <div class="text-center">
                      <div class="text-h3 font-weight-bold text-success">{{ queueInfo.patients_ahead || 0 }}</div>
                      <div class="text-body-2 text-medium-emphasis">Patients Ahead</div>
                    </div>
                  </v-col>
                  <v-col cols="12" md="4">
                    <div class="text-center">
                      <div class="text-h3 font-weight-bold text-warning">{{ queueInfo.estimated_wait_minutes || 0 }} min</div>
                      <div class="text-body-2 text-medium-emphasis">Est. Wait Time</div>
                    </div>
                  </v-col>
                </v-row>
              </div>
              <div v-else class="text-center py-4 text-medium-emphasis">
                <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-format-list-numbered</v-icon>
                <p>You are not currently in queue</p>
                <v-btn color="primary" variant="tonal" @click="goToAppointments" class="mt-2">
                  Book Appointment
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <!-- Emergency Contact Dialog -->
    <v-dialog v-model="showEmergencyDialog" max-width="400">
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center bg-error text-white py-2">
          <span class="text-subtitle-1">Emergency Contact</span>
          <v-btn icon dark size="small" @click="showEmergencyDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text class="pa-3">
          <div class="text-center mb-3">
            <v-icon color="error" size="48" class="mb-1">mdi-alert-circle</v-icon>
            <div class="text-subtitle-1">Need Immediate Assistance?</div>
            <div class="text-caption text-medium-emphasis">
              Contact emergency services or your healthcare provider
            </div>
          </div>

          <v-list density="compact">
            <v-list-item>
              <template v-slot:prepend>
                <v-avatar color="error" size="32">
                  <v-icon color="white" size="16">mdi-phone</v-icon>
                </v-avatar>
              </template>
              <v-list-item-title class="text-body-2">Emergency Hotline</v-list-item-title>
              <v-list-item-subtitle class="text-caption">911</v-list-item-subtitle>
              <template v-slot:append>
                <v-btn color="error" variant="text" icon="mdi-phone" size="small" href="tel:911" />
              </template>
            </v-list-item>

            <v-list-item>
              <template v-slot:prepend>
                <v-avatar color="primary" size="32">
                  <v-icon color="white" size="16">mdi-hospital-building</v-icon>
                </v-avatar>
              </template>
              <v-list-item-title class="text-body-2">Your Clinic</v-list-item-title>
              <v-list-item-subtitle class="text-caption">{{ clinicContact || '(555) 123-4567' }}</v-list-item-subtitle>
              <template v-slot:append>
                <v-btn color="primary" variant="text" icon="mdi-phone" size="small" :href="`tel:${clinicContact || '5551234567'}`" />
              </template>
            </v-list-item>
          </v-list>

          <v-alert
            type="warning"
            variant="tonal"
            class="mt-3 text-caption"
            density="compact"
          >
            <strong>For life-threatening emergencies, call 911 immediately</strong>
          </v-alert>
        </v-card-text>
      </v-card>
    </v-dialog>
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
const showEmergencyDialog = ref(false)
const patient = ref({})
const clinicContact = ref('(555) 123-4567')
const stats = ref({
  upcomingAppointments: 0,
  totalRecords: 0
})
const recentAppointments = ref([])
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
    
    // Load appointments only - removed lab results
    const appointmentsRes = await patientApi.getAppointments({ limit: 3 }).catch(err => {
      console.error('Appointments error:', err)
      return { data: { data: [] } }
    })
    
    // Load queue status
    const queueRes = await patientApi.getQueuePosition().catch(err => {
      console.error('Queue error:', err)
      return { data: null }
    })
    
    // Load stats
    const statsRes = await patientApi.getStats().catch(err => {
      console.error('Stats error:', err)
      return { data: { data: {} } }
    })

    if (appointmentsRes.data) {
      const appointmentsData = appointmentsRes.data.data
      recentAppointments.value = appointmentsData || []
      stats.value.upcomingAppointments = recentAppointments.value.length
    }

    if (queueRes.data && queueRes.data.data) {
      queueInfo.value = queueRes.data.data
    }

    if (statsRes.data && statsRes.data.data) {
      const statsData = statsRes.data.data
      stats.value = {
        ...stats.value,
        ...statsData
      }
    }
    
    // Set total records count from patient data
    stats.value.totalRecords = 1 // Placeholder for medical records count

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

function goToHistory() {
  router.push('/patient/history')
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

// Logout function
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
.appointment-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  transition: background-color 0.2s;
}
.appointment-item:hover {
  background-color: rgba(0, 0, 0, 0.02);
}
.appointment-item:last-child {
  border-bottom: none;
}
.quick-links-list .v-list-item {
  border-radius: 8px;
  margin-bottom: 4px;
}
.quick-links-list .v-list-item:hover {
  background-color: rgba(0, 0, 0, 0.04);
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