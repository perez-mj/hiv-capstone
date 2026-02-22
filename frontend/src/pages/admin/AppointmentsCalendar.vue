<!-- frontend/src/pages/admin/AppointmentsCalendar.vue -->
<template>
  <v-container fluid class="pa-6">
    <!-- Header Section -->
    <div class="d-flex justify-space-between align-center mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold text-primary">Appointments Calendar</h1>
        <p class="text-body-1 text-medium-emphasis mt-2">
          Manage and schedule patient appointments
        </p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreateDialog" :disabled="loading">
        New Appointment
      </v-btn>
    </div>

    <!-- Stats Cards -->
    <v-row class="mb-6">
      <v-col v-for="stat in statsConfig" :key="stat.title" cols="12" sm="6" md="3">
        <v-card elevation="2" border>
          <v-card-text class="text-center">
            <v-icon :color="stat.color" size="48" class="mb-2">{{ stat.icon }}</v-icon>
            <div class="text-h5 font-weight-bold">{{ stat.value }}</div>
            <div class="text-body-2 text-medium-emphasis">{{ stat.title }}</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Calendar Controls -->
    <v-card elevation="2" border class="mb-4">
      <v-card-text>
        <div class="d-flex flex-wrap justify-space-between align-center gap-4">
          <div class="d-flex align-center gap-4">
            <v-btn-group variant="outlined">
              <v-btn :color="viewMode === 'month' ? 'primary' : undefined" @click="viewMode = 'month'">
                Month
              </v-btn>
              <v-btn :color="viewMode === 'week' ? 'primary' : undefined" @click="viewMode = 'week'">
                Week
              </v-btn>
              <v-btn :color="viewMode === 'day' ? 'primary' : undefined" @click="viewMode = 'day'">
                Day
              </v-btn>
            </v-btn-group>

            <div class="d-flex align-center">
              <v-btn icon @click="navigateDate('prev')" :disabled="loading">
                <v-icon>mdi-chevron-left</v-icon>
              </v-btn>
              <span class="text-h6 mx-4">{{ currentDateDisplay }}</span>
              <v-btn icon @click="navigateDate('next')" :disabled="loading">
                <v-icon>mdi-chevron-right</v-icon>
              </v-btn>
              <v-btn variant="text" @click="goToToday" class="ml-2">Today</v-btn>
            </div>
          </div>

          <div class="d-flex gap-2">
            <v-btn variant="outlined" prepend-icon="mdi-filter-variant" @click="showFilters = !showFilters">
              Filters
            </v-btn>
            <v-btn variant="outlined" icon="mdi-refresh" @click="refreshData" :loading="loading" />
          </div>
        </div>

        <!-- Filters -->
        <v-expand-transition>
          <v-row v-if="showFilters" class="mt-4">
            <v-col cols="12" md="4">
              <v-select v-model="filters.status" :items="statusOptions" label="Status" variant="outlined"
                density="compact" clearable multiple chips />
            </v-col>
            <v-col cols="12" md="4">
              <v-select v-model="filters.type_id" :items="appointmentTypeItems" label="Appointment Type"
                variant="outlined" density="compact" item-title="type_name" item-value="id" clearable />
            </v-col>
            <v-col cols="12" md="4" class="d-flex align-center">
              <v-btn color="primary" @click="applyFilters">Apply</v-btn>
              <v-btn variant="text" @click="resetFilters" class="ml-2">Reset</v-btn>
            </v-col>
          </v-row>
        </v-expand-transition>
      </v-card-text>
    </v-card>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-8">
      <v-progress-circular indeterminate color="primary" size="48" />
      <div class="mt-4 text-body-1">Loading calendar...</div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-8">
      <v-icon color="error" size="48" class="mb-4">mdi-alert-circle</v-icon>
      <div class="text-h6 mb-2">Failed to load calendar</div>
      <div class="text-body-2 text-medium-emphasis mb-4">{{ error }}</div>
      <v-btn color="primary" @click="refreshData">Try Again</v-btn>
    </div>

    <!-- Month View -->
    <MonthView v-else-if="viewMode === 'month'" :appointments="appointments" :current-date="currentDate"
      :appointment-types="appointmentTypes" @view-appointment="viewAppointment" @open-create="openCreateDialog" />

    <!-- Week View -->
    <WeekView v-else-if="viewMode === 'week'" :appointments="appointments" :current-date="currentDate"
      :appointment-types="appointmentTypes" :time-slots="timeSlots" @view-appointment="viewAppointment"
      @open-create="openCreateDialog" />

    <!-- Day View -->
    <DayView v-else :appointments="appointments" :current-date="currentDate" :appointment-types="appointmentTypes"
      :time-slots="timeSlots" @view-appointment="viewAppointment" @open-create="openCreateDialog" />

    <!-- Create Appointment Dialog -->
    <CreateAppointmentDialog v-model="showCreateDialog" :patients="patients" :appointment-types="appointmentTypes"
      :time-slots="timeSlots" :loading="loadingPatients || loadingTypes" :creating="creatingAppointment"
      :checking-availability="checkingAvailability" :available-time-slots="availableTimeSlots" :min-date="minDate"
      :form-data="newAppointment" @create="createNewAppointment" @check-availability="checkAvailability"
      @update:form-data="newAppointment = $event" @close="closeCreateDialog" />

    <!-- Appointment Details Dialog -->
    <AppointmentDetailsDialog v-model="showDetailsDialog" :appointment="selectedAppointment" :loading="loadingDetails"
      :updating-status="updatingStatus" :cancelling="cancellingAppointment" @update-status="updateStatus"
      @cancel="cancelAppointment" @close="showDetailsDialog = false" />

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { appointmentsApi, patientsApi } from '@/api'
import MonthView from '@/components/appointments/MonthView.vue'
import WeekView from '@/components/appointments/WeekView.vue'
import DayView from '@/components/appointments/DayView.vue'
import CreateAppointmentDialog from '@/components/appointments/CreateAppointmentDialog.vue'
import AppointmentDetailsDialog from '@/components/appointments/AppointmentDetailsDialog.vue'
import { 
  toUTC, 
  toLocal, 
  getDateRangeForAPI, 
  formatDateForDisplay,
  formatTimeForDisplay,
  CLINIC_TIMEZONE,
  API_DATE_FORMAT,
  isValidDate
} from '@/utils/dateUtils'

