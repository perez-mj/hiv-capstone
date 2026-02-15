<!-- frontend/src/components/PatientDialog.vue -->
<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="600">
    <v-card>
      <v-card-title class="d-flex justify-space-between align-center">
        <span class="text-h5">{{ mode === 'create' ? 'New Patient Enrollment' : mode === 'edit' ? 'Edit Patient' : 'Patient Details' }}</span>
        <v-btn icon @click="closeDialog">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      
      <v-card-text>
        <v-form ref="form" @submit.prevent="savePatient">
          <v-row>
            <!-- Patient ID Field -->
            <v-col cols="12" md="6">
              <v-text-field
                :model-value="formData.patient_id"
                @update:model-value="formData.patient_id = $event"
                label="Patient ID"
                :readonly="mode === 'view' || mode === 'edit'"
                variant="outlined"
                density="comfortable"
                :rules="mode === 'create' ? [] : [v => !!v || 'Patient ID is required']"
                :placeholder="mode === 'create' ? 'Leave blank to auto-generate' : ''"
                :hint="mode === 'create' ? 'Auto-generated if left blank' : ''"
                persistent-hint
              />
            </v-col>
            
            <!-- Name Field -->
            <v-col cols="12" md="6">
              <v-text-field
                :model-value="formData.name"
                @update:model-value="formData.name = $event"
                label="Full Name"
                :readonly="mode === 'view'"
                variant="outlined"
                density="comfortable"
                :rules="[v => !!v || 'Name is required']"
                required
              />
            </v-col>
            
            <!-- Date of Birth -->
            <v-col cols="12" md="6">
              <v-text-field
                :model-value="formData.date_of_birth"
                @update:model-value="formData.date_of_birth = $event"
                label="Date of Birth"
                type="date"
                :readonly="mode === 'view'"
                variant="outlined"
                density="comfortable"
                :rules="[v => !!v || 'Date of Birth is required']"
                required
              />
            </v-col>
            
            <!-- Contact Info -->
            <v-col cols="12" md="6">
              <v-text-field
                :model-value="formData.contact_info"
                @update:model-value="formData.contact_info = $event"
                label="Contact Information"
                :readonly="mode === 'view'"
                variant="outlined"
                density="comfortable"
                placeholder="Phone number or email"
              />
            </v-col>
            
            <!-- HIV Status -->
            <v-col cols="12" md="6">
              <v-select
                :model-value="formData.hiv_status"
                @update:model-value="formData.hiv_status = $event"
                label="HIV Status"
                :readonly="mode === 'view'"
                variant="outlined"
                density="comfortable"
                :items="['Reactive', 'Non-Reactive']"
                :rules="[v => !!v || 'HIV Status is required']"
                required
              />
            </v-col>
            
            <!-- Consent Checkbox -->
            <v-col cols="12" md="6">
              <v-checkbox
                :model-value="formData.consent"
                @update:model-value="formData.consent = $event"
                label="Patient has given consent"
                :readonly="mode === 'view'"
                color="primary"
                hide-details
              />
            </v-col>
          </v-row>
          
          <!-- Preview of generated ID -->
          <v-alert
            v-if="mode === 'create' && !formData.patient_id && formData.name && formData.hiv_status"
            type="info"
            variant="tonal"
            class="mb-4"
          >
            <template v-slot:title>
              Patient ID Preview
            </template>
            Will be generated as: <strong>{{ generateIdPreview }}</strong>
          </v-alert>
          
          <!-- Actions -->
          <v-card-actions class="px-0 pt-4">
            <v-spacer />
            <v-btn
              color="secondary"
              variant="text"
              @click="closeDialog"
            >
              Cancel
            </v-btn>
            <v-btn
              v-if="mode !== 'view'"
              color="primary"
              type="submit"
              :loading="loading"
            >
              {{ mode === 'create' ? 'Enroll Patient' : 'Save Changes' }}
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { patientsApi } from '@/api'

