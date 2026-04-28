<!-- frontend/src/pages/patient/PatientDashboard.vue -->
<template>
  <div class="patient-dashboard">
    <!-- Welcome Header -->
    <v-card class="welcome-card mb-4" color="primary" dark>
      <v-card-text class="pa-4">
        <div class="d-flex align-center">
          <v-avatar size="56" class="mr-3" color="white">
            <v-icon large color="primary">mdi-account-circle</v-icon>
          </v-avatar>
          <div>
            <div class="text-subtitle-1">Welcome back,</div>
            <div class="text-h5 font-weight-bold">{{ patientName }}</div>
            <div class="text-caption">{{ currentDate }}</div>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <!-- Stats Cards -->
    <v-row class="mb-4">
      <v-col cols="6" sm="3" v-for="stat in stats" :key="stat.title">
        <v-card :to="stat.link" class="stat-card" elevation="2">
          <v-card-text class="text-center pa-3">
            <v-icon size="32" :color="stat.color" class="mb-2">{{ stat.icon }}</v-icon>
            <div class="text-h6 font-weight-bold">{{ stat.value }}</div>
            <div class="text-caption text-medium-emphasis">{{ stat.title }}</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Next Appointment -->
    <v-card v-if="nextAppointment" class="mb-4" elevation="2">
      <v-card-title class="d-flex justify-space-between align-center">
        <span>Next Appointment</span>
        <v-chip :color="appointmentStatusColor(nextAppointment.status)" text-color="white" size="small">
          {{ nextAppointment.status }}
        </v-chip>
      </v-card-title>
      <v-card-text>
        <v-list lines="two">
          <v-list-item>
            <template v-slot:prepend>
              <v-icon>mdi-calendar</v-icon>
            </template>
            <v-list-item-title class="font-weight-bold">
              {{ formatDate(nextAppointment.scheduled_at) }}
            </v-list-item-title>
            <v-list-item-subtitle>
              {{ formatTime(nextAppointment.scheduled_at) }}
            </v-list-item-subtitle>
          </v-list-item>
          <v-list-item>
            <template v-slot:prepend>
              <v-icon>mdi-clipboard-text</v-icon>
            </template>
            <v-list-item-title>{{ nextAppointment.type_name || 'Consultation' }}</v-list-item-title>
            <v-list-item-subtitle>Appointment #{{ nextAppointment.appointment_number }}</v-list-item-subtitle>
          </v-list-item>
        </v-list>
        <v-divider class="my-3"></v-divider>
        <div class="d-flex gap-3">
          <v-btn color="error" variant="tonal" block @click="cancelAppointment(nextAppointment)" 
            :disabled="!canCancel(nextAppointment.scheduled_at)">
            Cancel Appointment
          </v-btn>
          <v-btn color="primary" variant="text" to="/patient/appointments">View All</v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- Quick Actions -->
    <v-card class="mb-4" elevation="2">
      <v-card-title>Quick Actions</v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="6" sm="3" v-for="action in quickActions" :key="action.title">
            <v-btn :to="action.link" block variant="outlined" class="quick-action-btn">
              <v-icon :icon="action.icon" class="mr-2"></v-icon>
              {{ action.title }}
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Recent Lab Results -->
    <v-card v-if="recentLabs.length" class="mb-4" elevation="2">
      <v-card-title class="d-flex justify-space-between align-center">
        <span>Recent Lab Results</span>
        <v-btn variant="text" size="small" to="/patient/history">View All</v-btn>
      </v-card-title>
      <v-card-text>
        <v-list>
          <v-list-item v-for="lab in recentLabs.slice(0, 3)" :key="lab.id" :to="`/patient/history?tab=labs`">
            <template v-slot:prepend>
              <v-icon :color="getLabStatusColor(lab)" size="24">
                {{ getLabIcon(lab.test_type) }}
              </v-icon>
            </template>
            <v-list-item-title>
              {{ formatLabType(lab.test_type) }}
            </v-list-item-title>
            <v-list-item-subtitle>
              {{ formatDate(lab.test_date) }} - {{ lab.result_value }} {{ lab.result_unit }}
            </v-list-item-subtitle>
            <template v-slot:append>
              <v-chip :color="getLabStatusColor(lab)" size="x-small" text-color="white">
                {{ getLabStatus(lab) }}
              </v-chip>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>

    <!-- Queue Status -->
    <v-card v-if="queueStatus" color="info" variant="tonal" class="mb-4">
      <v-card-text class="pa-4">
        <div class="d-flex align-center justify-space-between">
          <div>
            <v-icon size="28" class="mr-2">mdi-queue-first-in-last-out</v-icon>
            <span class="font-weight-bold">Current Queue Status</span>
          </div>
          <v-chip color="info" text-color="white">Position #{{ queueStatus.position }}</v-chip>
        </div>
        <div class="mt-2 text-center">
          <v-progress-linear :model-value="queueStatus.progress" height="8" rounded></v-progress-linear>
          <div class="text-caption mt-1">{{ queueStatus.estimatedWait }} estimated wait</div>
        </div>
      </v-card-text>
    </v-card>

    <!-- Recent Encounters -->
    <v-card v-if="recentEncounters.length" elevation="2">
      <v-card-title class="d-flex justify-space-between align-center">
        <span>Recent Visits</span>
        <v-btn variant="text" size="small" to="/patient/history">View All</v-btn>
      </v-card-title>
      <v-card-text>
        <v-timeline side="end" density="compact">
          <v-timeline-item v-for="encounter in recentEncounters.slice(0, 3)" :key="encounter.id"
            :dot-color="getEncounterColor(encounter.type)" size="small">
            <div class="d-flex justify-space-between">
              <div>
                <div class="font-weight-bold">{{ formatEncounterType(encounter.type) }}</div>
                <div class="text-caption text-medium-emphasis">
                  {{ formatDate(encounter.encounter_date) }} with Dr. {{ encounter.staff_last_name }}
                </div>
              </div>
              <v-icon size="20" :color="getEncounterColor(encounter.type)">mdi-chevron-right</v-icon>
            </div>
          </v-timeline-item>
        </v-timeline>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useSnackbarStore } from '@/stores/snackbar'