// State
const viewMode = ref('month')
const currentDate = ref(new Date())
const showFilters = ref(false)
const showCreateDialog = ref(false)
const showDetailsDialog = ref(false)
const selectedAppointment = ref(null)
const appointments = ref([])
const patients = ref([])
const appointmentTypes = ref([])
const loading = ref(false)
const loadingPatients = ref(false)
const loadingTypes = ref(false)
const loadingDetails = ref(false)
const creatingAppointment = ref(false)
const cancellingAppointment = ref(false)
const updatingStatus = ref(false)
const checkingAvailability = ref(false)
const stats = ref({ total: 0, by_status: [], upcoming: 0 })
const availableTimeSlots = ref([])
const error = ref(null)

const filters = ref({
  status: [],
  type_id: null
})

const newAppointment = ref({
  patient_id: null,
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

const timeSlots = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
]

// Debounce utility
function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Debounced check availability
const debouncedCheckAvailability = debounce(() => {
  if (newAppointment.value.scheduled_date && 
      newAppointment.value.appointment_type_id) {
    checkAvailability()
  }
}, 500)

// Computed
const currentDateDisplay = computed(() => {
  return formatDateForDisplay(currentDate.value, 'MMMM yyyy')
})

const minDate = computed(() => {
  const today = new Date()
  return today.toISOString().split('T')[0]
})

const statsConfig = computed(() => [
  {
    title: 'Total Appointments',
    value: stats.value.total || 0,
    icon: 'mdi-calendar',
    color: 'primary'
  },
  {
    title: 'Scheduled',
    value: getStatusCount('SCHEDULED'),
    icon: 'mdi-calendar-clock',
    color: 'info'
  },
  {
    title: 'Completed',
    value: getStatusCount('COMPLETED'),
    icon: 'mdi-check-circle',
    color: 'success'
  },
  {
    title: 'Upcoming (7 days)',
    value: stats.value.upcoming || 0,
    icon: 'mdi-calendar-arrow-right',
    color: 'warning'
  }
])

const patientItems = computed(() => {
  if (!patients.value?.data?.patients) return []
  
  return patients.value.data.patients
    .filter(p => p && (p.patient_id || p.id))
    .map(p => {
      const patientId = p.patient_id
      const internalId = p.id
      
      return {
        ...p,
        full_name: p.full_name ||
          (p.first_name && p.last_name ? `${p.last_name}, ${p.first_name}` :
            (p.first_name || p.last_name || `Patient ${patientId}`)),
        patient_id: patientId,
        internal_id: internalId
      }
    })
    .filter(p => p.patient_id)
})

const appointmentTypeItems = computed(() => {
  if (!appointmentTypes.value?.data) return []
  return appointmentTypes.value.data
    .filter(t => t && t.id)
    .map(t => ({
      ...t,
      type_name: t.type_name || t.name || 'Unknown',
      id: t.id
    }))
})

// Helper Methods
const getStatusCount = (status) => {
  return stats.value.by_status?.find(item => item.status === status)?.count || 0
}

// Navigation Methods
const navigateDate = (direction) => {
  const newDate = new Date(currentDate.value)
  if (viewMode.value === 'month') {
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))
  } else if (viewMode.value === 'week') {
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
  } else {
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))
  }
  currentDate.value = newDate
}

