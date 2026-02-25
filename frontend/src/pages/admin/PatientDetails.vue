<!-- frontend/src/pages/admin/PatientDetails.vue -->
<template>
  <v-container fluid class="pa-4 pa-md-6">
    <!-- Header with Back Button -->
    <div class="d-flex align-center mb-4">
      <v-btn icon="mdi-arrow-left" variant="text" size="small" @click="goBack" class="mr-2"
        :style="{ color: 'var(--color-text-secondary)' }" />
      <div>
        <h1 class="text-h5 font-weight-bold" :style="{ color: 'var(--color-primary)' }">
          Patient Details
        </h1>
        <p class="text-body-2 text-medium-emphasis mt-1">
          View and manage patient information
        </p>
      </div>

      <!-- Action Buttons -->
      <v-spacer />
      <div class="d-flex gap-2">
        <v-btn variant="outlined" size="small" prepend-icon="mdi-pencil" @click="editPatient" :disabled="loading"
          :style="{ borderColor: 'var(--color-border)' }">
          Edit
        </v-btn>
        <v-btn variant="outlined" size="small" prepend-icon="mdi-history" @click="viewHistory" :disabled="loading"
          :style="{ borderColor: 'var(--color-border)' }">
          History
        </v-btn>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="d-flex justify-center py-8">
      <v-progress-circular indeterminate color="primary" :size="40" />
    </div>

    <!-- Error State -->
    <v-alert v-else-if="error" type="error" variant="tonal" class="mb-4"
      :style="{ backgroundColor: 'var(--color-error-light)', color: 'var(--color-error-dark)' }">
      {{ error }}
      <template v-slot:append>
        <v-btn color="error" size="small" variant="text" @click="loadPatientData">
          Retry
        </v-btn>
      </template>
    </v-alert>

    <!-- Patient Details Content -->
    <template v-else-if="patient">
      <!-- Patient ID Banner -->
      <v-card class="mb-4" elevation="0" border
        :style="{ borderColor: 'var(--color-border)', borderRadius: 'var(--radius-md)' }">
        <v-card-text class="pa-4">
          <div class="d-flex flex-wrap align-center justify-space-between">
            <div class="d-flex align-center">
              <v-avatar size="48" color="primary" class="mr-3">
                <span class="text-h6 text-white">
                  {{ patient.first_name?.charAt(0) || '' }}{{ patient.last_name?.charAt(0) || '' }}
                </span>
              </v-avatar>
              <div>
                <div class="text-h6 font-weight-bold">
                  {{ patient.last_name || '' }}, {{ patient.first_name || '' }}
                  <span v-if="patient.middle_name">{{ patient.middle_name }}</span>
                </div>
                <div class="d-flex flex-wrap gap-3 mt-1">
                  <span class="text-caption text-medium-emphasis">
                    <span class="font-weight-medium">ID:</span>
                    <span :style="{ color: 'var(--color-info)' }">{{ patient.patient_facility_code || '—' }}</span>
                  </span>
                  <span class="text-caption text-medium-emphasis">
                    <span class="font-weight-medium">DOB:</span> {{ formatDate(patient.date_of_birth) }}
                  </span>
                  <span class="text-caption text-medium-emphasis">
                    <span class="font-weight-medium">Age:</span> {{ patient.age || calculateAge(patient.date_of_birth)
                    }} years
                  </span>
                </div>
              </div>
            </div>

            <!-- User Account Status -->
            <div v-if="userAccount" class="mt-2 mt-sm-0">
              <v-menu>
                <template v-slot:activator="{ props }">
                  <v-chip v-bind="props" size="small" :color="userAccount.is_active ? 'success' : 'error'"
                    variant="flat" :prepend-icon="userAccount.is_active ? 'mdi-check-circle' : 'mdi-close-circle'"
                    class="cursor-pointer">
                    {{ userAccount.is_active ? 'Account Active' : 'Account Inactive' }}
                  </v-chip>
                </template>
                <v-card min-width="300">
                  <v-card-title class="text-subtitle-2 pa-3">
                    User Account Details
                  </v-card-title>
                  <v-divider />
                  <v-card-text class="pa-3">
                    <div class="text-body-2 mb-1"><strong>Username:</strong> {{ userAccount.username || '—' }}</div>
                    <div class="text-body-2 mb-1"><strong>Email:</strong> {{ userAccount.email || '—' }}</div>
                    <div class="text-body-2 mb-1"><strong>Role:</strong> {{ userAccount.role || '—' }}</div>
                    <div class="text-body-2"><strong>Last Login:</strong> {{ formatDateTime(userAccount.last_login) }}
                    </div>
                  </v-card-text>
                  <v-card-actions class="pa-3 pt-0">
                    <v-spacer />
                    <v-btn size="small" color="warning" variant="text" @click="openManageAccountDialog">
                      Manage
                    </v-btn>
                  </v-card-actions>
                </v-card>
              </v-menu>
            </div>
            <div v-else class="mt-2 mt-sm-0">
              <v-btn size="small" color="primary" prepend-icon="mdi-account-plus" @click="openCreateAccountDialog"
                :loading="checkingAccount" :style="{ backgroundColor: 'var(--color-primary)' }">
                Create Account
              </v-btn>
            </div>
          </div>
        </v-card-text>
      </v-card>

      <!-- Main Content Grid -->
      <v-row>
        <!-- Left Column - Personal Information -->
        <v-col cols="12" md="6">
          <v-card elevation="0" border class="h-100"
            :style="{ borderColor: 'var(--color-border)', borderRadius: 'var(--radius-md)' }">
            <v-card-title class="py-3 px-4 text-subtitle-1 font-weight-medium">
              Personal Information
            </v-card-title>
            <v-divider :style="{ borderColor: 'var(--color-divider)' }" />
            <v-card-text class="pa-4">
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label text-caption text-medium-emphasis">Sex</div>
                  <div class="info-value">{{ formatSex(patient.sex) }}</div>
                </div>
                <div class="info-item">
                  <div class="info-label text-caption text-medium-emphasis">Contact Number</div>
                  <div class="info-value">{{ patient.contact_number || '—' }}</div>
                </div>
                <div class="info-item full-width">
                  <div class="info-label text-caption text-medium-emphasis">Address</div>
                  <div class="info-value">{{ patient.address || '—' }}</div>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Right Column - Medical Information -->
        <v-col cols="12" md="6">
          <v-card elevation="0" border class="h-100"
            :style="{ borderColor: 'var(--color-border)', borderRadius: 'var(--radius-md)' }">
            <v-card-title class="py-3 px-4 text-subtitle-1 font-weight-medium">
              Medical Information
            </v-card-title>
            <v-divider :style="{ borderColor: 'var(--color-divider)' }" />
            <v-card-text class="pa-4">
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label text-caption text-medium-emphasis">HIV Status</div>
                  <div>
                    <v-chip size="small" :color="getHivStatusColor(patient.hiv_status)" variant="flat"
                      :prepend-icon="getHivStatusIcon(patient.hiv_status)">
                      {{ formatHivStatus(patient.hiv_status) }}
                    </v-chip>
                  </div>
                </div>
                <div class="info-item">
                  <div class="info-label text-caption text-medium-emphasis">Diagnosis Date</div>
                  <div class="info-value">{{ formatDate(patient.diagnosis_date) || '—' }}</div>
                </div>
                <div class="info-item">
                  <div class="info-label text-caption text-medium-emphasis">ART Start Date</div>
                  <div class="info-value">{{ formatDate(patient.art_start_date) || '—' }}</div>
                </div>
                <div class="info-item">
                  <div class="info-label text-caption text-medium-emphasis">Latest CD4 Count</div>
                  <div class="info-value">{{ patient.latest_cd4_count ? patient.latest_cd4_count + ' cells/mm³' : '—' }}
                  </div>
                </div>
                <div class="info-item">
                  <div class="info-label text-caption text-medium-emphasis">Latest Viral Load</div>
                  <div class="info-value">{{ patient.latest_viral_load ? patient.latest_viral_load + ' copies/mL' : '—'
                    }}
                  </div>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Quick Stats Cards -->
      <v-row class="mt-2">
        <v-col cols="12" sm="6" md="3" v-for="stat in quickStats" :key="stat.label">
          <v-card elevation="0" border
            :style="{ borderColor: 'var(--color-border)', borderRadius: 'var(--radius-md)' }">
            <v-card-text class="pa-3 d-flex align-center">
              <v-avatar size="40" :color="stat.color" class="mr-3">
                <v-icon :icon="stat.icon" size="24" color="white"></v-icon>
              </v-avatar>
              <div>
                <div class="text-h6 font-weight-bold">{{ stat.value }}</div>
                <div class="text-caption text-medium-emphasis">{{ stat.label }}</div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <!-- Create Account Dialog - Fixed Design -->
    <v-dialog v-model="showAccountDialog" max-width="500px" persistent>
      <v-card class="dialog-card">
        <v-card-title class="dialog-title pa-4">
          <div class="d-flex align-center">
            <v-avatar size="32" color="primary" class="mr-3">
              <v-icon icon="mdi-account-plus" size="20" color="white" />
            </v-avatar>
            <span class="text-h6 font-weight-medium">Create Patient Account</span>
          </div>
          <v-btn icon="mdi-close" variant="text" size="small" @click="showAccountDialog = false"
            :disabled="accountLoading" />
        </v-card-title>

        <v-divider />

        <v-card-text class="pa-4">
          <v-form ref="accountFormRef" v-model="accountFormValid" @submit.prevent="saveAccount">
            <!-- Auto-generated Username Field -->
            <div class="mb-4">
              <div class="text-subtitle-2 mb-2">Username</div>
              <div class="d-flex align-center gap-2">
                <v-text-field v-model="accountFormData.username" density="comfortable" variant="outlined"
                  placeholder="Enter username" hide-details="auto" :rules="usernameRules" class="flex-grow-1" />
                <v-btn size="large" color="primary" variant="tonal" @click="generateUsername" :disabled="accountLoading"
                  class="generate-btn">
                  <v-icon left>mdi-auto-fix</v-icon>
                  Generate
                </v-btn>
              </div>
              <div class="text-caption text-medium-emphasis mt-1">
                Username will be used for patient login
              </div>
            </div>

            <!-- Email Field -->
            <div class="mb-4">
              <div class="text-subtitle-2 mb-2">Email Address</div>
              <v-text-field v-model="accountFormData.email" type="email" density="comfortable" variant="outlined"
                placeholder="patient@example.com" hide-details="auto" :rules="emailRules" />
            </div>

            <!-- Password Field -->
            <div class="mb-4">
              <div class="text-subtitle-2 mb-2">Password</div>
              <v-text-field v-model="accountFormData.password" type="password" density="comfortable" variant="outlined"
                placeholder="Enter password" hide-details="auto" :rules="passwordRules"
                @update:model-value="validatePasswordMatch" />

              <!-- Password Strength Indicator -->
              <div v-if="accountFormData.password" class="mt-2">
                <div class="d-flex align-center mb-1">
                  <span class="text-caption mr-2">Password strength:</span>
                  <v-chip size="x-small" :color="passwordStrength.color" variant="flat">
                    {{ passwordStrength.label }}
                  </v-chip>
                </div>
                <v-progress-linear :model-value="passwordStrength.score * 25" :color="passwordStrength.color" height="6"
                  rounded />
              </div>
            </div>

            <!-- Confirm Password Field -->
            <div class="mb-2">
              <div class="text-subtitle-2 mb-2">Confirm Password</div>
              <v-text-field v-model="accountFormData.confirmPassword" type="password" density="comfortable"
                variant="outlined" placeholder="Re-enter password" hide-details="auto" :rules="confirmPasswordRules" />
            </div>
          </v-form>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="outlined" size="large" @click="showAccountDialog = false" :disabled="accountLoading"
            class="cancel-btn">
            Cancel
          </v-btn>
          <v-btn color="primary" size="large" :loading="accountLoading" @click="saveAccount"
            :disabled="!accountFormValid || accountLoading" class="save-btn">
            Create Account
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Manage Account Dialog - Fixed Design -->
    <v-dialog v-model="showManageDialog" max-width="500px" persistent>
      <v-card class="dialog-card">
        <v-card-title class="dialog-title pa-4">
          <div class="d-flex align-center">
            <v-avatar size="32" color="warning" class="mr-3">
              <v-icon icon="mdi-account-cog" size="20" color="white" />
            </v-avatar>
            <span class="text-h6 font-weight-medium">Manage Account</span>
          </div>
          <v-btn icon="mdi-close" variant="text" size="small" @click="showManageDialog = false"
            :disabled="accountLoading" />
        </v-card-title>

        <v-divider />

        <v-card-text class="pa-4">
          <v-form ref="manageFormRef" v-model="manageFormValid" @submit.prevent="updateAccount">
            <!-- Username (readonly) -->
            <div class="mb-4">
              <div class="text-subtitle-2 mb-2">Username</div>
              <v-text-field v-model="manageFormData.username" density="comfortable" variant="outlined" readonly
                hide-details bg-color="grey-lighten-2" />
            </div>

            <!-- Email Field -->
            <div class="mb-4">
              <div class="text-subtitle-2 mb-2">Email Address</div>
              <v-text-field v-model="manageFormData.email" type="email" density="comfortable" variant="outlined"
                placeholder="patient@example.com" hide-details="auto" :rules="emailRules" />
            </div>

            <!-- Status Toggle -->
            <div class="mb-4">
              <div class="text-subtitle-2 mb-2">Account Status</div>
              <v-select v-model="manageFormData.is_active" :items="statusOptions" item-title="title" item-value="value"
                density="comfortable" variant="outlined" hide-details
                :bg-color="manageFormData.is_active ? 'bg-success-lighten-5' : 'bg-error-lighten-5'">
                <template v-slot:item="{ props, item }">
                  <v-list-item v-bind="props">
                    <template v-slot:prepend>
                      <v-icon :color="item.raw.color" :icon="item.raw.icon" />
                    </template>
                    <v-list-item-title>{{ item.raw.title }}</v-list-item-title>
                  </v-list-item>
                </template>
                <template v-slot:selection="{ item }">
                  <div class="d-flex align-center">
                    <v-icon :color="item.raw.color" :icon="item.raw.icon" size="small" class="mr-2" />
                    <span>{{ item.raw.title }}</span>
                  </div>
                </template>
              </v-select>
            </div>

            <!-- Danger Zone -->
            <v-divider class="my-4" />
            <div class="text-subtitle-2 text-error mb-3 d-flex align-center">
              <v-icon icon="mdi-alert-circle" size="small" class="mr-1" color="error" />
              Danger Zone
            </div>

            <v-btn block color="warning" variant="tonal" prepend-icon="mdi-lock-reset" @click="resetPassword"
              :loading="resetPasswordLoading" size="large" class="reset-btn">
              Reset Password
            </v-btn>
          </v-form>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="outlined" size="large" @click="showManageDialog = false" :disabled="accountLoading"
            class="cancel-btn">
            Cancel
          </v-btn>
          <v-btn color="warning" size="large" :loading="accountLoading" @click="updateAccount"
            :disabled="!manageFormValid || accountLoading" class="save-btn">
            Update Account
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Password Reset Dialog - Fixed Design -->
    <v-dialog v-model="showResetDialog" max-width="450px" persistent>
      <v-card class="dialog-card">
        <v-card-title class="dialog-title pa-4">
          <div class="d-flex align-center">
            <v-avatar size="32" color="warning" class="mr-3">
              <v-icon icon="mdi-lock-reset" size="20" color="white" />
            </v-avatar>
            <span class="text-h6 font-weight-medium">Reset Password</span>
          </div>
          <v-btn icon="mdi-close" variant="text" size="small" @click="showResetDialog = false"
            :disabled="resetPasswordLoading" />
        </v-card-title>

        <v-divider />

        <v-card-text class="pa-4">
          <v-form ref="resetFormRef" v-model="resetFormValid" @submit.prevent="confirmResetPassword">
            <!-- New Password -->
            <div class="mb-4">
              <div class="text-subtitle-2 mb-2">New Password</div>
              <v-text-field v-model="resetFormData.password" type="password" density="comfortable" variant="outlined"
                placeholder="Enter new password" hide-details="auto" :rules="passwordRules"
                @update:model-value="validateResetPasswordMatch" />

              <!-- Password Strength Indicator -->
              <div v-if="resetFormData.password" class="mt-2">
                <div class="d-flex align-center mb-1">
                  <span class="text-caption mr-2">Password strength:</span>
                  <v-chip size="x-small" :color="resetPasswordStrength.color" variant="flat">
                    {{ resetPasswordStrength.label }}
                  </v-chip>
                </div>
                <v-progress-linear :model-value="resetPasswordStrength.score * 25" :color="resetPasswordStrength.color"
                  height="6" rounded />
              </div>
            </div>

            <!-- Confirm Password -->
            <div class="mb-2">
              <div class="text-subtitle-2 mb-2">Confirm Password</div>
              <v-text-field v-model="resetFormData.confirmPassword" type="password" density="comfortable"
                variant="outlined" placeholder="Re-enter new password" hide-details="auto"
                :rules="resetConfirmPasswordRules" />
            </div>

            <div class="text-caption text-medium-emphasis mt-3 pa-3 bg-grey-lighten-4 rounded">
              <v-icon icon="mdi-information" size="small" class="mr-1" color="info" />
              Password must be at least 6 characters long and include a mix of letters, numbers, and symbols for better
              security.
            </div>
          </v-form>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="outlined" size="large" @click="showResetDialog = false" :disabled="resetPasswordLoading"
            class="cancel-btn">
            Cancel
          </v-btn>
          <v-btn color="warning" size="large" :loading="resetPasswordLoading" @click="confirmResetPassword"
            :disabled="!resetFormValid || resetPasswordLoading" class="save-btn">
            Reset Password
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Toast Notifications -->
    <div class="toast-container">
      <transition-group name="toast">
        <div v-for="toast in toasts" :key="toast.id" class="toast" :class="`toast-${toast.type}`"
          @click="removeToast(toast.id)">
          <div class="toast-content">
            <v-icon :icon="toast.icon" size="24" class="mr-3" />
            <div class="toast-message">
              <div class="toast-title">{{ toast.title }}</div>
              <div class="toast-description">{{ toast.message }}</div>
            </div>
          </div>
          <div class="toast-progress" :style="{ animationDuration: `${toast.duration}ms` }" />
        </div>
      </transition-group>
    </div>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { patientsApi, usersApi } from '@/api'

