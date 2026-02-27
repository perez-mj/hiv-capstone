<!-- frontend/src/pages/admin/Patients.vue -->
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
        <!-- Mask Sensitive Data Toggle -->
        <v-btn 
          variant="outlined" 
          size="small" 
          :prepend-icon="maskSensitiveData ? 'mdi-eye-off' : 'mdi-eye'"
          @click="toggleMaskSensitiveData"
          :color="maskSensitiveData ? 'warning' : 'primary'"
          :style="{ borderColor: 'var(--color-border)' }"
        >
          {{ maskSensitiveData ? 'Unmask Data' : 'Mask Data' }}
        </v-btn>
        
        <!-- Import Button -->
        <v-btn 
          variant="outlined" 
          size="small" 
          prepend-icon="mdi-upload" 
          @click="openImportDialog"
          :style="{ borderColor: 'var(--color-border)' }"
        >
          Import
        </v-btn>
        
        <v-btn 
          color="primary" 
          size="small" 
          prepend-icon="mdi-account-plus" 
          @click="openEnrollmentDialog"
          :loading="loading"
          :style="{ backgroundColor: 'var(--color-primary)', color: 'var(--color-text-on-primary)' }"
        >
          New Enrollment
        </v-btn>
        <v-btn 
          variant="outlined" 
          size="small" 
          prepend-icon="mdi-download" 
          @click="exportPatientData"
          :disabled="filteredPatients.length === 0" 
          :style="{ borderColor: 'var(--color-border)' }"
        >
          Export
        </v-btn>
      </div>
    </div>

    <!-- Tabs for HIV Status -->
    <v-tabs
      v-model="activeTab"
      color="primary"
      align-tabs="start"
      class="mb-4"
      show-arrows
    >
      <v-tab value="all">
        <v-icon start>mdi-account-multiple</v-icon>
        All
      </v-tab>
      <v-tab value="reactive">
        <v-icon start color="warning">mdi-alert-circle</v-icon>
        Treatment
        <v-chip size="x-small" class="ml-2" color="warning">{{ reactiveCount }}</v-chip>
      </v-tab>
      <v-tab value="non-reactive">
        <v-icon start color="success">mdi-check-circle</v-icon>
        Testing
        <v-chip size="x-small" class="ml-2" color="success">{{ nonReactiveCount }}</v-chip>
      </v-tab>
    </v-tabs>

    <!-- Compact Stats Cards -->
    <v-row class="mb-4">
      <v-col v-for="stat in compactStats" :key="stat.label" cols="6" sm="3" md="3" lg="3">
        <v-card 
          elevation="0" 
          border 
          class="stat-card"
          :style="{ borderColor: 'var(--color-border)', borderRadius: 'var(--radius-md)' }"
        >
          <v-card-text class="pa-3 d-flex align-center">
            <v-avatar size="40" :color="stat.color" class="mr-3"
              :style="{ backgroundColor: `var(--color-${stat.color})` }"
            >
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
    <v-alert 
      v-if="error" 
      type="error" 
      variant="tonal" 
      class="mb-4" 
      closable 
      @click:close="error = ''"
      :style="{ backgroundColor: 'var(--color-error-light)', color: 'var(--color-error-dark)' }"
    >
      <template v-slot:title>Error Loading Patients</template>
      {{ error }}
    </v-alert>

    <!-- Search and Filters - Compact Horizontal Layout -->
    <v-card 
      elevation="0" 
      border 
      class="mb-4"
      :style="{ borderColor: 'var(--color-border)', borderRadius: 'var(--radius-md)' }"
    >
      <v-card-text class="pa-3">
        <div class="d-flex flex-wrap align-center ga-3">
          <!-- Search - Compact -->
          <div style="min-width: 200px; flex: 1;">
            <v-text-field 
              v-model="search" 
              density="compact" 
              variant="outlined"
              placeholder="Search patients..." 
              prepend-inner-icon="mdi-magnify" 
              hide-details 
              clearable
              @update:model-value="handleSearch"
              class="compact-field"
            />
          </div>

          <!-- Sex Filter - Compact -->
          <div class="d-flex align-center ga-1" style="flex-wrap: nowrap;">
            <span class="text-caption text-medium-emphasis mr-1" style="white-space: nowrap;">Sex:</span>
            <v-btn-toggle
              v-model="filters.sex"
              mandatory="false"
              density="compact"
              color="primary"
              variant="outlined"
              @update:model-value="handleFilterChange"
            >
              <v-btn value="MALE" size="small">M</v-btn>
              <v-btn value="FEMALE" size="small">F</v-btn>
              <v-btn value="OTHER" size="small">O</v-btn>
            </v-btn-toggle>
          </div>

          <!-- Sort - Compact -->
          <div style="min-width: 120px;">
            <v-select 
              v-model="sortBy" 
              density="compact" 
              variant="outlined" 
              :items="sortFields" 
              placeholder="Sort"
              hide-details 
              @update:model-value="handleSortChange" 
              class="compact-field"
            />
          </div>

          <!-- Sort Order Toggle - Compact -->
          <v-btn 
            variant="outlined" 
            density="compact"
            size="small"
            :icon="sortOrder === 'asc' ? 'mdi-sort-ascending' : 'mdi-sort-descending'" 
            @click="toggleSortOrder"
            :style="{ borderColor: 'var(--color-border)', minWidth: '36px' }" 
          />

          <!-- Clear Filters - Compact -->
          <v-btn 
            variant="text" 
            color="primary" 
            size="small" 
            prepend-icon="mdi-filter-remove" 
            @click="clearFilters"
            :disabled="!hasActiveFilters" 
            :style="{ color: 'var(--color-primary)' }" 
          >
            Clear
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- Main Table -->
    <v-card 
      elevation="0" 
      border 
      :style="{ borderColor: 'var(--color-border)', borderRadius: 'var(--radius-md)' }"
    >
      <v-card-title class="d-flex justify-space-between align-center py-3 px-4">
        <span class="text-subtitle-1 font-weight-medium">{{ activeTabTitle }}</span>
        <span class="text-caption text-medium-emphasis">
          Showing {{ paginationStart }} to {{ paginationEnd }} of {{ totalFilteredPatients }}
        </span>
      </v-card-title>

      <v-divider :style="{ borderColor: 'var(--color-divider)' }" />

      <v-card-text class="pa-0">
        <v-data-table-server 
          v-model:items-per-page="perPage" 
          v-model:page="page" 
          :headers="tableHeaders" 
          :items="filteredPatients"
          :items-length="totalFilteredPatients" 
          :loading="loading" 
          @update:options="handleTableSort"
          class="elevation-0 patients-table" 
          density="compact" 
          hover
        >
          <!-- Loading State -->
          <template v-slot:loading>
            <v-skeleton-loader type="table-row@10" />
          </template>

          <!-- Patient Facility Code Column -->
          <template v-slot:item.patient_facility_code="{ item }">
            <span 
              class="patient-id-link font-weight-medium cursor-pointer" 
              :style="{ color: 'var(--color-info)' }"
              @click="goToPatientDetails(item)"
            >
            {{ item.patient_facility_code }}
            </span>
          </template>

          <!-- Name Column -->
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

          <!-- Age Column -->
          <template v-slot:item.age="{ item }">
            <span class="text-caption">{{ calculateAge(item.date_of_birth) }}y</span>
          </template>

          <!-- Sex Column -->
          <template v-slot:item.sex="{ item }">
            <span class="text-caption">{{ formatSex(item.sex) }}</span>
          </template>

          <!-- Contact Column -->
          <template v-slot:item.contact_number="{ item }">
            <span class="text-caption">
              {{ maskSensitiveData ? maskContact(item.contact_number) : (item.contact_number || '—') }}
            </span>
          </template>

          <!-- HIV Status Column -->
          <template v-slot:item.hiv_status="{ item }">
            <v-chip 
              size="x-small" 
              :color="getHivStatusColor(item.hiv_status)" 
              variant="flat"
              :prepend-icon="getHivStatusIcon(item.hiv_status)"
            >
              {{ formatHivStatus(item.hiv_status) }}
            </v-chip>
          </template>

          <!-- On Treatment Column (replaces ART Status) -->
          <template v-slot:item.on_treatment="{ item }">
            <div v-if="item.hiv_status === 'REACTIVE'">
              <v-chip 
                v-if="item.art_start_date"
                size="x-small" 
                color="success" 
                variant="flat"
                prepend-icon="mdi-check"
              >
                YES
              </v-chip>
              <v-chip 
                v-else
                size="x-small" 
                color="error" 
                variant="flat"
                prepend-icon="mdi-close"
              >
                NO
              </v-chip>
            </div>
            <span v-else class="text-caption text-disabled">—</span>
          </template>

          <!-- Diagnosis Date Column (for reactive patients) -->
          <template v-slot:item.diagnosis_date="{ item }">
            <span v-if="item.diagnosis_date" class="text-caption">
              {{ formatDate(item.diagnosis_date) }}
            </span>
            <span v-else class="text-caption text-disabled">—</span>
          </template>

          <!-- Enrollment Date Column -->
          <template v-slot:item.created_at="{ item }">
            <div class="text-caption">{{ formatDateTime(item.created_at) }}</div>
          </template>

          <!-- Actions Column -->
          <template v-slot:item.actions="{ item }">
            <div class="d-flex gap-1">
              <v-btn 
                size="x-small" 
                variant="text" 
                color="warning" 
                icon="mdi-pencil" 
                @click="editPatient(item)"
                :style="{ color: 'var(--color-warning)' }" 
                title="Edit patient"
              />
              <v-btn 
                size="x-small" 
                variant="text" 
                color="error" 
                icon="mdi-delete" 
                @click="deletePatient(item)"
                :style="{ color: 'var(--color-error)' }" 
                title="Delete patient"
              />
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
              <v-btn 
                color="primary" 
                size="small" 
                @click="openEnrollmentDialog" 
                class="mt-3"
                :style="{ backgroundColor: 'var(--color-primary)' }"
              >
                <v-icon start>mdi-account-plus</v-icon>
                Enroll First
              </v-btn>
            </div>
          </template>
        </v-data-table-server>
      </v-card-text>
    </v-card>

    <!-- Patient Dialog -->
    <PatientDialog 
      v-model="showPatientDialog" 
      :patient="selectedPatient" 
      :mode="dialogMode"
      @saved="handlePatientSaved" 
    />

    <!-- Import Dialog -->
    <v-dialog v-model="showImportDialog" max-width="600">
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
          <span class="text-h5">Import Patients</span>
          <v-btn icon @click="showImportDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        
        <v-card-text>
          <v-alert
            type="info"
            variant="tonal"
            class="mb-4"
          >
            <strong>Import Instructions:</strong>
            <ul class="mt-2">
              <li>Upload a CSV file with patient data</li>
              <li>Required columns: first_name, last_name, date_of_birth, sex, hiv_status</li>
              <li>Optional columns: middle_name, address, contact_number, diagnosis_date, art_start_date, latest_cd4_count, latest_viral_load</li>
              <li>Download a sample template using the button below</li>
              <li>For reactive patients, diagnosis date will be auto-set if not provided</li>
            </ul>
          </v-alert>

          <div class="d-flex justify-end mb-4">
            <v-btn
              variant="text"
              color="primary"
              prepend-icon="mdi-download"
              @click="downloadTemplate"
            >
              Download Template
            </v-btn>
          </div>

          <v-file-input
            v-model="importFile"
            label="Choose CSV file"
            accept=".csv"
            variant="outlined"
            density="comfortable"
            :rules="[v => !!v || 'Please select a file']"
            prepend-icon="mdi-file"
            show-size
            @update:model-value="validateImportFile"
          />

          <div v-if="importValidation" class="mt-3">
            <v-alert
              :type="importValidation.valid ? 'success' : 'error'"
              variant="tonal"
            >
              <div v-if="importValidation.valid">
                ✅ File is valid. Found {{ importValidation.count }} patient records ready to import.
              </div>
              <div v-else>
                ❌ {{ importValidation.error }}
              </div>
            </v-alert>
          </div>

          <!-- Import Preview -->
          <div v-if="importPreview.length > 0" class="mt-4">
            <div class="text-subtitle-2 mb-2">Preview (first 3 records):</div>
            <v-table density="compact">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>DOB</th>
                  <th>Sex</th>
                  <th>HIV Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in importPreview" :key="index">
                  <td>{{ item.last_name }}, {{ item.first_name }}</td>
                  <td>{{ formatDate(item.date_of_birth) }}</td>
                  <td>{{ formatSex(item.sex) }}</td>
                  <td>{{ formatHivStatus(item.hiv_status) }}</td>
                </tr>
              </tbody>
            </v-table>
          </div>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn
            color="secondary"
            variant="text"
            @click="showImportDialog = false"
          >
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            :loading="importLoading"
            :disabled="!importValidation?.valid"
            @click="importPatients"
          >
            Import {{ importValidation?.count || 0 }} Patients
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Toast Notifications -->
    <div class="toast-container">
      <transition-group name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast"
          :class="`toast-${toast.type}`"
          @click="removeToast(toast.id)"
        >
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
import Papa from 'papaparse' // Add this dependency

