<!-- frontend/src/views/staff/patients/ListView.vue -->
<template>
  <v-container fluid class="pa-4 patient-list-view">
    <v-row>
      <v-col cols="12">
        <!-- ─────────────────────────────────────────────
             Header
        ───────────────────────────────────────────── -->
        <div class="header mb-4">
          <div>
            <h2 class="text-h6 font-weight-bold mb-0">Patient Management</h2>
            <p class="text-caption text-medium-emphasis mb-0">
              Manage patient records across your facility
            </p>
          </div>
          <div class="d-flex ga-2">
            <v-btn color="primary" variant="tonal" prepend-icon="mdi-download" class="text-none" :loading="exporting"
              @click="exportData">
              Export
            </v-btn>
            <v-btn color="primary" prepend-icon="mdi-account-plus" variant="flat" class="text-none"
              @click="navigateToCreate">
              New
            </v-btn>
          </div>
        </div>

        <!-- ─────────────────────────────────────────────
             Stats Cards
        ───────────────────────────────────────────── -->
        <v-row dense class="mb-4">
          <v-col cols="6" sm="3">
            <v-card variant="flat" class="stat-card">
              <v-card-text class="pa-3">
                <div class="text-caption text-medium-emphasis">Total</div>
                <div class="text-h6 font-weight-bold">{{ stats.total }}</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="6" sm="3">
            <v-card variant="flat" class="stat-card">
              <v-card-text class="pa-3">
                <div class="text-caption text-medium-emphasis">Testing</div>
                <div class="text-h6 font-weight-bold text-info">{{ stats.testing }}</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="6" sm="3">
            <v-card variant="flat" class="stat-card">
              <v-card-text class="pa-3">
                <div class="text-caption text-medium-emphasis">Treatment</div>
                <div class="text-h6 font-weight-bold text-success">{{ stats.treatment }}</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="6" sm="3">
            <v-card variant="flat" class="stat-card">
              <v-card-text class="pa-3">
                <div class="text-caption text-medium-emphasis">Active</div>
                <div class="text-h6 font-weight-bold text-primary">{{ stats.active }}</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- ─────────────────────────────────────────────
             Filters
        ───────────────────────────────────────────── -->
        <v-card variant="flat" class="filters-card mb-4">
          <v-card-text class="pa-4">
            <v-row dense>
              <v-col cols="12" md="4">
                <v-text-field v-model="searchQuery" label="Search" placeholder="Search by facility code or contact…"
                  prepend-inner-icon="mdi-magnify" variant="outlined" density="comfortable" hide-details clearable
                  @update:model-value="debouncedSearch" />
              </v-col>

              <v-col cols="12" sm="6" md="3">
                <v-select v-model="purposeFilter" label="Purpose" :items="purposeOptions" item-title="title"
                  item-value="value" prepend-inner-icon="mdi-tag-outline" variant="outlined" density="comfortable"
                  hide-details clearable />
              </v-col>

              <v-col cols="12" sm="6" md="3">
                <v-select v-model="yearFilter" label="Enrollment Year" :items="yearOptions" item-title="title"
                  item-value="value" prepend-inner-icon="mdi-calendar" variant="outlined" density="comfortable"
                  hide-details clearable />
              </v-col>

              <v-col cols="12" md="2" class="d-flex align-center justify-end">
                <v-btn color="primary" variant="tonal" class="text-none" prepend-icon="mdi-refresh" :loading="loading"
                  @click="refresh">
                  Refresh
                </v-btn>
              </v-col>
            </v-row>

            <!-- Active filter chips -->
            <div v-if="hasActiveFilters" class="d-flex align-center flex-wrap ga-2 mt-3">
              <span class="text-caption text-medium-emphasis">Active filters:</span>

              <v-chip v-if="searchQuery" size="small" closable variant="tonal" color="primary"
                @click:close="clearSearch">
                <v-icon start size="14">mdi-magnify</v-icon>
                "{{ searchQuery }}"
              </v-chip>

              <v-chip v-if="purposeFilter" size="small" closable variant="tonal" color="info"
                @click:close="purposeFilter = null">
                Purpose: {{ purposeFilter }}
              </v-chip>

              <v-chip v-if="yearFilter" size="small" closable variant="tonal" color="deep-purple"
                @click:close="yearFilter = null">
                Year: {{ yearFilter }}
              </v-chip>

              <v-btn size="small" variant="text" color="error" class="text-none" prepend-icon="mdi-close-circle-outline"
                @click="clearAllFilters">
                Clear all
              </v-btn>
            </div>
          </v-card-text>
        </v-card>

        <!-- ─────────────────────────────────────────────
             Table
        ───────────────────────────────────────────── -->
        <v-card variant="flat" class="table-card">
          <v-data-table-server v-model:page="currentPage" v-model:items-per-page="itemsPerPage" :headers="headers"
            :items="patients" :items-length="totalPatients" :loading="loading" :sort-by="sortBy"
            @update:options="onUpdateOptions" hover class="modern-table">
            <!-- Name -->
            <template #item.full_name="{ item }">
              <div class="d-flex align-center">
                <v-avatar size="36" color="primary" variant="tonal" class="mr-3">
                  <span class="text-caption font-weight-bold">
                    {{ getInitials(item) }}
                  </span>
                </v-avatar>
                <div>
                  <div class="font-weight-medium">
                    {{ item.last_name }}, {{ item.first_name }}
                    {{ getMiddleInitial(item.middle_name) }}
                    {{ item.suffix || '' }}
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    {{ item.contact_number || 'No contact' }}
                  </div>
                </div>
              </div>
            </template>

            <!-- Facility Code -->
            <template #item.patient_facility_code="{ item }">
              <v-chip size="small" color="primary" variant="tonal" class="font-weight-medium">
                {{ item.patient_facility_code }}
              </v-chip>
            </template>

            <!-- Age -->
            <template #item.age="{ item }">
              <span class="text-body-2">
                {{ calculateAge(item.birth_date) }}
                <span class="text-medium-emphasis">yrs</span>
              </span>
            </template>

            <!-- Gender -->
            <template #item.gender="{ item }">
              <span class="text-capitalize text-body-2">{{ item.gender || '—' }}</span>
            </template>

            <!-- Purpose (was "Status") -->
            <template #item.purpose="{ item }">
              <v-chip size="small" variant="flat" :color="item.purpose === 'treatment' ? 'success' : 'info'"
                :prepend-icon="item.purpose === 'treatment' ? 'mdi-hospital' : 'mdi-test-tube'" class="text-capitalize">
                {{ item.purpose || 'testing' }}
              </v-chip>
            </template>

            <!-- Enrollment Date -->
            <template #item.enrollment_date="{ item }">
              <span class="text-body-2">{{ formatDate(item.enrollment_date) }}</span>
            </template>

            <!-- Actions -->
            <template #item.actions="{ item }">
              <div class="d-flex justify-center ga-1">
                <v-tooltip text="View" location="top">
                  <template #activator="{ props }">
                    <v-btn v-bind="props" icon="mdi-eye-outline" size="small" variant="text" color="primary"
                      @click="viewPatient(item.id)" />
                  </template>
                </v-tooltip>

                <v-tooltip text="Edit" location="top">
                  <template #activator="{ props }">
                    <v-btn v-bind="props" icon="mdi-pencil-outline" size="small" variant="text" color="info"
                      @click="editPatient(item.id)" />
                  </template>
                </v-tooltip>

                <v-tooltip text="Start Encounter" location="top">
                  <template #activator="{ props }">
                    <v-btn v-bind="props" icon="mdi-test-tube" size="small" variant="text" color="success"
                      @click="startEncounter(item.id)" />
                  </template>
                </v-tooltip>
              </div>
            </template>

            <!-- Loading skeleton -->
            <template #loading>
              <v-skeleton-loader type="table-row@5" />
            </template>

            <!-- Empty state -->
            <template #no-data>
              <div class="empty-state">
                <v-icon size="48" color="grey-lighten-1">mdi-account-off-outline</v-icon>
                <p class="text-body-2 text-medium-emphasis mt-3 mb-0">
                  {{ hasActiveFilters ? 'No patients match your filters' : 'No patients yet' }}
                </p>
                <v-btn v-if="hasActiveFilters" variant="tonal" size="small" color="primary"
                  prepend-icon="mdi-filter-off-outline" class="mt-3 text-none" @click="clearAllFilters">
                  Clear filters
                </v-btn>
                <v-btn v-else variant="tonal" size="small" color="primary" prepend-icon="mdi-account-plus"
                  class="mt-3 text-none" @click="navigateToCreate">
                  Add your first patient
                </v-btn>
              </div>
            </template>

            <!-- Footer -->
            <template #bottom>
              <div class="table-footer">
                <span class="text-caption text-medium-emphasis">
                  Showing <strong>{{ patients.length }}</strong>
                  of <strong>{{ totalPatients }}</strong> patients
                </span>
              </div>
            </template>
          </v-data-table-server>
        </v-card>
      </v-col>
    </v-row>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000" location="top" rounded="lg">
      <div class="d-flex align-center">
        <v-icon class="mr-2">
          {{ snackbar.color === 'success' ? 'mdi-check-circle' : 'mdi-alert-circle' }}
        </v-icon>
        {{ snackbar.message }}
      </div>
      <template #actions>
        <v-btn icon="mdi-close" variant="text" size="small" @click="snackbar.show = false" />
      </template>
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import patientService from '@/services/patientService'
import { useAuthStore } from '@/stores/authStore'

