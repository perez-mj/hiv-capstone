<!-- frontend\src\pages\admin\Dashboard.vue -->
<template>
  <v-container fluid class="dashboard-page">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="text-h4 font-weight-bold mb-2">Dashboard Overview</h1>
        <p class="text-body-1 text-medium-emphasis">
          Welcome back, {{ authStore.user?.username }}! 
          Here's what's happening with your HIV system.
        </p>
        <div class="last-updated text-caption text-medium-emphasis">
          Last updated: {{ lastUpdated }}
        </div>
      </div>
      <div class="header-actions">
        <v-btn
          variant="outlined"
          prepend-icon="mdi-refresh"
          @click="refreshData"
          :loading="loading"
        >
          Refresh
        </v-btn>
      </div>
    </div>

    <!-- System Alerts -->
    <v-alert
      v-if="systemAlerts.length > 0"
      type="warning"
      variant="tonal"
      class="mb-4"
    >
      <template v-slot:title>
        System Notifications ({{ systemAlerts.length }})
      </template>
      <div v-for="(alert, index) in systemAlerts" :key="index" class="alert-item">
        <v-icon small class="me-2">mdi-alert</v-icon>
        {{ alert.message }}
      </div>
    </v-alert>

    <!-- Key Metrics -->
    <v-row class="metrics-row">
      <v-col cols="12" sm="6" md="3">
        <v-card class="metric-card" elevation="2">
          <v-card-text class="d-flex align-center">
            <v-avatar color="primary" class="me-4" size="56">
              <v-icon color="white">mdi-account-multiple</v-icon>
            </v-avatar>
            <div>
              <div class="metric-value">{{ stats.patients?.total || 0 }}</div>
              <div class="metric-label">Total Patients</div>
              <div class="metric-change info">
                <v-icon small>mdi-database</v-icon>
                {{ stats.patients?.daily_enrollments || 0 }} today
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="metric-card" elevation="2">
          <v-card-text class="d-flex align-center">
            <v-avatar color="success" class="me-4" size="56">
              <v-icon color="white">mdi-checkbox-marked-circle</v-icon>
            </v-avatar>
            <div>
              <div class="metric-value">{{ stats.patients?.consented || 0 }}</div>
              <div class="metric-label">Consented Patients</div>
              <div class="metric-change positive">
                <v-icon small>mdi-check</v-icon>
                {{ consentRate }}% consent rate
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="metric-card" elevation="2">
          <v-card-text class="d-flex align-center">
            <v-avatar color="warning" class="me-4" size="56">
              <v-icon color="white">mdi-alert-circle</v-icon>
            </v-avatar>
            <div>
              <div class="metric-value">{{ stats.patients?.reactive || 0 }}</div>
              <div class="metric-label">Reactive Status</div>
              <div class="metric-change warning">
                <v-icon small>mdi-information</v-icon>
                {{ reactiveRate }}% of total
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="metric-card" elevation="2">
          <v-card-text class="d-flex align-center">
            <v-avatar color="teal" class="me-4" size="56">
              <v-icon color="white">mdi-heart-pulse</v-icon>
            </v-avatar>
            <div>
              <div class="metric-value">{{ stats.patients?.non_reactive || 0 }}</div>
              <div class="metric-label">Non-Reactive</div>
              <div class="metric-change positive">
                <v-icon small>mdi-check</v-icon>
                {{ nonReactiveRate }}% of total
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Activity and Security -->
    <v-row class="charts-row">
      <v-col cols="12" lg="8">
        <v-card elevation="2">
          <v-card-title class="d-flex align-center">
            <v-icon class="me-2">mdi-chart-timeline</v-icon>
            Recent System Activity
            <v-spacer></v-spacer>
            <v-btn 
              variant="text" 
              size="small" 
              @click="$router.push('/admin/audit-security')"
            >
              View All Logs
            </v-btn>
          </v-card-title>
          <v-card-text>
            <div v-if="recentLogs.length > 0">
              <v-timeline density="compact" align="start">
                <v-timeline-item
                  v-for="(log, index) in recentLogs"
                  :key="index"
                  :dot-color="getLogColor(log.action_type)"
                  size="small"
                >
                  <div class="d-flex justify-space-between align-start">
                    <div>
                      <strong class="text-body-2">{{ formatActionType(log.action_type) }}</strong>
                      <div class="text-caption text-medium-emphasis mt-1">
                        {{ log.description }}
                      </div>
                      <div class="text-caption mt-1" v-if="log.patient_id">
                        Patient: {{ log.patient_id }}
                      </div>
                    </div>
                    <div class="text-caption text-medium-emphasis text-right">
                      {{ formatTimeAgo(log.timestamp) }}
                    </div>
                  </div>
                </v-timeline-item>
              </v-timeline>
            </div>
            <div v-else class="text-center py-8 text-medium-emphasis">
              <v-icon size="64" color="grey-lighten-2">mdi-clock-outline</v-icon>
              <div>No recent activity</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" lg="4">
        <v-card elevation="2">
          <v-card-title>
            <v-icon class="me-2">mdi-shield-account</v-icon>
            Security Status
          </v-card-title>
          <v-card-text>
            <div class="security-status">
              <div class="status-item">
                <v-icon color="success" class="me-2">mdi-check-circle</v-icon>
                <div>
                  <div class="status-label">Authentication</div>
                  <div class="status-value">JWT Active</div>
                </div>
              </div>
              
              <div class="status-item">
                <v-icon color="success" class="me-2">mdi-check-circle</v-icon>
                <div>
                  <div class="status-label">Audit Logging</div>
                  <div class="status-value">Active</div>
                </div>
              </div>

              <v-divider class="my-3"></v-divider>

              <div class="system-info">
                <div class="info-item">
                  <span class="info-label">Active Sessions:</span>
                  <span class="info-value">1</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Last Login:</span>
                  <span class="info-value">{{ formatTimeAgo(authStore.user?.last_login) }}</span>
                </div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Quick Actions -->
    <v-row class="actions-row">
      <v-col cols="12">
        <v-card elevation="2">
          <v-card-title>
            <v-icon class="me-2">mdi-rocket-launch</v-icon>
            Quick Actions
          </v-card-title>
          <v-card-text>
            <v-row dense>
              <v-col cols="6" sm="4" md="2" v-for="action in quickActions" :key="action.title">
                <v-card
                  variant="outlined"
                  class="quick-action-card"
                  @click="handleQuickAction(action)"
                >
                  <v-card-text class="text-center pa-4">
                    <v-icon :size="36" :color="action.color">{{ action.icon }}</v-icon>
                    <div class="text-body-2 font-weight-medium mt-2">{{ action.title }}</div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { patientsApi, auditApi } from '@/api' // Import specific APIs

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const stats = ref({
  patients: {
    total: 0,
    consented: 0,
    reactive: 0,
    non_reactive: 0,
    daily_enrollments: 0
  }
})
const recentLogs = ref([])
const lastUpdated = ref('')
const refreshInterval = ref(null)