const router = useRouter()

// Reactive state
const activeTab = ref('all')
const search = ref('')
const filters = ref({
  sex: null
})
const sortBy = ref('created_at_desc')
const sortOrder = ref('desc')
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
  recent_registrations: 0,
  age_distribution: [],
  monthly_registrations: []
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

// Patient dialog
const showPatientDialog = ref(false)
const selectedPatient = ref(null)
const dialogMode = ref('create')

// Debounced search function to prevent multiple requests
const debouncedSearch = debounce(() => {
  page.value = 1
  loadPatients()
}, 500)

// Computed table headers based on active tab
const tableHeaders = computed(() => {
  const baseHeaders = [
    { title: 'Facility ID', key: 'patient_facility_code', sortable: true, width: '120' },
    { title: 'Name', key: 'full_name', sortable: false },
    { title: 'Age', key: 'age', sortable: true, width: '60' },
    { title: 'Sex', key: 'sex', sortable: true, width: '70' },
    { title: 'Contact', key: 'contact_number', sortable: false, width: '120' },
    { title: 'HIV Status', key: 'hiv_status', sortable: true, width: '100' }
  ]

  // Add diagnosis date for reactive tab
  if (activeTab.value === 'reactive') {
    baseHeaders.push(
      { title: 'Diagnosis Date', key: 'diagnosis_date', sortable: true, width: '100' },
      { title: 'On Treatment', key: 'on_treatment', sortable: false, width: '90' }
    )
  } else if (activeTab.value === 'all') {
    baseHeaders.push(
      { title: 'On Treatment', key: 'on_treatment', sortable: false, width: '90' }
    )
  }

  // Add enrollment date and actions for all tabs
  baseHeaders.push(
    { title: 'Enrolled', key: 'created_at', sortable: true, width: '90' },
    { title: 'Actions', key: 'actions', sortable: false, align: 'end', width: '80' }
  )

  return baseHeaders
})

