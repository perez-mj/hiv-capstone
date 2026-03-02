<!-- frontend/src/pages/admin/AdminDashboard.vue -->
<template>
  <v-container fluid class="pa-4 pa-md-6">
    <!-- Welcome Header -->
    <v-row class="mb-6 align-center">
      <v-col cols="12" md="8">
        <h1 class="text-h4 font-weight-medium mb-1">
          Welcome back, {{ adminName || 'Head Nurse' }}
        </h1>
        <p class="text-subtitle-1 text-medium-emphasis">
          Here's what's happening at {{ currentFacility || 'OMPH HIV Clinic' }} today
        </p>
      </v-col>
      <v-col cols="12" md="4" class="text-md-right">
        <v-chip
          :color="'primary'"
          variant="flat"
          size="large"
          prepend-icon="mdi-calendar"
          class="mr-2"
        >
          {{ currentDate }}
        </v-chip>
        <v-chip
          :color="'secondary'"
          variant="flat"
          size="large"
          prepend-icon="mdi-clock-outline"
        >
          {{ currentTime }}
        </v-chip>
      </v-col>
    </v-row>

    <!-- Loading State -->
    <v-row v-if="loading">
      <v-col v-for="n in 6" :key="n" cols="12" md="4" lg="3">
        <v-skeleton-loader type="card-avatar, article, actions" class="rounded-lg"></v-skeleton-loader>
      </v-col>
    </v-row>

    <!-- Error State -->
    <v-row v-else-if="error">
      <v-col cols="12">
        <v-alert
          :color="'error'"
          variant="tonal"
          icon="mdi-alert-circle"
          class="mb-4"
        >
          {{ error }}
          <template v-slot:append>
            <v-btn :color="'error'" variant="text" @click="fetchDashboardData">
              <v-icon left>mdi-refresh</v-icon> Retry
            </v-btn>
          </template>
        </v-alert>
      </v-col>
    </v-row>

    <template v-else>
      <!-- Key Metrics Cards -->
      <v-row class="mb-6">
        <v-col cols="12" sm="6" md="3" v-for="metric in keyMetrics" :key="metric.title">
          <v-card
            :color="metric.color"
            variant="flat"
            class="pa-4 h-100"
            :style="{ borderLeft: `4px solid var(--color-${metric.color})` }"
          >
            <div class="d-flex align-center">
              <v-avatar
                :color="metric.color"
                variant="tonal"
                size="48"
                class="mr-3"
              >
                <v-icon :color="metric.color" size="24">{{ metric.icon }}</v-icon>
              </v-avatar>
              <div>
                <span class="text-caption text-medium-emphasis">{{ metric.title }}</span>
                <div class="text-h4 font-weight-bold">{{ metric.value }}</div>
                <div class="text-caption" :class="metric.trendClass">
                  <v-icon size="14" :icon="metric.trendIcon"></v-icon>
                  {{ metric.trend }} from yesterday
                </div>
              </div>
            </div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Queue Status and Today's Appointments -->
      <v-row class="mb-6">
        <!-- Queue Status Card -->
        <v-col cols="12" lg="4">
          <v-card class="h-100">
            <v-card-item>
              <template v-slot:prepend>
                <v-avatar :color="'primary'" variant="tonal" size="40">
                  <v-icon :color="'primary'">mdi-format-list-group</v-icon>
                </v-avatar>
              </template>
              <v-card-title class="text-h6">Current Queue Status</v-card-title>
              <v-card-subtitle>Real-time queue updates</v-card-subtitle>
            </v-card-item>

            <v-card-text>
              <div class="d-flex justify-space-between mb-4">
                <div class="text-center">
                  <div class="text-h4 font-weight-bold">{{ queueStats.total_in_queue }}</div>
                  <div class="text-caption">Total in Queue</div>
                </div>
                <div class="text-center">
                  <div class="text-h4 font-weight-bold text-warning">{{ queueStats.waiting }}</div>
                  <div class="text-caption">Waiting</div>
                </div>
                <div class="text-center">
                  <div class="text-h4 font-weight-bold text-info">{{ queueStats.called }}</div>
                  <div class="text-caption">Called</div>
                </div>
                <div class="text-center">
                  <div class="text-h4 font-weight-bold text-success">{{ queueStats.serving }}</div>
                  <div class="text-caption">Serving</div>
                </div>
              </div>

              <v-divider class="mb-4"></v-divider>

              <!-- Queue List -->
              <div class="queue-list" style="max-height: 300px; overflow-y: auto">
                <v-list lines="two" density="compact">
                  <v-list-item
                    v-for="item in currentQueue"
                    :key="item.id"
                    :class="{
                      'bg-warning-light': item.status === 'WAITING',
                      'bg-info-light': item.status === 'CALLED',
                      'bg-success-light': item.status === 'SERVING'
                    }"
                    class="mb-2 rounded-lg"
                  >
                    <template v-slot:prepend>
                      <v-avatar size="36" :color="getQueueStatusColor(item.status)" variant="tonal">
                        <span class="font-weight-bold">{{ item.queue_number }}</span>
                      </v-avatar>
                    </template>
                    
                    <v-list-item-title class="font-weight-medium">
                      {{ item.patient_name }}
                    </v-list-item-title>
                    
                    <v-list-item-subtitle>
                      <span>{{ item.appointment_type }}</span>
                      <span class="mx-1">•</span>
                      <span v-if="item.waiting_minutes > 0">
                        Waiting: {{ formatWaitingTime(item.waiting_minutes) }}
                      </span>
                      <span v-else>Just added</span>
                    </v-list-item-subtitle>

                    <template v-slot:append>
                      <v-chip
                        :color="getQueueStatusColor(item.status)"
                        size="x-small"
                        variant="flat"
                      >
                        {{ item.status }}
                      </v-chip>
                    </template>
                  </v-list-item>

                  <v-list-item v-if="currentQueue.length === 0">
                    <v-list-item-title class="text-center text-medium-emphasis py-4">
                      <v-icon size="48" color="grey-lighten-1">mdi-format-list-group</v-icon>
                      <div class="mt-2">No patients in queue</div>
                    </v-list-item-title>
                  </v-list-item>
                </v-list>
              </div>
            </v-card-text>

            <v-card-actions>
              <v-btn
                :color="'primary'"
                variant="text"
                block
                @click="viewFullQueue"
              >
                View Full Queue
                <v-icon end>mdi-arrow-right</v-icon>
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>

        <!-- Today's Appointments Overview -->
        <v-col cols="12" lg="8">
          <v-card class="h-100">
            <v-card-item>
              <template v-slot:prepend>
                <v-avatar :color="'secondary'" variant="tonal" size="40">
                  <v-icon :color="'secondary'">mdi-calendar-check</v-icon>
                </v-avatar>
              </template>
              <v-card-title class="text-h6">Today's Appointments</v-card-title>
              <v-card-subtitle>{{ formatDate(new Date()) }}</v-card-subtitle>
              
              <template v-slot:append>
                <v-btn
                  :color="'primary'"
                  variant="text"
                  size="small"
                  @click="viewAllAppointments"
                >
                  View All
                </v-btn>
              </template>
            </v-card-item>

            <v-card-text>
              <!-- Appointment Status Distribution -->
              <v-row class="mb-4">
                <v-col cols="4" v-for="stat in appointmentStats" :key="stat.label">
                  <div class="text-center">
                    <div
                      class="text-h5 font-weight-bold"
                      :style="{ color: `var(--color-${stat.color})` }"
                    >
                      {{ stat.value }}
                    </div>
                    <div class="text-caption">{{ stat.label }}</div>
                    <v-progress-linear
                      :model-value="stat.percentage"
                      :color="stat.color"
                      height="4"
                      rounded
                      class="mt-1"
                    ></v-progress-linear>
                  </div>
                </v-col>
              </v-row>

              <!-- Appointment List -->
              <v-data-table
                :headers="appointmentHeaders"
                :items="recentAppointments"
                :loading="loading"
                items-per-page="5"
                class="elevation-0"
              >
                <template v-slot:item.status="{ item }">
                  <v-chip
                    :color="getAppointmentStatusColor(item.status)"
                    size="x-small"
                    variant="flat"
                  >
                    {{ item.status }}
                  </v-chip>
                </template>

                <template v-slot:item.scheduled_at="{ item }">
                  {{ formatTime(item.scheduled_at) }}
                </template>

                <template v-slot:item.actions="{ item }">
                  <v-btn
                    :color="'primary'"
                    variant="text"
                    size="x-small"
                    icon
                    @click="viewAppointment(item)"
                  >
                    <v-icon size="small">mdi-eye</v-icon>
                  </v-btn>
                </template>

                <template v-slot:no-data>
                  <div class="text-center pa-4">
                    <v-icon size="48" color="grey-lighten-1">mdi-calendar-blank</v-icon>
                    <div class="mt-2">No appointments scheduled for today</div>
                  </div>
                </template>
              </v-data-table>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Monthly Statistics and Patient Demographics -->
      <v-row class="mb-6">
        <!-- Monthly Statistics Chart -->
        <v-col cols="12" lg="8">
          <v-card>
            <v-card-item>
              <template v-slot:prepend>
                <v-avatar :color="'accent'" variant="tonal" size="40">
                  <v-icon :color="'accent'">mdi-chart-line</v-icon>
                </v-avatar>
              </template>
              <v-card-title class="text-h6">Monthly Statistics</v-card-title>
              <v-card-subtitle>Last 6 months appointment trends</v-card-subtitle>
              
              <template v-slot:append>
                <v-btn-toggle v-model="chartType" density="compact" divided>
                  <v-btn value="line" size="small">
                    <v-icon>mdi-chart-line</v-icon>
                  </v-btn>
                  <v-btn value="bar" size="small">
                    <v-icon>mdi-chart-bar</v-icon>
                  </v-btn>
                </v-btn-toggle>
              </template>
            </v-card-item>

            <v-card-text>
              <div style="height: 300px">
                <canvas ref="monthlyChart"></canvas>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Patient Demographics -->
        <v-col cols="12" lg="4">
          <v-card class="h-100">
            <v-card-item>
              <template v-slot:prepend>
                <v-avatar :color="'info'" variant="tonal" size="40">
                  <v-icon :color="'info'">mdi-account-group</v-icon>
                </v-avatar>
              </template>
              <v-card-title class="text-h6">Patient Demographics</v-card-title>
              <v-card-subtitle>HIV Status Distribution</v-card-subtitle>
            </v-card-item>

            <v-card-text>
              <!-- HIV Status Pie Chart -->
              <div style="height: 200px">
                <canvas ref="hivChart"></canvas>
              </div>

              <v-divider class="my-4"></v-divider>

              <!-- Patient Status List -->
              <v-list lines="one" density="compact">
                <v-list-item
                  v-for="status in patientStatusList"
                  :key="status.label"
                >
                  <template v-slot:prepend>
                    <v-avatar :color="status.color" size="12" class="mr-2"></v-avatar>
                  </template>
                  
                  <v-list-item-title>{{ status.label }}</v-list-item-title>
                  
                  <template v-slot:append>
                    <div class="d-flex align-center">
                      <span class="font-weight-bold mr-2">{{ status.count }}</span>
                      <span class="text-caption text-medium-emphasis">
                        ({{ status.percentage }}%)
                      </span>
                    </div>
                  </template>
                </v-list-item>

                <v-list-item>
                  <template v-slot:prepend>
                    <v-avatar color="primary" size="12" class="mr-2"></v-avatar>
                  </template>
                  
                  <v-list-item-title class="font-weight-bold">Total Patients</v-list-item-title>
                  
                  <template v-slot:append>
                    <span class="font-weight-bold">{{ totalPatients }}</span>
                  </template>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Quick Actions and Staff Overview -->
      <v-row>
        <!-- Quick Actions -->
        <v-col cols="12" lg="4">
          <v-card>
            <v-card-item>
              <template v-slot:prepend>
                <v-avatar :color="'success'" variant="tonal" size="40">
                  <v-icon :color="'success'">mdi-lightning-bolt</v-icon>
                </v-avatar>
              </template>
              <v-card-title class="text-h6">Quick Actions</v-card-title>
              <v-card-subtitle>Common administrative tasks</v-card-subtitle>
            </v-card-item>

            <v-card-text>
              <v-row>
                <v-col cols="6" v-for="action in quickActions" :key="action.title">
                  <v-card
                    :color="action.color"
                    variant="tonal"
                    class="pa-3 text-center cursor-pointer"
                    @click="handleQuickAction(action)"
                  >
                    <v-icon size="32" :color="action.color" class="mb-2">
                      {{ action.icon }}
                    </v-icon>
                    <div class="text-caption font-weight-medium">{{ action.title }}</div>
                  </v-card>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Staff Overview -->
        <v-col cols="12" lg="4">
          <v-card>
            <v-card-item>
              <template v-slot:prepend>
                <v-avatar :color="'warning'" variant="tonal" size="40">
                  <v-icon :color="'warning'">mdi-account-tie</v-icon>
                </v-avatar>
              </template>
              <v-card-title class="text-h6">Staff Overview</v-card-title>
              <v-card-subtitle>Currently active staff</v-card-subtitle>
            </v-card-item>

            <v-card-text>
              <div class="d-flex align-center mb-4">
                <div class="text-h2 font-weight-bold">{{ totalStaff }}</div>
                <div class="ml-3">
                  <div class="text-caption">Total Staff</div>
                  <div class="d-flex align-center">
                    <v-icon size="small" color="success" class="mr-1">mdi-circle</v-icon>
                    <span class="text-caption">8 Active now</span>
                  </div>
                </div>
              </div>

              <v-progress-linear
                :color="'primary'"
                height="8"
                :model-value="staffAvailability"
                rounded
                class="mb-4"
              ></v-progress-linear>

            </v-card-text>

            <v-card-actions>
              <v-btn
                :color="'primary'"
                variant="text"
                block
                @click="manageStaff"
              >
                Manage Staff
                <v-icon end>mdi-arrow-right</v-icon>
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>

        <!-- Recent System Activity -->
        <v-col cols="12" lg="4">
          <v-card>
            <v-card-item>
              <template v-slot:prepend>
                <v-avatar :color="'error'" variant="tonal" size="40">
                  <v-icon :color="'error'">mdi-history</v-icon>
                </v-avatar>
              </template>
              <v-card-title class="text-h6">Recent Activity</v-card-title>
              <v-card-subtitle>System audit log</v-card-subtitle>
            </v-card-item>

            <v-card-text>
              <v-timeline density="compact" align="start" side="end">
                <v-timeline-item
                  v-for="activity in recentActivities"
                  :key="activity.id"
                  :dot-color="activity.color"
                  size="x-small"
                >
                  <div class="d-flex flex-column">
                    <div class="font-weight-medium">{{ activity.action }}</div>
                    <div class="text-caption text-medium-emphasis">
                      {{ activity.user }} • {{ formatRelativeTime(activity.time) }}
                    </div>
                  </div>
                </v-timeline-item>
              </v-timeline>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <!-- Refresh Button -->
    <v-btn
      :color="'primary'"
      variant="flat"
      fab
      fixed
      bottom
      right
      class="mb-4 mr-4"
      @click="fetchDashboardData"
      :loading="loading"
    >
      <v-icon>mdi-refresh</v-icon>
    </v-btn>
  </v-container>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'
