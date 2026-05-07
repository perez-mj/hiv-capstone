<!-- frontend/src/pages/admin/Patients.vue - WITH CSV IMPORT/EXPORT -->
<template>
  <v-container fluid class="pa-4 pa-md-6">
    <!-- Header Section -->
    <div class="d-flex flex-wrap justify-space-between align-center mb-4">
      <div>
        <h1 class="text-h5 text-md-h4 font-weight-bold text-primary">
          Patient Management
        </h1>
        <p class="text-body-2 text-medium-emphasis mt-1">
          Manage patient records and enrollment
        </p>
      </div>

      <div class="d-flex gap-2 mt-2 mt-sm-0">
        <v-tooltip text="Import CSV" location="bottom">
          <template v-slot:activator="{ props }">
            <v-btn v-bind="props" variant="outlined" size="small" @click="openImportDialog">
              <v-icon>mdi-upload</v-icon>
            </v-btn>
          </template>
        </v-tooltip>

        <v-tooltip text="Export CSV" location="bottom">
          <template v-slot:activator="{ props }">
            <v-btn v-bind="props" variant="outlined" size="small" @click="exportPatientData" :disabled="patients.length === 0">
              <v-icon>mdi-download</v-icon>
            </v-btn>
          </template>
        </v-tooltip>

        <v-tooltip :text="maskSensitiveData ? 'Unmask Data' : 'Mask Data'" location="bottom">
          <template v-slot:activator="{ props }">
            <v-btn v-bind="props" variant="outlined" size="small" :color="maskSensitiveData ? 'warning' : 'primary'" @click="toggleMaskSensitiveData">
              <v-icon>{{ maskSensitiveData ? 'mdi-eye-off' : 'mdi-eye' }}</v-icon>
            </v-btn>
          </template>
        </v-tooltip>

        <v-btn color="primary" size="small" prepend-icon="mdi-account-plus" @click="openEnrollmentDialog" :loading="loading">
          New
        </v-btn>
      </div>
    </div>

    <!-- Compact Stats Cards -->
    <v-row class="mb-4">
      <v-col v-for="stat in compactStats" :key="stat.label" cols="6" sm="3" md="3" lg="3">
        <v-card elevation="0" variant="outlined" class="stat-card">
          <v-card-text class="pa-3 d-flex align-center">
            <v-avatar size="40" :color="stat.color" class="mr-3">
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
    <v-alert v-if="error" type="error" variant="tonal" class="mb-4" closable @click:close="error = ''">
      <template v-slot:title>Error Loading Patients</template>
      {{ error }}
    </v-alert>

    <!-- Search and Filters -->
    <v-card elevation="0" variant="outlined" class="mb-4">
      <v-card-text class="pa-2">
        <div class="d-flex flex-wrap align-center ga-2">
          <v-text-field 
            v-model="search" 
            density="compact" 
            variant="outlined"
            placeholder="Search patients..." 
            prepend-inner-icon="mdi-magnify" 
            hide-details 
            clearable
            @update:model-value="debouncedFetchPatients" 
            class="compact-field"
            style="flex: 2; min-width: 200px;"
          />

          <div class="d-flex align-center ga-1 flex-wrap">
            <span class="text-caption text-medium-emphasis mr-1">HIV:</span>
            <v-chip
              v-for="option in hivStatusOptions"
              :key="option.value"
              size="small"
              :color="filters.hiv_status === option.value ? 'primary' : 'default'"
              variant="flat"
              @click="toggleFilter('hiv_status', option.value)"
            >
              {{ option.title }}
            </v-chip>
          </div>

          <div class="d-flex align-center ga-1 flex-wrap">
            <span class="text-caption text-medium-emphasis mr-1">Sex:</span>
            <v-chip
              v-for="option in sexOptions"
              :key="option.value"
              size="small"
              :color="filters.sex === option.value ? 'primary' : 'default'"
              variant="flat"
              @click="toggleFilter('sex', option.value)"
            >
              {{ option.title }}
            </v-chip>
          </div>

          <v-select 
            v-model="sortSelect" 
            density="compact" 
            variant="outlined" 
            :items="sortFields" 
            placeholder="Sort"
            hide-details 
            @update:model-value="handleSortChange" 
            class="compact-field"
            style="min-width: 130px;"
          />

          <v-btn 
            variant="text" 
            color="primary" 
            size="small" 
            prepend-icon="mdi-filter-remove" 
            @click="clearFilters"
            :disabled="!hasActiveFilters"
            class="px-2"
          >
            Clear
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- Main Table -->
    <v-card elevation="0" variant="outlined">
      <v-card-title class="d-flex justify-space-between align-center py-3 px-4">
        <span class="text-subtitle-1 font-weight-medium">Patient Records</span>
        <span class="text-caption text-medium-emphasis">
          Showing {{ paginationStart }} to {{ paginationEnd }} of {{ totalPatients }}
        </span>
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-0">
        <v-data-table-server 
          v-model:items-per-page="perPage" 
          v-model:page="page" 
          :headers="headers" 
          :items="patients"
          :items-length="totalPatients" 
          :loading="loading" 
          @update:options="updateOptions"
          density="compact" 
          hover
          :server-items-length="totalPatients"
        >
          <template v-slot:loading>
            <v-skeleton-loader type="table-row@10" />
          </template>

          <template v-slot:item.patient_facility_code="{ item }">
            <span 
              class="text-info font-weight-medium cursor-pointer text-decoration-none"
              @click="goToPatientDetails(item)"
              style="cursor: pointer;"
            >
              {{ maskSensitiveData ? maskString(item.patient_facility_code, 4) : item.patient_facility_code }}
            </span>
          </template>

          <template v-slot:item.full_name="{ item }">
            <div>
              <div class="text-body-2 font-weight-medium">
                <span v-if="maskSensitiveData">
                  {{ maskString(item.last_name, 2) }}, {{ maskString(item.first_name, 2) }}
                </span>
                <span v-else>
                  {{ item.last_name }}, {{ item.first_name }}
                </span>
                <span v-if="item.middle_name && !maskSensitiveData" class="text-caption text-medium-emphasis">
                  {{ item.middle_name }}
                </span>
              </div>
              <div class="text-caption text-medium-emphasis">
                DOB: {{ formatDate(item.date_of_birth, maskSensitiveData) }}
              </div>
            </div>
          </template>

          <template v-slot:item.age="{ item }">
            <span class="text-caption">{{ calculateAge(item.date_of_birth) }}y</span>
          </template>

          <template v-slot:item.sex="{ item }">
            <span class="text-caption">{{ formatSex(item.sex) }}</span>
          </template>

          <template v-slot:item.contact_number="{ item }">
            <span class="text-caption">
              {{ maskSensitiveData ? maskContact(item.contact_number) : (item.contact_number || '—') }}
            </span>
          </template>

          <template v-slot:item.hiv_status="{ item }">
            <v-chip size="x-small" :color="getHivStatusColor(item.hiv_status)" variant="flat">
              {{ formatHivStatus(item.hiv_status) }}
            </v-chip>
          </template>

          <template v-slot:item.created_at="{ item }">
            <div class="text-caption">{{ formatDateTime(item.created_at) }}</div>
          </template>

          <template v-slot:item.actions="{ item }">
            <div class="d-flex gap-1">
              <v-btn size="x-small" variant="text" color="warning" icon="mdi-pencil" @click="editPatient(item)" title="Edit patient" />
              <v-btn size="x-small" variant="text" color="error" icon="mdi-delete" @click="deletePatient(item)" title="Delete patient" />
            </div>
          </template>

          <template v-slot:no-data>
            <div class="text-center py-6">
              <v-icon size="48" color="grey-lighten-2" class="mb-2">mdi-account-off</v-icon>
              <div class="text-subtitle-2 text-grey">No Patients Found</div>
              <div class="text-caption text-grey mt-1">
                {{ hasActiveFilters ? 'Try adjusting your filters' : 'Enroll your first patient' }}
              </div>
              <v-btn color="primary" size="small" @click="openEnrollmentDialog" class="mt-3">
                <v-icon start>mdi-account-plus</v-icon>
                Enroll First
              </v-btn>
            </div>
          </template>
        </v-data-table-server>
      </v-card-text>
    </v-card>

    <!-- Patient Dialog -->
    <PatientDialog v-model="showPatientDialog" :patient="selectedPatient" :mode="dialogMode" @saved="handlePatientSaved" />

    <!-- Import CSV Dialog -->
    <v-dialog v-model="showImportDialog" max-width="800">
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
          <span class="text-h5">Import Patients from CSV</span>
          <v-btn icon @click="showImportDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        
        <v-card-text>
          <v-alert type="info" variant="tonal" class="mb-4">
            <strong>CSV Format Instructions:</strong>
            <ul class="mt-2">
              <li>First row must contain column headers</li>
              <li><strong>Required columns:</strong> first_name, last_name, date_of_birth, sex, hiv_status</li>
              <li><strong>Optional columns:</strong> middle_name, address, contact_number, diagnosis_date, art_start_date, latest_cd4_count, latest_viral_load</li>
              <li>Date format: YYYY-MM-DD (e.g., 1990-01-15)</li>
              <li>Sex values: MALE, FEMALE, OTHER</li>
              <li>HIV Status values: REACTIVE, NON_REACTIVE, INDETERMINATE</li>
            </ul>
          </v-alert>

          <div class="d-flex justify-space-between align-center mb-4">
            <v-btn variant="text" color="primary" prepend-icon="mdi-download" @click="downloadTemplate">
              Download CSV Template
            </v-btn>
            <v-btn variant="text" color="info" prepend-icon="mdi-help-circle" @click="showSampleData = !showSampleData">
              Show Sample Data
            </v-btn>
          </div>

          <!-- Sample Data Preview -->
          <v-expand-transition>
            <v-card v-if="showSampleData" variant="tonal" class="mb-4" color="info">
              <v-card-text>
                <div class="text-caption font-weight-medium mb-2">Sample CSV Content:</div>
                <pre class="sample-csv">first_name,last_name,middle_name,date_of_birth,sex,address,contact_number,hiv_status,diagnosis_date,art_start_date,latest_cd4_count,latest_viral_load
