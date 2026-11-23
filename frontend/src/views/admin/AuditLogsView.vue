<!-- frontend/src/views/admin/AuditLogsView.vue -->
<template>
  <v-container fluid class="pa-4 audit-logs-view">
    <v-row>
      <v-col cols="12">
        <!-- ─────────────────────────────────────────────
             Header
        ───────────────────────────────────────────── -->
        <v-card variant="flat" class="header-card mb-4">
          <v-card-text class="d-flex align-center flex-wrap ga-4 pa-4">
            <div class="flex-grow-1">
              <h2 class="text-h6 font-weight-bold mb-1">Audit Logs</h2>
              <p class="text-caption text-medium-emphasis mb-0">
                Every action taken in the system, in order
              </p>
            </div>
            <div class="d-flex ga-2 align-center flex-wrap">
              <v-btn
                color="primary"
                variant="tonal"
                prepend-icon="mdi-refresh"
                class="text-none"
                :loading="loading"
                @click="refreshLogs"
              >
                Refresh
              </v-btn>
            </div>
          </v-card-text>
        </v-card>

        <!-- ─────────────────────────────────────────────
             Filters
        ───────────────────────────────────────────── -->
        <v-card variant="flat" class="filters-card mb-4">
          <v-card-text class="pa-4">
            <v-row dense>
              <v-col cols="12" sm="6" md="3">
                <v-select
                  v-model="filters.action"
                  label="Action"
                  :items="actions"
                  item-title="title"
                  item-value="value"
                  prepend-inner-icon="mdi-flash-outline"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  clearable
                />
              </v-col>

              <v-col cols="12" sm="6" md="3">
                <v-select
                  v-model="filters.entity_type"
                  label="Entity Type"
                  :items="entityTypes"
                  item-title="title"
                  item-value="value"
                  prepend-inner-icon="mdi-shape-outline"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  clearable
                />
              </v-col>

              <v-col cols="12" sm="6" md="2">
                <v-text-field
                  v-model="filters.user_id"
                  label="User ID"
                  type="number"
                  prepend-inner-icon="mdi-account-outline"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  clearable
                  @keyup.enter="applyFiltersNow"
                />
              </v-col>

              <v-col cols="12" sm="6" md="3">
                <v-text-field
                  v-model="dateRangeLabel"
                  label="Date Range"
                  prepend-inner-icon="mdi-calendar"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  readonly
                  clearable
                  @click="dateMenu = true"
                  @click:clear="clearDateRange"
                />
              </v-col>

              <v-col cols="12" md="1" class="d-flex align-center justify-end">
                <v-btn
                  color="primary"
                  variant="tonal"
                  class="text-none w-100"
                  prepend-inner-icon="mdi-filter-check-outline"
                  @click="applyFiltersNow"
                >
                  Apply
                </v-btn>
              </v-col>
            </v-row>

            <!-- Active filter chips -->
            <div v-if="hasActiveFilters" class="d-flex align-center flex-wrap ga-2 mt-3">
              <span class="text-caption text-medium-emphasis">Active filters:</span>

              <v-chip
                v-if="filters.action"
                size="small"
                closable
                variant="tonal"
                :color="getActionColor(filters.action)"
                @click:close="filters.action = null"
              >
                Action: {{ filters.action }}
              </v-chip>

              <v-chip
                v-if="filters.entity_type"
                size="small"
                closable
                variant="tonal"
                color="info"
                @click:close="filters.entity_type = null"
              >
                Entity: {{ filters.entity_type }}
              </v-chip>

              <v-chip
                v-if="filters.user_id"
                size="small"
                closable
                variant="tonal"
                color="deep-purple"
                @click:close="filters.user_id = null"
              >
                User ID: {{ filters.user_id }}
              </v-chip>

              <v-chip
                v-if="dateRange.value.length === 2"
                size="small"
                closable
                variant="tonal"
                color="teal"
                @click:close="clearDateRange"
              >
                {{ dateRangeLabel }}
              </v-chip>

              <v-btn
                size="small"
                variant="text"
                color="error"
                class="text-none"
                prepend-icon="mdi-close-circle-outline"
                @click="clearAllFilters"
              >
                Clear all
              </v-btn>
            </div>
          </v-card-text>
        </v-card>

        <!-- ─────────────────────────────────────────────
             Table
        ───────────────────────────────────────────── -->
        <v-card variant="flat" class="table-card">
          <v-data-table-server
            v-model:page="options.page"
            v-model:items-per-page="options.itemsPerPage"
            v-model:sort-by="options.sortBy"
            :headers="headers"
            :items="auditLogs"
            :items-length="pagination.total"
            :loading="loading"
            :items-per-page-options="[10, 20, 50, 100]"
            class="modern-table"
            @update:options="onUpdateOptions"
          >
            <template #item.action="{ item }">
              <v-chip :color="getActionColor(item.action)" size="small" variant="flat">
                {{ item.action }}
              </v-chip>
            </template>

            <template #item.entity_type="{ item }">
              <span class="text-body-2">{{ item.entity_type || '—' }}</span>
            </template>

            <template #item.entity_id="{ item }">
              <span class="text-body-2 text-medium-emphasis">
                {{ item.entity_id || '—' }}
              </span>
            </template>

            <template #item.User="{ item }">
              <div class="d-flex flex-column">
                <span class="text-body-2 font-weight-medium">
                  {{ item.User?.username ?? 'System' }}
                </span>
                <small class="text-caption text-medium-emphasis">
                  {{ item.User?.email ?? '—' }}
                </small>
              </div>
            </template>

            <template #item.request_data="{ item }">
              <v-btn
                size="small"
                variant="text"
                color="secondary"
                :disabled="!item.request_data"
                @click="viewJson(item.request_data, 'Request Data')"
              >
                View
              </v-btn>
            </template>

            <template #item.old_data="{ item }">
              <v-btn
                size="small"
                variant="text"
                color="primary"
                :disabled="!item.old_data"
                @click="viewJson(item.old_data, 'Old Data')"
              >
                View
              </v-btn>
            </template>

            <template #item.new_data="{ item }">
              <v-btn
                size="small"
                variant="text"
                color="primary"
                :disabled="!item.new_data"
                @click="viewJson(item.new_data, 'New Data')"
              >
                View
              </v-btn>
            </template>

            <template #item.createdAt="{ item }">
              <span class="text-body-2">{{ formatDate(item.createdAt) }}</span>
            </template>

            <template #no-data>
              <div class="empty-state">
                <v-icon size="48" color="grey-lighten-1">mdi-clipboard-text-clock-outline</v-icon>
                <p class="text-body-2 text-medium-emphasis mt-3 mb-0">
                  {{ hasActiveFilters ? 'No audit logs match your filters' : 'No audit logs yet' }}
                </p>
                <v-btn
                  v-if="hasActiveFilters"
                  variant="tonal"
                  size="small"
                  color="primary"
                  prepend-icon="mdi-filter-off-outline"
                  class="mt-3 text-none"
                  @click="clearAllFilters"
                >
                  Clear filters
                </v-btn>
              </div>
            </template>

            <template #bottom>
              <div class="table-footer">
                <span class="text-caption text-medium-emphasis">
                  Showing <strong>{{ auditLogs.length }}</strong>
                  of <strong>{{ pagination.total }}</strong> logs
                </span>
              </div>
            </template>
          </v-data-table-server>
        </v-card>
      </v-col>
    </v-row>

    <!-- ─────────────────────────────────────────────
         Date Range Picker (Vuetify 3 – no `range`)
    ───────────────────────────────────────────── -->
    <v-dialog v-model="dateMenu" max-width="360">
      <v-card>
        <v-card-title class="text-subtitle-1 font-weight-medium">
          Select date range
        </v-card-title>
        <v-card-text class="pa-0">
          <v-date-picker
            v-model="dateRange.value"
            :multiple="'range'"
            no-title
            scrollable
            show-adjacent-months
          />
        </v-card-text>
        <v-divider />
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" class="text-none" @click="dateMenu = false">
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            class="text-none"
            :disabled="dateRange.value.length !== 2"
            @click="applyDateRange"
          >
            Apply
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ─────────────────────────────────────────────
         JSON Viewer Dialog
    ───────────────────────────────────────────── -->
    <v-dialog v-model="jsonDialog" max-width="800">
      <v-card>
        <v-card-title class="d-flex align-center">
          {{ jsonTitle }}
          <v-spacer />
          <v-btn
            icon="mdi-close"
            variant="text"
            aria-label="Close"
            @click="jsonDialog = false"
          />
        </v-card-title>
        <v-divider />
        <v-card-text>
          <pre class="json-viewer">{{ jsonContent }}</pre>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" variant="flat" class="text-none" @click="copyJson">
            <v-icon start>mdi-content-copy</v-icon>
            Copy
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="3000"
      location="top"
      rounded="lg"
    >
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
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import api from '@/plugins/axios'

