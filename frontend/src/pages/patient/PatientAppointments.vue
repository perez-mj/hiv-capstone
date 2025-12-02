<!-- frontend/src/pages/patient/PatientAppointments.vue -->
<template>
  <v-container fluid class="pa-6">
    <div class="page-header d-flex justify-space-between align-center mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold text-primary">My Appointments</h1>
        <p class="text-body-1 text-medium-emphasis mt-2">
          Manage your healthcare appointments
        </p>
      </div>
      <v-btn 
        color="primary" 
        prepend-icon="mdi-plus"
        @click="showBookingDialog = true"
      >
        Book Appointment
      </v-btn>
    </div>

    <!-- Loading State -->
    <v-card v-if="loading" elevation="2" class="mb-4">
      <v-card-text class="text-center py-8">
        <v-progress-circular indeterminate color="primary" />
        <div class="mt-4">Loading appointments...</div>
      </v-card-text>
    </v-card>

    <!-- Appointment Filters -->
    <v-card v-else elevation="2" class="mb-4" border>
      <v-card-text>
        <v-row dense align="center">
          <v-col cols="12" md="4">
            <v-select
              v-model="statusFilter"
              density="comfortable"
              variant="outlined"
              :items="statusOptions"
              placeholder="Filter by Status"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              v-model="sortBy"
              density="comfortable"
              variant="outlined"
              :items="sortOptions"
              placeholder="Sort by"
              hide-details
            />
          </v-col>
          <v-col cols="12" md="4" class="text-right">
            <v-btn
              variant="outlined"
              @click="clearFilters"
              :disabled="!hasActiveFilters"
            >
              Clear Filters
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Appointments List -->
    <v-row v-if="!loading">
      <v-col cols="12" md="8">
        <v-card elevation="2" border>
          <v-card-title>Appointments</v-card-title>
          <v-card-text class="pa-0">
            <div v-if="filteredAppointments.length > 0">
              <div 
                v-for="appointment in filteredAppointments" 
                :key="appointment.id"
                class="appointment-item pa-4"
                :class="{ 'bg-grey-lighten-4': isToday(appointment.date) }"
              >
                <div class="d-flex justify-space-between align-start">
                  <div class="flex-grow-1">
                    <div class="d-flex align-center mb-2">
                      <v-icon color="primary" class="mr-2">mdi-calendar</v-icon>
                      <div class="text-h6">{{ formatDate(appointment.date) }}</div>
                      <v-chip 
                        size="small" 
                        :color="getStatusColor(appointment.status)"
                        class="ml-2"
                      >
                        {{ appointment.status }}
                      </v-chip>
                    </div>
                    
                    <div class="d-flex align-center mb-1">
                      <v-icon color="grey" size="small" class="mr-2">mdi-clock</v-icon>
                      <span class="text-body-1">{{ appointment.time }}</span>
                    </div>
                    
                    <div class="d-flex align-center mb-1">
                      <v-icon color="grey" size="small" class="mr-2">mdi-account</v-icon>
                      <span class="text-body-1">{{ appointment.doctor_name }}</span>
                    </div>
                    
                    <div class="d-flex align-center mb-2">
                      <v-icon color="grey" size="small" class="mr-2">mdi-map-marker</v-icon>
                      <span class="text-body-2 text-medium-emphasis">{{ appointment.location || 'Main Clinic' }}</span>
                    </div>

                    <div v-if="appointment.notes" class="mt-2">
                      <div class="text-caption text-medium-emphasis">Notes:</div>
                      <div class="text-body-2">{{ appointment.notes }}</div>
                    </div>
                  </div>

                  <div class="d-flex flex-column gap-2">
                    <v-btn
                      size="small"
                      variant="outlined"
                      color="primary"
                      @click="viewAppointmentDetails(appointment)"
                    >
                      Details
                    </v-btn>
                    <v-btn
                      v-if="appointment.status === 'scheduled'"
                      size="small"
                      variant="outlined"
                      color="error"
                      @click="cancelAppointment(appointment)"
                      :loading="cancellingId === appointment.id"
                    >
                      Cancel
                    </v-btn>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="text-center py-8">
              <v-icon size="64" color="grey-lighten-2" class="mb-4">mdi-calendar-blank</v-icon>
              <div class="text-h6 text-grey">No Appointments Found</div>
              <div class="text-body-2 text-grey mt-2">
                {{ hasActiveFilters ? 'Try adjusting your filters' : 'Schedule your first appointment' }}
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card elevation="2" border>
          <v-card-title>Upcoming Appointments</v-card-title>
          <v-card-text>
            <div v-if="upcomingAppointments.length > 0">
              <div 
                v-for="appointment in upcomingAppointments" 
                :key="appointment.id"
                class="upcoming-item py-3"
              >
                <div class="font-weight-medium">{{ formatDate(appointment.date) }}</div>
                <div class="text-caption text-medium-emphasis">
                  {{ appointment.time }} • {{ appointment.doctor_name }}
                </div>
                <v-chip 
                  size="x-small" 
                  :color="getStatusColor(appointment.status)"
                  class="mt-1"
                >
                  {{ appointment.status }}
                </v-chip>
              </div>
            </div>
            <div v-else class="text-center py-4 text-medium-emphasis">
              No upcoming appointments
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Booking Dialog -->
    <v-dialog v-model="showBookingDialog" max-width="600" persistent>
      <v-card>
        <v-card-title>Book New Appointment</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="bookAppointment" ref="bookingForm">
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="newAppointment.date"
                  label="Date"
                  type="date"
                  variant="outlined"
                  :min="minDate"
                  :rules="[v => !!v || 'Date is required']"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="newAppointment.time"
                  label="Time"
                  type="time"
                  variant="outlined"
                  :rules="[v => !!v || 'Time is required']"
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="newAppointment.doctor_name"
                  label="Doctor Name"
                  variant="outlined"
                  :rules="[v => !!v || 'Doctor name is required']"
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="newAppointment.location"
                  label="Location"
                  variant="outlined"
                  :rules="[v => !!v || 'Location is required']"
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="newAppointment.notes"
                  label="Notes (Optional)"
                  variant="outlined"
                  rows="3"
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showBookingDialog = false" :disabled="bookingLoading">Cancel</v-btn>
          <v-btn 
            color="primary" 
            @click="bookAppointment" 
            :loading="bookingLoading"
            :disabled="bookingLoading"
          >
            Book Appointment
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar for notifications -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { patientApi } from '@/api'

