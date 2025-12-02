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
            <div class="text-h5 font-weight-bold">{{ getStatusCount('scheduled') }}</div>
            <div class="text-body-2 text-medium-emphasis">Scheduled</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="2" border>
          <v-card-text class="text-center">
            <v-icon color="info" size="48" class="mb-2">mdi-calendar-check</v-icon>
            <div class="text-h5 font-weight-bold">{{ getStatusCount('completed') }}</div>
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
            @click="viewMode = viewMode === 'month' ? 'week' : 'month'"
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
        <!-- Month View -->
        <div v-if="viewMode === 'month'" class="calendar-month">
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
                <div 
                  v-for="appointment in day.appointments" 
                  :key="appointment.id"
                  class="appointment-badge"
                  :class="`appointment-${appointment.status}`"
                  @click="viewAppointment(appointment)"
                >
                  <div class="appointment-time">{{ appointment.time }}</div>
                  <div class="appointment-patient">{{ appointment.patient_name }}</div>
                  <div class="appointment-type">{{ appointment.appointment_type }}</div>
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
                <div 
                  v-for="appointment in getAppointmentsForTime(day.date, time)" 
                  :key="appointment.id"
                  class="week-appointment"
                  :class="`appointment-${appointment.status}`"
                  @click.stop="viewAppointment(appointment)"
                >
                  <div class="appointment-patient">{{ appointment.patient_name }}</div>
                  <div class="appointment-type">{{ appointment.appointment_type }}</div>
                  <div class="appointment-time">{{ appointment.time }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <!-- Create Appointment Dialog -->
    <v-dialog v-model="showCreateDialog" max-width="600">
      <v-card>
        <v-card-title>Schedule New Appointment</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="createNewAppointment" ref="createForm">
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="newAppointment.date"
                  label="Date"
                  type="date"
                  variant="outlined"
                  :rules="[v => !!v || 'Date is required']"
                  :min="new Date().toISOString().split('T')[0]"
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
              <v-col cols="12" md="6">
                <v-autocomplete
                  v-model="newAppointment.patient_id"
                  :items="patients"
                  item-title="name"
                  item-value="patient_id"
                  label="Patient"
                  variant="outlined"
                  :rules="[v => !!v || 'Patient is required']"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="newAppointment.appointment_type"
                  :items="appointmentTypes"
                  label="Appointment Type"
                  variant="outlined"
                  :rules="[v => !!v || 'Appointment type is required']"
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
          <v-btn variant="text" @click="showCreateDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="createNewAppointment" :loading="creatingAppointment">
            Schedule Appointment
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
            <v-row>
              <v-col cols="6">
                <div class="text-caption text-medium-emphasis">Date</div>
                <div class="text-body-1 mb-4">{{ formatDate(selectedAppointment.date) }}</div>
              </v-col>
              <v-col cols="6">
                <div class="text-caption text-medium-emphasis">Time</div>
                <div class="text-body-1 mb-4">{{ selectedAppointment.time }}</div>
              </v-col>
              <v-col cols="12">
                <div class="text-caption text-medium-emphasis">Patient</div>
                <div class="text-body-1 mb-4">{{ selectedAppointment.patient_name }}</div>
                <div class="text-caption text-medium-emphasis">
                  ID: {{ selectedAppointment.patient_id }}
                </div>
              </v-col>
              <v-col cols="12">
                <div class="text-caption text-medium-emphasis">Appointment Type</div>
                <div class="text-body-1 mb-4">{{ selectedAppointment.appointment_type }}</div>
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
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn 
            v-if="selectedAppointment?.status === 'scheduled'"
            color="error" 
            variant="outlined"
            @click="cancelAppointment(selectedAppointment)"
            :loading="cancellingAppointment"
          >
            Cancel Appointment
          </v-btn>
          <v-btn 
            color="primary" 
            @click="showDetailsDialog = false"
          >
            Close
          </v-btn>
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

const viewMode = ref('month')
const currentDate = ref(new Date())
const showCreateDialog = ref(false)
const showDetailsDialog = ref(false)
const selectedAppointment = ref(null)
const appointments = ref([])
const patients = ref([])
const loading = ref(false)
const creatingAppointment = ref(false)
const cancellingAppointment = ref(false)
const stats = ref({})

const newAppointment = ref({
  date: '',
  time: '',
  patient_id: '',
  appointment_type: '',
  notes: ''
})

const snackbar = ref({
  show: false,
  message: '',
  color: 'success'
})

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const timeSlots = [
  '08:00', '09:00', '10:00', '11:00', '12:00', 
  '13:00', '14:00', '15:00', '16:00', '17:00'
]

const appointmentTypes = [
  'Consultation',
  'HIV Test',
  'Follow-up'
]

const currentMonth = computed(() => {
  return currentDate.value.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long'
  })
})

