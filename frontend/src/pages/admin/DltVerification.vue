<!-- frontend/src/pages/admin/DltVerification.vue - ENHANCED -->
<template>
  <v-container fluid class="pa-6">
    <!-- Page Header -->
    <div class="page-header d-flex justify-space-between align-center mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold text-primary">DLT Integrity Verification</h1>
        <p class="text-body-1 text-medium-emphasis mt-2">
          Verify patient data integrity and detect tampering on the distributed ledger
        </p>
      </div>
      <v-btn 
        color="primary" 
        prepend-icon="mdi-refresh"
        @click="refreshData"
        :loading="loading"
      >
        Refresh All
      </v-btn>
    </div>

    <!-- Stats Cards with Tampering Alerts -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="2" border>
          <v-card-text class="text-center">
            <v-icon color="success" size="48" class="mb-2">mdi-shield-check</v-icon>
            <div class="text-h5 font-weight-bold">{{ stats.verified }}</div>
            <div class="text-body-2 text-medium-emphasis">Verified</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="2" border>
          <v-card-text class="text-center">
            <v-icon color="error" size="48" class="mb-2">mdi-alert-octagon</v-icon>
            <div class="text-h5 font-weight-bold">{{ stats.tampered }}</div>
            <div class="text-body-2 text-medium-emphasis">Tampered</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="2" border>
          <v-card-text class="text-center">
            <v-icon color="warning" size="48" class="mb-2">mdi-clock</v-icon>
            <div class="text-h5 font-weight-bold">{{ stats.pending }}</div>
            <div class="text-body-2 text-medium-emphasis">Pending</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="2" border>
          <v-card-text class="text-center">
            <v-icon color="info" size="48" class="mb-2">mdi-database</v-icon>
            <div class="text-h5 font-weight-bold">{{ stats.total }}</div>
            <div class="text-body-2 text-medium-emphasis">Total Records</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Bulk Actions -->
    <v-card elevation="2" class="mb-4" border v-if="selectedPatients.length > 0">
      <v-card-text>
        <div class="d-flex align-center justify-space-between">
          <div class="text-body-1">
            {{ selectedPatients.length }} patient(s) selected
          </div>
          <div class="d-flex gap-2">
            <v-btn 
              color="primary" 
              variant="outlined"
              prepend-icon="mdi-shield-check"
              @click="bulkVerify"
              :loading="bulkVerifying"
            >
              Verify Selected
            </v-btn>
            <v-btn 
              variant="text"
              @click="clearSelection"
            >
              Clear
            </v-btn>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <!-- Search and Filters -->
    <v-card elevation="2" class="mb-4" border>
      <v-card-text>
        <v-row dense align="center">
          <v-col cols="12" md="4">
            <v-text-field
              v-model="search"
              density="comfortable"
              variant="outlined"
              placeholder="Search by Patient ID or Name..."
              prepend-inner-icon="mdi-magnify"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-select
              v-model="statusFilter"
              density="comfortable"
              variant="outlined"
              :items="statusOptions"
              placeholder="Filter by Status"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-select
              v-model="sortBy"
              density="comfortable"
              variant="outlined"
              :items="sortOptions"
              placeholder="Sort by"
              hide-details
            />
          </v-col>
          <v-col cols="12" md="2" class="text-right">
            <v-btn
              variant="outlined"
              @click="clearFilters"
              :disabled="!hasActiveFilters"
            >
              Clear
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Main Table -->
    <v-card elevation="2" border>
      <v-card-title class="d-flex justify-space-between align-center">
        <span class="text-h6">DLT Verification Records</span>
        <span class="text-body-2 text-medium-emphasis">
          Showing {{ filteredVerifications.length }} of {{ verifications.length }} records
        </span>
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-0">
        <v-data-table
          v-model="selectedPatients"
          :headers="headers"
          :items="filteredVerifications"
          :loading="loading"
          :search="search"
          :sort-by="[{ key: sortBy, order: 'desc' }]"
          show-select
          item-value="patient_id"
          class="elevation-0"
        >
          <!-- Loading State -->
          <template v-slot:loading>
            <v-skeleton-loader type="table-row@6" />
          </template>

          <!-- Patient ID Column -->
          <template v-slot:item.patient_id="{ item }">
            <div class="font-weight-medium text-primary">
              {{ item.patient_id }}
            </div>
          </template>

          <!-- Name Column -->
          <template v-slot:item.name="{ item }">
            <div class="d-flex align-center">
              <v-avatar size="32" color="primary" class="mr-3">
                <span class="text-caption text-white">
                  {{ getInitials(item.name) }}
                </span>
              </v-avatar>
              <div>
                <div class="font-weight-medium">{{ item.name }}</div>
                <div class="text-caption text-medium-emphasis">
                  {{ calculateAge(item.date_of_birth) }} years
                </div>
              </div>
            </div>
          </template>

          <!-- Hash Column -->
          <template v-slot:item.data_hash="{ item }">
            <div class="hash-cell" :title="item.data_hash">
              {{ truncateHash(item.data_hash) }}
            </div>
            <div v-if="item.block_hash" class="text-caption text-medium-emphasis" :title="item.block_hash">
              Block: {{ truncateHash(item.block_hash, 8) }}
            </div>
          </template>

          <!-- Timestamp Column -->
          <template v-slot:item.timestamp="{ item }">
            <div class="text-no-wrap">
              {{ formatDate(item.timestamp) }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ formatTimeAgo(item.timestamp) }}
            </div>
          </template>

          <!-- Status Column -->
          <template v-slot:item.verified="{ item }">
            <v-chip 
              :color="getStatusColor(item.verified)" 
              size="small"
              variant="flat"
              :prepend-icon="getStatusIcon(item.verified)"
            >
              {{ getStatusText(item.verified) }}
            </v-chip>
            <div v-if="item.verification_timestamp" class="text-caption text-medium-emphasis">
              Verified: {{ formatTimeAgo(item.verification_timestamp) }}
            </div>
          </template>

          <!-- Actions Column -->
          <template v-slot:item.actions="{ item }">
            <div class="d-flex gap-2">
              <v-btn
                size="small"
                variant="outlined"
                color="primary"
                prepend-icon="mdi-shield-check"
                @click="verifyPatient(item)"
                :loading="item.verifying"
              >
                Verify
              </v-btn>
              <v-btn
                size="small"
                variant="text"
                color="grey"
                icon="mdi-history"
                @click="viewHistory(item)"
              />
              <v-btn
                size="small"
                variant="text"
                color="grey"
                icon="mdi-information"
                @click="viewDetails(item)"
              />
            </div>
          </template>

          <!-- Empty State -->
          <template v-slot:no-data>
            <div class="text-center py-8">
              <v-icon size="64" color="grey-lighten-2" class="mb-4">mdi-database-off</v-icon>
              <div class="text-h6 text-grey">No DLT records found</div>
              <div class="text-body-2 text-grey mt-2">
                {{ hasActiveFilters ? 'Try adjusting your filters' : 'No verification records available' }}
              </div>
            </div>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- Verification Result Dialog -->
    <v-dialog v-model="showVerificationDialog" max-width="600">
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
          <span>Verification Result</span>
          <v-btn icon @click="showVerificationDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        
        <v-card-text>
          <div v-if="verificationResult" class="text-center">
            <v-icon 
              size="64" 
              :color="verificationResult.is_verified ? 'success' : 'error'"
              class="mb-4"
            >
              {{ verificationResult.is_verified ? 'mdi-check-circle' : 'mdi-alert-octagon' }}
            </v-icon>
            
            <div class="text-h6 mb-2" :class="verificationResult.is_verified ? 'text-success' : 'text-error'">
              {{ verificationResult.is_verified ? 'Verification Successful' : '🚨 Tampering Detected' }}
            </div>
            
            <div class="text-body-2 text-medium-emphasis mb-4">
              {{ verificationResult.message }}
            </div>

            <v-alert
              v-if="!verificationResult.is_verified"
              type="error"
              variant="tonal"
              class="mb-4"
            >
              <strong>Data Integrity Compromised</strong><br>
              Current patient data does not match the original DLT snapshot.
            </v-alert>

            <v-divider class="my-4" />
            
            <v-row>
              <v-col cols="6">
                <div class="text-left">
                  <div class="text-caption text-medium-emphasis">Patient ID</div>
                  <div class="text-body-2 mb-2 font-weight-medium">{{ verificationResult.patient_id }}</div>
                  
                  <div class="text-caption text-medium-emphasis">Original Snapshot</div>
                  <div class="text-body-2 mb-1">{{ formatDate(verificationResult.original_snapshot_timestamp) }}</div>
                </div>
              </v-col>
              <v-col cols="6">
                <div class="text-left">
                  <div class="text-caption text-medium-emphasis">Current Hash</div>
                  <code class="text-body-2 d-block text-truncate">{{ verificationResult.current_hash }}</code>
                  
                  <div class="text-caption text-medium-emphasis mt-2">Original Hash</div>
                  <code class="text-body-2 d-block text-truncate">{{ verificationResult.original_snapshot_hash }}</code>
                </div>
              </v-col>
            </v-row>
          </div>
        </v-card-text>
        
        <v-card-actions>
          <v-spacer />
          <v-btn 
            color="primary" 
            @click="showVerificationDialog = false"
          >
            Close
          </v-btn>
          <v-btn 
            v-if="verificationResult && !verificationResult.is_verified"
            color="error"
            variant="outlined"
            @click="createNewSnapshot(verificationResult.patient_id)"
          >
            Create New Snapshot
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- History Dialog -->
    <v-dialog v-model="showHistoryDialog" max-width="800">
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
          <span>DLT History for {{ selectedPatient?.patient_id }}</span>
          <v-btn icon @click="showHistoryDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        
        <v-card-text>
          <v-timeline v-if="patientHistory.length > 0" align="start">
            <v-timeline-item
              v-for="(record, index) in patientHistory"
              :key="record.id"
              :dot-color="getHistoryDotColor(record, index)"
              size="small"
            >
              <div class="d-flex justify-space-between">
                <div>
                  <strong>{{ formatDate(record.timestamp) }}</strong>
                  <div class="text-caption">Hash: {{ truncateHash(record.data_hash, 12) }}</div>
                  <div v-if="record.block_hash" class="text-caption">
                    Block: {{ truncateHash(record.block_hash, 8) }}
                  </div>
                </div>
                <v-chip size="small" :color="record.verified ? 'success' : 'error'">
                  {{ record.verified ? 'Verified' : 'Failed' }}
                </v-chip>
              </div>
            </v-timeline-item>
          </v-timeline>
          
          <div v-else class="text-center py-4 text-medium-emphasis">
            No history found for this patient
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Snackbar for notifications -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="4000">
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { dltApi, patientsApi } from '@/api'

