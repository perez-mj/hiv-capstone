<!-- frontend/src/components/appointments/DayView.vue -->
<template>
  <div class="calendar-day">
    <!-- Day Header -->
    <div class="calendar-day-header">
      <div class="day-info">
        <div class="day-name">{{ dayInfo.weekday }}</div>
        <div class="day-date">{{ dayInfo.formattedDate }}</div>
        <div v-if="dayInfo.isToday" class="today-badge">Today</div>
      </div>
      <v-btn
        color="primary"
        prepend-icon="mdi-plus"
        @click="$emit('open-create', dayInfo.date)"
      >
        New Appointment
      </v-btn>
    </div>

    <!-- Day Timeline -->
    <div class="day-timeline">
      <!-- Time Slots -->
      <div class="time-slots">
        <div 
          v-for="time in timeSlots" 
          :key="time"
          class="time-slot"
        >
          <span class="time-label">{{ formatTimeSlot(time) }}</span>
        </div>
      </div>

      <!-- Appointments -->
      <div class="appointments-container">
        <div 
          v-for="time in timeSlots" 
          :key="time"
          class="time-slot-cell"
          :class="{ 'has-appointments': getAppointmentsForTime(dayInfo.date, time).length > 0 }"
          @click="$emit('open-create', dayInfo.date, time)"
        >
          <!-- Appointments for this time slot -->
          <template v-if="getAppointmentsForTime(dayInfo.date, time).length">
            <div 
              v-for="appointment in getAppointmentsForTime(dayInfo.date, time)" 
              :key="appointment.id"
              class="day-appointment"
              :class="getAppointmentClass(appointment)"
              @click.stop="$emit('view-appointment', appointment)"
            >
              <div class="appointment-header">
                <span class="appointment-time">{{ formatTime(appointment.scheduled_at) }}</span>
                <v-chip
                  size="x-small"
                  :color="getStatusColor(appointment.status)"
                  class="status-chip"
                >
                  {{ appointment.status }}
                </v-chip>
              </div>
              <div class="appointment-patient">{{ getPatientName(appointment) }}</div>
              <div class="appointment-type">{{ getAppointmentType(appointment) }}</div>
              
              <!-- Queue number if available -->
              <div v-if="appointment.queue_number" class="appointment-queue">
                Queue #{{ appointment.queue_number }}
              </div>
              
              <!-- Notes if available -->
              <div v-if="appointment.notes" class="appointment-notes">
                {{ appointment.notes }}
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Summary Card -->
    <v-card variant="outlined" class="mt-4">
      <v-card-text>
        <div class="d-flex justify-space-between align-center">
          <div>
            <div class="text-h6">Daily Summary</div>
            <div class="text-body-2 text-medium-emphasis">
              {{ dayInfo.formattedDate }}
            </div>
          </div>
          <div class="text-right">
            <div class="text-h5">{{ totalAppointments }}</div>
            <div class="text-body-2">Total Appointments</div>
          </div>
        </div>
        
        <v-divider class="my-3" />
        
        <div class="d-flex gap-4 flex-wrap">
          <div v-for="stat in statusStats" :key="stat.status" class="text-center">
            <div class="text-h6">{{ stat.count }}</div>
            <div class="text-caption">{{ stat.status }}</div>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { toLocal, formatDateForDisplay, formatTimeForDisplay, CLINIC_TIMEZONE } from '@/utils/dateUtils'