import { format, formatDistanceToNow } from 'date-fns'
import Chart from 'chart.js/auto'
import { dashboardApi } from '@/api'
import { useAuthStore } from '@/stores/auth'

// Router and stores
const router = useRouter()
const { mobile } = useDisplay()
const authStore = useAuthStore()

// Refs
const loading = ref(true)
const error = ref(null)
const adminName = ref('')
const currentFacility = ref('OMPH HIV Clinic')
const currentTime = ref('')
const currentDate = ref('')
const dashboardData = ref(null)
const chartType = ref('line')
const monthlyChart = ref(null)
const hivChart = ref(null)
let monthlyChartInstance = null
let hivChartInstance = null

// Computed properties from dashboard data
const keyMetrics = computed(() => {
  if (!dashboardData.value) return []
  
  const overview = dashboardData.value.data.overview
  const todayAppointments = overview.today_appointments || {}
  
  return [
    {
      title: 'Total Patients',
      value: overview.total_patients || 0,
      icon: 'mdi-account-group',
      color: 'primary',
      trend: '+12',
      trendIcon: 'mdi-arrow-up',
      trendClass: 'text-success'
    },
    {
      title: 'Today\'s Appointments',
      value: todayAppointments.count || 0,
      icon: 'mdi-calendar-check',
      color: 'secondary',
      trend: todayAppointments.completed ? `+${todayAppointments.completed}` : '0',
      trendIcon: todayAppointments.completed > 0 ? 'mdi-arrow-up' : 'mdi-minus',
      trendClass: todayAppointments.completed > 0 ? 'text-success' : 'text-medium-emphasis'
    },
    {
      title: 'In Queue',
      value: overview.current_queue?.total_in_queue || 0,
      icon: 'mdi-format-list-group',
      color: 'warning',
      trend: overview.current_queue?.waiting ? `${overview.current_queue.waiting} waiting` : '0',
      trendIcon: 'mdi-clock-outline',
      trendClass: 'text-medium-emphasis'
    },
    {
      title: 'Staff',
      value: overview.total_staff || 0,
      icon: 'mdi-account-tie',
      color: 'success',
      trend: 'On duty',
      trendIcon: 'mdi-check-circle',
      trendClass: 'text-success'
    }
  ]
})

