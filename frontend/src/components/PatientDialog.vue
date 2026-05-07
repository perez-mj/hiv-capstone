<!-- frontend/src/components/PatientDialog.vue -->
<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="800" persistent>
    <v-card class="patient-dialog">
      <v-card-title class="text-subtitle-1 font-weight-bold pa-4" :class="titleClass">
        <v-icon :icon="titleIcon" size="small" class="mr-2" :color="titleIconColor" />
        {{ dialogTitle }}
      </v-card-title>
      
      <v-divider />
      
      <v-card-text class="pa-4">
        <v-form ref="form" @submit.prevent="savePatient">
          <!-- Patient Facility Code Section - Now Editable -->
          <div class="d-flex align-center mb-3">
            <v-icon icon="mdi-barcode" size="small" class="mr-2 text-primary" />
            <span class="text-caption font-weight-medium">Patient Identification</span>
          </div>

          <v-row dense>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.patient_facility_code"
                label="Patient Facility Code"
                :readonly="mode === 'view'"
                variant="outlined"
                density="compact"
                placeholder="Auto-generated if empty"
                :hint="mode === 'create' ? 'Leave empty for auto-generation' : ''"
                persistent-hint
                hide-details="auto"
                class="mb-3"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-alert
                v-if="mode === 'create'"
                type="info"
                variant="tonal"
                density="compact"
                class="mb-0"
              >
                <div class="d-flex align-center">
                  <span class="text-caption">Code will be auto-generated if left empty</span>
                </div>
              </v-alert>
            </v-col>
          </v-row>

          <!-- Personal Information Section -->
          <div class="d-flex align-center mb-3 mt-2">
            <span class="text-caption font-weight-medium">Personal Information</span>
          </div>
          
          <v-row dense>
            <!-- Last Name - First in the row for better flow -->
            <v-col cols="12" md="4">
              <v-text-field
                v-model="formData.last_name"
                label="Last Name"
                :readonly="mode === 'view'"
                variant="outlined"
                density="compact"
                :rules="[v => !!v || 'Last Name is required']"
                required
                hide-details="auto"
                class="mb-3"
              />
            </v-col>
            
            <!-- First Name -->
            <v-col cols="12" md="4">
              <v-text-field
                v-model="formData.first_name"
                label="First Name"
                :readonly="mode === 'view'"
                variant="outlined"
                density="compact"
                :rules="[v => !!v || 'First Name is required']"
                required
                hide-details="auto"
                class="mb-3"
              />
            </v-col>
            
            <!-- Middle Name -->
            <v-col cols="12" md="4">
              <v-text-field
                v-model="formData.middle_name"
                label="Middle Name"
                :readonly="mode === 'view'"
                variant="outlined"
                density="compact"
                placeholder="Optional"
                hide-details="auto"
                class="mb-3"
              />
            </v-col>
          </v-row>

          <v-row dense>
            <!-- Date of Birth and Sex on same row -->
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.date_of_birth"
                label="Date of Birth"
                type="date"
                :readonly="mode === 'view'"
                variant="outlined"
                density="compact"
                :rules="[v => !!v || 'Date of Birth is required']"
                required
                hide-details="auto"
                class="mb-3"
              />
            </v-col>
            
            <v-col cols="12" md="6">
              <v-select
                v-model="formData.sex"
                label="Sex"
                :readonly="mode === 'view'"
                variant="outlined"
                density="compact"
                :items="sexOptions"
                :rules="[v => !!v || 'Sex is required']"
                required
                hide-details="auto"
                class="mb-3"
              />
            </v-col>
          </v-row>

          <v-row dense>
            <!-- Contact and Address on same row -->
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.contact_number"
                label="Contact Number"
                :readonly="mode === 'view'"
                variant="outlined"
                density="compact"
                placeholder="Phone number"
                hide-details="auto"
                class="mb-3"
              />
            </v-col>
            
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.address"
                label="Address"
                :readonly="mode === 'view'"
                variant="outlined"
                density="compact"
                placeholder="Complete address"
                hide-details="auto"
                class="mb-3"
              />
            </v-col>
          </v-row>

          <!-- HIV Status Section -->
          <div class="d-flex align-center mb-3 mt-2">
            <span class="text-caption font-weight-medium">HIV Information</span>
          </div>

          <v-row dense>
            <!-- HIV Status - Full width on its own row for emphasis -->
            <v-col cols="12">
              <v-select
                v-model="formData.hiv_status"
                label="HIV Status"
                :readonly="mode === 'view'"
                variant="outlined"
                density="compact"
                :items="hivStatusOptions"
                :rules="[v => !!v || 'HIV Status is required']"
                required
                hide-details="auto"
                class="mb-3"
              />
            </v-col>
          </v-row>
          
          <!-- HIV-specific fields (only shown when REACTIVE) -->
          <template v-if="formData.hiv_status === 'REACTIVE'">
            <v-row dense>
              <!-- Diagnosis Date and ART Start Date on same row -->
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formData.diagnosis_date"
                  label="Diagnosis Date"
                  type="date"
                  :readonly="mode === 'view'"
                  variant="outlined"
                  density="compact"
                  hide-details="auto"
                  class="mb-3"
                />
              </v-col>
              
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formData.art_start_date"
                  label="ART Start Date"
                  type="date"
                  :readonly="mode === 'view'"
                  variant="outlined"
                  density="compact"
                  hide-details="auto"
                  class="mb-3"
                />
              </v-col>
            </v-row>

            <v-row dense>
              <!-- Latest CD4 Count and Latest Viral Load on same row -->
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formData.latest_cd4_count"
                  label="Latest CD4 Count"
                  type="number"
                  :readonly="mode === 'view'"
                  variant="outlined"
                  density="compact"
                  suffix="cells/mm³"
                  min="0"
                  hide-details="auto"
                  class="mb-3"
                />
              </v-col>
              
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formData.latest_viral_load"
                  label="Latest Viral Load"
                  type="number"
                  :readonly="mode === 'view'"
                  variant="outlined"
                  density="compact"
                  suffix="copies/mL"
                  min="0"
                  hide-details="auto"
                  class="mb-3"
                />
              </v-col>
            </v-row>
          </template>
          
          <!-- Create User Account Section (for create mode only) -->
          <template v-if="mode === 'create'">
            <v-divider class="my-3" />
            
            <div class="d-flex align-center mb-3">
              <v-icon icon="mdi-account-plus" size="small" class="mr-2 text-success" />
              <span class="text-caption font-weight-medium">User Account (Optional)</span>
            </div>
            
            <v-row dense>
              <v-col cols="12">
                <v-checkbox
                  v-model="formData.create_user_account"
                  label="Create user account for patient"
                  color="primary"
                  density="compact"
                  hide-details
                  class="mt-0 mb-2"
                />
              </v-col>
            </v-row>
            
            <template v-if="formData.create_user_account">
              <v-alert
                type="info"
                variant="tonal"
                class="mb-3"
                density="compact"
              >
                <div class="d-flex align-center">
                  <span class="text-caption">
                    Creating a user account allows the patient to log in to the system
                  </span>
                </div>
              </v-alert>

              <v-row dense>
                <!-- Username and Email on same row -->
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="formData.username"
                    label="Username"
                    variant="outlined"
                    density="compact"
                    :rules="[v => !!v || 'Username is required']"
                    required
                    hide-details="auto"
                    class="mb-3"
                  />
                </v-col>
                
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="formData.email"
                    label="Email"
                    type="email"
                    variant="outlined"
                    density="compact"
                    hide-details="auto"
                    class="mb-3"
                  />
                </v-col>
              </v-row>

              <v-row dense>
                <!-- Password and Confirm Password on same row -->
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="formData.password"
                    label="Password"
                    type="password"
                    variant="outlined"
                    density="compact"
                    :rules="[v => !!v || 'Password is required', v => v.length >= 6 || 'Minimum 6 characters']"
                    required
                    hide-details="auto"
                    class="mb-3"
                  />
                </v-col>
                
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="formData.confirm_password"
                    label="Confirm Password"
                    type="password"
                    variant="outlined"
                    density="compact"
                    :rules="[
                      v => !!v || 'Please confirm password',
                      v => v === formData.password || 'Passwords do not match'
                    ]"
                    required
                    hide-details="auto"
                    class="mb-3"
                  />
                </v-col>
              </v-row>
            </template>
          </template>
        </v-form>
      </v-card-text>

      <v-divider />
      
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn 
          variant="text" 
          color="grey-darken-1" 
          @click="closeDialog"
          :disabled="loading"
          size="small"
        >
          Cancel
        </v-btn>
        <v-btn 
          v-if="mode !== 'view'"
          color="primary" 
          variant="elevated" 
          @click="savePatient"
          :loading="loading"
          :prepend-icon="mode === 'create' ? 'mdi-plus' : 'mdi-check'"
          size="small"
        >
          {{ mode === 'create' ? 'Enroll Patient' : 'Save Changes' }}
        </v-btn>
      </v-card-actions>
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
    default: 'create',
    validator: (value) => ['create', 'edit', 'view'].includes(value)
  }
})

