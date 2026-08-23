<!-- frontend/src/components/staff/AppointmentForm.vue -->
<template>
  <v-form ref="form" v-model="valid">
    <v-row>
      <v-col cols="12" md="6">
        <v-autocomplete
          v-model="formData.patient_id"
          v-model:search="patientSearch"
          :items="patientOptions"
          label="Patient"
          prepend-inner-icon="mdi-account-search"
          :loading="searchLoading"
          :rules="[v => !!v || 'Patient is required']"
          required
          variant="outlined"
          density="comfortable"
          clearable
          item-title="label"
          item-value="id"
          return-object
          :disabled="isEdit"
        >
          <template #item="{ props, item }">
            <v-list-item v-bind="props">
            </v-list-item>
          </template>
          <template #selection="{ item }">
            <span>{{ item.raw.label }}</span>
          </template>
          <template #no-data>
            <v-list-item>
              <v-list-item-title>No patients found</v-list-item-title>
            </v-list-item>
          </template>
        </v-autocomplete>
      </v-col>

      <!-- Transaction Type Selection (Replaces Office Selection) -->
      <v-col cols="12" md="6">
        <v-select
          v-model="formData.transaction_type_id"
          :items="transactionTypes"
          label="Transaction Type"
          prepend-inner-icon="mdi-clipboard-list"
          :rules="[v => !!v || 'Transaction type is required']"
          required
          variant="outlined"
          density="comfortable"
          :disabled="isEdit"
          item-title="display_name"
          item-value="id"
          @update:model-value="onTransactionTypeChange"
        >
          <template #item="{ props, item }">
            <v-list-item v-bind="props">
              <template #title>
                <span>{{ item.raw.name }}</span>
              </template>
              <template #subtitle>
                <v-chip 
                  size="x-small" 
                  :color="item.raw.office === 'testing' ? 'info' : 'primary'"
                  class="mr-1"
                >
                  {{ item.raw.office }}
                </v-chip>
                <span class="text-caption text-medium-emphasis">
                  ~{{ item.raw.estimated_duration_minutes }} min
                </span>
              </template>
            </v-list-item>
          </template>
          <template #selection="{ item }">
            <span>{{ item.raw.name }}</span>
            <v-chip 
              size="x-small" 
              :color="item.raw.office === 'testing' ? 'info' : 'primary'"
              class="ml-2"
            >
              {{ item.raw.office }}
            </v-chip>
          </template>
        </v-select>
        
        <!-- Display selected transaction type details -->
        <div v-if="selectedTransactionType" class="mt-1">
          <v-row no-gutters>
            <v-col cols="6">
              <span class="text-caption text-medium-emphasis">Office:</span>
              <v-chip 
                size="x-small" 
                :color="selectedTransactionType.office === 'testing' ? 'info' : 'primary'"
                text-color="white"
                class="ml-1"
              >
                {{ selectedTransactionType.office }}
              </v-chip>
            </v-col>
            <v-col cols="6">
              <span class="text-caption text-medium-emphasis">Duration:</span>
              <span class="text-caption font-weight-medium ml-1">
                {{ selectedTransactionType.estimated_duration_minutes }} min
              </span>
            </v-col>
          </v-row>
        </div>
      </v-col>

      <v-col cols="12" md="6">
        <v-menu
          v-model="dateMenu"
          :close-on-content-click="false"
          transition="scale-transition"
          offset-y
          min-width="290"
        >
          <template #activator="{ props }">
            <v-text-field
              v-model="displayDate"
              label="Appointment Date"
              prepend-inner-icon="mdi-calendar"
              readonly
              :rules="[v => !!v || 'Date is required']"
              v-bind="props"
              required
              variant="outlined"
              density="comfortable"
              :disabled="!formData.transaction_type_id"
              @click="dateMenu = true"
            ></v-text-field>
          </template>
          <v-date-picker
            v-model="selectedDate"
            @update:model-value="onDateSelected"
            :min="minDate"
            :max="maxDate"
            locale="en-US"
            :allowed-dates="allowedDates"
          ></v-date-picker>
        </v-menu>
      </v-col>

      <v-col cols="12" md="6">
        <v-select
          v-model="formData.time_slot"
          :items="availableSlots"
          label="Time Slot"
          :rules="[v => !!v || 'Time slot is required']"
          required
          variant="outlined"
          density="comfortable"
          :loading="slotsLoading"
          :disabled="!formData.appointment_date || slotsLoading || availableSlots.length === 0"
          item-title="title"
          item-value="value"
          item-disabled="disabled"
        >
          <template #item="{ props, item }">
            <v-list-item v-bind="props" :disabled="item.raw.disabled">
              <template #title>
                <span>{{ item.raw.title }}</span>
                <v-chip
                  v-if="item.raw.booked"
                  color="error"
                  size="x-small"
                  class="ml-2"
                >
                  Booked
                </v-chip>
                <v-chip
                  v-else-if="item.raw.expired"
                  color="grey"
                  size="x-small"
                  class="ml-2"
                >
                  Expired
                </v-chip>
                <v-chip
                  v-else
                  color="success"
                  size="x-small"
                  class="ml-2"
                >
                  Available
                </v-chip>
              </template>
            </v-list-item>
          </template>
          <template #selection="{ item }">
            <span>{{ item.title }}</span>
            <v-chip
              v-if="item.booked"
              color="error"
              size="x-small"
              class="ml-2"
            >
              Booked
            </v-chip>
            <v-chip
              v-else-if="item.expired"
              color="grey"
              size="x-small"
              class="ml-2"
            >
              Expired
            </v-chip>
          </template>
        </v-select>
        <div v-if="slotsLoading" class="text-caption text-grey mt-1">
          <v-progress-circular indeterminate size="16" class="mr-1"></v-progress-circular>
          Loading available slots...
        </div>
        <div v-else-if="availableSlots.length === 0 && formData.appointment_date" class="text-caption text-error mt-1">
          No time slots available for this date
        </div>
        <div v-else-if="formData.time_slot && !slotsLoading" class="text-caption text-success mt-1">
          Selected: {{ formatTimeSlot(formData.time_slot) }}
        </div>
      </v-col>

      <v-col cols="12" md="6">
        <v-select
          v-model="formData.type"
          :items="typeOptions"
          label="Appointment Type"
          variant="outlined"
          density="comfortable"
          item-title="title"
          item-value="value"
        ></v-select>
      </v-col>

      <v-col cols="12" md="6">
        <v-text-field
          v-model="formData.queue_number"
          label="Queue Number (Auto-generated)"
          variant="outlined"
          density="comfortable"
          disabled
        ></v-text-field>
      </v-col>

      <v-col cols="12">
        <v-textarea
          v-model="formData.notes"
          label="Notes"
          rows="2"
          variant="outlined"
          density="comfortable"
          hint="Any special instructions or notes for this appointment"
        ></v-textarea>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" class="text-right">
        <v-btn color="error" @click="cancel" variant="outlined">Cancel</v-btn>
        <v-btn 
          color="primary" 
          @click="submit" 
          :loading="submitting" 
          :disabled="!valid || !formData.time_slot" 
          class="ml-2"
        >
          <v-icon start>{{ isEdit ? 'mdi-pencil' : 'mdi-plus' }}</v-icon>
          {{ isEdit ? 'Update Appointment' : 'Create Appointment' }}
        </v-btn>
      </v-col>
    </v-row>

    <!-- Snackbar for notifications -->
    <v-snackbar v-model="localSnackbar.show" :color="localSnackbar.color" timeout="3000">
      {{ localSnackbar.message }}
    </v-snackbar>
  </v-form>
