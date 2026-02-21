<!-- frontend/src/pages/admin/PatientDetails -->
<template>
  <v-container fluid class="pa-4 pa-md-6">
    <!-- Header with Back Button -->
    <div class="d-flex align-center mb-4">
      <v-btn 
        icon="mdi-arrow-left" 
        variant="text" 
        size="small" 
        @click="goBack"
        class="mr-2"
        :style="{ color: 'var(--color-text-secondary)' }"
      />
      <div>
        <h1 class="text-h5 font-weight-bold" :style="{ color: 'var(--color-primary)' }">
          Patient Details
        </h1>
        <p class="text-body-2 text-medium-emphasis mt-1">
          View and manage patient information
        </p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="d-flex justify-center py-8">
      <v-progress-circular indeterminate :color="'primary'" :size="40" />
    </div>

    <!-- Error State -->
    <v-alert 
      v-else-if="error" 
      type="error" 
      variant="tonal" 
      class="mb-4"
      :style="{ backgroundColor: 'var(--color-error-light)', color: 'var(--color-error-dark)' }"
    >
      {{ error }}
    </v-alert>

    <!-- Patient Details Content -->
    <template v-else-if="patient">
      <!-- Patient ID Banner -->
      <v-card 
        class="mb-4" 
        elevation="0" 
        border
        :style="{ borderColor: 'var(--color-border)', borderRadius: 'var(--radius-md)' }"
      >
        <v-card-text class="pa-4">
          <div class="d-flex flex-wrap align-center justify-space-between">
            <div class="d-flex align-center">
              <v-icon 
                icon="mdi-account-circle" 
                size="48" 
                class="mr-3"
                :style="{ color: 'var(--color-primary)' }"
              />
              <div>
                <div class="text-h6 font-weight-bold">{{ patient.last_name }}, {{ patient.first_name }} {{ patient.middle_name || '' }}</div>
                <div class="d-flex flex-wrap gap-3 mt-1">
                  <span class="text-caption text-medium-emphasis">
                    <span class="font-weight-medium">ID:</span> 
                    <span :style="{ color: 'var(--color-info)' }">{{ patient.patient_id }}</span>
                  </span>
                  <span class="text-caption text-medium-emphasis">
                    <span class="font-weight-medium">DOB:</span> {{ formatDate(patient.date_of_birth) }}
                  </span>
                  <span class="text-caption text-medium-emphasis">
                    <span class="font-weight-medium">Age:</span> {{ calculateAge(patient.date_of_birth) }} years
                  </span>
                </div>
              </div>
            </div>
            
            <!-- User Account Status -->
            <div v-if="userAccount" class="mt-2 mt-sm-0">
              <v-chip 
                size="small"
                :color="userAccount.is_active ? 'success' : 'error'"
                variant="flat"
                :prepend-icon="userAccount.is_active ? 'mdi-check-circle' : 'mdi-close-circle'"
              >
                {{ userAccount.is_active ? 'Account Active' : 'Account Inactive' }}
              </v-chip>
            </div>
            <div v-else class="mt-2 mt-sm-0">
              <v-btn
                size="small"
                color="primary"
                prepend-icon="mdi-account-plus"
                @click="openCreateAccountDialog"
                :style="{ backgroundColor: 'var(--color-primary)' }"
              >
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
          <v-card 
            elevation="0" 
            border
            class="h-100"
            :style="{ borderColor: 'var(--color-border)', borderRadius: 'var(--radius-md)' }"
          >
            <v-card-title class="py-3 px-4 text-subtitle-1 font-weight-medium">
              Personal Information
            </v-card-title>
            <v-divider :style="{ borderColor: 'var(--color-divider)' }" />
            <v-card-text class="pa-4">
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label text-caption text-medium-emphasis">Gender</div>
                  <div class="info-value">{{ formatGender(patient.gender) }}</div>
                </div>
                <div class="info-item">
                  <div class="info-label text-caption text-medium-emphasis">Contact Number</div>
                  <div class="info-value">{{ patient.contact_number || '—' }}</div>
                </div>
                <div class="info-item full-width">
                  <div class="info-label text-caption text-medium-emphasis">Address</div>
                  <div class="info-value">{{ patient.address || '—' }}</div>
                </div>
                <div class="info-item">
                  <div class="info-label text-caption text-medium-emphasis">Occupation</div>
                  <div class="info-value">{{ patient.occupation || '—' }}</div>
                </div>
                <div class="info-item">
                  <div class="info-label text-caption text-medium-emphasis">Nationality</div>
                  <div class="info-value">{{ patient.nationality || '—' }}</div>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Right Column - Medical Information -->
        <v-col cols="12" md="6">
          <v-card 
            elevation="0" 
            border
            class="h-100"
            :style="{ borderColor: 'var(--color-border)', borderRadius: 'var(--radius-md)' }"
          >
            <v-card-title class="py-3 px-4 text-subtitle-1 font-weight-medium">
              Medical Information
            </v-card-title>
            <v-divider :style="{ borderColor: 'var(--color-divider)' }" />
            <v-card-text class="pa-4">
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label text-caption text-medium-emphasis">HIV Status</div>
                  <div>
                    <v-chip 
                      size="x-small" 
                      :color="getHivStatusColor(patient.hiv_status)" 
                      variant="flat"
                      :prepend-icon="getHivStatusIcon(patient.hiv_status)"
                    >
                      {{ formatHivStatus(patient.hiv_status) }}
                    </v-chip>
                  </div>
                </div>
                <div class="info-item">
                  <div class="info-label text-caption text-medium-emphasis">Consent</div>
                  <div>
                    <v-chip 
                      size="x-small" 
                      :color="patient.consent ? 'success' : 'error'" 
                      variant="flat"
                      :prepend-icon="patient.consent ? 'mdi-check' : 'mdi-close'"
                    >
                      {{ patient.consent ? 'YES' : 'NO' }}
                    </v-chip>
                  </div>
                </div>
                <div class="info-item">
                  <div class="info-label text-caption text-medium-emphasis">Diagnosis Date</div>
                  <div class="info-value">{{ formatDate(patient.diagnosis_date) }}</div>
                </div>
                <div class="info-item">
                  <div class="info-label text-caption text-medium-emphasis">ART Start Date</div>
                  <div class="info-value">{{ formatDate(patient.art_start_date) }}</div>
                </div>
                <div class="info-item">
                  <div class="info-label text-caption text-medium-emphasis">Latest CD4 Count</div>
                  <div class="info-value">{{ patient.latest_cd4_count || '—' }}</div>
                </div>
                <div class="info-item">
                  <div class="info-label text-caption text-medium-emphasis">Latest Viral Load</div>
                  <div class="info-value">{{ patient.latest_viral_load || '—' }}</div>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Emergency Contact -->
        <v-col cols="12">
          <v-card 
            elevation="0" 
            border
            :style="{ borderColor: 'var(--color-border)', borderRadius: 'var(--radius-md)' }"
          >
            <v-card-title class="py-3 px-4 text-subtitle-1 font-weight-medium">
              Emergency Contact
            </v-card-title>
            <v-divider :style="{ borderColor: 'var(--color-divider)' }" />
            <v-card-text class="pa-4">
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label text-caption text-medium-emphasis">Name</div>
                  <div class="info-value">{{ patient.emergency_contact_name || '—' }}</div>
                </div>
                <div class="info-item">
                  <div class="info-label text-caption text-medium-emphasis">Relationship</div>
                  <div class="info-value">{{ patient.emergency_contact_relationship || '—' }}</div>
                </div>
                <div class="info-item">
                  <div class="info-label text-caption text-medium-emphasis">Contact Number</div>
                  <div class="info-value">{{ patient.emergency_contact_number || '—' }}</div>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- User Account Information (if exists) -->
        <v-col v-if="userAccount" cols="12">
          <v-card 
            elevation="0" 
            border
            :style="{ borderColor: 'var(--color-border)', borderRadius: 'var(--radius-md)' }"
          >
            <v-card-title class="py-3 px-4 d-flex justify-space-between align-center">
              <span class="text-subtitle-1 font-weight-medium">User Account</span>
              <v-btn
                size="x-small"
                color="warning"
                variant="text"
                prepend-icon="mdi-cog"
                @click="openManageAccountDialog"
              >
                Manage
              </v-btn>
            </v-card-title>
            <v-divider :style="{ borderColor: 'var(--color-divider)' }" />
            <v-card-text class="pa-4">
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label text-caption text-medium-emphasis">Username</div>
                  <div class="info-value">{{ userAccount.username }}</div>
                </div>
                <div class="info-item">
                  <div class="info-label text-caption text-medium-emphasis">Email</div>
                  <div class="info-value">{{ userAccount.email }}</div>
                </div>
                <div class="info-item">
                  <div class="info-label text-caption text-medium-emphasis">Role</div>
                  <div class="info-value">{{ userAccount.role }}</div>
                </div>
                <div class="info-item">
                  <div class="info-label text-caption text-medium-emphasis">Last Login</div>
                  <div class="info-value">{{ formatDateTime(userAccount.last_login) }}</div>
                </div>
                <div class="info-item">
                  <div class="info-label text-caption text-medium-emphasis">Created</div>
                  <div class="info-value">{{ formatDate(userAccount.created_at) }}</div>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Bottom Actions -->
      <div class="d-flex justify-end gap-2 mt-4">
        <v-btn 
          variant="outlined" 
          size="small"
          prepend-icon="mdi-pencil"
          @click="editPatient"
          :style="{ borderColor: 'var(--color-border)' }"
        >
          Edit Details
        </v-btn>
        <v-btn 
          variant="outlined" 
          size="small"
          prepend-icon="mdi-history"
          @click="viewHistory"
          :style="{ borderColor: 'var(--color-border)' }"
        >
          View History
        </v-btn>
      </div>
    </template>

    <!-- Dialogs -->
    <v-dialog v-model="showAccountDialog" max-width="500px">
      <v-card :style="{ borderRadius: 'var(--radius-md)' }">
        <v-card-title class="pa-4 text-subtitle-1 font-weight-medium">
          {{ accountDialogMode === 'create' ? 'Create Patient Account' : 'Manage Account' }}
        </v-card-title>
        <v-divider :style="{ borderColor: 'var(--color-divider)' }" />
        <v-card-text class="pa-4">
          <v-form ref="accountForm" v-model="accountFormValid">
            <v-text-field
              v-model="accountForm.username"
              label="Username"
              density="compact"
              variant="outlined"
              :rules="[v => !!v || 'Username is required']"
              class="mb-3"
            />
            <v-text-field
              v-model="accountForm.email"
              label="Email"
              type="email"
              density="compact"
              variant="outlined"
              :rules="[
                v => !!v || 'Email is required',
                v => /.+@.+\..+/.test(v) || 'Email must be valid'
              ]"
              class="mb-3"
            />
            <v-text-field
              v-if="accountDialogMode === 'create'"
              v-model="accountForm.password"
              label="Password"
              type="password"
              density="compact"
              variant="outlined"
              :rules="[v => !!v || 'Password is required']"
              class="mb-3"
            />
            <v-select
              v-model="accountForm.is_active"
              :items="[
                { title: 'Active', value: 1 },
                { title: 'Inactive', value: 0 }
              ]"
              label="Status"
              density="compact"
              variant="outlined"
              class="mb-3"
            />
          </v-form>
        </v-card-text>
        <v-divider :style="{ borderColor: 'var(--color-divider)' }" />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn 
            variant="text" 
            size="small"
            @click="showAccountDialog = false"
          >
            Cancel
          </v-btn>
          <v-btn 
            color="primary" 
            size="small"
            :loading="accountLoading"
            @click="saveAccount"
            :style="{ backgroundColor: 'var(--color-primary)' }"
          >
            {{ accountDialogMode === 'create' ? 'Create' : 'Update' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar 
      v-model="snackbar.show" 
      :color="snackbar.color" 
      timeout="3000"
      :style="{ backgroundColor: `var(--color-${snackbar.color})` }"
    >
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { patientsApi, usersApi } from '@/api'

const route = useRoute()
const router = useRouter()

// State
const loading = ref(false)
const error = ref('')
const patient = ref(null)
const userAccount = ref(null)

// Account dialog
const showAccountDialog = ref(false)
const accountDialogMode = ref('create')
const accountFormValid = ref(false)
const accountLoading = ref(false)
const accountForm = ref({
  username: '',
  email: '',
  password: '',
  is_active: 1
})

// Snackbar
const snackbar = ref({
  show: false,
  message: '',
  color: 'success'
})

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
    const patientResponse = await patientsApi.getById(patientId)
    patient.value = patientResponse.data.patient

    // Check if patient has user account
    await checkUserAccount()
  } catch (err) {
    console.error('Error loading patient:', err)
    error.value = err.response?.data?.message || 'Failed to load patient details'
  } finally {
    loading.value = false
  }
}

