<!-- frontend/src/components/appointments/MonthView.vue -->
<template>
  <div class="calendar-month">
    <!-- Calendar Header -->
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
        @click="handleDayClick(day)"
      >
        <!-- Day Header -->
        <div class="calendar-day-header">
          <span class="day-number" :class="{ 'text-primary font-weight-bold': day.isToday }">
            {{ day.day }}
          </span>
          <v-btn 
            v-if="!day.isPast" 
            icon="mdi-plus" 
            size="x-small" 
            variant="text" 
            class="add-appointment-btn"
            @click.stop="handleAddClick(day)" 
          />
        </div>

        <!-- Appointments -->
        <div class="calendar-day-appointments">
          <template v-if="day.appointments && day.appointments.length">
            <div 
              v-for="appointment in day.appointments.slice(0, 3)" 
              :key="appointment.id"
              class="appointment-badge" 
              :class="`appointment-${getStatusClass(appointment)}`"
              @click.stop="handleViewAppointment(appointment)"
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const props = defineProps({
  appointments: { type: [Array, Object], default: () => [] },
  currentDate: { type: Date, required: true },
  appointmentTypes: { type: [Array, Object], default: () => [] }
})

const emit = defineEmits(['view-appointment', 'open-create'])


// Log props on mount
onMounted(() => {
  console.log('MonthView mounted with props:', {
    appointments: props.appointments,
    currentDate: props.currentDate,
    appointmentTypes: props.appointmentTypes
  })
})

// Constants
const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const statusColors = {
  'SCHEDULED': 'info',
  'CONFIRMED': 'success',
  'IN_PROGRESS': 'warning',
  'COMPLETED': 'success',
  'CANCELLED': 'error',
  'NO_SHOW': 'grey'
}

// State
const showMoreDialog = ref(false)
const selectedDay = ref(null)

// Helper function to convert UTC to Manila local date
const utcToManilaDate = (utcDateTime) => {
  if (!utcDateTime) return ''
  
  try {
    // Handle different input formats
    let cleanDateTime = utcDateTime
    if (utcDateTime.includes('T')) {
      // ISO format: "2026-02-27T01:30:00.000Z"
      cleanDateTime = utcDateTime.replace('T', ' ').replace('Z', '').split('.')[0]
    }
    
    // Parse the UTC datetime
    const [datePart, timePart] = cleanDateTime.split(' ')
    if (!datePart || !timePart) return ''
    
    const [year, month, day] = datePart.split('-').map(Number)
    const [hours, minutes, seconds] = timePart.split(':').map(Number)
    
    // Create UTC date
    const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds || 0))
    
    // Convert to Manila time (UTC+8)
    const manilaDate = new Date(utcDate.getTime() + (8 * 60 * 60 * 1000))
    
    // Return Manila date in YYYY-MM-DD format
    const manilaYear = manilaDate.getUTCFullYear()
    const manilaMonth = String(manilaDate.getUTCMonth() + 1).padStart(2, '0')
    const manilaDay = String(manilaDate.getUTCDate()).padStart(2, '0')
    
    return `${manilaYear}-${manilaMonth}-${manilaDay}`
  } catch (err) {
    console.error('Error converting UTC to Manila date:', err, utcDateTime)
    return ''
  }
}

// Helper function to extract Manila time for display
const utcToManilaTime = (utcDateTime) => {
  if (!utcDateTime) return ''
  
  try {
    // Handle different input formats
    let cleanDateTime = utcDateTime
    if (utcDateTime.includes('T')) {
      cleanDateTime = utcDateTime.replace('T', ' ').replace('Z', '').split('.')[0]
    }
    
    // Parse the UTC datetime
    const [datePart, timePart] = cleanDateTime.split(' ')
    if (!datePart || !timePart) return ''
    
    const [year, month, day] = datePart.split('-').map(Number)
    const [hours, minutes, seconds] = timePart.split(':').map(Number)
    
    // Create UTC date
    const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds || 0))
    
    // Convert to Manila time (UTC+8)
    const manilaDate = new Date(utcDate.getTime() + (8 * 60 * 60 * 1000))
    
    // Return Manila time in HH:MM format
    const manilaHours = String(manilaDate.getUTCHours()).padStart(2, '0')
    const manilaMinutes = String(manilaDate.getUTCMinutes()).padStart(2, '0')
    
    return `${manilaHours}:${manilaMinutes}`
  } catch (err) {
    console.error('Error converting UTC to Manila time:', err, utcDateTime)
    return ''
  }
}

// Format time for display (convert 24h to 12h with AM/PM)
const formatTimeForDisplay = (timeStr) => {
  if (!timeStr) return ''
  try {
    const [hours, minutes] = timeStr.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
  } catch {
    return timeStr
  }
}