import { patientApi } from '@/api'

const authStore = useAuthStore()
const snackbarStore = useSnackbarStore()

// State
const loading = ref(true)
const stats = ref([
  { title: 'Appointments', value: 0, icon: 'mdi-calendar', color: 'primary', link: '/patient/appointments' },
  { title: 'Lab Tests', value: 0, icon: 'mdi-microscope', color: 'success', link: '/patient/history?tab=labs' },
  { title: 'Visits', value: 0, icon: 'mdi-hospital', color: 'info', link: '/patient/history?tab=encounters' },
  { title: 'Active', value: 0, icon: 'mdi-chart-line', color: 'warning', link: '/patient/history' }
])
const nextAppointment = ref(null)
const recentLabs = ref([])
const recentEncounters = ref([])
const queueStatus = ref(null)

// Computed
const patientName = computed(() => authStore.patientName || authStore.userName)
const currentDate = computed(() => new Date().toLocaleDateString('en-US', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
}))

const quickActions = [
  { title: 'Book Appointment', icon: 'mdi-calendar-plus', link: '/patient/appointments?action=book' },
  { title: 'View History', icon: 'mdi-history', link: '/patient/history' },
  { title: 'Update Profile', icon: 'mdi-account-edit', link: '/patient/profile' },
  { title: 'Change Password', icon: 'mdi-lock-reset', link: '/patient/change-password' }
]

// Methods
const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A'
  return new Date(dateStr).toLocaleDateString()
}

