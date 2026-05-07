<!-- frontend/src/pages/admin/Reports.vue -->
<template>
  <v-container fluid class="pa-4 pa-md-6">
    <!-- Header -->
    <v-row class="mb-6">
      <v-col cols="12">
        <div class="d-flex justify-space-between align-center flex-wrap">
          <div>
            <h1 class="text-h4 font-weight-medium mb-1">Reports & Analytics</h1>
            <p class="text-subtitle-1 text-medium-emphasis">
              Generate and export comprehensive reports for the HIV clinic management system
            </p>
          </div>
          <v-btn
            color="primary"
            variant="flat"
            prepend-icon="mdi-refresh"
            @click="refreshData"
            :loading="loading"
            class="mt-2 mt-sm-0"
          >
            Refresh
          </v-btn>
        </div>
      </v-col>
    </v-row>

    <!-- Report Filters -->
    <v-card class="mb-6">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="3">
            <v-select
              v-model="selectedReportType"
              :items="reportTypes"
              item-title="name"
              item-value="id"
              label="Report Type"
              variant="outlined"
              density="comfortable"
              @update:model-value="onReportTypeChange"
            >
              <template v-slot:item="{ props, item }">
                <v-list-item v-bind="props">
                  <template v-slot:prepend>
                    <v-icon :icon="item.raw.icon" class="mr-2"></v-icon>
                  </template>
                  <v-list-item-title>{{ item.raw.name }}</v-list-item-title>
                  <v-list-item-subtitle>{{ item.raw.description }}</v-list-item-subtitle>
                </v-list-item>
              </template>
            </v-select>
          </v-col>
          
          <v-col cols="12" md="3">
            <v-text-field
              v-model="dateRange.start"
              label="Start Date"
              type="date"
              variant="outlined"
              density="comfortable"
            ></v-text-field>
          </v-col>
          
          <v-col cols="12" md="3">
            <v-text-field
              v-model="dateRange.end"
              label="End Date"
              type="date"
              variant="outlined"
              density="comfortable"
            ></v-text-field>
          </v-col>
          
          <v-col cols="12" md="3">
            <v-btn
              color="primary"
              variant="flat"
              block
              height="56"
              @click="generateReport"
              :loading="generating"
            >
              <v-icon left>mdi-chart-line</v-icon>
              Generate Report
            </v-btn>
          </v-col>
        </v-row>
        
        <!-- Dynamic filters based on report type -->
        <v-row v-if="showAdditionalFilters">
          <v-col cols="12" md="4" v-if="selectedReportType === 'appointments'">
            <v-select
              v-model="additionalFilters.status"
              :items="appointmentStatuses"
              label="Appointment Status"
              variant="outlined"
              density="comfortable"
              clearable
            ></v-select>
          </v-col>
          
          <v-col cols="12" md="4" v-if="selectedReportType === 'patients'">
            <v-select
              v-model="additionalFilters.hivStatus"
              :items="hivStatuses"
              label="HIV Status"
              variant="outlined"
              density="comfortable"
              clearable
            ></v-select>
            <v-select
              v-model="additionalFilters.sex"
              :items="sexOptions"
              label="Sex"
              variant="outlined"
              density="comfortable"
              clearable
              class="mt-2"
            ></v-select>
          </v-col>
          
          <v-col cols="12" md="4" v-if="selectedReportType === 'lab-results'">
            <v-select
              v-model="additionalFilters.testType"
              :items="labTestTypes"
              label="Test Type"
              variant="outlined"
              density="comfortable"
              clearable
            ></v-select>
          </v-col>
          
          <v-col cols="12" md="4" v-if="selectedReportType === 'queue'">
            <v-select
              v-model="additionalFilters.stream"
              :items="queueStreams"
              item-title="title"
              item-value="value"
              label="Queue Stream"
              variant="outlined"
              density="comfortable"
              clearable
            ></v-select>
            <v-select
              v-model="additionalFilters.queueStatus"
              :items="queueStatuses"
              label="Queue Status"
              variant="outlined"
              density="comfortable"
              clearable
              class="mt-2"
            ></v-select>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Loading State -->
    <v-row v-if="loading || generating">
      <v-col cols="12">
        <v-card class="text-center pa-8">
          <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
          <h3 class="text-h6 mt-4">Generating Report...</h3>
          <p class="text-body-2 text-medium-emphasis">Please wait while we fetch your data</p>
        </v-card>
      </v-col>
    </v-row>

    <!-- Report Results -->
    <div v-else-if="reportData && reportData.data">
      <!-- Summary Cards -->
      <v-row class="mb-6">
        <v-col
          v-for="metric in summaryMetrics"
          :key="metric.title"
          cols="12"
          sm="6"
          md="3"
        >
          <v-card :color="metric.color" variant="tonal">
            <v-card-text>
              <div class="d-flex align-center">
                <v-icon size="40" :color="metric.color" class="mr-3">
                  {{ metric.icon }}
                </v-icon>
                <div>
                  <div class="text-caption text-medium-emphasis">
                    {{ metric.title }}
                  </div>
                  <div class="text-h4 font-weight-bold">
                    {{ metric.value }}
                  </div>
                  <div v-if="metric.trend" class="text-caption" :class="metric.trendClass">
                    <v-icon size="12" :icon="metric.trendIcon"></v-icon>
                    {{ metric.trend }}
                  </div>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Main Data Table -->
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center flex-wrap">
          <span class="text-h6">{{ reportTitle }}</span>
          <div class="mt-2 mt-sm-0">
            <v-btn
              color="success"
              variant="text"
              prepend-icon="mdi-file-excel"
              @click="exportReport('csv')"
              :loading="exporting"
              class="mr-2"
            >
              Export CSV
            </v-btn>
            <v-btn
              color="primary"
              variant="text"
              prepend-icon="mdi-file-pdf-box"
              @click="exportReport('pdf')"
              :loading="exporting"
            >
              Export PDF
            </v-btn>
          </div>
        </v-card-title>
        
        <v-card-text>
          <v-data-table
            :headers="tableHeaders"
            :items="tableData"
            :loading="loading"
            :items-per-page="10"
            class="elevation-0"
          >
            <template v-slot:item.status="{ item }">
              <v-chip :color="getStatusColor(item.status)" size="small">
                {{ item.status }}
              </v-chip>
            </template>
            
            <template v-slot:item.hiv_status="{ item }">
              <v-chip :color="getHIVStatusColor(item.hiv_status)" size="small">
                {{ item.hiv_status }}
              </v-chip>
            </template>
            
            <template v-slot:item.queue_stream="{ item }">
              <v-chip :color="getStreamColor(item.queue_stream)" size="small">
                {{ item.stream_label || item.queue_stream }}
              </v-chip>
            </template>
            
            <template v-slot:item.actions="{ item }">
              <v-btn
                color="primary"
                variant="text"
                size="small"
                icon
                @click="viewDetails(item)"
              >
                <v-icon>mdi-eye</v-icon>
              </v-btn>
            </template>

            <template v-slot:no-data>
              <div class="text-center pa-8">
                <v-icon size="64" color="grey-lighten-1">mdi-file-document-outline</v-icon>
                <div class="text-h6 mt-4">No Data Found</div>
                <div class="text-caption text-medium-emphasis">
                  Try adjusting your filters or date range
                </div>
              </div>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>

      <!-- Charts Section -->
      <v-row class="mt-6" v-if="showCharts && hasChartData">
        <v-col cols="12" lg="6">
          <v-card>
            <v-card-title>Monthly Trends</v-card-title>
            <v-card-text>
              <div style="height: 300px">
                <canvas ref="trendsChart"></canvas>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
        
        <v-col cols="12" lg="6">
          <v-card>
            <v-card-title>Distribution</v-card-title>
            <v-card-text>
              <div style="height: 300px">
                <canvas ref="distributionChart"></canvas>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- No Data State -->
    <v-row v-else-if="!generating && !loading && reportData && !reportData.data">
      <v-col cols="12">
        <v-card class="text-center pa-8">
          <v-icon size="64" color="grey-lighten-1">mdi-file-chart</v-icon>
          <h3 class="text-h6 mt-4">No Report Data</h3>
          <p class="text-body-2 text-medium-emphasis">
            {{ reportData.message || 'No data found for the selected criteria' }}
          </p>
          <v-btn
            color="primary"
            variant="flat"
            @click="generateReport"
            class="mt-4"
          >
            Try Again
          </v-btn>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { format } from 'date-fns'
