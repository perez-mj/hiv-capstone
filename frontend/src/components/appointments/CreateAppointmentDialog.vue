<!-- frontend/src/components/appointments/CreateAppointmentDialog.vue -->
<template>
  <v-dialog 
    :model-value="modelValue" 
    max-width="600" 
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="text-h5 pa-4">Schedule New Appointment</v-card-title>
      
      <v-card-text>
        <v-form ref="form" @submit.prevent="handleSubmit">
          <v-row>
            <!-- Patient Selection -->
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

            <!-- Appointment Type -->
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
              />
            </v-col>

            <!-- Date -->
            <v-col cols="12" md="6">
              <v-text-field
                v-model="localFormData.scheduled_date"
                label="Date *"
                type="date"
                variant="outlined"
                :rules="[v => !!v || 'Date is required']"
                :min="minDate"
              />
            </v-col>

            <!-- Time -->
            <v-col cols="12" md="6">
              <v-select
                v-model="localFormData.scheduled_time"
                label="Time *"
                :items="formattedTimeSlots"
                variant="outlined"
                :rules="[v => !!v || 'Time is required']"
                :disabled="!canSelectTime"
                :loading="checkingAvailability"
                no-data-text="No available time slots"
              />
            </v-col>

            <!-- Notes -->
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
  patients: { type: [Array, Object], default: () => ({ data: { patients: [] } }) },
  appointmentTypes: { type: [Array, Object], default: () => ({ data: [] }) },
  timeSlots: { type: Array, default: () => [] },
  loading: Boolean,
  creating: Boolean,
  checkingAvailability: Boolean,
  availableTimeSlots: { type: Array, default: () => [] },
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

const emit = defineEmits(['update:modelValue', 'create', 'check-availability', 'close', 'update:formData'])

// Local state
const localFormData = ref({ ...props.formData })
let availabilityTimeout = null

// Computed
const patientItems = computed(() => {
  const patients = props.patients?.data?.patients || 
                  (Array.isArray(props.patients) ? props.patients : [])
  
  return patients
    .filter(p => p?.patient_id || p?.id)
    .map(p => ({
      ...p,
      full_name: p.full_name || 
                (p.first_name && p.last_name ? `${p.last_name}, ${p.first_name}` :
                 p.first_name || p.last_name || `Patient ${p.patient_id || p.id}`),
      patient_id: p.patient_id || p.id
    }))
})

const appointmentTypeItems = computed(() => {
  const types = props.appointmentTypes?.data || 
               (Array.isArray(props.appointmentTypes) ? props.appointmentTypes : [])
  
  return types.map(t => ({
    ...t,
    type_name: t.type_name || t.name || 'Unknown',
    id: t.id
  }))
})

// Format time slots for display (add AM/PM)
const formattedTimeSlots = computed(() => {
  return (props.availableTimeSlots || []).map(time => {
    const [hours, minutes] = time.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    const displayTime = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
    
    return {
      value: time, // Keep original 24h format for the model
      title: displayTime
    }
  })
})

const canSelectTime = computed(() => {
  return !!(localFormData.value.scheduled_date && localFormData.value.appointment_type_id)
})

const isFormValid = computed(() => {
  return !!(localFormData.value.patient_id &&
           localFormData.value.appointment_type_id &&
           localFormData.value.scheduled_date &&
           localFormData.value.scheduled_time)
})

// Watch for changes
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    localFormData.value = { ...props.formData }
  }
})

watch(localFormData, (newVal) => {
  emit('update:formData', newVal)
}, { deep: true })

watch([() => localFormData.value.scheduled_date, () => localFormData.value.appointment_type_id], 
  ([newDate, newType]) => {
    if (availabilityTimeout) clearTimeout(availabilityTimeout)
    
    if (newDate && newType) {
      availabilityTimeout = setTimeout(() => {
        emit('check-availability')
      }, 500)
    }
})

// Cleanup
onUnmounted(() => {
  if (availabilityTimeout) clearTimeout(availabilityTimeout)
})

// Methods
const handleSubmit = () => {
  if (isFormValid.value) {
    emit('create')
  }
}

const handleClose = () => {
  if (availabilityTimeout) clearTimeout(availabilityTimeout)
  emit('close')
}
</script>

<style scoped>
/* Dark Forest Palette:
   Primary: #1A4D3A (Dark Forest)
   Accent: #2E7D32 (Success Green)
   Surface: #F8FAF9 (Soft Green Mist)
*/

/* Dialog Card Customization */
:deep(.v-card) {
  border-radius: 12px !important;
  overflow: hidden;
}

/* Header Styling */
:deep(.v-card-title) {
  background-color: #1A4D3A !important;
  color: #FFFFFF !important;
  font-weight: 600 !important;
  padding: 16px 24px !important;
  letter-spacing: 0.5px;
}

/* Input Fields Focus & Label */
:deep(.v-field--focused) {
  color: #1A4D3A !important;
}

:deep(.v-field__outline) {
  --v-field-border-opacity: 0.15;
}

:deep(.v-label) {
  font-weight: 500;
}

/* Icons within fields */
:deep(.v-field__prepend-inner .v-icon) {
  color: #1A4D3A !important;
}

/* Action Buttons */
:deep(.v-btn.bg-primary) {
  background-color: #1A4D3A !important;
  color: #FFFFFF !important;
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0.3px;
  padding: 0 24px;
}

:deep(.v-btn.bg-primary:hover) {
  background-color: #123528 !important; /* Deeper forest on hover */
}

:deep(.v-btn.text-none) {
  color: #1A4D3A !important;
  font-weight: 500;
}

/* Textarea Customization */
:deep(.v-textarea .v-field__input) {
  background-color: #F8FAF9; /* Subtle green mist background */
}

/* Dropdown/Menu styling (when items are open) */
:deep(.v-list-item--active) {
  background-color: rgba(26, 77, 58, 0.1) !important;
  color: #1A4D3A !important;
}

/* Scrollbar for Textarea */
:deep(textarea::-webkit-scrollbar) {
  width: 6px;
}
:deep(textarea::-webkit-scrollbar-thumb) {
  background: #1A4D3A;
  border-radius: 10px;
}
</style>