<!-- frontend/src/pages/patient/PatientProfile.vue -->
<template>
  <v-container fluid class="pa-6">
    <div class="page-header d-flex justify-space-between align-center mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold text-primary">My Profile</h1>
        <p class="text-body-1 text-medium-emphasis mt-2">
          View and manage your personal information and account details
        </p>
      </div>
      <div class="d-flex gap-2">
        <v-btn
          v-if="!isEditing && formData && !loading && !profileNotFound"
          color="primary"
          prepend-icon="mdi-pencil"
          @click="startEditing"
        >
          Edit Profile
        </v-btn>
        <v-btn
          v-if="!isEditing && formData && !loading && !profileNotFound"
          color="secondary"
          variant="outlined"
          prepend-icon="mdi-lock-reset"
          @click="showPasswordDialog = true"
        >
          Change Password
        </v-btn>
        <div v-else-if="isEditing && formData && !loading && !profileNotFound">
          <v-btn
            color="success"
            prepend-icon="mdi-check"
            @click="saveProfile"
            :loading="saving"
            class="mr-2"
          >
            Save Changes
          </v-btn>
          <v-btn
            color="error"
            prepend-icon="mdi-close"
            @click="cancelEditing"
          >
            Cancel
          </v-btn>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <v-card v-if="loading" elevation="2" class="mb-4">
      <v-card-text class="text-center py-8">
        <v-progress-circular indeterminate color="primary" />
        <div class="mt-4">Loading profile...</div>
      </v-card-text>
    </v-card>

    <!-- Profile Not Found State -->
    <v-card v-else-if="profileNotFound" elevation="2" class="mb-4 text-center py-8">
      <v-icon size="64" color="warning" class="mb-4">mdi-account-alert</v-icon>
      <div class="text-h6">No Profile Found</div>
      <div class="text-body-2 text-medium-emphasis mt-2 mb-4">
        Your patient profile is not yet set up. Please contact the administrator.
      </div>
      <v-btn
        color="primary"
        @click="logout"
      >
        Return to Login
      </v-btn>
    </v-card>

    <!-- Error State -->
    <v-alert
      v-else-if="error"
      type="error"
      variant="tonal"
      class="mb-4"
      closable
      @click:close="error = null"
    >
      {{ error }}
    </v-alert>

    <!-- Success Message -->
    <v-alert
      v-if="successMessage"
      type="success"
      variant="tonal"
      class="mb-4"
      closable
      @click:close="successMessage = null"
    >
      {{ successMessage }}
    </v-alert>

    <!-- Profile Content - Only show when loaded and no error -->
    <template v-if="!loading && !error && !profileNotFound && formData">
      <v-row>
        <!-- Left Column - Account Information -->
        <v-col cols="12" md="6">
          <v-card elevation="2" border>
            <v-card-title class="bg-primary-lighten-5">
              <v-icon color="primary" class="mr-2">mdi-account-circle</v-icon>
              Account Information
            </v-card-title>
            <v-divider></v-divider>
            <v-card-text>
              <v-form ref="accountForm">
                <!-- Username -->
                <v-text-field
                  v-model="formData.username"
                  label="Username"
                  variant="outlined"
                  density="comfortable"
                  :readonly="!isEditing"
                  :rules="isEditing ? [rules.required] : []"
                  prepend-inner-icon="mdi-account"
                  class="mb-3"
                />

                <!-- Email - OPTIONAL NOW -->
                <v-text-field
                  v-model="formData.email"
                  label="Email Address (Optional)"
                  variant="outlined"
                  density="comfortable"
                  :readonly="!isEditing"
                  :rules="isEditing ? [rules.email] : []"
                  prepend-inner-icon="mdi-email"
                  type="email"
                  class="mb-3"
                />
              </v-form>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Right Column - Patient Information -->
        <v-col cols="12" md="6">
          <v-card elevation="2" border>
            <v-card-title class="bg-primary-lighten-5">
              <v-icon color="primary" class="mr-2">mdi-account-details</v-icon>
              Personal Information
            </v-card-title>
            <v-divider></v-divider>
            <v-card-text>
              <v-form ref="patientForm">
                <v-row>
                  <!-- Patient ID (readonly always) -->
                  <v-col cols="12">
                    <v-text-field
                      v-model="formData.patient_id"
                      label="Patient ID"
                      variant="outlined"
                      density="comfortable"
                      readonly
                      prepend-inner-icon="mdi-card-account-details"
                      class="mb-3"
                    />
                  </v-col>

                  <!-- Full Name Fields -->
                  <v-col cols="12" md="4">
                    <v-text-field
                      v-model="formData.first_name"
                      label="First Name"
                      variant="outlined"
                      density="comfortable"
                      :readonly="!isEditing"
                      :rules="isEditing ? [rules.required] : []"
                      class="mb-3"
                    />
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-text-field
                      v-model="formData.middle_name"
                      label="Middle Name"
                      variant="outlined"
                      density="comfortable"
                      :readonly="!isEditing"
                      class="mb-3"
                    />
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-text-field
                      v-model="formData.last_name"
                      label="Last Name"
                      variant="outlined"
                      density="comfortable"
                      :readonly="!isEditing"
                      :rules="isEditing ? [rules.required] : []"
                      class="mb-3"
                    />
                  </v-col>

                  <!-- Date of Birth and Age -->
                  <v-col cols="12" md="8">
                    <v-text-field
                      v-model="formData.date_of_birth"
                      label="Date of Birth"
                      variant="outlined"
                      density="comfortable"
                      :readonly="!isEditing"
                      type="date"
                      :rules="isEditing ? [rules.required] : []"
                      @update:model-value="calculateAgeFromDOB"
                      class="mb-3"
                    />
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-text-field
                      v-model="formData.age"
                      label="Age"
                      variant="outlined"
                      density="comfortable"
                      readonly
                      class="mb-3"
                    />
                  </v-col>

                  <!-- Sex/Gender -->
                  <v-col cols="12" md="6">
                    <v-select
                      v-model="formData.sex"
                      label="Sex"
                      :items="sexOptions"
                      variant="outlined"
                      density="comfortable"
                      :readonly="!isEditing"
                      :rules="isEditing ? [rules.required] : []"
                      class="mb-3"
                    />
                  </v-col>

                  <!-- Contact Number - OPTIONAL NOW -->
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="formData.contact_number"
                      label="Contact Number (Optional)"
                      variant="outlined"
                      density="comfortable"
                      :readonly="!isEditing"
                      :rules="isEditing ? [rules.phone] : []"
                      prepend-inner-icon="mdi-phone"
                      class="mb-3"
                    />
                  </v-col>

                  <!-- Address - OPTIONAL NOW -->
                  <v-col cols="12">
                    <v-textarea
                      v-model="formData.address"
                      label="Address (Optional)"
                      variant="outlined"
                      density="comfortable"
                      :readonly="!isEditing"
                      rows="2"
                      auto-grow
                      class="mb-3"
                    />
                  </v-col>

                  <!-- HIV Status (readonly) -->
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="formData.hiv_status"
                      label="HIV Status"
                      variant="outlined"
                      density="comfortable"
                      readonly
                      :color="getHIVStatusColor(formData.hiv_status)"
                      class="mb-3"
                    />
                  </v-col>

                  <!-- Diagnosis Date (readonly) -->
                  <v-col cols="12" md="6">
                    <v-text-field
                      :model-value="formatDate(formData.diagnosis_date)"
                      label="Diagnosis Date"
                      variant="outlined"
                      density="comfortable"
                      readonly
                      class="mb-3"
                    />
                  </v-col>

                  <!-- Consent Status -->
                  <v-col cols="12">
                    <v-switch
                      v-model="formData.consent"
                      :label="`Data Sharing Consent: ${formData.consent ? 'YES' : 'NO'}`"
                      :readonly="!isEditing"
                      color="success"
                      inset
                      class="mb-3"
                    />
                    <div class="text-caption text-medium-emphasis">
                      By enabling consent, you allow your anonymized data to be used for research purposes.
                    </div>
                  </v-col>
                </v-row>
              </v-form>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <!-- Change Password Dialog -->
    <v-dialog v-model="showPasswordDialog" max-width="500" persistent>
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center bg-primary-lighten-5">
          <span class="text-h6">
            <v-icon color="primary" class="mr-2">mdi-lock-reset</v-icon>
            Change Password
          </span>
          <v-btn icon @click="closePasswordDialog">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <v-divider></v-divider>

        <v-card-text class="pa-4">
          <v-alert
            v-if="passwordError"
            type="error"
            variant="tonal"
            class="mb-4"
            closable
            @click:close="passwordError = null"
          >
            {{ passwordError }}
          </v-alert>

          <v-alert
            v-if="passwordSuccess"
            type="success"
            variant="tonal"
            class="mb-4"
          >
            {{ passwordSuccess }}
          </v-alert>

          <v-form ref="passwordForm" @submit.prevent="changePassword">
            <v-text-field
              v-model="passwordData.current_password"
              label="Current Password"
              :type="showCurrentPassword ? 'text' : 'password'"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-lock"
              :append-inner-icon="showCurrentPassword ? 'mdi-eye-off' : 'mdi-eye'"
              @click:append-inner="showCurrentPassword = !showCurrentPassword"
              :rules="[rules.required]"
              class="mb-3"
              autocomplete="off"
            />

            <v-text-field
              v-model="passwordData.new_password"
              label="New Password"
              :type="showNewPassword ? 'text' : 'password'"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-lock-plus"
              :append-inner-icon="showNewPassword ? 'mdi-eye-off' : 'mdi-eye'"
              @click:append-inner="showNewPassword = !showNewPassword"
              :rules="[rules.required, rules.minLength(6)]"
              class="mb-3"
              autocomplete="off"
            />

            <v-text-field
              v-model="passwordData.confirm_password"
              label="Confirm New Password"
              :type="showConfirmPassword ? 'text' : 'password'"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-lock-check"
              :append-inner-icon="showConfirmPassword ? 'mdi-eye-off' : 'mdi-eye'"
              @click:append-inner="showConfirmPassword = !showConfirmPassword"
              :rules="[
                rules.required,
                v => v === passwordData.new_password || 'Passwords do not match'
              ]"
              class="mb-3"
              autocomplete="off"
            />
          </v-form>
        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn
            color="grey"
            variant="text"
            @click="closePasswordDialog"
            :disabled="passwordLoading"
          >
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            @click="changePassword"
            :loading="passwordLoading"
          >
            Update Password
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { patientApi, authApi } from '@/api'
import { useRouter } from 'vue-router'

