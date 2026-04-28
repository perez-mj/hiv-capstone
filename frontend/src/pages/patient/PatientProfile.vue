<!-- frontend/src/pages/patient/PatientProfile.vue -->
<template>
  <div class="patient-profile">
    <v-card>
      <v-card-title class="d-flex justify-space-between align-center">
        <span>My Profile</span>
        <v-btn v-if="!isEditing" color="primary" variant="text" @click="startEdit">
          <v-icon left>mdi-pencil</v-icon>
          Edit Profile
        </v-btn>
      </v-card-title>

      <v-card-text>
        <v-form v-model="formValid" @submit.prevent="saveProfile">
          <!-- Avatar -->
          <div class="text-center mb-4">
            <v-avatar size="100" color="primary">
              <v-icon size="56" color="white">mdi-account-circle</v-icon>
            </v-avatar>
            <div class="text-h6 mt-2">{{ patientName }}</div>
            <div class="text-caption text-medium-emphasis">Patient ID: {{ patientCode }}</div>
          </div>

          <v-divider class="my-4"></v-divider>

          <!-- Personal Information -->
          <div class="text-subtitle-1 font-weight-bold mb-3">Personal Information</div>
          <v-row>
            <v-col cols="12" md="4">
              <v-text-field v-model="formData.first_name" label="First Name" :readonly="!isEditing"
                :rules="[v => !!v || 'Required']" variant="outlined" density="compact"></v-text-field>
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model="formData.middle_name" label="Middle Name" :readonly="!isEditing"
                variant="outlined" density="compact"></v-text-field>
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model="formData.last_name" label="Last Name" :readonly="!isEditing"
                :rules="[v => !!v || 'Required']" variant="outlined" density="compact"></v-text-field>
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="12" md="6">
              <v-text-field v-model="formData.date_of_birth" label="Date of Birth" type="date"
                :readonly="!isEditing" :rules="[v => !!v || 'Required']" variant="outlined" density="compact"></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-select v-model="formData.sex" :items="sexOptions" label="Sex"
                :readonly="!isEditing" :rules="[v => !!v || 'Required']" variant="outlined" density="compact"></v-select>
            </v-col>
          </v-row>

          <!-- Contact Information -->
          <div class="text-subtitle-1 font-weight-bold mt-4 mb-3">Contact Information</div>
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field v-model="formData.contact_number" label="Contact Number"
                :readonly="!isEditing" variant="outlined" density="compact"
                placeholder="+1234567890"></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="formData.email" label="Email" type="email"
                :readonly="!isEditing" variant="outlined" density="compact"
                :rules="[v => !v || /.+@.+\..+/.test(v) || 'Invalid email']"></v-text-field>
            </v-col>
          </v-row>

          <v-textarea v-model="formData.address" label="Address" :readonly="!isEditing"
            rows="3" variant="outlined" density="compact"></v-textarea>

          <!-- Medical Information (Read-only) -->
          <v-divider class="my-4"></v-divider>
          <div class="text-subtitle-1 font-weight-bold mb-3">Medical Information</div>
          
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field v-model="formData.hiv_status" label="HIV Status" readonly
                variant="outlined" density="compact" :color="getHIVStatusColor()"></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="formData.diagnosis_date" label="Diagnosis Date"
                readonly variant="outlined" density="compact"></v-text-field>
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="12" md="6">
              <v-text-field v-model="formData.art_start_date" label="ART Start Date"
                readonly variant="outlined" density="compact"></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="formData.latest_cd4_count" label="Latest CD4 Count"
                readonly variant="outlined" density="compact"></v-text-field>
            </v-col>
          </v-row>

          <!-- Action Buttons -->
          <v-row v-if="isEditing" class="mt-4">
            <v-col cols="6">
              <v-btn block variant="outlined" @click="cancelEdit">Cancel</v-btn>
            </v-col>
            <v-col cols="6">
              <v-btn block color="primary" type="submit" :loading="saving" :disabled="!formValid">
                Save Changes
              </v-btn>
            </v-col>
          </v-row>
        </v-form>

        <!-- Account Actions -->
        <v-divider class="my-4"></v-divider>
        <div class="d-flex flex-wrap gap-3">
          <v-btn color="primary" variant="outlined" to="/patient/change-password">
            <v-icon left>mdi-lock-reset</v-icon>
            Change Password
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- Loading Overlay -->
    <v-overlay v-model="loading" class="align-center justify-center">
      <v-progress-circular indeterminate size="48" color="primary"></v-progress-circular>
    </v-overlay>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useSnackbarStore } from '@/stores/snackbar'