// Filtered patients based on active tab
const filteredPatients = computed(() => {
  if (activeTab.value === 'all') {
    return patients.value
  } else if (activeTab.value === 'reactive') {
    return patients.value.filter(p => p.hiv_status === 'REACTIVE')
  } else {
    return patients.value.filter(p => p.hiv_status === 'NON_REACTIVE' || p.hiv_status === 'INDETERMINATE')
  }
})

const totalFilteredPatients = computed(() => filteredPatients.value.length)

const activeTabTitle = computed(() => {
  switch (activeTab.value) {
    case 'all': return 'All Patients'
    case 'reactive': return 'Reactive Patients'
    case 'non-reactive': return 'Non-Reactive/Indeterminate Patients'
    default: return 'Patients'
  }
})

const reactiveCount = computed(() => {
  return patients.value.filter(p => p.hiv_status === 'REACTIVE').length
})

const nonReactiveCount = computed(() => {
  return patients.value.filter(p => p.hiv_status === 'NON_REACTIVE' || p.hiv_status === 'INDETERMINATE').length
})

// Toast functions
function showToast(message, type = 'success', duration = 3000) {
  const id = toastId++
  const icon = {
    success: 'mdi-check-circle',
    error: 'mdi-alert-circle',
    warning: 'mdi-alert',
    info: 'mdi-information'
  }[type] || 'mdi-information'
  
  toasts.value.push({
    id,
    message,
    type,
    icon,
    duration
  })
  
  setTimeout(() => {
    removeToast(id)
  }, duration)
}