// Get appointments array from the response
const getAppointmentsArray = () => {
  if (!props.appointments) return []
  
  console.log('Appointments prop structure:', props.appointments)
  
  // Try different possible structures
  if (props.appointments.data?.appointments) {
    console.log('Using appointments.data.appointments')
    return props.appointments.data.appointments
  } else if (props.appointments.data && Array.isArray(props.appointments.data)) {
    console.log('Using appointments.data as array')
    return props.appointments.data
  } else if (props.appointments.appointments && Array.isArray(props.appointments.appointments)) {
    console.log('Using appointments.appointments')
    return props.appointments.appointments
  } else if (Array.isArray(props.appointments)) {
    console.log('Using appointments as array')
    return props.appointments
  }
  
  console.log('No appointments found in structure')
  return []
}

// Computed
const calendarDays = computed(() => {
  const appointmentsArray = getAppointmentsArray()
  
  console.log('Appointments array:', appointmentsArray)
  console.log('Appointments count:', appointmentsArray.length)
  
  if (appointmentsArray.length > 0) {
    console.log('First appointment:', appointmentsArray[0])
    // Test conversion on first appointment
    const testConversion = utcToManilaDate(appointmentsArray[0].scheduled_at)
    console.log('Test conversion:', testConversion)
  }
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const year = props.currentDate.getFullYear()
  const month = props.currentDate.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - firstDay.getDay())
  
  const endDate = new Date(lastDay)
  endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()))

  const days = []
  const current = new Date(startDate)

  while (current <= endDate) {
    const localDateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`
    const dayDate = new Date(current)
    dayDate.setHours(0, 0, 0, 0)

    // Convert each appointment's UTC time to Manila local date and filter
    const dayAppointments = appointmentsArray.filter(app => {
      if (!app?.scheduled_at) return false
      const appointmentLocalDate = utcToManilaDate(app.scheduled_at)
      return appointmentLocalDate === localDateStr
    }).sort((a, b) => {
      // Sort by Manila local time
      const timeA = utcToManilaTime(a.scheduled_at)
      const timeB = utcToManilaTime(b.scheduled_at)
      return timeA.localeCompare(timeB)
    })

    days.push({
      date: localDateStr,
      day: current.getDate(),
      isCurrentMonth: current.getMonth() === month,
      isToday: dayDate.getTime() === today.getTime(),
      isPast: dayDate < today,
      isWeekend: current.getDay() === 0 || current.getDay() === 6,
      appointments: dayAppointments
    })

    current.setDate(current.getDate() + 1)
  }

  console.log('Generated days:', days.length)
  console.log('Days with appointments:', days.filter(d => d.appointments.length > 0).length)
  
  return days
})

// Helper functions
function getPatientName(appointment) {
  return appointment.patient_name ||
         appointment.patient?.full_name ||
         (appointment.patient?.first_name && appointment.patient?.last_name 
           ? `${appointment.patient.last_name}, ${appointment.patient.first_name}`
           : appointment.patient?.first_name || appointment.patient?.last_name) ||
         `Patient ${appointment.patient_id}`
}

function getAppointmentType(appointment) {
  return appointment.type_name ||
         appointment.appointment_type?.type_name ||
         findAppointmentType(appointment.appointment_type_id) ||
         'Unknown Type'
}

function findAppointmentType(typeId) {
  const types = props.appointmentTypes?.data || []
  const type = types.find(t => t.id === typeId)
  return type?.type_name
}

function getStatusClass(appointment) {
  return (appointment.status || 'unknown').toLowerCase()
}

function getStatusColor(status) {
  return statusColors[status] || 'grey'
}

function formatTime(dateTimeStr) {
  if (!dateTimeStr) return ''
  const manilaTime = utcToManilaTime(dateTimeStr)
  return formatTimeForDisplay(manilaTime)
}

function formatDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
}

// Event handlers
function showMoreAppointments(day) {
  selectedDay.value = day
  showMoreDialog.value = true
}

function handleViewAppointment(appointment) {
  showMoreDialog.value = false
  emit('view-appointment', appointment)
}

function handleDayClick(day) {
  if (!day.isPast) {
    emit('open-create', day.date)
  }
}

function handleAddClick(day) {
  emit('open-create', day.date)
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
  cursor: pointer;
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
  cursor: not-allowed;
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

.calendar-day-past .add-appointment-btn {
  display: none;
}

.calendar-day-appointments {
  max-height: 80px;
  overflow-y: auto;
  scrollbar-width: thin;
}

.appointment-badge {
  padding: 4px 6px;
  border-radius: 4px;
  margin-bottom: 2px;
  cursor: pointer;
  font-size: 0.7rem;
  border-left: 3px solid transparent;
  transition: transform 0.2s;
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

.appointment-cancelled,
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

.appointment-patient,
.appointment-type {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.65rem;
}

.cursor-pointer {
  cursor: pointer;
}

.cursor-pointer:hover {
  background: rgba(0, 0, 0, 0.04);
}
</style>