<!-- frontend/src/pages/admin/Patients.vue - FINAL ENHANCED VERSION -->
<template>
  <v-container fluid class="pa-4 pa-md-6">
    <!-- Header Section -->
    <div class="d-flex flex-wrap justify-space-between align-center mb-4">
      <div>
        <h1 class="text-h5 text-md-h4 font-weight-bold" :style="{ color: 'var(--color-primary)' }">
          Patient Management
        </h1>
        <p class="text-body-2 text-medium-emphasis mt-1">
          Manage patient records and enrollment
        </p>
      </div>

      <div class="d-flex gap-2 mt-2 mt-sm-0">
        <v-btn color="primary" size="small" prepend-icon="mdi-account-plus" @click="openEnrollmentDialog"
          :loading="loading"
          :style="{ backgroundColor: 'var(--color-primary)', color: 'var(--color-text-on-primary)' }">
          New Enrollment
        </v-btn>
        <v-btn variant="outlined" size="small" prepend-icon="mdi-download" @click="exportPatientData"
          :disabled="patients.length === 0" :style="{ borderColor: 'var(--color-border)' }">
          Export
        </v-btn>
      </div>
    </div>

    <!-- Compact Stats Cards -->
    <v-row class="mb-4">
      <v-col v-for="stat in compactStats" :key="stat.label" cols="6" sm="3" md="3" lg="3">
        <v-card elevation="0" border class="stat-card"
          :style="{ borderColor: 'var(--color-border)', borderRadius: 'var(--radius-md)' }">
          <v-card-text class="pa-3 d-flex align-center">
            <v-avatar size="40" :color="stat.color" class="mr-3"
              :style="{ backgroundColor: `var(--color-${stat.color})` }">
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

    <!-- Error Alert -->
    <v-alert v-if="error" :type="'error'" variant="tonal" class="mb-4" closable @click:close="error = ''"
      :style="{ backgroundColor: 'var(--color-error-light)', color: 'var(--color-error-dark)' }">
      <template v-slot:title>Error Loading Patients</template>
      {{ error }}
    </v-alert>

    <!-- Search and Filters - ULTRA COMPACT & ALIGNED -->
    <v-card elevation="0" border class="mb-4"
      :style="{ borderColor: 'var(--color-border)', borderRadius: 'var(--radius-md)' }">
      <v-card-text class="pa-2">
        <div class="d-flex flex-wrap align-center gap-2">
          <!-- Search - Takes remaining space -->
          <div style="flex: 2; min-width: 200px;">
            <v-text-field v-model="search" density="compact" variant="outlined"
              placeholder="Search by name, ID, or contact..." prepend-inner-icon="mdi-magnify" hide-details clearable
              @update:model-value="debouncedFetchPatients" class="compact-field" />
          </div>

          <!-- Filter 1 - Consent -->
          <div style="flex: 1; min-width: 120px;">
            <v-select v-model="filters.consentStatus" density="compact" variant="outlined" :items="consentOptions"
              placeholder="Consent" hide-details clearable @update:model-value="debouncedFetchPatients"
              class="compact-field" />
          </div>

          <!-- Filter 2 - HIV Status -->
          <div style="flex: 1; min-width: 120px;">
            <v-select v-model="filters.hivStatus" density="compact" variant="outlined" :items="hivStatusOptions"
              placeholder="HIV Status" hide-details clearable @update:model-value="debouncedFetchPatients"
              class="compact-field" />
          </div>

          <!-- Sort By -->
          <div style="flex: 1; min-width: 110px;">
            <v-select v-model="sortBy" density="compact" variant="outlined" :items="sortFields" placeholder="Sort"
              hide-details @update:model-value="loadPatients" class="compact-field" />
          </div>

          <!-- Sort Order Toggle -->
          <div>
            <v-btn variant="outlined" density="comfortable" size="small"
              :icon="sortOrder === 'asc' ? 'mdi-sort-ascending' : 'mdi-sort-descending'" @click="toggleSortOrder"
              :style="{ borderColor: 'var(--color-border)', minWidth: '36px' }" />
          </div>

          <!-- Clear Filters -->
          <div>
            <v-btn variant="text" color="primary" size="small" prepend-icon="mdi-filter-remove" @click="clearFilters"
              :disabled="!hasActiveFilters" :style="{ color: 'var(--color-primary)' }" class="px-2">
              Clear
            </v-btn>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <!-- Main Table - Compact -->
    <v-card elevation="0" border :style="{ borderColor: 'var(--color-border)', borderRadius: 'var(--radius-md)' }">
      <v-card-title class="d-flex justify-space-between align-center py-3 px-4">
        <span class="text-subtitle-1 font-weight-medium">Patient Records</span>
        <span class="text-caption text-medium-emphasis">
          Showing {{ paginationStart }} to {{ paginationEnd }} of {{ totalPatients }}
        </span>
      </v-card-title>

      <v-divider :style="{ borderColor: 'var(--color-divider)' }" />

      <v-card-text class="pa-0">
        <v-data-table-server v-model:items-per-page="perPage" v-model:page="page" :headers="headers" :items="patients"
          :items-length="totalPatients" :loading="loading" :search="search" @update:options="handleTableSort"
          class="elevation-0 patients-table" density="compact">
          <!-- Loading State -->
          <template v-slot:loading>
            <v-skeleton-loader type="table-row@10" />
          </template>

          <!-- Patient ID Column - Clickable & Styled with --color-info -->
          <template v-slot:item.patient_id="{ item }">
            <span class="patient-id-link font-weight-medium cursor-pointer" :style="{ color: 'var(--color-info)' }"
              @click="goToPatientDetails(item)">
              {{ item.patient_id }}
            </span>
          </template>

          <!-- Name Column - Simplified without avatar -->
          <template v-slot:item.full_name="{ item }">
            <div>
              <div class="text-body-2 font-weight-medium">{{ item.last_name }}, {{ item.first_name }}</div>
              <div class="text-caption text-medium-emphasis">
                {{ formatDateOfBirth(item.date_of_birth) }}
              </div>
            </div>
          </template>

          <!-- Age Column -->
          <template v-slot:item.age="{ item }">
            <span class="text-caption">{{ item.age || calculateAge(item.date_of_birth) }}y</span>
          </template>

          <!-- Gender Column -->
          <template v-slot:item.gender="{ item }">
            <span class="text-caption">{{ formatGender(item.gender) }}</span>
          </template>

          <!-- Contact Column -->
          <template v-slot:item.contact_number="{ item }">
            <span class="text-caption">{{ item.contact_number || '—' }}</span>
          </template>

          <!-- Consent Column -->
          <template v-slot:item.consent="{ item }">
            <v-chip size="x-small" :color="getConsentColor(item.consent)" variant="flat"
              :prepend-icon="getConsentIcon(item.consent)">
              {{ item.consent ? 'YES' : 'NO' }}
            </v-chip>
          </template>

          <!-- HIV Status Column -->
          <template v-slot:item.hiv_status="{ item }">
            <v-chip size="x-small" :color="getHivStatusColor(item.hiv_status)" variant="flat"
              :prepend-icon="getHivStatusIcon(item.hiv_status)">
              {{ formatHivStatus(item.hiv_status) }}
            </v-chip>
          </template>

          <!-- Enrollment Date Column -->
          <template v-slot:item.created_at="{ item }">
            <div class="text-caption">{{ formatDate(item.created_at) }}</div>
          </template>

          <!-- Actions Column - Only Edit and Delete -->
          <template v-slot:item.actions="{ item }">
            <div class="d-flex gap-1">
              <v-btn size="x-small" variant="text" color="warning" icon="mdi-pencil" @click="editPatient(item)"
                :style="{ color: 'var(--color-warning)' }" title="Edit patient" />
              <v-btn size="x-small" variant="text" color="error" icon="mdi-delete" @click="deletePatient(item)"
                :style="{ color: 'var(--color-error)' }" title="Delete patient" />
            </div>
          </template>

          <!-- Empty State -->
          <template v-slot:no-data>
            <div class="text-center py-6">
              <v-icon size="48" color="grey-lighten-2" class="mb-2">mdi-account-off</v-icon>
              <div class="text-subtitle-2 text-grey">No Patients Found</div>
              <div class="text-caption text-grey mt-1">
                {{ hasActiveFilters ? 'Try adjusting your filters' : 'Enroll your first patient' }}
              </div>
              <v-btn color="primary" size="small" @click="openEnrollmentDialog" class="mt-3"
                :style="{ backgroundColor: 'var(--color-primary)' }">
                <v-icon start>mdi-account-plus</v-icon>
                Enroll First
              </v-btn>
            </div>
          </template>
        </v-data-table-server>
      </v-card-text>
    </v-card>

    <!-- Patient Dialog -->
    <PatientDialog v-model="showPatientDialog" :patient="selectedPatient" :mode="dialogMode"
      @saved="handlePatientSaved" />

    <!-- Snackbar for notifications -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000"
      :style="{ backgroundColor: `var(--color-${snackbar.color})` }">
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { patientsApi } from '@/api'
import PatientDialog from '@/components/PatientDialog.vue'
import debounce from 'lodash/debounce'

