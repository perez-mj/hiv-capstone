<!-- frontend/src/views/staff/appointments/CalendarView.vue -->
<template>
  <v-container fluid class="pa-4">
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex justify-space-between align-center">
            Appointment Calendar
            <v-spacer></v-spacer>
            <v-btn color="success" @click="navigateToCreate" class="mr-2">
              <v-icon start>mdi-plus</v-icon>
              New
            </v-btn>
            <v-btn color="primary" @click="navigateToList" class="mr-2">
              <v-icon start>mdi-format-list-bulleted</v-icon>
              List View
            </v-btn>
            <v-btn 
              v-if="hasPastAppointments" 
              color="warning" 
              @click="showBulkCancelDialog"
              class="mr-2"
            >
              <v-icon start>mdi-calendar-remove</v-icon>
              Cancel Past Appointments
            </v-btn>
          </v-card-title>
          <v-divider></v-divider>
          
          <v-card-text>
            <!-- Calendar Controls -->
            <v-row class="mb-4" align="center">
              <v-col cols="12" md="4" class="d-flex align-center">
                <v-btn 
                  icon="mdi-chevron-left" 
                  variant="text"
                  @click="prevMonth"
                  class="mr-2"
                ></v-btn>
                
                <span class="text-h6 font-weight-medium">
                  {{ currentMonthName }} {{ currentYear }}
                </span>
                
                <v-btn 
                  icon="mdi-chevron-right"
                  variant="text" 
                  @click="nextMonth"
                  class="ml-2"
                ></v-btn>
                
                <v-btn 
                  color="primary" 
                  variant="text" 
                  @click="goToToday"
                  class="ml-4"
                >
                  Today
                </v-btn>
              </v-col>
              
              <v-col cols="12" md="8" class="d-flex justify-md-end">
                <v-select
                  v-model="officeFilter"
                  :items="officeOptions"
                  label="Filter by Office"
                  clearable
                  variant="outlined"
                  density="comfortable"
                  class="mr-2"
                  style="max-width: 180px;"
                  @update:model-value="loadAppointments"
                ></v-select>
                
                <v-select
                  v-model="statusFilter"
                  :items="statusOptions"
                  label="Filter by Status"
                  clearable
                  variant="outlined"
                  density="comfortable"
                  style="max-width: 180px;"
                  @update:model-value="loadAppointments"
                ></v-select>
              </v-col>
            </v-row>

            <!-- Calendar Grid -->
            <v-sheet class="calendar-grid" :class="{ 'calendar-grid-dark': isDarkTheme }">
              <!-- Day Headers -->
              <div class="calendar-header" :class="{ 'calendar-header-dark': isDarkTheme }">
                <div v-for="day in weekDays" :key="day" class="calendar-header-cell">
                  {{ day }}
                </div>
              </div>
              
              <!-- Calendar Days -->
              <div class="calendar-body">
                <div 
                  v-for="day in calendarDays" 
                  :key="day.date"
                  class="calendar-day"
                  :class="{
                    'other-month': day.isOtherMonth,
                    'today': day.isToday,
                    'has-events': day.events && day.events.length > 0,
                    'calendar-day-dark': isDarkTheme,
                    'calendar-day-other-dark': isDarkTheme && day.isOtherMonth,
                    'calendar-day-today-dark': isDarkTheme && day.isToday
                  }"
                  @click="viewDay(day.date)"
                >
                  <div class="calendar-day-number" :class="{ 'calendar-day-number-dark': isDarkTheme }">
                    {{ day.day }}
                  </div>
                  <div class="calendar-day-events">
                    <!-- Show up to 3 appointments -->
                    <div 
                      v-for="(event, index) in day.events.slice(0, 3)" 
                      :key="event.id"
                      class="calendar-event"
                      :style="{ backgroundColor: getEventColor(event) }"
                      @click.stop="showEvent(event)"
                    >
                      <span class="event-time">{{ formatTimeSlot(event.time_slot) }}</span>
                      <span class="event-patient">{{ event.Patient?.first_name }} {{ event.Patient?.last_name }}</span>
                    </div>
                    <!-- Show "more" indicator if 4+ appointments -->
                    <div 
                      v-if="day.events.length > 3"
                      class="calendar-event more-events"
                      style="background-color: #757575;"
                      @click.stop="viewDay(day.date)"
                    >
                      <span class="event-more">+{{ day.events.length - 3 }} more</span>
                    </div>
                  </div>
                </div>
              </div>
            </v-sheet>

            <!-- Legend -->
            <v-row class="mt-4">
              <v-col cols="12" class="d-flex justify-center">
                <div class="legend-container">
                  <div class="legend-item" :class="{ 'legend-item-dark': isDarkTheme }">
                    <span class="legend-dot" style="background-color: #1976D2;"></span>
                    Scheduled
                  </div>
                  <div class="legend-item" :class="{ 'legend-item-dark': isDarkTheme }">
                    <span class="legend-dot" style="background-color: #4CAF50;"></span>
                    Completed
                  </div>
                  <div class="legend-item" :class="{ 'legend-item-dark': isDarkTheme }">
                    <span class="legend-dot" style="background-color: #9E9E9E;"></span>
                    Cancelled
                  </div>
                  <div class="legend-item" :class="{ 'legend-item-dark': isDarkTheme }">
                    <span class="legend-dot" style="background-color: #FFC107;"></span>
                    In Queue
                  </div>
                  <div class="legend-item" :class="{ 'legend-item-dark': isDarkTheme }">
                    <span class="legend-dot" style="background-color: #795548;"></span>
                    No-Show
                  </div>
                </div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Enhanced Event Detail Dialog (matching ListView) -->
    <v-dialog v-model="eventDialog" max-width="600px">
      <v-card rounded="lg">
        <v-card-title class="d-flex justify-space-between align-center pa-4">
          <span class="text-h6 font-weight-bold">Appointment Details</span>
          <v-btn
            icon="mdi-close"
            variant="text"
            @click="eventDialog = false"
            size="small"
          ></v-btn>
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pt-4" v-if="selectedEvent">
          <v-list density="compact">
            <v-list-item>
              <v-list-item-content>
                <v-list-item-title class="text-caption font-weight-bold text-medium-emphasis">Patient</v-list-item-title>
                <v-list-item-subtitle class="text-body-1">
                  {{ selectedEvent.Patient?.first_name }} {{ selectedEvent.Patient?.last_name }}
                </v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
            <v-divider></v-divider>
            
            <v-list-item>
              <v-list-item-content>
                <v-list-item-title class="text-caption font-weight-bold text-medium-emphasis">Transaction Type</v-list-item-title>
                <v-list-item-subtitle class="text-body-1">
                  <v-chip 
                    v-if="selectedEvent.TransactionType"
                    :color="selectedEvent.TransactionType.color_code || 'primary'"
                    size="small"
                    class="font-weight-medium"
                    :style="`background-color: ${selectedEvent.TransactionType.color_code || '#1976D2'}20; color: ${selectedEvent.TransactionType.color_code || '#1976D2'}; border: 1px solid ${selectedEvent.TransactionType.color_code || '#1976D2'}40;`"
                  >
                    {{ selectedEvent.TransactionType.name }}
                  </v-chip>
                  <span v-else class="text-medium-emphasis">N/A</span>
                </v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
            <v-divider></v-divider>
            
            <v-list-item>
              <v-list-item-content>
                <v-list-item-title class="text-caption font-weight-bold text-medium-emphasis">Date</v-list-item-title>
                <v-list-item-subtitle class="text-body-1">{{ formatDate(selectedEvent.appointment_date) }}</v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
            <v-divider></v-divider>
            
            <v-list-item>
              <v-list-item-content>
                <v-list-item-title class="text-caption font-weight-bold text-medium-emphasis">Time</v-list-item-title>
                <v-list-item-subtitle class="text-body-1">{{ formatTimeSlot(selectedEvent.time_slot) }}</v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
            <v-divider></v-divider>
            
            <v-list-item>
              <v-list-item-content>
                <v-list-item-title class="text-caption font-weight-bold text-medium-emphasis">Office</v-list-item-title>
                <v-list-item-subtitle class="text-body-1">
                  <v-chip 
                    :color="selectedEvent.office === 'testing' ? 'info' : 'success'" 
                    size="small"
                    variant="tonal"
                  >
                    {{ selectedEvent.office }}
                  </v-chip>
                </v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
            <v-divider></v-divider>
            
            <v-list-item>
              <v-list-item-content>
                <v-list-item-title class="text-caption font-weight-bold text-medium-emphasis">Status</v-list-item-title>
                <v-list-item-subtitle>
                  <v-chip 
                    :color="getStatusColor(selectedEvent.status)" 
                    size="small"
                    variant="tonal"
                    class="font-weight-medium"
                  >
                    {{ formatStatusLabel(selectedEvent.status) }}
                  </v-chip>
                </v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
            
            <v-divider v-if="selectedEvent.notes"></v-divider>
            <v-list-item v-if="selectedEvent.notes">
              <v-list-item-content>
                <v-list-item-title class="text-caption font-weight-bold text-medium-emphasis">Notes</v-list-item-title>
                <v-list-item-subtitle class="text-body-2">{{ selectedEvent.notes }}</v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
            
            <v-divider v-if="selectedEvent.cancellation_reason"></v-divider>
            <v-list-item v-if="selectedEvent.cancellation_reason">
              <v-list-item-content>
                <v-list-item-title class="text-caption font-weight-bold text-medium-emphasis">Cancellation Reason</v-list-item-title>
                <v-list-item-subtitle class="text-body-2">{{ selectedEvent.cancellation_reason }}</v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-card-actions v-if="selectedEvent" class="pa-4">
          <v-btn 
            color="primary" 
            @click="viewAppointmentDetails(selectedEvent.id)"
            variant="tonal"
          >
            <v-icon start>mdi-eye</v-icon>
            View Full Details
          </v-btn>
          <v-btn 
            color="success" 
            @click="checkInFromCalendar(selectedEvent.id)"
            :disabled="selectedEvent.status !== 'pending'"
            :loading="checkingIn === selectedEvent.id"
            variant="tonal"
          >
            <v-icon start>mdi-plus</v-icon>
            Add to Queue
          </v-btn>
          <v-btn 
            color="error" 
            @click="cancelAppointment(selectedEvent.id)"
            :disabled="selectedEvent.status === 'completed' || selectedEvent.status === 'cancelled'"
            variant="tonal"
          >
            <v-icon start>mdi-cancel</v-icon>
            Cancel
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Cancel Appointment Dialog -->
    <v-dialog v-model="cancelDialog" max-width="500px">
      <v-card>
        <v-card-title class="text-h6">
          <v-icon start color="error">mdi-alert-circle</v-icon>
          Cancel Appointment
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pt-4">
          <p class="text-subtitle-1">
            Are you sure you want to cancel this appointment?
          </p>
          
          <!-- Quick reason selection -->
          <v-select
            v-model="cancelReasonTemplate"
            :items="cancellationReasonTemplates"
            label="Quick reason (optional)"
            placeholder="Select a common reason..."
            variant="outlined"
            density="comfortable"
            clearable
            class="mb-3"
            @update:model-value="applyCancelReasonTemplate"
          ></v-select>
          
          <v-textarea
            v-model="cancelReason"
            label="Cancellation Reason"
            placeholder="Please provide a reason for cancellation..."
            rows="3"
            variant="outlined"
            required
            :rules="[v => !!v || 'Cancellation reason is required']"
          ></v-textarea>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="outlined" @click="closeCancelDialog">Keep Appointment</v-btn>
          <v-btn color="error" @click="confirmCancel" :loading="cancelling">
            <v-icon start>mdi-cancel</v-icon>
            Cancel Appointment
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Bulk Cancel Dialog -->
    <v-dialog v-model="bulkCancelDialog" max-width="650px">
      <v-card>
        <v-card-title class="text-h6">
          <v-icon start color="warning">mdi-calendar-remove</v-icon>
          Cancel Past Appointments
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pt-4">
          <v-alert type="warning" variant="tonal" class="mb-4">
            <div class="d-flex align-center">
              <v-icon start color="warning">mdi-alert-circle</v-icon>
              <span class="font-weight-medium">This action cannot be undone!</span>
            </div>
          </v-alert>

          <p class="text-subtitle-1 mb-2">
            You are about to cancel all <strong>pending</strong> and <strong>in queue</strong> appointments that occurred before today.
          </p>

          <v-card variant="outlined" class="mb-4">
            <v-card-text>
              <div class="d-flex justify-space-between align-center mb-2">
                <span class="font-weight-medium">Total appointments to cancel:</span>
                <v-chip color="warning" size="large">
                  {{ pastAppointmentsToCancel.length }}
                </v-chip>
              </div>

              <v-divider class="mb-3"></v-divider>

              <div v-if="pastAppointmentsToCancel.length > 0" class="past-appointments-list">
                <div 
                  v-for="appt in pastAppointmentsToCancel.slice(0, 10)" 
                  :key="appt.id"
                  class="d-flex justify-space-between align-center pa-2 appointment-item"
                >
                  <div>
                    <span class="font-weight-medium">
                      {{ appt.Patient?.first_name }} {{ appt.Patient?.last_name }}
                    </span>
                    <span class="text-caption text-grey d-block">
                      {{ formatDate(appt.appointment_date) }} at {{ formatTimeSlot(appt.time_slot) }}
                      <v-chip :color="appt.office === 'testing' ? 'info' : 'success'" size="x-small" text-color="white">
                        {{ appt.office }}
                      </v-chip>
                      <v-chip :color="getStatusColor(appt.status)" size="x-small">
                        {{ formatStatusLabel(appt.status) }}
                      </v-chip>
                    </span>
                  </div>
                </div>
                <div v-if="pastAppointmentsToCancel.length > 10" class="text-caption text-grey mt-2">
                  And {{ pastAppointmentsToCancel.length - 10 }} more...
                </div>
              </div>
            </v-card-text>
          </v-card>

          <!-- Quick reason selection for bulk cancel -->
          <v-select
            v-model="bulkCancelReasonTemplate"
            :items="cancellationReasonTemplates"
            label="Quick reason (optional)"
            placeholder="Select a common reason..."
            variant="outlined"
            density="comfortable"
            clearable
            class="mb-3"
            @update:model-value="applyBulkCancelReasonTemplate"
          ></v-select>

          <v-textarea
            v-model="bulkCancelReason"
            label="Bulk Cancellation Reason"
            placeholder="Please provide a reason for cancelling these appointments..."
            rows="3"
            variant="outlined"
            required
            :rules="[v => !!v || 'Cancellation reason is required']"
          ></v-textarea>

          <v-alert type="info" variant="tonal" class="mt-3">
            <div class="d-flex align-start">
              <v-icon start color="info" class="mr-2">mdi-information</v-icon>
              <span>
                <strong>Tip:</strong> You can use the quick reason selector above to auto-fill common cancellation reasons, 
                then customize if needed.
              </span>
            </div>
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="outlined" @click="closeBulkCancelDialog">Cancel</v-btn>
          <v-btn 
            color="warning" 
            @click="confirmBulkCancel" 
            :loading="bulkCancelling"
            :disabled="pastAppointmentsToCancel.length === 0 || !bulkCancelReason.trim()"
          >
            <v-icon start>mdi-calendar-remove</v-icon>
            Cancel {{ pastAppointmentsToCancel.length }} Appointments
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000" rounded>
      <v-icon left size="20" class="mr-2">{{ snackbar.icon }}</v-icon>
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useTheme } from 'vuetify'
import { useAppointmentStore } from '@/stores/appointmentStore'