import Chart from 'chart.js/auto'
import { reportsApi } from '@/api'
import { useToast } from 'vue-toastification'

const router = useRouter()
const toast = useToast()

// State
const loading = ref(false)
const generating = ref(false)
const exporting = ref(false)
const selectedReportType = ref('appointments')
const reportTypes = ref([])
const reportData = ref(null)
const dateRange = ref({
  start: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
  end: format(new Date(), 'yyyy-MM-dd')
})
const additionalFilters = ref({
  status: null,
  hivStatus: null,
  sex: null,
  testType: null,
  stream: null,
  queueStatus: null
})

// Chart refs
const trendsChart = ref(null)
const distributionChart = ref(null)
let trendsChartInstance = null
let distributionChartInstance = null

// Options from schema
const appointmentStatuses = [
  'SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'
]

const hivStatuses = [
  'REACTIVE', 'NON_REACTIVE', 'INDETERMINATE'
]

const sexOptions = [
  'MALE', 'FEMALE', 'OTHER'
]

const labTestTypes = [
  'CD4', 'VIRAL_LOAD', 'COMPLETE_BLOOD_COUNT', 'LIVER_FUNCTION', 'RENAL_FUNCTION', 'OTHER'
]

const queueStreams = [
  { title: 'Consultation Stream', value: 'CONSULTATION' },
  { title: 'Testing Stream', value: 'TESTING' }
]

