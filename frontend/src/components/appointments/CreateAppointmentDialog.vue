<!-- frontend/src/components/appointments/CreateAppointmentDialog.vue -->
<template>
  <v-dialog :model-value="modelValue" max-width="600" persistent @update:model-value="$emit('update:modelValue', $event)">
    <v-card>
      <v-card-title class="text-h5 pa-4">Schedule New Appointment</v-card-title>
      <v-card-text>
        <v-form ref="form" @submit.prevent="handleSubmit">
          <v-row>
            <v-col cols="12" md="6">
              <v-autocomplete
                v-model="localFormData.patient_id"
                :items="patientItems"
                label="Patient *"
                variant="outlined"
                :rules="[v => !!v || 'Patient is required']"
                item-title="full_name"
                item-value="patient_id"
                :loading="loading"
                no-data-text="No patients found"
                clearable
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="localFormData.appointment_type_id"
                :items="appointmentTypeItems"
                label="Appointment Type *"
                variant="outlined"
                :rules="[v => !!v || 'Appointment type is required']"
                item-title="type_name"
                item-value="id"
                :loading="loading"
                no-data-text="No appointment types found"
                clearable
                @update:model-value="handleTypeChange"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="localFormData.scheduled_date"
                label="Date *"
                type="date"
                variant="outlined"
                :rules="[v => !!v || 'Date is required']"
                :min="minDate"
                @update:model-value="handleDateChange"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="localFormData.scheduled_time"
                label="Time *"
                :items="availableTimeSlots"
                variant="outlined"
                :rules="[v => !!v || 'Time is required']"
                :disabled="!canSelectTime"
                :loading="checkingAvailability"
                no-data-text="No available time slots"
              />
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="localFormData.notes"
                label="Notes (Optional)"
                variant="outlined"
                rows="3"
                placeholder="Additional notes about the appointment..."
              />
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="handleClose">Cancel</v-btn>
        <v-btn 
          color="primary" 
          @click="handleSubmit" 
          :loading="creating"
          :disabled="!isFormValid"
        >
          Schedule Appointment
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'

const props = defineProps({
  modelValue: Boolean,
  patients: {
    type: [Array, Object],
    default: () => ({ data: { patients: [] } })
  },
  appointmentTypes: {
    type: [Array, Object],
    default: () => ({ data: [] })
  },
  timeSlots: {
    type: Array,
    default: () => []
  },
  loading: Boolean,
  creating: Boolean,
  checkingAvailability: Boolean,
  availableTimeSlots: {
    type: Array,
    default: () => []
  },
  minDate: String,
  formData: {
    type: Object,
    default: () => ({
      patient_id: null,
      appointment_type_id: null,
      scheduled_date: '',
      scheduled_time: '',
      notes: ''
    })
  }
})

const emit = defineEmits([
  'update:modelValue',
  'create',
  'check-availability',
  'close',
  'update:formData'
])

// Local form data
const localFormData = ref({ ...props.formData })
let checkAvailabilityTimeout = null

// Helper function to validate date format
const isValidDateFormat = (date) => {
  if (!date) return false
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  return dateRegex.test(date)
}

// Debounced check availability
const debouncedCheckAvailability = () => {
  if (checkAvailabilityTimeout) {
    clearTimeout(checkAvailabilityTimeout)
  }
  
  checkAvailabilityTimeout = setTimeout(() => {
    if (localFormData.value.scheduled_date && 
        localFormData.value.appointment_type_id &&
        isValidDateFormat(localFormData.value.scheduled_date)) {
      console.log('Emitting check-availability with:', {
        date: localFormData.value.scheduled_date,
        type_id: localFormData.value.appointment_type_id
      })
      emit('check-availability')
    }
  }, 500)
}

// Cleanup timeout on unmount
onUnmounted(() => {
  if (checkAvailabilityTimeout) {
    clearTimeout(checkAvailabilityTimeout)
  }
})

// Watch for prop changes
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    localFormData.value = { ...props.formData }
  }
}, { immediate: true })

// Watch local changes and emit to parent
watch(localFormData, (newVal) => {
  emit('update:formData', newVal)
}, { deep: true })

// Watch for date changes
watch(() => localFormData.value.scheduled_date, (newDate) => {
  if (newDate && localFormData.value.appointment_type_id && isValidDateFormat(newDate)) {
    debouncedCheckAvailability()
  }
})

// Watch for type changes
watch(() => localFormData.value.appointment_type_id, (newTypeId) => {
  if (newTypeId && localFormData.value.scheduled_date && 
      isValidDateFormat(localFormData.value.scheduled_date)) {
    debouncedCheckAvailability()
  }
})

// Computed properties
const patientItems = computed(() => {
  if (!props.patients) return []
  
  const patientsArray = props.patients.patients || 
                       props.patients.data?.patients || 
                       (Array.isArray(props.patients) ? props.patients : [])
  
  return patientsArray.map(p => ({
    ...p,
    full_name: p.full_name || 
               (p.first_name && p.last_name ? `${p.last_name}, ${p.first_name}` :
                p.first_name || p.last_name || `Patient ${p.patient_id || p.id}`),
    patient_id: p.patient_id || p.id
  })).filter(p => p.patient_id)
})

const appointmentTypeItems = computed(() => {
  if (!props.appointmentTypes) return []
  
  const types = props.appointmentTypes.data || 
                (Array.isArray(props.appointmentTypes) ? props.appointmentTypes : [])
  
  return types.map(t => ({
    ...t,
    type_name: t.type_name || t.name || 'Unknown',
    id: t.id
  }))
})

const canSelectTime = computed(() => {
  return !!(localFormData.value.scheduled_date && 
           localFormData.value.appointment_type_id &&
           isValidDateFormat(localFormData.value.scheduled_date))
})

const isFormValid = computed(() => {
  return !!(localFormData.value.patient_id &&
         localFormData.value.appointment_type_id &&
         localFormData.value.scheduled_date &&
         localFormData.value.scheduled_time &&
         isValidDateFormat(localFormData.value.scheduled_date))
})

// Methods
const handleDateChange = (value) => {
  console.log('Date changed to:', value)
}

const handleTypeChange = (value) => {
  console.log('Type changed to:', value)
}

const handleSubmit = () => {
  if (isFormValid.value) {
    emit('create')
  }
}

const handleClose = () => {
  if (checkAvailabilityTimeout) {
    clearTimeout(checkAvailabilityTimeout)
  }
  emit('close')
}
</script>