const route = useRoute()
const router = useRouter()

// State
const loading = ref(false)
const checkingAccount = ref(false)
const error = ref('')
const patient = ref(null)
const userAccount = ref(null)

// Form refs
const accountFormRef = ref(null)
const manageFormRef = ref(null)
const resetFormRef = ref(null)

// Toast notifications
const toasts = ref([])
let toastId = 0

// Create account dialog
const showAccountDialog = ref(false)
const accountFormValid = ref(false)
const accountLoading = ref(false)
const accountFormData = ref({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
})

// Manage account dialog
const showManageDialog = ref(false)
const manageFormValid = ref(false)
const manageFormData = ref({
  username: '',
  email: '',
  is_active: true // Use boolean
})

// Password reset dialog
const showResetDialog = ref(false)
const resetFormValid = ref(false)
const resetPasswordLoading = ref(false)
const resetFormData = ref({
  password: '',
  confirmPassword: ''
})

// Validation rules
const usernameRules = [
  v => !!v || 'Username is required',
  v => (v && v.length >= 3) || 'Username must be at least 3 characters',
  v => (v && /^[a-zA-Z0-9._]+$/.test(v)) || 'Username can only contain letters, numbers, dots and underscores'
]

const emailRules = [
  v => !!v || 'Email is required',
  v => /.+@.+\..+/.test(v) || 'Email must be valid'
]

