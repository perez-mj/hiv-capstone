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
        :disabled="!appointmentTypes.length"
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
              label="Filter by Status"
              clearable
              hide-details
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              v-model="sortBy"
              density="comfortable"
              variant="outlined"
              :items="sortOptions"
              label="Sort by"
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
          <v-card-title class="d-flex justify-space-between align-center">
            <span>Appointments</span>
            <v-chip v-if="queueInfo.now_serving" color="primary" size="small">
              Now Serving: #{{ queueInfo.now_serving }}
            </v-chip>
          </v-card-title>
          <v-card-text class="pa-0">
            <div v-if="filteredAppointments.length > 0">
              <div 
                v-for="appointment in filteredAppointments" 
                :key="appointment.id"
                class="appointment-item pa-4"
                :class="{ 'bg-grey-lighten-4': isToday(appointment.scheduled_at) }"
              >
                <div class="d-flex justify-space-between align-start">
                  <div class="flex-grow-1">
                    <div class="d-flex align-center mb-2 flex-wrap gap-2">
                      <v-icon color="primary" class="mr-2">mdi-calendar</v-icon>
                      <div class="text-h6">{{ formatDate(appointment.scheduled_at) }}</div>
                      <v-chip 
                        size="small" 
                        :color="getStatusColor(appointment.status)"
                      >
                        {{ appointment.status }}
                      </v-chip>
                      <v-chip 
                        v-if="appointment.queue_number"
                        size="small"
                        variant="outlined"
                        color="primary"
                      >
                        Queue #{{ appointment.queue_number }}
                      </v-chip>
                    </div>
                    
                    <div class="d-flex align-center mb-1">
                      <v-icon color="grey" size="small" class="mr-2">mdi-clock</v-icon>
                      <span class="text-body-1">{{ formatTime(appointment.scheduled_at) }}</span>
                    </div>
                    
                    <div class="d-flex align-center mb-1">
                      <v-icon color="grey" size="small" class="mr-2">mdi-doctor</v-icon>
                      <span class="text-body-1">{{ appointment.type_name }}</span>
                    </div>
                    
                    <div class="d-flex align-center mb-2">
                      <v-icon color="grey" size="small" class="mr-2">mdi-map-marker</v-icon>
                      <span class="text-body-2 text-medium-emphasis">Main Clinic</span>
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
                      @click="viewAppointmentDetails(appointment.id)"
                    >
                      Details
                    </v-btn>
                    <v-btn
                      v-if="canCancelAppointment(appointment)"
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
        <v-card elevation="2" border class="mb-4">
          <v-card-title>Queue Status</v-card-title>
          <v-card-text>
            <div v-if="queueInfo.waiting_count > 0" class="text-center">
              <div class="text-h3 font-weight-bold text-primary">{{ queueInfo.waiting_count }}</div>
              <div class="text-body-1">Patients Waiting</div>
              <div class="text-caption text-medium-emphasis mt-2">
                Estimated wait: {{ queueInfo.estimated_wait_time }} minutes
              </div>
            </div>
            <div v-else class="text-center py-4 text-medium-emphasis">
              No patients in queue
            </div>
          </v-card-text>
        </v-card>

        <v-card elevation="2" border>
          <v-card-title>Upcoming Appointments</v-card-title>
          <v-card-text>
            <div v-if="upcomingAppointments.length > 0">
              <div 
                v-for="appointment in upcomingAppointments" 
                :key="appointment.id"
                class="upcoming-item py-3"
              >
                <div class="font-weight-medium">{{ formatDate(appointment.scheduled_at) }}</div>
                <div class="text-caption text-medium-emphasis">
                  {{ formatTime(appointment.scheduled_at) }} • {{ appointment.type_name }}
                </div>
                <div class="d-flex align-center mt-1">
                  <v-chip 
                    size="x-small" 
                    :color="getStatusColor(appointment.status)"
                  >
                    {{ appointment.status }}
                  </v-chip>
                  <v-chip 
                    v-if="appointment.queue_number"
                    size="x-small"
                    variant="outlined"
                    class="ml-1"
                  >
                    #{{ appointment.queue_number }}
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
    </v-row>

    <!-- Booking Dialog -->
    <v-dialog v-model="showBookingDialog" max-width="600" persistent>
      <v-card>
        <v-card-title>Book New Appointment</v-card-title>
        <v-card-text>
          <v-form ref="bookingForm" @submit.prevent="bookAppointment">
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="newAppointment.scheduled_date"
                  label="Date"
                  type="date"
                  variant="outlined"
                  :min="minDate"
                  :rules="[v => !!v || 'Date is required']"
                  @change="checkAvailability"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="newAppointment.scheduled_time"
                  label="Time"
                  :items="availableTimeSlots"
                  variant="outlined"
                  :rules="[v => !!v || 'Time is required']"
                  :disabled="!newAppointment.scheduled_date || !newAppointment.appointment_type_id"
                  :loading="checkingAvailability"
                />
              </v-col>
              <v-col cols="12">
                <v-select
                  v-model="newAppointment.appointment_type_id"
                  :items="appointmentTypeOptions"
                  item-title="label"
                  item-value="value"
                  label="Appointment Type"
                  variant="outlined"
                  :rules="[v => !!v || 'Appointment type is required']"
                  @update:model-value="checkAvailability"
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="newAppointment.notes"
                  label="Notes (Optional)"
                  variant="outlined"
                  rows="3"
                  placeholder="Any specific concerns or requests..."
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeBookingDialog" :disabled="bookingLoading">Cancel</v-btn>
          <v-btn 
            color="primary" 
            @click="bookAppointment" 
            :loading="bookingLoading"
            :disabled="!isBookingValid"
          >
            Book Appointment
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Appointment Details Dialog -->
    <v-dialog v-model="showDetailsDialog" max-width="500">
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
          <span>Appointment Details</span>
          <v-btn icon @click="showDetailsDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text>
          <div v-if="selectedAppointment" class="appointment-details">
            <!-- Queue Information -->
            <v-card v-if="selectedAppointment.queue_number" variant="outlined" class="mb-4">
              <v-card-text class="d-flex align-center">
                <v-icon color="primary" size="40" class="mr-4">mdi-account-queue</v-icon>
                <div>
                  <div class="text-caption text-medium-emphasis">Your Queue Number</div>
                  <div class="text-h4 font-weight-bold">{{ selectedAppointment.queue_number }}</div>
                  <div class="text-caption">
                    Status: 
                    <v-chip size="x-small" :color="getQueueStatusColor(selectedAppointment.queue_status)">
                      {{ selectedAppointment.queue_status }}
                    </v-chip>
                  </div>
                  <div v-if="selectedAppointment.queue_status === 'WAITING'" class="text-caption mt-1">
                    Estimated wait: {{ estimatedWaitTime }} minutes
                  </div>
                </div>
              </v-card-text>
            </v-card>

            <v-row>
              <v-col cols="6">
                <div class="text-caption text-medium-emphasis">Date</div>
                <div class="text-body-1 mb-4">{{ formatDate(selectedAppointment.scheduled_at) }}</div>
              </v-col>
              <v-col cols="6">
                <div class="text-caption text-medium-emphasis">Time</div>
                <div class="text-body-1 mb-4">{{ formatTime(selectedAppointment.scheduled_at) }}</div>
              </v-col>
              <v-col cols="12">
                <div class="text-caption text-medium-emphasis">Appointment Type</div>
                <div class="text-body-1 mb-4">{{ selectedAppointment.type_name }}</div>
              </v-col>
              <v-col cols="12">
                <div class="text-caption text-medium-emphasis">Status</div>
                <v-chip 
                  :color="getStatusColor(selectedAppointment.status)"
                  class="mb-4"
                >
                  {{ selectedAppointment.status }}
                </v-chip>
              </v-col>
              <v-col cols="12" v-if="selectedAppointment.notes">
                <div class="text-caption text-medium-emphasis">Your Notes</div>
                <div class="text-body-1">{{ selectedAppointment.notes }}</div>
              </v-col>
            </v-row>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn 
            v-if="selectedAppointment?.status === 'SCHEDULED' || selectedAppointment?.status === 'CONFIRMED'"
            color="error" 
            variant="outlined"
            @click="cancelFromDetails"
            :loading="cancellingAppointment"
          >
            Cancel Appointment
          </v-btn>
          <v-btn color="primary" @click="showDetailsDialog = false">
            Close
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
import { patientApi, appointmentsApi, queueApi } from '@/api'