const goToToday = () => {
  currentDate.value = new Date()
}

// API Calls
async function loadAppointments() {
  loading.value = true
  error.value = null

  try {
    const dateRange = buildDateRangeParams()
    
    const params = {
      ...dateRange,
      timezone: CLINIC_TIMEZONE,
      limit: 500,
      include: 'patient,appointment_type'
    }

    if (filters.value.status?.length) {
      params.status = filters.value.status.join(',')
    }
    if (filters.value.type_id) {
      params.type_id = filters.value.type_id
    }

    const response = await appointmentsApi.getAll(params)
    appointments.value = response
  } catch (err) {
    console.error('Error loading appointments:', err)
    error.value = err.message || 'Failed to load appointments'
    appointments.value = []
    showSnackbar('Failed to load appointments', 'error')
  } finally {
    loading.value = false
  }
}

function buildDateRangeParams() {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth() + 1

  if (viewMode.value === 'month') {
    const firstDay = new Date(year, month - 1, 1)
    const lastDay = new Date(year, month, 0)
    
    return {
      date_from: getDateRangeForAPI(firstDay, true),
      date_to: getDateRangeForAPI(lastDay, false)
    }
  } else if (viewMode.value === 'week') {
    const startOfWeek = new Date(currentDate.value)
    startOfWeek.setDate(currentDate.value.getDate() - currentDate.value.getDay())
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)

    return {
      date_from: getDateRangeForAPI(startOfWeek, true),
      date_to: getDateRangeForAPI(endOfWeek, false)
    }
  } else {
    return {
      date_from: getDateRangeForAPI(currentDate.value, true),
      date_to: getDateRangeForAPI(currentDate.value, false)
    }
  }
}

async function loadPatients() {
  loadingPatients.value = true
  try {
    const response = await patientsApi.getAll({ limit: 100 })
    patients.value = response
  } catch (error) {
    console.error('Error loading patients:', error)
    patients.value = { data: { patients: [] } }
    showSnackbar('Failed to load patients', 'error')
  } finally {
    loadingPatients.value = false
  }
}

async function loadAppointmentTypes() {
  loadingTypes.value = true
  try {
    const response = await appointmentsApi.getTypes()
    appointmentTypes.value = response
  } catch (error) {
    console.error('Error loading appointment types:', error)
    appointmentTypes.value = { data: [] }
    showSnackbar('Failed to load appointment types', 'error')
  } finally {
    loadingTypes.value = false
  }
}

async function loadStats() {
  try {
    const params = buildDateRangeParams()
    const response = await appointmentsApi.getStats({
      ...params,
      timezone: CLINIC_TIMEZONE
    })
    stats.value = response || { total: 0, by_status: [], upcoming: 0 }
  } catch (error) {
    console.error('Error loading stats:', error)
    stats.value = { total: 0, by_status: [], upcoming: 0 }
  }
}

