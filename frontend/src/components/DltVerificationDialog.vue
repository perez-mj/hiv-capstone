<!-- frontend/src/components/DltVerificationDialog.vue -->
<template>
  <v-dialog v-model="showDialog" max-width="600" persistent>
    <v-card>
      <v-card-title class="d-flex justify-space-between align-center">
        <span>Verify DLT Integrity</span>
        <v-btn icon @click="closeDialog" :disabled="loading">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text v-if="patient" class="pt-4">
        <!-- Patient Info -->
        <v-card variant="outlined" class="mb-4">
          <v-card-text>
            <div class="text-subtitle-1 font-weight-bold mb-2">Patient Information</div>
            <v-row>
              <v-col cols="6">
                <div class="text-caption text-medium-emphasis">Patient ID</div>
                <div class="text-body-1">{{ patient.patient_id }}</div>
              </v-col>
              <v-col cols="6">
                <div class="text-caption text-medium-emphasis">Name</div>
                <div class="text-body-1">{{ patient.name }}</div>
              </v-col>
              <v-col cols="6">
                <div class="text-caption text-medium-emphasis">HIV Status</div>
                <div class="text-body-1">{{ patient.hiv_status }}</div>
              </v-col>
              <v-col cols="6">
                <div class="text-caption text-medium-emphasis">Consent</div>
                <v-chip size="small" :color="getConsentColor(patient)">
                  {{ getConsentText(patient) }}
                </v-chip>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Loading State -->
        <div v-if="loading && !verificationResult" class="text-center py-4">
          <v-progress-circular indeterminate color="primary" />
          <div class="text-body-1 mt-2">Verifying DLT integrity...</div>
        </div>

        <!-- Verification Result -->
        <div v-else-if="verificationResult">
          <v-card :color="getVerificationColor()" variant="tonal" class="mb-4">
            <v-card-text class="text-center">
              <v-icon size="48" class="mb-2">{{ getVerificationIcon() }}</v-icon>
              <div class="text-h6 font-weight-bold">{{ getVerificationTitle() }}</div>
              <div class="text-body-1 mt-2">{{ getVerificationMessage() }}</div>
              
              <v-divider class="my-4" />
              
              <div class="text-left">
                <div class="text-caption text-medium-emphasis">Current Hash</div>
                <code class="text-body-2 d-block text-truncate">{{ verificationResult.current_hash || 'N/A' }}</code>
                
                <div class="text-caption text-medium-emphasis mt-2">Stored DLT Hash</div>
                <code class="text-body-2 d-block text-truncate">{{ verificationResult.stored_dlt_hash || 'N/A' }}</code>
                
                <div class="text-caption text-medium-emphasis mt-2">Last Verified</div>
                <div class="text-body-2">{{ formatDate(verificationResult.verification_timestamp) }}</div>

                <!-- Create Hash Option -->
                <div v-if="verificationResult.status === 'no_hash'" class="mt-4">
                  <v-alert type="warning" variant="tonal" density="compact">
                    No DLT hash exists for this patient. Click "Create DLT Hash" to secure data on blockchain.
                  </v-alert>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </div>

        <!-- Initial State -->
        <div v-else-if="!loading && !verificationResult" class="text-center py-4">
          <v-icon size="48" color="grey" class="mb-2">mdi-shield-question</v-icon>
          <div class="text-h6">Ready to Verify</div>
          <div class="text-body-1 mt-2">Click "Verify Now" to check DLT integrity</div>
        </div>

        <!-- Error State -->
        <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
          <template v-slot:title>
            Verification Failed
          </template>
          {{ error }}
        </v-alert>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        
        <!-- Create Hash Button (when no hash exists) -->
        <v-btn 
          v-if="verificationResult?.status === 'no_hash'"
          color="warning" 
          @click="createDltHash" 
          :loading="creatingHash"
          :disabled="loading"
          prepend-icon="mdi-plus-circle"
        >
          Create DLT Hash
        </v-btn>
        
        <v-btn variant="text" @click="closeDialog" :disabled="loading || creatingHash">
          Close
        </v-btn>
        <v-btn 
          color="primary" 
          @click="verifyIntegrity" 
          :loading="loading"
          :disabled="creatingHash"
          prepend-icon="mdi-shield-check"
        >
          Verify Now
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { dltApi } from '@/api'