const passwordRules = [
  v => !!v || 'Password is required',
  v => (v && v.length >= 6) || 'Password must be at least 6 characters'
]

const confirmPasswordRules = [
  v => !!v || 'Please confirm password',
  v => v === accountFormData.value.password || 'Passwords do not match'
]

const resetConfirmPasswordRules = [
  v => !!v || 'Please confirm password',
  v => v === resetFormData.value.password || 'Passwords do not match'
]

// Status options for select - use boolean values
const statusOptions = [
  { title: 'Active', value: true, color: 'success', icon: 'mdi-check-circle' },
  { title: 'Inactive', value: false, color: 'error', icon: 'mdi-close-circle' }
]

// Password strength calculator
function calculatePasswordStrength(password) {
  if (!password) return { score: 0, label: 'Very Weak', color: 'error' }
  
  let score = 0
  
  // Length check
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  
  // Character variety checks
  if (/[a-z]/.test(password)) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++
  
  // Cap at 4
  score = Math.min(score, 4)
  
  const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong']
  const colors = ['error', 'warning', 'info', 'success', 'success']
  
  return {
    score,
    label: labels[score],
    color: colors[score]
  }
}

const passwordStrength = computed(() => 
  calculatePasswordStrength(accountFormData.value.password)
)

const resetPasswordStrength = computed(() => 
  calculatePasswordStrength(resetFormData.value.password)
)