const router = useRouter()

// State
const loading = ref(true)
const saving = ref(false)
const error = ref(null)
const successMessage = ref(null)
const isEditing = ref(false)
const profileNotFound = ref(false)

// Password Dialog State
const showPasswordDialog = ref(false)
const passwordLoading = ref(false)
const passwordError = ref(null)
const passwordSuccess = ref(null)
const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)

// Form references
const accountForm = ref(null)
const patientForm = ref(null)
const passwordForm = ref(null)

// Password data
const passwordData = ref({
  current_password: '',
  new_password: '',
  confirm_password: ''
})

// Form data - initialize with default values
const formData = ref({
  username: '',
  email: '',
  patient_id: '',
  first_name: '',
  middle_name: '',
  last_name: '',
  date_of_birth: '',
  age: '',
  sex: '',
  contact_number: '',
  address: '',
  hiv_status: '',
  diagnosis_date: '',
  consent: false
})

// Original data for cancel
const originalData = ref(null)

// Options
const sexOptions = [
  { title: 'Male', value: 'MALE' },
  { title: 'Female', value: 'FEMALE' },
  { title: 'Other', value: 'OTHER' }
]

// Validation rules - FIXED: Email and phone are optional
const rules = {
  required: v => !!v || 'This field is required',
  email: v => {
    if (!v) return true // Email is optional
    return /^\S+@\S+\.\S+$/.test(v) || 'Invalid email address'
  },
  phone: v => {
    if (!v) return true // Phone is optional
    return /^[\d\+\-\(\) ]{10,}$/.test(v) || 'Invalid phone number'
  },
  minLength: len => v => {
    if (!v) return true // Optional
    return v.length >= len || `Minimum ${len} characters`
  },
  match: (val) => v => {
    if (!v) return true // Optional
    return v === val || 'Passwords do not match'
  }
}