/* ─────────────── State ─────────────── */
const loading = ref(false)
const auditLogs = ref([])
const search = ref('')
const dateMenu = ref(false)
const jsonDialog = ref(false)
const jsonTitle = ref('')
const jsonContent = ref('')

// NOTE: reactive wrapper so `dateRange.value` is reactive (used by computed + templates)
const dateRange = reactive({ value: [] })

const filters = reactive({
  action: null,
  entity_type: null,
  user_id: null,
})

const options = reactive({
  page: 1,
  itemsPerPage: 20,
  sortBy: [{ key: 'createdAt', order: 'desc' }],
})

const pagination = reactive({
  page: 1,
  total: 0,
  totalPages: 0,
})

const snackbar = ref({ show: false, message: '', color: 'success' })

/* ─────────────── Options dictionaries ─────────────── */
const actions = [
  'CREATE', 'UPDATE', 'DELETE',
  'LOGIN', 'LOGOUT', 'TOKEN_REFRESH',
  'VIEW', 'LIST', 'READ', 'SEARCH',
  'STATS', 'STATUS', 'ANCHOR', 'VERIFY_PATIENT',
].map((v) => ({ title: v, value: v }))

const entityTypes = [
  'User', 'Patient', 'Appointment',
  'TestingEncounter', 'TreatmentEncounter',
  'SystemSetting', 'Blockchain', 'BlockchainItem',
].map((v) => ({ title: v, value: v }))

