<!-- frontend/src/components/PatientDialog.vue - UPDATED FOR NEW SCHEMA -->
<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="800">
    <v-card>
      <v-card-title class="d-flex justify-space-between align-center">
        <span class="text-h5">{{ dialogTitle }}</span>
        <v-btn icon @click="closeDialog">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      
      <v-card-text>
        <v-form ref="form" @submit.prevent="savePatient">
          <v-row>
            <!-- Patient ID Field (Read-only for edit, auto-generated for create) -->
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.patient_id"
                label="Patient ID"
                :readonly="mode !== 'create'"
                variant="outlined"
                density="comfortable"
                :rules="mode !== 'create' ? [v => !!v || 'Patient ID is required'] : []"
                :placeholder="mode === 'create' ? 'Auto-generated if left blank' : ''"
                :hint="mode === 'create' ? 'Leave blank for automatic generation' : ''"
                persistent-hint
              />
            </v-col>
            
            <!-- HIV Status -->
            <v-col cols="12" md="6">
              <v-select
                v-model="formData.hiv_status"
                label="HIV Status"
                :readonly="mode === 'view'"
                variant="outlined"
                density="comfortable"
                :items="hivStatusOptions"
                :rules="[v => !!v || 'HIV Status is required']"
                required
              />
            </v-col>
            
            <!-- Last Name -->
            <v-col cols="12" md="4">
              <v-text-field
                v-model="formData.last_name"
                label="Last Name"
                :readonly="mode === 'view'"
                variant="outlined"
                density="comfortable"
                :rules="[v => !!v || 'Last Name is required']"
                required
              />
            </v-col>
            
            <!-- First Name -->
            <v-col cols="12" md="4">
              <v-text-field
                v-model="formData.first_name"
                label="First Name"
                :readonly="mode === 'view'"
                variant="outlined"
                density="comfortable"
                :rules="[v => !!v || 'First Name is required']"
                required
              />
            </v-col>
            
            <!-- Middle Name -->
            <v-col cols="12" md="4">
              <v-text-field
                v-model="formData.middle_name"
                label="Middle Name"
                :readonly="mode === 'view'"
                variant="outlined"
                density="comfortable"
                placeholder="Optional"
              />
            </v-col>
            
            <!-- Date of Birth -->
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.date_of_birth"
                label="Date of Birth"
                type="date"
                :readonly="mode === 'view'"
                variant="outlined"
                density="comfortable"
                :rules="[v => !!v || 'Date of Birth is required']"
                required
              />
            </v-col>
            
            <!-- Gender -->
            <v-col cols="12" md="6">
              <v-select
                v-model="formData.gender"
                label="Gender"
                :readonly="mode === 'view'"
                variant="outlined"
                density="comfortable"
                :items="genderOptions"
                :rules="[v => !!v || 'Gender is required']"
                required
              />
            </v-col>
            
            <!-- Contact Number -->
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.contact_number"
                label="Contact Number"
                :readonly="mode === 'view'"
                variant="outlined"
                density="comfortable"
                placeholder="Phone number"
              />
            </v-col>
            
            <!-- Address -->
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.address"
                label="Address"
                :readonly="mode === 'view'"
                variant="outlined"
                density="comfortable"
                placeholder="Complete address"
              />
            </v-col>
            
            <!-- Diagnosis Date -->
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.diagnosis_date"
                label="Diagnosis Date"
                type="date"
                :readonly="mode === 'view'"
                variant="outlined"
                density="comfortable"
                :disabled="formData.hiv_status !== 'REACTIVE'"
              />
            </v-col>
            
            <!-- ART Start Date -->
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.art_start_date"
                label="ART Start Date"
                type="date"
                :readonly="mode === 'view'"
                variant="outlined"
                density="comfortable"
                :disabled="formData.hiv_status !== 'REACTIVE'"
              />
            </v-col>
            
            <!-- Latest CD4 Count -->
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.latest_cd4_count"
                label="Latest CD4 Count"
                type="number"
                :readonly="mode === 'view'"
                variant="outlined"
                density="comfortable"
                :disabled="formData.hiv_status !== 'REACTIVE'"
                suffix="cells/mm³"
              />
            </v-col>
            
            <!-- Latest Viral Load -->
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.latest_viral_load"
                label="Latest Viral Load"
                type="number"
                :readonly="mode === 'view'"
                variant="outlined"
                density="comfortable"
                :disabled="formData.hiv_status !== 'REACTIVE'"
                suffix="copies/mL"
              />
            </v-col>
            
            <!-- Consent Checkbox -->
            <v-col cols="12">
              <v-checkbox
                v-model="formData.consent"
                label="Patient has given consent for data collection and processing"
                :readonly="mode === 'view'"
                color="primary"
                hide-details
              />
            </v-col>
          </v-row>
          
          <!-- Preview of generated ID -->
          <v-alert
            v-if="mode === 'create' && !formData.patient_id && formData.first_name && formData.last_name && formData.hiv_status"
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

// Form data structure matching the new schema
const formData = ref({
  patient_id: '',
  first_name: '',
  last_name: '',
  middle_name: '',
  date_of_birth: '',
  gender: '',
  address: '',
  contact_number: '',
  consent: false,
  hiv_status: '',
  diagnosis_date: '',
  art_start_date: '',
  latest_cd4_count: null,
  latest_viral_load: null
})