function removeToast(id) {
  const index = toasts.value.findIndex(t => t.id === id)
  if (index !== -1) {
    toasts.value.splice(index, 1)
  }
}

// Compact stats cards
const compactStats = computed(() => {
  const reactiveStat = Array.isArray(stats.value.by_hiv_status) 
    ? stats.value.by_hiv_status.find(s => s.hiv_status === 'REACTIVE') 
    : { count: 0 }
  
  const nonReactiveStat = Array.isArray(stats.value.by_hiv_status)
    ? stats.value.by_hiv_status.filter(s => s.hiv_status === 'NON_REACTIVE' || s.hiv_status === 'INDETERMINATE')
        .reduce((sum, s) => sum + s.count, 0)
    : 0
  
  const onArtStat = stats.value.on_art || 0
  
  return [
    {
      label: 'Total Patients',
      value: stats.value.total_patients || 0,
      icon: 'mdi-account-multiple',
      color: 'primary'
    },
    {
      label: 'On Treatment',
      value: onArtStat,
      icon: 'mdi-pill',
      color: 'success'
    },
    {
      label: 'Reactive',
      value: reactiveStat?.count || 0,
      icon: 'mdi-alert-circle',
      color: 'warning'
    },
    {
      label: 'Non-Reactive',
      value: nonReactiveStat,
      icon: 'mdi-check-circle',
      color: 'info'
    }
  ]
})