const router = useRouter()

// Reactive state
const search = ref('')
const filters = ref({
  consentStatus: null,
  hivStatus: null
})
const sortBy = ref('created_at_desc') // Combined field_order format
const sortOrder = ref('desc')
const page = ref(1)
const perPage = ref(10)
const loading = ref(false)
const error = ref('')
const patients = ref([])
const totalPatients = ref(0)
const stats = ref({
  total: 0,
  consented: 0,
  reactive: 0,
  daily_enrollments: 0
})

const showPatientDialog = ref(false)
const selectedPatient = ref(null)
const dialogMode = ref('create')

const snackbar = ref({
  show: false,
  message: '',
  color: 'success'
})

// Compact stats cards
const compactStats = computed(() => [
  {
    label: 'Total',
    value: stats.value.total,
    icon: 'mdi-account-multiple',
    color: 'primary'
  },
  {
    label: 'Consented',
    value: stats.value.consented,
    icon: 'mdi-check-circle',
    color: 'success'
  },
  {
    label: 'Reactive',
    value: stats.value.reactive,
    icon: 'mdi-alert-circle',
    color: 'warning'
  },
  {
    label: 'Today',
    value: stats.value.daily_enrollments,
    icon: 'mdi-calendar-today',
    color: 'info'
  }
])