export default {
  name: 'AppointmentCalendar',
  setup() {
    const router = useRouter()
    const theme = useTheme()
    const appointmentStore = useAppointmentStore()
    
    const currentDate = ref(new Date())
    const appointments = ref([])
    const loading = ref(false)
    const checkingIn = ref(null)
    const officeFilter = ref(null)
    const statusFilter = ref(null)
    const eventDialog = ref(false)
    const cancelDialog = ref(false)
    const bulkCancelDialog = ref(false)
    const cancelling = ref(false)
    const bulkCancelling = ref(false)
    const selectedEvent = ref(null)
    const cancelAppointmentId = ref(null)
    const cancelReason = ref('')
    const cancelReasonTemplate = ref(null)
    const bulkCancelReason = ref('')
    const bulkCancelReasonTemplate = ref(null)

    const snackbar = ref({
      show: false,
      message: '',
      color: 'success',
      icon: 'mdi-check-circle'
    })

    // Check if dark theme is active
    const isDarkTheme = computed(() => theme.current.value.dark)

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    
    const officeOptions = [
      { title: 'All Offices', value: null },
      { title: 'Testing', value: 'testing' },
      { title: 'Treatment', value: 'treatment' }
    ]

    const statusOptions = [
      { title: 'All Status', value: null },
      { title: 'Pending', value: 'pending' },
      { title: 'In Queue', value: 'checked-in' },
      { title: 'Completed', value: 'completed' },
      { title: 'Cancelled', value: 'cancelled' },
      { title: 'No-Show', value: 'no-show' }
    ]

    // Common cancellation reasons templates
    const cancellationReasonTemplates = [
      { title: 'Patient did not show up (No-Show)', value: 'Patient did not show up for the appointment.' },
      { title: 'Patient requested cancellation', value: 'Patient requested to cancel the appointment.' },
      { title: 'Clinic schedule change', value: 'Cancelled due to clinic schedule change.' },
      { title: 'Staff availability change', value: 'Cancelled due to staff availability change.' },
      { title: 'Rescheduled to another date', value: 'Appointment rescheduled to a different date.' },
      { title: 'Duplicate appointment', value: 'Duplicate appointment entry - cancelling this one.' },
      { title: 'Past appointment - automatic cleanup', value: 'Past appointment automatically cancelled during cleanup.' },
      { title: 'Patient no longer needs appointment', value: 'Patient no longer requires this appointment.' }
    ]

    const currentMonthName = computed(() => {
      return currentDate.value.toLocaleString('default', { month: 'long' })
    })

    const currentYear = computed(() => {
      return currentDate.value.getFullYear()
    })

    /**
     * Formats a Date object to YYYY-MM-DD in local timezone
     * This fixes the timezone bug where toISOString() would shift the date
     */
    const formatLocalDate = (date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    /**
     * Format status label for display (convert checked-in to In Queue)
     */
    const formatStatusLabel = (status) => {
      if (status === 'checked-in') return 'In Queue'
      return status.charAt(0).toUpperCase() + status.slice(1)
    }

    /**
     * Get all past appointments that are pending or checked-in
     */
    const pastAppointmentsToCancel = computed(() => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStr = formatLocalDate(today)

      return appointments.value.filter(appt => {
        // Only include pending or checked-in appointments
        if (appt.status !== 'pending' && appt.status !== 'checked-in') {
          return false
        }

        // Check if the appointment date is in the past
        const apptDate = new Date(appt.appointment_date + 'T00:00:00')
        apptDate.setHours(0, 0, 0, 0)
        return apptDate < today
      })
    })

    /**
     * Check if there are any past appointments to cancel
     */
    const hasPastAppointments = computed(() => {
      return pastAppointmentsToCancel.value.length > 0
    })

    const getEventColor = (appointment) => {
      if (appointment.status === 'cancelled') return '#9E9E9E'
      if (appointment.status === 'completed') return '#4CAF50'
      if (appointment.status === 'checked-in') return '#FFC107'
      if (appointment.type === 'walk-in') return '#FF9800'
      return '#1976D2'
    }

    const getStatusColor = (status) => {
      const colors = {
        pending: 'info',
        'checked-in': 'warning',
        completed: 'success',
        cancelled: 'error',
        'no-show': 'grey'
      }
      return colors[status] || 'primary'
    }

    const formatDate = (date) => {
      if (!date) return 'N/A'
      try {
        return new Date(date).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })
      } catch {
        return 'Invalid date'
      }
    }

    const formatTimeSlot = (time) => {
      if (!time) return 'N/A'
      try {
        const parts = time.split(':')
        const hour = parseInt(parts[0])
        const minute = parts[1]
        const ampm = hour >= 12 ? 'PM' : 'AM'
        const hour12 = hour % 12 || 12
        return `${hour12}:${minute} ${ampm}`
      } catch {
        return time
      }
    }

    const getDaysInMonth = (year, month) => {
      return new Date(year, month + 1, 0).getDate()
    }

    const getFirstDayOfMonth = (year, month) => {
      return new Date(year, month, 1).getDay()
    }

    const calendarDays = computed(() => {
      const year = currentDate.value.getFullYear()
      const month = currentDate.value.getMonth()
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStr = formatLocalDate(today)
      
      const daysInMonth = getDaysInMonth(year, month)
      const firstDay = getFirstDayOfMonth(year, month)
      
      const days = []
      
      // Previous month days (starting from Sunday)
      const daysInPrevMonth = getDaysInMonth(year, month - 1)
      const prevMonthStart = firstDay
      
      for (let i = prevMonthStart - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i
        const date = new Date(year, month - 1, day)
        date.setHours(0, 0, 0, 0)
        const dateStr = formatLocalDate(date)
        days.push({
          day,
          date: dateStr,
          isOtherMonth: true,
          isToday: dateStr === todayStr,
          events: []
        })
      }
      
      // Current month days
      for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(year, month, i)
        date.setHours(0, 0, 0, 0)
        const dateStr = formatLocalDate(date)
        const isToday = dateStr === todayStr
        
        // Get appointments for this day
        const dayAppointments = appointments.value.filter(appt => 
          appt.appointment_date === dateStr
        )
        
        days.push({
          day: i,
          date: dateStr,
          isOtherMonth: false,
          isToday,
          events: dayAppointments
        })
      }
      
      // Next month days (to fill up to 42 days - 6 rows of 7 days)
      const remainingDays = 42 - days.length
      for (let i = 1; i <= remainingDays; i++) {
        const date = new Date(year, month + 1, i)
        date.setHours(0, 0, 0, 0)
        const dateStr = formatLocalDate(date)
        days.push({
          day: i,
          date: dateStr,
          isOtherMonth: true,
          isToday: dateStr === todayStr,
          events: []
        })
      }
      
      return days
    })

    const loadAppointments = async () => {
      loading.value = true
      try {
        const year = currentDate.value.getFullYear()
        const month = currentDate.value.getMonth()
        const monthStart = new Date(year, month, 1)
        const monthEnd = new Date(year, month + 1, 0)
        
        const allAppointments = []
        const day = new Date(monthStart)
        
        while (day <= monthEnd) {
          const dateStr = formatLocalDate(day)
          try {
            const appts = await appointmentStore.loadAppointmentsByDate(
              dateStr,
              officeFilter.value || null
            )
            
            appts.forEach(appt => {
              if (appt.Patient) {
                if (statusFilter.value && appt.status !== statusFilter.value) {
                  return
                }
                allAppointments.push(appt)
              }
            })
          } catch (error) {
            console.error(`Failed to load appointments for ${dateStr}:`, error)
          }
          day.setDate(day.getDate() + 1)
        }
        appointments.value = allAppointments
      } catch (error) {
        showSnackbar('Failed to load appointments: ' + error.message, 'error')
      } finally {
        loading.value = false
      }
    }

    const prevMonth = () => {
      const newDate = new Date(currentDate.value)
      newDate.setMonth(newDate.getMonth() - 1)
      currentDate.value = newDate
      loadAppointments()
    }

    const nextMonth = () => {
      const newDate = new Date(currentDate.value)
      newDate.setMonth(newDate.getMonth() + 1)
      currentDate.value = newDate
      loadAppointments()
    }

    const goToToday = () => {
      currentDate.value = new Date()
      loadAppointments()
    }

    const viewDay = (date) => {
      router.push(`/appointments?date=${date}`)
    }

    const showEvent = (event) => {
      selectedEvent.value = event
      eventDialog.value = true
    }

    const viewAppointmentDetails = (id) => {
      eventDialog.value = false
      if (id) {
        router.push(`/appointments/${id}`)
      }
    }

    const checkInFromCalendar = async (id) => {
      if (!id) return
      checkingIn.value = id
      try {
        await appointmentStore.checkInPatient(id)
        showSnackbar('Patient checked in successfully', 'success')
        eventDialog.value = false
        await loadAppointments()
      } catch (error) {
        showSnackbar('Failed to check in: ' + error.message, 'error')
      } finally {
        checkingIn.value = null
      }
    }

    const cancelAppointment = (id) => {
      if (!id) return
      cancelAppointmentId.value = id
      cancelReason.value = ''
      cancelReasonTemplate.value = null
      cancelDialog.value = true
      eventDialog.value = false
    }

    const closeCancelDialog = () => {
      cancelDialog.value = false
      cancelAppointmentId.value = null
      cancelReason.value = ''
      cancelReasonTemplate.value = null
    }

    const applyCancelReasonTemplate = () => {
      if (cancelReasonTemplate.value) {
        cancelReason.value = cancelReasonTemplate.value
      }
    }

    const confirmCancel = async () => {
      if (!cancelReason.value.trim()) {
        showSnackbar('Please provide a cancellation reason', 'warning')
        return
      }

      cancelling.value = true
      try {
        await appointmentStore.cancelAppointment(cancelAppointmentId.value, cancelReason.value)
        showSnackbar('Appointment cancelled successfully', 'warning')
        closeCancelDialog()
        await loadAppointments()
      } catch (error) {
        showSnackbar('Failed to cancel: ' + error.message, 'error')
      } finally {
        cancelling.value = false
      }
    }

    /**
     * Show the bulk cancel dialog
     */
    const showBulkCancelDialog = () => {
      bulkCancelReason.value = ''
      bulkCancelReasonTemplate.value = null
      bulkCancelDialog.value = true
    }

    /**
     * Close the bulk cancel dialog
     */
    const closeBulkCancelDialog = () => {
      bulkCancelDialog.value = false
      bulkCancelReason.value = ''
      bulkCancelReasonTemplate.value = null
    }

    /**
     * Apply template to bulk cancel reason
     */
    const applyBulkCancelReasonTemplate = () => {
      if (bulkCancelReasonTemplate.value) {
        bulkCancelReason.value = bulkCancelReasonTemplate.value
      }
    }

    /**
     * Confirm and execute bulk cancellation
     */
    const confirmBulkCancel = async () => {
      if (!bulkCancelReason.value.trim()) {
        showSnackbar('Please provide a cancellation reason', 'warning')
        return
      }

      if (pastAppointmentsToCancel.value.length === 0) {
        showSnackbar('No past appointments to cancel', 'info')
        closeBulkCancelDialog()
        return
      }

      bulkCancelling.value = true
      let cancelledCount = 0
      let failedCount = 0
      const totalCount = pastAppointmentsToCancel.value.length

      try {
        // Process cancellations one by one with progress tracking
        for (const appt of pastAppointmentsToCancel.value) {
          try {
            await appointmentStore.cancelAppointment(appt.id, bulkCancelReason.value)
            cancelledCount++
          } catch (error) {
            console.error(`Failed to cancel appointment ${appt.id}:`, error)
            failedCount++
          }
        }

        // Show summary message
        let message = `Cancelled ${cancelledCount} of ${totalCount} past appointments`
        if (failedCount > 0) {
          message += ` (${failedCount} failed)`
        }
        showSnackbar(message, failedCount === 0 ? 'success' : 'warning')

        closeBulkCancelDialog()
        await loadAppointments()
      } catch (error) {
        showSnackbar('Bulk cancellation failed: ' + error.message, 'error')
      } finally {
        bulkCancelling.value = false
      }
    }

    const navigateToList = () => {
      router.push('/appointments')
    }

    const navigateToCreate = () => {
      router.push('/appointments/create')
    }

    const showSnackbar = (message, color = 'success') => {
      const icons = {
        success: 'mdi-check-circle',
        error: 'mdi-alert-circle',
        warning: 'mdi-alert',
        info: 'mdi-information'
      }
      snackbar.value = { 
        show: true, 
        message, 
        color,
        icon: icons[color] || 'mdi-information'
      }
    }

    // Watch for filter changes
    watch([officeFilter, statusFilter], () => {
      loadAppointments()
    })

    onMounted(() => {
      loadAppointments()
    })

    return {
      currentDate,
      appointments,
      loading,
      checkingIn,
      officeFilter,
      statusFilter,
      eventDialog,
      cancelDialog,
      bulkCancelDialog,
      cancelling,
      bulkCancelling,
      selectedEvent,
      cancelAppointmentId,
      cancelReason,
      cancelReasonTemplate,
      bulkCancelReason,
      bulkCancelReasonTemplate,
      cancellationReasonTemplates,
      weekDays,
      officeOptions,
      statusOptions,
      currentMonthName,
      currentYear,
      calendarDays,
      isDarkTheme,
      hasPastAppointments,
      pastAppointmentsToCancel,
      formatLocalDate,
      formatStatusLabel,
      getEventColor,
      getStatusColor,
      formatDate,
      formatTimeSlot,
      loadAppointments,
      prevMonth,
      nextMonth,
      goToToday,
      viewDay,
      showEvent,
      viewAppointmentDetails,
      checkInFromCalendar,
      cancelAppointment,
      closeCancelDialog,
      applyCancelReasonTemplate,
      confirmCancel,
      showBulkCancelDialog,
      closeBulkCancelDialog,
      applyBulkCancelReasonTemplate,
      confirmBulkCancel,
      navigateToList,
      navigateToCreate,
      snackbar
    }
  }
}
</script>

