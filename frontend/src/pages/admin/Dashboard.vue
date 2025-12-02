<template>
  <v-container fluid class="dashboard-page">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="text-h4 font-weight-bold mb-2">Dashboard Overview</h1>
        <p class="text-body-1 text-medium-emphasis">
          Welcome back, {{ authStore.user?.username }}! 
          Here's what's happening with your HIV DLT system.
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
            <v-avatar color="info" class="me-4" size="56">
              <v-icon color="white">mdi-shield-check</v-icon>
            </v-avatar>
            <div>
              <div class="metric-value">{{ stats.dlt?.verified_hashes || 0 }}</div>
              <div class="metric-label">DLT Verified</div>
              <div class="metric-change positive">
                <v-icon small>mdi-shield-check</v-icon>
                {{ dltVerificationRate }}% verified
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Additional Stats -->
    <v-row class="metrics-row">
      <v-col cols="12" sm="6" md="3">
        <v-card class="metric-card" elevation="2">
          <v-card-text class="d-flex align-center">
            <v-avatar color="deep-purple" class="me-4" size="56">
              <v-icon color="white">mdi-fingerprint</v-icon>
            </v-avatar>
            <div>
              <div class="metric-value">{{ stats.biometric?.active_biometric_links || 0 }}</div>
              <div class="metric-label">Biometric Links</div>
              <div class="metric-change info">
                <v-icon small>mdi-link</v-icon>
                Active associations
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="metric-card" elevation="2">
          <v-card-text class="d-flex align-center">
            <v-avatar color="green" class="me-4" size="56">
              <v-icon color="white">mdi-shield-lock</v-icon>
            </v-avatar>
            <div>
              <div class="metric-value">{{ stats.dlt?.total_hashes || 0 }}</div>
              <div class="metric-label">Total DLT Hashes</div>
              <div class="metric-change info">
                <v-icon small>mdi-database</v-icon>
                On blockchain
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

      <v-col cols="12" sm="6" md="3">
        <v-card class="metric-card" elevation="2">
          <v-card-text class="d-flex align-center">
            <v-avatar color="orange" class="me-4" size="56">
              <v-icon color="white">mdi-clock-outline</v-icon>
            </v-avatar>
            <div>
              <div class="metric-value">{{ formatUptime(stats.system_uptime) }}</div>
              <div class="metric-label">System Uptime</div>
              <div class="metric-change neutral">
                <v-icon small>mdi-clock</v-icon>
                Running smoothly
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
                  <div class="status-label">DLT Service</div>
                  <div class="status-value">{{ dltVerificationRate }}% Verified</div>
                </div>
              </div>
              
              <div class="status-item">
                <v-icon color="success" class="me-2">mdi-check-circle</v-icon>
                <div>
                  <div class="status-label">Audit Logging</div>
                  <div class="status-value">Active</div>
                </div>
              </div>
              
              <div class="status-item">
                <v-icon :color="biometricStatus.color" class="me-2">{{ biometricStatus.icon }}</v-icon>
                <div>
                  <div class="status-label">Biometric Service</div>
                  <div class="status-value">{{ biometricStatus.text }}</div>
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
import { dashboardApi, auditApi } from '@/api'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const stats = ref({})
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

const dltVerificationRate = computed(() => {
  const total = stats.value.dlt?.total_hashes || 1
  const verified = stats.value.dlt?.verified_hashes || 0
  return Math.round((verified / total) * 100)
})

const systemAlerts = computed(() => {
  const alerts = []
  
  // Check for unverified DLT records
  if (stats.value.dlt && stats.value.dlt.total_hashes > stats.value.dlt.verified_hashes) {
    const unverified = stats.value.dlt.total_hashes - stats.value.dlt.verified_hashes
    alerts.push({
      type: 'warning',
      message: `${unverified} DLT records need verification`
    })
  }
  
  return alerts
})