async function checkAvailability() {
  if (!newAppointment.value.scheduled_date || !newAppointment.value.appointment_type_id) {
    availableTimeSlots.value = []
    return
  }

  if (checkingAvailability.value) return

  checkingAvailability.value = true
  availableTimeSlots.value = []

  try {
    // Send date in local format, backend will handle timezone
    const params = {
      date: newAppointment.value.scheduled_date,
      type_id: newAppointment.value.appointment_type_id,
      timezone: CLINIC_TIMEZONE
    }

    console.log('Checking availability with params:', params)

    const response = await appointmentsApi.checkAvailability(params)
    
    console.log('Availability response:', response)

    let slots = []
    if (response?.slots) {
      slots = response.slots
    } else if (response?.data?.slots) {
      slots = response.data.slots
    } else if (Array.isArray(response)) {
      slots = response
    }

    availableTimeSlots.value = slots
      .filter(slot => slot && slot.available === true)
      .map(slot => slot.time)
      .filter(Boolean)
      .sort()

    if (availableTimeSlots.value.length === 0) {
      showSnackbar('No available time slots for this date', 'warning')
    }
  } catch (error) {
    console.error('Error checking availability:', error)
    
    let errorMessage = 'Failed to check availability'
    
    if (error.response) {
      if (error.response.status === 500) {
        const serverError = error.response.data?.details || error.response.data?.error
        console.error('Server error details:', serverError)
        errorMessage = 'Server error checking availability'
      } else if (error.response.status === 400) {
        errorMessage = error.response.data?.error || 'Invalid request'
      } else if (error.response.status === 401) {
        errorMessage = 'Authentication error'
      }
    } else if (error.request) {
      errorMessage = 'Network error'
    }
    
    showSnackbar(errorMessage, 'error')
  } finally {
    checkingAvailability.value = false
  }
}

async function createNewAppointment() {
  if (!newAppointment.value.patient_id ||
    !newAppointment.value.appointment_type_id ||
    !newAppointment.value.scheduled_date ||
    !newAppointment.value.scheduled_time) {
    showSnackbar('Please fill in all required fields', 'error')
    return
  }

  creatingAppointment.value = true

  try {
    const patientId = newAppointment.value.patient_id
    
    if (!patientId || patientId === null || patientId === undefined) {
      console.error('Invalid patient ID:', newAppointment.value.patient_id)
      throw new Error('Invalid patient ID')
    }

    let appointmentTypeId = newAppointment.value.appointment_type_id
    if (typeof appointmentTypeId === 'string') {
      appointmentTypeId = parseInt(appointmentTypeId, 10)
    }
    
    if (isNaN(appointmentTypeId) || appointmentTypeId === null || appointmentTypeId === undefined) {
      console.error('Invalid appointment type ID:', newAppointment.value.appointment_type_id)
      throw new Error('Invalid appointment type ID')
    }

    // Convert local date and time to UTC for storage
    const scheduled_at = toUTC(
      newAppointment.value.scheduled_date,
      newAppointment.value.scheduled_time
    )

    if (!scheduled_at) {
      throw new Error('Invalid date/time format')
    }

    const appointmentData = {
      patient_id: patientId,
      appointment_type_id: appointmentTypeId,
      scheduled_at,
      notes: newAppointment.value.notes || null,
      timezone: CLINIC_TIMEZONE // Send timezone info to backend
    }

    console.log('Creating appointment with data:', appointmentData)

    const response = await appointmentsApi.create(appointmentData)

    if (response) {
      closeCreateDialog()
      await refreshData()
      showSnackbar('Appointment scheduled successfully')
    }
  } catch (error) {
    console.error('Error creating appointment:', error)
    showSnackbar(
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'Failed to schedule appointment',
      'error'
    )
  } finally {
    creatingAppointment.value = false
  }
}