// Quick stats computed
const quickStats = computed(() => {
  if (!patient.value) return []
  
  return [
    {
      label: 'Total Appointments',
      value: patient.value.medical_history?.summary?.total_appointments || 0,
      icon: 'mdi-calendar-clock',
      color: 'primary'
    },
    {
      label: 'Lab Results',
      value: patient.value.medical_history?.summary?.total_lab_results || 0,
      icon: 'mdi-flask',
      color: 'success'
    },
    {
      label: 'Clinical Encounters',
      value: patient.value.medical_history?.summary?.total_encounters || 0,
      icon: 'mdi-stethoscope',
      color: 'info'
    },
    {
      label: 'On ART',
      value: patient.value.art_start_date ? 'Yes' : 'No',
      icon: patient.value.art_start_date ? 'mdi-pill' : 'mdi-pill-off',
      color: patient.value.art_start_date ? 'success' : 'warning'
    }
  ]
})

// Toast functions
function showToast(message, type = 'success', duration = 4000) {
  const id = toastId++
  const titles = {
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
    info: 'Information'
  }
  
  const icons = {
    success: 'mdi-check-circle',
    error: 'mdi-alert-circle',
    warning: 'mdi-alert',
    info: 'mdi-information'
  }
  
  toasts.value.push({
    id,
    title: titles[type],
    message,
    type,
    icon: icons[type],
    duration
  })
  
  setTimeout(() => {
    removeToast(id)
  }, duration)
}