const props = defineProps({
  modelValue: Boolean,
  patient: Object,
  mode: {
    type: String,
    default: 'create', // 'create', 'edit', or 'view'
    validator: (value) => ['create', 'edit', 'view'].includes(value)
  }
})

const emit = defineEmits(['update:modelValue', 'saved'])

const form = ref(null)
const loading = ref(false)

const formData = ref({
  patient_id: '',
  name: '',
  date_of_birth: '',
  contact_info: '',
  hiv_status: '',
  consent: false
})

// Computed property to show ID preview
const generateIdPreview = computed(() => {
  if (!formData.value.name || !formData.value.hiv_status) return ''
  
  const name = formData.value.name
  const hivStatus = formData.value.hiv_status
  
  // Get current year (2-digit format)
  const currentYear = new Date().getFullYear().toString().slice(-2)
  const year = currentYear
  
  // Get initials from name
  const nameParts = name.trim().split(' ')
  let initials = ''
  
  if (nameParts.length >= 1) {
    initials += nameParts[0].charAt(0).toUpperCase()
  }
  if (nameParts.length >= 2) {
    const middlePart = nameParts[1]
    if (middlePart.length === 1 || (middlePart.length === 2 && middlePart.endsWith('.'))) {
      initials += middlePart.charAt(0).toUpperCase()
    } else if (nameParts.length >= 3) {
      initials += nameParts[2].charAt(0).toUpperCase()
    } else {
      initials += nameParts[1].charAt(0).toUpperCase()
    }
  }
  if (nameParts.length >= 3) {
    initials += nameParts[nameParts.length - 1].charAt(0).toUpperCase()
  }
  
  // Ensure we have at least 3 initials
  while (initials.length < 3) {
    initials += 'X'
  }
  
  // Take first 3 characters only
  initials = initials.substring(0, 3)
  
  // Format: PR25-JDX or P25-JDX (without suffix for preview)
  const prefix = hivStatus === 'Reactive' ? 'PR' : 'P'
  
  return `${prefix}${year}-${initials}XXX`
})

// Reset form when dialog opens/closes
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    // Load patient data if editing/viewing
    if (props.patient && (props.mode === 'edit' || props.mode === 'view')) {
      formData.value = {
        patient_id: props.patient.patient_id || '',
        name: props.patient.name || '',
        date_of_birth: props.patient.date_of_birth || '',
        contact_info: props.patient.contact_info || '',
        hiv_status: props.patient.hiv_status || '',
        consent: props.patient.consent || props.patient.consent_status === 'YES'
      }
    } else {
      // Reset for new patient
      formData.value = {
        patient_id: '',
        name: '',
        date_of_birth: '',
        contact_info: '',
        hiv_status: '',
        consent: false
      }
    }
  }
})

const closeDialog = () => {
  emit('update:modelValue', false)
  if (form.value) {
    form.value.reset()
  }
}

const savePatient = async () => {
  // Validate form
  const { valid } = await form.value.validate()
  if (!valid) return
  
  loading.value = true
  try {
    // Prepare patient data
    const patientData = {
      name: formData.value.name,
      date_of_birth: formData.value.date_of_birth,
      contact_info: formData.value.contact_info || '',
      hiv_status: formData.value.hiv_status,
      consent: formData.value.consent,
      // Send empty string instead of null if patient_id is empty
      patient_id: formData.value.patient_id || ''
    }
    
    console.log('Sending patient data:', patientData)
    
    let response
    if (props.mode === 'create') {
      response = await patientsApi.create(patientData)
    } else if (props.mode === 'edit') {
      response = await patientsApi.update(props.patient.patient_id, patientData)
    }
    
    console.log('Patient saved successfully:', response?.data)
    emit('saved', response?.data?.patient)
    closeDialog()
  } catch (error) {
    console.error('Error saving patient:', error)
    console.error('Error details:', error.response?.data)
    alert(error.response?.data?.error || 'Failed to save patient')
  } finally {
    loading.value = false
  }
}
</script>