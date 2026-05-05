<!-- frontend/src/pages/patient/PatientAppointments.vue -->
<template>
  <div class="patient-appointments">
    <v-card>
      <v-card-title class="d-flex justify-space-between align-center">
        <span>My Appointments</span>
        <v-btn color="primary" variant="text" @click="openBookingDialog" prepend-icon="mdi-calendar-plus">
          Book New
        </v-btn>
      </v-card-title>

      <v-card-text>
        <!-- Tabs -->
        <v-tabs v-model="activeTab" color="primary" class="mb-4">
          <v-tab value="upcoming">
            Upcoming
            <v-chip v-if="upcomingCount" size="x-small" color="primary" class="ml-2">{{ upcomingCount }}</v-chip>
          </v-tab>
          <v-tab value="past">Past</v-tab>
        </v-tabs>

        <v-window v-model="activeTab">
          <!-- Upcoming Appointments -->
          <v-window-item value="upcoming">
            <div v-if="loading" class="text-center py-8">
              <v-progress-circular indeterminate color="primary" size="40" />
            </div>

            <div v-else-if="upcomingAppointments.length">
              <v-card v-for="appointment in upcomingAppointments" :key="appointment.id" variant="outlined" class="mb-3 appointment-card">
                <v-card-item>
                  <div class="d-flex align-center">
                    <!-- Date Badge -->
                    <div class="date-badge text-center mr-4">
                      <div class="text-h6 font-weight-bold text-primary">{{ getDayOfMonth(appointment.scheduled_at) }}</div>
                      <div class="text-caption text-medium-emphasis">{{ getMonthAbbr(appointment.scheduled_at) }}</div>
                    </div>

                    <!-- Appointment Details -->
                    <div class="flex-grow-1">
                      <div class="d-flex align-center ga-2 mb-1 flex-wrap">
                        <span class="font-weight-medium">{{ appointment.type_name || 'Consultation' }}</span>
                        <v-chip :color="appointmentStatusColor(appointment.status)" size="x-small">
                          {{ appointment.status }}
                        </v-chip>
                      </div>
                      
                      <div class="d-flex align-center ga-2 mt-1">
                        <v-icon size="14">mdi-calendar</v-icon>
                        <span class="text-body-2">{{ formatDate(appointment.scheduled_at) }}</span>
                        <v-icon size="14" class="ml-2">mdi-clock</v-icon>
                        <span class="text-body-2">{{ formatTime(appointment.scheduled_at) }}</span>
                      </div>
                      
                      <div v-if="appointment.notes" class="text-caption text-medium-emphasis mt-1">
                        <v-icon size="12">mdi-note-text</v-icon>
                        {{ truncateText(appointment.notes, 60) }}
                      </div>
                    </div>

                    <!-- Cancel Button -->
                    <div v-if="canCancel(appointment.scheduled_at) && appointment.status !== 'CANCELLED'">
                      <v-btn color="error" variant="tonal" size="small" @click="cancelAppointment(appointment)" prepend-icon="mdi-close">
                        Cancel
                      </v-btn>
                    </div>
                  </div>
                </v-card-item>
              </v-card>
            </div>

            <v-alert v-else type="info" variant="tonal" class="mt-2">
              No upcoming appointments.
              <a href="#" class="alert-link" @click.prevent="openBookingDialog">Book one now</a>
            </v-alert>
          </v-window-item>

          <!-- Past Appointments -->
          <v-window-item value="past">
            <div v-if="loading" class="text-center py-8">
              <v-progress-circular indeterminate color="primary" size="40" />
            </div>

            <div v-else-if="pastAppointments.length">
              <v-card v-for="appointment in pastAppointments" :key="appointment.id" variant="outlined" class="mb-2 past-card">
                <v-card-item>
                  <div class="d-flex align-center">
                    <!-- Date Badge -->
                    <div class="date-badge text-center mr-4">
                      <div class="text-h6 font-weight-bold">{{ getDayOfMonth(appointment.scheduled_at) }}</div>
                      <div class="text-caption">{{ getMonthAbbr(appointment.scheduled_at) }}</div>
                    </div>

                    <!-- Appointment Details -->
                    <div class="flex-grow-1">
                      <div class="d-flex align-center ga-2 mb-1 flex-wrap">
                        <span class="font-weight-medium">{{ appointment.type_name || 'Consultation' }}</span>
                        <v-chip :color="appointmentStatusColor(appointment.status)" size="x-small" variant="light">
                          {{ appointment.status }}
                        </v-chip>
                      </div>
                      
                      <div class="d-flex align-center ga-2 mt-1">
                        <v-icon size="14">mdi-calendar</v-icon>
                        <span class="text-body-2">{{ formatDate(appointment.scheduled_at) }}</span>
                        <v-icon size="14" class="ml-2">mdi-clock</v-icon>
                        <span class="text-body-2">{{ formatTime(appointment.scheduled_at) }}</span>
                      </div>
                    </div>
                  </div>
                </v-card-item>
              </v-card>

              <!-- Pagination -->
              <div v-if="totalPages > 1" class="d-flex justify-center mt-4">
                <v-pagination v-model="currentPage" :length="totalPages" :total-visible="5" color="primary"
                  @update:model-value="loadPastAppointments" />
              </div>
            </div>

            <v-alert v-else type="info" variant="tonal" class="mt-2">
              No past appointments found.
            </v-alert>
          </v-window-item>
        </v-window>
      </v-card-text>
    </v-card>

    <!-- Booking Dialog -->
    <v-dialog v-model="showBookingDialog" max-width="600px">
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
          <span>Book New Appointment</span>
          <v-btn icon="mdi-close" variant="text" size="small" @click="closeBookingDialog"></v-btn>
        </v-card-title>

        <v-divider></v-divider>

        <v-card-text class="mt-4">
          <!-- Capacity Alert -->
          <v-alert v-if="isSelectedDateAtCapacity" type="warning" variant="tonal" class="mb-4" density="compact">
            <div class="d-flex align-center">
              <v-icon class="mr-2">mdi-calendar-alert</v-icon>
              <span>This date has reached maximum capacity ({{ MAX_DAILY_APPOINTMENTS }}/{{ MAX_DAILY_APPOINTMENTS }} appointments)</span>
            </div>
          </v-alert>

          <v-form ref="bookingFormRef" v-model="bookingFormValid">
            <v-select v-model="bookingData.appointment_type_id" :items="appointmentTypes" item-title="type_name"
              item-value="id" label="Appointment Type" :rules="[v => !!v || 'Required']" variant="outlined"
              density="comfortable" @update:model-value="onAppointmentTypeChange">
              <template v-slot:item="{ props, item }">
                <v-list-item v-bind="props">
                  <template v-slot:prepend>
                    <v-icon :icon="getTypeIcon(item.raw.type_name)" class="mr-2" color="primary"></v-icon>
                  </template>
                  <v-list-item-title>{{ item.raw.type_name }}</v-list-item-title>
                  <v-list-item-subtitle>{{ item.raw.duration_minutes }} minutes</v-list-item-subtitle>
                </v-list-item>
              </template>
            </v-select>

            <v-text-field v-model="bookingData.scheduled_date" type="date" label="Select Date"
              :rules="[v => !!v || 'Required']" :min="minDate" variant="outlined" density="comfortable"
              @update:model-value="checkAvailability" class="mt-2" />

            <v-select v-model="bookingData.scheduled_time" :items="availableTimeSlots" item-title="display"
              item-value="time" label="Select Time" :rules="[v => !!v || 'Required']"
              :disabled="!bookingData.scheduled_date || checkingAvailability || isSelectedDateAtCapacity"
              :loading="checkingAvailability" variant="outlined" density="comfortable" class="mt-2" />

            <v-textarea v-model="bookingData.notes" label="Additional Notes" rows="3" variant="outlined"
              placeholder="Any specific concerns or requests? (optional)" counter maxlength="500" density="comfortable"
              class="mt-2" />

            <!-- Availability Message -->
            <v-alert v-if="availabilityMessage && !isSelectedDateAtCapacity" :type="availabilityType" variant="light"
              class="mt-4" density="compact">
              <div class="d-flex align-center">
                <v-icon :icon="availabilityIcon" class="mr-2" size="18" />
                <span>{{ availabilityMessage }}</span>
              </div>
            </v-alert>
          </v-form>
        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn variant="outlined" @click="closeBookingDialog">Cancel</v-btn>
          <v-btn color="primary" variant="flat" :loading="bookingLoading"
            :disabled="!bookingFormValid || !isSlotAvailable || isSelectedDateAtCapacity" @click="submitBooking">
            Confirm Booking
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Loading Overlay -->
    <v-overlay v-model="loading" class="align-center justify-center">
      <v-progress-circular indeterminate size="48" color="primary"></v-progress-circular>
    </v-overlay>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useSnackbarStore } from '@/stores/snackbar'