// State
const loading = ref(false)
const bookingLoading = ref(false)
const checkingAvailability = ref(false)
const cancellingId = ref(null)
const cancellingAppointment = ref(false)
const appointments = ref([])
const appointmentTypes = ref([])
const showBookingDialog = ref(false)
const showDetailsDialog = ref(false)
const selectedAppointment = ref(null)
const statusFilter = ref('')
const sortBy = ref('date_desc')
const bookingForm = ref(null)
const availableTimeSlots = ref([])
const queueInfo = ref({
  now_serving: null,
  waiting_count: 0,
  estimated_wait_time: 0
})

const newAppointment = ref({
  appointment_type_id: null,
  scheduled_date: '',
  scheduled_time: '',
  notes: ''
})

const snackbar = ref({
  show: false,
  message: '',
  color: 'success'
})

// Constants
const statusOptions = [
  { title: 'Scheduled', value: 'SCHEDULED' },
  { title: 'Confirmed', value: 'CONFIRMED' },
  { title: 'In Progress', value: 'IN_PROGRESS' },
  { title: 'Completed', value: 'COMPLETED' },
  { title: 'Cancelled', value: 'CANCELLED' },
  { title: 'No Show', value: 'NO_SHOW' }
]

const sortOptions = [
  { title: 'Date (Newest First)', value: 'date_desc' },
  { title: 'Date (Oldest First)', value: 'date_asc' },
  { title: 'Status', value: 'status' }
]