const biometricStatus = computed(() => {
  const activeLinks = stats.value.biometric?.active_biometric_links || 0
  if (activeLinks > 0) {
    return {
      color: 'success',
      icon: 'mdi-check-circle',
      text: `${activeLinks} Active`
    }
  }
  return {
    color: 'warning',
    icon: 'mdi-alert',
    text: 'No active links'
  }
})

const quickActions = computed(() => [
  {
    title: 'New Enrollment',
    icon: 'mdi-account-plus',
    color: 'primary',
    route: '/admin/enroll'
  },
  {
    title: 'DLT Verification',
    icon: 'mdi-shield-check',
    color: 'success',
    route: '/admin/dlt-verification'
  },
  {
    title: 'Audit Logs',
    icon: 'mdi-shield-account',
    color: 'error',
    route: '/admin/audit-security'
  },
  {
    title: 'Biometric',
    icon: 'mdi-fingerprint',
    color: 'deep-purple',
    route: '/admin/biometric'
  },
  {
    title: 'Reports',
    icon: 'mdi-chart-box',
    color: 'warning',
    route: '/admin/reports'
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
    const response = await dashboardApi.getStats()
    stats.value = response.data

    // Debug: check biometric data structure
    console.log('Biometric data structure:', {
      raw: response.data.biometric,
      activeLinks: response.data.biometric?.active_biometric_links,
      active: response.data.biometric?.active
    })
    
    // Try to get recent logs separately
    try {
      const logsResponse = await auditApi.getLogs({ limit: 4 })
      recentLogs.value = logsResponse.data.logs
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
      patients: { total: 0, consented: 0, reactive: 0, non_reactive: 0, daily_enrollments: 0 },
      audit: { last_30_days: [], last_24_hours: [] },
      dlt: { total_hashes: 0, verified_hashes: 0 },
      biometric: { active_biometric_links: 0 },
      system_uptime: 0
    }
    recentLogs.value = []
  } finally {
    loading.value = false
  }
}

function formatUptime(seconds) {
  if (!seconds) return '0s'
  
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
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
    'DLT_VERIFIED': 'success'
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

<style scoped lang="scss">
.dashboard-page {
  background: #f8f9fa;
  min-height: 100vh;
  padding: 2rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
}

.last-updated {
  margin-top: 0.5rem;
}

.alert-item {
  display: flex;
  align-items: center;
  padding: 0.25rem 0;
}

.metrics-row {
  margin-bottom: 1rem;
}

.metric-card {
  transition: transform 0.2s ease;
  height: 100%;
  
  &:hover {
    transform: translateY(-2px);
  }
}

.metric-value {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1;
}

.metric-label {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.6);
  margin-bottom: 0.25rem;
}

.metric-change {
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;

  &.positive {
    color: #4caf50;
  }
  
  &.warning {
    color: #ff9800;
  }
  
  &.info {
    color: #2196f3;
  }
  
  &.neutral {
    color: #9e9e9e;
  }
}

.charts-row,
.actions-row {
  margin-bottom: 2rem;
}

.security-status {
  .status-item {
    display: flex;
    align-items: center;
    padding: 0.75rem 0;
    
    &:not(:last-child) {
      border-bottom: 1px solid #e0e0e0;
    }
  }
  
  .status-label {
    font-size: 0.875rem;
    color: rgba(0, 0, 0, 0.6);
  }
  
  .status-value {
    font-size: 0.875rem;
    font-weight: 500;
    color: rgba(0, 0, 0, 0.87);
  }
}

.system-info {
  .info-item {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    
    .info-label {
      font-size: 0.875rem;
      color: rgba(0, 0, 0, 0.6);
    }
    
    .info-value {
      font-size: 0.875rem;
      font-weight: 500;
      color: rgba(0, 0, 0, 0.87);
    }
  }
}

.quick-action-card {
  cursor: pointer;
  transition: all 0.2s ease;
  height: 100%;
  
  &:hover {
    border-color: #1976d2;
    background-color: #f5f5f5;
    transform: translateY(-2px);
  }
}

@media (max-width: 960px) {
  .dashboard-page {
    padding: 1rem;
  }
  
  .page-header {
    flex-direction: column;
    gap: 1rem;
  }
}
</style>