// Filter options
const sexOptions = [
  { title: 'Male', value: 'MALE' },
  { title: 'Female', value: 'FEMALE' },
  { title: 'Other', value: 'OTHER' }
]

// Sort fields
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

// Computed properties
const paginationStart = computed(() => (page.value - 1) * perPage.value + 1)
const paginationEnd = computed(() => Math.min(page.value * perPage.value, totalFilteredPatients.value))

const hasActiveFilters = computed(() => {
  return search.value || filters.value.sex
})

// Watch for tab changes
watch(activeTab, () => {
  page.value = 1
  loadPatients()
})

// Watch for filter changes - use debounced search
watch(() => filters.value.sex, () => {
  page.value = 1
  debouncedSearch()
})

// Handle search input
function handleSearch() {
  debouncedSearch()
}

// Handle filter change
function handleFilterChange() {
  page.value = 1
  loadPatients()
}

// Handle sort change
function handleSortChange() {
  const parts = sortBy.value.split('_')
  if (parts.length > 1 && ['asc', 'desc'].includes(parts[parts.length - 1])) {
    sortOrder.value = parts[parts.length - 1]
  }
  page.value = 1
  loadPatients()
}

// Toggle mask sensitive data
function toggleMaskSensitiveData() {
  maskSensitiveData.value = !maskSensitiveData.value
}

// Masking functions
function maskString(str, visibleChars = 2) {
  if (!str) return '—'
  if (str.length <= visibleChars) return '*'.repeat(str.length)
  const masked = '*'.repeat(str.length - visibleChars)
  return str.substring(0, visibleChars) + masked
}

function maskContact(contact) {
  if (!contact) return '—'
  if (contact.length <= 4) return '*'.repeat(contact.length)
  const masked = '*'.repeat(contact.length - 4)
  return masked + contact.substring(contact.length - 4)
}

// Lifecycle
onMounted(async () => {
  await loadPatients()
  await fetchStats()
})

// Methods
async function loadPatients() {
  // Prevent multiple simultaneous requests
  if (loading.value) return
  
  loading.value = true
  error.value = ''

  try {
    let sortField = 'created_at'
    let sortDir = 'desc'

    if (sortBy.value && typeof sortBy.value === 'string') {
      const parts = sortBy.value.split('_')
      if (parts.length > 1 && ['asc', 'desc'].includes(parts[parts.length - 1])) {
        sortField = parts.slice(0, -1).join('_')
        sortDir = parts[parts.length - 1]
      }
    }

    const params = {
      page: page.value,
      limit: perPage.value,
      sort_by: sortField,
      sort_order: sortDir.toUpperCase()
    }

    if (search.value?.trim()) {
      params.search = search.value.trim()
    }
    if (filters.value.sex) {
      params.sex = filters.value.sex
    }

    const response = await patientsApi.getAll(params)
    
    if (response.data) {
      if (response.data.success === true) {
        patients.value = response.data.data || []
        totalPatients.value = response.data.pagination?.total || 0
      } else if (response.data.data) {
        patients.value = response.data.data
        totalPatients.value = response.data.pagination?.total || response.data.data.length
      } else if (Array.isArray(response.data)) {
        patients.value = response.data
        totalPatients.value = patients.value.length
      } else {
        patients.value = []
        totalPatients.value = 0
      }
    } else {
      patients.value = []
      totalPatients.value = 0
    }

  } catch (err) {
    console.error('Error fetching patients:', err)
    error.value = err.response?.data?.error || 'Failed to load patients'
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
    
    if (response.data) {
      if (response.data.success === true) {
        stats.value = response.data.stats || stats.value
      } else if (response.data.stats) {
        stats.value = response.data.stats
      } else {
        stats.value = response.data
      }
    }
  } catch (err) {
    console.error('Error fetching stats:', err)
  }
}