const props = defineProps({
  appointments: {
    type: [Array, Object],
    default: () => []
  },
  currentDate: {
    type: Date,
    required: true
  },
  appointmentTypes: {
    type: [Array, Object],
    default: () => []
  },
  timeSlots: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['view-appointment', 'open-create'])

// Computed
const dayInfo = computed(() => {
  const date = props.currentDate
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const dateStr = date.toISOString().split('T')[0]
  const dayDate = new Date(date)
  dayDate.setHours(0, 0, 0, 0)
  
  return {
    date: dateStr,
    weekday: date.toLocaleDateString('en-US', { weekday: 'long' }),
    formattedDate: formatDateForDisplay(date, 'MMMM d, yyyy'),
    isToday: dayDate.getTime() === today.getTime()
  }
})

const totalAppointments = computed(() => {
  const appointmentList = getAppointmentsForDay()
  return appointmentList.length
})

const statusStats = computed(() => {
  const appointmentList = getAppointmentsForDay()
  const stats = {}
  
  appointmentList.forEach(app => {
    const status = app.status || 'UNKNOWN'
    stats[status] = (stats[status] || 0) + 1
  })
  
  return Object.entries(stats).map(([status, count]) => ({
    status,
    count
  }))
})

// Helper Methods
function getAppointmentsList() {
  if (!props.appointments) return []
  
  if (props.appointments.data?.appointments) {
    return props.appointments.data.appointments
  } else if (props.appointments.data && Array.isArray(props.appointments.data)) {
    return props.appointments.data
  } else if (props.appointments.appointments && Array.isArray(props.appointments.appointments)) {
    return props.appointments.appointments
  } else if (Array.isArray(props.appointments)) {
    return props.appointments
  }
  
  return []
}

function getAppointmentsForDay() {
  const appointmentList = getAppointmentsList()
  const dateStr = dayInfo.value.date
  
  return appointmentList.filter(app => {
    if (!app || !app.scheduled_at) return false
    const localDate = toLocal(app.scheduled_at, 'yyyy-MM-dd')
    return localDate === dateStr
  }).sort((a, b) => {
    const timeA = toLocal(a.scheduled_at, 'HH:mm')
    const timeB = toLocal(b.scheduled_at, 'HH:mm')
    return timeA.localeCompare(timeB)
  })
}

function getAppointmentsForTime(date, time) {
  const appointmentList = getAppointmentsList()
  
  return appointmentList.filter(app => {
    if (!app || !app.scheduled_at) return false
    try {
      const localDateTime = toLocal(app.scheduled_at, 'yyyy-MM-dd HH:mm')
      const [localDate, localTime] = localDateTime.split(' ')
      return localDate === date && localTime === time
    } catch {
      return false
    }
  })
}

function getPatientName(appointment) {
  if (!appointment) return 'Unknown'
  
  if (appointment.patient_name) return appointment.patient_name
  if (appointment.patient?.full_name) return appointment.patient.full_name
  if (appointment.patient?.first_name || appointment.patient?.last_name) {
    return `${appointment.patient.last_name || ''}${appointment.patient.last_name && appointment.patient.first_name ? ', ' : ''}${appointment.patient.first_name || ''}`.trim()
  }
  
  return `Patient ${appointment.patient_id || 'Unknown'}`
}

function getAppointmentType(appointment) {
  if (!appointment) return 'Unknown'
  
  if (appointment.type_name) return appointment.type_name
  if (appointment.appointment_type?.type_name) return appointment.appointment_type.type_name
  
  if (props.appointmentTypes?.data) {
    const type = props.appointmentTypes.data.find(t => t.id === appointment.appointment_type_id)
    if (type) return type.type_name
  }
  
  return 'Unknown Type'
}

function getAppointmentClass(appointment) {
  const status = (appointment.status || 'unknown').toLowerCase()
  return `appointment-${status}`
}

function getStatusColor(status) {
  const colors = {
    'SCHEDULED': 'info',
    'CONFIRMED': 'success',
    'IN_PROGRESS': 'warning',
    'COMPLETED': 'success',
    'CANCELLED': 'error',
    'NO_SHOW': 'grey'
  }
  return colors[status] || 'grey'
}

function formatTime(dateString) {
  return formatTimeForDisplay(dateString)
}

function formatTimeSlot(time) {
  // Convert 24h format to 12h format for display
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${minutes} ${ampm}`
}
</script>

<style scoped>
.calendar-day {
  padding: 20px;
  background: white;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.12);
}

.calendar-day-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.day-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.day-name {
  font-size: 1.5rem;
  font-weight: 600;
}

.day-date {
  font-size: 1.2rem;
  color: rgba(0, 0, 0, 0.6);
}

.today-badge {
  background: #2196F3;
  color: white;
  padding: 4px 8px;
  border-radius: 16px;
  font-size: 0.75rem;
  font-weight: 600;
}

.day-timeline {
  display: flex;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  overflow: hidden;
  max-height: 600px;
  overflow-y: auto;
}

.time-slots {
  width: 100px;
  background: rgba(0, 0, 0, 0.02);
  border-right: 1px solid rgba(0, 0, 0, 0.12);
  flex-shrink: 0;
}

.time-slot {
  height: 80px;
  padding: 8px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

.time-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
}

.appointments-container {
  flex: 1;
  background: white;
}

.time-slot-cell {
  height: 80px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  padding: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
  position: relative;
}

.time-slot-cell:hover {
  background: rgba(0, 0, 0, 0.02);
}

.time-slot-cell.has-appointments {
  background: rgba(33, 150, 243, 0.02);
}

.day-appointment {
  padding: 8px;
  border-radius: 6px;
  font-size: 0.85rem;
  border-left: 4px solid transparent;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  margin-bottom: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.day-appointment:hover {
  transform: translateX(4px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
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

.appointment-unknown {
  background: #F5F5F5;
  color: #616161;
  border-left-color: #9E9E9E;
}

.appointment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.appointment-time {
  font-weight: 600;
  font-size: 0.75rem;
}

.status-chip {
  font-size: 0.6rem;
  height: 16px;
}

.appointment-patient {
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 2px;
}

.appointment-type {
  font-size: 0.75rem;
  opacity: 0.8;
  margin-bottom: 2px;
}

.appointment-queue {
  font-size: 0.7rem;
  font-weight: 600;
  color: #2196F3;
  margin-top: 2px;
}

.appointment-notes {
  font-size: 0.7rem;
  opacity: 0.6;
  margin-top: 2px;
  font-style: italic;
}

.gap-4 {
  gap: 16px;
}
</style>