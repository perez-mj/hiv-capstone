<template>
  <v-container fluid class="pa-6">
    <div class="page-header d-flex justify-space-between align-center mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold text-primary">Appointments Calendar</h1>
        <p class="text-body-1 text-medium-emphasis mt-2">
          Manage and schedule patient appointments
        </p>
      </div>
      <v-btn 
        color="primary" 
        prepend-icon="mdi-plus"
        @click="showCreateDialog = true"
        :disabled="loading"
      >
        New Appointment
      </v-btn>
    </div>

    <!-- Stats Cards -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="2" border>
          <v-card-text class="text-center">
            <v-icon color="primary" size="48" class="mb-2">mdi-calendar</v-icon>
            <div class="text-h5 font-weight-bold">{{ stats.total || 0 }}</div>
            <div class="text-body-2 text-medium-emphasis">Total Appointments</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="2" border>
          <v-card-text class="text-center">
            <v-icon color="success" size="48" class="mb-2">mdi-check-circle</v-icon>
            <div class="text-h5 font-weight-bold">{{ getStatusCount('SCHEDULED') }}</div>
            <div class="text-body-2 text-medium-emphasis">Scheduled</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="2" border>
          <v-card-text class="text-center">
            <v-icon color="info" size="48" class="mb-2">mdi-calendar-check</v-icon>
            <div class="text-h5 font-weight-bold">{{ getStatusCount('COMPLETED') }}</div>
            <div class="text-body-2 text-medium-emphasis">Completed</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="2" border>
          <v-card-text class="text-center">
            <v-icon color="warning" size="48" class="mb-2">mdi-clock</v-icon>
            <div class="text-h5 font-weight-bold">{{ stats.upcoming || 0 }}</div>
            <div class="text-body-2 text-medium-emphasis">Upcoming (7 days)</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Calendar View -->
    <v-card elevation="2" border>
      <v-card-title class="d-flex justify-space-between align-center">
        <div class="d-flex align-center gap-4">
          <v-btn icon @click="previousMonth" :disabled="loading">
            <v-icon>mdi-chevron-left</v-icon>
          </v-btn>
          <div class="text-h5">{{ currentMonth }}</div>
          <v-btn icon @click="nextMonth" :disabled="loading">
            <v-icon>mdi-chevron-right</v-icon>
          </v-btn>
        </div>
        <div class="d-flex gap-2">
          <v-btn 
            variant="outlined" 
            @click="toggleViewMode"
            :disabled="loading"
          >
            {{ viewMode === 'month' ? 'Week View' : 'Month View' }}
          </v-btn>
          <v-btn 
            variant="outlined" 
            icon="mdi-refresh"
            @click="refreshData"
            :loading="loading"
          />
        </div>
      </v-card-title>

      <v-card-text>
        <!-- Loading State -->
        <div v-if="loading" class="text-center py-8">
          <v-progress-circular indeterminate color="primary" />
          <div class="mt-4">Loading calendar...</div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="text-center py-8">
          <v-icon color="error" size="48" class="mb-4">mdi-alert-circle</v-icon>
          <div class="text-h6 mb-2">Failed to load calendar</div>
          <div class="text-body-2 text-medium-emphasis mb-4">{{ error }}</div>
          <v-btn color="primary" @click="refreshData">Try Again</v-btn>
        </div>

        <!-- Month View -->
        <div v-else-if="viewMode === 'month'" class="calendar-month">
          <div class="calendar-header">
            <div v-for="day in weekDays" :key="day" class="calendar-header-day">
              {{ day }}
            </div>
          </div>
          <div class="calendar-body">
            <div 
              v-for="day in calendarDays" 
              :key="day.date"
              class="calendar-day"
              :class="{
                'calendar-day-other': !day.isCurrentMonth,
                'calendar-day-today': day.isToday,
                'calendar-day-weekend': day.isWeekend
              }"
            >
              <div class="calendar-day-header">
                <span :class="{ 'text-primary': day.isToday }">{{ day.day }}</span>
              </div>
              <div class="calendar-day-appointments">
                <template v-if="day.appointments && day.appointments.length">
                  <div 
                    v-for="appointment in day.appointments" 
                    :key="appointment.id"
                    class="appointment-badge"
                    :class="`appointment-${appointment.status?.toLowerCase() || 'unknown'}`"
                    @click="viewAppointment(appointment)"
                  >
                    <div class="appointment-time">{{ formatTime(appointment.scheduled_at) }}</div>
                    <div class="appointment-patient">{{ appointment.patient_name || 'Unknown Patient' }}</div>
                    <div class="appointment-type">{{ appointment.type_name || 'Unknown Type' }}</div>
                  </div>
                </template>
                <div v-else class="text-caption text-center text-grey mt-2">
                  No appointments
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Week View -->
        <div v-else class="calendar-week">
          <div class="calendar-week-header">
            <div class="time-column"></div>
            <div 
              v-for="day in currentWeek" 
              :key="day.date"
              class="week-day-header"
              :class="{ 'week-day-today': day.isToday, 'week-day-weekend': day.isWeekend }"
            >
              <div class="week-day-name">{{ day.weekday }}</div>
              <div class="week-day-date">{{ day.day }}</div>
            </div>
          </div>
          <div class="calendar-week-body">
            <div class="time-slots">
              <div 
                v-for="time in timeSlots" 
                :key="time"
                class="time-slot"
              >
                {{ time }}
              </div>
            </div>
            <div 
              v-for="day in currentWeek" 
              :key="day.date"
              class="week-day-column"
            >
              <div 
                v-for="time in timeSlots" 
                :key="time"
                class="time-slot-cell"
                @click="createAppointment(day.date, time)"
              >
                <template v-if="getAppointmentsForTime(day.date, time).length">
                  <div 
                    v-for="appointment in getAppointmentsForTime(day.date, time)" 
                    :key="appointment.id"
                    class="week-appointment"
                    :class="`appointment-${appointment.status?.toLowerCase() || 'unknown'}`"
                    @click.stop="viewAppointment(appointment)"
                  >
                    <div class="appointment-patient">{{ appointment.patient_name || 'Unknown Patient' }}</div>
                    <div class="appointment-type">{{ appointment.type_name || 'Unknown Type' }}</div>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <!-- Create Appointment Dialog -->
    <v-dialog v-model="showCreateDialog" max-width="600" persistent>
      <v-card>
        <v-card-title>Schedule New Appointment</v-card-title>
        <v-card-text>
          <v-form ref="createForm" @submit.prevent="createNewAppointment">
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="newAppointment.scheduled_date"
                  label="Date"
                  type="date"
                  variant="outlined"
                  :rules="[v => !!v || 'Date is required']"
                  :min="minDate"
                  @update:model-value="checkAvailability"
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
              <v-col cols="12" md="6">
                <v-autocomplete
                  v-model="newAppointment.patient_id"
                  :items="patientItems"
                  label="Patient"
                  variant="outlined"
                  :rules="[v => !!v || 'Patient is required']"
                  return-object
                  item-title="full_name"
                  item-value="patient_id"
                  :loading="loadingPatients"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="newAppointment.appointment_type_id"
                  :items="appointmentTypeItems"
                  label="Appointment Type"
                  variant="outlined"
                  :rules="[v => !!v || 'Appointment type is required']"
                  item-title="type_name"
                  item-value="id"
                  :loading="loadingTypes"
                  @update:model-value="checkAvailability"
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="newAppointment.notes"
                  label="Notes (Optional)"
                  variant="outlined"
                  rows="3"
                  placeholder="Additional notes about the appointment..."
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeCreateDialog">Cancel</v-btn>
          <v-btn 
            color="primary" 
            @click="createNewAppointment" 
            :loading="creatingAppointment"
            :disabled="!isFormValid"
          >
            Schedule Appointment
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Appointment Details Dialog -->
    <v-dialog v-model="showDetailsDialog" max-width="600">
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
                  <div class="text-caption text-medium-emphasis">Queue Number</div>
                  <div class="text-h4 font-weight-bold">{{ selectedAppointment.queue_number }}</div>
                  <div class="text-caption">
                    Status: 
                    <v-chip size="x-small" :color="getQueueStatusColor(selectedAppointment.queue_status)" class="ml-1">
                      {{ selectedAppointment.queue_status || 'Unknown' }}
                    </v-chip>
                  </div>
                </div>
              </v-card-text>
            </v-card>

            <v-row>
              <v-col cols="6">
                <div class="text-caption text-medium-emphasis">Appointment #</div>
                <div class="text-body-1 mb-4 font-weight-medium">{{ selectedAppointment.appointment_number || 'N/A' }}</div>
              </v-col>
              <v-col cols="6">
                <div class="text-caption text-medium-emphasis">Status</div>
                <v-chip 
                  :color="getStatusColor(selectedAppointment.status)"
                  size="small"
                  class="mb-4"
                >
                  {{ selectedAppointment.status || 'Unknown' }}
                </v-chip>
              </v-col>
              <v-col cols="6">
                <div class="text-caption text-medium-emphasis">Date</div>
                <div class="text-body-1 mb-4">{{ formatDate(selectedAppointment.scheduled_at) }}</div>
              </v-col>
              <v-col cols="6">
                <div class="text-caption text-medium-emphasis">Time</div>
                <div class="text-body-1 mb-4">{{ formatTime(selectedAppointment.scheduled_at) }}</div>
              </v-col>
              <v-col cols="12">
                <div class="text-caption text-medium-emphasis">Patient</div>
                <div class="text-body-1 mb-2">{{ selectedAppointment.patient_name || 'Unknown' }}</div>
                <div class="text-caption text-medium-emphasis">
                  ID: {{ selectedAppointment.patient_id || 'N/A' }}
                </div>
              </v-col>
              <v-col cols="12">
                <div class="text-caption text-medium-emphasis">Appointment Type</div>
                <div class="text-body-1 mb-4">{{ selectedAppointment.type_name || 'Unknown' }}</div>
              </v-col>
              <v-col cols="12" v-if="selectedAppointment.notes">
                <div class="text-caption text-medium-emphasis">Notes</div>
                <div class="text-body-1">{{ selectedAppointment.notes }}</div>
              </v-col>
              <v-col cols="12">
                <div class="text-caption text-medium-emphasis">Created</div>
                <div class="text-body-2 text-medium-emphasis">
                  {{ formatDateTime(selectedAppointment.created_at) }}
                </div>
              </v-col>
            </v-row>

            <!-- Lab Results Section -->
            <v-divider class="my-4" />
            <div class="text-h6 mb-2">Lab Results</div>
            <div v-if="selectedAppointment.lab_results?.length > 0">
              <v-chip
                v-for="lab in selectedAppointment.lab_results"
                :key="lab.id"
                size="small"
                class="mr-2 mb-2"
              >
                {{ lab.test_type || 'Unknown' }}: {{ lab.result_value || 'N/A' }} {{ lab.result_unit || '' }}
              </v-chip>
            </div>
            <div v-else class="text-body-2 text-medium-emphasis">
              No lab results for this appointment
            </div>

            <!-- Prescriptions Section -->
            <v-divider class="my-4" />
            <div class="text-h6 mb-2">Prescriptions</div>
            <div v-if="selectedAppointment.prescriptions?.length > 0">
              <v-list density="compact">
                <v-list-item
                  v-for="prescription in selectedAppointment.prescriptions"
                  :key="prescription.id"
                >
                  <v-list-item-title>{{ prescription.medication_name || 'Unknown' }}</v-list-item-title>
                  <v-list-item-subtitle>{{ prescription.dosage_instructions || 'No instructions' }}</v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </div>
            <div v-else class="text-body-2 text-medium-emphasis">
              No prescriptions for this appointment
            </div>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn-group>
            <v-btn 
              v-if="selectedAppointment?.status === 'SCHEDULED' || selectedAppointment?.status === 'CONFIRMED'"
              color="primary" 
              variant="outlined"
              @click="updateStatus('CONFIRMED')"
              :loading="updatingStatus"
            >
              Confirm
            </v-btn>
            <v-btn 
              v-if="selectedAppointment?.status === 'SCHEDULED' || selectedAppointment?.status === 'CONFIRMED'"
              color="success" 
              variant="outlined"
              @click="updateStatus('IN_PROGRESS')"
              :loading="updatingStatus"
            >
              Start
            </v-btn>
            <v-btn 
              v-if="selectedAppointment?.status === 'IN_PROGRESS'"
              color="success" 
              variant="outlined"
              @click="updateStatus('COMPLETED')"
              :loading="updatingStatus"
            >
              Complete
            </v-btn>
            <v-btn 
              v-if="selectedAppointment?.status === 'SCHEDULED' || selectedAppointment?.status === 'CONFIRMED'"
              color="error" 
              variant="outlined"
              @click="cancelAppointment"
              :loading="cancellingAppointment"
            >
              Cancel
            </v-btn>
            <v-btn 
              color="primary" 
              @click="showDetailsDialog = false"
            >
              Close
            </v-btn>
          </v-btn-group>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { appointmentsApi, patientsApi } from '@/api'

