<!-- frontend/src/pages/patient/PatientDashboard.vue -->
<template>
  <v-container fluid class="pa-6">
    <!-- Welcome Header -->
    <div class="page-header d-flex justify-space-between align-center mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold text-primary">Welcome, {{ patient.name }}</h1>
        <p class="text-body-1 text-medium-emphasis mt-2">
          Patient ID: {{ patient.patient_id }}
        </p>
      </div>
      <v-btn 
        color="primary" 
        variant="outlined"
        @click="logout"
      >
        Logout
      </v-btn>
    </div>

    <!-- Quick Stats -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="2" border @click="$router.push('/patient/appointments')" class="cursor-pointer">
          <v-card-text class="text-center">
            <v-icon color="primary" size="48" class="mb-2">mdi-calendar</v-icon>
            <div class="text-h5 font-weight-bold">{{ stats.upcomingAppointments }}</div>
            <div class="text-body-2 text-medium-emphasis">Upcoming Appointments</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="2" border @click="$router.push('/patient/test-history')" class="cursor-pointer">
          <v-card-text class="text-center">
            <v-icon color="success" size="48" class="mb-2">mdi-heart-pulse</v-icon>
            <div class="text-h5 font-weight-bold">{{ stats.totalTests }}</div>
            <div class="text-body-2 text-medium-emphasis">HIV Tests</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="2" border @click="$router.push('/patient/messages')" class="cursor-pointer">
          <v-card-text class="text-center">
            <v-icon color="warning" size="48" class="mb-2">mdi-message</v-icon>
            <div class="text-h5 font-weight-bold">{{ stats.unreadMessages }}</div>
            <div class="text-body-2 text-medium-emphasis">Unread Messages</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="2" border @click="$router.push('/patient/profile')" class="cursor-pointer">
          <v-card-text class="text-center">
            <v-icon color="info" size="48" class="mb-2">mdi-account</v-icon>
            <div class="text-h5 font-weight-bold">
              {{ patient.consent_status || (patient.consent ? 'YES' : 'NO') }}
            </div>
            <div class="text-body-2 text-medium-emphasis">Consent Status</div>
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
            <v-btn variant="text" color="primary" @click="$router.push('/patient/appointments')">
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
                    <div class="font-weight-medium">{{ formatDate(appointment.date) }}</div>
                    <div class="text-caption text-medium-emphasis">
                      {{ appointment.time }} • {{ appointment.doctor_name }}
                    </div>
                  </div>
                  <v-chip size="small" :color="getAppointmentStatusColor(appointment.status)">
                    {{ appointment.status }}
                  </v-chip>
                </div>
              </div>
            </div>
            <div v-else class="text-center py-4 text-medium-emphasis">
              No upcoming appointments
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card elevation="2" border>
          <v-card-title class="d-flex justify-space-between align-center">
            <span>Recent Messages</span>
            <v-btn variant="text" color="primary" @click="$router.push('/patient/messages')">
              View All
            </v-btn>
          </v-card-title>
          <v-card-text>
            <div v-if="recentMessages.length > 0">
              <div 
                v-for="message in recentMessages" 
                :key="message.id"
                class="message-item py-3"
              >
                <div class="d-flex justify-space-between align-center">
                  <div>
                    <div class="font-weight-medium">{{ message.subject }}</div>
                    <div class="text-caption text-medium-emphasis">
                      {{ formatTimeAgo(message.created_at) }}
                    </div>
                  </div>
                  <v-icon v-if="!message.read" color="primary" size="small">
                    mdi-email
                  </v-icon>
                  <v-icon v-else color="grey" size="small">
                    mdi-email-open
                  </v-icon>
                </div>
              </div>
            </div>
            <div v-else class="text-center py-4 text-medium-emphasis">
              No messages
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { patientApi } from '@/api'

const router = useRouter()

const patient = ref({})
const stats = ref({
  upcomingAppointments: 0,
  totalTests: 0,
  unreadMessages: 0
})
const recentAppointments = ref([])
const recentMessages = ref([])

onMounted(async () => {
  await loadPatientData()
  await loadDashboardData()
})

async function loadPatientData() {
  const patientData = localStorage.getItem('patientData')
  if (patientData) {
    patient.value = JSON.parse(patientData)
  }
}

async function loadDashboardData() {
  try {
    const [appointmentsRes, messagesRes, testsRes] = await Promise.all([
      patientApi.getAppointments({ limit: 3 }),
      patientApi.getMessages({ limit: 3 }),
      patientApi.getTestHistory()
    ])

    recentAppointments.value = appointmentsRes.data.appointments || []
    recentMessages.value = messagesRes.data.messages || []
    stats.value.upcomingAppointments = appointmentsRes.data.total || 0
    stats.value.totalTests = testsRes.data.tests?.length || 0
    stats.value.unreadMessages = messagesRes.data.unread_count || 0
  } catch (error) {
    console.error('Error loading dashboard data:', error)
  }
}

function getAppointmentStatusColor(status) {
  const colors = {
    'scheduled': 'primary',
    'confirmed': 'success',
    'cancelled': 'error',
    'completed': 'info'
  }
  return colors[status] || 'grey'
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function formatTimeAgo(dateString) {
  const now = new Date()
  const time = new Date(dateString)
  const diffMs = now - time
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${Math.floor(diffHours / 24)}d ago`
}

function logout() {
  localStorage.removeItem('patientToken')
  localStorage.removeItem('patientData')
  router.push('/patient/login')
}
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}

.cursor-pointer:hover {
  background: rgba(0, 0, 0, 0.02);
}

.appointment-item, .message-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.appointment-item:last-child, .message-item:last-child {
  border-bottom: none;
}
</style>