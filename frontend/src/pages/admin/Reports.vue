<!-- frontend/src/pages/admin/ReportsAnalytics.vue -->
<template>
  <v-container fluid class="pa-6">
    <!-- Page Header -->
    <div class="page-header d-flex justify-space-between align-center mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold text-primary">Reports & Analytics</h1>
        <p class="text-body-1 text-medium-emphasis mt-2">
          Comprehensive insights and analytics for HIV patient management system
        </p>
      </div>
      <div class="d-flex gap-2">
        <v-btn 
          variant="outlined" 
          prepend-icon="mdi-file-download"
          @click="exportReport"
          :loading="exporting"
        >
          Export Report
        </v-btn>
        <v-btn 
          color="primary" 
          prepend-icon="mdi-refresh"
          @click="refreshData"
          :loading="loading"
        >
          Refresh Data
        </v-btn>
      </div>
    </div>

    <!-- Key Metrics -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="2" border>
          <v-card-text class="text-center">
            <v-icon color="primary" size="48" class="mb-2">mdi-account-group</v-icon>
            <div class="text-h5 font-weight-bold">{{ formatNumber(metrics.totalPatients) }}</div>
            <div class="text-body-2 text-medium-emphasis">Total Patients</div>
            <div class="text-caption" :class="metrics.patientGrowth >= 0 ? 'text-success' : 'text-error'">
              <v-icon :color="metrics.patientGrowth >= 0 ? 'success' : 'error'" size="16">
                {{ metrics.patientGrowth >= 0 ? 'mdi-arrow-up' : 'mdi-arrow-down' }}
              </v-icon>
              {{ Math.abs(metrics.patientGrowth) }}% this month
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="2" border>
          <v-card-text class="text-center">
            <v-icon color="success" size="48" class="mb-2">mdi-check-circle</v-icon>
            <div class="text-h5 font-weight-bold">{{ formatNumber(metrics.consentedPatients) }}</div>
            <div class="text-body-2 text-medium-emphasis">Consented</div>
            <div class="text-caption text-medium-emphasis">
              {{ metrics.consentRate }}% consent rate
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="2" border>
          <v-card-text class="text-center">
            <v-icon color="info" size="48" class="mb-2">mdi-shield-check</v-icon>
            <div class="text-h5 font-weight-bold">{{ formatNumber(metrics.dltVerified) }}</div>
            <div class="text-body-2 text-medium-emphasis">DLT Verified</div>
            <div class="text-caption text-medium-emphasis">
              {{ metrics.dltVerificationRate }}% verified
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="2" border>
          <v-card-text class="text-center">
            <v-icon color="warning" size="48" class="mb-2">mdi-fingerprint</v-icon>
            <div class="text-h5 font-weight-bold">{{ formatNumber(metrics.biometricLinked) }}</div>
            <div class="text-body-2 text-medium-emphasis">Biometric Linked</div>
            <div class="text-caption text-medium-emphasis">
              {{ metrics.biometricLinkRate }}% linked
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- HIV Status Distribution -->
    <v-row class="mb-6">
      <v-col cols="12" md="8">
        <v-card elevation="2" border>
          <v-card-title class="d-flex justify-space-between align-center">
            <span>HIV Status Distribution</span>
            <v-btn variant="text" size="small" @click="showHivChart = !showHivChart">
              {{ showHivChart ? 'Hide Chart' : 'Show Chart' }}
            </v-btn>
          </v-card-title>
          <v-card-text v-if="showHivChart">
            <div class="chart-container">
              <div class="d-flex align-end justify-center gap-4 h-200">
                <div 
                  v-for="item in hivDistribution" 
                  :key="item.status"
                  class="chart-column"
                >
                  <div 
                    class="chart-bar"
                    :style="{ height: `${(item.count / Math.max(...hivDistribution.map(i => i.count))) * 80}%` }"
                    :class="`bar-${item.status.toLowerCase().replace(' ', '-')}`"
                  >
                    <div class="chart-value">{{ item.count }}</div>
                  </div>
                  <div class="chart-label">{{ item.status }}</div>
                  <div class="chart-percentage">{{ item.percentage }}%</div>
                </div>
              </div>
            </div>
            <div class="chart-legend d-flex justify-center gap-4 mt-4">
              <div 
                v-for="item in hivDistribution" 
                :key="item.status"
                class="d-flex align-center gap-2"
              >
                <div 
                  class="legend-color" 
                  :class="`color-${item.status.toLowerCase().replace(' ', '-')}`"
                ></div>
                <span class="text-caption">{{ item.status }}</span>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card elevation="2" border>
          <v-card-title>Status Overview</v-card-title>
          <v-card-text>
            <v-list density="compact">
              <v-list-item
                v-for="item in hivDistribution"
                :key="item.status"
              >
                <template v-slot:prepend>
                  <v-avatar 
                    size="32" 
                    :color="getHivStatusColor(item.status)"
                    variant="flat"
                  >
                    <span class="text-caption text-white">{{ item.percentage }}%</span>
                  </v-avatar>
                </template>
                <v-list-item-title class="text-body-2">
                  {{ item.status }}
                </v-list-item-title>
                <v-list-item-subtitle class="text-caption">
                  {{ item.count }} patients
                </v-list-item-subtitle>
                <template v-slot:append>
                  <v-icon :color="getHivStatusColor(item.status)">
                    mdi-circle-medium
                  </v-icon>
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Monthly Enrollment Trends -->
    <v-row class="mb-6">
      <v-col cols="12">
        <v-card elevation="2" border>
          <v-card-title class="d-flex justify-space-between align-center">
            <span>Monthly Enrollment Trends</span>
            <v-select
              v-model="trendPeriod"
              :items="periodOptions"
              density="compact"
              variant="outlined"
              style="max-width: 200px;"
              hide-details
            />
          </v-card-title>
          <v-card-text>
            <div class="trend-chart">
              <div class="trend-grid">
                <div 
                  v-for="month in enrollmentTrends" 
                  :key="month.month"
                  class="trend-item"
                >
                  <div class="trend-month">{{ month.month }}</div>
                  <div class="trend-bar-container">
                    <div 
                      class="trend-bar"
                      :style="{ height: `${(month.count / Math.max(...enrollmentTrends.map(m => m.count))) * 100}%` }"
                    ></div>
                  </div>
                  <div class="trend-count">{{ month.count }}</div>
                </div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- DLT Verification Analytics -->
    <v-row class="mb-6">
      <v-col cols="12" md="6">
        <v-card elevation="2" border>
          <v-card-title>DLT Verification Status</v-card-title>
          <v-card-text>
            <div class="verification-stats">
              <v-row>
                <v-col cols="6" v-for="stat in dltStats" :key="stat.status">
                  <div class="stat-item text-center py-4">
                    <v-icon 
                      size="40" 
                      :color="getDltStatusColor(stat.status)"
                      class="mb-2"
                    >
                      {{ getDltStatusIcon(stat.status) }}
                    </v-icon>
                    <div class="text-h6 font-weight-bold">{{ stat.count }}</div>
                    <div class="text-body-2 text-medium-emphasis">{{ stat.label }}</div>
                    <div class="text-caption" :class="getDltStatusColor(stat.status) + '--text'">
                      {{ stat.percentage }}%
                    </div>
                  </div>
                </v-col>
              </v-row>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card elevation="2" border>
          <v-card-title>Biometric Link Analytics</v-card-title>
          <v-card-text>
            <div class="biometric-stats">
              <v-row>
                <v-col cols="6" v-for="stat in biometricStats" :key="stat.type">
                  <div class="stat-item text-center py-4">
                    <v-icon 
                      size="40" 
                      color="deep-purple"
                      class="mb-2"
                    >
                      {{ getBiometricIcon(stat.type) }}
                    </v-icon>
                    <div class="text-h6 font-weight-bold">{{ stat.count }}</div>
                    <div class="text-body-2 text-medium-emphasis">{{ stat.label }}</div>
                    <div class="text-caption text-deep-purple">
                      {{ stat.percentage }}%
                    </div>
                  </div>
                </v-col>
              </v-row>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- System Activity Reports -->
    <v-row class="mb-6">
      <v-col cols="12">
        <v-card elevation="2" border>
          <v-card-title class="d-flex justify-space-between align-center">
            <span>System Activity Report</span>
            <v-btn
              variant="outlined"
              size="small"
              @click="generateActivityReport"
              :loading="generatingReport"
            >
              Generate Report
            </v-btn>
          </v-card-title>
          <v-card-text>
            <v-data-table
              :headers="activityHeaders"
              :items="activityData"
              :loading="loading"
              class="elevation-0"
            >
              <template v-slot:item.date="{ item }">
                <div class="font-weight-medium">{{ item.date }}</div>
              </template>
              <template v-slot:item.enrollments="{ item }">
                <v-chip size="small" variant="flat" color="primary">
                  {{ item.enrollments }}
                </v-chip>
              </template>
              <template v-slot:item.dltVerifications="{ item }">
                <v-chip size="small" variant="flat" color="teal">
                  {{ item.dltVerifications }}
                </v-chip>
              </template>
              <template v-slot:item.biometricLinks="{ item }">
                <v-chip size="small" variant="flat" color="deep-purple">
                  {{ item.biometricLinks }}
                </v-chip>
              </template>
              <template v-slot:item.successRate="{ item }">
                <div class="d-flex align-center gap-2">
                  <v-progress-linear
                    :model-value="item.successRate"
                    height="8"
                    :color="getSuccessRateColor(item.successRate)"
                    rounded
                  />
                  <span class="text-caption">{{ item.successRate }}%</span>
                </div>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Detailed Reports Section -->
    <v-row>
      <v-col cols="12" md="4">
        <v-card elevation="2" border>
          <v-card-title class="d-flex align-center">
            <v-icon color="primary" class="me-2">mdi-file-chart</v-icon>
            <span>Quick Reports</span>
          </v-card-title>
          <v-card-text>
            <v-list density="compact">
              <v-list-item
                v-for="report in quickReports"
                :key="report.title"
                @click="generateQuickReport(report)"
                :disabled="report.disabled"
              >
                <template v-slot:prepend>
                  <v-icon :color="report.color">{{ report.icon }}</v-icon>
                </template>
                <v-list-item-title class="text-body-2">
                  {{ report.title }}
                </v-list-item-title>
                <v-list-item-subtitle class="text-caption">
                  {{ report.description }}
                </v-list-item-subtitle>
                <template v-slot:append>
                  <v-btn
                    icon
                    variant="text"
                    size="small"
                    :color="report.color"
                  >
                    <v-icon>mdi-download</v-icon>
                  </v-btn>
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="8">
        <v-card elevation="2" border>
          <v-card-title class="d-flex align-center">
            <v-icon color="primary" class="me-2">mdi-chart-box</v-icon>
            <span>Performance Metrics</span>
          </v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="6" sm="3" v-for="metric in performanceMetrics" :key="metric.title">
                <div class="metric-card text-center py-4">
                  <v-icon 
                    size="32" 
                    :color="metric.color"
                    class="mb-2"
                  >
                    {{ metric.icon }}
                  </v-icon>
                  <div class="text-h6 font-weight-bold" :class="`text-${metric.color}`">
                    {{ metric.value }}
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    {{ metric.title }}
                  </div>
                  <div 
                    class="text-caption mt-1"
                    :class="metric.trend >= 0 ? 'text-success' : 'text-error'"
                  >
                    <v-icon :color="metric.trend >= 0 ? 'success' : 'error'" size="16">
                      {{ metric.trend >= 0 ? 'mdi-arrow-up' : 'mdi-arrow-down' }}
                    </v-icon>
                    {{ Math.abs(metric.trend) }}%
                  </div>
                </div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Report Generation Dialog -->
    <v-dialog v-model="showReportDialog" max-width="500">
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
          <span>Generate Custom Report</span>
          <v-btn icon @click="showReportDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text>
          <v-form ref="reportForm">
            <v-row>
              <v-col cols="12">
                <v-select
                  v-model="reportType"
                  :items="reportTypes"
                  label="Report Type"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-menu v-model="startDateMenu" :close-on-content-click="false">
                  <template v-slot:activator="{ props }">
                    <v-text-field
                      v-model="startDate"
                      label="Start Date"
                      variant="outlined"
                      density="comfortable"
                      readonly
                      v-bind="props"
                    />
                  </template>
                  <v-date-picker v-model="startDate" />
                </v-menu>
              </v-col>
              <v-col cols="12" md="6">
                <v-menu v-model="endDateMenu" :close-on-content-click="false">
                  <template v-slot:activator="{ props }">
                    <v-text-field
                      v-model="endDate"
                      label="End Date"
                      variant="outlined"
                      density="comfortable"
                      readonly
                      v-bind="props"
                    />
                  </template>
                  <v-date-picker v-model="endDate" />
                </v-menu>
              </v-col>
              <v-col cols="12">
                <v-select
                  v-model="selectedMetrics"
                  :items="availableMetrics"
                  label="Include Metrics"
                  variant="outlined"
                  density="comfortable"
                  multiple
                  chips
                />
              </v-col>
              <v-col cols="12">
                <v-select
                  v-model="reportFormat"
                  :items="formatOptions"
                  label="Export Format"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="outlined" @click="showReportDialog = false">
            Cancel
          </v-btn>
          <v-btn color="primary" @click="generateCustomReport" :loading="generatingReport">
            Generate Report
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