// Table headers - Removed view action
const headers = ref([
  { title: 'Patient ID', key: 'patient_id', sortable: true, width: '110' },
  { title: 'Name', key: 'full_name', sortable: true },
  { title: 'Age', key: 'age', sortable: true, width: '60' },
  { title: 'Gender', key: 'gender', sortable: true, width: '80' },
  { title: 'Contact', key: 'contact_number', sortable: true, width: '120' },
  { title: 'Consent', key: 'consent', sortable: true, width: '85' },
  { title: 'HIV Status', key: 'hiv_status', sortable: true, width: '100' },
  { title: 'Enrolled', key: 'created_at', sortable: true, width: '90' },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end', width: '80' }
])

// Filter options
const consentOptions = [
  { title: 'Consented', value: 'YES' },
  { title: 'Not Consented', value: 'NO' }
]

const hivStatusOptions = [
  { title: 'Reactive', value: 'REACTIVE' },
  { title: 'Non-Reactive', value: 'NON_REACTIVE' }
]

// Sort fields with combined values
const sortFields = [
  { title: 'Newest First', value: 'created_at_desc' },
  { title: 'Oldest First', value: 'created_at_asc' },
  { title: 'Name (A-Z)', value: 'full_name_asc' },
  { title: 'Name (Z-A)', value: 'full_name_desc' },
  { title: 'ID (A-Z)', value: 'patient_id_asc' },
  { title: 'ID (Z-A)', value: 'patient_id_desc' }
]

// Computed properties
const paginationStart = computed(() => (page.value - 1) * perPage.value + 1)
const paginationEnd = computed(() => Math.min(page.value * perPage.value, totalPatients.value))