// State
const viewMode = ref('month')
const currentDate = ref(new Date())
const showCreateDialog = ref(false)
const showDetailsDialog = ref(false)
const selectedAppointment = ref(null)
const appointments = ref([])
const patients = ref([])
const appointmentTypes = ref([])
const loading = ref(false)
const loadingPatients = ref(false)
const loadingTypes = ref(false)
const creatingAppointment = ref(false)
const cancellingAppointment = ref(false)
const updatingStatus = ref(false)
const checkingAvailability = ref(false)
const stats = ref({ total: 0, by_status: [], upcoming: 0 })
const availableTimeSlots = ref([])
const error = ref(null)
const createForm = ref(null)

const newAppointment = ref({
  patient_id: '',
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
const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const timeSlots = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
]

// Computed
const currentMonth = computed(() => {
  return currentDate.value.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long'
  })
})

const minDate = computed(() => {
  return new Date().toISOString().split('T')[0]
})

const isFormValid = computed(() => {
  return newAppointment.value.patient_id &&
         newAppointment.value.appointment_type_id &&
         newAppointment.value.scheduled_date &&
         newAppointment.value.scheduled_time
})

const patientItems = computed(() => {
  if (!Array.isArray(patients.value)) return []
  
  return patients.value
    .filter(p => p && (p.first_name || p.last_name))
    .map(p => ({
      ...p,
      full_name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown Patient'
    }))
})