John,Doe,Smith,1990-01-15,MALE,123 Main St,+1234567890,REACTIVE,2023-01-01,2023-02-01,500,40
Jane,Smith,,1985-06-20,FEMALE,456 Oak Ave,+1987654321,NON_REACTIVE,,,,
Michael,Brown,James,1978-03-10,MALE,789 Pine Rd,+1122334455,INDETERMINATE,2024-01-15,2024-02-01,450,100</pre>
              </v-card-text>
            </v-card>
          </v-expand-transition>

          <v-file-input
            v-model="importFile"
            label="Choose CSV file"
            accept=".csv,.text/csv,.application/vnd.ms-excel"
            variant="outlined"
            density="comfortable"
            prepend-icon="mdi-upload"
            show-size
            @update:model-value="validateImportFile"
          />

          <!-- Preview imported data -->
          <div v-if="importPreview.length > 0" class="mt-4">
            <v-divider class="mb-3" />
            <div class="d-flex justify-space-between align-center mb-2">
              <span class="text-subtitle-2 font-weight-medium">Preview (First 5 rows):</span>
              <span class="text-caption text-medium-emphasis">Total records found: {{ importValidation?.count || 0 }}</span>
            </div>
            <v-table density="compact" class="preview-table">
              <thead>
                <tr>
                  <th v-for="col in previewColumns" :key="col">{{ col }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in importPreview" :key="idx">
                  <td v-for="col in previewColumns" :key="col">
                    {{ truncateText(row[col], 20) }}
                  </td>
                </tr>
              </tbody>
            </v-table>
          </div>

          <div v-if="importValidation && !importValidation.valid" class="mt-3">
            <v-alert type="error" variant="tonal">
              <div class="font-weight-medium">Validation Errors:</div>
              <ul class="mt-1 mb-0">
                <li v-for="(error, idx) in importValidation.errors" :key="idx">{{ error }}</li>
              </ul>
            </v-alert>
          </div>

          <div v-if="importValidation && importValidation.valid" class="mt-3">
            <v-alert type="success" variant="tonal">
              ✅ File is valid. Found {{ importValidation.count }} patient records ready to import.
            </v-alert>
          </div>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn color="secondary" variant="text" @click="showImportDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="importLoading" :disabled="!importValidation?.valid" @click="importPatients">
            Import {{ importValidation?.count || 0 }} Patients
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Toast Notifications -->
    <div class="toast-container">
      <transition-group name="toast">
        <div v-for="toast in toasts" :key="toast.id" class="toast" :class="`toast-${toast.type}`" @click="removeToast(toast.id)">
          <div class="toast-content">
            <v-icon :icon="toast.icon" size="20" class="mr-2" />
            <span>{{ toast.message }}</span>
          </div>
          <div class="toast-progress" :style="{ animationDuration: `${toast.duration}ms` }" />
        </div>
      </transition-group>
    </div>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { patientsApi } from '@/api'
import PatientDialog from '@/components/PatientDialog.vue'
import debounce from 'lodash/debounce'
import Papa from 'papaparse' // Add this package: npm install papaparse

const router = useRouter()

// Reactive state
const search = ref('')
const filters = ref({
  hiv_status: null,
  sex: null
})
const sortSelect = ref('created_at_desc')
const page = ref(1)
const perPage = ref(10)
const loading = ref(false)
const error = ref('')
const patients = ref([])
const totalPatients = ref(0)
const maskSensitiveData = ref(false)
const stats = ref({
  total_patients: 0,
  by_hiv_status: [],
  by_sex: [],
  on_art: 0,
  recent_registrations: 0
})

// Toast notifications
const toasts = ref([])
let toastId = 0

// Import dialog
const showImportDialog = ref(false)
const importFile = ref(null)
const importLoading = ref(false)
const importValidation = ref(null)
const importPreview = ref([])
const previewColumns = ref([])
const showSampleData = ref(false)

// Patient dialog
const showPatientDialog = ref(false)
const selectedPatient = ref(null)
const dialogMode = ref('create')

function showToast(message, type = 'success', duration = 3000) {
  const id = toastId++
  const icon = {
    success: 'mdi-check-circle',
    error: 'mdi-alert-circle',
    warning: 'mdi-alert',
    info: 'mdi-information'
  }[type] || 'mdi-information'
  
  toasts.value.push({ id, message, type, icon, duration })
  setTimeout(() => removeToast(id), duration)
}

function removeToast(id) {
  const index = toasts.value.findIndex(t => t.id === id)
  if (index !== -1) toasts.value.splice(index, 1)
}

function truncateText(text, length) {
  if (!text) return '—'
  const str = String(text)
  return str.length > length ? str.substring(0, length) + '...' : str
}

const compactStats = computed(() => {
  const reactiveStat = Array.isArray(stats.value.by_hiv_status) 
    ? stats.value.by_hiv_status.find(s => s.hiv_status === 'REACTIVE') 
    : { count: 0 }
  
  return [
    { label: 'Total Patients', value: stats.value.total_patients || 0, icon: 'mdi-account-multiple', color: 'primary' },
    { label: 'On ART', value: stats.value.on_art || 0, icon: 'mdi-pill', color: 'success' },
    { label: 'Reactive', value: reactiveStat?.count || 0, icon: 'mdi-alert-circle', color: 'warning' },
    { label: 'Recent (30d)', value: stats.value.recent_registrations || 0, icon: 'mdi-calendar-plus', color: 'info' }
  ]
})

const headers = ref([
  { title: 'Facility ID', key: 'patient_facility_code', sortable: true, width: '120' },
  { title: 'Name', key: 'full_name', sortable: false },
  { title: 'Age', key: 'age', sortable: true, width: '60' },
  { title: 'Sex', key: 'sex', sortable: true, width: '70' },
  { title: 'Contact', key: 'contact_number', sortable: false, width: '120' },
  { title: 'HIV Status', key: 'hiv_status', sortable: true, width: '100' },
  { title: 'Enrolled', key: 'created_at', sortable: true, width: '90' },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end', width: '80' }
])

const hivStatusOptions = [
  { title: 'Reactive', value: 'REACTIVE' },
  { title: 'Non-Reactive', value: 'NON_REACTIVE' },
  { title: 'Indeterminate', value: 'INDETERMINATE' }
]

const sexOptions = [
  { title: 'Male', value: 'MALE' },
  { title: 'Female', value: 'FEMALE' },
  { title: 'Other', value: 'OTHER' }
]

const sortFields = [
  { title: 'Newest First', value: 'created_at_desc' },
  { title: 'Oldest First', value: 'created_at_asc' },
  { title: 'Name (A-Z)', value: 'last_name_asc' },
  { title: 'Name (Z-A)', value: 'last_name_desc' },
  { title: 'ID (A-Z)', value: 'patient_facility_code_asc' },
  { title: 'ID (Z-A)', value: 'patient_facility_code_desc' },
  { title: 'DOB (Youngest)', value: 'date_of_birth_desc' },
  { title: 'DOB (Oldest)', value: 'date_of_birth_asc' }
]

const paginationStart = computed(() => (page.value - 1) * perPage.value + 1)
const paginationEnd = computed(() => Math.min(page.value * perPage.value, totalPatients.value))
const hasActiveFilters = computed(() => search.value || filters.value.hiv_status || filters.value.sex)

const getSortParams = () => {
  if (!sortSelect.value) return { sort_by: 'created_at', sort_order: 'DESC' }
  
  const parts = sortSelect.value.split('_')
  const order = parts.pop()
  const field = parts.join('_')
  
  return {
    sort_by: field,
    sort_order: order.toUpperCase()
  }
}

function toggleFilter(filterType, value) {
  filters.value[filterType] = filters.value[filterType] === value ? null : value
  page.value = 1
  loadPatients()
}

function toggleMaskSensitiveData() {
  maskSensitiveData.value = !maskSensitiveData.value
}

function maskString(str, visibleChars = 2) {
  if (!str) return '—'
  if (str.length <= visibleChars) return '*'.repeat(str.length)
  return str.substring(0, visibleChars) + '*'.repeat(str.length - visibleChars)
}

function maskContact(contact) {
  if (!contact) return '—'
  if (contact.length <= 4) return '*'.repeat(contact.length)
  return '*'.repeat(contact.length - 4) + contact.substring(contact.length - 4)
}

const debouncedFetchPatients = debounce(() => {
  page.value = 1
  loadPatients()
}, 500)

watch([() => filters.value.hiv_status, () => filters.value.sex], () => debouncedFetchPatients())

function handleSortChange() {
  page.value = 1
  loadPatients()
}

function updateOptions(options) {
  const { page: newPage, itemsPerPage, sortBy: sortItems, sortDesc } = options
  
  if (newPage !== page.value) page.value = newPage
  if (itemsPerPage !== perPage.value) perPage.value = itemsPerPage
  
  if (sortItems && sortItems.length) {
    const sortField = sortItems[0]
    const sortDirection = sortDesc[0] ? 'desc' : 'asc'
    sortSelect.value = `${sortField}_${sortDirection}`
  }
  
  loadPatients()
}

async function loadPatients() {
  loading.value = true
  error.value = ''

  try {
    const { sort_by, sort_order } = getSortParams()
    
    const params = {
      page: page.value,
      limit: perPage.value,
      sort_by: sort_by,
      sort_order: sort_order
    }

    if (search.value?.trim()) params.search = search.value.trim()
    if (filters.value.hiv_status) params.hiv_status = filters.value.hiv_status
    if (filters.value.sex) params.sex = filters.value.sex

    const response = await patientsApi.getAll(params)
    
    if (response && response.success === true) {
      patients.value = response.data || []
      totalPatients.value = response.pagination?.total || 0
    } else {
      patients.value = []
      totalPatients.value = 0
      if (response && response.message) {
        error.value = response.message
      }
    }
  } catch (err) {
    console.error('Error fetching patients:', err)
    error.value = err.error || err.message || 'Failed to load patients'
    patients.value = []
    totalPatients.value = 0
    showToast('Error loading patients', 'error')
  } finally {
    loading.value = false
  }
}

async function fetchStats() {
  try {
    const response = await patientsApi.getStats()
    if (response && response.success === true) {
      stats.value = response.data || stats.value
    }
  } catch (err) {
    console.error('Error fetching stats:', err)
  }
}

function goToPatientDetails(patient) {
  router.push(`/admin/patients/${patient.id}`)
}

function formatSex(sex) {
  if (!sex) return '—'
  return sex.charAt(0).toUpperCase() + sex.slice(1).toLowerCase()
}

function formatHivStatus(status) {
  if (!status) return '—'
  const statusMap = { 'REACTIVE': 'Reactive', 'NON_REACTIVE': 'Non-Reactive', 'INDETERMINATE': 'Indeterminate' }
  return statusMap[status] || status
}

function calculateAge(dateString) {
  if (!dateString) return '—'
  const today = new Date()
  const birthDate = new Date(dateString)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--
  return age
}

function formatDate(dateString, mask = false) {
  if (!dateString) return '—'
  if (mask) return '**/**/****'
  return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatDateTime(dateString) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getHivStatusColor(status) {
  const colors = { 'REACTIVE': 'warning', 'NON_REACTIVE': 'success', 'INDETERMINATE': 'info' }
  return colors[status] || 'grey'
}

function clearFilters() {
  search.value = ''
  filters.value = { hiv_status: null, sex: null }
  sortSelect.value = 'created_at_desc'
  page.value = 1
  loadPatients()
}

function openEnrollmentDialog() {
  selectedPatient.value = null
  dialogMode.value = 'create'
  showPatientDialog.value = true
}

function editPatient(patient) {
  const formattedPatient = { ...patient }
  if (patient.date_of_birth) formattedPatient.date_of_birth = formatDateForInput(patient.date_of_birth)
  if (patient.diagnosis_date) formattedPatient.diagnosis_date = formatDateForInput(patient.diagnosis_date)
  if (patient.art_start_date) formattedPatient.art_start_date = formatDateForInput(patient.art_start_date)
  selectedPatient.value = formattedPatient
  dialogMode.value = 'edit'
  showPatientDialog.value = true
}

function formatDateForInput(dateString) {
  if (!dateString) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

async function deletePatient(patient) {
  if (confirm(`Delete patient ${patient.patient_facility_code}?`)) {
    try {
      loading.value = true
      await patientsApi.delete(patient.id)
      await loadPatients()
      await fetchStats()
      showToast('Patient deleted successfully', 'success')
    } catch (err) {
      showToast(err.error || err.message || 'Failed to delete patient', 'error')
    } finally {
      loading.value = false
    }
  }
}

// CSV Export Function
function exportPatientData() {
  try {
    // Define CSV headers and data
    const headers = [
      'facility_code', 'first_name', 'last_name', 'middle_name', 'date_of_birth', 
      'age', 'sex', 'contact_number', 'address', 'hiv_status', 
      'diagnosis_date', 'art_start_date', 'latest_cd4_count', 'latest_viral_load', 'enrollment_date'
    ]
    
    const csvData = patients.value.map(patient => ({
      facility_code: patient.patient_facility_code,
      first_name: patient.first_name,
      last_name: patient.last_name,
      middle_name: patient.middle_name || '',
      date_of_birth: patient.date_of_birth ? patient.date_of_birth.split('T')[0] : '',
      age: calculateAge(patient.date_of_birth),
      sex: patient.sex,
      contact_number: patient.contact_number || '',
      address: patient.address || '',
      hiv_status: patient.hiv_status,
      diagnosis_date: patient.diagnosis_date ? patient.diagnosis_date.split('T')[0] : '',
      art_start_date: patient.art_start_date ? patient.art_start_date.split('T')[0] : '',
      latest_cd4_count: patient.latest_cd4_count || '',
      latest_viral_load: patient.latest_viral_load || '',
      enrollment_date: patient.created_at ? patient.created_at.split('T')[0] : ''
    }))
    
    // Convert to CSV using PapaParse
    const csv = Papa.unparse({
      fields: headers,
      data: csvData.map(row => headers.map(h => row[h]))
    })
    
    // Download file
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.href = url
    link.setAttribute('download', `patients_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    showToast(`Exported ${patients.value.length} patients successfully`, 'success')
  } catch (err) {
    console.error('Export error:', err)
    showToast('Failed to export patient data', 'error')
  }
}

// CSV Import Functions
function openImportDialog() {
  showImportDialog.value = true
  importFile.value = null
  importValidation.value = null
  importPreview.value = []
  previewColumns.value = []
}

function downloadTemplate() {
  const headers = [
    'first_name', 'last_name', 'middle_name', 'date_of_birth', 'sex', 
    'address', 'contact_number', 'hiv_status', 'diagnosis_date', 
    'art_start_date', 'latest_cd4_count', 'latest_viral_load'
  ]
  
  const sampleRow = {
    first_name: 'John',
    last_name: 'Doe',
    middle_name: 'Smith',
    date_of_birth: '1990-01-15',
    sex: 'MALE',
    address: '123 Main St',
    contact_number: '+1234567890',
    hiv_status: 'REACTIVE',
    diagnosis_date: '2023-01-01',
    art_start_date: '2023-02-01',
    latest_cd4_count: '500',
    latest_viral_load: '40'
  }
  
  const csv = Papa.unparse({
    fields: headers,
    data: [headers.map(h => sampleRow[h])]
  })
  
  const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.href = url
  link.setAttribute('download', 'patient_import_template.csv')
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function validateImportFile() {
  if (!importFile.value) {
    importValidation.value = null
    importPreview.value = []
    return
  }
  
  const file = importFile.value
  const errors = []
  
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      const data = results.data
      const requiredFields = ['first_name', 'last_name', 'date_of_birth', 'sex', 'hiv_status']
      
      // Check if we have data
      if (data.length === 0) {
        errors.push('CSV file is empty')
        importValidation.value = { valid: false, errors, count: 0 }
        return
      }
      
      // Check for required columns
      const headers = results.meta.fields || []
      const missingColumns = requiredFields.filter(col => !headers.includes(col))
      if (missingColumns.length > 0) {
        errors.push(`Missing required columns: ${missingColumns.join(', ')}`)
      }
      
      // Validate each row
      data.forEach((row, index) => {
        if (!row.first_name) errors.push(`Row ${index + 2}: Missing first_name`)
        if (!row.last_name) errors.push(`Row ${index + 2}: Missing last_name`)
        if (!row.date_of_birth) errors.push(`Row ${index + 2}: Missing date_of_birth`)
        
        // Validate date format
        if (row.date_of_birth && !/^\d{4}-\d{2}-\d{2}$/.test(row.date_of_birth)) {
          errors.push(`Row ${index + 2}: Invalid date format for date_of_birth. Use YYYY-MM-DD`)
        }
        
        // Validate sex
        if (row.sex && !['MALE', 'FEMALE', 'OTHER'].includes(row.sex.toUpperCase())) {
          errors.push(`Row ${index + 2}: Invalid sex value '${row.sex}'. Must be MALE, FEMALE, or OTHER`)
        }
        
        // Validate HIV status
        if (row.hiv_status && !['REACTIVE', 'NON_REACTIVE', 'INDETERMINATE'].includes(row.hiv_status.toUpperCase())) {
          errors.push(`Row ${index + 2}: Invalid hiv_status '${row.hiv_status}'. Must be REACTIVE, NON_REACTIVE, or INDETERMINATE`)
        }
        
        // Validate dates if present
        if (row.diagnosis_date && !/^\d{4}-\d{2}-\d{2}$/.test(row.diagnosis_date)) {
          errors.push(`Row ${index + 2}: Invalid date format for diagnosis_date. Use YYYY-MM-DD`)
        }
        
        if (row.art_start_date && !/^\d{4}-\d{2}-\d{2}$/.test(row.art_start_date)) {
          errors.push(`Row ${index + 2}: Invalid date format for art_start_date. Use YYYY-MM-DD`)
        }
      })
      
      // Set preview data (first 5 rows)
      const previewData = data.slice(0, 5)
      previewColumns.value = headers
      importPreview.value = previewData
      
      if (errors.length > 0) {
        importValidation.value = { valid: false, errors, count: data.length }
      } else {
        importValidation.value = { valid: true, count: data.length, errors: [] }
      }
    },
    error: (error) => {
      errors.push(`Failed to parse CSV: ${error.message}`)
      importValidation.value = { valid: false, errors, count: 0 }
    }
  })
}

async function importPatients() {
  if (!importValidation.value?.valid || !importFile.value) return
  
  importLoading.value = true
  
  Papa.parse(importFile.value, {
    header: true,
    skipEmptyLines: true,
    complete: async (results) => {
      try {
        const patientsData = results.data
        let successCount = 0
        const importErrors = []
        
        for (let i = 0; i < patientsData.length; i++) {
          const patient = patientsData[i]
          try {
            // Format the patient data
            const formattedPatient = {
              first_name: patient.first_name?.trim(),
              last_name: patient.last_name?.trim(),
              middle_name: patient.middle_name?.trim() || null,
              date_of_birth: patient.date_of_birth,
              sex: patient.sex?.toUpperCase(),
              address: patient.address?.trim() || null,
              contact_number: patient.contact_number?.trim() || null,
              hiv_status: patient.hiv_status?.toUpperCase(),
              diagnosis_date: patient.diagnosis_date || null,
              art_start_date: patient.art_start_date || null,
              latest_cd4_count: patient.latest_cd4_count ? parseInt(patient.latest_cd4_count) : null,
              latest_viral_load: patient.latest_viral_load ? parseInt(patient.latest_viral_load) : null
            }
            
            await patientsApi.create(formattedPatient)
            successCount++
          } catch (err) {
            importErrors.push(`Row ${i + 2}: ${err.error || err.message || 'Import failed'}`)
            console.error(`Failed to import ${patient.first_name} ${patient.last_name}:`, err)
          }
        }
        
        showImportDialog.value = false
        await loadPatients()
        await fetchStats()
        
        if (successCount === patientsData.length) {
          showToast(`Successfully imported all ${successCount} patients`, 'success')
        } else {
          showToast(`Imported ${successCount} of ${patientsData.length} patients. ${importErrors.length} failed.`, 'warning')
          console.error('Import errors:', importErrors)
        }
      } catch (err) {
        showToast('Failed to import patients: ' + err.message, 'error')
      } finally {
        importLoading.value = false
        importFile.value = null
        importValidation.value = null
        importPreview.value = []
      }
    },
    error: (error) => {
      showToast('Failed to parse CSV: ' + error.message, 'error')
      importLoading.value = false
    }
  })
}

async function handlePatientSaved() {
  showPatientDialog.value = false
  await loadPatients()
  await fetchStats()
  showToast('Patient saved successfully', 'success')
}

onMounted(async () => {
  await loadPatients()
  await fetchStats()
})
</script>

<style scoped>
.gap-2 { gap: 8px; }
.gap-1 { gap: 4px; }
.ga-1 { gap: 4px; }
.ga-2 { gap: 8px; }

.stat-card {
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.compact-field { 
  width: 100%; 
}

.cursor-pointer { 
  cursor: pointer; 
}

.text-decoration-none { 
  text-decoration: none; 
}

.text-decoration-none:hover { 
  text-decoration: underline; 
}

.sample-csv {
  background: #f5f5f5;
  padding: 12px;
  border-radius: 4px;
  font-size: 12px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.preview-table {
  font-size: 12px;
}

.preview-table th,
.preview-table td {
  padding: 8px 4px !important;
}

.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}

.toast {
  position: relative;
  min-width: 300px;
  max-width: 400px;
  padding: 12px 16px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  pointer-events: auto;
  overflow: hidden;
  animation: toast-slide-in 0.3s ease;
  border-left: 4px solid;
}

.toast-success { 
  border-left-color: #4CAF50; 
  background-color: #e8f5e9; 
}

.toast-error { 
  border-left-color: #B00020; 
  background-color: #ffebee; 
}

.toast-warning { 
  border-left-color: #FB8C00; 
  background-color: #fff3e0; 
}

.toast-info { 
  border-left-color: #2196F3; 
  background-color: #e3f2fd; 
}

.toast-content {
  display: flex;
  align-items: center;
  color: rgba(0, 0, 0, 0.87);
}

.toast-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background-color: rgba(0, 0, 0, 0.2);
  animation: toast-progress linear forwards;
}

@keyframes toast-slide-in {
  from { 
    transform: translateX(100%); 
    opacity: 0; 
  }
  to { 
    transform: translateX(0); 
    opacity: 1; 
  }
}

@keyframes toast-progress {
  from { 
    width: 100%; 
  }
  to { 
    width: 0%; 
  }
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>