const queueStatuses = [
  'WAITING', 'CALLED', 'SERVING', 'COMPLETED', 'SKIPPED'
]

// Default report types
const defaultReportTypes = [
  { id: 'appointments', name: 'Appointments Report', description: 'View appointment statistics, status distribution, and trends', icon: 'mdi-calendar-check' },
  { id: 'patients', name: 'Patients Report', description: 'Patient demographics, HIV status distribution, and treatment progress', icon: 'mdi-account-group' },
  { id: 'queue', name: 'Queue Performance Report', description: 'Queue metrics, wait time analysis, and stream performance', icon: 'mdi-format-list-group' },
  { id: 'lab-results', name: 'Laboratory Results Report', description: 'Lab test results, completion rates, and test type distribution', icon: 'mdi-flask' },
  { id: 'staff-performance', name: 'Staff Performance Report', description: 'Staff productivity metrics and encounter statistics', icon: 'mdi-account-tie' },
  { id: 'hiv-summary', name: 'HIV Summary Report', description: 'HIV patient statistics, ART outcomes, and treatment trends', icon: 'mdi-heart-pulse' },
  { id: 'dashboard-summary', name: 'Dashboard Summary', description: 'Combined metrics and KPIs from all modules', icon: 'mdi-view-dashboard' }
]

// Computed
const showAdditionalFilters = computed(() => {
  return ['appointments', 'patients', 'lab-results', 'queue'].includes(selectedReportType.value)
})

const reportTitle = computed(() => {
  if (!selectedReportType.value) return 'Report'
  if (Array.isArray(reportTypes.value) && reportTypes.value.length > 0) {
    const type = reportTypes.value.find(t => t.id === selectedReportType.value)
    if (type) return type.name
  }
  const defaultType = defaultReportTypes.find(t => t.id === selectedReportType.value)
  return defaultType ? defaultType.name : selectedReportType.value.charAt(0).toUpperCase() + selectedReportType.value.slice(1)
})

// Extract the actual data from the response
const actualData = computed(() => {
  if (!reportData.value) return null
  // The response is wrapped in { success, message, data }
  return reportData.value.data || reportData.value
})