function removeToast(id) {
  const index = toasts.value.findIndex(t => t.id === id)
  if (index !== -1) {
    toasts.value.splice(index, 1)
  }
}

// Validation helpers
function validatePasswordMatch() {
  if (accountFormRef.value) {
    accountFormRef.value.validate()
  }
}

function validateResetPasswordMatch() {
  if (resetFormRef.value) {
    resetFormRef.value.validate()
  }
}

// Load patient data
onMounted(async () => {
  await loadPatientData()
})

async function loadPatientData() {
  const patientId = route.params.id
  
  if (!patientId) {
    error.value = 'Patient ID not provided'
    return
  }

  loading.value = true
  error.value = ''

  try {
    // Load patient details
    const response = await patientsApi.getById(patientId)
    
    if (response.data.success) {
      patient.value = response.data.patient
      // Check if patient has user account
      await checkUserAccount()
    } else {
      throw new Error(response.data.error || 'Failed to load patient')
    }
  } catch (err) {
    console.error('Error loading patient:', err)
    error.value = err.response?.data?.error || err.message || 'Failed to load patient details'
    showToast(error.value, 'error')
  } finally {
    loading.value = false
  }
}

async function checkUserAccount() {
  if (!patient.value?.user_id) {
    userAccount.value = null
    return
  }

  checkingAccount.value = true

  try {
    const response = await usersApi.getById(patient.value.user_id)
    if (response.data.success) {
      userAccount.value = response.data.user
    } else {
      userAccount.value = null
    }
  } catch (err) {
    console.error('Error checking user account:', err)
    userAccount.value = null
  } finally {
    checkingAccount.value = false
  }
}

