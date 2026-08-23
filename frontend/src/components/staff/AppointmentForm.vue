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
              <template #title>
                <span>{{ item.raw.label }}</span>
              </template>
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

      <!-- Transaction Type Selection -->
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
          item-title="name"
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
              :model-value="displayDate"
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
            :model-value="selectedDate"
            @update:model-value="onDateSelected"
            :min="minDate"
            :max="maxDate"
            locale="en-US"
            :allowed-dates="allowedDates"
          ></v-date-picker>
        </v-menu>
        
        <!-- Date availability info -->
        <div v-if="dateAvailabilityInfo" class="mt-1">
          <v-chip
            :color="dateAvailabilityInfo.available ? 'success' : 'error'"
            size="x-small"
            variant="tonal"
          >
            {{ dateAvailabilityInfo.available ? 'Available' : 'Not Available' }}
            <span v-if="dateAvailabilityInfo.available && dateAvailabilityInfo.slotsCount !== undefined">
              - {{ dateAvailabilityInfo.slotsCount }} slots available
            </span>
          </v-chip>
          <span v-if="!dateAvailabilityInfo.available && dateAvailabilityInfo.reason" class="text-caption text-error ml-1">
            {{ dateAvailabilityInfo.reason }}
          </span>
        </div>
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
          item-title="display_title"
          item-value="time"
          item-disabled="disabled"
        >
          <template #item="{ props, item }">
            <v-list-item v-bind="props" :disabled="item.raw.disabled">
              <template #title>
                <span>{{ formatTimeSlot(item.raw.time) }}</span>
                <v-chip
                  v-if="item.raw.isBooked"
                  color="error"
                  size="x-small"
                  class="ml-2"
                >
                  Booked
                </v-chip>
                <v-chip
                  v-else-if="item.raw.isPast"
                  color="grey"
                  size="x-small"
                  class="ml-2"
                >
                  Past
                </v-chip>
                <v-chip
                  v-else-if="item.raw.available"
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
            <span>{{ formatTimeSlot(item.raw.time) }}</span>
            <v-chip
              v-if="item.raw.isBooked"
              color="error"
              size="x-small"
              class="ml-2"
            >
              Booked
            </v-chip>
            <v-chip
              v-else-if="item.raw.isPast"
              color="grey"
              size="x-small"
              class="ml-2"
            >
              Past
            </v-chip>
          </template>
        </v-select>
        
        <!-- Slot loading and status info -->
        <div v-if="slotsLoading" class="text-caption text-grey mt-1">
          <v-progress-circular indeterminate size="16" class="mr-1"></v-progress-circular>
          Loading available slots...
        </div>
        <div v-else-if="availableSlots.length === 0 && formData.appointment_date" class="text-caption text-error mt-1">
          No time slots available for this date
        </div>
        <div v-else-if="availableSlots.filter(s => s.available).length === 0 && availableSlots.length > 0" class="text-caption text-warning mt-1">
          All slots are booked for this date
        </div>
        <div v-else-if="formData.time_slot && !slotsLoading" class="text-caption text-success mt-1">
          Selected: {{ formatTimeSlot(formData.time_slot) }}
        </div>
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
    const patientOptions = ref([])
    const patientSearch = ref('')
    const selectedDate = ref('')
    const isInitialized = ref(false)
    const transactionTypes = ref([])
    const dateAvailabilityInfo = ref(null)
    const slotsData = ref([])

    const localSnackbar = ref({
      show: false,
      message: '',
      color: 'success'
    })

    const isEdit = computed(() => props.mode === 'edit' && !!props.appointment?.id)
    const isStaff = computed(() => authStore.userRole === 'staff')

    // FIXED: Format date to YYYY-MM-DD
    const formatDateToYYYYMMDD = (date) => {
      if (!date) return null
      
      // If it's already a string in YYYY-MM-DD format
      if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date
      }
      
      // If it's a Date object or parsable string
      const d = new Date(date)
      if (isNaN(d.getTime())) {
        return null
      }
      
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

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
      now.setDate(now.getDate() + 30)
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    })

    const selectedTransactionType = computed(() => {
      return transactionTypes.value.find(t => t.id === formData.transaction_type_id)
    })

    const formData = reactive({
      patient_id: null,
      transaction_type_id: null,
      office: props.office || authStore.userOffice || 'testing',
      appointment_date: '',
      time_slot: '',
      type: 'scheduled',
      queue_number: '',
      notes: ''
    })

    const displayDate = computed(() => {
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
    })

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

    const availableSlots = computed(() => {
      if (!slotsData.value || !slotsData.value.length) return []
      
      return slotsData.value.map(slot => ({
        time: slot.time,
        display_title: formatTimeSlot(slot.time),
        available: slot.available || false,
        isBooked: slot.isBooked || false,
        isPast: slot.isPast || false,
        disabled: !slot.available
      }))
    })

    const loadTransactionTypes = async () => {
      try {
        console.log('Loading transaction types...')
        const response = await transactionTypeService.getTransactionTypes()
        if (response && response.data) {
          transactionTypes.value = response.data
        } else if (Array.isArray(response)) {
          transactionTypes.value = response
        } else {
          transactionTypes.value = []
        }
        console.log('Transaction types loaded:', transactionTypes.value)
      } catch (error) {
        console.error('Failed to load transaction types:', error)
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

    watch(patientSearch, async (search) => {
      if (!search || search.length < 2) {
        patientOptions.value = []
        return
      }
      
      searchLoading.value = true
      try {
        const response = await patientService.searchPatients(search)
        if (Array.isArray(response)) {
          patientOptions.value = response.map(p => ({
            id: p.id,
            label: `${p.first_name} ${p.last_name} - ${p.contact_number} (${p.status})`,
            patient: p
          }))
        } else if (response && response.data && Array.isArray(response.data)) {
          patientOptions.value = response.data.map(p => ({
            id: p.id,
            label: `${p.first_name} ${p.last_name} - ${p.contact_number} (${p.status})`,
            patient: p
          }))
        }
      } catch (error) {
        console.error('Search failed:', error)
        showSnackbar('Failed to search patients', 'error')
      } finally {
        searchLoading.value = false
      }
    })

    const onTransactionTypeChange = async () => {
      formData.appointment_date = ''
      formData.time_slot = ''
      selectedDate.value = ''
      slotsData.value = []
      dateAvailabilityInfo.value = null
      
      if (formData.transaction_type_id) {
        const selected = selectedTransactionType.value
        if (selected) {
          formData.office = selected.office
          console.log(`Transaction type selected: ${selected.name}, Office: ${selected.office}`)
        }
      }
    }

    // FIXED: loadAvailableSlots with proper date format
    const loadAvailableSlots = async () => {
      if (!selectedDate.value || !formData.office) {
        slotsData.value = []
        formData.time_slot = ''
        dateAvailabilityInfo.value = null
        return
      }

      slotsLoading.value = true
      
      try {
        // Ensure date is in YYYY-MM-DD format
        const dateStr = formatDateToYYYYMMDD(selectedDate.value)
        if (!dateStr) {
          console.error('Invalid date format:', selectedDate.value)
          slotsData.value = []
          dateAvailabilityInfo.value = {
            available: false,
            slotsCount: 0,
            totalSlots: 0,
            reason: 'Invalid date format'
          }
          slotsLoading.value = false
          return
        }
        
        console.log(`Loading available slots for ${dateStr} in ${formData.office}`)
        const result = await appointmentService.getAvailableSlots(
          dateStr,
          formData.office,
          null
        )
        
        console.log('Available slots result:', result)
        
        if (result && result.slots) {
          slotsData.value = result.slots
          
          dateAvailabilityInfo.value = {
            available: result.available || false,
            slotsCount: result.count || 0,
            totalSlots: result.allSlots ? result.allSlots.length : result.slots.length,
            reason: result.message || null
          }
          
          if (isEdit.value && props.appointment?.time_slot) {
            const slotExists = slotsData.value.some(s => s.time === props.appointment.time_slot && s.available)
            if (slotExists) {
              formData.time_slot = props.appointment.time_slot
            } else {
              formData.time_slot = ''
              const availableSlot = slotsData.value.find(s => s.available)
              if (availableSlot) {
                formData.time_slot = availableSlot.time
              }
            }
          } else {
            const availableSlot = slotsData.value.find(s => s.available)
            formData.time_slot = availableSlot ? availableSlot.time : ''
          }
        } else {
          slotsData.value = []
          dateAvailabilityInfo.value = {
            available: false,
            slotsCount: 0,
            totalSlots: 0,
            reason: result?.message || 'No slots available'
          }
          formData.time_slot = ''
        }
      } catch (error) {
        console.error('Failed to load slots:', error)
        slotsData.value = []
        dateAvailabilityInfo.value = {
          available: false,
          slotsCount: 0,
          totalSlots: 0,
          reason: 'Failed to load available slots'
        }
        showSnackbar('Failed to load available time slots', 'error')
      } finally {
        slotsLoading.value = false
      }
    }

    // FIXED: onDateSelected with proper date formatting
    const onDateSelected = async (value) => {
      console.log('Date selected (raw):', value)
      dateMenu.value = false
      if (value) {
        // Ensure date is in YYYY-MM-DD format
        const formattedDate = formatDateToYYYYMMDD(value)
        if (formattedDate) {
          selectedDate.value = formattedDate
          formData.appointment_date = formattedDate
          console.log('Date formatted to:', formattedDate)
          await nextTick()
          await loadAvailableSlots()
        } else {
          console.error('Invalid date selected:', value)
          showSnackbar('Invalid date selected', 'error')
        }
      }
    }

    const allowedDates = (date) => {
      const dateStr = date.toISOString().split('T')[0]
      return dateStr >= getTodayDate()
    }

    const submit = async () => {
      if (!form.value.validate()) return
      
      const selectedSlot = slotsData.value.find(s => s.time === formData.time_slot)
      if (selectedSlot && !selectedSlot.available) {
        showSnackbar('Selected time slot is not available', 'error')
        return
      }

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

      // Ensure date is in correct format
      const appointmentDate = formatDateToYYYYMMDD(selectedDate.value)
      if (!appointmentDate) {
        showSnackbar('Invalid appointment date', 'error')
        return
      }

      submitting.value = true
      try {
        const data = {
          patient_id: patientId,
          transaction_type_id: formData.transaction_type_id,
          office: formData.office,
          appointment_date: appointmentDate,
          time_slot: formData.time_slot,
          notes: formData.notes
        }

        console.log('Submitting appointment data:', data)

        let result
        if (isEdit.value) {
          const hasDateChanged = props.appointment?.appointment_date !== appointmentDate
          const hasTimeChanged = props.appointment?.time_slot !== formData.time_slot
          
          if (hasDateChanged || hasTimeChanged) {
            result = await appointmentService.rescheduleAppointment(
              props.appointment.id,
              appointmentDate,
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

    // FIXED: Initialize form
    const initializeForm = async () => {
      await loadTransactionTypes()
      
      const today = getTodayDate()
      
      if (!isEdit.value) {
        selectedDate.value = today
        formData.appointment_date = today
        
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
        
        isInitialized.value = true
        await nextTick()
        setTimeout(async () => {
          await loadAvailableSlots()
        }, 300)
        return
      }

      // Edit mode
      if (isEdit.value && props.appointment) {
        try {
          console.log('Loading appointment data for edit:', props.appointment)
          
          if (props.appointment.transaction_type_id) {
            formData.transaction_type_id = props.appointment.transaction_type_id
          }
          
          if (props.appointment.office) {
            formData.office = props.appointment.office
          } else if (selectedTransactionType.value) {
            formData.office = selectedTransactionType.value.office
          }
          
          // FIXED: Format date properly
          if (props.appointment.appointment_date) {
            const formattedDate = formatDateToYYYYMMDD(props.appointment.appointment_date)
            if (formattedDate) {
              selectedDate.value = formattedDate
              formData.appointment_date = formattedDate
              console.log('Date set to:', formattedDate)
            } else {
              console.warn('Could not format date:', props.appointment.appointment_date)
              selectedDate.value = today
              formData.appointment_date = today
            }
          }
          
          formData.time_slot = props.appointment.time_slot || ''
          formData.notes = props.appointment.notes || ''

          let patientData = props.appointment.Patient
          
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
            patientOptions.value = [patientOption]
            formData.patient_id = patientOption
          }
          
          isInitialized.value = true
          
          await nextTick()
          setTimeout(async () => {
            await loadAvailableSlots()
          }, 500)
          
        } catch (error) {
          console.error('Failed to load appointment data:', error)
          showSnackbar('Failed to load appointment data', 'error')
        }
      }
    }

    watch(() => formData.transaction_type_id, async (newVal, oldVal) => {
      if (newVal && newVal !== oldVal && isInitialized.value) {
        await onTransactionTypeChange()
      }
    })

    watch(() => formData.office, async (newVal, oldVal) => {
      if (newVal && newVal !== oldVal && isInitialized.value) {
        if (selectedDate.value) {
          await loadAvailableSlots()
        }
      }
    })

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
      availableSlots,
      slotsData,
      dateAvailabilityInfo,
      localSnackbar,
      allowedDates,
      formatTimeSlot,
      onTransactionTypeChange,
      onDateSelected,
      submit,
      cancel,
      showSnackbar,
      formatDateToYYYYMMDD
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