const hasActiveFilters = computed(() => {
  return search.value || filters.value.consentStatus || filters.value.hivStatus
})

// Debounced fetch
const debouncedFetchPatients = debounce(() => {
  page.value = 1
  loadPatients()
}, 300)

// Lifecycle
onMounted(async () => {
  await loadPatients()
  await fetchStats()
})

// Methods
async function loadPatients() {
  loading.value = true
  error.value = ''

  try {
    // Parse sort field and order from combined value
    let sortField = 'created_at'
    let sortDir = 'desc'

    if (sortBy.value && typeof sortBy.value === 'string') {
      const parts = sortBy.value.split('_')
      if (parts.length > 1 && ['asc', 'desc'].includes(parts[parts.length - 1])) {
        sortField = parts.slice(0, -1).join('_')
        sortDir = parts[parts.length - 1]
      }
    }

    // Map display fields to database fields
    const fieldMapping = {
      'full_name': 'last_name',
      'age': 'date_of_birth'
    }

    if (fieldMapping[sortField]) {
      sortField = fieldMapping[sortField]
    }

    const params = {
      page: page.value,
      limit: perPage.value,
      sort_by: sortField,
      sort_order: sortDir
    }

    if (search.value?.trim()) {
      params.search = search.value.trim()
    }
    if (filters.value.consentStatus) {
      params.consent = filters.value.consentStatus
    }
    if (filters.value.hivStatus) {
      params.hiv_status = filters.value.hivStatus
    }

    const response = await patientsApi.getPagination(params)
    patients.value = response.data.patients || []
    totalPatients.value = response.data.pagination?.total || 0

  } catch (err) {
    console.error('Error fetching patients:', err)
    error.value = err.response?.data?.message || 'Failed to load patients'
    patients.value = []
    totalPatients.value = 0
    showSnackbar('Error loading patients', 'error')
  } finally {
    loading.value = false
  }
}

async function fetchStats() {
  try {
    const response = await patientsApi.getStats()
    stats.value = response.data
  } catch (err) {
    console.error('Error fetching stats:', err)
  }
}

function handleTableSort(options) {
  const { sortBy: sortItems } = options
  if (sortItems?.length) {
    const { key, order } = sortItems[0]
    // Combine into single value for the select
    sortBy.value = `${key}_${order}`
    sortOrder.value = order
  }
  loadPatients()
}

function toggleSortOrder() {
  const newOrder = sortOrder.value === 'asc' ? 'desc' : 'asc'
  sortOrder.value = newOrder
  // Update the combined sortBy value
  const baseField = sortBy.value.split('_').slice(0, -1).join('_') || 'created_at'
  sortBy.value = `${baseField}_${newOrder}`
  loadPatients()
}

// Navigation to patient details
function goToPatientDetails(patient) {
  router.push(`/admin/patients/${patient.patient_id}`)
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
    month: 'short',
    day: 'numeric'
  })
}

function formatDateOfBirth(dateString) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function getConsentColor(consent) {
  return consent ? 'success' : 'error'
}

function getConsentIcon(consent) {
  return consent ? 'mdi-check' : 'mdi-close'
}

function getHivStatusColor(status) {
  return status === 'REACTIVE' ? 'warning' : 'success'
}

function getHivStatusIcon(status) {
  return status === 'REACTIVE' ? 'mdi-alert' : 'mdi-check'
}

function showSnackbar(message, color = 'success') {
  snackbar.value = { show: true, message, color }
}

// Event handlers
function clearFilters() {
  search.value = ''
  filters.value = { consentStatus: null, hivStatus: null }
  sortBy.value = 'created_at_desc'
  sortOrder.value = 'desc'
  page.value = 1
  loadPatients()
}

function openEnrollmentDialog() {
  selectedPatient.value = null
  dialogMode.value = 'create'
  showPatientDialog.value = true
}

function editPatient(patient) {
  selectedPatient.value = { ...patient }
  dialogMode.value = 'edit'
  showPatientDialog.value = true
}