function goBack() {
  router.push('/admin/patients')
}

function editPatient() {
  router.push(`/admin/patients/${patient.value.id}/edit`)
}

function viewHistory() {
  router.push(`/admin/patients/${patient.value.id}/history`)
}

// Account management
function generateUsername() {
  if (!patient.value) return
  
  const firstName = patient.value.first_name?.toLowerCase().replace(/[^a-z]/g, '') || 'user'
  const lastName = patient.value.last_name?.toLowerCase().replace(/[^a-z]/g, '') || 'patient'
  const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  
  accountFormData.value.username = `${firstName}.${lastName}${randomNum}`
}

function openCreateAccountDialog() {
  accountFormData.value = {
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  }
  generateUsername() // Auto-generate username
  showAccountDialog.value = true
  
  // Reset form validation on next tick
  setTimeout(() => {
    if (accountFormRef.value) {
      accountFormRef.value.resetValidation()
    }
  }, 0)
}

function openManageAccountDialog() {
  manageFormData.value = {
    username: userAccount.value?.username || '',
    email: userAccount.value?.email || '',
    is_active: userAccount.value?.is_active || false
  }
  showManageDialog.value = true
  
  // Reset form validation on next tick
  setTimeout(() => {
    if (manageFormRef.value) {
      manageFormRef.value.resetValidation()
    }
  }, 0)
}

