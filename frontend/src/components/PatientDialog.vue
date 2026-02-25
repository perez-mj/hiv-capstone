<!-- frontend/src/components/PatientDialog.vue - FIXED WITH PROPER DATE HANDLING -->
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
            
            <!-- Date of Birth - FIXED date handling -->
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
            
            <!-- Sex -->
            <v-col cols="12" md="6">
              <v-select
                v-model="formData.sex"
                label="Sex"
                :readonly="mode === 'view'"
                variant="outlined"
                density="comfortable"
                :items="sexOptions"
                :rules="[v => !!v || 'Sex is required']"
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
            
            <!-- HIV-specific fields (only shown when REACTIVE) -->
            <template v-if="formData.hiv_status === 'REACTIVE'">
              <v-col cols="12">
                <v-divider class="my-2" />
                <h3 class="text-subtitle-1 mb-2">HIV Treatment Information</h3>
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
                  suffix="cells/mm³"
                  min="0"
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
                  suffix="copies/mL"
                  min="0"
                />
              </v-col>
            </template>
            
            <!-- Create User Account Section (for create mode only) -->
            <template v-if="mode === 'create'">
              <v-col cols="12">
                <v-divider class="my-2" />
                <h3 class="text-subtitle-1 mb-2">User Account (Optional)</h3>
              </v-col>
              
              <v-col cols="12">
                <v-checkbox
                  v-model="formData.create_user_account"
                  label="Create user account for patient"
                  color="primary"
                  hide-details
                />
              </v-col>
              
              <template v-if="formData.create_user_account">
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="formData.username"
                    label="Username"
                    variant="outlined"
                    density="comfortable"
                    :rules="[v => !!v || 'Username is required']"
                    required
                  />
                </v-col>
                
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="formData.email"
                    label="Email"
                    type="email"
                    variant="outlined"
                    density="comfortable"
                  />
                </v-col>
                
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="formData.password"
                    label="Password"
                    type="password"
                    variant="outlined"
                    density="comfortable"
                    :rules="[v => !!v || 'Password is required']"
                    required
                  />
                </v-col>
                
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="formData.confirm_password"
                    label="Confirm Password"
                    type="password"
                    variant="outlined"
                    density="comfortable"
                    :rules="[
                      v => !!v || 'Please confirm password',
                      v => v === formData.password || 'Passwords do not match'
                    ]"
                    required
                  />
                </v-col>
              </template>
            </template>
          </v-row>
          
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
    default: 'create',
    validator: (value) => ['create', 'edit', 'view'].includes(value)
  }
})

const emit = defineEmits(['update:modelValue', 'saved'])

const form = ref(null)
const loading = ref(false)

// Form data structure
const formData = ref({
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

// Helper function to format date for input (YYYY-MM-DD)
function formatDateForInput(dateString) {
  if (!dateString) return ''
  
  // If it's already in YYYY-MM-DD format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString
  }
  
  // Try to parse the date
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return ''
  
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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
      // Format dates properly for the form
      formData.value = {
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
  const { valid } = await form.value.validate()
  if (!valid) return
  
  loading.value = true
  try {
    const patientData = {
      first_name: formData.value.first_name,
      last_name: formData.value.last_name,
      date_of_birth: formData.value.date_of_birth,
      sex: formData.value.sex,
      hiv_status: formData.value.hiv_status,
      middle_name: formData.value.middle_name || null,
      address: formData.value.address || null,
      contact_number: formData.value.contact_number || null,
      diagnosis_date: formData.value.diagnosis_date || null,
      art_start_date: formData.value.art_start_date || null,
      latest_cd4_count: formData.value.latest_cd4_count ? parseInt(formData.value.latest_cd4_count) : null,
      latest_viral_load: formData.value.latest_viral_load ? parseInt(formData.value.latest_viral_load) : null
    }
    
    if (props.mode === 'create' && formData.value.create_user_account) {
      patientData.create_user_account = true
      patientData.username = formData.value.username
      patientData.email = formData.value.email || null
      patientData.password_hash = formData.value.password
    }
    
    console.log('Sending patient data:', patientData)
    
    let response
    if (props.mode === 'create') {
      response = await patientsApi.create(patientData)
    } else if (props.mode === 'edit') {
      response = await patientsApi.update(props.patient.id, patientData)
    }
    
    console.log('Patient saved successfully:', response?.data)
    emit('saved', response?.data?.patient)
    closeDialog()
  } catch (error) {
    console.error('Error saving patient:', error)
    console.error('Error details:', error.response?.data)
    
    const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to save patient'
    alert(errorMessage)
  } finally {
    loading.value = false
  }
}

// Watch for HIV status changes
watch(() => formData.value.hiv_status, (newVal) => {
  if (newVal !== 'REACTIVE') {
    formData.value.diagnosis_date = ''
    formData.value.art_start_date = ''
    formData.value.latest_cd4_count = null
    formData.value.latest_viral_load = null
  }
})
</script>