// Methods
onMounted(async () => {
  await loadProfile()
})

function logout() {
  localStorage.removeItem('patientToken')
  localStorage.removeItem('patientData')
  localStorage.removeItem('userRole')
  router.push('/patient/login')
}

async function loadProfile() {
  loading.value = true
  error.value = null
  profileNotFound.value = false
  
  try {
    const response = await patientApi.getProfile()
    console.log('API data loaded:', response.data)
    
    const data = response.data?.data || response.data || {}
    
    if (!data || Object.keys(data).length === 0) {
      profileNotFound.value = true
      return
    }
    
    formData.value = {
      username: data.username || '',
      email: data.email || '',
      patient_id: data.patient_facility_code || data.patient_id || '',
      first_name: data.first_name || '',
      middle_name: data.middle_name || '',
      last_name: data.last_name || '',
      date_of_birth: data.date_of_birth ? data.date_of_birth.split('T')[0] : '',
      age: '',
      sex: data.sex || '',
      contact_number: data.contact_number || '',
      address: data.address || '',
      hiv_status: data.hiv_status || '',
      diagnosis_date: data.diagnosis_date || '',
      consent: data.consent === true || data.consent === 1
    }
    
    calculateAgeFromDOB()
    originalData.value = JSON.parse(JSON.stringify(formData.value))
    
    const patientInfo = {
      first_name: data.first_name,
      middle_name: data.middle_name,
      last_name: data.last_name,
      patient_facility_code: data.patient_facility_code,
      patient_id: data.patient_id,
      consent: data.consent
    }
    localStorage.setItem('patientData', JSON.stringify(patientInfo))
    
  } catch (err) {
    console.error('Error loading profile:', err)
    
    if (err.response?.status === 400 || err.response?.status === 404) {
      profileNotFound.value = true
    } else {
      error.value = err.response?.data?.error || 'Failed to load profile. Please try again.'
    }
  } finally {
    loading.value = false
  }
}