async function saveAccount() {
  if (!accountFormRef.value) return
  
  const { valid } = await accountFormRef.value.validate()
  if (!valid) return

  accountLoading.value = true

  try {
    // Create new user account for patient - send is_active as boolean
    const response = await usersApi.create({
      username: accountFormData.value.username,
      email: accountFormData.value.email,
      password: accountFormData.value.password,
      role: 'PATIENT',
      patient_id: patient.value.id,
      is_active: true // Send as boolean
    })
    
    if (response.data.success) {
      // Update patient's user_id in local state
      patient.value.user_id = response.data.user.id
      
      // Refresh user account data
      await checkUserAccount()
      
      showToast('Account created successfully', 'success')
      showAccountDialog.value = false
    }
  } catch (err) {
    console.error('Error creating account:', err)
    showToast(err.response?.data?.error || 'Failed to create account', 'error')
  } finally {
    accountLoading.value = false
  }
}

async function updateAccount() {
  if (!manageFormRef.value) return
  
  const { valid } = await manageFormRef.value.validate()
  if (!valid) return

  accountLoading.value = true

  try {
    const response = await usersApi.update(userAccount.value.id, {
      email: manageFormData.value.email,
      is_active: manageFormData.value.is_active // This is already a boolean
    })
    
    if (response.data.success) {
      // Refresh user account data
      await checkUserAccount()
      
      showToast('Account updated successfully', 'success')
      showManageDialog.value = false
    }
  } catch (err) {
    console.error('Error updating account:', err)
    showToast(err.response?.data?.error || 'Failed to update account', 'error')
  } finally {
    accountLoading.value = false
  }
}

function resetPassword() {
  showManageDialog.value = false
  resetFormData.value = { password: '', confirmPassword: '' }
  showResetDialog.value = true
  
  // Reset form validation on next tick
  setTimeout(() => {
    if (resetFormRef.value) {
      resetFormRef.value.resetValidation()
    }
  }, 0)
}

async function confirmResetPassword() {
  if (!resetFormRef.value) return
  
  const { valid } = await resetFormRef.value.validate()
  if (!valid) return

  resetPasswordLoading.value = true

  try {
    const response = await usersApi.changePassword(userAccount.value.id, {
      password: resetFormData.value.password
    })
    
    if (response.data.success) {
      showToast('Password reset successfully', 'success')
      showResetDialog.value = false
    }
  } catch (err) {
    console.error('Error resetting password:', err)
    showToast(err.response?.data?.error || 'Failed to reset password', 'error')
  } finally {
    resetPasswordLoading.value = false
  }
}

// Utility functions
function formatSex(sex) {
  if (!sex) return '—'
  return sex.charAt(0).toUpperCase() + sex.slice(1).toLowerCase()
}

function formatHivStatus(status) {
  if (!status) return '—'
  const statusMap = {
    'REACTIVE': 'Reactive',
    'NON_REACTIVE': 'Non-Reactive',
    'INDETERMINATE': 'Indeterminate'
  }
  return statusMap[status] || status
}

function getHivStatusColor(status) {
  const colors = {
    'REACTIVE': 'warning',
    'NON_REACTIVE': 'success',
    'INDETERMINATE': 'info'
  }
  return colors[status] || 'grey'
}

function getHivStatusIcon(status) {
  const icons = {
    'REACTIVE': 'mdi-alert',
    'NON_REACTIVE': 'mdi-check',
    'INDETERMINATE': 'mdi-help'
  }
  return icons[status] || 'mdi-help'
}

function calculateAge(dateString) {
  if (!dateString) return '—'
  const today = new Date()
  const birthDate = new Date(dateString)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

function formatDate(dateString) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function formatDateTime(dateString) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
@import '@/styles/variables.css';

.gap-2 {
  gap: var(--spacing-sm);
}

.gap-3 {
  gap: var(--spacing-md);
}

/* Info grid layout */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-md);
}

.info-item {
  display: flex;
  flex-direction: column;
}

.info-item.full-width {
  grid-column: 1 / -1;
}

.info-label {
  margin-bottom: var(--spacing-xs);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.info-value {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

/* Height utilities */
.h-100 {
  height: 100%;
}

.cursor-pointer {
  cursor: pointer;
}

/* Dialog Styles */
.dialog-card {
  border-radius: 16px !important;
  overflow: hidden;
}

.dialog-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-divider);
}

.generate-btn {
  height: 56px !important;
  min-width: 100px !important;
  border-radius: 8px !important;
}

