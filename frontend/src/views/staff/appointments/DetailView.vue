<!-- frontend/src/views/staff/appointments/DetailView.vue -->
<template>
  <v-container fluid class="pa-4">
    <v-row>
      <v-col cols="12" md="8" offset-md="2">
        <v-card class="rounded-lg">
          <v-card-title class="d-flex align-center pa-4 bg-surface">
            <v-icon class="mr-2 text-primary">mdi-calendar-check</v-icon>
            <span class="text-h5 font-weight-medium">Appointment Details</span>
            <v-spacer></v-spacer>
            <v-chip 
              color="primary" 
              size="small"
              variant="tonal"
              class="font-weight-medium"
              v-if="appointment"
            >
              #{{ appointment.id }}
            </v-chip>
          </v-card-title>
          
          <v-divider></v-divider>
          
          <v-card-text class="pa-4" v-if="appointment">
            <!-- Loading state -->
            <div v-if="loading" class="text-center pa-8">
              <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
              <p class="mt-4 text-medium-emphasis">Loading appointment details...</p>
            </div>
            
            <!-- Error state -->
            <div v-else-if="error" class="text-center pa-8">
              <v-icon color="error" size="64">mdi-alert-circle</v-icon>
              <p class="mt-2 text-h6 text-medium-emphasis">{{ error }}</p>
              <v-btn color="primary" @click="goBack" rounded variant="flat" class="mt-2 text-capitalize">
                <v-icon left size="18">mdi-arrow-left</v-icon>
                Go Back
              </v-btn>
            </div>
            
            <!-- Content -->
            <template v-else>
              <v-row>
                <v-col cols="12" md="6">
                  <div class="text-subtitle-2 font-weight-bold text-medium-emphasis mb-1">Patient</div>
                  <div v-if="appointment.Patient">
                    <router-link 
                      :to="`/patients/${appointment.Patient.id}`" 
                      class="text-decoration-none font-weight-medium text-body-1"
                    >
                      {{ appointment.Patient.first_name }} {{ appointment.Patient.last_name }}
                    </router-link>
                    <div class="text-caption text-medium-emphasis">{{ appointment.Patient.contact_number }}</div>
                  </div>
                  <div v-else class="text-medium-emphasis">N/A</div>
                </v-col>
                
                <v-col cols="12" md="6">
                  <div class="text-subtitle-2 font-weight-bold text-medium-emphasis mb-1">Status</div>
                  <v-chip 
                    :color="getStatusColor(appointment.status)" 
                    size="small"
                    variant="tonal"
                    class="font-weight-medium"
                  >
                    {{ formatStatus(appointment.status) }}
                  </v-chip>
                </v-col>
                
                <v-col cols="12" md="6">
                  <div class="text-subtitle-2 font-weight-bold text-medium-emphasis mb-1">Date</div>
                  <div class="text-body-1">{{ formatDate(appointment.appointment_date) }}</div>
                  <!-- Date availability indicator -->
                  <v-chip 
                    v-if="appointment.status !== 'cancelled' && appointment.status !== 'completed'"
                    :color="isDateAvailable ? 'success' : 'error'"
                    size="x-small"
                    variant="tonal"
                    class="mt-1"
                  >
                    {{ isDateAvailable ? 'Date Available' : 'Date Unavailable' }}
                  </v-chip>
                </v-col>
                
                <v-col cols="12" md="6">
                  <div class="text-subtitle-2 font-weight-bold text-medium-emphasis mb-1">Time Slot</div>
                  <div class="text-body-1">{{ formatTimeSlot(appointment.time_slot) }}</div>
                  <!-- Slot status -->
                  <v-chip 
                    v-if="appointment.status !== 'cancelled' && appointment.status !== 'completed'"
                    :color="getSlotStatusColor(slotStatus)"
                    size="x-small"
                    variant="tonal"
                    class="mt-1"
                  >
                    {{ getSlotStatusText(slotStatus) }}
                  </v-chip>
                </v-col>
                
                <v-col cols="12" md="6">
                  <div class="text-subtitle-2 font-weight-bold text-medium-emphasis mb-1">Office</div>
                  <v-chip 
                    :color="appointment.office === 'testing' ? 'info' : 'success'" 
                    size="small"
                    variant="tonal"
                  >
                    {{ appointment.office }}
                  </v-chip>
                </v-col>
                
                <v-col cols="12" md="6">
                  <div class="text-subtitle-2 font-weight-bold text-medium-emphasis mb-1">Transaction Type</div>
                  <div v-if="appointment.TransactionType">
                    <v-chip 
                      :color="appointment.TransactionType.color_code || 'primary'"
                      size="small"
                      class="font-weight-medium"
                      :style="`background-color: ${appointment.TransactionType.color_code || '#1976D2'}20; color: ${appointment.TransactionType.color_code || '#1976D2'}; border: 1px solid ${appointment.TransactionType.color_code || '#1976D2'}40;`"
                    >
                      {{ appointment.TransactionType.name }}
                    </v-chip>
                    <div class="text-caption text-medium-emphasis mt-1">
                      {{ appointment.TransactionType.estimated_duration_minutes }} min • {{ appointment.TransactionType.office }}
                    </div>
                  </div>
                  <div v-else class="text-medium-emphasis">N/A</div>
                </v-col>
                
                <v-col cols="12" v-if="appointment.queue_number">
                  <div class="text-subtitle-2 font-weight-bold text-medium-emphasis mb-1">Queue Number</div>
                  <v-chip color="primary" size="large" class="font-weight-bold">
                    #{{ appointment.queue_number }}
                  </v-chip>
                </v-col>
                
                <v-col cols="12" v-if="appointment.checked_in_at">
                  <div class="text-subtitle-2 font-weight-bold text-medium-emphasis mb-1">Checked In At</div>
                  <div class="text-body-1">{{ formatDateTime(appointment.checked_in_at) }}</div>
                </v-col>
                
                <v-col cols="12" v-if="appointment.notes">
                  <div class="text-subtitle-2 font-weight-bold text-medium-emphasis mb-1">Notes</div>
                  <div class="text-body-1 pa-3 rounded-lg" style="background: rgba(0,0,0,0.03);">
                    {{ appointment.notes }}
                  </div>
                </v-col>
                
                <v-col cols="12" v-if="appointment.cancellation_reason">
                  <div class="text-subtitle-2 font-weight-bold text-medium-emphasis mb-1">Cancellation Reason</div>
                  <div class="text-body-1 pa-3 rounded-lg" style="background: rgba(255,0,0,0.05);">
                    {{ appointment.cancellation_reason }}
                  </div>
                </v-col>
              </v-row>

              <v-divider class="my-4"></v-divider>

              <v-row>
                <v-col cols="12" class="d-flex justify-end ga-2 flex-wrap">
                  <v-btn 
                    color="primary" 
                    @click="editAppointment" 
                    :disabled="appointment.status === 'completed' || appointment.status === 'cancelled'"
                    rounded
                    variant="flat"
                    class="text-capitalize"
                  >
                    <v-icon left size="18">mdi-pencil</v-icon>
                    Edit
                  </v-btn>
                  
                  <v-tooltip text="Check in patient" location="top">
                    <template v-slot:activator="{ props }">
                      <v-btn 
                        color="success" 
                        @click="checkIn" 
                        :disabled="appointment.status !== 'pending'" 
                        :loading="checkingIn"
                        rounded
                        variant="flat"
                        class="text-capitalize"
                        v-bind="props"
                      >
                        <v-icon left size="18">mdi-check-in</v-icon>
                        Check In
                      </v-btn>
                    </template>
                  </v-tooltip>
                  
                  <v-tooltip text="Reschedule appointment" location="top">
                    <template v-slot:activator="{ props }">
                      <v-btn 
                        color="warning" 
                        @click="openRescheduleDialog" 
                        :disabled="appointment.status === 'completed' || appointment.status === 'cancelled'"
                        rounded
                        variant="flat"
                        class="text-capitalize"
                        v-bind="props"
                      >
                        <v-icon left size="18">mdi-calendar-refresh</v-icon>
                        Reschedule
                      </v-btn>
                    </template>
                  </v-tooltip>
                  
                  <v-tooltip text="Cancel appointment" location="top">
                    <template v-slot:activator="{ props }">
                      <v-btn 
                        color="error" 
                        @click="cancelAppointment"
                        :disabled="appointment.status === 'completed' || appointment.status === 'cancelled'" 
                        rounded
                        variant="flat"
                        class="text-capitalize"
                        v-bind="props"
                      >
                        <v-icon left size="18">mdi-cancel</v-icon>
                        Cancel
                      </v-btn>
                    </template>
                  </v-tooltip>
                </v-col>
              </v-row>
            </template>
          </v-card-text>
          
          <v-card-text v-else class="text-center pa-8">
            <v-icon size="64" color="grey-lighten-2">mdi-calendar-off</v-icon>
            <div class="text-h6 text-medium-emphasis mt-2">Appointment not found</div>
            <v-btn color="primary" @click="goBack" rounded variant="flat" class="mt-4 text-capitalize">
              <v-icon left size="18">mdi-arrow-left</v-icon>
              Go Back
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Reschedule Dialog -->
    <v-dialog v-model="rescheduleDialog" max-width="600px">
      <v-card rounded="lg">
        <v-card-title class="d-flex align-center pa-4 bg-surface">
          <v-icon class="mr-2 text-warning">mdi-calendar-refresh</v-icon>
          <span class="text-h6 font-weight-medium">Reschedule Appointment</span>
          <v-spacer></v-spacer>
          <v-btn
            icon="mdi-close"
            variant="text"
            @click="rescheduleDialog = false"
            size="small"
          ></v-btn>
        </v-card-title>
        
        <v-divider></v-divider>
        
        <v-card-text class="pa-4">
          <v-form ref="rescheduleForm" v-model="rescheduleValid">
            <v-row>
              <v-col cols="12">
                <v-menu
                  v-model="rescheduleDateMenu"
                  :close-on-content-click="false"
                  transition="scale-transition"
                  offset-y
                >
                  <template v-slot:activator="{ props }">
                    <v-text-field
                      v-model="rescheduleDisplayDate"
                      label="New Date"
                      prepend-inner-icon="mdi-calendar"
                      readonly
                      v-bind="props"
                      :rules="[v => !!v || 'Date is required']"
                      variant="outlined"
                      density="compact"
                      class="rounded-lg"
                    ></v-text-field>
                  </template>
                  <v-date-picker
                    v-model="rescheduleData.date"
                    @update:model-value="onRescheduleDateSelected"
                    :min="minDate"
                    :max="maxDate"
                    color="primary"
                    :allowed-dates="allowedDates"
                  ></v-date-picker>
                </v-menu>
              </v-col>
              
              <v-col cols="12">
                <v-select
                  v-model="rescheduleData.time_slot"
                  :items="rescheduleSlots"
                  label="New Time Slot"
                  :rules="[v => !!v || 'Time slot is required']"
                  :loading="loadingRescheduleSlots"
                  :disabled="!rescheduleData.date"
                  variant="outlined"
                  density="compact"
                  class="rounded-lg"
                  item-title="display_title"
                  item-value="time"
                  item-disabled="disabled"
                >
                  <template #item="{ props, item }">
                    <v-list-item v-bind="props" :disabled="item.raw.disabled">
                      <v-list-item-title>
                        {{ formatTimeSlot(item.raw.time) }}
                        <v-chip 
                          v-if="item.raw.isBooked" 
                          color="error" 
                          size="x-small" 
                          class="ml-2"
                          variant="tonal"
                        >
                          Booked
                        </v-chip>
                        <v-chip 
                          v-else-if="item.raw.isPast" 
                          color="grey" 
                          size="x-small" 
                          class="ml-2"
                          variant="tonal"
                        >
                          Past
                        </v-chip>
                        <v-chip 
                          v-else-if="item.raw.available" 
                          color="success" 
                          size="x-small" 
                          class="ml-2"
                          variant="tonal"
                        >
                          Available
                        </v-chip>
                      </v-list-item-title>
                    </v-list-item>
                  </template>
                </v-select>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        
        <v-divider></v-divider>
        
        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn @click="rescheduleDialog = false" rounded variant="tonal" class="text-capitalize">
            Cancel
          </v-btn>
          <v-btn 
            color="warning" 
            @click="submitReschedule" 
            :loading="rescheduling"
            :disabled="!rescheduleValid"
            rounded
            variant="flat"
            class="text-capitalize"
          >
            <v-icon left size="18">mdi-calendar-refresh</v-icon>
            Reschedule
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
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAppointmentStore } from '@/stores/appointmentStore'
import appointmentService from '@/services/appointmentService'