const queueStats = computed(() => {
  if (!dashboardData.value) return { total_in_queue: 0, waiting: 0, called: 0, serving: 0, completed: 0 }
  return dashboardData.value.data.overview.current_queue || { total_in_queue: 0, waiting: 0, called: 0, serving: 0, completed: 0 }
})

const currentQueue = computed(() => {
  return dashboardData.value?.data.today_queue || []
})

const recentAppointments = computed(() => {
  return dashboardData.value?.data.recent_appointments || []
})

const appointmentStats = computed(() => {
  if (!dashboardData.value) return []
  
  const today = dashboardData.value.data.overview.today_appointments || {}
  const total = today.count || 1
  
  return [
    { label: 'Completed', value: today.completed || 0, color: 'success', percentage: ((today.completed || 0) / total * 100) },
    { label: 'Scheduled', value: (today.scheduled || 0) + (today.confirmed || 0), color: 'info', percentage: ((today.scheduled || 0) + (today.confirmed || 0)) / total * 100 },
    { label: 'Cancelled', value: (today.cancelled || 0) + (today.no_show || 0), color: 'error', percentage: ((today.cancelled || 0) + (today.no_show || 0)) / total * 100 }
  ]
})

const totalPatients = computed(() => {
  return dashboardData.value?.data.overview.total_patients || 0
})