const props = defineProps({
  modelValue: Boolean,
  patient: Object
})

const emit = defineEmits(['update:modelValue', 'verified'])

const showDialog = ref(false)
const loading = ref(false)
const creatingHash = ref(false)
const error = ref('')
const verificationResult = ref(null)

watch(() => props.modelValue, (val) => {
  showDialog.value = val
  if (val) {
    // Reset state when dialog opens
    resetState()
  }
})

watch(showDialog, (val) => {
  emit('update:modelValue', val)
  if (!val) {
    // Reset state when dialog closes
    resetState()
  }
})

function resetState() {
  loading.value = false
  creatingHash.value = false
  error.value = ''
  verificationResult.value = null
}

function closeDialog() {
  showDialog.value = false
}

async function verifyIntegrity() {
  if (!props.patient?.patient_id) {
    error.value = 'No patient selected'
    return
  }
  
  loading.value = true
  error.value = ''
  verificationResult.value = null
  
  try {
    console.log('Verifying DLT for patient:', props.patient.patient_id)
    const response = await dltApi.verify(props.patient.patient_id)
    verificationResult.value = response.data
    console.log('Verification result:', response.data)
    
    // Emit verified event with result
    emit('verified', response.data)
  } catch (err) {
    console.error('DLT verification error:', err)
    error.value = err.response?.data?.error || err.response?.data?.message || 'Verification failed. Please try again.'
    verificationResult.value = null
  } finally {
    loading.value = false
  }
}

async function createDltHash() {
  if (!props.patient?.patient_id) return
  
  creatingHash.value = true
  error.value = ''
  
  try {
    console.log('Creating DLT hash for patient:', props.patient.patient_id)
    const response = await dltApi.createHash(props.patient.patient_id)
    console.log('DLT hash created:', response.data)
    
    // After creating hash, verify again to show updated status
    await verifyIntegrity()
  } catch (err) {
    console.error('DLT hash creation error:', err)
    error.value = err.response?.data?.error || err.response?.data?.message || 'Failed to create DLT hash. Please try again.'
  } finally {
    creatingHash.value = false
  }
}

function getConsentColor(patient) {
  const consent = patient.consent_status || (patient.consent ? 'YES' : 'NO')
  return consent === 'YES' ? 'green' : 'red'
}

function getConsentText(patient) {
  return patient.consent_status || (patient.consent ? 'YES' : 'NO')
}

function getVerificationColor() {
  if (!verificationResult.value) return 'grey'
  
  if (verificationResult.value.status === 'no_hash') return 'orange'
  return verificationResult.value.is_verified ? 'green' : 'red'
}

function getVerificationIcon() {
  if (!verificationResult.value) return 'mdi-help-circle'
  
  if (verificationResult.value.status === 'no_hash') return 'mdi-alert'
  return verificationResult.value.is_verified ? 'mdi-check-circle' : 'mdi-alert-circle'
}

function getVerificationTitle() {
  if (!verificationResult.value) return 'Verification Required'
  
  if (verificationResult.value.status === 'no_hash') return 'No DLT Hash Found'
  return verificationResult.value.is_verified ? 'Integrity Verified' : 'Integrity Compromised'
}

function getVerificationMessage() {
  if (!verificationResult.value) return 'Click verify to check DLT integrity'
  
  if (verificationResult.value.status === 'no_hash') return 'No DLT hash exists for this patient. Data may not be secured on blockchain.'
  return verificationResult.value.is_verified 
    ? 'Patient data integrity verified on distributed ledger.' 
    : 'Patient data has been modified since last DLT verification.'
}

function formatDate(dateString) {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleString()
}
</script>