// Reactive state
const loading = ref(false)
const bulkVerifying = ref(false)
const search = ref('')
const statusFilter = ref('')
const sortBy = ref('timestamp')
const verifications = ref([])
const selectedPatients = ref([])
const selectedPatient = ref(null)
const showVerificationDialog = ref(false)
const showHistoryDialog = ref(false)
const verificationResult = ref(null)
const patientHistory = ref([])

const snackbar = ref({
  show: false,
  message: '',
  color: 'success'
})

// Stats with tampering detection
const stats = computed(() => {
  const total = verifications.value.length
  const verified = verifications.value.filter(v => v.verified).length
  const tampered = verifications.value.filter(v => !v.verified && v.data_hash).length
  const pending = verifications.value.filter(v => !v.verification_timestamp).length

  return { total, verified, tampered, pending }
})

// Table headers
const headers = ref([
  { title: '', key: 'data-table-select', sortable: false },
  { title: 'Patient ID', key: 'patient_id', sortable: true },
  { title: 'Name', key: 'name', sortable: true },
  { title: 'Hash', key: 'data_hash', sortable: false },
  { title: 'Timestamp', key: 'timestamp', sortable: true },
  { title: 'Status', key: 'verified', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' }
])

// Filter and sort options
const statusOptions = [
  { title: 'Verified', value: 'verified' },
  { title: 'Tampered', value: 'tampered' },
  { title: 'Pending', value: 'pending' }
]

const sortOptions = [
  { title: 'Newest First', value: 'timestamp' },
  { title: 'Oldest First', value: 'timestamp_asc' },
  { title: 'Patient ID', value: 'patient_id' },
  { title: 'Name', value: 'name' },
  { title: 'Status', value: 'verified' }
]

// Computed properties
const filteredVerifications = computed(() => {
  let filtered = verifications.value

  // Status filter
  if (statusFilter.value) {
    if (statusFilter.value === 'verified') {
      filtered = filtered.filter(v => v.verified)
    } else if (statusFilter.value === 'tampered') {
      filtered = filtered.filter(v => !v.verified && v.data_hash)
    } else if (statusFilter.value === 'pending') {
      filtered = filtered.filter(v => !v.verification_timestamp)
    }
  }

  // Search filter
  if (search.value) {
    const query = search.value.toLowerCase()
    filtered = filtered.filter(v => 
      v.patient_id.toLowerCase().includes(query) ||
      (v.name && v.name.toLowerCase().includes(query)) ||
      (v.data_hash && v.data_hash.toLowerCase().includes(query))
    )
  }

  return sortVerifications(filtered, sortBy.value)
})

const hasActiveFilters = computed(() => {
  return search.value || statusFilter.value
})

// Methods
function getStatusColor(verified) {
  return verified ? 'success' : 'error'
}

function getStatusIcon(verified) {
  return verified ? 'mdi-check-circle' : 'mdi-alert-octagon'
}

function getStatusText(verified) {
  return verified ? 'Verified' : 'Tampered'
}

function getHistoryDotColor(record, index) {
  if (index === 0) return 'primary' // Original snapshot
  return record.verified ? 'success' : 'error'
}

function truncateHash(hash, length = 16) {
  if (!hash || hash.length <= length) return hash
  return `${hash.substring(0, length)}...`
}

function formatDate(dateString) {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatTimeAgo(dateString) {
  if (!dateString) return 'Never'
  const now = new Date()
  const time = new Date(dateString)
  const diffMs = now - time
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${Math.floor(diffHours / 24)}d ago`
}

function getInitials(name) {
  if (!name) return 'NA'
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2)
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

function sortVerifications(verifications, sortKey) {
  const sorted = [...verifications]
  switch (sortKey) {
    case 'timestamp':
      return sorted.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    case 'timestamp_asc':
      return sorted.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    case 'patient_id':
      return sorted.sort((a, b) => a.patient_id.localeCompare(b.patient_id))
    case 'name':
      return sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    case 'verified':
      return sorted.sort((a, b) => (b.verified ? 1 : 0) - (a.verified ? 1 : 0))
    default:
      return sorted
  }
}

function clearFilters() {
  search.value = ''
  statusFilter.value = ''
}

function clearSelection() {
  selectedPatients.value = []
}

function showSnackbar(message, color = 'success') {
  snackbar.value = {
    show: true,
    message,
    color
  }
}

// 🚀 MAIN VERIFICATION FUNCTION - MOVED FROM Patients.vue
async function verifyPatient(patient) {
  patient.verifying = true
  
  try {
    console.log('Verifying DLT integrity for:', patient.patient_id)
    
    const response = await dltApi.verify(patient.patient_id)
    verificationResult.value = response.data
    
    showVerificationDialog.value = true
    
    // Update the verification status locally
    const index = verifications.value.findIndex(v => v.patient_id === patient.patient_id)
    if (index !== -1) {
      verifications.value[index].verified = response.data.is_verified
      verifications.value[index].verification_timestamp = new Date().toISOString()
    }
    
    showSnackbar(
      response.data.is_verified ? 'Integrity verified - no tampering' : '🚨 Tampering detected!',
      response.data.is_verified ? 'success' : 'error'
    )
    
  } catch (error) {
    console.error('Verification error:', error)
    showSnackbar('Verification failed: ' + (error.response?.data?.message || error.message), 'error')
  } finally {
    patient.verifying = false
  }
}

async function bulkVerify() {
  if (selectedPatients.value.length === 0) return
  
  bulkVerifying.value = true
  const results = {
    verified: 0,
    tampered: 0,
    failed: 0
  }
  
  try {
    for (const patientId of selectedPatients.value) {
      try {
        const response = await dltApi.verify(patientId)
        if (response.data.is_verified) {
          results.verified++
        } else {
          results.tampered++
        }
        
        // Update local state
        const index = verifications.value.findIndex(v => v.patient_id === patientId)
        if (index !== -1) {
          verifications.value[index].verified = response.data.is_verified
          verifications.value[index].verification_timestamp = new Date().toISOString()
        }
      } catch (error) {
        console.error(`Failed to verify ${patientId}:`, error)
        results.failed++
      }
    }
    
    showSnackbar(
      `Bulk verification complete: ${results.verified} verified, ${results.tampered} tampered, ${results.failed} failed`,
      results.tampered > 0 ? 'warning' : 'success'
    )
    
  } finally {
    bulkVerifying.value = false
    selectedPatients.value = [] // Clear selection
  }
}

async function viewHistory(patient) {
  selectedPatient.value = patient
  try {
    const response = await dltApi.getHashes(patient.patient_id)
    patientHistory.value = response.data.hashes || []
    showHistoryDialog.value = true
  } catch (error) {
    console.error('Error fetching history:', error)
    showSnackbar('Failed to load history', 'error')
  }
}

function viewDetails(patient) {
  console.log('View details for:', patient)
  // You can implement a detailed view modal here
}

async function createNewSnapshot(patientId) {
  try {
    await dltApi.createHash(patientId)
    showSnackbar('New DLT snapshot created successfully')
    showVerificationDialog.value = false
    await refreshData() // Refresh to show new snapshot
  } catch (error) {
    console.error('Error creating snapshot:', error)
    showSnackbar('Failed to create new snapshot', 'error')
  }
}

async function refreshData() {
  loading.value = true
  try {
    // Fetch all DLT hashes
    const dltResponse = await dltApi.getHashes()
    const allHashes = dltResponse.data.hashes || []
    
    // Get latest hash for each patient
    const latestHashes = {}
    allHashes.forEach(hash => {
      if (!latestHashes[hash.patient_id] || new Date(hash.timestamp) > new Date(latestHashes[hash.patient_id].timestamp)) {
        latestHashes[hash.patient_id] = hash
      }
    })
    
    verifications.value = Object.values(latestHashes)
    
    showSnackbar('Data refreshed successfully')
  } catch (error) {
    console.error('Error refreshing data:', error)
    showSnackbar('Failed to refresh data', 'error')
  } finally {
    loading.value = false
  }
}

// Lifecycle
onMounted(() => {
  refreshData()
})
</script>

<style scoped>
.page-header {
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
  padding-bottom: 16px;
}

.hash-cell {
  font-family: 'Roboto Mono', monospace;
  font-size: 0.75rem;
  background: rgba(0, 0, 0, 0.04);
  padding: 4px 8px;
  border-radius: 4px;
  word-break: break-all;
}

.gap-2 {
  gap: 8px;
}

:deep(.v-data-table-header) {
  background-color: rgba(0, 0, 0, 0.02);
}

:deep(.v-data-table .v-table__wrapper > table > thead > tr > th) {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.87);
}
</style>