const patientStatusList = computed(() => {
  const statuses = dashboardData.value?.data.overview.patients_by_status || []
  const total = totalPatients.value || 1
  
  const statusMap = {
    'REACTIVE': { label: 'Reactive', color: 'warning' },
    'NON_REACTIVE': { label: 'Non-Reactive', color: 'success' },
    'INDETERMINATE': { label: 'Indeterminate', color: 'info' }
  }
  
  return statuses.map(s => ({
    ...statusMap[s.hiv_status] || { label: s.hiv_status, color: 'grey' },
    count: s.count,
    percentage: ((s.count / total) * 100).toFixed(1)
  }))
})

const totalStaff = computed(() => {
  return dashboardData.value?.data.overview.total_staff || 0
})

const staffAvailability = computed(() => {
  return 75 // Placeholder - calculate from actual data
})

const recentActivities = ref([
  { id: 1, action: 'New patient registered', user: 'Admin', time: new Date(Date.now() - 5 * 60000), color: 'success' },
  { id: 2, action: 'Appointment completed', user: 'Nurse Jane', time: new Date(Date.now() - 15 * 60000), color: 'info' },
  { id: 3, action: 'Lab results uploaded', user: 'Lab Tech', time: new Date(Date.now() - 30 * 60000), color: 'warning' },
  { id: 4, action: 'Queue updated', user: 'System', time: new Date(Date.now() - 45 * 60000), color: 'primary' }
])