const formatTime = (dateStr) => {
  if (!dateStr) return 'N/A'
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const formatLabType = (type) => {
  const types = {
    'CD4': 'CD4 Count',
    'VIRAL_LOAD': 'Viral Load',
    'COMPLETE_BLOOD_COUNT': 'CBC',
    'LIVER_FUNCTION': 'Liver Function',
    'RENAL_FUNCTION': 'Renal Function',
    'OTHER': 'Other Test'
  }
  return types[type] || type
}

const formatEncounterType = (type) => {
  const types = {
    'CONSULTATION': 'Consultation',
    'TESTING': 'Testing',
    'REFILL': 'Medication Refill',
    'OTHERS': 'Other Visit'
  }
  return types[type] || type
}

const appointmentStatusColor = (status) => {
  const colors = {
    'SCHEDULED': 'warning',
    'CONFIRMED': 'info',
    'IN_PROGRESS': 'primary',
    'COMPLETED': 'success',
    'CANCELLED': 'error',
    'NO_SHOW': 'grey'
  }
  return colors[status] || 'default'
}

const getLabStatus = (lab) => {
  if (lab.test_type === 'CD4') {
    const val = parseInt(lab.result_value)
    if (val >= 500) return 'Normal'
    if (val >= 200) return 'Moderate'
    return 'Low'
  }
  if (lab.test_type === 'VIRAL_LOAD') {
    const val = parseInt(lab.result_value)
    if (val < 40) return 'Undetectable'
    if (val < 1000) return 'Low'
    return 'High'
  }
  return 'Normal'
}

const getLabStatusColor = (lab) => {
  const status = getLabStatus(lab)
  if (status === 'Normal' || status === 'Undetectable') return 'success'
  if (status === 'Moderate' || status === 'Low') return 'warning'
  if (status === 'High') return 'error'
  return 'info'
}

const getLabIcon = (type) => {
  if (type === 'CD4') return 'mdi-blood-bag'
  if (type === 'VIRAL_LOAD') return 'mdi-virus'
  return 'mdi-test-tube'
}

const getEncounterColor = (type) => {
  const colors = {
    'CONSULTATION': 'primary',
    'TESTING': 'info',
    'REFILL': 'success',
    'OTHERS': 'warning'
  }
  return colors[type] || 'grey'
}

const canCancel = (scheduledAt) => {
  if (!scheduledAt) return false
  const hoursUntil = (new Date(scheduledAt) - new Date()) / (1000 * 60 * 60)
  return hoursUntil > 1
}

const cancelAppointment = async (appointment) => {
  if (!confirm(`Are you sure you want to cancel your appointment on ${formatDate(appointment.scheduled_at)}?`)) {
    return
  }

  try {
    await patientApi.cancelAppointment(appointment.id)
    snackbarStore.showSuccess('Appointment cancelled successfully')
    await loadDashboard()
  } catch (error) {
    snackbarStore.showError(error.response?.data?.error || error.message || 'Failed to cancel appointment')
  }
}

const loadDashboard = async () => {
  loading.value = true
  try {
    // Use Promise.all for parallel requests
    const [profile, statsData, appointments, labResults, encounters, queueData] = await Promise.allSettled([
      patientApi.getProfile(),
      patientApi.getStats(),
      patientApi.getUpcomingAppointments(),
      patientApi.getLabResults({ limit: 5 }),
      patientApi.getEncounters({ limit: 5 }),
      patientApi.getMyQueueStatus()
    ])

    // Handle profile (optional - just to verify auth)
    if (profile.status === 'fulfilled') {
      console.log('Profile loaded successfully')
    } else {
      console.error('Failed to load profile:', profile.reason)
    }

    // Handle statistics
    if (statsData.status === 'fulfilled') {
      const patientStats = statsData.value.data || statsData.value
      stats.value[0].value = patientStats.total_appointments || 0
      stats.value[1].value = patientStats.total_lab_results || 0
      stats.value[2].value = patientStats.total_encounters || 0
    } else {
      console.error('Failed to load statistics:', statsData.reason)
    }

    // Handle appointments - get next appointment
    if (appointments.status === 'fulfilled') {
      const appointmentsData = appointments.value.data || appointments.value
      // Get the first upcoming appointment (should be the nearest)
      if (appointmentsData && appointmentsData.length > 0) {
        nextAppointment.value = appointmentsData[0]
      } else {
        nextAppointment.value = null
      }
    } else {
      console.error('Failed to load appointments:', appointments.reason)
    }

    // Handle lab results
    if (labResults.status === 'fulfilled') {
      const labs = labResults.value.data || labResults.value
      recentLabs.value = labs || []
    } else {
      console.error('Failed to load lab results:', labResults.reason)
      recentLabs.value = []
    }

    // Handle encounters
    if (encounters.status === 'fulfilled') {
      const encountersData = encounters.value.data || encounters.value
      recentEncounters.value = encountersData || []
    } else {
      console.error('Failed to load encounters:', encounters.reason)
      recentEncounters.value = []
    }

    // Handle queue status
    if (queueData.status === 'fulfilled') {
      const queueInfo = queueData.value.data || queueData.value
      if (queueInfo && queueInfo.position) {
        queueStatus.value = {
          position: queueInfo.position,
          progress: ((queueInfo.total_before || 0) / ((queueInfo.total_before || 0) + 1)) * 100,
          estimatedWait: queueInfo.estimated_wait || '~15 minutes'
        }
      } else {
        queueStatus.value = null
      }
    } else {
      console.log('No active queue status')
      queueStatus.value = null
    }
    
  } catch (error) {
    console.error('Failed to load dashboard:', error)
    snackbarStore.showError('Failed to load dashboard data')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadDashboard()
})
</script>

<style scoped>
.patient-dashboard {
  max-width: 800px;
  margin: 0 auto;
}

.welcome-card {
  background: linear-gradient(135deg, #1e88e5 0%, #1565c0 100%);
}

.stat-card {
  transition: transform 0.2s;
  cursor: pointer;
}

.stat-card:hover {
  transform: translateY(-4px);
}

.quick-action-btn {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 600px) {
  .quick-action-btn {
    font-size: 12px;
    padding: 8px 4px;
  }
}
</style>