import { patientApi, appointmentsApi } from '@/api'
import { format, parseISO, addDays } from 'date-fns'

const snackbarStore = useSnackbarStore()

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

const canCancel = (scheduledAt) => {
  if (!scheduledAt) return false
  const hoursUntil = (new Date(scheduledAt) - new Date()) / (1000 * 60 * 60)
  return hoursUntil > 1
}

const loadAppointmentTypes = async () => {
  try {
    const response = await patientApi.getAppointmentTypes()
    appointmentTypes.value = response.data || response
  } catch (error) {
    console.error('Failed to load appointment types:', error)
    snackbarStore.showError('Failed to load appointment types')
  }
}

const loadUpcomingAppointments = async () => {
  loading.value = true
  try {
    const response = await patientApi.getUpcomingAppointments()
    const data = response.data || response
    upcomingAppointments.value = Array.isArray(data) ? data : (data.data || [])
  } catch (error) {
    console.error('Failed to load upcoming appointments:', error)
    snackbarStore.showError('Failed to load upcoming appointments')
  } finally {
    loading.value = false
  }
}

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
    snackbarStore.showError('Failed to load past appointments')
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
    snackbarStore.showError('Failed to check availability')
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
    snackbarStore.showWarning('Please select a time slot')
    return
  }

  if (isSelectedDateAtCapacity.value) {
    snackbarStore.showError('This date is fully booked')
    return
  }

  if (!isSlotAvailable.value) {
    snackbarStore.showError('Selected time slot is not available')
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

    snackbarStore.showSuccess('Appointment booked successfully!')
    closeBookingDialog()
    await loadAppointments()

  } catch (error) {
    console.error('Booking error:', error)
    const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to book appointment'
    snackbarStore.showError(errorMessage)
  } finally {
    bookingLoading.value = false
  }
}

const cancelAppointment = async (appointment) => {
  if (!confirm(`Cancel appointment on ${formatDate(appointment.scheduled_at)}?`)) return

  try {
    await patientApi.cancelAppointment(appointment.id)
    snackbarStore.showSuccess('Appointment cancelled successfully')
    await loadAppointments()
  } catch (error) {
    console.error('Cancel error:', error)
    snackbarStore.showError(error.response?.data?.error || 'Failed to cancel appointment')
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
  max-width: 800px;
  margin: 0 auto;
}

.date-badge {
  min-width: 60px;
}

.appointment-card {
  transition: all 0.2s ease;
}

.appointment-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
}

.past-card {
  opacity: 0.85;
}

.alert-link {
  color: #1976d2;
  text-decoration: none;
  font-weight: 500;
}

.alert-link:hover {
  text-decoration: underline;
}
</style>