const quickActions = [
  { title: 'New Patient', icon: 'mdi-account-plus', color: 'primary', route: '/patients/new' },
  { title: 'Add to Queue', icon: 'mdi-format-list-group-plus', color: 'secondary', route: '/queue/add' },
  { title: 'Schedule', icon: 'mdi-calendar-plus', color: 'success', route: '/appointments/new' },
  { title: 'Reports', icon: 'mdi-file-chart', color: 'warning', route: '/reports' }
]

const appointmentHeaders = [
  { title: 'Patient', key: 'patient_name', align: 'start' },
  { title: 'Type', key: 'appointment_type' },
  { title: 'Time', key: 'scheduled_at' },
  { title: 'Status', key: 'status' },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' }
]

// Methods
const fetchDashboardData = async () => {
  loading.value = true
  error.value = null
  
  try {
    const response = await dashboardApi.getAdminDashboard()
    dashboardData.value = response.data
    
    // Extract admin name from auth store or response
    adminName.value = authStore.user?.username || 'Head Nurse'
    
    // Initialize charts after data is loaded
    setTimeout(() => {
      initMonthlyChart()
      initHivChart()
    }, 100)
  } catch (err) {
    console.error('Failed to fetch dashboard data:', err)
    error.value = 'Failed to load dashboard data. Please try again.'
  } finally {
    loading.value = false
  }
}