const appointmentTypeItems = computed(() => {
  return Array.isArray(appointmentTypes.value) ? appointmentTypes.value : []
})

const calendarDays = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  const safeAppointments = Array.isArray(appointments.value) ? appointments.value : []
  
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - firstDay.getDay())
  
  const endDate = new Date(lastDay)
  endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()))
  
  const days = []
  const current = new Date(startDate)
  const today = new Date().toISOString().split('T')[0]
  
  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0]
    const dayOfWeek = current.getDay()
    
    const dayAppointments = safeAppointments.filter(app => 
      app && app.scheduled_at && app.scheduled_at.startsWith(dateStr)
    )
    
    days.push({
      date: dateStr,
      day: current.getDate(),
      isCurrentMonth: current.getMonth() === month,
      isToday: dateStr === today,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      appointments: dayAppointments
    })
    current.setDate(current.getDate() + 1)
  }
  
  return days
})

const currentWeek = computed(() => {
  const startDate = new Date(currentDate.value)
  startDate.setDate(startDate.getDate() - startDate.getDay())
  
  const week = []
  const today = new Date().toISOString().split('T')[0]
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]
    const dayOfWeek = date.getDay()
    
    week.push({
      date: dateStr,
      weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
      day: date.getDate(),
      isToday: dateStr === today,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6
    })
  }
  
  return week
})

