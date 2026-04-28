<!-- frontend/src/pages/patient/PatientAppointments.vue -->
<template>
  <div class="patient-appointments">
    <!-- Header Section -->
    <div class="appointments-header">
      <div>
        <h1 class="header-title">My Appointments</h1>
        <p class="header-subtitle">Manage and track your upcoming visits</p>
      </div>
      <v-btn
        class="book-btn"
        color="primary"
        rounded="lg"
        @click="openBookingDialog"
        prepend-icon="mdi-calendar-plus"
      >
        Book New
      </v-btn>
    </div>

    <!-- Tabs -->
    <v-card class="appointments-card" elevation="0" variant="outlined">
      <v-tabs v-model="activeTab" color="primary" class="px-4 pt-3">
        <v-tab value="upcoming" class="text-none">
          <v-icon start size="18" class="mr-1">mdi-calendar-clock</v-icon>
          Upcoming
          <v-chip v-if="upcomingCount" size="xs" color="primary" class="ml-2" variant="flat">{{ upcomingCount }}</v-chip>
        </v-tab>
        <v-tab value="past" class="text-none">
          <v-icon start size="18" class="mr-1">mdi-calendar-check</v-icon>
          Past
        </v-tab>
      </v-tabs>

      <v-divider />

      <v-card-text class="pa-4">
        <v-window v-model="activeTab">
          <!-- Upcoming Appointments -->
          <v-window-item value="upcoming">
            <div v-if="loading" class="d-flex justify-center py-8">
              <v-progress-circular indeterminate color="primary" size="40" />
            </div>
            
            <div v-else-if="upcomingAppointments.length" class="appointments-list">
              <div
                v-for="appointment in upcomingAppointments"
                :key="appointment.id"
                class="appointment-card"
              >
                <div class="appointment-date-badge">
                  <div class="date-day">{{ getDayOfMonth(appointment.scheduled_at) }}</div>
                  <div class="date-month">{{ getMonthAbbr(appointment.scheduled_at) }}</div>
                </div>
                
                <div class="appointment-details">
                  <div class="details-header">
                    <span class="appointment-type">{{ appointment.type_name || 'Consultation' }}</span>
                    <v-chip :color="appointmentStatusColor(appointment.status)" size="small" variant="light">
                      {{ appointment.status }}
                    </v-chip>
                  </div>
                  <div class="details-time">
                    <v-icon size="16" class="mr-1" color="grey">mdi-clock-outline</v-icon>
                    {{ formatTime(appointment.scheduled_at) }}
                  </div>
                  <div class="details-notes" v-if="appointment.notes">
                    <v-icon size="14" class="mr-1" color="grey">mdi-note-text-outline</v-icon>
                    {{ truncateText(appointment.notes, 60) }}
                  </div>
                </div>
                
                <div class="appointment-actions">
                  <v-btn
                    v-if="canCancel(appointment.scheduled_at) && appointment.status !== 'CANCELLED'"
                    icon
                    variant="text"
                    color="error"
                    size="small"
                    @click="cancelAppointment(appointment)"
                  >
                    <v-icon size="20">mdi-close</v-icon>
                    <v-tooltip activator="parent" location="top">Cancel appointment</v-tooltip>
                  </v-btn>
                </div>
              </div>
            </div>
            
            <v-alert v-else type="info" variant="tonal" class="mt-2">
              No upcoming appointments.
              <a href="#" class="alert-link" @click.prevent="openBookingDialog">Book one now</a>
            </v-alert>
          </v-window-item>

          <!-- Past Appointments -->
          <v-window-item value="past">
            <div v-if="loading" class="d-flex justify-center py-8">
              <v-progress-circular indeterminate color="primary" size="40" />
            </div>
            
            <div v-else-if="pastAppointments.length" class="appointments-list">
              <div
                v-for="appointment in pastAppointments"
                :key="appointment.id"
                class="appointment-card past-card"
              >
                <div class="appointment-date-badge past-badge">
                  <div class="date-day">{{ getDayOfMonth(appointment.scheduled_at) }}</div>
                  <div class="date-month">{{ getMonthAbbr(appointment.scheduled_at) }}</div>
                </div>
                
                <div class="appointment-details">
                  <div class="details-header">
                    <span class="appointment-type">{{ appointment.type_name || 'Consultation' }}</span>
                    <v-chip :color="appointmentStatusColor(appointment.status)" size="small" variant="light">
                      {{ appointment.status }}
                    </v-chip>
                  </div>
                  <div class="details-time">
                    <v-icon size="16" class="mr-1" color="grey">mdi-clock-outline</v-icon>
                    {{ formatTime(appointment.scheduled_at) }}
                  </div>
                </div>
              </div>
            </div>
            
            <v-alert v-else type="info" variant="tonal" class="mt-2">
              No past appointments found.
            </v-alert>
          </v-window-item>
        </v-window>

        <!-- Pagination -->
        <div v-if="activeTab === 'past' && totalPages > 1" class="pagination-wrapper mt-4">
          <v-pagination
            v-model="currentPage"
            :length="totalPages"
            :total-visible="5"
            color="primary"
            variant="text"
            @update:model-value="loadPastAppointments"
          />
        </div>
      </v-card-text>
    </v-card>

    <!-- Booking Dialog -->
    <v-dialog v-model="showBookingDialog" max-width="560px" persistent>
      <v-card class="booking-dialog" rounded="xl">
        <div class="dialog-header">
          <div>
            <h3 class="dialog-title">Book New Appointment</h3>
            <p class="dialog-subtitle">Schedule your next visit with us</p>
          </div>
          <v-btn icon variant="text" @click="closeBookingDialog">
            <v-icon size="22">mdi-close</v-icon>
          </v-btn>
        </div>

        <v-divider />

        <v-card-text class="pa-5">
          <!-- Capacity Alert -->
          <v-alert
            v-if="isSelectedDateAtCapacity"
            type="warning"
            variant="tonal"
            class="mb-4"
            density="comfortable"
            rounded="lg"
          >
            <div class="d-flex align-center">
              <v-icon class="mr-2" size="20">mdi-calendar-alert</v-icon>
              <span>This date has reached maximum capacity ({{ MAX_DAILY_APPOINTMENTS }}/{{ MAX_DAILY_APPOINTMENTS }} appointments)</span>
            </div>
          </v-alert>

          <v-form ref="bookingFormRef" v-model="bookingFormValid">
            <!-- Appointment Type -->
            <div class="form-field">
              <label class="form-label">Appointment Type</label>
              <v-select
                v-model="bookingData.appointment_type_id"
                :items="appointmentTypes"
                item-title="type_name"
                item-value="id"
                density="comfortable"
                :rules="[v => !!v || 'Required']"
                variant="outlined"
                placeholder="Select type"
                @update:model-value="onAppointmentTypeChange"
              >
                <template v-slot:item="{ props, item }">
                  <v-list-item v-bind="props">
                    <template v-slot:prepend>
                      <v-icon :icon="getTypeIcon(item.raw.type_name)" class="mr-2" color="primary" size="20" />
                    </template>
                    <v-list-item-title>{{ item.raw.type_name }}</v-list-item-title>
                    <v-list-item-subtitle>{{ item.raw.duration_minutes }} minutes</v-list-item-subtitle>
                  </v-list-item>
                </template>
              </v-select>
            </div>

            <!-- Date Picker -->
            <div class="form-field">
              <label class="form-label">Select Date</label>
              <v-text-field
                v-model="bookingData.scheduled_date"
                type="date"
                density="comfortable"
                :rules="[v => !!v || 'Required']"
                :min="minDate"
                variant="outlined"
                @update:model-value="checkAvailability"
              />
            </div>

            <!-- Time Picker -->
            <div class="form-field">
              <label class="form-label">Select Time</label>
              <v-select
                v-model="bookingData.scheduled_time"
                :items="availableTimeSlots"
                item-title="display"
                item-value="time"
                density="comfortable"
                :rules="[v => !!v || 'Required']"
                :disabled="!bookingData.scheduled_date || checkingAvailability || isSelectedDateAtCapacity"
                :loading="checkingAvailability"
                variant="outlined"
                placeholder="Choose available time"
              />
            </div>

            <!-- Notes -->
            <div class="form-field">
              <label class="form-label">Additional Notes</label>
              <v-textarea
                v-model="bookingData.notes"
                rows="3"
                variant="outlined"
                placeholder="Any specific concerns or requests? (optional)"
                counter
                maxlength="500"
                density="comfortable"
              />
            </div>

            <!-- Availability Message -->
            <v-alert
              v-if="availabilityMessage && !isSelectedDateAtCapacity"
              :type="availabilityType"
              variant="light"
              class="mt-2"
              rounded="lg"
              density="comfortable"
            >
              <div class="d-flex align-center">
                <span>{{ availabilityMessage }}</span>
              </div>
            </v-alert>
          </v-form>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4 dialog-actions">
          <v-btn variant="text" @click="closeBookingDialog" size="large">
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            size="large"
            rounded="lg"
            :loading="bookingLoading"
            :disabled="!bookingFormValid || !isSlotAvailable || isSelectedDateAtCapacity"
            @click="submitBooking"
          >
            Confirm Booking
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="4000"
      location="top right"
      variant="flat"
      rounded="lg"
    >
      <div class="d-flex align-center">
        <v-icon :icon="getSnackbarIcon(snackbar.color)" class="mr-2" size="20" />
        {{ snackbar.text }}
      </div>
      <template v-slot:actions>
        <v-btn color="white" variant="text" size="small" @click="snackbar.show = false">
          Dismiss
        </v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { patientApi, appointmentsApi } from '@/api'