const initMonthlyChart = () => {
  if (!monthlyChart.value || !dashboardData.value) return
  
  const monthlyStats = dashboardData.value.data.monthly_statistics || []
  
  // Destroy existing chart instance
  if (monthlyChartInstance) {
    monthlyChartInstance.destroy()
  }
  
  const ctx = monthlyChart.value.getContext('2d')
  monthlyChartInstance = new Chart(ctx, {
    type: chartType.value,
    data: {
      labels: monthlyStats.map(s => s.month).reverse(),
      datasets: [
        {
          label: 'Completed',
          data: monthlyStats.map(s => s.completed).reverse(),
          backgroundColor: 'rgba(76, 175, 80, 0.2)',
          borderColor: '#4caf50',
          borderWidth: 2,
          tension: 0.4
        },
        {
          label: 'Cancelled',
          data: monthlyStats.map(s => s.cancelled).reverse(),
          backgroundColor: 'rgba(244, 67, 54, 0.2)',
          borderColor: '#f44336',
          borderWidth: 2,
          tension: 0.4
        },
        {
          label: 'No Show',
          data: monthlyStats.map(s => s.no_show).reverse(),
          backgroundColor: 'rgba(255, 152, 0, 0.2)',
          borderColor: '#ff9800',
          borderWidth: 2,
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 5
          }
        }
      }
    }
  })
}