// APPOINTMENT TYPE OPTIONS - UPDATED with Testing, Consultation, Refill, Others
const appointmentTypeOptions = [
  { label: 'Testing', value: 1 },
  { label: 'Consultation', value: 2 },
  { label: 'Refill', value: 3 },
  { label: 'Others', value: 4 }
]

// Computed
const minDate = computed(() => {
  return new Date().toISOString().split('T')[0]
})

const isBookingValid = computed(() => {
  return newAppointment.value.appointment_type_id &&
         newAppointment.value.scheduled_date &&
         newAppointment.value.scheduled_time
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
    .filter(app => 
      (app.status === 'SCHEDULED' || app.status === 'CONFIRMED') && 
      app.scheduled_at?.split('T')[0] >= today
    )
    .slice(0, 3)
})

const hasActiveFilters = computed(() => {
  return statusFilter.value
})

const estimatedWaitTime = computed(() => {
  if (!selectedAppointment.value?.queue_number || !queueInfo.value.now_serving) return 0
  const position = selectedAppointment.value.queue_number - queueInfo.value.now_serving
  return Math.max(0, position * 15)
})

// Methods
const getStatusColor = (status) => {
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

const getQueueStatusColor = (status) => {
  const colors = {
    'WAITING': 'grey',
    'CALLED': 'warning',
    'SERVING': 'success',
    'COMPLETED': 'info',
    'SKIPPED': 'error'
  }
  return colors[status] || 'grey'
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const formatTime = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const isToday = (dateString) => {
  if (!dateString) return false
  const today = new Date().toISOString().split('T')[0]
  return dateString.split('T')[0] === today
}

const canCancelAppointment = (appointment) => {
  const cancellableStatuses = ['SCHEDULED', 'CONFIRMED']
  if (!cancellableStatuses.includes(appointment.status)) return false
  
  if (isToday(appointment.scheduled_at)) {
    const appointmentTime = new Date(appointment.scheduled_at).getTime()
    const now = new Date().getTime()
    const hoursUntil = (appointmentTime - now) / (1000 * 60 * 60)
    return hoursUntil > 2
  }
  
  return true
}

const sortAppointments = (appointments, sortKey) => {
  const sorted = [...appointments]
  switch (sortKey) {
    case 'date_asc':
      return sorted.sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
    case 'date_desc':
      return sorted.sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at))
    case 'status':
      return sorted.sort((a, b) => a.status.localeCompare(b.status))
    default:
      return sorted
  }
}

// API Calls
async function loadAppointments() {
  loading.value = true
  try {
    const response = await patientApi.getAppointments()
    console.log('Appointments loaded:', response.data)
    
    appointments.value = response.data?.data || response.data || []
  } catch (error) {
    console.error('Error loading appointments:', error)
    showSnackbar('Error loading appointments', 'error')
    appointments.value = []
  } finally {
    loading.value = false
  }
}

async function loadAppointmentTypes() {
  try {
    const response = await appointmentsApi.getTypes()
    console.log('Appointment types loaded:', response.data)
    
    // Use the predefined options instead of API response
    // This ensures we always have Testing, Consultation, Refill, Others
    appointmentTypes.value = appointmentTypeOptions
    
    // Optional: You can still map API IDs to our options if needed
    // const apiTypes = response.data?.data || response.data || []
    // appointmentTypes.value = appointmentTypeOptions.map(opt => {
    //   const match = apiTypes.find(t => t.type_name === opt.label)
    //   return { ...opt, value: match?.id || opt.value }
    // })
    
  } catch (error) {
    console.error('Error loading appointment types:', error)
    // Fallback to our predefined options
    appointmentTypes.value = appointmentTypeOptions
  }
}