.cancel-btn {
  min-width: 100px !important;
  border-radius: 8px !important;
  border: 1px solid var(--color-border) !important;
}

.save-btn {
  min-width: 140px !important;
  border-radius: 8px !important;
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.2) !important;
}

.reset-btn {
  border-radius: 8px !important;
  height: 48px !important;
}

/* Toast Container and Notifications */
.toast-container {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 12px;
  pointer-events: none;
}

.toast {
  position: relative;
  min-width: 360px;
  max-width: 420px;
  padding: 16px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
  cursor: pointer;
  pointer-events: auto;
  overflow: hidden;
  animation: toast-slide-in 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  border-left: 4px solid;
  transition: transform 0.2s, box-shadow 0.2s;
}

.toast:hover {
  transform: translateX(-4px);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.16);
}

.toast-success {
  border-left-color: var(--color-success);
  background: linear-gradient(135deg, #f0f9f0 0%, #ffffff 100%);
}

.toast-error {
  border-left-color: var(--color-error);
  background: linear-gradient(135deg, #fef2f2 0%, #ffffff 100%);
}

.toast-warning {
  border-left-color: var(--color-warning);
  background: linear-gradient(135deg, #fff7ed 0%, #ffffff 100%);
}

.toast-info {
  border-left-color: var(--color-info);
  background: linear-gradient(135deg, #eff6ff 0%, #ffffff 100%);
}

.toast-content {
  display: flex;
  align-items: flex-start;
  color: var(--color-text-primary);
  position: relative;
  z-index: 1;
}

.toast-message {
  flex: 1;
}

.toast-title {
  font-weight: 600;
  font-size: var(--font-size-sm);
  margin-bottom: 4px;
  color: var(--color-text-primary);
}

.toast-description {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.toast-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background: rgba(0, 0, 0, 0.1);
  animation: toast-progress linear forwards;
}

.toast-success .toast-progress {
  background: var(--color-success);
}

.toast-error .toast-progress {
  background: var(--color-error);
}

.toast-warning .toast-progress {
  background: var(--color-warning);
}

.toast-info .toast-progress {
  background: var(--color-info);
}

@keyframes toast-slide-in {
  from {
    transform: translateX(100%) scale(0.8);
    opacity: 0;
  }

  to {
    transform: translateX(0) scale(1);
    opacity: 1;
  }
}

@keyframes toast-progress {
  from {
    width: 100%;
  }

  to {
    width: 0%;
  }
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.toast-enter-from,
.toast-leave-to {
  transform: translateX(100%) scale(0.8);
  opacity: 0;
}

/* Dark theme support */
:root.dark-theme .toast {
  background: #2d2d2d;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
}

:root.dark-theme .toast-success {
  background: linear-gradient(135deg, #1a3b1a 0%, #2d2d2d 100%);
}

:root.dark-theme .toast-error {
  background: linear-gradient(135deg, #3b1a1a 0%, #2d2d2d 100%);
}

:root.dark-theme .toast-warning {
  background: linear-gradient(135deg, #3b2b1a 0%, #2d2d2d 100%);
}

:root.dark-theme .toast-info {
  background: linear-gradient(135deg, #1a2b3b 0%, #2d2d2d 100%);
}

:root.dark-theme .toast-title {
  color: #ffffff;
}

:root.dark-theme .toast-description {
  color: #b0b0b0;
}

:root.dark-theme .info-value {
  color: var(--color-text-primary);
}

:root.dark-theme .info-label {
  color: var(--color-text-secondary);
}

:root.dark-theme .dialog-card {
  background: var(--color-surface);
}

:root.dark-theme .generate-btn {
  background: var(--color-primary-dark) !important;
}

:root.dark-theme .bg-grey-lighten-4 {
  background-color: #2d2d2d !important;
}

:root.dark-theme .bg-success-lighten-5 {
  background-color: #1a3b1a !important;
}

:root.dark-theme .bg-error-lighten-5 {
  background-color: #3b1a1a !important;
}

.flex-grow-1 {
  flex-grow: 1;
}

/* Background color utilities */
.bg-grey-lighten-4 {
  background-color: #f5f5f5;
}

.bg-success-lighten-5 {
  background-color: #e8f5e9;
}

.bg-error-lighten-5 {
  background-color: #ffebee;
}

.rounded {
  border-radius: 8px;
}
</style>