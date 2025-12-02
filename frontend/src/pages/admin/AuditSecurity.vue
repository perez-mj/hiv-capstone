<!-- frontend/src/pages/admin/AuditSecurity.vue -->
<template>
  <v-container fluid class="pa-6">
    <!-- Page Header -->
    <div class="page-header d-flex justify-space-between align-center mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold text-primary">Audit & Security</h1>
        <p class="text-body-1 text-medium-emphasis mt-2">
          Monitor system activities and security events
        </p>
      </div>
      <div class="d-flex gap-2">
        <v-btn 
          variant="outlined" 
          prepend-icon="mdi-download"
          @click="exportAuditLogs"
          :loading="exporting"
        >
          Export
        </v-btn>
        <v-btn 
          color="primary" 
          prepend-icon="mdi-refresh"
          @click="refreshData"
          :loading="loading"
        >
          Refresh
        </v-btn>
      </div>
    </div>

    <!-- Stats Cards -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="2" border>
          <v-card-text class="text-center">
            <v-icon color="primary" size="48" class="mb-2">mdi-shield-account</v-icon>
            <div class="text-h5 font-weight-bold">{{ stats.total_actions_24h || 0 }}</div>
            <div class="text-body-2 text-medium-emphasis">Actions (24h)</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="2" border>
          <v-card-text class="text-center">
            <v-icon color="success" size="48" class="mb-2">mdi-login</v-icon>
            <div class="text-h5 font-weight-bold">{{ stats.successful_logins || 0 }}</div>
            <div class="text-body-2 text-medium-emphasis">Successful Logins</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="2" border>
          <v-card-text class="text-center">
            <v-icon color="error" size="48" class="mb-2">mdi-login-variant</v-icon>
            <div class="text-h5 font-weight-bold">{{ stats.failed_logins || 0 }}</div>
            <div class="text-body-2 text-medium-emphasis">Failed Logins</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="2" border>
          <v-card-text class="text-center">
            <v-icon color="warning" size="48" class="mb-2">mdi-account-group</v-icon>
            <div class="text-h5 font-weight-bold">{{ stats.active_users || 0 }}</div>
            <div class="text-body-2 text-medium-emphasis">Active Users</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Charts and Analytics -->
    <v-row class="mb-6">
      <v-col cols="12" md="8">
        <v-card elevation="2" border>
          <v-card-title class="d-flex justify-space-between align-center">
            <span>Activity Timeline (Last 30 Days)</span>
            <v-btn variant="text" size="small" @click="showActivityChart = !showActivityChart">
              {{ showActivityChart ? 'Hide' : 'Show' }}
            </v-btn>
          </v-card-title>
          <v-card-text v-if="showActivityChart">
            <div class="activity-chart">
              <div 
                v-for="day in activityData" 
                :key="day.date"
                class="chart-bar-container"
              >
                <div class="chart-bar-label">{{ formatChartDate(day.date) }}</div>
                <div class="chart-bar">
                  <div 
                    class="chart-bar-fill primary" 
                    :style="{ height: `${Math.min((day.count / maxDailyActivity) * 100, 100)}%` }"
                    :title="`Actions: ${day.count}`"
                  ></div>
                </div>
                <div class="chart-bar-total">{{ day.count }}</div>
              </div>
            </div>
            <div class="chart-legend d-flex justify-center gap-4 mt-4">
              <div class="d-flex align-center gap-1">
                <div class="legend-color primary"></div>
                <span class="text-caption">System Actions</span>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card elevation="2" border>
          <v-card-title>Top Action Types</v-card-title>
          <v-card-text>
            <div class="action-types">
              <div 
                v-for="type in actionTypes" 
                :key="type.action_type"
                class="action-type-item d-flex justify-space-between align-center py-2"
              >
                <div class="d-flex align-center gap-2">
                  <v-icon :color="getActionTypeColor(type.action_type)" size="20">
                    {{ getActionTypeIcon(type.action_type) }}
                  </v-icon>
                  <span class="text-body-2">{{ formatActionType(type.action_type) }}</span>
                </div>
                <v-chip size="small" variant="flat">
                  {{ type.count }}
                </v-chip>
              </div>
              <div v-if="actionTypes.length === 0" class="text-center py-4">
                <v-icon size="48" color="grey-lighten-2" class="mb-2">mdi-chart-bar</v-icon>
                <div class="text-body-2 text-grey">No action data available</div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Search and Filters -->
    <v-card elevation="2" class="mb-4" border>
      <v-card-text>
        <v-row dense align="center">
          <v-col cols="12" md="3">
            <v-text-field
              v-model="search"
              density="comfortable"
              variant="outlined"
              placeholder="Search by description, patient ID, or IP..."
              prepend-inner-icon="mdi-magnify"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-select
              v-model="actionTypeFilter"
              density="comfortable"
              variant="outlined"
              :items="actionTypeOptions"
              placeholder="Action Type"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-select
              v-model="patientIdFilter"
              density="comfortable"
              variant="outlined"
              :items="patientIdOptions"
              placeholder="Patient ID"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-row dense>
              <v-col>
                <v-menu v-model="dateMenu" :close-on-content-click="false">
                  <template v-slot:activator="{ props }">
                    <v-text-field
                      v-model="dateRangeText"
                      density="comfortable"
                      variant="outlined"
                      placeholder="Date Range"
                      prepend-inner-icon="mdi-calendar"
                      readonly
                      v-bind="props"
                      hide-details
                    />
                  </template>
                  <v-date-picker
                    v-model="dateRange"
                    range
                    @update:model-value="dateMenu = false"
                  />
                </v-menu>
              </v-col>
              <v-col cols="auto">
                <v-btn
                  variant="outlined"
                  @click="clearFilters"
                  :disabled="!hasActiveFilters"
                >
                  Clear
                </v-btn>
              </v-col>
            </v-row>
          </v-col>
          <v-col cols="12" md="2">
            <v-btn
              color="primary"
              variant="flat"
              @click="loadAuditLogs"
              :loading="loading"
              block
            >
              Apply Filters
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Main Audit Log Table -->
    <v-card elevation="2" border>
      <v-card-title class="d-flex justify-space-between align-center">
        <span class="text-h6">Audit Logs</span>
        <span class="text-body-2 text-medium-emphasis">
          Showing {{ pagination.total > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0 }} - 
          {{ Math.min(pagination.page * pagination.limit, pagination.total) }} of {{ pagination.total }} records
        </span>
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-0">
        <v-data-table
          :headers="headers"
          :items="auditLogs"
          :loading="loading"
          :items-per-page="pagination.limit"
          :page="pagination.page"
          :server-items-length="pagination.total"
          @update:options="handlePagination"
          class="elevation-0"
        >
          <!-- Loading State -->
          <template v-slot:loading>
            <v-skeleton-loader type="table-row@10" />
          </template>

          <!-- Timestamp Column -->
          <template v-slot:item.timestamp="{ item }">
            <div class="text-no-wrap">
              {{ formatDateTime(item.timestamp) }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ formatTimeAgo(item.timestamp) }}
            </div>
          </template>

          <!-- User Column -->
          <template v-slot:item.admin_user_id="{ item }">
            <div class="d-flex align-center">
              <v-avatar size="32" color="primary" class="mr-3">
                <span class="text-caption text-white">
                  {{ getInitials(item.admin_user_id ? `User ${item.admin_user_id}` : 'System') }}
                </span>
              </v-avatar>
              <div>
                <div class="font-weight-medium">{{ item.admin_user_id ? `User ${item.admin_user_id}` : 'System' }}</div>
                <div class="text-caption text-medium-emphasis" v-if="item.admin_user_id">
                  ID: {{ item.admin_user_id }}
                </div>
              </div>
            </div>
          </template>

          <!-- Action Type Column -->
          <template v-slot:item.action_type="{ item }">
            <v-chip 
              :color="getActionTypeColor(item.action_type)" 
              size="small"
              variant="flat"
              :prepend-icon="getActionTypeIcon(item.action_type)"
            >
              {{ formatActionType(item.action_type) }}
            </v-chip>
          </template>

          <!-- Description Column -->
          <template v-slot:item.description="{ item }">
            <div class="description-cell">
              {{ item.description }}
            </div>
            <div v-if="item.patient_id" class="text-caption text-medium-emphasis">
              Patient: {{ item.patient_id }}
            </div>
          </template>

          <!-- IP Address Column -->
          <template v-slot:item.ip_address="{ item }">
            <code class="text-body-2">{{ item.ip_address || 'N/A' }}</code>
          </template>

          <!-- Status Column -->
          <template v-slot:item.status="{ item }">
            <v-chip 
              :color="getStatusColor(item.action_type)" 
              size="small"
              variant="flat"
              :prepend-icon="getStatusIcon(item.action_type)"
            >
              {{ getStatusText(item.action_type) }}
            </v-chip>
          </template>

          <!-- Actions Column -->
          <template v-slot:item.actions="{ item }">
            <div class="d-flex gap-1">
              <v-btn
                size="small"
                variant="text"
                color="primary"
                icon="mdi-information"
                @click="viewLogDetails(item)"
              />
            </div>
          </template>

          <!-- Empty State -->
          <template v-slot:no-data>
            <div class="text-center py-8">
              <v-icon size="64" color="grey-lighten-2" class="mb-4">mdi-shield-off</v-icon>
              <div class="text-h6 text-grey">No audit logs found</div>
              <div class="text-body-2 text-grey mt-2">
                {{ hasActiveFilters ? 'Try adjusting your filters' : 'No audit records available' }}
              </div>
            </div>
          </template>
        </v-data-table>
      </v-card-text>

      <!-- Pagination -->
      <v-card-actions class="d-flex justify-space-between align-center px-4 py-3">
        <span class="text-body-2 text-medium-emphasis">
          Page {{ pagination.page }} of {{ Math.ceil(pagination.total / pagination.limit) }}
        </span>
        <v-pagination
          v-model="pagination.page"
          :length="Math.ceil(pagination.total / pagination.limit)"
          :total-visible="7"
          density="comfortable"
          @update:model-value="handlePageChange"
        />
      </v-card-actions>
    </v-card>

    <!-- Log Details Dialog -->
    <v-dialog v-model="showLogDialog" max-width="600">
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
          <span>Audit Log Details</span>
          <v-btn icon @click="showLogDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text>
          <div v-if="selectedLog" class="log-details">
            <v-row>
              <v-col cols="6">
                <div class="text-caption text-medium-emphasis">Timestamp</div>
                <div class="text-body-1 mb-2">{{ formatDateTime(selectedLog.timestamp) }}</div>
              </v-col>
              <v-col cols="6">
                <div class="text-caption text-medium-emphasis">Status</div>
                <v-chip 
                  :color="getStatusColor(selectedLog.action_type)" 
                  size="small"
                  class="mb-2"
                >
                  {{ getStatusText(selectedLog.action_type) }}
                </v-chip>
              </v-col>
              <v-col cols="12">
                <div class="text-caption text-medium-emphasis">User</div>
                <div class="text-body-1 mb-2">
                  {{ selectedLog.admin_user_id ? `User ${selectedLog.admin_user_id}` : 'System' }}
                </div>
              </v-col>
              <v-col cols="12">
                <div class="text-caption text-medium-emphasis">Action</div>
                <div class="text-body-1 mb-2">{{ formatActionType(selectedLog.action_type) }}</div>
              </v-col>
              <v-col cols="12">
                <div class="text-caption text-medium-emphasis">Description</div>
                <div class="text-body-1 mb-2">{{ selectedLog.description }}</div>
              </v-col>
              <v-col cols="6">
                <div class="text-caption text-medium-emphasis">IP Address</div>
                <div class="text-body-1 mb-2">{{ selectedLog.ip_address || 'N/A' }}</div>
              </v-col>
              <v-col cols="6">
                <div class="text-caption text-medium-emphasis">Patient ID</div>
                <div class="text-body-1 mb-2">{{ selectedLog.patient_id || 'N/A' }}</div>
              </v-col>
            </v-row>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" @click="showLogDialog = false">
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
import { auditApi } from '@/api'

