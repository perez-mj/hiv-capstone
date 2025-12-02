<!-- frontend/src/pages/admin/BiometricManagement.vue -->
<template>
  <v-container fluid class="pa-6">
    <!-- Page Header -->
    <div class="page-header d-flex justify-space-between align-center mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold text-primary">Biometric Management</h1>
        <p class="text-body-1 text-medium-emphasis mt-2">
          Manage patient biometric associations and identity verification
        </p>
      </div>
      <v-btn 
        color="primary" 
        prepend-icon="mdi-fingerprint-plus"
        @click="showAddDialog = true"
      >
        Add Biometric
      </v-btn>
    </div>

    <!-- Stats Cards -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="2" border>
          <v-card-text class="text-center">
            <v-icon color="primary" size="48" class="mb-2">mdi-fingerprint</v-icon>
            <div class="text-h5 font-weight-bold">{{ stats.total }}</div>
            <div class="text-body-2 text-medium-emphasis">Total Links</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="2" border>
          <v-card-text class="text-center">
            <v-icon color="success" size="48" class="mb-2">mdi-check-circle</v-icon>
            <div class="text-h5 font-weight-bold">{{ stats.active }}</div>
            <div class="text-body-2 text-medium-emphasis">Active</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="2" border>
          <v-card-text class="text-center">
            <v-icon color="warning" size="48" class="mb-2">mdi-account-clock</v-icon>
            <div class="text-h5 font-weight-bold">{{ stats.inactive }}</div>
            <div class="text-body-2 text-medium-emphasis">Inactive</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="2" border>
          <v-card-text class="text-center">
            <v-icon color="info" size="48" class="mb-2">mdi-trending-up</v-icon>
            <div class="text-h5 font-weight-bold">{{ stats.today }}</div>
            <div class="text-body-2 text-medium-emphasis">Today</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Search and Filters -->
    <v-card elevation="2" class="mb-4" border>
      <v-card-text>
        <v-row dense align="center">
          <v-col cols="12" md="4">
            <v-text-field
              v-model="search"
              density="comfortable"
              variant="outlined"
              placeholder="Search by Patient ID, Name, or Biometric Hash..."
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
              v-model="typeFilter"
              density="comfortable"
              variant="outlined"
              :items="typeOptions"
              placeholder="Filter by Type"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" md="2" class="text-right">
            <v-btn
              variant="outlined"
              prepend-icon="mdi-filter-remove"
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
        <span class="text-h6">Biometric Links</span>
        <div class="d-flex align-center gap-2">
          <v-btn
            variant="outlined"
            prepend-icon="mdi-refresh"
            @click="refreshData"
            :loading="loading"
            size="small"
          >
            Refresh
          </v-btn>
          <span class="text-body-2 text-medium-emphasis">
            Showing {{ filteredLinks.length }} of {{ biometricLinks.length }} links
          </span>
        </div>
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-0">
        <v-data-table
          :headers="headers"
          :items="filteredLinks"
          :loading="loading"
          :search="search"
          :sort-by="[{ key: sortBy, order: 'desc' }]"
          class="elevation-0"
        >
          <!-- Loading State -->
          <template v-slot:loading>
            <v-skeleton-loader type="table-row@6" />
          </template>

          <!-- Biometric ID Column -->
          <template v-slot:item.biometricId="{ item }">
            <div class="d-flex align-center">
              <v-avatar size="32" color="deep-purple" class="mr-3">
                <v-icon size="18" color="white">{{ getBiometricIcon(item.biometricType) }}</v-icon>
              </v-avatar>
              <div>
                <div class="font-weight-medium text-primary">{{ item.biometricId }}</div>
                <div class="text-caption text-medium-emphasis">
                  {{ formatBiometricType(item.biometricType) }}
                </div>
              </div>
            </div>
          </template>

          <!-- Patient Info Column -->
          <template v-slot:item.patientInfo="{ item }">
            <div class="d-flex align-center">
              <v-avatar size="32" color="primary" class="mr-3">
                <span class="text-caption text-white">
                  {{ getInitials(item.patientName) }}
                </span>
              </v-avatar>
              <div>
                <div class="font-weight-medium">{{ item.patientName }}</div>
                <div class="text-caption text-medium-emphasis">
                  {{ item.patientId }}
                </div>
              </div>
            </div>
          </template>

          <!-- Type Column -->
          <template v-slot:item.biometricType="{ item }">
            <v-chip 
              size="small"
              variant="outlined"
              :prepend-icon="getBiometricIcon(item.biometricType)"
            >
              {{ formatBiometricType(item.biometricType) }}
            </v-chip>
          </template>

          <!-- Status Column -->
          <template v-slot:item.status="{ item }">
            <v-chip 
              :color="getStatusColor(item.status)" 
              size="small"
              variant="flat"
              :prepend-icon="getStatusIcon(item.status)"
            >
              {{ item.status }}
            </v-chip>
          </template>

          <!-- Linked Date Column -->
          <template v-slot:item.linkedDate="{ item }">
            <div class="text-no-wrap">
              {{ formatDate(item.linkedDate) }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ formatTimeAgo(item.linkedDate) }}
            </div>
          </template>

          <!-- Last Verified Column -->
          <template v-slot:item.lastVerified="{ item }">
            <div v-if="item.lastVerified" class="text-no-wrap">
              {{ formatDate(item.lastVerified) }}
            </div>
            <div v-else class="text-caption text-medium-emphasis">
              Never
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
                @click="verifyBiometric(item)"
                :loading="item.verifying"
                :disabled="item.status !== 'active'"
              >
                Verify
              </v-btn>
              <v-btn
                size="small"
                variant="outlined"
                :color="item.status === 'active' ? 'error' : 'success'"
                :prepend-icon="item.status === 'active' ? 'mdi-link-off' : 'mdi-link-plus'"
                @click="toggleBiometricLink(item)"
                :loading="item.unlinking"
              >
                {{ item.status === 'active' ? 'Unlink' : 'Activate' }}
              </v-btn>
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
              <v-icon size="64" color="grey-lighten-2" class="mb-4">mdi-fingerprint-off</v-icon>
              <div class="text-h6 text-grey">No biometric links found</div>
              <div class="text-body-2 text-grey mt-2">
                {{ hasActiveFilters ? 'Try adjusting your filters' : 'No biometric associations available' }}
              </div>
              <v-btn 
                color="primary" 
                class="mt-4"
                @click="showAddDialog = true"
              >
                <v-icon start>mdi-fingerprint-plus</v-icon>
                Add First Biometric Link
              </v-btn>
            </div>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- Add Biometric Dialog -->
    <v-dialog v-model="showAddDialog" max-width="600" persistent>
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
          <span>Add Biometric Link</span>
          <v-btn icon @click="closeAddDialog">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <v-card-text>
          <v-form ref="addForm" v-model="valid" @submit.prevent="addBiometricLink">
            <v-row>
              <v-col cols="12">
                <v-autocomplete
                  v-model="newLink.patientId"
                  :items="patients"
                  item-title="name"
                  item-value="patient_id"
                  label="Select Patient *"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                  placeholder="Search for patient..."
                  prepend-inner-icon="mdi-account-search"
                  :loading="loadingPatients"
                >
                  <template v-slot:item="{ props, item }">
                    <v-list-item v-bind="props">
                      <template v-slot:title>
                        <div class="font-weight-medium">{{ item.raw.name }}</div>
                      </template>
                      <template v-slot:subtitle>
                        <div class="text-caption">{{ item.raw.patient_id }}</div>
                      </template>
                    </v-list-item>
                  </template>
                </v-autocomplete>
              </v-col>

              <v-col cols="12" md="6">
                <v-select
                  v-model="newLink.biometricType"
                  :items="biometricTypes"
                  label="Biometric Type *"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                  prepend-inner-icon="mdi-fingerprint"
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-text-field
                  v-model="newLink.biometricData"
                  label="Biometric Data *"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                  :placeholder="getBiometricPlaceholder(newLink.biometricType)"
                  :append-inner-icon="getBiometricIcon(newLink.biometricType)"
                  type="password"
                />
              </v-col>

              <v-col cols="12">
                <v-alert type="info" variant="tonal" density="compact">
                  <div class="d-flex align-center">
                    <v-icon class="me-2">mdi-information</v-icon>
                    <span>
                      <strong>Security Note:</strong> Biometric data will be hashed and stored securely. 
                      The original biometric data is never stored in plain text.
                    </span>
                  </div>
                </v-alert>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="outlined" @click="closeAddDialog" :disabled="adding">
            Cancel
          </v-btn>
          <v-btn 
            color="primary" 
            @click="addBiometricLink" 
            :loading="adding"
            :disabled="!valid || adding"
            prepend-icon="mdi-link-plus"
          >
            Create Link
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Verification Dialog -->
    <v-dialog v-model="showVerificationDialog" max-width="500">
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
          <span>Biometric Verification</span>
          <v-btn icon @click="showVerificationDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text>
          <div v-if="verificationResult" class="text-center">
            <v-icon 
              size="64" 
              :color="verificationResult.success ? 'success' : 'error'"
              class="mb-4"
            >
              {{ verificationResult.success ? 'mdi-check-circle' : 'mdi-alert-circle' }}
            </v-icon>
            <div class="text-h6 mb-2">
              {{ verificationResult.success ? 'Verification Successful' : 'Verification Failed' }}
            </div>
            <div class="text-body-2 text-medium-emphasis mb-4">
              {{ verificationResult.message }}
            </div>
            <v-divider class="my-4" />
            <div class="text-left">
              <div class="text-caption text-medium-emphasis">Patient</div>
              <div class="text-body-2 mb-2">{{ verificationResult.patientName }} ({{ verificationResult.patientId }})</div>
              <div class="text-caption text-medium-emphasis">Biometric ID</div>
              <div class="text-body-2">{{ verificationResult.biometricId }}</div>
            </div>
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
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar for notifications -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { biometricApi, patientsApi } from '@/api'