// Methods
const getStatusCount = (status) => {
  if (!stats.value || !Array.isArray(stats.value.by_status)) return 0
  const statusItem = stats.value.by_status.find(item => item && item.status === status)
  return statusItem ? (statusItem.count || 0) : 0
}

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
  if (!dateString) return 'N/A'
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  } catch {
    return 'Invalid Date'
  }
}

const formatTime = (dateString) => {
  if (!dateString) return 'N/A'
  try {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return 'Invalid Time'
  }
}

const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A'
  try {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return 'Invalid Date'
  }
}

const getAppointmentsForTime = (date, time) => {
  const safeAppointments = Array.isArray(appointments.value) ? appointments.value : []
  return safeAppointments.filter(app => {
    if (!app || !app.scheduled_at) return false
    try {
      const appDate = app.scheduled_at.split('T')[0]
      const appTime = app.scheduled_at.split('T')[1]?.substring(0, 5)
      return appDate === date && appTime === time
    } catch {
      return false
    }
  })
}

const previousMonth = () => {
  currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() - 1, 1)
}

const nextMonth = () => {
  currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 1)
}

const toggleViewMode = () => {
  viewMode.value = viewMode.value === 'month' ? 'week' : 'month'
}

// API Calls
async function loadAppointments() {
  loading.value = true
  error.value = null
  
  try {
    const year = currentDate.value.getFullYear()
    const month = currentDate.value.getMonth() + 1
    const lastDay = new Date(year, month, 0).getDate()
    
    const params = {
      date_from: `${year}-${month.toString().padStart(2, '0')}-01`,
      date_to: `${year}-${month.toString().padStart(2, '0')}-${lastDay}`
    }
    
    const response = await appointmentsApi.getAll(params)
    
    // Handle different response structures
    if (Array.isArray(response)) {
      appointments.value = response
    } else if (response && typeof response === 'object') {
      if (Array.isArray(response.data)) {
        appointments.value = response.data
      } else if (Array.isArray(response.appointments)) {
        appointments.value = response.appointments
      } else {
        appointments.value = []
      }
    } else {
      appointments.value = []
    }
  } catch (err) {
    console.error('Error loading appointments:', err)
    error.value = err.message || 'Failed to load appointments'
    appointments.value = []
    showSnackbar('Failed to load appointments', 'error')
  } finally {
    loading.value = false
  }
}