const router = useRouter()
const authStore = useAuthStore()

/* ─────────────── State ─────────────── */
const patients = ref([])
const loading = ref(false)
const exporting = ref(false)
const searchQuery = ref('')
const purposeFilter = ref(null)   // ✅ renamed from statusFilter
const yearFilter = ref(null)
const currentPage = ref(1)
const itemsPerPage = ref(20)
const totalPatients = ref(0)
const sortBy = ref([{ key: 'created_at', order: 'desc' }]) // ✅ match backend default

const stats = ref({ total: 0, testing: 0, treatment: 0, active: 0 })

let searchTimeout = null

const snackbar = ref({
  show: false,
  message: '',
  color: 'success'
})

/* ─────────────── Constants ─────────────── */
const purposeOptions = [
  { title: 'Testing', value: 'testing' },
  { title: 'Treatment', value: 'treatment' }
]

const yearOptions = computed(() => {
  const currentYear = new Date().getFullYear()
  return Array.from({ length: 10 }, (_, i) => {
    const year = (currentYear - i).toString()
    return { title: year, value: year }
  })
})

const headers = [
  { title: 'Name', key: 'full_name', sortable: false }, // ✅ backend doesn't sort by name
  { title: 'Facility Code', key: 'patient_facility_code', align: 'center', sortable: false, width: '160px' },
  { title: 'Age', key: 'age', align: 'center', sortable: false, width: '100px' },
  { title: 'Gender', key: 'gender', align: 'center', sortable: false, width: '110px' },
  { title: 'Purpose', key: 'purpose', align: 'center', sortable: false, width: '130px' },
  { title: 'Enrolled', key: 'enrollment_date', align: 'center', sortable: false, width: '130px' },
  { title: 'Actions', key: 'actions', align: 'center', sortable: false, width: '150px' }
]