// Reactive state
const loading = ref(false)
const loadingPatients = ref(false)
const adding = ref(false)
const search = ref('')
const statusFilter = ref('')
const typeFilter = ref('')
const sortBy = ref('linkedDate')
const biometricLinks = ref([])
const patients = ref([])
const showAddDialog = ref(false)
const showVerificationDialog = ref(false)
const verificationResult = ref(null)
const valid = ref(false)
const addForm = ref(null)

const snackbar = ref({
  show: false,
  message: '',
  color: 'success'
})

const stats = ref({
  total: 0,
  active: 0,
  inactive: 0,
  today: 0
})

const newLink = ref({
  patientId: '',
  biometricType: 'fingerprint',
  biometricData: ''
})

// Table headers
const headers = ref([
  { title: 'Biometric ID', key: 'biometricId', sortable: true },
  { title: 'Patient Information', key: 'patientInfo', sortable: true },
  { title: 'Type', key: 'biometricType', sortable: true },
  { title: 'Status', key: 'status', sortable: true },
  { title: 'Linked Date', key: 'linkedDate', sortable: true },
  { title: 'Last Verified', key: 'lastVerified', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' }
])

// Filter and sort options
const statusOptions = [
  { title: 'Active', value: 'active' },
  { title: 'Inactive', value: 'inactive' }
]

const typeOptions = [
  { title: 'Fingerprint', value: 'fingerprint' },
  { title: 'Facial Recognition', value: 'facial' },
  { title: 'Iris Scan', value: 'iris' },
  { title: 'Voice Print', value: 'voice' }
]

const biometricTypes = [
  { title: 'Fingerprint', value: 'fingerprint' },
  { title: 'Facial Recognition', value: 'facial' },
  { title: 'Iris Scan', value: 'iris' },
  { title: 'Voice Print', value: 'voice' }
]

// Computed properties
const filteredLinks = computed(() => {
  let filtered = biometricLinks.value

  // Status filter
  if (statusFilter.value) {
    filtered = filtered.filter(l => l.status === statusFilter.value)
  }

  // Type filter
  if (typeFilter.value) {
    filtered = filtered.filter(l => l.biometricType === typeFilter.value)
  }

  // Search filter
  if (search.value) {
    const query = search.value.toLowerCase()
    filtered = filtered.filter(l => 
      l.patientId.toLowerCase().includes(query) ||
      (l.patientName && l.patientName.toLowerCase().includes(query)) ||
      l.biometricId.toLowerCase().includes(query)
    )
  }

  // Sorting
  return sortLinks(filtered, sortBy.value)
})

const hasActiveFilters = computed(() => {
  return search.value || statusFilter.value || typeFilter.value
})

// Methods
function getStatusColor(status) {
  const colors = {
    'active': 'success',
    'inactive': 'error'
  }
  return colors[status] || 'grey'
}

function getStatusIcon(status) {
  const icons = {
    'active': 'mdi-check-circle',
    'inactive': 'mdi-close-circle'
  }
  return icons[status] || 'mdi-help-circle'
}

function getBiometricIcon(type) {
  const icons = {
    'fingerprint': 'mdi-fingerprint',
    'facial': 'mdi-face-recognition',
    'iris': 'mdi-eye-outline',
    'voice': 'mdi-microphone'
  }
  return icons[type] || 'mdi-fingerprint'
}

function formatBiometricType(type) {
  const types = {
    'fingerprint': 'Fingerprint',
    'facial': 'Facial Recognition',
    'iris': 'Iris Scan',
    'voice': 'Voice Print'
  }
  return types[type] || type
}

function getBiometricPlaceholder(type) {
  const placeholders = {
    'fingerprint': 'Enter fingerprint data or scan...',
    'facial': 'Enter facial recognition data...',
    'iris': 'Enter iris scan data...',
    'voice': 'Enter voice print data...'
  }
  return placeholders[type] || 'Enter biometric data...'
}

function formatDate(dateString) {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
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
  if (!name) return '??'
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

function sortLinks(links, sortKey) {
  const sorted = [...links]
  switch (sortKey) {
    case 'linkedDate':
      return sorted.sort((a, b) => new Date(b.linkedDate) - new Date(a.linkedDate))
    case 'linkedDate_asc':
      return sorted.sort((a, b) => new Date(a.linkedDate) - new Date(b.linkedDate))
    case 'patientName':
      return sorted.sort((a, b) => (a.patientName || '').localeCompare(b.patientName || ''))
    case 'biometricId':
      return sorted.sort((a, b) => a.biometricId.localeCompare(b.biometricId))
    case 'status':
      return sorted.sort((a, b) => a.status.localeCompare(b.status))
    default:
      return sorted
  }
}

function clearFilters() {
  search.value = ''
  statusFilter.value = ''
  typeFilter.value = ''
}

function closeAddDialog() {
  showAddDialog.value = false
  newLink.value = {
    patientId: '',
    biometricType: 'fingerprint',
    biometricData: ''
  }
  if (addForm.value) {
    addForm.value.reset()
  }
}

// Validation rules
const requiredRule = value => !!value || 'This field is required'

function showSnackbar(message, color = 'success') {
  snackbar.value = {
    show: true,
    message,
    color
  }
}

async function fetchPatients() {
  loadingPatients.value = true
  try {
    const patientsResponse = await patientsApi.getAll()
    patients.value = patientsResponse.data.patients || []
  } catch (error) {
    console.error('Error fetching patients:', error)
    showSnackbar('Failed to load patients: ' + (error.response?.data?.message || error.message), 'error')
  } finally {
    loadingPatients.value = false
  }
}

async function fetchStats() {
  try {
    const response = await biometricApi.getStats()
    if (response.data.success) {
      stats.value = {
        total: response.data.data.total || 0,
        active: response.data.data.active || 0,
        inactive: response.data.data.inactive || 0,
        today: response.data.data.today || 0
      }
    }
  } catch (error) {
    console.error('Error fetching stats:', error)
    // Don't show snackbar for stats errors as they're less critical
  }
}

async function addBiometricLink() {
  if (!addForm.value?.validate()) return

  adding.value = true
  try {
    const response = await biometricApi.link(newLink.value)
    
    if (response.data.success) {
      // Add the new link to the beginning of the list
      biometricLinks.value.unshift({
        ...response.data.biometric_link,
        verifying: false,
        unlinking: false
      })
      
      // Update stats
      await fetchStats()
      
      showAddDialog.value = false
      showSnackbar('Biometric link created successfully')
    } else {
      throw new Error(response.data.message)
    }
    
  } catch (error) {
    console.error('Error creating biometric link:', error)
    showSnackbar('Failed to create biometric link: ' + (error.response?.data?.message || error.message), 'error')
  } finally {
    adding.value = false
  }
}

async function verifyBiometric(link) {
  link.verifying = true
  
  try {
    const response = await biometricApi.verify(link.biometricId)
    
    // Handle the actual backend response structure
    const verificationSuccess = response.data.verified === true
    
    verificationResult.value = {
      success: verificationSuccess,
      message: verificationSuccess 
        ? 'Biometric verified successfully' 
        : 'Biometric verification failed',
      patientName: response.data.patient?.name || link.patientName,
      patientId: response.data.patient?.patient_id || link.patientId,
      biometricId: link.biometricId
    }
    
    showVerificationDialog.value = true
    
    // Update last verified timestamp if successful
    if (verificationSuccess) {
      link.lastVerified = new Date().toISOString()
    }
    
    showSnackbar(
      verificationSuccess ? 'Biometric verified successfully' : 'Biometric verification failed',
      verificationSuccess ? 'success' : 'error'
    )
    
  } catch (error) {
    console.error('Verification error:', error)
    
    // Handle case where verification fails
    verificationResult.value = {
      success: false,
      message: 'Verification failed: ' + (error.response?.data?.message || error.message),
      patientName: link.patientName,
      patientId: link.patientId,
      biometricId: link.biometricId
    }
    
    showVerificationDialog.value = true
    showSnackbar('Verification failed: ' + (error.response?.data?.message || error.message), 'error')
  } finally {
    link.verifying = false
  }
}

async function toggleBiometricLink(link) {
  const action = link.status === 'active' ? 'unlink' : 'activate'
  const message = link.status === 'active' 
    ? `Are you sure you want to unlink biometric ${link.biometricId} from patient ${link.patientName}?`
    : `Are you sure you want to activate biometric ${link.biometricId} for patient ${link.patientName}?`

  if (!confirm(message)) {
    return
  }

  link.unlinking = true
  
  try {
    if (action === 'unlink') {
      await biometricApi.unlink(link.id)
      link.status = 'inactive'
      showSnackbar('Biometric link deactivated successfully')
    } else {
      // For activation, you might need to create a new API endpoint
      // For now, we'll just update locally
      link.status = 'active'
      showSnackbar('Biometric link activated successfully')
    }
    
    // Update stats
    await fetchStats()
    
  } catch (error) {
    console.error('Error toggling biometric link:', error)
    showSnackbar('Failed to update biometric link: ' + (error.response?.data?.message || error.message), 'error')
  } finally {
    link.unlinking = false
  }
}

function viewDetails(link) {
  console.log('View details for:', link)
  // You can implement a detailed view modal here
  showSnackbar(`Details for ${link.biometricId} - ${link.patientName}`, 'info')
}

async function refreshData() {
  loading.value = true
  try {
    // Fetch patients for the dropdown using the correct API response structure
    await fetchPatients()

    // Fetch actual biometric links from API
    const response = await biometricApi.getLinks()
    if (response.data.success) {
      biometricLinks.value = response.data.biometric_links.map(link => ({
        ...link,
        verifying: false,
        unlinking: false
      }))
    } else {
      throw new Error(response.data.message)
    }
    
    // Fetch stats
    await fetchStats()
    
    showSnackbar('Data refreshed successfully')
  } catch (error) {
    console.error('Error refreshing data:', error)
    showSnackbar('Failed to refresh data: ' + (error.response?.data?.message || error.message), 'error')
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

:deep(.v-autocomplete .v-field__input) {
  min-height: 56px;
}
</style>