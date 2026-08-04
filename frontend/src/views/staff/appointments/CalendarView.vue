<!-- frontend/src/views/staff/appointments/CalendarView.vue -->
<template>
  <v-container fluid class="pa-4">
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="text-h5">
            <v-icon start>mdi-calendar</v-icon>
            Appointment Calendar
            <v-spacer></v-spacer>
            <v-btn color="primary" @click="navigateToList" class="mr-2">
              <v-icon start>mdi-format-list-bulleted</v-icon>
              List View
            </v-btn>
            <v-btn color="success" @click="navigateToCreate">
              <v-icon start>mdi-plus</v-icon>
              New Appointment
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
                    <div 
                      v-for="event in day.events" 
                      :key="event.id"
                      class="calendar-event"
                      :style="{ backgroundColor: getEventColor(event) }"
                      @click.stop="showEvent(event)"
                    >
                      <span class="event-time">{{ formatTimeSlot(event.time_slot) }}</span>
                      <span class="event-patient">{{ event.Patient?.first_name }} {{ event.Patient?.last_name }}</span>
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
                    <span class="legend-dot" style="background-color: #FF9800;"></span>
                    Walk-in
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
                    Checked-in
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

    <!-- Event Detail Dialog -->
    <v-dialog v-model="eventDialog" max-width="600px">
      <v-card>
        <v-card-title>
          <span class="text-h6">Appointment Details</span>
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" @click="eventDialog = false"></v-btn>
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pt-4" v-if="selectedEvent">
          <v-list density="comfortable">
            <v-list-item>
              <v-list-item-title class="text-caption text-grey">Patient</v-list-item-title>
              <v-list-item-subtitle class="font-weight-medium">
                {{ selectedEvent.Patient?.first_name }} {{ selectedEvent.Patient?.last_name }}
              </v-list-item-subtitle>
            </v-list-item>
            <v-divider></v-divider>
            <v-list-item>
              <v-list-item-title class="text-caption text-grey">Date</v-list-item-title>
              <v-list-item-subtitle>{{ formatDate(selectedEvent.appointment_date) }}</v-list-item-subtitle>
            </v-list-item>
            <v-divider></v-divider>
            <v-list-item>
              <v-list-item-title class="text-caption text-grey">Time</v-list-item-title>
              <v-list-item-subtitle>{{ formatTimeSlot(selectedEvent.time_slot) }}</v-list-item-subtitle>
            </v-list-item>
            <v-divider></v-divider>
            <v-list-item>
              <v-list-item-title class="text-caption text-grey">Office</v-list-item-title>
              <v-list-item-subtitle>
                <v-chip :color="selectedEvent.office === 'testing' ? 'info' : 'success'" size="small" text-color="white">
                  {{ selectedEvent.office }}
                </v-chip>
              </v-list-item-subtitle>
            </v-list-item>
            <v-divider></v-divider>
            <v-list-item>
              <v-list-item-title class="text-caption text-grey">Type</v-list-item-title>
              <v-list-item-subtitle>
                <v-chip :color="selectedEvent.type === 'scheduled' ? 'primary' : 'orange'" size="small" text-color="white">
                  {{ selectedEvent.type }}
                </v-chip>
              </v-list-item-subtitle>
            </v-list-item>
            <v-divider></v-divider>
            <v-list-item>
              <v-list-item-title class="text-caption text-grey">Status</v-list-item-title>
              <v-list-item-subtitle>
                <v-chip :color="getStatusColor(selectedEvent.status)" size="small">
                  {{ selectedEvent.status }}
                </v-chip>
              </v-list-item-subtitle>
            </v-list-item>
            <v-divider v-if="selectedEvent.notes"></v-divider>
            <v-list-item v-if="selectedEvent.notes">
              <v-list-item-title class="text-caption text-grey">Notes</v-list-item-title>
              <v-list-item-subtitle>{{ selectedEvent.notes }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-card-actions v-if="selectedEvent">
          <v-btn color="primary" @click="viewAppointmentDetails(selectedEvent.id)">
            <v-icon start>mdi-eye</v-icon>
            View Full Details
          </v-btn>
          <v-btn color="success" @click="checkInFromCalendar(selectedEvent.id)"
                 :disabled="selectedEvent.status !== 'pending'">
            <v-icon start>mdi-check-in</v-icon>
            Check In
          </v-btn>
          <v-btn color="error" @click="cancelAppointment(selectedEvent.id)"
                 :disabled="selectedEvent.status === 'completed' || selectedEvent.status === 'cancelled'">
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

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useTheme } from 'vuetify'
import appointmentService from '@/services/appointmentService'