import http from '@/api/http'

const authStore = useAuthStore()
const snackbarStore = useSnackbarStore()

// State
const loading = ref(true)
const saving = ref(false)
const isEditing = ref(false)
const formValid = ref(false)
const profile = ref(null)

// Form data
const formData = ref({
  first_name: '',
  middle_name: '',
  last_name: '',
  date_of_birth: '',
  sex: '',
  contact_number: '',
  address: '',
  email: '',
  hiv_status: '',
  diagnosis_date: '',
  art_start_date: '',
  latest_cd4_count: ''
})

const sexOptions = ['MALE', 'FEMALE', 'OTHER']

// Computed
const patientName = computed(() => {
  if (profile.value) {
    return `${profile.value.first_name || ''} ${profile.value.last_name || ''}`.trim()
  }
  return authStore.patientName
})

const patientCode = computed(() => profile.value?.patient_facility_code || '')

// Methods
const getHIVStatusColor = () => {
  const status = formData.value.hiv_status
  if (status === 'REACTIVE') return 'error'
  if (status === 'NON_REACTIVE') return 'success'
  return 'warning'
}

const loadProfile = async () => {
  loading.value = true
  try {
    const res = await http.get('/patients/me/profile')
    const data = res.data || res
    profile.value = data
    
    formData.value = {
      first_name: data.first_name || '',
      middle_name: data.middle_name || '',
      last_name: data.last_name || '',
      date_of_birth: data.date_of_birth ? data.date_of_birth.split('T')[0] : '',
      sex: data.sex || '',
      contact_number: data.contact_number || '',
      address: data.address || '',
      email: data.user_email || data.email || '',
      hiv_status: data.hiv_status || '',
      diagnosis_date: data.diagnosis_date || '',
      art_start_date: data.art_start_date || '',
      latest_cd4_count: data.latest_cd4_count || ''
    }
  } catch (error) {
    console.error('Failed to load profile:', error)
    snackbarStore.showError('Failed to load profile data')
  } finally {
    loading.value = false
  }
}

const startEdit = () => {
  isEditing.value = true
}

const cancelEdit = () => {
  isEditing.value = false
  // Reload original data
  loadProfile()
}

const saveProfile = async () => {
  if (!formValid.value) return
  
  saving.value = true
  try {
    await http.put('/patients/me/profile', {
      first_name: formData.value.first_name,
      middle_name: formData.value.middle_name,
      last_name: formData.value.last_name,
      date_of_birth: formData.value.date_of_birth,
      sex: formData.value.sex,
      contact_number: formData.value.contact_number,
      address: formData.value.address
    })
    
    snackbarStore.showSuccess('Profile updated successfully')
    isEditing.value = false
    await loadProfile()
    
    // Update auth store user name
    authStore.user = {
      ...authStore.user,
      first_name: formData.value.first_name,
      last_name: formData.value.last_name
    }
    localStorage.setItem('authUser', JSON.stringify(authStore.user))
    
  } catch (error) {
    snackbarStore.showError(error.response?.data?.error || 'Failed to update profile')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadProfile()
})
</script>

<style scoped>
.patient-profile {
  max-width: 800px;
  margin: 0 auto;
}

.gap-3 {
  gap: 12px;
}
</style>