async function loadPatients() {
  loadingPatients.value = true
  try {
    const response = await patientsApi.getAll({ limit: 1000 })
    
    if (Array.isArray(response)) {
      patients.value = response
    } else if (response && typeof response === 'object') {
      if (Array.isArray(response.data)) {
        patients.value = response.data
      } else if (Array.isArray(response.patients)) {
        patients.value = response.patients
      } else {
        patients.value = []
      }
    } else {
      patients.value = []
    }
  } catch (error) {
    console.error('Error loading patients:', error)
    patients.value = []
    showSnackbar('Failed to load patients', 'error')
  } finally {
    loadingPatients.value = false
  }
}

async function loadAppointmentTypes() {
  loadingTypes.value = true
  try {
    const response = await appointmentsApi.getTypes()
    
    if (Array.isArray(response)) {
      appointmentTypes.value = response
    } else if (response && typeof response === 'object') {
      if (Array.isArray(response.data)) {
        appointmentTypes.value = response.data
      } else if (Array.isArray(response.types)) {
        appointmentTypes.value = response.types
      } else {
        appointmentTypes.value = []
      }
    } else {
      appointmentTypes.value = []
    }
  } catch (error) {
    console.error('Error loading appointment types:', error)
    appointmentTypes.value = []
    showSnackbar('Failed to load appointment types', 'error')
  } finally {
    loadingTypes.value = false
  }
}