// Reactive state
const loading = ref(false)
const exporting = ref(false)
const generatingReport = ref(false)
const showHivChart = ref(true)
const trendPeriod = ref('6months')
const showReportDialog = ref(false)
const startDateMenu = ref(false)
const endDateMenu = ref(false)
const reportType = ref('comprehensive')
const startDate = ref('')
const endDate = ref('')
const selectedMetrics = ref([])
const reportFormat = ref('pdf')

const snackbar = ref({
  show: false,
  message: '',
  color: 'success'
})

// Metrics data
const metrics = ref({
  totalPatients: 1247,
  consentedPatients: 983,
  dltVerified: 892,
  biometricLinked: 756,
  patientGrowth: 8.5,
  consentRate: 78.8,
  dltVerificationRate: 71.5,
  biometricLinkRate: 60.6
})

// HIV Status Distribution
const hivDistribution = ref([
  { status: 'Reactive', count: 487, percentage: 39.1 },
  { status: 'Non-Reactive', count: 634, percentage: 50.8 },
  { status: 'Pending', count: 126, percentage: 10.1 }
])

// Enrollment Trends
const enrollmentTrends = ref([
  { month: 'Jul', count: 89 },
  { month: 'Aug', count: 104 },
  { month: 'Sep', count: 97 },
  { month: 'Oct', count: 112 },
  { month: 'Nov', count: 128 },
  { month: 'Dec', count: 145 },
  { month: 'Jan', count: 156 }
])