const emit = defineEmits(['update:modelValue', 'saved'])

const form = ref(null)
const loading = ref(false)

// Form data structure
const formData = ref({
  patient_facility_code: '',
  first_name: '',
  last_name: '',
  middle_name: '',
  date_of_birth: '',
  sex: '',
  address: '',
  contact_number: '',
  hiv_status: '',
  diagnosis_date: '',
  art_start_date: '',
  latest_cd4_count: null,
  latest_viral_load: null,
  
  // User account fields
  create_user_account: false,
  username: '',
  email: '',
  password: '',
  confirm_password: ''
})

// Title classes and icons based on mode
const titleClass = computed(() => {
  switch (props.mode) {
    case 'create': return 'bg-primary-lighten-5'
    case 'edit': return 'bg-info-lighten-5'
    case 'view': return 'bg-grey-lighten-4'
    default: return ''
  }
})

const titleIcon = computed(() => {
  switch (props.mode) {
    case 'create': return 'mdi-plus'
    case 'edit': return 'mdi-pencil'
    case 'view': return 'mdi-account-details'
    default: return 'mdi-account'
  }
})

const titleIconColor = computed(() => {
  switch (props.mode) {
    case 'create': return 'primary'
    case 'edit': return 'info'
    case 'view': return 'grey'
    default: return 'primary'
  }
})