const initHivChart = () => {
  if (!hivChart.value || !dashboardData.value) return
  
  const statuses = dashboardData.value.data.overview.patients_by_status || []
  
  // Destroy existing chart instance
  if (hivChartInstance) {
    hivChartInstance.destroy()
  }
  
  const ctx = hivChart.value.getContext('2d')
  hivChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: statuses.map(s => {
        switch(s.hiv_status) {
          case 'REACTIVE': return 'Reactive'
          case 'NON_REACTIVE': return 'Non-Reactive'
          case 'INDETERMINATE': return 'Indeterminate'
          default: return s.hiv_status
        }
      }),
      datasets: [{
        data: statuses.map(s => s.count),
        backgroundColor: [
          '#ff9800', // warning for reactive
          '#4caf50', // success for non-reactive
          '#2196f3'  // info for indeterminate
        ],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        }
      },
      cutout: '60%'
    }
  })
}

const getQueueStatusColor = (status) => {
  const colors = {
    'WAITING': 'warning',
    'CALLED': 'info',
    'SERVING': 'success',
    'COMPLETED': 'success',
    'SKIPPED': 'error'
  }
  return colors[status] || 'grey'
}

const getAppointmentStatusColor = (status) => {
  const colors = {
    'SCHEDULED': 'info',
    'CONFIRMED': 'primary',
    'IN_PROGRESS': 'warning',
    'COMPLETED': 'success',
    'CANCELLED': 'error',
    'NO_SHOW': 'error'
  }
  return colors[status] || 'grey'
}

const formatWaitingTime = (minutes) => {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}m`
}

const formatTime = (datetime) => {
  return format(new Date(datetime), 'hh:mm a')
}

const formatRelativeTime = (date) => {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

const formatDate = (date) => {
  return format(date, 'EEEE, MMMM d, yyyy')
}

// Navigation methods
const viewFullQueue = () => {
  router.push('/admin/queue')
}

const viewAllAppointments = () => {
  router.push('/admin/appointments-calendar')
}

const viewAppointment = (appointment) => {
  router.push(`/appointments/${appointment.id}`)
}

const handleQuickAction = (action) => {
  router.push(action.route)
}

const manageStaff = () => {
  router.push('/admin/administration')
}

// Time update
const updateTime = () => {
  const now = new Date()
  currentTime.value = format(now, 'hh:mm:ss a')
  currentDate.value = format(now, 'EEEE, MMMM d, yyyy')
}

// Watchers
watch(chartType, () => {
  initMonthlyChart()
})

// Lifecycle hooks
onMounted(() => {
  fetchDashboardData()
  updateTime()
  const timer = setInterval(updateTime, 1000)
  
  // Cleanup on unmount
  onBeforeUnmount(() => {
    clearInterval(timer)
    if (monthlyChartInstance) monthlyChartInstance.destroy()
    if (hivChartInstance) hivChartInstance.destroy()
  })
})
</script>

<style scoped>
.v-card {
  transition: all var(--transition-normal);
}

.v-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg) !important;
}

.cursor-pointer {
  cursor: pointer;
}

.bg-warning-light {
  background-color: rgba(255, 152, 0, 0.1) !important;
}

.bg-info-light {
  background-color: rgba(33, 150, 243, 0.1) !important;
}

.bg-success-light {
  background-color: rgba(76, 175, 80, 0.1) !important;
}

.queue-list::-webkit-scrollbar {
  width: 6px;
}

.queue-list::-webkit-scrollbar-track {
  background: var(--color-surface-dark);
  border-radius: var(--radius-full);
}

.queue-list::-webkit-scrollbar-thumb {
  background: var(--color-primary-light);
  border-radius: var(--radius-full);
}

.queue-list::-webkit-scrollbar-thumb:hover {
  background: var(--color-primary);
}
</style>