// Computed properties
const consentRate = computed(() => {
  const total = stats.value.patients?.total || 1
  const consented = stats.value.patients?.consented || 0
  return Math.round((consented / total) * 100)
})

const reactiveRate = computed(() => {
  const total = stats.value.patients?.total || 1
  const reactive = stats.value.patients?.reactive || 0
  return Math.round((reactive / total) * 100)
})

const nonReactiveRate = computed(() => {
  const total = stats.value.patients?.total || 1
  const nonReactive = stats.value.patients?.non_reactive || 0
  return Math.round((nonReactive / total) * 100)
})

const systemAlerts = computed(() => {
  const alerts = []
  
  // Example: Alert if no patients enrolled
  if (stats.value.patients?.total === 0) {
    alerts.push({
      type: 'info',
      message: 'No patients enrolled yet. Start by enrolling your first patient.'
    })
  }
  
  return alerts
})

const quickActions = computed(() => [
  {
    title: 'New Enrollment',
    icon: 'mdi-account-plus',
    color: 'primary',
    route: '/admin/patients'
  },
  {
    title: 'Audit Logs',
    icon: 'mdi-shield-account',
    color: 'error',
    route: '/admin/audit-security'
  },
  {
    title: 'All Patients',
    icon: 'mdi-account-group',
    color: 'teal',
    route: '/admin/patients'
  }
])