// Reactive state
const loading = ref(false)
const exporting = ref(false)
const search = ref('')
const actionTypeFilter = ref('')
const patientIdFilter = ref('')
const dateRange = ref([])
const dateMenu = ref(false)
const showLogDialog = ref(false)
const selectedLog = ref(null)
const showActivityChart = ref(true)

// Data from API
const auditLogs = ref([])
const auditStats = ref({})
const actionTypes = ref([])
const activityData = ref([])

const snackbar = ref({
  show: false,
  message: '',
  color: 'success'
})

// Pagination
const pagination = ref({
  page: 1,
  limit: 20,
  total: 0
})

// Table headers
const headers = ref([
  { title: 'Timestamp', key: 'timestamp', sortable: true, width: '180px' },
  { title: 'User', key: 'admin_user_id', sortable: true },
  { title: 'Action Type', key: 'action_type', sortable: true },
  { title: 'Description', key: 'description', sortable: false },
  { title: 'IP Address', key: 'ip_address', sortable: true },
  { title: 'Patient ID', key: 'patient_id', sortable: true },
  { title: 'Status', key: 'status', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end', width: '100px' }
])

// Stats computed from API data
const stats = computed(() => {
  const total_actions_24h = auditStats.value.total_actions_24h || 0
  const total_actions_30d = auditStats.value.total_actions_30d || 0
  
  // Calculate login stats from action types
  const actionTypesData = auditStats.value.action_types || []
  const successful_logins = actionTypesData.find(type => 
    type.action_type === 'LOGIN_SUCCESS'
  )?.count || 0
  const failed_logins = actionTypesData.find(type => 
    type.action_type === 'LOGIN_FAILED'
  )?.count || 0
  const active_users = auditStats.value.top_users?.length || 0

  return {
    total_actions_24h,
    total_actions_30d,
    successful_logins,
    failed_logins,
    active_users
  }
})

// Filter options
const actionTypeOptions = computed(() => {
  const types = [...new Set(auditLogs.value.map(log => log.action_type).filter(Boolean))]
  return types.map(type => ({ title: formatActionType(type), value: type }))
})

const patientIdOptions = computed(() => {
  const patientIds = [...new Set(auditLogs.value.map(log => log.patient_id).filter(Boolean))]
  return patientIds.map(id => ({ title: id, value: id }))
})

const dateRangeText = computed(() => {
  if (dateRange.value.length === 2) {
    return `${formatDate(dateRange.value[0])} - ${formatDate(dateRange.value[1])}`
  }
  return 'Select date range'
})

const hasActiveFilters = computed(() => {
  return search.value || actionTypeFilter.value || patientIdFilter.value || dateRange.value.length > 0
})

const maxDailyActivity = computed(() => {
  if (activityData.value.length === 0) return 1
  return Math.max(...activityData.value.map(day => day.count))
})

// Methods
function getActionTypeColor(actionType) {
  const colors = {
    'LOGIN_SUCCESS': 'success',
    'LOGIN_FAILED': 'error',
    'LOGOUT': 'warning',
    'PATIENT_CREATED': 'primary',
    'PATIENT_UPDATED': 'info',
    'PATIENT_DELETED': 'error',
    'PATIENT_VIEWED': 'teal',
    'DLT_VERIFICATION': 'deep-purple',
    'DLT_HASH_CREATED': 'indigo',
    'BIOMETRIC_LINK_CREATED': 'orange',
    'BIOMETRIC_VERIFICATION': 'green',
    'USER_LOGIN': 'success',
    'USER_LOGOUT': 'warning'
  }
  return colors[actionType] || 'grey'
}

function getActionTypeIcon(actionType) {
  const icons = {
    'LOGIN_SUCCESS': 'mdi-login',
    'LOGIN_FAILED': 'mdi-login-variant',
    'LOGOUT': 'mdi-logout',
    'PATIENT_CREATED': 'mdi-account-plus',
    'PATIENT_UPDATED': 'mdi-account-edit',
    'PATIENT_DELETED': 'mdi-account-remove',
    'PATIENT_VIEWED': 'mdi-account-eye',
    'DLT_VERIFICATION': 'mdi-shield-check',
    'DLT_HASH_CREATED': 'mdi-database-plus',
    'BIOMETRIC_LINK_CREATED': 'mdi-fingerprint',
    'BIOMETRIC_VERIFICATION': 'mdi-shield-account',
    'USER_LOGIN': 'mdi-login',
    'USER_LOGOUT': 'mdi-logout'
  }
  return icons[actionType] || 'mdi-information'
}

function formatActionType(actionType) {
  return actionType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

function getStatusColor(actionType) {
  if (actionType.includes('FAILED') || actionType.includes('DELETED')) {
    return 'error'
  }
  if (actionType.includes('SUCCESS') || actionType.includes('CREATED') || actionType.includes('VERIFICATION')) {
    return 'success'
  }
  return 'info'
}

function getStatusIcon(actionType) {
  if (actionType.includes('FAILED') || actionType.includes('DELETED')) {
    return 'mdi-close-circle'
  }
  if (actionType.includes('SUCCESS') || actionType.includes('CREATED') || actionType.includes('VERIFICATION')) {
    return 'mdi-check-circle'
  }
  return 'mdi-information'
}

function getStatusText(actionType) {
  if (actionType.includes('FAILED')) {
    return 'Failed'
  }
  if (actionType.includes('SUCCESS') || actionType.includes('CREATED') || actionType.includes('VERIFICATION')) {
    return 'Success'
  }
  return 'Info'
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })
}

function formatChartDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })
}

function formatDateTime(dateString) {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatTimeAgo(dateString) {
  const now = new Date()
  const time = new Date(dateString)
  const diffMs = now - time
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return `${Math.floor(diffDays / 7)}w ago`
}

function getInitials(name) {
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

function clearFilters() {
  search.value = ''
  actionTypeFilter.value = ''
  patientIdFilter.value = ''
  dateRange.value = []
  pagination.value.page = 1
  loadAuditLogs()
}

function handlePagination(options) {
  if (options.page !== undefined) pagination.value.page = options.page
  if (options.itemsPerPage !== undefined) pagination.value.limit = options.itemsPerPage
  loadAuditLogs()
}

function handlePageChange(page) {
  pagination.value.page = page
  loadAuditLogs()
}

function viewLogDetails(log) {
  selectedLog.value = log
  showLogDialog.value = true
}

async function exportAuditLogs() {
  exporting.value = true
  try {
    // Get all logs for export
    const response = await auditApi.getLogs({ limit: 10000 })
    const logs = response.data.logs
    
    const dataStr = JSON.stringify(logs, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    showSnackbar('Audit logs exported successfully')
  } catch (error) {
    console.error('Error exporting audit logs:', error)
    showSnackbar('Failed to export audit logs', 'error')
  } finally {
    exporting.value = false
  }
}

function showSnackbar(message, color = 'success') {
  snackbar.value = {
    show: true,
    message,
    color
  }
}

async function loadAuditLogs() {
  loading.value = true
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.limit
    }

    if (actionTypeFilter.value) {
      params.action_type = actionTypeFilter.value
    }

    if (patientIdFilter.value) {
      params.patient_id = patientIdFilter.value
    }

    const response = await auditApi.getLogs(params)
    auditLogs.value = response.data.logs
    pagination.value.total = response.data.pagination.total
    
    showSnackbar('Audit logs loaded successfully')
  } catch (error) {
    console.error('Error loading audit logs:', error)
    showSnackbar('Failed to load audit logs', 'error')
  } finally {
    loading.value = false
  }
}

async function loadAuditStats() {
  try {
    const response = await auditApi.getStats()
    auditStats.value = response.data
    
    // Set activity data from last_30_days
    activityData.value = response.data.last_30_days || []
    
    // Set action types
    actionTypes.value = response.data.action_types || []
    
    console.log('Audit stats loaded:', response.data)
  } catch (error) {
    console.error('Error loading audit stats:', error)
    showSnackbar('Failed to load audit statistics', 'error')
  }
}

async function refreshData() {
  loading.value = true
  try {
    await Promise.all([
      loadAuditStats(),
      loadAuditLogs()
    ])
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

.gap-2 {
  gap: 8px;
}

.activity-chart {
  display: flex;
  align-items: end;
  justify-content: space-between;
  height: 200px;
  padding: 20px 0;
  overflow-x: auto;
}

.chart-bar-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  min-width: 40px;
}

.chart-bar {
  width: 20px;
  height: 120px;
  background: #f5f5f5;
  border-radius: 4px;
  position: relative;
  overflow: hidden;
}

.chart-bar-fill {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  border-radius: 4px;
  transition: height 0.3s ease;
}

.chart-bar-fill.primary {
  background: #2196F3;
}

.chart-bar-label {
  font-size: 0.75rem;
  margin-bottom: 8px;
  color: rgba(0, 0, 0, 0.6);
}

.chart-bar-total {
  font-size: 0.75rem;
  margin-top: 8px;
  font-weight: 600;
}

.chart-legend .legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.legend-color.primary { background: #2196F3; }

.action-types {
  max-height: 200px;
  overflow-y: auto;
}

.description-cell {
  max-width: 300px;
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
</style>