// DLT Statistics
const dltStats = ref([
  { status: 'verified', label: 'Verified', count: 892, percentage: 71.5 },
  { status: 'pending', label: 'Pending', count: 234, percentage: 18.8 },
  { status: 'failed', label: 'Failed', count: 121, percentage: 9.7 }
])

// Biometric Statistics
const biometricStats = ref([
  { type: 'linked', label: 'Linked', count: 756, percentage: 60.6 },
  { type: 'pending', label: 'Pending', count: 289, percentage: 23.2 },
  { type: 'verified', label: 'Verified', count: 634, percentage: 50.8 }
])

// Activity Data
const activityHeaders = ref([
  { title: 'Date', key: 'date', sortable: true },
  { title: 'Enrollments', key: 'enrollments', sortable: true },
  { title: 'DLT Verifications', key: 'dltVerifications', sortable: true },
  { title: 'Biometric Links', key: 'biometricLinks', sortable: true },
  { title: 'Success Rate', key: 'successRate', sortable: true }
])

const activityData = ref([
  { date: '2024-01-25', enrollments: 23, dltVerifications: 18, biometricLinks: 15, successRate: 92 },
  { date: '2024-01-24', enrollments: 19, dltVerifications: 16, biometricLinks: 14, successRate: 89 },
  { date: '2024-01-23', enrollments: 21, dltVerifications: 17, biometricLinks: 16, successRate: 94 },
  { date: '2024-01-22', enrollments: 18, dltVerifications: 15, biometricLinks: 13, successRate: 87 },
  { date: '2024-01-21', enrollments: 16, dltVerifications: 14, biometricLinks: 12, successRate: 85 }
])