const calendarDays = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - firstDay.getDay())
  
  const endDate = new Date(lastDay)
  endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()))
  
  const days = []
  const current = new Date(startDate)
  
  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0]
    const dayOfWeek = current.getDay()
    days.push({
      date: dateStr,
      day: current.getDate(),
      isCurrentMonth: current.getMonth() === month,
      isToday: dateStr === new Date().toISOString().split('T')[0],
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      appointments: appointments.value.filter(app => app.date === dateStr)
    })
    current.setDate(current.getDate() + 1)
  }
  
  return days
})

const currentWeek = computed(() => {
  const startDate = new Date(currentDate.value)
  startDate.setDate(startDate.getDate() - startDate.getDay())
  
  const week = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]
    const dayOfWeek = date.getDay()
    
    week.push({
      date: dateStr,
      weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
      day: date.getDate(),
      isToday: dateStr === new Date().toISOString().split('T')[0],
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6
    })
  }
  
  return week
})

const getStatusCount = (status) => {
  if (!stats.value.status_breakdown) return 0
  const statusItem = stats.value.status_breakdown.find(item => item.status === status)
  return statusItem ? statusItem.count : 0
}

onMounted(async () => {
  await refreshData()
})

// Reload data when month changes
watch([currentDate, viewMode], async () => {
  await loadAppointments()
})

async function refreshData() {
  await Promise.all([loadAppointments(), loadPatients(), loadStats()])
}

async function loadAppointments() {
  loading.value = true
  try {
    const year = currentDate.value.getFullYear()
    const month = currentDate.value.getMonth() + 1
    
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`
    const endDate = `${year}-${month.toString().padStart(2, '0')}-${new Date(year, month, 0).getDate()}`
    
    const response = await appointmentsApi.getCalendar({
      start_date: startDate,
      end_date: endDate
    })
    appointments.value = response.data.appointments || []
  } catch (error) {
    console.error('Error loading appointments:', error)
    showSnackbar('Failed to load appointments', 'error')
  } finally {
    loading.value = false
  }
}

async function loadPatients() {
  try {
    const response = await patientsApi.getAll()
    patients.value = response.data.patients || []
  } catch (error) {
    console.error('Error loading patients:', error)
  }
}

async function loadStats() {
  try {
    const response = await appointmentsApi.getStats()
    stats.value = response.data
  } catch (error) {
    console.error('Error loading stats:', error)
  }
}

function previousMonth() {
  currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() - 1, 1)
}

function nextMonth() {
  currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 1)
}

function getAppointmentsForTime(date, time) {
  return appointments.value.filter(app => 
    app.date === date && app.time.startsWith(time)
  )
}

function getStatusColor(status) {
  const colors = {
    'scheduled': 'primary',
    'confirmed': 'success',
    'completed': 'info',
    'cancelled': 'error',
    'no_show': 'warning'
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

function formatDateTime(dateString) {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function viewAppointment(appointment) {
  selectedAppointment.value = appointment
  showDetailsDialog.value = true
}

function createAppointment(date, time) {
  newAppointment.value.date = date
  newAppointment.value.time = time
  showCreateDialog.value = true
}

async function createNewAppointment() {
  const { valid } = await createForm.value.validate()
  
  if (!valid) return

  creatingAppointment.value = true
  try {
    const appointmentData = {
      ...newAppointment.value,
      appointment_date: `${newAppointment.value.date}T${newAppointment.value.time}`
    }

    await appointmentsApi.create(appointmentData)
    showCreateDialog.value = false
    await refreshData()
    
    // Reset form
    newAppointment.value = {
      date: '',
      time: '',
      patient_id: '',
      appointment_type: '',
      notes: ''
    }

    showSnackbar('Appointment scheduled successfully')
  } catch (error) {
    console.error('Error creating appointment:', error)
    showSnackbar('Failed to schedule appointment', 'error')
  } finally {
    creatingAppointment.value = false
  }
}

async function cancelAppointment(appointment) {
  if (!confirm('Are you sure you want to cancel this appointment?')) return

  cancellingAppointment.value = true
  try {
    await appointmentsApi.cancel(appointment.id)
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

function showSnackbar(message, color = 'success') {
  snackbar.value = {
    show: true,
    message,
    color
  }
}
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
  background: #FFF3E0;
  color: #EF6C00;
  border-left-color: #FF9800;
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
}

.week-appointment:hover {
  opacity: 0.9;
  transform: scale(1.02);
  transition: all 0.2s;
}
</style>