async function viewAppointment(appointment) {
  if (!appointment?.id) {
    showSnackbar('Invalid appointment', 'error')
    return
  }

  loadingDetails.value = true

  try {
    const response = await appointmentsApi.getById(appointment.id, {
      include: 'patient,appointment_type,lab_results,prescriptions',
      timezone: CLINIC_TIMEZONE
    })

    // Convert UTC dates to local for display
    const appointmentData = response?.data || response?.appointment || response
    
    if (appointmentData) {
      // Format dates for display
      appointmentData.display_date = toLocal(appointmentData.scheduled_at, 'MMMM d, yyyy')
      appointmentData.display_time = toLocal(appointmentData.scheduled_at, 'hh:mm a')
      appointmentData.display_datetime = toLocal(appointmentData.scheduled_at)
    }
    
    selectedAppointment.value = appointmentData
    showDetailsDialog.value = true
  } catch (error) {
    console.error('Error loading appointment details:', error)
    showSnackbar('Failed to load appointment details', 'error')
  } finally {
    loadingDetails.value = false
  }
}

async function updateStatus(status) {
  if (!selectedAppointment.value?.id) return

  updatingStatus.value = true

  try {
    await appointmentsApi.updateStatus(selectedAppointment.value.id, status)
    await refreshData()

    const response = await appointmentsApi.getById(selectedAppointment.value.id, {
      include: 'patient,appointment_type,lab_results,prescriptions',
      timezone: CLINIC_TIMEZONE
    })

    selectedAppointment.value = response?.data || response?.appointment || response
    showSnackbar(`Appointment ${status.toLowerCase()} successfully`)
  } catch (error) {
    console.error('Error updating status:', error)
    showSnackbar('Failed to update status', 'error')
  } finally {
    updatingStatus.value = false
  }
}

async function cancelAppointment() {
  if (!selectedAppointment.value?.id) return

  const confirmed = window.confirm('Are you sure you want to cancel this appointment?')
  if (!confirmed) return

  cancellingAppointment.value = true

  try {
    await appointmentsApi.updateStatus(selectedAppointment.value.id, 'CANCELLED')
    showDetailsDialog.value = false
    await refreshData()
    showSnackbar('Appointment cancelled successfully')
  } catch (error) {
    console.error('Error cancelling appointment:', error)
    showSnackbar('Failed to cancel appointment', 'error')
  } finally {
    cancellingAppointment.value = false
  }
}

function openCreateDialog(date = null, time = null) {
  // Reset form
  newAppointment.value = {
    patient_id: null,
    appointment_type_id: null,
    scheduled_date: date || '',
    scheduled_time: time || '',
    notes: ''
  }

  // Clear availability slots
  availableTimeSlots.value = []

  // Load data if needed
  if (!patients.value?.data?.patients?.length) {
    loadPatients()
  }

  if (!appointmentTypes.value?.data?.length) {
    loadAppointmentTypes()
  }

  showCreateDialog.value = true
}

function closeCreateDialog() {
  showCreateDialog.value = false
  newAppointment.value = {
    patient_id: null,
    appointment_type_id: null,
    scheduled_date: '',
    scheduled_time: '',
    notes: ''
  }
  availableTimeSlots.value = []
}

function applyFilters() {
  loadAppointments()
  loadStats()
}

function resetFilters() {
  filters.value = {
    status: [],
    type_id: null
  }
  applyFilters()
}

function showSnackbar(message, color = 'success') {
  snackbar.value = {
    show: true,
    message,
    color
  }
}

async function refreshData() {
  error.value = null
  await Promise.all([
    loadAppointments(),
    loadStats()
  ])
}

// Lifecycle
onMounted(async () => {
  await Promise.all([
    loadAppointments(),
    loadPatients(),
    loadAppointmentTypes(),
    loadStats()
  ])
})

// Watchers
watch([currentDate, viewMode], () => {
  loadAppointments()
  loadStats()
})

watch(() => newAppointment.value.scheduled_date, (newDate) => {
  if (newDate && newAppointment.value.appointment_type_id) {
    debouncedCheckAvailability()
  }
})

watch(() => newAppointment.value.appointment_type_id, (newTypeId) => {
  if (newTypeId && newAppointment.value.scheduled_date) {
    debouncedCheckAvailability()
  }
})
</script>

<style scoped>
.gap-2 {
  gap: 8px;
}

.gap-4 {
  gap: 16px;
}
</style>