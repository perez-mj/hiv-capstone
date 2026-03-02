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
/* Color Palette Refinement */
.dashboard-page {
  /* Light Green/Mist Background */
  background: #f0f4f1; 
  min-height: 100vh;
  padding: 24px;
  color: #1b2e1b; /* Dark Forest text */
}

/* Page Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
}

.page-header h1 {
  color: #0d2111; /* Deep Forest Green */
}

/* Cards Design - Dark Forest Accents */
.metric-card {
  transition: all 0.3s ease;
  height: 100%;
  border: 1px solid #cddbc9 !important;
  background: #ffffff;
  border-radius: 16px !important;
}

.metric-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(13, 33, 17, 0.1);
  border-color: #2d5a27 !important; /* Forest Green Border */
}

.metric-value {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1;
  color: #1b2e1b;
}

.metric-label {
  font-size: 0.875rem;
  color: #4a634a; /* Muted Leaf Green */
  margin-bottom: 4px;
}

/* Status Colors */
.metric-change.positive { color: #2d5a27; }
.metric-change.warning { color: #8a6d3b; }
.metric-change.info { color: #2c4a70; }

/* Timeline & Containers */
::v-deep(.v-card) {
  border-radius: 16px !important;
  border: 1px solid #e0e7e0 !important;
  background: #ffffff !important;
}

::v-deep(.v-card-title) {
  background: #1b2e1b; /* Solid Dark Forest Header */
  color: #e8f5e9 !important; /* Light Mint Text */
  font-weight: 600 !important;
  padding: 12px 20px !important;
  display: flex;
  align-items: center;
}

/* ITO ANG BINAGO: View All Logs Button Text to White */
::v-deep(.v-card-title .v-btn) {
  color: #ffffff !important;
  text-transform: none;
  font-weight: 500;
  opacity: 0.9;
}

::v-deep(.v-card-title .v-btn:hover) {
  opacity: 1;
  background-color: rgba(255, 255, 255, 0.1);
}

/* Quick Action Cards */
.quick-action-card {
  cursor: pointer;
  transition: all 0.2s ease;
  height: 100%;
  border: 2px solid #e0e7e0 !important;
  background: #ffffff;
}

.quick-action-card:hover {
  border-color: #2d5a27 !important;
  background-color: #f1f8f1 !important;
  transform: scale(1.02);
}

/* Security Status Box */
.security-status, .system-info {
  border: 1px solid #cddbc9;
  background: #f9fbf9;
  border-radius: 12px;
  padding: 16px;
}

/* Alerts */
::v-deep(.v-alert) {
  border-radius: 12px !important;
  background-color: #fdfae9 !important;
  color: #443a13 !important;
}

/* Custom Scrollbar - Forest Theme */
.dashboard-page::-webkit-scrollbar {
  width: 8px;
}

.dashboard-page::-webkit-scrollbar-track {
  background: #f0f4f1;
}

.dashboard-page::-webkit-scrollbar-thumb {
  background: #2d5a27;
  border-radius: 10px;
}

/* Dark Forest Icon Accents */
::v-deep(.v-avatar.bg-primary) { background-color: #1b2e1b !important; }
::v-deep(.v-avatar.bg-success) { background-color: #2d5a27 !important; }
::v-deep(.v-avatar.bg-warning) { background-color: #556b2f !important; }
::v-deep(.v-avatar.bg-teal) { background-color: #004d40 !important; }

/* Timeline Dot Colors */
::v-deep(.v-timeline-divider__dot) {
  background-color: #ffffff !important;
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(15px); }
  to { opacity: 1; transform: translateY(0); }
}

.metric-card, .v-card, .quick-action-card {
  animation: fadeIn 0.5s ease-out both;
}
</style>