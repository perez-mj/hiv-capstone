<!-- frontend/src/pages/patient/PatientHistory.vue -->
<template>
  <v-container fluid class="pa-6">
    <div class="page-header mb-6">
      <h1 class="text-h4 font-weight-bold text-primary">My History</h1>
      <p class="text-body-1 text-medium-emphasis mt-2">
        Track all your clinic activities and appointments
      </p>
    </div>

    <!-- Filter Tabs -->
    <v-card elevation="2" class="mb-4">
      <v-tabs v-model="activeTab" color="primary" align-tabs="start">
        <v-tab value="all">All Activities</v-tab>
        <v-tab value="appointments">Appointments</v-tab>
        <v-tab value="lab">Lab Tests</v-tab>
        <v-tab value="encounters">Consultations</v-tab>
      </v-tabs>
    </v-card>

    <!-- Loading State -->
    <v-card v-if="loading" elevation="2" class="mb-4">
      <v-card-text class="text-center py-8">
        <v-progress-circular indeterminate color="primary" />
        <div class="mt-4">Loading your history...</div>
      </v-card-text>
    </v-card>

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

    <!-- Timeline History -->
    <template v-else>
      <v-timeline side="end" class="mt-4">
        <v-timeline-item
          v-for="item in filteredHistory"
          :key="item.id"
          :dot-color="getActivityColor(item.type)"
          size="small"
        >
          <template v-slot:opposite>
            <div class="text-caption text-medium-emphasis">
              {{ formatTime(item.created_at) }}
            </div>
          </template>

          <v-card elevation="2" border class="mb-4">
            <v-card-title class="d-flex align-center py-2">
              <v-icon :color="getActivityColor(item.type)" class="mr-2">
                {{ getActivityIcon(item.type) }}
              </v-icon>
              <span class="text-subtitle-1">{{ item.title }}</span>
              <v-spacer />
              <v-chip size="x-small" :color="getActivityColor(item.type)">
                {{ item.type }}
              </v-chip>
            </v-card-title>

            <v-divider></v-divider>

            <v-card-text>
              <div class="d-flex flex-wrap gap-4">
                <!-- Date & Time -->
                <div class="d-flex align-center">
                  <v-icon size="small" color="grey" class="mr-1">mdi-calendar</v-icon>
                  <span class="text-body-2">{{ formatDate(item.created_at) }}</span>
                </div>

                <!-- Time -->
                <div class="d-flex align-center">
                  <v-icon size="small" color="grey" class="mr-1">mdi-clock</v-icon>
                  <span class="text-body-2">{{ formatTime(item.created_at) }}</span>
                </div>

                <!-- Status (for appointments) -->
                <div v-if="item.status" class="d-flex align-center">
                  <v-icon size="small" color="grey" class="mr-1">mdi-information</v-icon>
                  <v-chip size="x-small" :color="getStatusColor(item.status)">
                    {{ item.status }}
                  </v-chip>
                </div>
              </div>

              <!-- Details based on type -->
              <div class="mt-3">
                <!-- Appointment Details -->
                <div v-if="item.type === 'Appointment'">
                  <div class="text-body-2">
                    <strong>Type:</strong> {{ item.appointment_type }}
                  </div>
                  <div class="text-body-2" v-if="item.queue_number">
                    <strong>Queue Number:</strong> #{{ item.queue_number }}
                  </div>
                  <div class="text-body-2" v-if="item.notes">
                    <strong>Notes:</strong> {{ item.notes }}
                  </div>
                </div>

                <!-- Lab Test Details -->
                <div v-if="item.type === 'Lab Test'">
                  <div class="text-body-2">
                    <strong>Test Type:</strong> {{ item.test_type }}
                  </div>
                  <div class="text-body-2" v-if="item.result">
                    <strong>Result:</strong> {{ item.result }}
                  </div>
                  <div class="text-body-2" v-if="item.interpretation">
                    <strong>Interpretation:</strong> 
                    <v-chip size="x-small" :color="getResultColor(item.interpretation)">
                      {{ item.interpretation }}
                    </v-chip>
                  </div>
                </div>

                <!-- Clinical Encounter Details -->
                <div v-if="item.type === 'Encounter'">
                  <div class="text-body-2">
                    <strong>Encounter Type:</strong> {{ item.encounter_type }}
                  </div>
                  <div class="text-body-2" v-if="item.staff">
                    <strong>Staff:</strong> {{ item.staff }}
                  </div>
                  <div class="text-body-2" v-if="item.notes">
                    <strong>Notes:</strong> {{ item.notes }}
                  </div>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-timeline-item>

        <!-- Empty State -->
        <v-card v-if="filteredHistory.length === 0" elevation="2" class="text-center py-8">
          <v-icon size="64" color="grey-lighten-2" class="mb-4">mdi-history</v-icon>
          <div class="text-h6 text-grey">No history found</div>
          <div class="text-body-2 text-grey mt-2">
            Your clinic activities will appear here
          </div>
        </v-card>
      </v-timeline>

      <!-- Load More Button -->
      <div v-if="hasMore" class="text-center mt-4">
        <v-btn
          color="primary"
          variant="outlined"
          @click="loadMore"
          :loading="loadingMore"
        >
          Load More
        </v-btn>
      </div>
    </template>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { patientApi, appointmentsApi, labResultsApi } from '@/api'