// Methods
async function refreshData() {
  loading.value = true
  try {
    // Get patient statistics
    const patientsResponse = await patientsApi.getStats()
    stats.value.patients = patientsResponse.data
    
    // Try to get recent logs separately
    try {
      const logsResponse = await auditApi.getLogs({ limit: 4 })
      recentLogs.value = logsResponse.data.logs || []
    } catch (logError) {
      console.warn('Could not fetch recent logs:', logError)
      recentLogs.value = []
    }
    
    lastUpdated.value = new Date().toLocaleTimeString()
    
    console.log('Dashboard data refreshed:', {
      stats: stats.value,
      recentLogs: recentLogs.value.length
    })
  } catch (error) {
    console.error('Error refreshing dashboard data:', error)
    // Set fallback data
    stats.value = {
      patients: { total: 0, consented: 0, reactive: 0, non_reactive: 0, daily_enrollments: 0 }
    }
    recentLogs.value = []
  } finally {
    loading.value = false
  }
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return 'Never'
  
  const now = new Date()
  const time = new Date(timestamp)
  const diffMs = now - time
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return time.toLocaleDateString()
}

function formatActionType(actionType) {
  return actionType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

function getLogColor(actionType) {
  const colors = {
    'LOGIN_SUCCESS': 'success',
    'LOGIN_FAILED': 'error',
    'LOGOUT': 'warning',
    'PATIENT_CREATED': 'primary',
    'PATIENT_UPDATED': 'info',
    'PATIENT_DELETED': 'error'
  }
  return colors[actionType] || 'grey'
}

function handleQuickAction(action) {
  if (action.route) {
    router.push(action.route)
  }
}

// Lifecycle
onMounted(async () => {
  await refreshData()
  
  // Refresh data every 5 minutes
  refreshInterval.value = setInterval(refreshData, 300000)
})

onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
  }
})
</script>

<style scoped>
.dashboard-page {
  background: var(--color-background);
  min-height: 100vh;
  padding: var(--spacing-xl);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-xl);
}

.last-updated {
  margin-top: var(--spacing-xs);
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.alert-item {
  display: flex;
  align-items: center;
  padding: var(--spacing-xs) 0;
  color: var(--color-text-primary);
}

.metrics-row {
  margin-bottom: var(--spacing-md);
}

.metric-card {
  transition: transform var(--transition-normal);
  height: 100%;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--color-primary-light);
}

.metric-value {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1;
  color: var(--color-text-primary);
}

.metric-label {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xs);
}

.metric-change {
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-weight: 500;
}

.metric-change.positive {
  color: var(--color-success);
}

.metric-change.warning {
  color: var(--color-warning);
}

.metric-change.info {
  color: var(--color-info);
}

.metric-change.neutral {
  color: var(--color-text-disabled);
}

.charts-row,
.actions-row {
  margin-bottom: var(--spacing-xl);
}

.chart-container {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--color-surface);
}

.security-status {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  padding: var(--spacing-md);
}

.security-status .status-item {
  display: flex;
  align-items: center;
  padding: var(--spacing-sm) 0;
}

.security-status .status-item:not(:last-child) {
  border-bottom: 1px solid var(--color-border-light);
}

.security-status .status-label {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  flex: 1;
}

.security-status .status-value {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-primary);
}

