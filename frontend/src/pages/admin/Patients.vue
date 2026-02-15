<!-- frontend/src/pages/admin/Patients.vue - UPDATED FOR FIXED API -->
<template>
  <v-container fluid class="pa-6">
    <!-- Header Section -->
    <div class="page-header d-flex justify-space-between align-center mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold text-primary">Patient Management</h1>
        <p class="text-body-1 text-medium-emphasis mt-2">
          Manage patient records and enrollment
        </p>
      </div>
      
      <div class="header-actions d-flex gap-2">
        <v-btn 
          color="primary" 
          size="large"
          prepend-icon="mdi-account-plus"
          @click="openEnrollmentDialog"
          :loading="loading"
        >
          New Enrollment
        </v-btn>
        <v-btn
          variant="outlined"
          size="large"
          prepend-icon="mdi-download"
          @click="exportPatientData"
          :disabled="patients.length === 0"
        >
          Export
        </v-btn>
      </div>
    </div>

    <!-- Quick Stats -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="2" border>
          <v-card-text class="text-center">
            <v-icon color="primary" size="48" class="mb-2">mdi-account-multiple</v-icon>
            <div class="text-h5 font-weight-bold">{{ stats.total }}</div>
            <div class="text-body-2 text-medium-emphasis">Total Patients</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="2" border>
          <v-card-text class="text-center">
            <v-icon color="success" size="48" class="mb-2">mdi-checkbox-marked-circle</v-icon>
            <div class="text-h5 font-weight-bold">{{ stats.consented }}</div>
            <div class="text-body-2 text-medium-emphasis">Consented</div>
            <div class="text-caption text-success mt-1">
              {{ stats.consent_rate || 0 }}% consent rate
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="2" border>
          <v-card-text class="text-center">
            <v-icon color="warning" size="48" class="mb-2">mdi-alert-circle</v-icon>
            <div class="text-h5 font-weight-bold">{{ stats.reactive }}</div>
            <div class="text-body-2 text-medium-emphasis">Reactive Status</div>
            <div class="text-caption text-warning mt-1">
              {{ stats.reactive_rate || 0 }}% of total
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="2" border>
          <v-card-text class="text-center">
            <v-icon color="info" size="48" class="mb-2">mdi-chart-line</v-icon>
            <div class="text-h5 font-weight-bold">{{ stats.daily_enrollments }}</div>
            <div class="text-body-2 text-medium-emphasis">Today's Enrollments</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Error Alert -->
    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      class="mb-4"
    >
      <template v-slot:title>
        Error Loading Patients
      </template>
      {{ error }}
    </v-alert>

    <!-- Search and Filters -->
    <v-card elevation="2" class="mb-4" border>
      <v-card-text>
        <v-row dense align="center">
          <v-col cols="12" md="4">
            <v-text-field
              v-model="search"
              density="comfortable"
              variant="outlined"
              placeholder="Search by name, ID, or contact..."
              prepend-inner-icon="mdi-magnify"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-select
              v-model="filters.consentStatus"
              density="comfortable"
              variant="outlined"
              :items="consentOptions"
              placeholder="Consent Status"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-select
              v-model="filters.hivStatus"
              density="comfortable"
              variant="outlined"
              :items="hivStatusOptions"
              placeholder="HIV Status"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-select
              v-model="sortBy"
              density="comfortable"
              variant="outlined"
              :items="sortOptions"
              placeholder="Sort By"
              hide-details
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-btn
              variant="text"
              color="primary"
              prepend-icon="mdi-filter-remove"
              @click="clearFilters"
              :disabled="!hasActiveFilters"
            >
              Clear Filters
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Main Table -->
    <v-card elevation="2" border>
      <v-card-title class="d-flex justify-space-between align-center">
        <span class="text-h6">Patient Records</span>
        <span class="text-body-2 text-medium-emphasis">
          Showing {{ paginationStart }} to {{ paginationEnd }} of {{ filteredPatients.length }} patients
        </span>
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-0">
        <v-data-table
          :headers="headers"
          :items="paginatedPatients"
          :loading="loading"
          :search="search"
          :sort-by="[{ key: sortBy, order: 'desc' }]"
          class="elevation-0 patients-table"
        >
          <!-- Loading State -->
          <template v-slot:loading>
            <v-skeleton-loader type="table-row@6" />
          </template>

          <!-- Patient ID Column -->
          <template v-slot:item.patient_id="{ item }">
            <div class="font-weight-medium">
              <v-chip
                size="small"
                :color="getPatientIdColor(item.patient_id)"
                variant="flat"
                :prepend-icon="getPatientIdIcon(item.patient_id)"
              >
                {{ item.patient_id }}
              </v-chip>
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
                  {{ formatDateOfBirth(item.date_of_birth) }}
                </div>
              </div>
            </div>
          </template>

          <!-- Age Column -->
          <template v-slot:item.age="{ item }">
            <div class="text-no-wrap">
              {{ calculateAge(item.date_of_birth) }} years
            </div>
          </template>

          <!-- Contact Column -->
          <template v-slot:item.contact_info="{ item }">
            <div class="contact-info">
              {{ item.contact_info || 'N/A' }}
            </div>
          </template>

          <!-- Consent Column -->
          <template v-slot:item.consent_status="{ item }">
            <v-chip
              size="small"
              :color="getConsentColor(item.consent_status || (item.consent ? 'YES' : 'NO'))"
              variant="flat"
              :prepend-icon="getConsentIcon(item.consent_status || (item.consent ? 'YES' : 'NO'))"
            >
              {{ item.consent_status || (item.consent ? 'YES' : 'NO') }}
            </v-chip>
          </template>

          <!-- HIV Status Column -->
          <template v-slot:item.hiv_status="{ item }">
            <v-chip
              size="small"
              :color="getHivStatusColor(item.hiv_status)"
              variant="flat"
              :prepend-icon="getHivStatusIcon(item.hiv_status)"
            >
              {{ item.hiv_status }}
            </v-chip>
          </template>

          <!-- Enrollment Date Column -->
          <template v-slot:item.created_at="{ item }">
            <div class="text-no-wrap">
              {{ formatDate(item.created_at) }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ formatTimeAgo(item.created_at) }}
            </div>
          </template>

          <!-- Actions Column -->
          <template v-slot:item.actions="{ item }">
            <div class="d-flex gap-2">
              <v-btn
                size="small"
                variant="text"
                color="info"
                icon="mdi-eye"
                @click="viewPatient(item)"
              />
              <v-btn
                size="small"
                variant="text"
                color="warning"
                icon="mdi-pencil"
                @click="editPatient(item)"
              />
              <v-btn
                size="small"
                variant="text"
                color="error"
                icon="mdi-delete"
                @click="deletePatient(item)"
              />
            </div>
          </template>

          <!-- Empty State -->
          <template v-slot:no-data>
            <div class="text-center py-8">
              <v-icon size="64" color="grey-lighten-2" class="mb-4">mdi-account-off</v-icon>
              <div class="text-h6 text-grey">No Patients Found</div>
              <div class="text-body-2 text-grey mt-2">
                {{ hasActiveFilters ? 'Try adjusting your filters' : 'Get started by enrolling your first patient' }}
              </div>
              <v-btn color="primary" @click="openEnrollmentDialog" class="mt-4">
                <v-icon start>mdi-account-plus</v-icon>
                Enroll First Patient
              </v-btn>
            </div>
          </template>
        </v-data-table>
      </v-card-text>

      <!-- Pagination -->
      <v-card-actions v-if="pageCount > 1" class="px-4 py-3">
        <v-pagination
          v-model="page"
          :length="pageCount"
          total-visible="7"
          rounded="circle"
        />
      </v-card-actions>
    </v-card>

    <!-- Patient Dialog -->
    <PatientDialog
      v-model="showPatientDialog"
      :patient="selectedPatient"
      :mode="dialogMode"
      @saved="handlePatientSaved"
    />

    <!-- Snackbar for notifications -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { patientsApi } from '@/api'