import { format, parseISO, addDays } from 'date-fns'

// State
const loading = ref(false)
const bookingLoading = ref(false)
const checkingAvailability = ref(false)
const activeTab = ref('upcoming')
const upcomingAppointments = ref([])
const pastAppointments = ref([])
const currentPage = ref(1)
const totalPages = ref(1)
const totalItems = ref(0)

// Booking state
const showBookingDialog = ref(false)
const bookingFormValid = ref(false)
const bookingFormRef = ref(null)
const appointmentTypes = ref([])
const availableTimeSlots = ref([])

const bookingData = ref({
  appointment_type_id: null,
  scheduled_date: '',
  scheduled_time: '',
  duration: 30,
  notes: ''
})

const snackbar = ref({
  show: false,
  text: '',
  color: 'info'
})

const MAX_DAILY_APPOINTMENTS = 16

// Computed
const upcomingCount = computed(() => upcomingAppointments.value.length)

const minDate = computed(() => {
  const tomorrow = addDays(new Date(), 1)
  return format(tomorrow, 'yyyy-MM-dd')
})

const isSelectedDateAtCapacity = computed(() => {
  if (!bookingData.value.scheduled_date) return false
  const dateStr = bookingData.value.scheduled_date
  const appointmentsOnDate = upcomingAppointments.value.filter(a => 
    format(parseISO(a.scheduled_at), 'yyyy-MM-dd') === dateStr
  )
  return appointmentsOnDate.length >= MAX_DAILY_APPOINTMENTS
})