// Options for select fields
const hivStatusOptions = [
  { title: 'Reactive', value: 'REACTIVE' },
  { title: 'Non-Reactive', value: 'NON_REACTIVE' }
]

const genderOptions = [
  { title: 'Male', value: 'MALE' },
  { title: 'Female', value: 'FEMALE' },
  { title: 'Other', value: 'OTHER' }
]

// Computed property for dialog title
const dialogTitle = computed(() => {
  switch (props.mode) {
    case 'create': return 'New Patient Enrollment'
    case 'edit': return 'Edit Patient'
    case 'view': return 'Patient Details'
    default: return 'Patient'
  }
})

// Computed property to show ID preview
const generateIdPreview = computed(() => {
  if (!formData.value.first_name || !formData.value.last_name || !formData.value.hiv_status) return ''
  
  const firstName = formData.value.first_name
  const lastName = formData.value.last_name
  const middleName = formData.value.middle_name
  const hivStatus = formData.value.hiv_status
  
  // Get current year (2-digit format)
  const currentYear = new Date().getFullYear().toString().slice(-2)
  const year = currentYear
  
  // Get initials
  let initials = ''
  
  if (firstName && firstName.length > 0) {
    initials += firstName.charAt(0).toUpperCase()
  }
  
  if (middleName && middleName.length > 0) {
    initials += middleName.charAt(0).toUpperCase()
  } else {
    initials += 'X'
  }
  
  if (lastName && lastName.length > 0) {
    initials += lastName.charAt(0).toUpperCase()
  }
  
  // Ensure we have at least 3 initials
  while (initials.length < 3) {
    initials += 'X'
  }
  
  // Take first 3 characters only
  initials = initials.substring(0, 3)
  
  // Format: PR25-JDX or P25-JDX (without suffix for preview)
  const prefix = hivStatus === 'REACTIVE' ? 'PR' : 'P'
  
  return `${prefix}${year}-${initials}XXX`
})

// Reset form when dialog opens/closes
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    // Load patient data if editing/viewing
    if (props.patient && (props.mode === 'edit' || props.mode === 'view')) {
      formData.value = {
        patient_id: props.patient.patient_id || '',
        first_name: props.patient.first_name || '',
        last_name: props.patient.last_name || '',
        middle_name: props.patient.middle_name || '',
        date_of_birth: props.patient.date_of_birth || '',
        gender: props.patient.gender || '',
        address: props.patient.address || '',
        contact_number: props.patient.contact_number || '',
        consent: props.patient.consent || false,
        hiv_status: props.patient.hiv_status || '',
        diagnosis_date: props.patient.diagnosis_date || '',
        art_start_date: props.patient.art_start_date || '',
        latest_cd4_count: props.patient.latest_cd4_count || null,
        latest_viral_load: props.patient.latest_viral_load || null
      }
    } else {
      // Reset for new patient
      formData.value = {
        patient_id: '',
        first_name: '',
        last_name: '',
        middle_name: '',
        date_of_birth: '',
        gender: '',
        address: '',
        contact_number: '',
        consent: false,
        hiv_status: '',
        diagnosis_date: '',
        art_start_date: '',
        latest_cd4_count: null,
        latest_viral_load: null
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
    // Prepare patient data - only send fields that are not empty
    const patientData = {
      first_name: formData.value.first_name,
      last_name: formData.value.last_name,
      date_of_birth: formData.value.date_of_birth,
      gender: formData.value.gender,
      hiv_status: formData.value.hiv_status,
      consent: formData.value.consent,
      // Optional fields - send null if empty
      middle_name: formData.value.middle_name || null,
      address: formData.value.address || null,
      contact_number: formData.value.contact_number || null,
      diagnosis_date: formData.value.diagnosis_date || null,
      art_start_date: formData.value.art_start_date || null,
      latest_cd4_count: formData.value.latest_cd4_count ? parseInt(formData.value.latest_cd4_count) : null,
      latest_viral_load: formData.value.latest_viral_load ? parseInt(formData.value.latest_viral_load) : null,
      // Only send patient_id if provided (for create mode)
      ...(formData.value.patient_id ? { patient_id: formData.value.patient_id } : {})
    }
    
    console.log('Sending patient data:', patientData)
    
    let response
    if (props.mode === 'create') {
      // POST /patients - Creates new patient
      response = await patientsApi.create(patientData)
    } else if (props.mode === 'edit') {
      // PUT /patients/:id - Updates existing patient
      response = await patientsApi.update(props.patient.patient_id, patientData)
    }
    
    console.log('Patient saved successfully:', response?.data)
    emit('saved', response?.data?.patient)
    closeDialog()
  } catch (error) {
    console.error('Error saving patient:', error)
    console.error('Error details:', error.response?.data)
    
    // Show user-friendly error message
    const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to save patient'
    alert(errorMessage)
  } finally {
    loading.value = false
  }
}

// Watch for HIV status changes to clear/disable dependent fields
watch(() => formData.value.hiv_status, (newVal) => {
  if (newVal !== 'REACTIVE') {
    // Clear HIV-specific fields if status is not REACTIVE
    formData.value.diagnosis_date = ''
    formData.value.art_start_date = ''
    formData.value.latest_cd4_count = null
    formData.value.latest_viral_load = null
  }
})
</script>