/* ─────────────── Table headers ─────────────── */
const headers = [
  { title: 'ID', key: 'id', sortable: true, width: '80px' },
  { title: 'Action', key: 'action', sortable: true, width: '150px' },
  { title: 'Entity', key: 'entity_type', sortable: true },
  { title: 'Entity ID', key: 'entity_id', sortable: true, width: '110px' },
  { title: 'User', key: 'User', sortable: false },
  { title: 'Request', key: 'request_data', sortable: false, align: 'center', width: '100px' },
  { title: 'Old', key: 'old_data', sortable: false, align: 'center', width: '90px' },
  { title: 'New', key: 'new_data', sortable: false, align: 'center', width: '90px' },
  { title: 'Timestamp', key: 'createdAt', sortable: true, width: '180px' },
]

/* ─────────────── Action colors ─────────────── */
const ACTION_COLORS = {
  CREATE: 'success',
  UPDATE: 'warning',
  DELETE: 'error',
  LOGIN: 'info',
  LOGOUT: 'info',
  TOKEN_REFRESH: 'info',
  VIEW: 'primary',
  LIST: 'primary',
  READ: 'primary',
  SEARCH: 'primary',
  STATS: 'secondary',
  STATUS: 'secondary',
  ANCHOR: 'deep-purple',
  VERIFY_PATIENT: 'teal',
}
const getActionColor = (action) => ACTION_COLORS[action] || 'grey'

/* ─────────────── Computed ─────────────── */
const hasActiveFilters = computed(
  () =>
    !!filters.action ||
    !!filters.entity_type ||
    !!filters.user_id ||
    dateRange.value.length === 2
)

const dateRangeLabel = computed(() => {
  const v = dateRange.value
  if (!Array.isArray(v) || v.length !== 2) return ''
  const toIso = (d) => {
    const date = d instanceof Date ? d : new Date(d)
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10)
  }
  const [a, b] = v.map(toIso)
  return a && b ? `${a} → ${b}` : ''
})

/* ─────────────── Formatting ─────────────── */
function formatDate(value) {
  if (!value) return 'N/A'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? 'N/A' : d.toLocaleString()
}