const summaryMetrics = computed(() => {
  const data = actualData.value
  if (!data) return []
  
  const summary = data.summary || {}
  
  switch(selectedReportType.value) {
    case 'appointments':
      return [
        { title: 'Total Appointments', value: summary.total || 0, icon: 'mdi-calendar-check', color: 'primary' },
        { title: 'Completed', value: summary.completed || 0, icon: 'mdi-check-circle', color: 'success' },
        { title: 'Cancelled', value: summary.cancelled || 0, icon: 'mdi-cancel', color: 'error' },
        { title: 'No Show', value: summary.no_show || 0, icon: 'mdi-account-off', color: 'warning' }
      ]
    case 'patients':
      return [
        { title: 'Total Patients', value: summary.total_patients || 0, icon: 'mdi-account-group', color: 'primary' },
        { title: 'Reactive', value: summary.reactive || 0, icon: 'mdi-alert', color: 'warning' },
        { title: 'On ART', value: summary.on_art || 0, icon: 'mdi-pill', color: 'success' },
        { title: 'Avg Age', value: Math.round(summary.avg_age || 0), icon: 'mdi-calendar', color: 'info' }
      ]
    case 'queue':
      return [
        { title: 'Total Served', value: data.metrics?.total_in_queue || 0, icon: 'mdi-format-list-group', color: 'primary' },
        { title: 'Avg Wait Time', value: `${data.metrics?.average_wait_time_minutes || 0} min`, icon: 'mdi-clock', color: 'warning' },
        { title: 'Avg Service Time', value: `${data.metrics?.average_service_time_minutes || 0} min`, icon: 'mdi-timer', color: 'info' },
        { title: 'Completed', value: data.metrics?.completed || 0, icon: 'mdi-check-circle', color: 'success' }
      ]
    default:
      return []
  }
})

const tableHeaders = computed(() => {
  switch(selectedReportType.value) {
    case 'appointments':
      return [
        { title: 'Appointment #', key: 'appointment_number' },
        { title: 'Patient', key: 'patient_name' },
        { title: 'Type', key: 'appointment_type' },
        { title: 'Date', key: 'scheduled_at' },
        { title: 'Status', key: 'status' },
        { title: 'Actions', key: 'actions', sortable: false }
      ]
    case 'patients':
      return [
        { title: 'Patient Code', key: 'patient_facility_code' },
        { title: 'Name', key: 'first_name' },
        { title: 'Age', key: 'age' },
        { title: 'Sex', key: 'sex' },
        { title: 'HIV Status', key: 'hiv_status' },
        { title: 'Actions', key: 'actions', sortable: false }
      ]
    case 'queue':
      return [
        { title: 'Queue #', key: 'queue_number' },
        { title: 'Queue Code', key: 'queue_code' },
        { title: 'Stream', key: 'queue_stream' },
        { title: 'Patient', key: 'patient_name' },
        { title: 'Wait Time', key: 'wait_to_call_minutes' },
        { title: 'Status', key: 'status' },
        { title: 'Actions', key: 'actions', sortable: false }
      ]
    case 'lab-results':
      return [
        { title: 'Patient', key: 'patient_name' },
        { title: 'Test Type', key: 'test_type' },
        { title: 'Test Date', key: 'test_date' },
        { title: 'Result', key: 'result_value' },
        { title: 'Interpretation', key: 'interpretation' },
        { title: 'Actions', key: 'actions', sortable: false }
      ]
    default:
      return []
  }
})

const tableData = computed(() => {
  const data = actualData.value
  if (!data) return []
  
  switch(selectedReportType.value) {
    case 'appointments':
      return data.appointments || []
    case 'patients':
      return data.patients || []
    case 'queue':
      return data.queue_items || []
    case 'lab-results':
      return data.lab_results || []
    default:
      return []
  }
})

const showCharts = computed(() => {
  return ['appointments', 'patients', 'hiv-summary', 'queue'].includes(selectedReportType.value)
})