/* ─────────────── Computed ─────────────── */
const hasActiveFilters = computed(
  () => !!searchQuery.value || !!purposeFilter.value || !!yearFilter.value
)

/* ─────────────── Data loading ─────────────── */
async function loadPatients() {
  loading.value = true
  try {
    const response = await patientService.getPatients(
      currentPage.value,
      itemsPerPage.value,
      searchQuery.value,
      purposeFilter.value,
      yearFilter.value
    )

    let items = response.items || []

    patients.value = items
    totalPatients.value = response.total || 0
  } catch (error) {
    showSnackbar(extractError(error), 'error')
  } finally {
    loading.value = false
  }
}

async function loadStats() {
  try {
    stats.value = await patientService.getStats()
  } catch (error) {
    // non-fatal
    console.warn('Failed to load stats:', extractError(error))
  }
}

/* ─────────────── Filter handlers ─────────────── */
const debouncedSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    loadPatients()
  }, 500)
}

function clearSearch() {
  searchQuery.value = ''
  currentPage.value = 1
  loadPatients()
}

function clearAllFilters() {
  searchQuery.value = ''
  purposeFilter.value = null
  yearFilter.value = null
  currentPage.value = 1
  loadPatients()
}

watch([purposeFilter, yearFilter], () => {
  currentPage.value = 1
  loadPatients()
})