.security-status .status-value.verified {
  color: var(--color-success);
}

.security-status .status-value.pending {
  color: var(--color-warning);
}

.security-status .status-value.error {
  color: var(--color-error);
}

.system-info {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  padding: var(--spacing-md);
}

.system-info .info-item {
  display: flex;
  justify-content: space-between;
  padding: var(--spacing-xs) 0;
}

.system-info .info-item .info-label {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.system-info .info-item .info-value {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-primary);
}

.quick-action-card {
  cursor: pointer;
  transition: all var(--transition-normal);
  height: 100%;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  padding: var(--spacing-md);
}

.quick-action-card:hover {
  border-color: var(--color-primary);
  background-color: var(--color-surface-dark);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.quick-action-card:active {
  transform: translateY(0);
}

.quick-action-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--spacing-sm);
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  color: var(--color-text-on-primary);
}

.quick-action-title {
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-xs);
}

.quick-action-description {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  line-height: 1.4;
}

/* Vuetify component overrides */
::v-deep(.v-card) {
  border-radius: var(--radius-lg) !important;
}

::v-deep(.v-card-title) {
  color: var(--color-text-primary) !important;
  font-weight: 600 !important;
}

::v-deep(.v-card-subtitle) {
  color: var(--color-text-secondary) !important;
}

::v-deep(.v-alert) {
  border-radius: var(--radius-md) !important;
  border-left-width: 4px !important;
}

::v-deep(.v-alert--warning) {
  border-left-color: var(--color-warning) !important;
}

::v-deep(.v-alert--info) {
  border-left-color: var(--color-info) !important;
}

::v-deep(.v-alert--success) {
  border-left-color: var(--color-success) !important;
}

::v-deep(.v-alert--error) {
  border-left-color: var(--color-error) !important;
}

@media (max-width: 960px) {
  .dashboard-page {
    padding: var(--spacing-md);
  }
  
  .page-header {
    flex-direction: column;
    gap: var(--spacing-md);
  }
  
  .metric-value {
    font-size: 1.5rem;
  }
  
  .quick-action-card {
    padding: var(--spacing-sm);
  }
  
  .quick-action-icon {
    width: 40px;
    height: 40px;
  }
}

@media (max-width: 600px) {
  .dashboard-page {
    padding: var(--spacing-sm);
  }
  
  .metric-value {
    font-size: 1.25rem;
  }
  
  .page-header h1 {
    font-size: 1.5rem;
  }
}

/* Animation for cards */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.metric-card,
.chart-container,
.security-status,
.system-info,
.quick-action-card {
  animation: fadeIn var(--transition-normal) ease-out;
  animation-fill-mode: both;
}

.metric-card:nth-child(1) { animation-delay: 0.1s; }
.metric-card:nth-child(2) { animation-delay: 0.2s; }
.metric-card:nth-child(3) { animation-delay: 0.3s; }
.metric-card:nth-child(4) { animation-delay: 0.4s; }

.chart-container { animation-delay: 0.5s; }
.security-status { animation-delay: 0.6s; }
.system-info { animation-delay: 0.7s; }
.quick-action-card:nth-child(1) { animation-delay: 0.8s; }
.quick-action-card:nth-child(2) { animation-delay: 0.9s; }
.quick-action-card:nth-child(3) { animation-delay: 1s; }

/* Custom scrollbar for dashboard */
.dashboard-page::-webkit-scrollbar {
  width: 8px;
}

.dashboard-page::-webkit-scrollbar-track {
  background: var(--color-surface-dark);
  border-radius: var(--radius-full);
}

.dashboard-page::-webkit-scrollbar-thumb {
  background: var(--color-primary);
  border-radius: var(--radius-full);
}

.dashboard-page::-webkit-scrollbar-thumb:hover {
  background: var(--color-primary-dark);
}

/* Loading state */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(var(--color-surface-rgb, 255, 255, 255), 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: inherit;
  z-index: 10;
}
</style>