<style scoped>
.calendar-grid {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e0e0e0;
}

.calendar-grid-dark {
  background: #1e1e1e;
  border-color: #424242;
}

.calendar-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
}

.calendar-header-dark {
  background: #2c2c2c;
  border-bottom-color: #424242;
}

.calendar-header-cell {
  padding: 12px;
  text-align: center;
  font-weight: 600;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.87);
}

.calendar-header-dark .calendar-header-cell {
  color: rgba(255, 255, 255, 0.87);
}

.calendar-body {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-auto-rows: minmax(100px, auto);
}

.calendar-day {
  border-right: 1px solid #e0e0e0;
  border-bottom: 1px solid #e0e0e0;
  padding: 4px;
  min-height: 100px;
  cursor: pointer;
  transition: background-color 0.2s;
  position: relative;
}

.calendar-day:hover {
  background-color: rgba(25, 118, 210, 0.04);
}

.calendar-day-dark {
  border-right-color: #424242;
  border-bottom-color: #424242;
}

.calendar-day-dark:hover {
  background-color: rgba(25, 118, 210, 0.1);
}

.calendar-day:nth-child(7n) {
  border-right: none;
}

.calendar-day-other-dark {
  background-color: #1a1a1a;
}

.calendar-day.today {
  background-color: rgba(25, 118, 210, 0.04);
}