// Quick Reports
const quickReports = ref([
  {
    title: 'Patient Enrollment Report',
    description: 'Daily enrollment statistics',
    icon: 'mdi-account-plus',
    color: 'primary',
    disabled: false
  },
  {
    title: 'DLT Verification Report',
    description: 'Blockchain verification status',
    icon: 'mdi-shield-check',
    color: 'teal',
    disabled: false
  },
  {
    title: 'Biometric Analytics',
    description: 'Biometric link performance',
    icon: 'mdi-fingerprint',
    color: 'deep-purple',
    disabled: false
  },
  {
    title: 'Consent Compliance',
    description: 'Patient consent tracking',
    icon: 'mdi-file-document-check',
    color: 'green',
    disabled: false
  }
])

// Performance Metrics
const performanceMetrics = ref([
  { title: 'Avg. Enrollment/Day', value: '18.4', trend: 12, icon: 'mdi-account-arrow-up', color: 'primary' },
  { title: 'DLT Success Rate', value: '89.2%', trend: 5, icon: 'mdi-shield-check', color: 'teal' },
  { title: 'Biometric Match Rate', value: '94.7%', trend: 8, icon: 'mdi-fingerprint', color: 'deep-purple' },
  { title: 'System Uptime', value: '99.8%', trend: 0, icon: 'mdi-server', color: 'green' }
])