const isSlotAvailable = computed(() => {
  if (!bookingData.value.scheduled_time || checkingAvailability.value) return false
  return availableTimeSlots.value.some(slot => 
    slot.time === bookingData.value.scheduled_time && slot.available !== false
  )
})

const availabilityMessage = computed(() => {
  if (!bookingData.value.scheduled_date) return 'Please select a date'
  if (!bookingData.value.appointment_type_id) return 'Please select appointment type'
  if (isSelectedDateAtCapacity.value) return 'This date is fully booked'
  if (checkingAvailability.value) return 'Checking availability...'
  if (!bookingData.value.scheduled_time) return 'Please select a time'
  if (isSlotAvailable.value) {
    return 'Time slot available! Click "Confirm Booking" to proceed.'
  }
  return 'This time slot is not available. Please select another time.'
})

const availabilityType = computed(() => {
  if (isSelectedDateAtCapacity.value) return 'error'
  if (!bookingData.value.scheduled_time) return 'info'
  if (checkingAvailability.value) return 'info'
  return isSlotAvailable.value ? 'success' : 'warning'
})

const availabilityIcon = computed(() => {
  if (isSelectedDateAtCapacity.value) return 'mdi-alert-circle'
  if (!bookingData.value.scheduled_time) return 'mdi-information'
  if (checkingAvailability.value) return 'mdi-loading'
  return isSlotAvailable.value ? 'mdi-check-circle' : 'mdi-alert'
})