// Helper function to format date for input (YYYY-MM-DD)
function formatDateForInput(dateString) {
  if (!dateString) return ''
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString
  }
  
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return ''
  
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Helper function to validate date
function isValidDate(dateString) {
  if (!dateString) return true
  const date = new Date(dateString)
  return !isNaN(date.getTime())
}

// Options
const hivStatusOptions = [
  { title: 'Reactive', value: 'REACTIVE' },
  { title: 'Non-Reactive', value: 'NON_REACTIVE' },
  { title: 'Indeterminate', value: 'INDETERMINATE' }
]

const sexOptions = [
  { title: 'Male', value: 'MALE' },
  { title: 'Female', value: 'FEMALE' },
  { title: 'Other', value: 'OTHER' }
]

const dialogTitle = computed(() => {
  switch (props.mode) {
    case 'create': return 'New Patient Enrollment'
    case 'edit': return 'Edit Patient'
    case 'view': return 'Patient Details'
    default: return 'Patient'
  }
})

// Reset form when dialog opens/closes
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    if (props.patient && (props.mode === 'edit' || props.mode === 'view')) {
      formData.value = {
        patient_facility_code: props.patient.patient_facility_code || '',
        first_name: props.patient.first_name || '',
        last_name: props.patient.last_name || '',
        middle_name: props.patient.middle_name || '',
        date_of_birth: formatDateForInput(props.patient.date_of_birth),
        sex: props.patient.sex || '',
        address: props.patient.address || '',
        contact_number: props.patient.contact_number || '',
        hiv_status: props.patient.hiv_status || '',
        diagnosis_date: formatDateForInput(props.patient.diagnosis_date),
        art_start_date: formatDateForInput(props.patient.art_start_date),
        latest_cd4_count: props.patient.latest_cd4_count || null,
        latest_viral_load: props.patient.latest_viral_load || null,
        
        create_user_account: false,
        username: '',
        email: '',
        password: '',
        confirm_password: ''
      }
    } else {
      formData.value = {
        patient_facility_code: '',
        first_name: '',
        last_name: '',
        middle_name: '',
        date_of_birth: '',
        sex: '',
        address: '',
        contact_number: '',
        hiv_status: '',
        diagnosis_date: '',
        art_start_date: '',
        latest_cd4_count: null,
        latest_viral_load: null,
        create_user_account: false,
        username: '',
        email: '',
        password: '',
        confirm_password: ''
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
  
  // Additional validation for dates
  if (!isValidDate(formData.value.date_of_birth)) {
    alert('Please enter a valid date of birth')
    return
  }
  
  if (formData.value.diagnosis_date && !isValidDate(formData.value.diagnosis_date)) {
    alert('Please enter a valid diagnosis date')
    return
  }
  
  if (formData.value.art_start_date && !isValidDate(formData.value.art_start_date)) {
    alert('Please enter a valid ART start date')
    return
  }
  
  loading.value = true
  
  try {
    // Prepare patient data - exactly matching backend validation schema
    const patientData = {
      // Required fields
      first_name: formData.value.first_name.trim(),
      last_name: formData.value.last_name.trim(),
      date_of_birth: formData.value.date_of_birth,
      sex: formData.value.sex,
      hiv_status: formData.value.hiv_status,
      
      // Optional fields with proper null handling
      patient_facility_code: formData.value.patient_facility_code?.trim() || undefined,
      middle_name: formData.value.middle_name?.trim() || null,
      address: formData.value.address?.trim() || null,
      contact_number: formData.value.contact_number?.trim() || null,
      diagnosis_date: formData.value.diagnosis_date || null,
      art_start_date: formData.value.art_start_date || null,
      latest_cd4_count: formData.value.latest_cd4_count ? parseInt(formData.value.latest_cd4_count) : null,
      latest_viral_load: formData.value.latest_viral_load ? parseInt(formData.value.latest_viral_load) : null
    }
    
    // Add user account data if requested (create mode only)
    if (props.mode === 'create' && formData.value.create_user_account) {
      // Validate user account fields
      if (!formData.value.username?.trim()) {
        alert('Username is required when creating a user account')
        loading.value = false
        return
      }
      if (!formData.value.password) {
        alert('Password is required when creating a user account')
        loading.value = false
        return
      }
      if (formData.value.password !== formData.value.confirm_password) {
        alert('Passwords do not match')
        loading.value = false
        return
      }
      if (formData.value.password.length < 6) {
        alert('Password must be at least 6 characters')
        loading.value = false
        return
      }
      
      patientData.create_user_account = true
      patientData.username = formData.value.username.trim()
      patientData.email = formData.value.email?.trim() || null
      patientData.password = formData.value.password  // Note: backend expects 'password' not 'password_hash'
    }
    
    console.log('Sending patient data:', patientData)
    
    let response
    if (props.mode === 'create') {
      response = await patientsApi.create(patientData)
    } else if (props.mode === 'edit') {
      response = await patientsApi.update(props.patient.id, patientData)
    }
    
    if (response?.data?.patient) {
      emit('saved', response.data.patient)
      closeDialog()
    } else if (response?.data) {
      emit('saved', response.data)
      closeDialog()
    } else {
      emit('saved', true)
      closeDialog()
    }
    
  } catch (error) {
    console.error('Error saving patient:', error)
    
    // Better error handling
    let errorMessage = 'Failed to save patient'
    
    if (error.response?.data?.error) {
      errorMessage = error.response.data.error
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message
    } else if (error.response?.data?.details) {
      // Joi validation details
      const details = error.response.data.details
      if (Array.isArray(details)) {
        errorMessage = details.map(d => d.message).join(', ')
      } else {
        errorMessage = details
      }
    } else if (error.message) {
      errorMessage = error.message
    }
    
    alert(errorMessage)
  } finally {
    loading.value = false
  }
}

// Watch for HIV status changes to clear reactive-specific fields when switching to non-reactive
watch(() => formData.value.hiv_status, (newVal) => {
  if (newVal !== 'REACTIVE') {
    formData.value.diagnosis_date = ''
    formData.value.art_start_date = ''
    formData.value.latest_cd4_count = null
    formData.value.latest_viral_load = null
  }
})
</script>

<style scoped>
.patient-dialog {
  border-radius: 12px;
  overflow: hidden;
}

/* Background classes - using Vuetify's built-in classes */
.bg-primary-lighten-5 {
  background-color: rgba(var(--v-theme-primary), 0.05);
}

.bg-info-lighten-5 {
  background-color: rgba(var(--v-theme-info), 0.05);
}

.bg-grey-lighten-4 {
  background-color: rgb(var(--v-theme-surface-light));
}

/* Compact field styling */
:deep(.v-field) {
  font-size: 0.875rem;
}

:deep(.v-field__input) {
  min-height: 36px;
  padding-top: 0;
  padding-bottom: 0;
}

:deep(.v-field--variant-outlined .v-field__outline) {
  --v-field-border-width: 1px;
}

:deep(.v-select .v-field) {
  min-height: 36px;
}

:deep(.v-checkbox .v-selection-control) {
  min-height: 32px;
}

:deep(.v-checkbox .v-label) {
  font-size: 0.875rem;
  opacity: 0.87;
}

:deep(.v-alert) {
  font-size: 0.875rem;
}

:deep(.v-alert .v-alert__content) {
  font-size: 0.75rem;
}

:deep(.v-btn) {
  font-size: 0.75rem;
  letter-spacing: 0.3px;
  text-transform: none;
}

:deep(.v-btn--variant-elevated) {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

:deep(.v-card-title) {
  font-size: 0.875rem;
  line-height: 1.4;
}

/* Responsive adjustments */
@media (max-width: 600px) {
  :deep(.v-col) {
    padding: 0 4px;
  }
}
</style>