export default {
  name: 'AppointmentCalendar',
  setup() {
    const router = useRouter()
    const theme = useTheme()
    const currentDate = ref(new Date())
    const appointments = ref([])
    const loading = ref(false)
    const officeFilter = ref(null)
    const statusFilter = ref(null)
    const eventDialog = ref(false)
    const cancelDialog = ref(false)
    const cancelling = ref(false)
    const selectedEvent = ref(null)
    const cancelAppointmentId = ref(null)
    const cancelReason = ref('')

    const snackbar = ref({
      show: false,
      message: '',
      color: 'success'
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
      { title: 'Checked-in', value: 'checked-in' },
      { title: 'Completed', value: 'completed' },
      { title: 'Cancelled', value: 'cancelled' },
      { title: 'No-Show', value: 'no-show' }
    ]

    const currentMonthName = computed(() => {
      return currentDate.value.toLocaleString('default', { month: 'long' })
    })

    const currentYear = computed(() => {
      return currentDate.value.getFullYear()
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
          year: 'numeric',
          month: 'short',
          day: 'numeric'
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
      
      const daysInMonth = getDaysInMonth(year, month)
      const firstDay = getFirstDayOfMonth(year, month)
      
      const days = []
      
      // Previous month days
      const daysInPrevMonth = getDaysInMonth(year, month - 1)
      for (let i = firstDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i
        const date = new Date(year, month - 1, day)
        days.push({
          day,
          date: date.toISOString().split('T')[0],
          isOtherMonth: true,
          isToday: false,
          events: []
        })
      }
      
      // Current month days
      for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(year, month, i)
        const dateStr = date.toISOString().split('T')[0]
        const isToday = dateStr === today.toISOString().split('T')[0]
        
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
      
      // Next month days
      const remainingDays = 42 - days.length // 6 rows of 7 days
      for (let i = 1; i <= remainingDays; i++) {
        const date = new Date(year, month + 1, i)
        days.push({
          day: i,
          date: date.toISOString().split('T')[0],
          isOtherMonth: true,
          isToday: false,
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
          const dateStr = day.toISOString().split('T')[0]
          try {
            const appts = await appointmentService.getAppointmentsByDate(
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
      try {
        await appointmentService.checkInPatient(id)
        showSnackbar('Patient checked in successfully', 'success')
        eventDialog.value = false
        await loadAppointments()
      } catch (error) {
        showSnackbar('Failed to check in: ' + error.message, 'error')
      }
    }

    const cancelAppointment = (id) => {
      if (!id) return
      cancelAppointmentId.value = id
      cancelReason.value = ''
      cancelDialog.value = true
      eventDialog.value = false
    }

    const closeCancelDialog = () => {
      cancelDialog.value = false
      cancelAppointmentId.value = null
      cancelReason.value = ''
    }

    const confirmCancel = async () => {
      if (!cancelReason.value.trim()) {
        showSnackbar('Please provide a cancellation reason', 'warning')
        return
      }

      cancelling.value = true
      try {
        await appointmentService.cancelAppointment(cancelAppointmentId.value, cancelReason.value)
        showSnackbar('Appointment cancelled successfully', 'success')
        closeCancelDialog()
        await loadAppointments()
      } catch (error) {
        showSnackbar('Failed to cancel: ' + error.message, 'error')
      } finally {
        cancelling.value = false
      }
    }

    const navigateToList = () => {
      router.push('/appointments')
    }

    const navigateToCreate = () => {
      router.push('/appointments/create')
    }

    const showSnackbar = (message, color = 'success') => {
      snackbar.value = { show: true, message, color }
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
      officeFilter,
      statusFilter,
      eventDialog,
      cancelDialog,
      cancelling,
      selectedEvent,
      cancelAppointmentId,
      cancelReason,
      weekDays,
      officeOptions,
      statusOptions,
      currentMonthName,
      currentYear,
      calendarDays,
      isDarkTheme,
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
      confirmCancel,
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