async function loadQueueInfo() {
  try {
    const response = await queueApi.getCurrent()
    console.log('Queue info loaded:', response.data)
    
    const data = response.data?.data || response.data || {}
    queueInfo.value = {
      now_serving: data.now_serving || null,
      waiting_count: data.waiting_count || 0,
      estimated_wait_time: data.estimated_wait_time || 0
    }
  } catch (error) {
    console.error('Error loading queue info:', error)
    queueInfo.value = {
      now_serving: null,
      waiting_count: 0,
      estimated_wait_time: 0
    }
  }
}

async function checkAvailability() {
  if (!newAppointment.value.scheduled_date || !newAppointment.value.appointment_type_id) {
    return
  }

  checkingAvailability.value = true
  try {
    const response = await appointmentsApi.checkAvailability({
      date: newAppointment.value.scheduled_date,
      type_id: newAppointment.value.appointment_type_id
    })
    
    console.log('Availability response:', response.data)
    
    const data = response.data?.data || response.data || {}
    availableTimeSlots.value = data.slots
      ?.filter(slot => slot.available)
      .map(slot => slot.time) || []
  } catch (error) {
    console.error('Error checking availability:', error)
    showSnackbar('Failed to check availability', 'error')
    availableTimeSlots.value = []
  } finally {
    checkingAvailability.value = false
  }
}

async function bookAppointment() {
  if (!bookingForm.value) return
  
  const { valid } = await bookingForm.value.validate()
  
  if (!valid || !isBookingValid.value) return

  bookingLoading.value = true
  try {
    const scheduled_at = `${newAppointment.value.scheduled_date}T${newAppointment.value.scheduled_time}:00`
    
    const appointmentData = {
      appointment_type_id: newAppointment.value.appointment_type_id,
      scheduled_at,
      notes: newAppointment.value.notes || null
    }

    const response = await patientApi.bookAppointment(appointmentData)
    console.log('Booking response:', response.data)
    
    if (response.data?.success) {
      closeBookingDialog()
      await loadAppointments()
      showSnackbar('Appointment booked successfully', 'success')
    } else {
      showSnackbar(response.data?.error || 'Error booking appointment', 'error')
    }
  } catch (error) {
    console.error('Error booking appointment:', error)
    showSnackbar(error.response?.data?.error || 'Error booking appointment', 'error')
  } finally {
    bookingLoading.value = false
  }
}

async function viewAppointmentDetails(id) {
  try {
    const response = await appointmentsApi.getById(id)
    console.log('Appointment details:', response.data)
    
    selectedAppointment.value = response.data?.data || response.data
    showDetailsDialog.value = true
  } catch (error) {
    console.error('Error loading appointment details:', error)
    showSnackbar('Failed to load appointment details', 'error')
  }
}

async function cancelAppointment(appointment) {
  if (!confirm('Are you sure you want to cancel this appointment?')) return

  cancellingId.value = appointment.id
  try {
    const response = await patientApi.cancelAppointment(appointment.id)
    console.log('Cancel response:', response.data)
    
    if (response.data?.success) {
      await loadAppointments()
      await loadQueueInfo()
      showSnackbar('Appointment cancelled successfully', 'success')
    } else {
      showSnackbar(response.data?.error || 'Error cancelling appointment', 'error')
    }
  } catch (error) {
    console.error('Error cancelling appointment:', error)
    showSnackbar('Error cancelling appointment', 'error')
  } finally {
    cancellingId.value = null
  }
}

async function cancelFromDetails() {
  if (!selectedAppointment.value) return
  
  cancellingAppointment.value = true
  try {
    const response = await patientApi.cancelAppointment(selectedAppointment.value.id)
    console.log('Cancel from details response:', response.data)
    
    if (response.data?.success) {
      showDetailsDialog.value = false
      await loadAppointments()
      await loadQueueInfo()
      showSnackbar('Appointment cancelled successfully', 'success')
    } else {
      showSnackbar(response.data?.error || 'Error cancelling appointment', 'error')
    }
  } catch (error) {
    console.error('Error cancelling appointment:', error)
    showSnackbar('Error cancelling appointment', 'error')
  } finally {
    cancellingAppointment.value = false
  }
}

function clearFilters() {
  statusFilter.value = ''
  sortBy.value = 'date_desc'
}

function closeBookingDialog() {
  showBookingDialog.value = false
  newAppointment.value = {
    appointment_type_id: null,
    scheduled_date: '',
    scheduled_time: '',
    notes: ''
  }
  availableTimeSlots.value = []
}

function showSnackbar(message, color = 'success') {
  snackbar.value = {
    show: true,
    message,
    color
  }
}

// Lifecycle
onMounted(async () => {
  await Promise.allSettled([
    loadAppointments(),
    loadAppointmentTypes(),
    loadQueueInfo()
  ])
})
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

.gap-2 {
  gap: 8px;
}
</style>