export default {
  name: 'AppointmentDetail',
  setup() {
    const router = useRouter()
    const route = useRoute()
    const appointmentStore = useAppointmentStore()
    
    const appointment = ref(null)
    const loading = ref(false)
    const checkingIn = ref(false)
    const error = ref(null)
    const slotStatus = ref('unknown')
    const isDateAvailable = ref(true)
    
    // Reschedule
    const rescheduleDialog = ref(false)
    const rescheduleForm = ref(null)
    const rescheduleValid = ref(false)
    const rescheduling = ref(false)
    const rescheduleDateMenu = ref(false)
    const loadingRescheduleSlots = ref(false)
    const rescheduleData = ref({
      date: null,
      time_slot: null
    })
    const rescheduleSlots = ref([])
    const rescheduleSlotsData = ref([])

    const snackbar = ref({
      show: false,
      message: '',
      color: 'success',
      icon: 'mdi-check-circle'
    })

    const minDate = computed(() => {
      const today = new Date()
      return today.toISOString().split('T')[0]
    })

    const maxDate = computed(() => {
      const max = new Date()
      max.setDate(max.getDate() + 30)
      return max.toISOString().split('T')[0]
    })

    const rescheduleDisplayDate = computed({
      get: () => {
        if (!rescheduleData.value.date) return ''
        try {
          const date = new Date(rescheduleData.value.date + 'T00:00:00')
          if (!isNaN(date.getTime())) {
            return date.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })
          }
        } catch (e) {
          console.error('Date formatting error:', e)
        }
        return rescheduleData.value.date
      },
      set: () => {}
    })

    const loadAppointment = async () => {
      const id = route.params.id
      if (!id) {
        error.value = 'Invalid appointment ID'
        return
      }

      loading.value = true
      error.value = null
      
      try {
        console.log(`Loading appointment with ID: ${id}`)
        const data = await appointmentStore.getAppointment(parseInt(id))
        
        if (data) {
          console.log('Appointment loaded successfully:', data)
          appointment.value = data
          await checkAppointmentStatus(data)
        } else {
          error.value = 'Appointment not found'
        }
      } catch (err) {
        console.error('Error loading appointment:', err)
        error.value = err.message || 'Failed to load appointment'
        showSnackbar('Failed to load appointment: ' + error.value, 'error')
      } finally {
        loading.value = false
      }
    }

    const checkAppointmentStatus = async (appt) => {
      if (!appt || appt.status === 'cancelled' || appt.status === 'completed') {
        slotStatus.value = 'na'
        return
      }

      try {
        // Check if slot is still available (not booked by someone else)
        const result = await appointmentService.getAvailableSlots(
          appt.appointment_date,
          appt.office,
          appt.patient_id
        )

        if (result && result.slots) {
          const slot = result.slots.find(s => s.time === appt.time_slot)
          if (slot) {
            if (slot.isBooked) {
              slotStatus.value = 'booked_by_others'
            } else if (slot.isPast) {
              slotStatus.value = 'past'
            } else if (slot.available) {
              slotStatus.value = 'available'
            } else {
              slotStatus.value = 'unknown'
            }
          } else {
            slotStatus.value = 'not_found'
          }
        }

        // Check date availability
        const dateResult = await appointmentService.getDateAvailability(
          appt.appointment_date,
          appt.appointment_date,
          appt.office
        )
        if (dateResult && dateResult.length > 0) {
          isDateAvailable.value = dateResult[0].available
        }

      } catch (error) {
        console.error('Error checking appointment status:', error)
      }
    }

    const getSlotStatusColor = (status) => {
      const colors = {
        available: 'success',
        past: 'grey',
        booked_by_others: 'error',
        not_found: 'warning',
        na: 'grey',
        unknown: 'grey'
      }
      return colors[status] || 'grey'
    }

    const getSlotStatusText = (status) => {
      const texts = {
        available: 'Slot Available',
        past: 'Past Time Slot',
        booked_by_others: 'Booked by Another Patient',
        not_found: 'Slot Not Found',
        na: 'N/A',
        unknown: 'Unknown'
      }
      return texts[status] || 'Unknown'
    }

    const checkIn = async () => {
      if (!appointment.value) return
      
      checkingIn.value = true
      try {
        await appointmentStore.checkInPatient(appointment.value.id)
        showSnackbar('Patient checked in successfully', 'success')
        await loadAppointment()
      } catch (error) {
        showSnackbar('Failed to check in: ' + error.message, 'error')
      } finally {
        checkingIn.value = false
      }
    }

    const cancelAppointment = async () => {
      if (!appointment.value) return
      
      const patientName = appointment.value.Patient 
        ? `${appointment.value.Patient.first_name} ${appointment.value.Patient.last_name}`
        : 'Unknown'
      
      if (!confirm(`Cancel appointment for ${patientName}?`)) return
      
      try {
        await appointmentStore.cancelAppointment(appointment.value.id, 'Cancelled by staff')
        showSnackbar('Appointment cancelled', 'warning')
        await loadAppointment()
      } catch (error) {
        showSnackbar('Failed to cancel: ' + error.message, 'error')
      }
    }

    const editAppointment = () => {
      if (appointment.value) {
        router.push(`/appointments/${appointment.value.id}/edit`)
      }
    }

    const openRescheduleDialog = () => {
      if (appointment.value) {
        rescheduleData.value.date = appointment.value.appointment_date
        rescheduleDialog.value = true
        loadRescheduleSlots()
      }
    }

    const onRescheduleDateSelected = async (value) => {
      rescheduleDateMenu.value = false
      if (value) {
        rescheduleData.value.date = value
        rescheduleData.value.time_slot = null
        await loadRescheduleSlots()
      }
    }

    const loadRescheduleSlots = async () => {
      if (!rescheduleData.value.date || !appointment.value) return

      loadingRescheduleSlots.value = true
      try {
        const result = await appointmentService.getAvailableSlots(
          rescheduleData.value.date,
          appointment.value.office,
          appointment.value.patient_id
        )
        
        rescheduleSlotsData.value = result.slots || []
        rescheduleSlots.value = rescheduleSlotsData.value.map(slot => ({
          time: slot.time,
          display_title: formatTimeSlot(slot.time),
          available: slot.available || false,
          isBooked: slot.isBooked || false,
          isPast: slot.isPast || false,
          disabled: !slot.available
        }))
        
        // Auto-select if only one available slot
        const available = rescheduleSlotsData.value.filter(s => s.available)
        if (available.length === 1) {
          rescheduleData.value.time_slot = available[0].time
        }
      } catch (error) {
        console.error('Failed to load reschedule slots:', error)
        showSnackbar('Failed to load available slots', 'error')
      } finally {
        loadingRescheduleSlots.value = false
      }
    }

    const submitReschedule = async () => {
      if (!rescheduleForm.value?.validate()) return
      if (!appointment.value) return

      rescheduling.value = true
      try {
        await appointmentStore.rescheduleAppointment(
          appointment.value.id,
          rescheduleData.value.date,
          rescheduleData.value.time_slot
        )
        showSnackbar('Appointment rescheduled successfully', 'success')
        rescheduleDialog.value = false
        await loadAppointment()
      } catch (error) {
        showSnackbar('Failed to reschedule: ' + error.message, 'error')
      } finally {
        rescheduling.value = false
      }
    }

    const goBack = () => {
      router.push('/appointments')
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

    const formatDateTime = (date) => {
      if (!date) return 'N/A'
      try {
        return new Date(date).toLocaleString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
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

    const formatStatus = (status) => {
      if (!status) return 'Unknown'
      return status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')
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

    const allowedDates = (date) => {
      const dateStr = date.toISOString().split('T')[0]
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return dateStr >= today.toISOString().split('T')[0]
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

    onMounted(async () => {
      await appointmentStore.loadAppointmentSettings()
      await loadAppointment()
    })

    return {
      appointment,
      loading,
      checkingIn,
      error,
      snackbar,
      slotStatus,
      isDateAvailable,
      rescheduleDialog,
      rescheduleForm,
      rescheduleValid,
      rescheduling,
      rescheduleDateMenu,
      loadingRescheduleSlots,
      rescheduleData,
      rescheduleSlots,
      rescheduleSlotsData,
      rescheduleDisplayDate,
      minDate,
      maxDate,
      checkIn,
      cancelAppointment,
      editAppointment,
      openRescheduleDialog,
      onRescheduleDateSelected,
      loadRescheduleSlots,
      submitReschedule,
      goBack,
      formatDate,
      formatDateTime,
      formatTimeSlot,
      formatStatus,
      getStatusColor,
      getSlotStatusColor,
      getSlotStatusText,
      allowedDates
    }
  }
}
</script>

<style scoped>
.v-card {
  transition: none !important;
}

.bg-surface {
  background: transparent;
}

.text-capitalize {
  text-transform: capitalize;
}

:deep(.v-field) {
  border-radius: 12px !important;
}

:deep(.v-btn) {
  border-radius: 8px !important;
}
</style>