// Methods
const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A'
  return format(parseISO(dateStr), 'EEEE, MMMM d, yyyy')
}

const formatTime = (dateStr) => {
  if (!dateStr) return 'N/A'
  return format(parseISO(dateStr), 'h:mm a')
}

const getDayOfMonth = (dateStr) => {
  if (!dateStr) return ''
  return format(parseISO(dateStr), 'd')
}

const getMonthAbbr = (dateStr) => {
  if (!dateStr) return ''
  return format(parseISO(dateStr), 'MMM')
}

const truncateText = (text, maxLength) => {
  if (!text) return ''
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

const appointmentStatusColor = (status) => {
  const colors = {
    'SCHEDULED': 'warning',
    'CONFIRMED': 'info',
    'IN_PROGRESS': 'primary',
    'COMPLETED': 'success',
    'CANCELLED': 'error',
    'NO_SHOW': 'grey'
  }
  return colors[status] || 'default'
}

const getTypeIcon = (type) => {
  const icons = {
    'Consultation': 'mdi-stethoscope',
    'Testing': 'mdi-microscope',
    'Refill': 'mdi-pill',
    'Others': 'mdi-clipboard-text'
  }
  return icons[type] || 'mdi-calendar'
}

const getSnackbarIcon = (color) => {
  const icons = {
    success: 'mdi-check-circle',
    error: 'mdi-alert-circle',
    warning: 'mdi-alert',
    info: 'mdi-information'
  }
  return icons[color] || 'mdi-information'
}

const canCancel = (scheduledAt) => {
  if (!scheduledAt) return false
  const hoursUntil = (new Date(scheduledAt) - new Date()) / (1000 * 60 * 60)
  return hoursUntil > 1
}

const showSnackbar = (text, color = 'info') => {
  snackbar.value = { show: true, text, color }
}

const loadAppointmentTypes = async () => {
  try {
    const response = await patientApi.getAppointmentTypes()
    appointmentTypes.value = response.data || response
  } catch (error) {
    console.error('Failed to load appointment types:', error)
    showSnackbar('Failed to load appointment types', 'error')
  }
}

// FIXED: Use getUpcomingAppointments() instead of getAppointments()
const loadUpcomingAppointments = async () => {
  loading.value = true
  try {
    const response = await patientApi.getUpcomingAppointments()
    const data = response.data || response
    upcomingAppointments.value = Array.isArray(data) ? data : (data.data || [])
  } catch (error) {
    console.error('Failed to load upcoming appointments:', error)
    showSnackbar('Failed to load upcoming appointments', 'error')
  } finally {
    loading.value = false
  }
}

// FIXED: Keep using getAppointments() for past appointments with status filter
const loadPastAppointments = async () => {
  loading.value = true
  try {
    const response = await patientApi.getAppointments({ 
      status: 'COMPLETED,CANCELLED,NO_SHOW', 
      page: currentPage.value, 
      limit: 10 
    })
    const data = response.data || response
    pastAppointments.value = data.data || data
    totalItems.value = data.total || 0
    totalPages.value = data.total_pages || Math.ceil(totalItems.value / 10) || 1
  } catch (error) {
    console.error('Failed to load past appointments:', error)
    showSnackbar('Failed to load past appointments', 'error')
  } finally {
    loading.value = false
  }
}

const loadAppointments = async () => {
  await Promise.all([
    loadUpcomingAppointments(),
    loadPastAppointments()
  ])
}

const checkAvailability = async () => {
  if (!bookingData.value.scheduled_date || !bookingData.value.appointment_type_id) {
    availableTimeSlots.value = []
    return
  }

  checkingAvailability.value = true
  try {
    const response = await appointmentsApi.checkAvailability({
      date: bookingData.value.scheduled_date,
      type_id: parseInt(bookingData.value.appointment_type_id)
    })

    let slots = []
    if (response?.slots && Array.isArray(response.slots)) {
      slots = response.slots
    } else if (response?.data?.slots && Array.isArray(response.data.slots)) {
      slots = response.data.slots
    }
    
    const now = new Date()
    const today = new Date().toISOString().split('T')[0]
    const isToday_ = bookingData.value.scheduled_date === today

    availableTimeSlots.value = slots
      .filter(slot => {
        if (!slot.available) return false
        if (isToday_) {
          const [hours, minutes] = slot.time.split(':').map(Number)
          const slotTime = new Date()
          slotTime.setHours(hours, minutes, 0, 0)
          return slotTime > now
        }
        return true
      })
      .map(slot => ({
        time: slot.time,
        display: slot.display || formatTimeString(slot.time),
        available: slot.available
      }))

    if (bookingData.value.scheduled_time && 
        !availableTimeSlots.value.some(slot => slot.time === bookingData.value.scheduled_time)) {
      bookingData.value.scheduled_time = ''
    }
  } catch (error) {
    console.error('Error checking availability:', error)
    availableTimeSlots.value = []
    showSnackbar('Failed to check availability', 'error')
  } finally {
    checkingAvailability.value = false
  }
}

const formatTimeString = (timeStr) => {
  const [hours, minutes] = timeStr.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${minutes} ${ampm}`
}

const onAppointmentTypeChange = () => {
  const selectedType = appointmentTypes.value.find(t => t.id === bookingData.value.appointment_type_id)
  if (selectedType) {
    bookingData.value.duration = selectedType.duration_minutes || 30
  }
  if (bookingData.value.scheduled_date) {
    checkAvailability()
  }
}

const openBookingDialog = () => {
  resetBookingForm()
  bookingData.value.scheduled_date = format(addDays(new Date(), 1), 'yyyy-MM-dd')
  showBookingDialog.value = true
}

const closeBookingDialog = () => {
  showBookingDialog.value = false
  resetBookingForm()
}

const submitBooking = async () => {
  if (!bookingFormValid.value) {
    bookingFormRef.value?.validate()
    return
  }

  if (!bookingData.value.scheduled_time) {
    showSnackbar('Please select a time slot', 'warning')
    return
  }

  if (isSelectedDateAtCapacity.value) {
    showSnackbar('This date is fully booked', 'error')
    return
  }

  if (!isSlotAvailable.value) {
    showSnackbar('Selected time slot is not available', 'error')
    return
  }

  bookingLoading.value = true
  try {
    const scheduledDateTime = `${bookingData.value.scheduled_date}T${bookingData.value.scheduled_time}:00`
    
    await patientApi.bookAppointment({
      appointment_type_id: parseInt(bookingData.value.appointment_type_id),
      scheduled_at: scheduledDateTime,
      notes: bookingData.value.notes || null
    })
    
    showSnackbar('Appointment booked successfully!', 'success')
    closeBookingDialog()
    await loadAppointments()
    
  } catch (error) {
    console.error('Booking error:', error)
    const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to book appointment'
    showSnackbar(errorMessage, 'error')
  } finally {
    bookingLoading.value = false
  }
}

const cancelAppointment = async (appointment) => {
  if (!confirm(`Cancel appointment on ${formatDate(appointment.scheduled_at)}?`)) return
  
  try {
    await patientApi.cancelAppointment(appointment.id)
    showSnackbar('Appointment cancelled', 'success')
    await loadAppointments()
  } catch (error) {
    console.error('Cancel error:', error)
    showSnackbar(error.response?.data?.error || 'Failed to cancel appointment', 'error')
  }
}

const resetBookingForm = () => {
  bookingData.value = {
    appointment_type_id: null,
    scheduled_date: '',
    scheduled_time: '',
    duration: 30,
    notes: ''
  }
  availableTimeSlots.value = []
  bookingFormValid.value = false
}

// Watchers
watch(() => bookingData.value.scheduled_date, () => {
  if (bookingData.value.scheduled_date) {
    checkAvailability()
  } else {
    availableTimeSlots.value = []
  }
})

// Lifecycle
onMounted(async () => {
  await loadAppointmentTypes()
  await loadAppointments()
})
</script>

<style scoped>
.patient-appointments {
  max-width: 1000px;
  margin: 0 auto;
  padding: 24px;
}

/* Header */
.appointments-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.header-title {
  font-size: 28px;
  font-weight: 600;
  color: #1a2a3a;
  margin: 0 0 4px 0;
  letter-spacing: -0.3px;
}

.header-subtitle {
  font-size: 14px;
  color: #6b7a8a;
  margin: 0;
}

.book-btn {
  text-transform: none;
  font-weight: 500;
  letter-spacing: normal;
  padding: 0 20px;
}

/* Card */
.appointments-card {
  border-radius: 20px;
  border: 1px solid #eef2f6;
  overflow: hidden;
}

/* Appointment Cards */
.appointments-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.appointment-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #eef2f6;
  transition: all 0.2s ease;
}

.appointment-card:hover {
  border-color: #d0dae4;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

.past-card {
  background: #fafbfc;
}

/* Date Badge */
.appointment-date-badge {
  min-width: 56px;
  width: 56px;
  text-align: center;
  background: #f5f7fa;
  border-radius: 14px;
  padding: 8px 4px;
}

.past-badge {
  background: #f0f2f5;
}

.date-day {
  font-size: 22px;
  font-weight: 600;
  color: #1a4d3a;
  line-height: 1.2;
}

.date-month {
  font-size: 11px;
  font-weight: 500;
  color: #6b7a8a;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

/* Details */
.appointment-details {
  flex: 1;
}

.details-header {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.appointment-type {
  font-weight: 600;
  font-size: 15px;
  color: #1a2a3a;
}

.details-time {
  font-size: 13px;
  color: #6b7a8a;
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}

.details-notes {
  font-size: 12px;
  color: #8f9eae;
  display: flex;
  align-items: center;
}

/* Actions */
.appointment-actions {
  opacity: 0.6;
  transition: opacity 0.2s;
}

.appointment-card:hover .appointment-actions {
  opacity: 1;
}

/* Pagination */
.pagination-wrapper {
  display: flex;
  justify-content: center;
  padding-top: 8px;
}

/* Dialog */
.booking-dialog {
  border-radius: 24px !important;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px 24px 12px 24px;
}

.dialog-title {
  font-size: 20px;
  font-weight: 600;
  color: #1a2a3a;
  margin: 0 0 4px 0;
}

.dialog-subtitle {
  font-size: 13px;
  color: #6b7a8a;
  margin: 0;
}

.dialog-actions {
  gap: 12px;
}

/* Form */
.form-field {
  margin-bottom: 20px;
}

.form-field:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #34495e;
  margin-bottom: 6px;
}

/* Alert Link */
.alert-link {
  color: #1a4d3a;
  text-decoration: none;
  font-weight: 500;
}

.alert-link:hover {
  text-decoration: underline;
}

/* Responsive */
@media (max-width: 640px) {
  .patient-appointments {
    padding: 16px;
  }
  
  .appointments-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .header-title {
    font-size: 24px;
  }
  
  .appointment-card {
    padding: 12px;
    gap: 12px;
  }
  
  .appointment-date-badge {
    min-width: 48px;
    width: 48px;
  }
  
  .date-day {
    font-size: 18px;
  }
  
  .dialog-header {
    padding: 16px 20px;
  }
  
  .dialog-title {
    font-size: 18px;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .appointment-card {
    background: #1e1e2a;
    border-color: #2a2a35;
  }
  
  .appointment-card:hover {
    border-color: #3a3a48;
  }
  
  .appointment-date-badge {
    background: #2a2a35;
  }
  
  .date-day {
    color: #4c9f8a;
  }
  
  .appointment-type {
    color: #e0e0e0;
  }
}
</style>