async function loadStats() {
  try {
    const response = await appointmentsApi.getStats()
    stats.value = response && typeof response === 'object' ? response : { total: 0, by_status: [], upcoming: 0 }
  } catch (error) {
    console.error('Error loading stats:', error)
    stats.value = { total: 0, by_status: [], upcoming: 0 }
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
    
    if (response && Array.isArray(response.slots)) {
      availableTimeSlots.value = response.slots
        .filter(slot => slot && slot.available)
        .map(slot => slot.time)
        .filter(time => time)
    } else {
      availableTimeSlots.value = []
    }
  } catch (error) {
    console.error('Error checking availability:', error)
    availableTimeSlots.value = []
    showSnackbar('Failed to check availability', 'error')
  } finally {
    checkingAvailability.value = false
  }
}

async function createNewAppointment() {
  if (!isFormValid.value) return

  creatingAppointment.value = true
  try {
    const scheduled_at = `${newAppointment.value.scheduled_date}T${newAppointment.value.scheduled_time}:00`
    
    const appointmentData = {
      patient_id: newAppointment.value.patient_id,
      appointment_type_id: newAppointment.value.appointment_type_id,
      scheduled_at,
      notes: newAppointment.value.notes || null
    }

    await appointmentsApi.create(appointmentData)
    closeCreateDialog()
    await refreshData()
    showSnackbar('Appointment scheduled successfully')
  } catch (error) {
    console.error('Error creating appointment:', error)
    showSnackbar(error.response?.data?.error || 'Failed to schedule appointment', 'error')
  } finally {
    creatingAppointment.value = false
  }
}

async function viewAppointment(appointment) {
  if (!appointment || !appointment.id) {
    showSnackbar('Invalid appointment', 'error')
    return
  }

  try {
    const response = await appointmentsApi.getById(appointment.id)
    selectedAppointment.value = response || null
    showDetailsDialog.value = true
  } catch (error) {
    console.error('Error loading appointment details:', error)
    showSnackbar('Failed to load appointment details', 'error')
  }
}

async function updateStatus(status) {
  if (!selectedAppointment.value || !selectedAppointment.value.id) return

  updatingStatus.value = true
  try {
    await appointmentsApi.updateStatus(selectedAppointment.value.id, status)
    await refreshData()
    
    // Refresh selected appointment
    const response = await appointmentsApi.getById(selectedAppointment.value.id)
    selectedAppointment.value = response || null
    
    showSnackbar(`Appointment ${status.toLowerCase()} successfully`)
  } catch (error) {
    console.error('Error updating status:', error)
    showSnackbar('Failed to update status', 'error')
  } finally {
    updatingStatus.value = false
  }
}

