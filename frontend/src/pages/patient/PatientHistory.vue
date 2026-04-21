<!-- frontend/src/pages/patient/PatientHistory.vue -->
<template>
  <v-container>
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon icon="mdi-history" size="24" class="mr-2" />
        Medical History
      </v-card-title>
      
      <v-card-text>
        <v-alert
          type="info"
          variant="tonal"
          class="mb-4"
        >
          <div class="d-flex align-center">
            <v-icon icon="mdi-information" size="20" class="mr-2" />
            <span>Your medical records and history will appear here. Please contact your healthcare provider for access to detailed records.</span>
          </div>
        </v-alert>
        
        <v-row>
          <v-col cols="12" md="6">
            <v-card variant="outlined" class="mb-4">
              <v-card-title class="text-subtitle-1">
                <v-icon icon="mdi-calendar" size="20" class="mr-2" color="primary" />
                Appointments History
              </v-card-title>
              <v-card-text>
                <v-data-table
                  :headers="appointmentHeaders"
                  :items="appointments"
                  :loading="loadingAppointments"
                  :items-per-page="5"
                  density="compact"
                >
                  <template #item.status="{ item }">
                    <v-chip :color="getStatusColor(item.status)" size="x-small">
                      {{ item.status }}
                    </v-chip>
                  </template>
                  <template #no-data>
                    <div class="text-center py-4">
                      <v-icon icon="mdi-calendar-blank" size="32" color="grey-lighten-1" />
                      <div class="text-caption text-grey mt-1">No appointment history</div>
                    </div>
                  </template>
                </v-data-table>
              </v-card-text>
            </v-card>
          </v-col>
          
          <v-col cols="12" md="6">
            <v-card variant="outlined" class="mb-4">
              <v-card-title class="text-subtitle-1">
                <v-icon icon="mdi-account" size="20" class="mr-2" color="primary" />
                Personal Information
              </v-card-title>
              <v-card-text>
                <v-list density="compact">
                  <v-list-item>
                    <template v-slot:prepend>
                      <v-icon icon="mdi-badge-account" size="18" />
                    </template>
                    <v-list-item-title class="text-caption">Patient ID</v-list-item-title>
                    <v-list-item-subtitle>{{ patient.patient_id || 'N/A' }}</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item>
                    <template v-slot:prepend>
                      <v-icon icon="mdi-cake" size="18" />
                    </template>
                    <v-list-item-title class="text-caption">Date of Birth</v-list-item-title>
                    <v-list-item-subtitle>{{ formatDate(patient.date_of_birth) || 'N/A' }}</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item>
                    <template v-slot:prepend>
                      <v-icon icon="mdi-gender-male-female" size="18" />
                    </template>
                    <v-list-item-title class="text-caption">Gender</v-list-item-title>
                    <v-list-item-subtitle>{{ patient.gender || 'N/A' }}</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item>
                    <template v-slot:prepend>
                      <v-icon icon="mdi-phone" size="18" />
                    </template>
                    <v-list-item-title class="text-caption">Phone</v-list-item-title>
                    <v-list-item-subtitle>{{ patient.phone || 'N/A' }}</v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { patientApi } from '@/api'

const loadingAppointments = ref(false)
const appointments = ref([])
const patient = ref({})

const appointmentHeaders = [
  { title: 'Date & Time', key: 'scheduled_at' },
  { title: 'Type', key: 'type_name' },
  { title: 'Status', key: 'status' }
]

async function loadAppointments() {
  loadingAppointments.value = true
  try {
    const response = await patientApi.getAppointments({ limit: 20 })
    appointments.value = response.data.data || []
  } catch (err) {
    console.error('Failed to load appointments:', err)
    appointments.value = []
  } finally {
    loadingAppointments.value = false
  }
}

async function loadPatient() {
  try {
    const response = await patientApi.getProfile()
    if (response.data.success) {
      patient.value = response.data.data
    }
  } catch (err) {
    console.error('Failed to load patient:', err)
  }
}

function getStatusColor(status) {
  const colors = {
    scheduled: 'primary',
    confirmed: 'success',
    completed: 'info',
    cancelled: 'error',
    'no-show': 'warning'
  }
  return colors[status?.toLowerCase()] || 'grey'
}

function formatDate(dateString) {
  if (!dateString) return null
  return new Date(dateString).toLocaleDateString()
}

onMounted(() => {
  loadAppointments()
  loadPatient()
})
</script>