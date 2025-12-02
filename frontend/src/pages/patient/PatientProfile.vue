<!-- frontend/src/pages/patient/PatientProfile.vue -->
<template>
  <v-container fluid class="pa-6">
    <div class="page-header mb-6">
      <h1 class="text-h4 font-weight-bold text-primary">My Profile</h1>
      <p class="text-body-1 text-medium-emphasis mt-2">
        View and manage your personal information
      </p>
    </div>

    <v-row>
      <v-col cols="12" md="8">
        <v-card elevation="2" border>
          <v-card-title>Personal Information</v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  label="Patient ID"
                  :model-value="patient.patient_id"
                  readonly
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  label="Full Name"
                  :model-value="patient.name"
                  readonly
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  label="Date of Birth"
                  :model-value="formatDate(patient.date_of_birth)"
                  readonly
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  label="Age"
                  :model-value="calculateAge(patient.date_of_birth) + ' years'"
                  readonly
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  label="Contact Information"
                  :model-value="patient.contact_info || patient.contact"
                  readonly
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  label="HIV Status"
                  :model-value="patient.hiv_status"
                  readonly
                  variant="outlined"
                />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <v-card elevation="2" border class="mt-4">
          <v-card-title>Consent Information</v-card-title>
          <v-card-text>
            <div class="d-flex align-center justify-space-between">
              <div>
                <div class="text-h6">Data Sharing Consent</div>
                <div class="text-body-2 text-medium-emphasis">
                  {{ patient.consent_status === 'YES' ? 
                    'You have consented to share your data for research purposes' : 
                    'You have not consented to share your data' }}
                </div>
              </div>
              <v-chip 
                :color="patient.consent_status === 'YES' ? 'success' : 'error'" 
                size="large"
              >
                {{ patient.consent_status || (patient.consent ? 'YES' : 'NO') }}
              </v-chip>
            </div>
            <v-alert
              v-if="patient.consent_status === 'YES'"
              type="info"
              variant="tonal"
              class="mt-4"
            >
              Your data is protected using blockchain technology to ensure integrity and security.
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card elevation="2" border>
          <v-card-title>Quick Actions</v-card-title>
          <v-card-text>
            <v-list>
              <v-list-item @click="$router.push('/patient/test-history')">
                <template v-slot:prepend>
                  <v-icon color="primary">mdi-heart-pulse</v-icon>
                </template>
                <v-list-item-title>View Test History</v-list-item-title>
              </v-list-item>

              <v-list-item @click="$router.push('/patient/appointments')">
                <template v-slot:prepend>
                  <v-icon color="primary">mdi-calendar</v-icon>
                </template>
                <v-list-item-title>My Appointments</v-list-item-title>
              </v-list-item>

              <v-list-item @click="$router.push('/patient/messages')">
                <template v-slot:prepend>
                  <v-icon color="primary">mdi-message</v-icon>
                </template>
                <v-list-item-title>Messages</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>

        <v-card elevation="2" border class="mt-4">
          <v-card-title>DLT Verification Status</v-card-title>
          <v-card-text>
            <div class="text-center">
              <v-icon 
                size="64" 
                :color="patient.dlt_status === 'verified' ? 'success' : 'warning'"
                class="mb-2"
              >
                {{ patient.dlt_status === 'verified' ? 'mdi-shield-check' : 'mdi-shield-alert' }}
              </v-icon>
              <div class="text-h6">
                {{ patient.dlt_status === 'verified' ? 'Data Verified' : 'Verification Pending' }}
              </div>
              <div class="text-body-2 text-medium-emphasis mt-2">
                {{ patient.dlt_status === 'verified' ? 
                  'Your medical records are securely stored on the blockchain' :
                  'Your data verification is in progress' }}
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const patient = ref({})

onMounted(() => {
  const patientData = localStorage.getItem('patientData')
  if (patientData) {
    patient.value = JSON.parse(patientData)
  }
})

function formatDate(dateString) {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return 'N/A'
  const today = new Date()
  const birthDate = new Date(dateOfBirth)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}
</script>