import PatientDialog from '@/components/PatientDialog.vue'

const router = useRouter()

// Reactive state
const search = ref('')
const filters = ref({
  consentStatus: null,
  hivStatus: null
})
const sortBy = ref('created_at')
const page = ref(1)
const perPage = 10
const loading = ref(false)
const error = ref('')
const patients = ref([])
const stats = ref({
  total: 0,
  consented: 0,
  reactive: 0,
  non_reactive: 0,
  daily_enrollments: 0,
  consent_rate: 0,
  reactive_rate: 0,
  non_reactive_rate: 0
})

const showPatientDialog = ref(false)
const selectedPatient = ref(null)
const dialogMode = ref('create') // 'create' or 'edit'

const snackbar = ref({
  show: false,
  message: '',
  color: 'success'
})

// Table headers - SIMPLIFIED based on your schema
const headers = ref([
  { title: 'Patient ID', key: 'patient_id', sortable: true },
  { title: 'Name', key: 'name', sortable: true },
  { title: 'Age', key: 'age', sortable: false },
  { title: 'Contact', key: 'contact_info', sortable: true },
  { title: 'Consent', key: 'consent_status', sortable: true },
  { title: 'HIV Status', key: 'hiv_status', sortable: true },
  { title: 'Enrollment Date', key: 'created_at', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' }
])

// Options for filters
const consentOptions = [
  { title: 'Consented', value: 'YES' },
  { title: 'Not Consented', value: 'NO' }
]

const hivStatusOptions = [
  { title: 'Reactive', value: 'Reactive' },
  { title: 'Non-Reactive', value: 'Non-Reactive' }
]

const sortOptions = [
  { title: 'Newest First', value: 'created_at' },
  { title: 'Oldest First', value: 'created_at_asc' },
  { title: 'Name A-Z', value: 'name' },
  { title: 'Name Z-A', value: 'name_desc' }
]

// Computed properties
const filteredPatients = computed(() => {
  let filtered = patients.value

  // Search filter
  if (search.value) {
    const query = search.value.toLowerCase()
    filtered = filtered.filter(patient =>
      patient.name?.toLowerCase().includes(query) ||
      patient.patient_id?.toLowerCase().includes(query) ||
      (patient.contact_info && patient.contact_info.toLowerCase().includes(query))
    )
  }

  // Consent status filter
  if (filters.value.consentStatus) {
    filtered = filtered.filter(patient => {
      const consentValue = patient.consent_status || (patient.consent ? 'YES' : 'NO')
      return consentValue === filters.value.consentStatus
    })
  }

  // HIV status filter
  if (filters.value.hivStatus) {
    filtered = filtered.filter(patient => patient.hiv_status === filters.value.hivStatus)
  }

  // Sorting
  filtered = sortPatients(filtered, sortBy.value)

  return filtered
})

const pageCount = computed(() => Math.ceil(filteredPatients.value.length / perPage))
const paginatedPatients = computed(() => {
  const start = (page.value - 1) * perPage
  return filteredPatients.value.slice(start, start + perPage)
})

const paginationStart = computed(() => (page.value - 1) * perPage + 1)
const paginationEnd = computed(() => Math.min(page.value * perPage, filteredPatients.value.length))

const hasActiveFilters = computed(() => {
  return search.value || filters.value.consentStatus || filters.value.hivStatus
})

// Lifecycle
onMounted(async () => {
  await fetchPatients()
  await fetchStats()
})

// Methods
async function fetchPatients() {
  loading.value = true
  error.value = ''
  try {
    // Use the main endpoint with pagination parameters
    const response = await patientsApi.getPagination({
      page: 1,
      limit: 1000, // Get all patients for client-side filtering
      search: search.value,
      consent: filters.value.consentStatus,
      hiv_status: filters.value.hivStatus
    })
    
    // Extract patients from the response
    patients.value = response.data.patients || []
    console.log('Patients loaded:', patients.value.length)
    
    // Debug: Check patient IDs
    patients.value.forEach(patient => {
      console.log('Patient ID format:', patient.patient_id, 'HIV Status:', patient.hiv_status)
    })
    
  } catch (err) {
    console.error('Error fetching patients:', err)
    error.value = err.response?.data?.message || 'Failed to load patients'
    patients.value = []
    showSnackbar('Error loading patients', 'error')
  } finally {
    loading.value = false
  }
}

async function fetchStats() {
  try {
    const response = await patientsApi.getStats()
    stats.value = response.data
    console.log('Stats loaded:', stats.value)
  } catch (err) {
    console.error('Error fetching stats:', err)
    // Set fallback stats based on loaded patients
    const total = patients.value.length
    const consented = patients.value.filter(p => p.consent_status === 'YES' || p.consent).length
    const reactive = patients.value.filter(p => p.hiv_status === 'Reactive').length
    const nonReactive = patients.value.filter(p => p.hiv_status === 'Non-Reactive').length
    
    stats.value = {
      total: total,
      consented: consented,
      reactive: reactive,
      non_reactive: nonReactive,
      daily_enrollments: patients.value.filter(p => {
        const createdAt = new Date(p.created_at)
        const now = new Date()
        const diffHours = (now - createdAt) / (1000 * 60 * 60)
        return diffHours <= 24
      }).length,
      consent_rate: total > 0 ? Math.round((consented / total) * 100) : 0,
      reactive_rate: total > 0 ? Math.round((reactive / total) * 100) : 0,
      non_reactive_rate: total > 0 ? Math.round((nonReactive / total) * 100) : 0
    }
  }
}

function sortPatients(patients, sortKey) {
  const sorted = [...patients]
  switch (sortKey) {
    case 'created_at':
      return sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    case 'created_at_asc':
      return sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    case 'name':
      return sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    case 'name_desc':
      return sorted.sort((a, b) => (b.name || '').localeCompare(a.name || ''))
    default:
      return sorted
  }
}

function calculateAge(dateString) {
  if (!dateString) return 'N/A'
  
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
  if (!dateString) return 'N/A'
  
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function formatDateOfBirth(dateString) {
  if (!dateString) return 'N/A'
  
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
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
  if (!name) return 'NA'
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

function getPatientIdColor(patientId) {
  // Check if patient ID starts with PR (HIV Positive/Reactive)
  if (patientId && patientId.startsWith('PR')) {
    return 'warning' // Orange/Red for positive
  } else if (patientId && patientId.startsWith('P')) {
    return 'success' // Green for negative
  }
  return 'primary' // Default
}

function getPatientIdIcon(patientId) {
  if (patientId && patientId.startsWith('PR')) {
    return 'mdi-alert' // Alert icon for positive
  } else if (patientId && patientId.startsWith('P')) {
    return 'mdi-check' // Check icon for negative
  }
  return 'mdi-account'
}

function getConsentColor(consentStatus) {
  return consentStatus === 'YES' ? 'green' : 'red'
}

function getConsentIcon(consentStatus) {
  return consentStatus === 'YES' ? 'mdi-check' : 'mdi-close'
}

function getHivStatusColor(status) {
  const colors = {
    'Reactive': 'warning',
    'Non-Reactive': 'success'
  }
  return colors[status] || 'grey'
}

function getHivStatusIcon(status) {
  return status === 'Reactive' ? 'mdi-alert' : 'mdi-check'
}

function showSnackbar(message, color = 'success') {
  snackbar.value = {
    show: true,
    message,
    color
  }
}

// Event handlers
function clearFilters() {
  search.value = ''
  filters.value = {
    consentStatus: null,
    hivStatus: null
  }
  sortBy.value = 'created_at'
  page.value = 1
}

function openEnrollmentDialog() {
  selectedPatient.value = null
  dialogMode.value = 'create'
  showPatientDialog.value = true
}

function viewPatient(patient) {
  selectedPatient.value = { ...patient }
  dialogMode.value = 'view'
  showPatientDialog.value = true
}

function editPatient(patient) {
  selectedPatient.value = { ...patient }
  dialogMode.value = 'edit'
  showPatientDialog.value = true
}

async function deletePatient(patient) {
  if (confirm(`Are you sure you want to delete patient ${patient.patient_id} (${patient.name})? This action cannot be undone.`)) {
    try {
      loading.value = true
      await patientsApi.delete(patient.patient_id)
      await fetchPatients() // Refresh the list
      await fetchStats() // Refresh stats
      showSnackbar('Patient deleted successfully')
    } catch (err) {
      console.error('Error deleting patient:', err)
      showSnackbar('Failed to delete patient: ' + (err.response?.data?.message || err.message), 'error')
    } finally {
      loading.value = false
    }
  }
}

function exportPatientData() {
  try {
    // Prepare data for export
    const exportData = patients.value.map(patient => ({
      patient_id: patient.patient_id,
      name: patient.name,
      date_of_birth: patient.date_of_birth,
      age: calculateAge(patient.date_of_birth),
      contact_info: patient.contact_info,
      consent: patient.consent_status || (patient.consent ? 'YES' : 'NO'),
      hiv_status: patient.hiv_status,
      enrollment_date: patient.created_at,
      updated_at: patient.updated_at
    }))
    
    const dataStr = JSON.stringify(exportData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `patients-export-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showSnackbar('Patient data exported successfully')
  } catch (err) {
    console.error('Error exporting data:', err)
    showSnackbar('Failed to export patient data', 'error')
  }
}

async function handlePatientSaved() {
  showPatientDialog.value = false
  await fetchPatients() // Refresh the list
  await fetchStats() // Refresh stats
  showSnackbar('Patient saved successfully')
}

// Watch for search/filter changes to reload data from server
watch([search, filters], async () => {
  // Reset to first page when filters change
  page.value = 1
  // Reload patients from server with new filters
  await fetchPatients()
}, { deep: true })

// Watch for page changes (client-side pagination)
watch(page, () => {
  // Just scroll to top when page changes
  window.scrollTo({ top: 0, behavior: 'smooth' })
})
</script>

<style scoped>
.page-header {
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
  padding-bottom: 16px;
}

.header-actions {
  flex-wrap: wrap;
}

.gap-2 {
  gap: 8px;
}

.contact-info {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.v-data-table-header) {
  background-color: rgba(0, 0, 0, 0.02);
}

:deep(.v-data-table .v-table__wrapper > table > thead > tr > th) {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.87);
}

@media (max-width: 960px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>