function calculateAgeFromDOB() {
  if (!formData.value.date_of_birth) {
    formData.value.age = ''
    return
  }
  
  const today = new Date()
  const birthDate = new Date(formData.value.date_of_birth)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  
  formData.value.age = age
}

function getHIVStatusColor(status) {
  const colors = {
    'REACTIVE': 'error',
    'NON_REACTIVE': 'success',
    'INDETERMINATE': 'warning'
  }
  return colors[status] || 'grey'
}

function formatDate(dateString) {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

function startEditing() {
  isEditing.value = true
}

async function saveProfile() {
  console.log('Saving profile...')
  console.log('Form data:', formData.value)
  
  // Check required fields manually
  const requiredFields = [
    { field: 'username', label: 'Username' },
    { field: 'first_name', label: 'First Name' },
    { field: 'last_name', label: 'Last Name' },
    { field: 'date_of_birth', label: 'Date of Birth' },
    { field: 'sex', label: 'Sex' }
  ]
  
  const missingFields = []
  requiredFields.forEach(item => {
    if (!formData.value[item.field]) {
      missingFields.push(item.label)
    }
  })
  
  if (missingFields.length > 0) {
    error.value = `Please fill in: ${missingFields.join(', ')}`
    return
  }

  saving.value = true
  error.value = null
  successMessage.value = null

  try {
    // Prepare account update data
    const accountData = {
      username: formData.value.username,
      email: formData.value.email || null // Send null if empty
    }

    // Update account info if changed
    if (formData.value.username !== originalData.value?.username || 
        formData.value.email !== originalData.value?.email) {
      console.log('Updating account:', accountData)
      await authApi.updateProfile(accountData)
    }

    // Prepare patient update data
    const patientData = {
      first_name: formData.value.first_name,
      middle_name: formData.value.middle_name || null,
      last_name: formData.value.last_name,
      date_of_birth: formData.value.date_of_birth,
      sex: formData.value.sex,
      contact_number: formData.value.contact_number || null,
      address: formData.value.address || null,
      consent: formData.value.consent ? 1 : 0
    }

    console.log('Updating patient:', patientData)
    await patientApi.updateProfile(patientData)

    // Update localStorage
    const patientInfo = {
      first_name: formData.value.first_name,
      middle_name: formData.value.middle_name,
      last_name: formData.value.last_name,
      patient_facility_code: formData.value.patient_id,
      patient_id: formData.value.patient_id,
      consent: formData.value.consent
    }
    localStorage.setItem('patientData', JSON.stringify(patientInfo))

    successMessage.value = 'Profile updated successfully!'
    isEditing.value = false
    originalData.value = JSON.parse(JSON.stringify(formData.value))
    
  } catch (err) {
    console.error('Error saving profile:', err)
    error.value = err.response?.data?.error || 'Failed to save changes. Please try again.'
  } finally {
    saving.value = false
  }
}

function cancelEditing() {
  formData.value = JSON.parse(JSON.stringify(originalData.value))
  isEditing.value = false
  error.value = null
}

// Password change methods
function closePasswordDialog() {
  showPasswordDialog.value = false
  passwordData.value = {
    current_password: '',
    new_password: '',
    confirm_password: ''
  }
  passwordError.value = null
  passwordSuccess.value = null
  showCurrentPassword.value = false
  showNewPassword.value = false
  showConfirmPassword.value = false
}

async function changePassword() {
  const { valid } = await passwordForm.value?.validate()
  
  if (!valid) return

  passwordLoading.value = true
  passwordError.value = null
  passwordSuccess.value = null

  try {
    const response = await authApi.changePassword({
      current_password: passwordData.value.current_password,
      new_password: passwordData.value.new_password,
      confirm_password: passwordData.value.confirm_password
    })

    console.log('Password change response:', response.data)
    
    passwordSuccess.value = 'Password changed successfully!'
    
    // Clear form
    passwordData.value = {
      current_password: '',
      new_password: '',
      confirm_password: ''
    }
    
    // Close dialog after 2 seconds
    setTimeout(() => {
      closePasswordDialog()
    }, 2000)
    
  } catch (err) {
    console.error('Error changing password:', err)
    passwordError.value = err.response?.data?.error || 'Failed to change password. Please try again.'
  } finally {
    passwordLoading.value = false
  }
}
</script>

<style scoped>
.bg-primary-lighten-5 {
  background-color: rgba(33, 150, 243, 0.05);
}

.gap-2 {
  gap: 8px;
}
</style>