function handleTableSort(options) {
  const { sortBy: sortItems, sortDesc } = options
  if (sortItems?.length) {
    const key = sortItems[0]
    const order = sortDesc[0] ? 'desc' : 'asc'
    sortBy.value = `${key}_${order}`
    sortOrder.value = order
    loadPatients()
  }
}

function toggleSortOrder() {
  const newOrder = sortOrder.value === 'asc' ? 'desc' : 'asc'
  sortOrder.value = newOrder
  const baseField = sortBy.value.split('_').slice(0, -1).join('_') || 'created_at'
  sortBy.value = `${baseField}_${newOrder}`
  loadPatients()
}

function goToPatientDetails(patient) {
  router.push(`/admin/patients/${patient.id}`)
}

// Utility functions
function formatSex(sex) {
  if (!sex) return '—'
  return sex.charAt(0).toUpperCase() + sex.slice(1).toLowerCase()
}

function formatHivStatus(status) {
  if (!status) return '—'
  const statusMap = {
    'REACTIVE': 'Reactive',
    'NON_REACTIVE': 'Non-Reactive',
    'INDETERMINATE': 'Indeterminate'
  }
  return statusMap[status] || status
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

function formatDate(dateString, mask = false) {
  if (!dateString) return '—'
  if (mask) {
    return '**/**/****'
  }
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function formatDateTime(dateString) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })
}

function getHivStatusColor(status) {
  const colors = {
    'REACTIVE': 'warning',
    'NON_REACTIVE': 'success',
    'INDETERMINATE': 'info'
  }
  return colors[status] || 'grey'
}

function getHivStatusIcon(status) {
  const icons = {
    'REACTIVE': 'mdi-alert',
    'NON_REACTIVE': 'mdi-check',
    'INDETERMINATE': 'mdi-help'
  }
  return icons[status] || 'mdi-help'
}

// Event handlers
function clearFilters() {
  search.value = ''
  filters.value.sex = null
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
  const formattedPatient = { ...patient }
  
  if (patient.date_of_birth) {
    formattedPatient.date_of_birth = formatDateForInput(patient.date_of_birth)
  }
  if (patient.diagnosis_date) {
    formattedPatient.diagnosis_date = formatDateForInput(patient.diagnosis_date)
  }
  if (patient.art_start_date) {
    formattedPatient.art_start_date = formatDateForInput(patient.art_start_date)
  }
  
  selectedPatient.value = formattedPatient
  dialogMode.value = 'edit'
  showPatientDialog.value = true
}

function formatDateForInput(dateString) {
  if (!dateString) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString
  }
  
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
      console.error('Delete error:', err)
      showToast(err.response?.data?.error || 'Failed to delete patient', 'error')
    } finally {
      loading.value = false
    }
  }
}

