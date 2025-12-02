<template>
  <v-container class="fill-height" fluid>
    <v-row justify="center" align="center">
      <v-col cols="12" sm="8" md="6" lg="4">
        <v-card elevation="4" class="pa-6">
          <v-card-title class="text-center text-h4 font-weight-bold text-primary mb-4">
            Patient Portal
          </v-card-title>

          <v-card-subtitle class="text-center text-body-1 mb-6">
            Access your health records and appointments
          </v-card-subtitle>

          <v-form @submit.prevent="login" ref="form">
            <v-text-field v-model="credentials.patient_id" label="Patient ID" variant="outlined"
              :rules="[v => !!v || 'Patient ID is required']" class="mb-4" />

            <v-text-field v-model="credentials.password" label="Password" type="password" variant="outlined"
              :rules="[v => !!v || 'Password is required']" class="mb-4" />

            <v-btn type="submit" color="primary" size="large" block :loading="loading">
              Login to Patient Portal
            </v-btn>
          </v-form>

          <v-alert v-if="error" type="error" variant="tonal" class="mt-4">
            {{ error }}
          </v-alert>

          <div class="text-center mt-4">
            <router-link to="/forgot-password" class="text-primary text-decoration-none">
              Forgot your password?
            </router-link>
          </div>

          <!-- Add to your PatientLogin.vue -->
          <v-expansion-panels variant="accordion" class="mt-4">
            <v-expansion-panel elevation="0">
              <v-expansion-panel-title class="text-caption">
                <v-icon start size="small">mdi-information</v-icon>
                Demo Instructions
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <v-list density="compact" class="pa-0">
                  <v-list-item class="px-0">
                    <v-list-item-title class="text-caption">
                      <strong>Patient ID:</strong> Use any enrolled patient ID
                    </v-list-item-title>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-title class="text-caption">
                      <strong>Password:</strong> Use the same as Patient ID or 'patient123'
                    </v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<!-- In your PatientLogin.vue -->
<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePatientAuthStore } from '@/stores/patientAuth'

const router = useRouter()
const patientAuthStore = usePatientAuthStore()
const loading = ref(false)
const error = ref('')
const form = ref(null)

const credentials = ref({
  patient_id: '',
  password: ''
})

async function login() {
  const { valid } = await form.value.validate()
  
  if (!valid) return

  loading.value = true
  error.value = ''

  try {
    console.log('🔄 Attempting patient login with:', credentials.value)
    
    // Use the store's login method
    await patientAuthStore.login(credentials.value)
    console.log('✅ Patient login successful via store')
    
    // The store should handle navigation, but add a fallback
    setTimeout(() => {
      if (patientAuthStore.isAuthenticated) {
        console.log('✅ Store shows authenticated, proceeding to dashboard')
        router.push('/patient/dashboard')
      } else {
        console.error('❌ Store not updated after login')
        error.value = 'Login successful but authentication not set. Please try again.'
      }
    }, 500)
    
  } catch (err) {
    console.error('❌ Patient login error:', err)
    
    if (err.response?.data?.error) {
      error.value = err.response.data.error
    } else if (err.response?.data?.message) {
      error.value = err.response.data.message
    } else {
      error.value = 'Login failed. Please check your credentials and try again.'
    }
    
    // Add demo instructions
    error.value += '\n\nFor demo, try:\nPatient ID: TEST-PATIENT-001\nPassword: patient123'
  } finally {
    loading.value = false
  }
}
</script>