async function deletePatient(patient) {
  if (confirm(`Delete patient ${patient.patient_id}?`)) {
    try {
      loading.value = true
      await patientsApi.delete(patient.patient_id)
      await loadPatients()
      await fetchStats()
      showSnackbar('Patient deleted successfully')
    } catch (err) {
      showSnackbar('Failed to delete patient', 'error')
    } finally {
      loading.value = false
    }
  }
}

function exportPatientData() {
  try {
    const exportData = patients.value.map(patient => ({
      patient_id: patient.patient_id,
      first_name: patient.first_name,
      last_name: patient.last_name,
      middle_name: patient.middle_name,
      date_of_birth: patient.date_of_birth,
      age: patient.age || calculateAge(patient.date_of_birth),
      gender: patient.gender,
      contact_number: patient.contact_number,
      consent: patient.consent ? 'YES' : 'NO',
      hiv_status: patient.hiv_status,
      enrollment_date: patient.created_at
    }))

    const dataStr = JSON.stringify(exportData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `patients-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showSnackbar('Patient data exported successfully')
  } catch (err) {
    showSnackbar('Failed to export patient data', 'error')
  }
}

async function handlePatientSaved() {
  showPatientDialog.value = false
  await loadPatients()
  await fetchStats()
  showSnackbar('Patient saved successfully')
}
</script>

<style scoped>
/* Import CSS variables */
@import '@/styles/variables.css';

.gap-2 {
  gap: var(--spacing-sm);
}

.gap-1 {
  gap: var(--spacing-xs);
}

/* Stat card styling */
.stat-card {
  transition: all var(--transition-fast);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

/* Patient ID link styling */
.patient-id-link {
  cursor: pointer;
  text-decoration: none;
  transition: opacity var(--transition-fast);
  font-weight: 600;
}

.patient-id-link:hover {
  opacity: 0.8;
  text-decoration: underline;
}

/* Compact field styling */
.compact-field {
  width: 100%;
}

.compact-field :deep(.v-field) {
  font-size: var(--font-size-sm);
}

.compact-field :deep(.v-field__input) {
  min-height: 36px;
  padding-top: 0;
  padding-bottom: 0;
}

.compact-field :deep(.v-label) {
  font-size: var(--font-size-sm);
}

/* Table styling */
:deep(.v-data-table-header th) {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-secondary);
  background-color: var(--color-surface-dark);
  padding: var(--spacing-sm) var(--spacing-md) !important;
}

:deep(.v-data-table .v-table__wrapper > table > tbody > tr > td) {
  padding: var(--spacing-sm) var(--spacing-md) !important;
  font-size: var(--font-size-sm);
  border-bottom: 1px solid var(--color-divider);
}

:deep(.v-data-table .v-table__wrapper > table > tbody > tr:hover) {
  background-color: var(--color-surface-light);
}

/* Chip styling */
:deep(.v-chip) {
  font-size: var(--font-size-xs);
  height: 22px;
}

:deep(.v-chip.v-chip--size-x-small) {
  --v-chip-height: 20px;
  font-size: var(--font-size-xs);
}

/* Button styling */
:deep(.v-btn--size-small) {
  font-size: var(--font-size-xs);
  letter-spacing: 0.3px;
}

:deep(.v-btn--icon.v-btn--size-x-small) {
  width: 28px;
  height: 28px;
}

/* Responsive adjustments */
@media (max-width: 960px) {
  :deep(.v-data-table .v-table__wrapper > table > tbody > tr > td) {
    padding: var(--spacing-xs) var(--spacing-sm) !important;
  }

  :deep(.v-data-table-header th) {
    padding: var(--spacing-xs) var(--spacing-sm) !important;
  }
}

/* Dark theme support */
:root.dark-theme .stat-card {
  background-color: var(--color-surface);
  border-color: var(--color-border);
}

:root.dark-theme :deep(.v-data-table-header th) {
  background-color: var(--color-surface-dark);
  color: var(--color-text-secondary);
}

:root.dark-theme :deep(.v-data-table .v-table__wrapper > table > tbody > tr:hover) {
  background-color: var(--color-surface-dark);
}

.cursor-pointer {
  cursor: pointer;
}
</style>