const hasChartData = computed(() => {
  const data = actualData.value
  if (!data) return false
  
  if (selectedReportType.value === 'appointments') {
    return data.monthly_trends && data.monthly_trends.length > 0
  } else if (selectedReportType.value === 'hiv-summary') {
    return data.monthly_trends && data.monthly_trends.length > 0
  } else if (selectedReportType.value === 'queue') {
    return data.metrics?.stream_metrics && data.metrics.stream_metrics.length > 0
  }
  return false
})

// Methods
const fetchReportTypes = async () => {
  try {
    const response = await reportsApi.getAvailableReportTypes()
    // Response is already unwrapped by http interceptor
    if (Array.isArray(response)) {
      reportTypes.value = response
    } else if (response && response.data && Array.isArray(response.data)) {
      reportTypes.value = response.data
    } else {
      reportTypes.value = defaultReportTypes
    }
  } catch (error) {
    console.error('Failed to fetch report types:', error)
    reportTypes.value = defaultReportTypes
    toast.warning('Using default report types')
  }
}

const generateReport = async () => {
  if (!selectedReportType.value) {
    toast.warning('Please select a report type')
    return
  }
  
  generating.value = true
  loading.value = true
  
  try {
    const params = {
      startDate: dateRange.value.start,
      endDate: dateRange.value.end,
      ...additionalFilters.value
    }
    
    // Remove null/undefined filters
    Object.keys(params).forEach(key => {
      if (params[key] === null || params[key] === undefined || params[key] === '') {
        delete params[key]
      }
    })
    
    let response
    switch(selectedReportType.value) {
      case 'appointments':
        response = await reportsApi.getAppointmentReport(params)
        break
      case 'patients':
        response = await reportsApi.getPatientReport(params)
        break
      case 'queue':
        response = await reportsApi.getQueueReport(params)
        break
      case 'lab-results':
        response = await reportsApi.getLabResultsReport(params)
        break
      case 'staff-performance':
        response = await reportsApi.getStaffPerformanceReport(params)
        break
      case 'hiv-summary':
        response = await reportsApi.getHIVSummaryReport(params)
        break
      case 'dashboard-summary':
        response = await reportsApi.getDashboardSummaryReport(params)
        break
      default:
        throw new Error('Invalid report type')
    }
    
    // Store the full response (includes success, message, data)
    reportData.value = response
    
    console.log('Report data received:', reportData.value)
    
    // Initialize charts after data loads
    await nextTick()
    if (showCharts.value && hasChartData.value) {
      initCharts()
    }
    
    if (tableData.value.length === 0) {
      toast.info('No data found for the selected criteria')
    } else {
      toast.success(`Report generated successfully - ${tableData.value.length} records found`)
    }
  } catch (error) {
    console.error('Failed to generate report:', error)
    toast.error(error.message || 'Failed to generate report')
    reportData.value = null
  } finally {
    generating.value = false
    loading.value = false
  }
}
const exportReport = async (format) => {

  if (!reportData.value) {
    toast.warning('Please generate a report first')
    return
  }
  
  exporting.value = true
  
  try {
    const params = {
      startDate: dateRange.value.start,
      endDate: dateRange.value.end,
      ...additionalFilters.value
    }
    
    // Remove null/undefined filters
    Object.keys(params).forEach(key => {
      if (params[key] === null || params[key] === undefined || params[key] === '') {
        delete params[key]
      }
    })
    
    let response
    if (format === 'csv') {
      response = await reportsApi.exportReportCSV(selectedReportType.value, params)
    } else {
      response = await reportsApi.exportReportPDF(selectedReportType.value, params)
    }
    
    // Create blob download
    const blob = new Blob([response], { type: format === 'csv' ? 'text/csv' : 'application/pdf' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${selectedReportType.value}_report_${dateRange.value.start}_to_${dateRange.value.end}.${format}`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
    
    toast.success(`Report exported as ${format.toUpperCase()}`)
  } catch (error) {
    console.error('Failed to export report:', error)
    toast.error(error.message || 'Failed to export report')
  } finally {
    exporting.value = false
  }
}

const initCharts = () => {
  const data = actualData.value
  if (!data) return
  
  // Destroy existing charts
  if (trendsChartInstance) {
    trendsChartInstance.destroy()
  }
  if (distributionChartInstance) {
    distributionChartInstance.destroy()
  }
  
  // Initialize trends chart
  let trendsData = []
  let labels = []
  
  if (selectedReportType.value === 'appointments' && data.monthly_trends) {
    trendsData = data.monthly_trends.map(t => t.completed || 0)
    labels = data.monthly_trends.map(t => t.month)
  } else if (selectedReportType.value === 'hiv-summary' && data.monthly_trends) {
    trendsData = data.monthly_trends.map(t => t.new_diagnoses || 0)
    labels = data.monthly_trends.map(t => t.month)
  }
  
  if (trendsChart.value && trendsData.length > 0) {
    const ctx = trendsChart.value.getContext('2d')
    trendsChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: selectedReportType.value === 'appointments' ? 'Completed Appointments' : 'New Diagnoses',
          data: trendsData,
          borderColor: '#4caf50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    })
  }
  
  // Initialize distribution chart
  let distributionData = []
  let distributionLabels = []
  
  if (selectedReportType.value === 'appointments' && data.summary) {
    distributionData = [
      data.summary.completed || 0,
      data.summary.scheduled || 0,
      data.summary.cancelled || 0
    ]
    distributionLabels = ['Completed', 'Scheduled', 'Cancelled']
  } else if (selectedReportType.value === 'hiv-summary' && data.summary) {
    distributionData = [
      data.summary.reactive_count || 0,
      data.summary.non_reactive_count || 0,
      data.summary.indeterminate_count || 0
    ]
    distributionLabels = ['Reactive', 'Non-Reactive', 'Indeterminate']
  } else if (selectedReportType.value === 'queue' && data.metrics?.stream_metrics) {
    distributionData = data.metrics.stream_metrics.map(s => s.total)
    distributionLabels = data.metrics.stream_metrics.map(s => 
      s.queue_stream === 'CONSULTATION' ? 'Consultation' : 'Testing'
    )
  }
  
  if (distributionChart.value && distributionData.length > 0 && distributionData.some(d => d > 0)) {
    const ctx = distributionChart.value.getContext('2d')
    distributionChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: distributionLabels,
        datasets: [{
          data: distributionData,
          backgroundColor: ['#4caf50', '#ff9800', '#2196f3', '#f44336']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    })
  }
}

const onReportTypeChange = () => {
  // Reset additional filters
  additionalFilters.value = {
    status: null,
    hivStatus: null,
    sex: null,
    testType: null,
    stream: null,
    queueStatus: null
  }
  // Auto-generate report
  generateReport()
}

const refreshData = () => {
  generateReport()
}

const viewDetails = (item) => {
  if (selectedReportType.value === 'appointments') {
    router.push(`/appointments/${item.id}`)
  } else if (selectedReportType.value === 'patients') {
    router.push(`/patients/${item.id}`)
  }
}

const getStatusColor = (status) => {
  const colors = {
    COMPLETED: 'success',
    SCHEDULED: 'info',
    CONFIRMED: 'primary',
    IN_PROGRESS: 'warning',
    CANCELLED: 'error',
    NO_SHOW: 'error'
  }
  return colors[status] || 'grey'
}

const getHIVStatusColor = (status) => {
  const colors = {
    REACTIVE: 'warning',
    NON_REACTIVE: 'success',
    INDETERMINATE: 'info'
  }
  return colors[status] || 'grey'
}

const getStreamColor = (stream) => {
  const colors = {
    CONSULTATION: 'primary',
    TESTING: 'secondary'
  }
  return colors[stream] || 'grey'
}

// Lifecycle
onMounted(() => {
  fetchReportTypes()
  generateReport()
})
</script>

<style scoped>
.v-card {
  transition: all 0.3s ease;
}

.v-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
}

.text-success {
  color: #4caf50 !important;
}

.text-error {
  color: #f44336 !important;
}

.text-warning {
  color: #ff9800 !important;
}
</style>