const loading = ref(false)
const bookingLoading = ref(false)
const cancellingId = ref(null)
const appointments = ref([])
const showBookingDialog = ref(false)
const statusFilter = ref('')
const sortBy = ref('date_desc')
const bookingForm = ref(null)

const snackbar = ref({
  show: false,
  message: '',
  color: 'success'
})

const newAppointment = ref({
  date: '',
  time: '',
  doctor_name: '',
  location: '',
  notes: ''
})

const statusOptions = [
  { title: 'Scheduled', value: 'scheduled' },
  { title: 'Confirmed', value: 'confirmed' },
  { title: 'Completed', value: 'completed' },
  { title: 'Cancelled', value: 'cancelled' }
]

const sortOptions = [
  { title: 'Date (Newest First)', value: 'date_desc' },
  { title: 'Date (Oldest First)', value: 'date_asc' },
  { title: 'Status', value: 'status' }
]

const minDate = computed(() => {
  return new Date().toISOString().split('T')[0]
})

const filteredAppointments = computed(() => {
  let filtered = [...appointments.value]

  if (statusFilter.value) {
    filtered = filtered.filter(app => app.status === statusFilter.value)
  }

  return sortAppointments(filtered, sortBy.value)
})

const upcomingAppointments = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return appointments.value
    .filter(app => app.status === 'scheduled' && app.date >= today)
    .slice(0, 3)
})

const hasActiveFilters = computed(() => {
  return statusFilter.value
})

onMounted(async () => {
  await loadAppointments()
})

async function loadAppointments() {
  loading.value = true
  try {
    console.log('\U0001f504 Loading appointments...')
    const response = await patientApi.getAppointments()
    console.log('\u2705 Appointments loaded:', response.data)
    appointments.value = response.data.appointments || []
  } catch (error) {
    console.error('\u274c Error loading appointments:', error)
    showSnackbar('Error loading appointments: ' + (error.response?.data?.error || error.message), 'error')
  } finally {
    loading.value = false
  }
}

function sortAppointments(appointments, sortKey) {
  const sorted = [...appointments]
  switch (sortKey) {
    case 'date_asc':
      return sorted.sort((a, b) => new Date(a.date) - new Date(b.date))
    case 'date_desc':
      return sorted.sort((a, b) => new Date(b.date) - new Date(a.date))
    case 'status':
      return sorted.sort((a, b) => a.status.localeCompare(b.status))
    default:
      return sorted
  }
}

function getStatusColor(status) {
  const colors = {
    'scheduled': 'primary',
    'confirmed': 'warning',
    'completed': 'success',
    'cancelled': 'error'
  }
  return colors[status] || 'grey'
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

function isToday(dateString) {
  const today = new Date().toISOString().split('T')[0]
  return dateString === today
}

function clearFilters() {
  statusFilter.value = ''
  sortBy.value = 'date_desc'
}

function viewAppointmentDetails(appointment) {
  // Implement view details logic
  console.log('View appointment details:', appointment)
  showSnackbar('Appointment details feature coming soon', 'info')
}

async function cancelAppointment(appointment) {
  if (!confirm('Are you sure you want to cancel this appointment?')) return

  cancellingId.value = appointment.id
  try {
    await patientApi.cancelAppointment(appointment.id)
    await loadAppointments() // Refresh the list
    showSnackbar('Appointment cancelled successfully', 'success')
  } catch (error) {
    console.error('Error cancelling appointment:', error)
    showSnackbar('Error cancelling appointment', 'error')
  } finally {
    cancellingId.value = null
  }
}

async function bookAppointment() {
  if (!bookingForm.value) return
  
  const { valid } = await bookingForm.value.validate()
  
  if (!valid) return

  bookingLoading.value = true
  try {
    await patientApi.bookAppointment(newAppointment.value)
    showBookingDialog.value = false
    await loadAppointments() // Refresh the list
    showSnackbar('Appointment booked successfully', 'success')
    
    // Reset form
    newAppointment.value = {
      date: '',
      time: '',
      doctor_name: '',
      location: '',
      notes: ''
    }
  } catch (error) {
    console.error('Error booking appointment:', error)
    showSnackbar('Error booking appointment', 'error')
  } finally {
    bookingLoading.value = false
  }
}

function showSnackbar(message, color = 'success') {
  snackbar.value = {
    show: true,
    message,
    color
  }
}
</script>

<style scoped>
.appointment-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.appointment-item:last-child {
  border-bottom: none;
}

.upcoming-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

.upcoming-item:last-child {
  border-bottom: none;
}
</style>