.calendar-day-today-dark {
  background-color: rgba(25, 118, 210, 0.1);
}

.calendar-day.today .calendar-day-number {
  background-color: #1976D2;
  color: white;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.calendar-day-number {
  font-size: 14px;
  font-weight: 500;
  padding: 4px;
  color: rgba(0, 0, 0, 0.87);
}

.calendar-day-number-dark {
  color: rgba(255, 255, 255, 0.87);
}

.calendar-day.other-month .calendar-day-number {
  color: rgba(0, 0, 0, 0.38);
}

.calendar-day-other-dark .calendar-day-number {
  color: rgba(255, 255, 255, 0.38);
}

.calendar-day-events {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 2px;
}

.calendar-event {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  color: white;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.calendar-event:hover {
  transform: scale(1.02);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  z-index: 10;
}

.calendar-event .event-time {
  font-size: 9px;
  opacity: 0.9;
  font-weight: 400;
}

.calendar-event .event-patient {
  font-weight: 500;
  font-size: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.calendar-event.more-events {
  background-color: #757575 !important;
  text-align: center;
  font-weight: 500;
  font-size: 10px;
  padding: 2px 6px;
}

.calendar-event .event-more {
  font-size: 10px;
  font-weight: 600;
}

.past-appointments-list {
  max-height: 200px;
  overflow-y: auto;
}

.appointment-item {
  border-radius: 4px;
  transition: background-color 0.2s;
}

.appointment-item:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

/* Legend styles */
.legend-container {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  justify-content: center;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.87);
}

.legend-item-dark {
  color: rgba(255, 255, 255, 0.87);
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  display: inline-block;
}

/* Vuetify overrides */
:deep(.v-card) {
  transition: none !important;
}

:deep(.v-btn--variant-text) {
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

:deep(.v-btn--variant-text:hover) {
  opacity: 1;
  background: transparent !important;
}

:deep(.v-chip) {
  font-weight: 500;
}

/* Responsive */
@media (max-width: 768px) {
  .calendar-body {
    grid-auto-rows: minmax(80px, auto);
  }
  
  .calendar-day {
    min-height: 80px;
    padding: 2px;
  }
  
  .calendar-header-cell {
    padding: 8px;
    font-size: 12px;
  }
  
  .calendar-day-number {
    font-size: 12px;
  }
  
  .calendar-event {
    font-size: 9px;
    padding: 1px 4px;
  }
  
  .calendar-event .event-time {
    font-size: 7px;
  }
  
  .calendar-event .event-patient {
    font-size: 8px;
  }
  
  .calendar-event.more-events {
    font-size: 8px;
  }
  
  .calendar-event .event-more {
    font-size: 8px;
  }
  
  .legend-container {
    gap: 12px;
  }
  
  .legend-item {
    font-size: 11px;
  }
  
  .legend-dot {
    width: 10px;
    height: 10px;
  }
}
</style>