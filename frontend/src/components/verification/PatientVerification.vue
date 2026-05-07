<!-- frontend/src/components/verification/PatientVerification.vue -->
<template>
  <v-card elevation="0" variant="outlined">
    <v-card-title class="pa-4">
      <div class="d-flex align-center justify-space-between flex-wrap gap-3">
        <div class="d-flex align-center">
          <v-icon icon="mdi-shield-check" color="primary" size="24" class="mr-2" />
          <span class="text-subtitle-1 font-weight-medium">Data Integrity Verification</span>
        </div>
        
        <div class="d-flex gap-2">
          <v-btn
            color="primary"
            variant="tonal"
            size="small"
            prepend-icon="mdi-refresh"
            :loading="loading"
            @click="runVerification"
          >
            Verify Now
          </v-btn>
          <v-btn
            color="success"
            variant="tonal"
            size="small"
            prepend-icon="mdi-content-save"
            :loading="loading"
            @click="storeSnapshot"
            :disabled="!verificationResult"
          >
            Store Snapshot
          </v-btn>
        </div>
      </div>
    </v-card-title>
    
    <v-divider />
    
    <v-card-text class="pa-4">
      <!-- Verification Status -->
      <div class="verification-status mb-4" v-if="verificationResult">
        <v-alert
          :type="verificationResult.overall_integrity ? 'success' : 'error'"
          variant="tonal"
          class="mb-3"
        >
          <div class="d-flex align-center">
            <div>
              <div class="font-weight-bold">
                {{ verificationResult.overall_integrity ? 'Data Integrity Verified' : 'Tampering Detected' }}
              </div>
              <div class="text-caption">
                {{ verificationResult.overall_integrity 
                  ? 'All patient data matches blockchain records' 
                  : 'Discrepancies found between database and blockchain records' }}
              </div>
            </div>
          </div>
        </v-alert>
        
        <!-- Tamper Alerts -->
        <v-expansion-panels v-if="verificationResult.tamper_alerts?.length" class="mb-4">
          <v-expansion-panel>
            <v-expansion-panel-title>
              <div class="d-flex align-center">
                <v-icon icon="mdi-alert" color="error" size="20" class="mr-2" />
                <span class="font-weight-medium">Tamper Alerts ({{ verificationResult.tamper_alerts.length }})</span>
              </div>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-list density="compact" bg-color="transparent">
                <v-list-item v-for="(alert, idx) in verificationResult.tamper_alerts" :key="idx" class="alert-item">
                  <template v-slot:prepend>
                    <v-chip :color="getSeverityColor(alert.severity)" size="x-small" class="mr-2">
                      {{ alert.severity }}
                    </v-chip>
                  </template>
                  <v-list-item-title class="text-body-2">
                    {{ alert.message }}
                    <span v-if="alert.field" class="text-caption text-grey"> (Field: {{ alert.field }})</span>
                  </v-list-item-title>
                  <v-list-item-subtitle class="text-caption" v-if="alert.blockchain_txid">
                    TXID: {{ truncateTxid(alert.blockchain_txid) }}
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
        
        <!-- Check Results -->
        <v-row>
          <v-col cols="12" md="6">
            <v-card variant="outlined" class="check-card" :class="{ 'pass': verificationResult.checks.demographic.verified, 'fail': !verificationResult.checks.demographic.verified }">
              <v-card-text class="pa-3">
                <div class="d-flex align-center justify-space-between">
                  <div class="d-flex align-center">
                    <v-icon :icon="verificationResult.checks.demographic.verified ? 'mdi-check-circle' : 'mdi-alert-circle'" 
                            :color="verificationResult.checks.demographic.verified ? 'success' : 'error'" size="20" class="mr-2" />
                    <span class="font-weight-medium">Demographic Data</span>
                  </div>
                  <v-chip size="x-small" :color="verificationResult.checks.demographic.verified ? 'success' : 'error'" variant="flat">
                    {{ verificationResult.checks.demographic.matches || 0 }} matches
                  </v-chip>
                </div>
                <div class="text-caption text-medium-emphasis mt-2">
                  {{ verificationResult.checks.demographic.message || (verificationResult.checks.demographic.verified ? 'Verified' : 'Not verified') }}
                </div>
              </v-card-text>
            </v-card>
          </v-col>
          
          <v-col cols="12" md="6">
            <v-card variant="outlined" class="check-card" :class="{ 'pass': verificationResult.checks.medical.verified, 'fail': !verificationResult.checks.medical.verified }">
              <v-card-text class="pa-3">
                <div class="d-flex align-center justify-space-between">
                  <div class="d-flex align-center">
                    <v-icon :icon="verificationResult.checks.medical.verified ? 'mdi-check-circle' : 'mdi-alert-circle'" 
                            :color="verificationResult.checks.medical.verified ? 'success' : 'error'" size="20" class="mr-2" />
                    <span class="font-weight-medium">Medical Data</span>
                  </div>
                </div>
                <div class="text-caption text-medium-emphasis mt-2">
                  {{ verificationResult.checks.medical.message || (verificationResult.checks.medical.verified ? 'Verified' : 'Not verified') }}
                </div>
              </v-card-text>
            </v-card>
          </v-col>
          
          <v-col cols="12" md="6">
            <v-card variant="outlined" class="check-card" :class="{ 'pass': verificationResult.checks.lab_results.verified, 'fail': !verificationResult.checks.lab_results.verified }">
              <v-card-text class="pa-3">
                <div class="d-flex align-center justify-space-between">
                  <div class="d-flex align-center">
                    <v-icon :icon="verificationResult.checks.lab_results.verified ? 'mdi-check-circle' : 'mdi-alert-circle'" 
                            :color="verificationResult.checks.lab_results.verified ? 'success' : 'error'" size="20" class="mr-2" />
                    <span class="font-weight-medium">Lab Results</span>
                  </div>
                  <v-chip size="x-small" :color="verificationResult.checks.lab_results.verified ? 'success' : 'error'" variant="flat">
                    {{ verificationResult.checks.lab_results.verified_count || 0 }}/{{ verificationResult.checks.lab_results.total || 0 }}
                  </v-chip>
                </div>
                <div class="text-caption text-medium-emphasis mt-2">
                  {{ verificationResult.checks.lab_results.verified ? 'All lab results verified' : `${verificationResult.checks.lab_results.failed?.length || 0} results failed verification` }}
                </div>
              </v-card-text>
            </v-card>
          </v-col>
          
          <v-col cols="12" md="6">
            <v-card variant="outlined" class="check-card" :class="{ 'pass': verificationResult.checks.appointments.verified, 'fail': !verificationResult.checks.appointments.verified }">
              <v-card-text class="pa-3">
                <div class="d-flex align-center justify-space-between">
                  <div class="d-flex align-center">
                    <v-icon :icon="verificationResult.checks.appointments.verified ? 'mdi-check-circle' : 'mdi-alert-circle'" 
                            :color="verificationResult.checks.appointments.verified ? 'success' : 'error'" size="20" class="mr-2" />
                    <span class="font-weight-medium">Appointments</span>
                  </div>
                  <v-chip size="x-small" :color="verificationResult.checks.appointments.verified ? 'success' : 'error'" variant="flat">
                    {{ verificationResult.checks.appointments.verified_count || 0 }}/{{ verificationResult.checks.appointments.total || 0 }}
                  </v-chip>
                </div>
                <div class="text-caption text-medium-emphasis mt-2">
                  {{ verificationResult.checks.appointments.verified ? 'All appointments verified' : `${verificationResult.checks.appointments.failed?.length || 0} appointments failed verification` }}
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
        
        <!-- Recommendations -->
        <v-card variant="outlined" class="mt-4" v-if="verificationResult.recommendations?.length">
          <v-card-title class="pa-3 text-subtitle-2">
            <v-icon icon="mdi-lightbulb" size="18" class="mr-2" color="warning" />
            Recommendations
          </v-card-title>
          <v-divider />
          <v-card-text class="pa-3">
            <v-list density="compact" bg-color="transparent">
              <v-list-item v-for="(rec, idx) in verificationResult.recommendations" :key="idx">
                <template v-slot:prepend>
                  <v-icon icon="mdi-chevron-right" size="16" />
                </template>
                <v-list-item-title class="text-body-2">{{ rec }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
        
        <!-- Restore Button (if tampering detected) -->
        <div class="mt-4" v-if="!verificationResult.overall_integrity">
          <v-btn
            color="warning"
            variant="tonal"
            prepend-icon="mdi-restore"
            @click="showRestoreDialog = true"
          >
            Restore from Blockchain
          </v-btn>
        </div>
      </div>
      
      <div v-else-if="loading" class="text-center pa-8">
        <v-progress-circular indeterminate color="primary" :size="40" />
        <div class="mt-3 text-caption">Verifying patient data against blockchain...</div>
      </div>
      
      <div v-else class="text-center pa-8 text-medium-emphasis">
        <v-icon icon="mdi-shield-search" size="48" color="grey-lighten-1" />
        <div class="mt-2">Click "Verify Now" to check data integrity</div>
      </div>
    </v-card-text>
    
    <!-- Restore Confirmation Dialog -->
    <v-dialog v-model="showRestoreDialog" max-width="500px">
      <v-card>
        <v-card-title class="pa-4 bg-warning-lighten-5">
          <div class="d-flex align-center">
            <v-icon icon="mdi-alert" color="warning" size="28" class="mr-2" />
            <span class="text-h6">Restore from Blockchain</span>
          </div>
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-4">
          <p class="text-body-1 mb-3">
            This will restore patient data from the blockchain snapshot.
          </p>
          <v-alert type="warning" variant="tonal" class="mb-3">
            <strong>Warning:</strong> This will overwrite current patient data in the database.
            This action is irreversible.
          </v-alert>
          <p class="text-caption text-medium-emphasis">
            The blockchain snapshot is immutable and cryptographically verified.
            Restoring from it ensures data integrity.
          </p>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="outlined" @click="showRestoreDialog = false">
            Cancel
          </v-btn>
          <v-btn color="warning" :loading="restoring" @click="confirmRestore">
            Restore Data
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useVerification } from '@/composables/useVerification'