// State
const loading = ref(true)
const loadingMore = ref(false)
const activeTab = ref('all')
const history = ref([])
const page = ref(1)
const hasMore = ref(false)
const error = ref(null)

// Computed
const filteredHistory = computed(() => {
  if (activeTab.value === 'all') {
    return history.value
  }
  
  const typeMap = {
    'appointments': 'Appointment',
    'lab': 'Lab Test',
    'encounters': 'Encounter'
  }
  
  return history.value.filter(item => 
    item.type === typeMap[activeTab.value]
  )
})

// Methods
onMounted(async () => {
  await loadHistory()
})

async function loadHistory() {
  loading.value = true
  error.value = null
  
  try {
    // Load appointments from API
    const appointmentsResponse = await patientApi.getAppointments()
    console.log('Appointments loaded:', appointmentsResponse.data)
    
    const appointments = appointmentsResponse.data?.data || appointmentsResponse.data || []
    
    // Convert appointments to history items
    const appointmentHistory = appointments.map(app => ({
      id: `app_${app.id}`,
      type: 'Appointment',
      title: `${app.type_name || 'Appointment'} - ${app.status}`,
      created_at: app.scheduled_at || app.created_at,
      appointment_type: app.type_name,
      status: app.status,
      queue_number: app.queue_number,
      notes: app.notes,
      doctor: app.doctor_name || 'Staff'
    }))
    
    // TODO: Load lab results from API
    // const labResponse = await patientApi.getLabResults()
    // const labHistory = convertLabResults(labResponse.data)
    
    // TODO: Load encounters from API
    // const encountersResponse = await patientApi.getEncounters()
    // const encounterHistory = convertEncounters(encountersResponse.data)
    
    // Combine all history and sort by date (newest first)
    history.value = [
      ...appointmentHistory,
      // ...labHistory,
      // ...encounterHistory
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    
    // Set hasMore based on pagination
    hasMore.value = false // Update this when pagination is implemented
    
  } catch (err) {
    console.error('Error loading history:', err)
    error.value = 'Failed to load history. Please try again.'
    history.value = []
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  loadingMore.value = true
  page.value++
  
  try {
    // TODO: Implement pagination
    // const response = await patientApi.getAppointments({ page: page.value })
    // const moreAppointments = response.data?.data || []
    // Convert and add to history...
    
    setTimeout(() => {
      loadingMore.value = false
      hasMore.value = false
    }, 1000)
    
  } catch (error) {
    console.error('Error loading more history:', error)
    loadingMore.value = false
  }
}

// Helper functions for colors and icons
function getActivityColor(type) {
  const colors = {
    'Appointment': 'primary',
    'Lab Test': 'success',
    'Encounter': 'info'
  }
  return colors[type] || 'grey'
}

function getActivityIcon(type) {
  const icons = {
    'Appointment': 'mdi-calendar',
    'Lab Test': 'mdi-flask',
    'Encounter': 'mdi-doctor'
  }
  return icons[type] || 'mdi-history'
}

function getStatusColor(status) {
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

function getResultColor(interpretation) {
  const interpretation_lower = (interpretation || '').toLowerCase()
  if (interpretation_lower.includes('abnormal') || interpretation_lower.includes('reactive')) {
    return 'error'
  }
  if (interpretation_lower.includes('normal') || interpretation_lower.includes('non-reactive') || interpretation_lower.includes('good')) {
    return 'success'
  }
  return 'warning'
}

function formatDate(dateString) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function formatTime(dateString) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.gap-4 {
  gap: 16px;
}

/* Timeline styling */
:deep(.v-timeline-item__body) {
  padding: 0 0 16px 0;
}

/* Hover effect on cards */
.v-card {
  transition: transform 0.2s, box-shadow 0.2s;
}

.v-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1) !important;
}
</style>