/* ─────────────── Table handlers ─────────────── */
function onUpdateOptions(options) {
  currentPage.value = options.page
  itemsPerPage.value = options.itemsPerPage
  loadPatients()
}

function refresh() {
  loadPatients()
  loadStats()
}

/* ─────────────── Export ─────────────── */
async function exportData() {
  exporting.value = true
  try {
    const blob = await patientService.exportPatients('csv', searchQuery.value)
    const url = window.URL.createObjectURL(new Blob([blob]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `patients-${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
    showSnackbar('Export downloaded', 'success')
  } catch (error) {
    showSnackbar(extractError(error), 'error')
  } finally {
    exporting.value = false
  }
}

/* ─────────────── Navigation ─────────────── */
const navigateToCreate = () => router.push('/patients/create')
const viewPatient = (id) => router.push(`/patients/${id}`)
const editPatient = (id) => router.push(`/patients/${id}/edit`)

function startEncounter(id) {
  const office = authStore.userOffice || 'testing'
  router.push(`/${office}/encounter/${id}`)
}

/* ─────────────── Formatting helpers ─────────────── */
function getInitials(patient) {
  return `${patient.first_name?.charAt(0) || ''}${patient.last_name?.charAt(0) || ''}`.toUpperCase()
}

function getMiddleInitial(middleName) {
  if (!middleName) return ''
  return middleName.charAt(0).toUpperCase() + '.'
}

function calculateAge(birthDate) {
  if (!birthDate) return 'N/A'
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

function formatDate(date) {
  if (!date) return 'N/A'
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

/* ─────────────── Error handling ─────────────── */
function extractError(error) {
  // Backend returns { error: "..." }; axios may nest under response.data
  return (
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    'An unexpected error occurred'
  )
}

/* ─────────────── Snackbar ─────────────── */
function showSnackbar(message, color = 'success') {
  snackbar.value = { show: true, message, color }
}

/* ─────────────── Lifecycle ─────────────── */
onMounted(() => {
  loadPatients()
  loadStats()
})
</script>

<style scoped>
.patient-list-view {
  max-width: 1400px;
  margin: 0 auto;
}

/* ─── Header ─── */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
}

/* ─── Cards ─── */
.filters-card,
.table-card,
.stat-card {
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
}

/* ─── Table ─── */
.modern-table :deep(thead th) {
  font-weight: 600 !important;
  text-transform: uppercase;
  font-size: 0.72rem !important;
  letter-spacing: 0.5px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06) !important;
}

.modern-table :deep(tbody tr) {
  transition: background 0.15s ease;
}

.modern-table :deep(tbody td) {
  padding-top: 14px !important;
  padding-bottom: 14px !important;
}

.table-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 12px 20px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

/* ─── Empty state ─── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 16px;
}

/* ─── Responsive ─── */
@media (max-width: 600px) {
  .header {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>