/* ─────────────── Build query params ─────────────── */
function buildParams() {
  const params = {
    page: options.page,
    limit: options.itemsPerPage,
  }
  if (filters.action) params.action = filters.action
  if (filters.entity_type) params.entity_type = filters.entity_type
  if (filters.user_id !== null && filters.user_id !== '') {
    params.user_id = filters.user_id
  }

  if (dateRange.value.length === 2) {
    const toIso = (d) => {
      const date = d instanceof Date ? d : new Date(d)
      return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10)
    }
    const [a, b] = dateRange.value.map(toIso)
    if (a) params.start_date = a
    if (b) params.end_date = b
  }

  if (Array.isArray(options.sortBy) && options.sortBy.length) {
    const { key, order } = options.sortBy[0]
    // Only forward columns the backend is known to accept
    if (['id', 'action', 'entity_type', 'entity_id', 'createdAt'].includes(key)) {
      params.sort_by = key === 'createdAt' ? 'created_at' : key
      params.sort_order = order || 'desc'
    }
  }

  return params
}

/* ─────────────── Load ─────────────── */
async function loadLogs() {
  loading.value = true
  try {
    const { data } = await api.get('/admin/audit-logs', { params: buildParams() })
    auditLogs.value = data.data || []
    pagination.total = data.total ?? 0
    pagination.totalPages = data.totalPages ?? 0
    pagination.page = data.page ?? 1
  } catch (error) {
    const message =
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.message ||
      'Failed to load audit logs'
    showSnackbar(message, 'error')
  } finally {
    loading.value = false
  }
}

function refreshLogs() {
  loadLogs()
}

/* ─────────────── Table options (server pagination/sort) ─────────────── */
function onUpdateOptions(newOptions) {
  const prevPage = options.page
  const prevSize = options.itemsPerPage
  const prevSort = JSON.stringify(options.sortBy)

  options.page = newOptions.page
  options.itemsPerPage = newOptions.itemsPerPage
  options.sortBy = newOptions.sortBy

  if (
    newOptions.page !== prevPage ||
    newOptions.itemsPerPage !== prevSize ||
    JSON.stringify(newOptions.sortBy) !== prevSort
  ) {
    loadLogs()
  }
}

/* ─────────────── Filters ─────────────── */
let filterTimer = null
function scheduleFilterReload() {
  clearTimeout(filterTimer)
  filterTimer = setTimeout(() => {
    options.page = 1
    loadLogs()
  }, 300)
}

function applyFiltersNow() {
  clearTimeout(filterTimer)
  options.page = 1
  loadLogs()
}

function applyDateRange() {
  dateMenu.value = false
  applyFiltersNow()
}

function clearDateRange() {
  dateRange.value = []
  applyFiltersNow()
}

function clearAllFilters() {
  filters.action = null
  filters.entity_type = null
  filters.user_id = null
  dateRange.value = []
  options.page = 1
  applyFiltersNow()
}

// Watch individual filter fields (but NOT dateRange – that has an explicit Apply)
watch(
  () => [filters.action, filters.entity_type, filters.user_id],
  scheduleFilterReload
)

/* ─────────────── JSON viewer ─────────────── */
function viewJson(data, title) {
  jsonTitle.value = title
  jsonContent.value = JSON.stringify(data, null, 2)
  jsonDialog.value = true
}

async function copyJson() {
  try {
    await navigator.clipboard.writeText(jsonContent.value)
    showSnackbar('Copied to clipboard', 'success')
  } catch {
    showSnackbar('Clipboard not available', 'error')
  }
}

/* ─────────────── Snackbar ─────────────── */
function showSnackbar(message, color = 'success') {
  snackbar.value = { show: true, message, color }
}

/* ─────────────── Lifecycle ─────────────── */
onMounted(() => {
  loadLogs()
})

onBeforeUnmount(() => {
  clearTimeout(filterTimer)
})
</script>

<style scoped>
.audit-logs-view {
  max-width: 1400px;
  margin: 0 auto;
}

/* ─── Cards ─── */
.header-card,
.filters-card,
.table-card {
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
  padding-top: 12px !important;
  padding-bottom: 12px !important;
}

/* ─── Table footer ─── */
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

/* ─── JSON viewer ─── */
.json-viewer {
  background-color: #f5f5f5;
  padding: 16px;
  border-radius: 4px;
  overflow-x: auto;
  font-family: 'Roboto Mono', 'Courier New', monospace;
  font-size: 12px;
  max-height: 500px;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>