async function checkUserAccount() {
  try {
    const response = await usersApi.getAll()
    const users = response.data.users || []
    
    // Find user account linked to this patient
    userAccount.value = users.find(u => 
      u.role === 'PATIENT' && 
      u.patient?.patient_id === patient.value?.patient_id
    )
  } catch (err) {
    console.error('Error checking user account:', err)
  }
}

function goBack() {
  router.push('/admin/patients')
}

function editPatient() {
  router.push(`/admin/patients/${patient.value.patient_id}/edit`)
}

function viewHistory() {
  router.push(`/admin/patients/${patient.value.patient_id}/history`)
}

// Account management
function openCreateAccountDialog() {
  accountDialogMode.value = 'create'
  accountForm.value = {
    username: '',
    email: '',
    password: '',
    is_active: 1
  }
  showAccountDialog.value = true
}

function openManageAccountDialog() {
  accountDialogMode.value = 'manage'
  accountForm.value = {
    username: userAccount.value.username,
    email: userAccount.value.email,
    is_active: userAccount.value.is_active
  }
  showAccountDialog.value = true
}

async function saveAccount() {
  if (!accountFormValid.value) return

  accountLoading.value = true

  try {
    if (accountDialogMode.value === 'create') {
      // Create new user account for patient
      await usersApi.create({
        username: accountForm.value.username,
        email: accountForm.value.email,
        password: accountForm.value.password,
        role: 'PATIENT',
        patient_id: patient.value.patient_id,
        is_active: accountForm.value.is_active
      })
      showSnackbar('Account created successfully')
    } else {
      // Update existing account
      await usersApi.update(userAccount.value.id, {
        email: accountForm.value.email,
        is_active: accountForm.value.is_active
      })
      showSnackbar('Account updated successfully')
    }

    showAccountDialog.value = false
    await checkUserAccount() // Refresh user account data
  } catch (err) {
    console.error('Error saving account:', err)
    showSnackbar(err.response?.data?.message || 'Failed to save account', 'error')
  } finally {
    accountLoading.value = false
  }
}

// Utility functions
function formatGender(gender) {
  if (!gender) return '—'
  return gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase()
}

function formatHivStatus(status) {
  if (!status) return '—'
  return status === 'REACTIVE' ? 'Reactive' : 'Non-Reactive'
}

function getHivStatusColor(status) {
  return status === 'REACTIVE' ? 'warning' : 'success'
}

function getHivStatusIcon(status) {
  return status === 'REACTIVE' ? 'mdi-alert' : 'mdi-check'
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

function showSnackbar(message, color = 'success') {
  snackbar.value = { show: true, message, color }
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

.compact-field :deep(.v-field) {
  font-size: var(--font-size-sm);
}

.compact-field :deep(.v-field__input) {
  min-height: 36px;
  padding-top: 0;
  padding-bottom: 0;
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

/* Dark theme support */
:root.dark-theme .info-value {
  color: var(--color-text-primary);
}
</style>