</template>

<script>
import { ref, reactive, computed, watch, onMounted, nextTick } from 'vue'
import patientService from '@/services/patientService'
import appointmentService from '@/services/appointmentService'
import transactionTypeService from '@/services/transactionTypeService'
import { useAuthStore } from '@/stores/authStore'

export default {
  name: 'AppointmentForm',
  props: {
    patientId: {
      type: Number,
      default: null
    },
    appointment: {
      type: Object,
      default: null
    },
    office: {
      type: String,
      default: null
    },
    mode: {
      type: String,
      default: 'create',
      validator: (value) => ['create', 'edit'].includes(value)
    }
  },
  emits: ['success', 'cancel'],
  setup(props, { emit }) {
    const authStore = useAuthStore()
    const form = ref(null)
    const valid = ref(false)
    const submitting = ref(false)
    const searchLoading = ref(false)
    const dateMenu = ref(false)
    const slotsLoading = ref(false)
    const bookedSlots = ref([])
    const patientOptions = ref([])
    const patientSearch = ref('')
    const selectedDate = ref('')
    const isInitialized = ref(false)
    const transactionTypes = ref([])

    // Local snackbar for form-level notifications
    const localSnackbar = ref({
      show: false,
      message: '',
      color: 'success'
    })

    const isEdit = computed(() => props.mode === 'edit' && !!props.appointment?.id)
    const isStaff = computed(() => authStore.userRole === 'staff')

    // Helper function for local date handling
    const getTodayDate = () => {
      const today = new Date()
      const year = today.getFullYear()
      const month = String(today.getMonth() + 1).padStart(2, '0')
      const day = String(today.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    const minDate = computed(() => getTodayDate())
    
    const maxDate = computed(() => {
      const now = new Date()
      now.setDate(now.getDate() + 30) // 30 days advance booking
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    })

    // Selected transaction type for display
    const selectedTransactionType = computed(() => {
      return transactionTypes.value.find(t => t.id === formData.transaction_type_id)
    })

    const formData = reactive({
      patient_id: null,
      transaction_type_id: null,
      // office is now derived from transaction type, not directly selected
      office: props.office || authStore.userOffice || 'testing',
      appointment_date: '',
      time_slot: '',
      type: 'scheduled',
      queue_number: '',
      notes: ''
    })

    // Display date
    const displayDate = computed({
      get: () => {
        if (!selectedDate.value) return ''
        try {
          const date = new Date(selectedDate.value + 'T00:00:00')
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
        return selectedDate.value
      },
      set: (value) => {
        // Just for display, we don't need to set it
      }
    })

    const typeOptions = [
      { title: 'Scheduled', value: 'scheduled' },
      { title: 'Walk-in', value: 'walk-in' }
    ]

    const timeSlots = [
      '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
      '11:00', '11:30', '13:00', '13:30', '14:00', '14:30',
      '15:00', '15:30', '16:00'
    ]

    // Check if a time slot is expired (past for today)
    const isTimeSlotExpired = (timeSlot, date) => {
      if (!date) return false
      
      const today = getTodayDate()
      if (date !== today) return false
      
      const now = new Date()
      const [hours, minutes] = timeSlot.split(':').map(Number)
      const slotTime = new Date()
      slotTime.setHours(hours, minutes, 0, 0)
      
      const bufferMinutes = 30
      slotTime.setMinutes(slotTime.getMinutes() + bufferMinutes)
      
      return now > slotTime
    }

    const availableSlots = computed(() => {
      if (!selectedDate.value) return []
      
      return timeSlots.map(slot => {
        const expired = isTimeSlotExpired(slot, selectedDate.value)
        const booked = bookedSlots.value.includes(slot)
        return {
          title: formatTimeSlot(slot),
          value: slot,
          booked: booked,
          expired: expired,
          disabled: booked || expired
        }
      })
    })

    // Load transaction types
    const loadTransactionTypes = async () => {
      try {
        console.log('Loading transaction types...')
        const response = await transactionTypeService.getTransactionTypes()
        transactionTypes.value = response.data || response || []
        console.log('Transaction types loaded:', transactionTypes.value)
      } catch (error) {
        console.error('Failed to load transaction types:', error)
        // Fallback data for testing/demo
        transactionTypes.value = [
          { 
            id: 1, 
            name: 'General Checkup', 
            office: 'testing', 
            estimated_duration_minutes: 30,
            description: 'General medical consultation'
          },
          { 
            id: 2, 
            name: 'Dental Cleaning', 
            office: 'treatment', 
            estimated_duration_minutes: 45,
            description: 'Professional teeth cleaning'
          },
          { 
            id: 3, 
            name: 'X-Ray', 
            office: 'testing', 
            estimated_duration_minutes: 20,
            description: 'Diagnostic imaging'
          },
          { 
            id: 4, 
            name: 'Surgery Consultation', 
            office: 'treatment', 
            estimated_duration_minutes: 60,
            description: 'Pre-surgery consultation'
          },
          { 
            id: 5, 
            name: 'Laboratory Test', 
            office: 'testing', 
            estimated_duration_minutes: 15,
            description: 'Blood work and lab tests'
          }
        ]
      }
    }

    // Watch patient search
    watch(patientSearch, async (search) => {
      if (!search || search.length < 2) {
        patientOptions.value = []
        return
      }
      
      searchLoading.value = true
      try {
        const response = await patientService.searchPatients(search)
        patientOptions.value = response.map(p => ({
          id: p.id,
          label: `${p.first_name} ${p.last_name} - ${p.contact_number} (${p.status})`,
          patient: p
        }))
      } catch (error) {
        console.error('Search failed:', error)
        showSnackbar('Failed to search patients', 'error')
      } finally {
        searchLoading.value = false
      }
    })

    // Handle transaction type change
    const onTransactionTypeChange = async () => {
      // Reset date and time slot when transaction type changes
      formData.appointment_date = ''
      formData.time_slot = ''
      selectedDate.value = ''
      bookedSlots.value = []
      
      if (formData.transaction_type_id) {
        const selected = selectedTransactionType.value
        if (selected) {
          // Set the office based on the selected transaction type
          formData.office = selected.office
          console.log(`Transaction type selected: ${selected.name}, Office: ${selected.office}`)
          
          // Generate new queue number
          formData.queue_number = generateQueueNumber()
        }
      }
    }

    const loadAvailableSlots = async () => {
      if (!selectedDate.value || !formData.office) {
        bookedSlots.value = []
        formData.time_slot = ''
        return
      }

      slotsLoading.value = true
      const currentTimeSlot = formData.time_slot
      
      try {
        console.log(`Loading available slots for ${selectedDate.value} in ${formData.office}`)
        const appointments = await appointmentService.getAppointmentsByDate(
          selectedDate.value,
          formData.office
        )
        
        bookedSlots.value = appointments
          .filter(a => a.status !== 'cancelled' && a.status !== 'no-show')
          .map(a => a.time_slot)
        
        // If editing, remove current appointment from booked slots
        if (isEdit.value && props.appointment) {
          const index = bookedSlots.value.indexOf(props.appointment.time_slot)
          if (index > -1) {
            bookedSlots.value.splice(index, 1)
          }
        }
        
        // Try to restore the current time slot if it's still available
        if (currentTimeSlot && !bookedSlots.value.includes(currentTimeSlot) && !isTimeSlotExpired(currentTimeSlot, selectedDate.value)) {
          formData.time_slot = currentTimeSlot
        } else if (isEdit.value && props.appointment?.time_slot) {
          const originalSlot = props.appointment.time_slot
          if (!bookedSlots.value.includes(originalSlot) && !isTimeSlotExpired(originalSlot, selectedDate.value)) {
            formData.time_slot = originalSlot
          }
        }
      } catch (error) {
        console.error('Failed to load slots:', error)
        bookedSlots.value = []
        showSnackbar('Failed to load available time slots', 'error')
      } finally {
        slotsLoading.value = false
      }
    }

    const onDateSelected = async (value) => {
      dateMenu.value = false
      if (value) {
        selectedDate.value = value
        formData.appointment_date = value
        await nextTick()
        await loadAvailableSlots()
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

    const generateQueueNumber = () => {
      const prefix = formData.office === 'testing' ? 'T' : 'R'
      const date = getTodayDate()
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
      return `${prefix}-${date.replace(/-/g, '')}-${random}`
    }

    // Allowed dates function for date picker
    const allowedDates = (date) => {
      const dateStr = date.toISOString().split('T')[0]
      // You can add logic here to check if date is a working day/holiday
      // For now, allow all dates from today onwards
      return dateStr >= getTodayDate()
    }

    const submit = async () => {
      if (!form.value.validate()) return
      
      const selectedSlot = availableSlots.value.find(s => s.value === formData.time_slot)
      if (selectedSlot && (selectedSlot.booked || selectedSlot.expired)) {
        showSnackbar('Selected time slot is not available', 'error')
        return
      }

      // Get patient ID - since we're using return-object, we need to handle it properly
      let patientId
      if (formData.patient_id && typeof formData.patient_id === 'object') {
        patientId = formData.patient_id.id
      } else {
        patientId = Number(formData.patient_id)
      }

      if (!patientId || isNaN(patientId)) {
        showSnackbar('Please select a valid patient', 'error')
        return
      }

      if (!formData.transaction_type_id) {
        showSnackbar('Please select a transaction type', 'error')
        return
      }

      submitting.value = true
      try {
        const data = {
          patient_id: patientId,
          transaction_type_id: formData.transaction_type_id,
          // Office is derived from transaction type on the backend
          office: formData.office,
          appointment_date: selectedDate.value,
          time_slot: formData.time_slot,
          type: formData.type,
          notes: formData.notes
        }

        console.log('Submitting appointment data:', data)

        let result
        if (isEdit.value) {
          const hasDateChanged = props.appointment?.appointment_date !== selectedDate.value
          const hasTimeChanged = props.appointment?.time_slot !== formData.time_slot
          
          if (hasDateChanged || hasTimeChanged) {
            result = await appointmentService.rescheduleAppointment(
              props.appointment.id,
              selectedDate.value,
              formData.time_slot
            )
          } else {
            result = await appointmentService.updateAppointment(
              props.appointment.id,
              data
            )
          }
        } else {
          result = await appointmentService.createAppointment(data)
        }

        showSnackbar(
          isEdit.value ? 'Appointment updated successfully!' : 'Appointment created successfully!',
          'success'
        )
        
        setTimeout(() => {
          emit('success', result)
        }, 1000)
        
      } catch (error) {
        console.error('Failed to save appointment:', error)
        const errorMessage = error.response?.data?.error || error.message || 'Failed to save appointment'
        showSnackbar(errorMessage, 'error')
      } finally {
        submitting.value = false
      }
    }

    const cancel = () => {
      emit('cancel')
    }

    const showSnackbar = (message, color = 'success') => {
      localSnackbar.value = { show: true, message, color }
    }

    // Initialize form
    const initializeForm = async () => {
      // Load transaction types first
      await loadTransactionTypes()
      
      const today = getTodayDate()
      
      // Set default date
      selectedDate.value = today
      formData.appointment_date = today
      
      // Handle edit mode
      if (isEdit.value && props.appointment) {
        try {
          console.log('Loading appointment data for edit:', props.appointment)
          
          // Set transaction type from appointment
          if (props.appointment.transaction_type_id) {
            formData.transaction_type_id = props.appointment.transaction_type_id
          }
          
          // Set office from appointment or transaction type
          if (props.appointment.office) {
            formData.office = props.appointment.office
          } else if (selectedTransactionType.value) {
            formData.office = selectedTransactionType.value.office
          }
          
          // Set date if available
          if (props.appointment.appointment_date) {
            selectedDate.value = props.appointment.appointment_date
            formData.appointment_date = props.appointment.appointment_date
          }
          
          formData.time_slot = props.appointment.time_slot || ''
          formData.type = props.appointment.type || 'scheduled'
          formData.notes = props.appointment.notes || ''
          formData.queue_number = props.appointment.queue_number || generateQueueNumber()

          // Load patient data
          let patientData = props.appointment.Patient
          
          // If Patient is not included in the appointment object, fetch it
          if (!patientData && props.appointment.patient_id) {
            try {
              console.log('Fetching patient data for ID:', props.appointment.patient_id)
              patientData = await patientService.getPatient(props.appointment.patient_id)
            } catch (error) {
              console.error('Failed to load patient:', error)
            }
          }
          
          if (patientData) {
            console.log('Patient data loaded:', patientData)
            const patientOption = {
              id: patientData.id,
              label: `${patientData.first_name} ${patientData.last_name} - ${patientData.contact_number} (${patientData.status})`,
              patient: patientData
            }
            // Set the patient option in the list
            patientOptions.value = [patientOption]
            // Set the patient_id to the full object so it displays correctly
            formData.patient_id = patientOption
          } else {
            console.warn('No patient data available for appointment')
          }
          
          // Mark as initialized
          isInitialized.value = true
          
          // Load available slots after a short delay
          await nextTick()
          setTimeout(() => {
            loadAvailableSlots()
          }, 500)
          
        } catch (error) {
          console.error('Failed to load appointment data:', error)
          showSnackbar('Failed to load appointment data', 'error')
        }
      } else {
        // New appointment
        formData.queue_number = generateQueueNumber()
        
        if (props.patientId) {
          try {
            const patient = await patientService.getPatient(props.patientId)
            if (patient) {
              const patientOption = {
                id: patient.id,
                label: `${patient.first_name} ${patient.last_name} - ${patient.contact_number} (${patient.status})`,
                patient: patient
              }
              formData.patient_id = patientOption
              patientOptions.value = [patientOption]
            }
          } catch (error) {
            console.error('Failed to load patient:', error)
          }
        }
        
        // Mark as initialized
        isInitialized.value = true
        
        // Load available slots after a short delay
        await nextTick()
        setTimeout(() => {
          loadAvailableSlots()
        }, 300)
      }
    }

    // Watch for transaction type changes after initialization
    watch(() => formData.transaction_type_id, async (newVal, oldVal) => {
      if (newVal && newVal !== oldVal && isInitialized.value) {
        await onTransactionTypeChange()
      }
    })

    // Watch for office changes (derived from transaction type)
    watch(() => formData.office, async (newVal, oldVal) => {
      if (newVal && newVal !== oldVal && isInitialized.value) {
        formData.queue_number = generateQueueNumber()
        if (selectedDate.value) {
          await loadAvailableSlots()
        }
      }
    })

    // Watch for patient selection changes
    watch(() => formData.patient_id, (newVal) => {
      console.log('Patient selected:', newVal)
    })

    // Initialize on mount
    onMounted(() => {
      initializeForm()
    })

    return {
      form,
      valid,
      submitting,
      searchLoading,
      dateMenu,
      slotsLoading,
      isEdit,
      isStaff,
      minDate,
      maxDate,
      formData,
      selectedDate,
      displayDate,
      patientSearch,
      patientOptions,
      transactionTypes,
      selectedTransactionType,
      typeOptions,
      availableSlots,
      localSnackbar,
      allowedDates,
      onTransactionTypeChange,
      onDateSelected,
      formatTimeSlot,
      submit,
      cancel,
      showSnackbar
    }
  }
}
</script>

<style scoped>
.v-list-item--disabled {
  opacity: 0.5;
  pointer-events: none;
}

.v-date-picker {
  width: 100%;
}
</style>