async function exportPatientData() {
  try {
    loading.value = true
    
    // Build export params based on current filters
    const params = {}
    if (search.value?.trim()) {
      params.search = search.value.trim()
    }
    if (filters.value.sex) {
      params.sex = filters.value.sex
    }
    if (activeTab.value !== 'all') {
      params.hiv_status = activeTab.value === 'reactive' ? 'REACTIVE' : 'NON_REACTIVE,INDETERMINATE'
    }

    // Use the export endpoint
    const response = await patientsApi.exportCSV(params)
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `patients-export-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
    
    showToast('Patient data exported successfully', 'success')
  } catch (err) {
    console.error('Export error:', err)
    showToast('Failed to export patient data', 'error')
  } finally {
    loading.value = false
  }
}

async function handlePatientSaved() {
  showPatientDialog.value = false
  await loadPatients()
  await fetchStats()
  showToast('Patient saved successfully', 'success')
}

// Import Functions
function openImportDialog() {
  showImportDialog.value = true
  importFile.value = null
  importValidation.value = null
  importPreview.value = []
}

function downloadTemplate() {
  const template = [
    {
      first_name: "John",
      last_name: "Doe",
      middle_name: "Smith",
      date_of_birth: "1990-01-15",
      sex: "MALE",
      address: "123 Main St",
      contact_number: "+1234567890",
      hiv_status: "REACTIVE",
      diagnosis_date: "2023-01-01",
      art_start_date: "2023-02-01",
      latest_cd4_count: 500,
      latest_viral_load: 40
    }
  ]
  
  // Convert to CSV
  const csv = Papa.unparse(template)
  const dataBlob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(dataBlob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'patient-import-template.csv'
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

  Papa.parse(importFile.value, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      try {
        const data = results.data
        
        if (data.length === 0) {
          throw new Error('File contains no data')
        }
        
        const requiredFields = ['first_name', 'last_name', 'date_of_birth', 'sex', 'hiv_status']
        const errors = []
        
        data.forEach((patient, index) => {
          requiredFields.forEach(field => {
            if (!patient[field]) {
              errors.push(`Row ${index + 1}: Missing required field '${field}'`)
            }
          })
          
          if (patient.sex && !['MALE', 'FEMALE', 'OTHER'].includes(patient.sex)) {
            errors.push(`Row ${index + 1}: Invalid sex '${patient.sex}'. Must be MALE, FEMALE, or OTHER`)
          }
          
          if (patient.hiv_status && !['REACTIVE', 'NON_REACTIVE', 'INDETERMINATE'].includes(patient.hiv_status)) {
            errors.push(`Row ${index + 1}: Invalid HIV status '${patient.hiv_status}'. Must be REACTIVE, NON_REACTIVE, or INDETERMINATE`)
          }
        })
        
        if (errors.length > 0) {
          importValidation.value = {
            valid: false,
            error: errors.join('. ')
          }
          importPreview.value = []
        } else {
          importValidation.value = {
            valid: true,
            count: data.length
          }
          importPreview.value = data.slice(0, 3)
        }
      } catch (err) {
        importValidation.value = {
          valid: false,
          error: 'Invalid CSV file: ' + err.message
        }
        importPreview.value = []
      }
    },
    error: (err) => {
      importValidation.value = {
        valid: false,
        error: 'Error parsing CSV: ' + err.message
      }
      importPreview.value = []
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
        const patients = results.data
        
        const response = await patientsApi.import({ patients })
        
        showImportDialog.value = false
        await loadPatients()
        await fetchStats()
        
        if (response.data.success) {
          showToast(response.data.message || 'Patients imported successfully', 'success')
        } else {
          showToast('Import completed with errors', 'warning')
          console.error('Import errors:', response.data.results?.errors)
        }
      } catch (err) {
        showToast('Failed to import patients: ' + err.message, 'error')
      } finally {
        importLoading.value = false
      }
    },
    error: (err) => {
      showToast('Error parsing CSV: ' + err.message, 'error')
      importLoading.value = false
    }
  })
}
</script>

<style scoped>
@import '@/styles/variables.css';

.gap-2 {
  gap: var(--spacing-sm);
}

.gap-1 {
  gap: var(--spacing-xs);
}

.ga-3 {
  gap: 16px;
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
  white-space: nowrap;
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

/* Toast Container and Notifications */
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
  border-left-color: var(--color-success);
  background-color: #e8f5e9;
}

.toast-error {
  border-left-color: var(--color-error);
  background-color: #ffebee;
}

.toast-warning {
  border-left-color: var(--color-warning);
  background-color: #fff3e0;
}

.toast-info {
  border-left-color: var(--color-info);
  background-color: #e3f2fd;
}

.toast-content {
  display: flex;
  align-items: center;
  color: var(--color-text-primary);
}

.toast-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background-color: rgba(0, 0, 0, 0.2);
  animation: toast-progress linear forwards;
}

.toast-success .toast-progress {
  background-color: var(--color-success);
}

.toast-error .toast-progress {
  background-color: var(--color-error);
}

.toast-warning .toast-progress {
  background-color: var(--color-warning);
}

.toast-info .toast-progress {
  background-color: var(--color-info);
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

/* Dark theme support for toasts */
:root.dark-theme .toast-success {
  background-color: #1b5e20;
}

:root.dark-theme .toast-error {
  background-color: #b71c1c;
}

:root.dark-theme .toast-warning {
  background-color: #bf360c;
}

:root.dark-theme .toast-info {
  background-color: #0d47a1;
}

:root.dark-theme .toast-content {
  color: white;
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