// Report Configuration
const periodOptions = [
  { title: 'Last 3 Months', value: '3months' },
  { title: 'Last 6 Months', value: '6months' },
  { title: 'Last Year', value: '1year' },
  { title: 'Custom Range', value: 'custom' }
]

const reportTypes = [
  { title: 'Comprehensive Report', value: 'comprehensive' },
  { title: 'Patient Analytics', value: 'patient' },
  { title: 'DLT Performance', value: 'dlt' },
  { title: 'Biometric Statistics', value: 'biometric' },
  { title: 'System Audit', value: 'audit' }
]

const availableMetrics = [
  'Patient Demographics',
  'HIV Status Distribution',
  'Consent Rates',
  'DLT Verification Status',
  'Biometric Link Analytics',
  'System Performance',
  'Security Events'
]

const formatOptions = [
  { title: 'PDF Document', value: 'pdf' },
  { title: 'Excel Spreadsheet', value: 'excel' },
  { title: 'CSV Data', value: 'csv' },
  { title: 'JSON Data', value: 'json' }
]

// Methods
function formatNumber(num) {
  return new Intl.NumberFormat().format(num)
}

function getHivStatusColor(status) {
  const colors = {
    'Reactive': 'red',
    'Non-Reactive': 'green',
    'Pending': 'orange'
  }
  return colors[status] || 'grey'
}

function getDltStatusColor(status) {
  const colors = {
    'verified': 'success',
    'pending': 'warning',
    'failed': 'error'
  }
  return colors[status] || 'grey'
}

function getDltStatusIcon(status) {
  const icons = {
    'verified': 'mdi-check-circle',
    'pending': 'mdi-clock',
    'failed': 'mdi-alert-circle'
  }
  return icons[status] || 'mdi-help-circle'
}

function getBiometricIcon(type) {
  const icons = {
    'linked': 'mdi-link',
    'pending': 'mdi-clock',
    'verified': 'mdi-check-circle'
  }
  return icons[type] || 'mdi-fingerprint'
}

function getSuccessRateColor(rate) {
  if (rate >= 90) return 'success'
  if (rate >= 80) return 'warning'
  return 'error'
}

function generateQuickReport(report) {
  console.log('Generating quick report:', report.title)
  showSnackbar(`Generating ${report.title}...`, 'info')
  
  // Simulate report generation
  setTimeout(() => {
    showSnackbar(`${report.title} generated successfully`, 'success')
  }, 2000)
}

function generateActivityReport() {
  generatingReport.value = true
  console.log('Generating activity report...')
  
  setTimeout(() => {
    generatingReport.value = false
    showSnackbar('Activity report generated successfully', 'success')
  }, 3000)
}

function generateCustomReport() {
  generatingReport.value = true
  console.log('Generating custom report:', {
    type: reportType.value,
    startDate: startDate.value,
    endDate: endDate.value,
    metrics: selectedMetrics.value,
    format: reportFormat.value
  })
  
  setTimeout(() => {
    generatingReport.value = false
    showReportDialog.value = false
    showSnackbar('Custom report generated successfully', 'success')
  }, 3000)
}