async function cancelAppointment() {
  if (!selectedAppointment.value || !selectedAppointment.value.id) return

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

function createAppointment(date, time) {
  newAppointment.value.scheduled_date = date
  newAppointment.value.scheduled_time = time
  showCreateDialog.value = true
}

function closeCreateDialog() {
  showCreateDialog.value = false
  newAppointment.value = {
    patient_id: '',
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

async function refreshData() {
  error.value = null
  await Promise.allSettled([
    loadAppointments(),
    loadPatients(),
    loadAppointmentTypes(),
    loadStats()
  ])
}

// Lifecycle
onMounted(async () => {
  await refreshData()
})

// Watchers
watch([currentDate, viewMode], async () => {
  await loadAppointments()
})

watch(() => newAppointment.value.scheduled_date, () => {
  checkAvailability()
})

watch(() => newAppointment.value.appointment_type_id, () => {
  checkAvailability()
})
</script>

<style scoped>
.gap-2 {
  gap: 8px;
}

.gap-4 {
  gap: 16px;
}

.calendar-month {
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  overflow: hidden;
}

.calendar-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background: rgba(0, 0, 0, 0.02);
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

.calendar-header-day {
  padding: 12px;
  text-align: center;
  font-weight: 600;
  border-right: 1px solid rgba(0, 0, 0, 0.08);
}

.calendar-header-day:last-child {
  border-right: none;
}

.calendar-body {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.calendar-day {
  min-height: 120px;
  border-right: 1px solid rgba(0, 0, 0, 0.08);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  padding: 8px;
  background: white;
}

.calendar-day:nth-child(7n) {
  border-right: none;
}

.calendar-day-other {
  background: rgba(0, 0, 0, 0.04);
  color: rgba(0, 0, 0, 0.4);
}

.calendar-day-today {
  background: rgba(33, 150, 243, 0.08);
}

.calendar-day-weekend {
  background: rgba(0, 0, 0, 0.02);
}

.calendar-day-header {
  font-weight: 600;
  margin-bottom: 4px;
  text-align: center;
}

.calendar-day-appointments {
  max-height: 80px;
  overflow-y: auto;
}

.appointment-badge {
  padding: 4px 6px;
  border-radius: 4px;
  margin-bottom: 2px;
  cursor: pointer;
  font-size: 0.7rem;
  border-left: 3px solid transparent;
}

.appointment-scheduled {
  background: #E3F2FD;
  color: #1976D2;
  border-left-color: #2196F3;
}

.appointment-confirmed {
  background: #E8F5E8;
  color: #2E7D32;
  border-left-color: #4CAF50;
}

.appointment-in_progress {
  background: #FFF3E0;
  color: #EF6C00;
  border-left-color: #FF9800;
}

.appointment-completed {
  background: #F5F5F5;
  color: #616161;
  border-left-color: #9E9E9E;
}

.appointment-cancelled {
  background: #FFEBEE;
  color: #C62828;
  border-left-color: #F44336;
}

.appointment-no_show {
  background: #FFEBEE;
  color: #C62828;
  border-left-color: #F44336;
}

.appointment-time {
  font-weight: 600;
  font-size: 0.65rem;
}

.appointment-patient {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.65rem;
}

.appointment-type {
  font-size: 0.6rem;
  opacity: 0.8;
}

/* Week View Styles */
.calendar-week {
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  overflow: hidden;
}

.calendar-week-header {
  display: grid;
  grid-template-columns: 80px repeat(7, 1fr);
  background: rgba(0, 0, 0, 0.02);
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

.time-column {
  padding: 12px;
  border-right: 1px solid rgba(0, 0, 0, 0.08);
}

.week-day-header {
  padding: 12px;
  text-align: center;
  border-right: 1px solid rgba(0, 0, 0, 0.08);
}

.week-day-header:last-child {
  border-right: none;
}

.week-day-today {
  background: rgba(33, 150, 243, 0.08);
}

.week-day-weekend {
  background: rgba(0, 0, 0, 0.02);
}

.week-day-name {
  font-weight: 600;
  font-size: 0.875rem;
}

.week-day-date {
  font-size: 1.25rem;
  font-weight: 600;
}

.calendar-week-body {
  display: grid;
  grid-template-columns: 80px repeat(7, 1fr);
  max-height: 600px;
  overflow-y: auto;
}

.time-slots {
  border-right: 1px solid rgba(0, 0, 0, 0.08);
}

.time-slot {
  height: 60px;
  padding: 8px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
}

.week-day-column {
  border-right: 1px solid rgba(0, 0, 0, 0.08);
}

.week-day-column:last-child {
  border-right: none;
}

.time-slot-cell {
  height: 60px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  padding: 2px;
  cursor: pointer;
  position: relative;
  transition: background-color 0.2s;
}

.time-slot-cell:hover {
  background: rgba(0, 0, 0, 0.02);
}

.week-appointment {
  position: absolute;
  top: 2px;
  left: 2px;
  right: 2px;
  bottom: 2px;
  padding: 4px;
  border-radius: 4px;
  font-size: 0.7rem;
  overflow: hidden;
  border-left: 3px solid transparent;
  cursor: pointer;
}

.week-appointment:hover {
  opacity: 0.9;
  transform: scale(1.02);
  transition: all 0.2s;
}
</style>