const props = defineProps({
  patientId: {
    type: [String, Number],
    required: true
  }
})

const emit = defineEmits(['verified', 'restored', 'error'])

const {
  loading,
  verificationResult,
  verifyPatient,
  storePatientSnapshot,
  restoreFromBlockchain,
  getSeverityColor
} = useVerification()

const showRestoreDialog = ref(false)
const restoring = ref(false)

async function runVerification() {
  try {
    await verifyPatient(props.patientId, { noCache: true })
    emit('verified', verificationResult.value)
  } catch (error) {
    console.error('Verification failed:', error)
    emit('error', error)
  }
}

async function storeSnapshot() {
  try {
    await storePatientSnapshot(props.patientId)
    await runVerification() // Refresh after storing
  } catch (error) {
    emit('error', error)
  }
}

async function confirmRestore() {
  restoring.value = true
  try {
    const result = await restoreFromBlockchain(props.patientId, null, true)
    emit('restored', result)
    showRestoreDialog.value = false
    await runVerification() // Re-verify after restore
  } catch (error) {
    emit('error', error)
  } finally {
    restoring.value = false
  }
}

function truncateTxid(txid) {
  if (!txid) return ''
  return txid.length > 20 ? `${txid.substring(0, 10)}...${txid.substring(txid.length - 10)}` : txid
}

// Run verification when component mounts or patientId changes
watch(() => props.patientId, () => {
  runVerification()
}, { immediate: true })
</script>

<style scoped>
.check-card {
  transition: all 0.2s;
}

.check-card.pass {
  border-left: 3px solid #4CAF50;
}

.check-card.fail {
  border-left: 3px solid #B00020;
}

.alert-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.alert-item:last-child {
  border-bottom: none;
}

.gap-2 {
  gap: 8px;
}

.gap-3 {
  gap: 16px;
}
</style>