async function exportReport() {
  exporting.value = true
  try {
    // Simulate export process
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Create and download a sample report
    const reportData = {
      metrics: metrics.value,
      hivDistribution: hivDistribution.value,
      enrollmentTrends: enrollmentTrends.value,
      generatedAt: new Date().toISOString()
    }
    
    const dataStr = JSON.stringify(reportData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `hiv-system-report-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    showSnackbar('Report exported successfully', 'success')
  } catch (error) {
    console.error('Error exporting report:', error)
    showSnackbar('Failed to export report', 'error')
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

async function refreshData() {
  loading.value = true
  try {
    // Simulate API call to refresh data
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Update metrics with slight variations to simulate fresh data
    metrics.value = {
      ...metrics.value,
      totalPatients: metrics.value.totalPatients + Math.floor(Math.random() * 10),
      consentedPatients: metrics.value.consentedPatients + Math.floor(Math.random() * 8),
      dltVerified: metrics.value.dltVerified + Math.floor(Math.random() * 6),
      biometricLinked: metrics.value.biometricLinked + Math.floor(Math.random() * 5)
    }
    
    showSnackbar('Data refreshed successfully', 'success')
  } catch (error) {
    console.error('Error refreshing data:', error)
    showSnackbar('Failed to refresh data', 'error')
  } finally {
    loading.value = false
  }
}

// Lifecycle
onMounted(() => {
  // Set default date range for reports
  const today = new Date()
  const oneMonthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate())
  startDate.value = oneMonthAgo.toISOString().split('T')[0]
  endDate.value = today.toISOString().split('T')[0]
  selectedMetrics.value = availableMetrics.slice(0, 3)
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

.h-200 {
  height: 200px;
}

.chart-container {
  padding: 20px 0;
}

.chart-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.chart-bar {
  width: 40px;
  background: #f5f5f5;
  border-radius: 4px;
  position: relative;
  display: flex;
  align-items: end;
  justify-content: center;
  min-height: 40px;
}

.chart-value {
  color: white;
  font-weight: 600;
  font-size: 0.75rem;
  padding: 2px 0;
  text-shadow: 1px 1px 1px rgba(0,0,0,0.3);
}

.chart-label {
  font-size: 0.75rem;
  margin-top: 8px;
  color: rgba(0, 0, 0, 0.6);
  text-align: center;
}

.chart-percentage {
  font-size: 0.7rem;
  color: rgba(0, 0, 0, 0.5);
  margin-top: 2px;
}

/* HIV Status Bar Colors */
.bar-reactive {
  background: linear-gradient(to top, #f44336, #e57373);
}

.bar-non-reactive {
  background: linear-gradient(to top, #4caf50, #81c784);
}

.bar-pending {
  background: linear-gradient(to top, #ff9800, #ffb74d);
}

/* Legend Colors */
.color-reactive { background: #f44336; }
.color-non-reactive { background: #4caf50; }
.color-pending { background: #ff9800; }

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 4px;
}

.trend-chart {
  padding: 20px 0;
}

.trend-grid {
  display: flex;
  align-items: end;
  justify-content: space-between;
  height: 120px;
}

.trend-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.trend-month {
  font-size: 0.75rem;
  margin-bottom: 8px;
  color: rgba(0, 0, 0, 0.6);
}

.trend-bar-container {
  width: 20px;
  height: 80px;
  background: #f5f5f5;
  border-radius: 4px;
  position: relative;
  overflow: hidden;
}

.trend-bar {
  width: 100%;
  background: linear-gradient(to top, #2196f3, #64b5f6);
  border-radius: 4px;
  position: absolute;
  bottom: 0;
  transition: height 0.3s ease;
}

.trend-count {
  font-size: 0.75rem;
  margin-top: 8px;
  font-weight: 600;
  color: #2196f3;
}

.stat-item {
  border-right: 1px solid rgba(0, 0, 0, 0.12);
}

.stat-item:last-child {
  border-right: none;
}

.metric-card {
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  transition: all 0.3s ease;
}

.metric-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

:deep(.v-data-table-header) {
  background-color: rgba(0, 0, 0, 0.02);
}

:deep(.v-data-table .v-table__wrapper > table > thead > tr > th) {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.87);
}
</style>