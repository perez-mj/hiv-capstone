<!-- frontend/src/components/appointments/MonthView.vue -->
<template>
  <div class="calendar-month">
    <!-- Calendar Header (Days of Week) -->
    <div class="calendar-header">
      <div v-for="day in weekDays" :key="day" class="calendar-header-day">
        {{ day }}
      </div>
    </div>

    <!-- Calendar Body -->
    <div class="calendar-body">
      <div 
        v-for="day in calendarDays" 
        :key="day.date"
        class="calendar-day"
        :class="{
          'calendar-day-other-month': !day.isCurrentMonth,
          'calendar-day-today': day.isToday,
          'calendar-day-weekend': day.isWeekend,
          'calendar-day-past': day.isPast
        }"
        @click="$emit('open-create', day.date)"
      >
        <!-- Day Header -->
        <div class="calendar-day-header">
          <span 
            class="day-number"
            :class="{ 'text-primary font-weight-bold': day.isToday }"
          >
            {{ day.day }}
          </span>
          <v-btn
            v-if="!day.isPast"
            icon="mdi-plus"
            size="x-small"
            variant="text"
            class="add-appointment-btn"
            @click.stop="$emit('open-create', day.date)"
          />
        </div>

        <!-- Appointments -->
        <div class="calendar-day-appointments">
          <template v-if="day.appointments && day.appointments.length">
            <div 
              v-for="appointment in getLimitedAppointments(day.appointments)" 
              :key="appointment.id"
              class="appointment-badge"
              :class="getAppointmentClass(appointment)"
              @click.stop="$emit('view-appointment', appointment)"
            >
              <div class="appointment-time">{{ formatTime(appointment.scheduled_at) }}</div>
              <div class="appointment-patient">{{ getPatientName(appointment) }}</div>
              <div class="appointment-type">{{ getAppointmentType(appointment) }}</div>
            </div>
            
            <!-- More indicator -->
            <div 
              v-if="day.appointments.length > 3" 
              class="text-caption text-center text-grey mt-1"
              @click.stop="showMoreAppointments(day)"
            >
              +{{ day.appointments.length - 3 }} more
            </div>
          </template>
          
          <div v-else class="text-caption text-center text-grey mt-2">
            No appointments
          </div>
        </div>
      </div>
    </div>

    <!-- More Appointments Dialog -->
    <v-dialog v-model="showMoreDialog" max-width="400">
      <v-card v-if="selectedDay">
        <v-card-title class="bg-primary text-white">
          Appointments for {{ formatDate(selectedDay.date) }}
        </v-card-title>
        <v-card-text class="pa-0">
          <v-list>
            <v-list-item
              v-for="appointment in selectedDay.appointments"
              :key="appointment.id"
              @click="handleViewAppointment(appointment)"
              class="cursor-pointer"
            >
              <template v-slot:prepend>
                <v-chip
                  size="small"
                  :color="getStatusColor(appointment.status)"
                  class="mr-2"
                >
                  {{ formatTime(appointment.scheduled_at) }}
                </v-chip>
              </template>
              
              <v-list-item-title>{{ getPatientName(appointment) }}</v-list-item-title>
              <v-list-item-subtitle>
                {{ getAppointmentType(appointment) }}
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" variant="text" @click="showMoreDialog = false">
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { toLocal, formatDateForDisplay, CLINIC_TIMEZONE } from '@/utils/dateUtils'

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
  }
})

const emit = defineEmits(['view-appointment', 'open-create'])

// State
const showMoreDialog = ref(false)
const selectedDay = ref(null)

// Constants
const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Computed
const calendarDays = computed(() => {
  const year = props.currentDate.getFullYear()
  const month = props.currentDate.getMonth()
  
  // Get appointments list
  const appointmentList = getAppointmentsList()
  
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  
  // Start from the first day of the week (Sunday) of the first day of month
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - firstDay.getDay())
  
  // End on the last day of the week of the last day of month
  const endDate = new Date(lastDay)
  endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()))
  
  const days = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const current = new Date(startDate)
  
  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0]
    const dayOfWeek = current.getDay()
    
    // Filter appointments for this day by comparing UTC dates
    const dayAppointments = appointmentList.filter(app => {
      if (!app || !app.scheduled_at) return false
      // Convert UTC to local and check if it's the same day
      const localDate = toLocal(app.scheduled_at, 'yyyy-MM-dd')
      return localDate === dateStr
    })
    
    // Sort appointments by time
    dayAppointments.sort((a, b) => {
      return a.scheduled_at.localeCompare(b.scheduled_at)
    })
    
    const dayDate = new Date(current)
    dayDate.setHours(0, 0, 0, 0)
    
    days.push({
      date: dateStr,
      day: current.getDate(),
      isCurrentMonth: current.getMonth() === month,
      isToday: dayDate.getTime() === today.getTime(),
      isPast: dayDate < today,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      appointments: dayAppointments
    })
    
    current.setDate(current.getDate() + 1)
  }
  
  return days
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

function getLimitedAppointments(appointments) {
  return appointments.slice(0, 3)
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
  
  // Try to find in appointment types
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
  return toLocal(dateString, 'hh:mm a')
}

function formatDate(dateString) {
  return formatDateForDisplay(dateString, 'EEEE, MMMM d, yyyy')
}

function showMoreAppointments(day) {
  selectedDay.value = day
  showMoreDialog.value = true
}

function handleViewAppointment(appointment) {
  showMoreDialog.value = false
  emit('view-appointment', appointment)
}
</script>

<style scoped>
.calendar-month {
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  overflow: hidden;
  background: white;
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
  font-size: 0.9rem;
  color: rgba(0, 0, 0, 0.7);
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
  transition: background-color 0.2s;
}

.calendar-day:nth-child(7n) {
  border-right: none;
}

.calendar-day:hover {
  background: rgba(0, 0, 0, 0.02);
}

.calendar-day-other-month {
  background: rgba(0, 0, 0, 0.04);
  color: rgba(0, 0, 0, 0.4);
}

.calendar-day-today {
  background: rgba(33, 150, 243, 0.08);
  border: 2px solid rgba(33, 150, 243, 0.3);
}

.calendar-day-weekend {
  background: rgba(0, 0, 0, 0.02);
}

.calendar-day-past {
  opacity: 0.7;
}

.calendar-day-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding: 4px;
}

.day-number {
  font-size: 1rem;
  font-weight: 500;
}

.add-appointment-btn {
  opacity: 0;
  transition: opacity 0.2s;
}

.calendar-day:hover .add-appointment-btn {
  opacity: 1;
}

.calendar-day-appointments {
  max-height: 80px;
  overflow-y: auto;
  scrollbar-width: thin;
}

.calendar-day-appointments::-webkit-scrollbar {
  width: 4px;
}

.calendar-day-appointments::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.appointment-badge {
  padding: 4px 6px;
  border-radius: 4px;
  margin-bottom: 2px;
  cursor: pointer;
  font-size: 0.7rem;
  border-left: 3px solid transparent;
  transition: transform 0.2s, box-shadow 0.2s;
}

.appointment-badge:hover {
  transform: translateX(2px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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

.cursor-pointer {
  cursor: pointer;
}

.cursor-pointer:hover {
  background: rgba(0, 0, 0, 0.04);
}
</style>