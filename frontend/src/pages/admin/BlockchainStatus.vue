<!-- frontend/src/pages/admin/BlockchainStatus.vue -->
<template>
  <div class="blockchain-status-page">
    <v-row>
      <v-col cols="12">
        <div class="d-flex justify-space-between align-center mb-4">
          <div>
            <h1 class="text-h4 font-weight-bold">Blockchain Status</h1>
            <p class="text-subtitle-1 text-medium-emphasis mt-1">
              MultiChain Network Monitoring & Verification
            </p>
          </div>
          <v-btn
            color="primary"
            variant="flat"
            @click="refreshAllData"
            :loading="loading"
            prepend-icon="mdi-refresh"
          >
            Refresh Status
          </v-btn>
        </div>
      </v-col>
    </v-row>

    <!-- Network Overview Cards -->
    <v-row>
      <v-col cols="12" md="3">
        <v-card elevation="2" class="status-card">
          <v-card-text>
            <div class="d-flex align-center justify-space-between">
              <div>
                <div class="text-caption text-medium-emphasis">Network Status</div>
                <div class="text-h5 font-weight-bold mt-1">
                  {{ networkStatus }}
                </div>
              </div>
              <v-icon :color="networkColor" size="40">mdi-radiology-box</v-icon>
            </div>
            <v-divider class="my-3"></v-divider>
            <div class="d-flex justify-space-between">
              <div class="text-caption">Node Count</div>
              <div class="text-body-2 font-weight-medium">{{ nodeCount }}</div>
            </div>
            <div class="d-flex justify-space-between mt-1">
              <div class="text-caption">Connections</div>
              <div class="text-body-2 font-weight-medium">{{ connections }}</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="3">
        <v-card elevation="2" class="status-card">
          <v-card-text>
            <div class="d-flex align-center justify-space-between">
              <div>
                <div class="text-caption text-medium-emphasis">Blockchain Height</div>
                <div class="text-h5 font-weight-bold mt-1">
                  {{ formatNumber(stats.total_blocks) }}
                </div>
              </div>
              <v-icon color="info" size="40">mdi-cube-outline</v-icon>
            </div>
            <v-divider class="my-3"></v-divider>
            <div class="d-flex justify-space-between">
              <div class="text-caption">Latest Block</div>
              <div class="text-body-2 font-weight-medium">#{{ latestBlockHeight }}</div>
            </div>
            <div class="d-flex justify-space-between mt-1">
              <div class="text-caption">Difficulty</div>
              <div class="text-body-2 font-weight-medium">{{ formatDifficulty(stats.difficulty) }}</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="3">
        <v-card elevation="2" class="status-card">
          <v-card-text>
            <div class="d-flex align-center justify-space-between">
              <div>
                <div class="text-caption text-medium-emphasis">Chain Size</div>
                <div class="text-h5 font-weight-bold mt-1">
                  {{ formatBytes(stats.chain_size) }}
                </div>
              </div>
              <v-icon color="warning" size="40">mdi-database</v-icon>
            </div>
            <v-divider class="my-3"></v-divider>
            <div class="d-flex justify-space-between">
              <div class="text-caption">Streams</div>
              <div class="text-body-2 font-weight-medium">{{ stats.streams || 0 }}</div>
            </div>
            <div class="d-flex justify-space-between mt-1">
              <div class="text-caption">Version</div>
              <div class="text-body-2 font-weight-medium">{{ stats.version || 'N/A' }}</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="3">
        <v-card elevation="2" class="status-card">
          <v-card-text>
            <div class="d-flex align-center justify-space-between">
              <div>
                <div class="text-caption text-medium-emphasis">Integrity Status</div>
                <div class="text-h5 font-weight-bold mt-1">
                  {{ verificationResult.valid ? 'Verified' : 'Compromised' }}
                </div>
              </div>
              <v-icon :color="verificationResult.valid ? 'success' : 'error'" size="40">
                {{ verificationResult.valid ? 'mdi-shield-check' : 'mdi-shield-alert' }}
              </v-icon>
            </div>
            <v-divider class="my-3"></v-divider>
            <div class="d-flex justify-space-between">
              <div class="text-caption">Blocks Verified</div>
              <div class="text-body-2 font-weight-medium">{{ verifiedBlocksCount }}</div>
            </div>
            <div class="d-flex justify-space-between mt-1">
              <div class="text-caption">Last Audit</div>
              <div class="text-body-2 font-weight-medium">{{ lastAuditTime }}</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Blockchain Details Section -->
    <v-row>
      <v-col cols="12" lg="8">
        <v-card elevation="2">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-chart-line</v-icon>
            Blockchain Metrics
            <v-spacer></v-spacer>
            <v-chip color="primary" size="small" variant="outlined">
              Real-time
            </v-chip>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <!-- Block Growth Chart -->
            <div class="chart-container mb-4">
              <div class="d-flex justify-space-between align-center mb-3">
                <span class="text-subtitle-1 font-weight-medium">Block Growth (Last 30 Days)</span>
                <v-btn-toggle v-model="chartPeriod" density="compact" divided>
                  <v-btn value="week" size="small">Week</v-btn>
                  <v-btn value="month" size="small">Month</v-btn>
                  <v-btn value="quarter" size="small">Quarter</v-btn>
                </v-btn-toggle>
              </div>
              <canvas ref="blockChartCanvas" id="blockChart"></canvas>
              <div v-if="chartLoading" class="chart-loading-overlay">
                <v-progress-circular indeterminate color="primary"></v-progress-circular>
              </div>
            </div>

            <v-divider class="my-4"></v-divider>

            <!-- Recent Blocks Table -->
            <div>
              <div class="d-flex justify-space-between align-center mb-3">
                <span class="text-subtitle-1 font-weight-medium">Recent Blocks</span>
                <v-btn
                  size="small"
                  variant="text"
                  @click="fetchRecentBlocks"
                  :loading="blocksLoading"
                >
                  <v-icon left>mdi-refresh</v-icon>
                  Refresh
                </v-btn>
              </div>
              <v-table density="compact" class="recent-blocks-table">
                <thead>
                  <tr>
                    <th>Height</th>
                    <th>Hash</th>
                    <th>Timestamp</th>
                    <th>Transactions</th>
                    <th>Size</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="block in recentBlocks" :key="block.height">
                    <td class="font-weight-medium">#{{ block.height }}</td>
                    <td class="text-caption">
                      <span class="hash-text">{{ block.hash?.substring(0, 16) }}...</span>
                      <v-icon
                        size="small"
                        class="ml-1 copy-icon"
                        @click="copyToClipboard(block.hash)"
                      >mdi-content-copy</v-icon>
                    </td>
                    <td>{{ formatDateTime(block.timestamp) }}</td>
                    <td>{{ block.transaction_count || 0 }}</td>
                    <td>{{ formatBytes(block.size) }}</td>
                    <td>
                      <v-chip :color="block.verified ? 'success' : 'warning'" size="x-small">
                        {{ block.verified ? 'Verified' : 'Pending' }}
                      </v-chip>
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" lg="4">
        <!-- Streams Information -->
        <v-card elevation="2" class="mb-4">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-rss</v-icon>
            Blockchain Streams
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <v-list density="compact">
              <v-list-item v-for="stream in streams" :key="stream.name">
                <template v-slot:prepend>
                  <v-icon :color="getStreamColor(stream.name)">mdi-code-braces</v-icon>
                </template>
                <v-list-item-title class="text-body-2">
                  {{ stream.name }}
                </v-list-item-title>
                <v-list-item-subtitle class="text-caption">
                  {{ stream.items }} items • {{ formatBytes(stream.size) }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>

        <!-- Verification Details -->
        <v-card elevation="2" class="mb-4">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-shield-lock</v-icon>
            Integrity Verification
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <div class="d-flex align-center justify-space-between mb-3">
              <span class="text-caption">Verification Status</span>
              <v-chip :color="verificationResult.valid ? 'success' : 'error'" size="small">
                {{ verificationResult.valid ? 'PASSED' : 'FAILED' }}
              </v-chip>
            </div>
            <v-progress-linear
              :model-value="verificationProgress"
              :color="verificationResult.valid ? 'success' : 'error'"
              height="8"
              rounded
            ></v-progress-linear>
            <div class="text-caption mt-2 text-center">
              {{ verificationResult.message }}
            </div>

            <v-divider class="my-3"></v-divider>

            <div class="d-flex justify-space-between">
              <div>
                <div class="text-caption text-medium-emphasis">Total Verifications</div>
                <div class="text-h6">{{ verificationResult.total_verified || 0 }}</div>
              </div>
              <div>
                <div class="text-caption text-medium-emphasis">Failed Checks</div>
                <div class="text-h6" :class="verificationResult.failed_checks ? 'text-error' : ''">
                  {{ verificationResult.failed_checks || 0 }}
                </div>
              </div>
              <div>
                <div class="text-caption text-medium-emphasis">Integrity Score</div>
                <div class="text-h6">{{ integrityScore }}%</div>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <!-- Node Information -->
        <v-card elevation="2">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-server-network</v-icon>
            Node Information
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <v-list density="compact">
              <v-list-item>
                <v-list-item-title class="text-caption text-medium-emphasis">Node Address</v-list-item-title>
                <v-list-item-subtitle class="text-body-2">
                  {{ stats.node_address || 'localhost:7204' }}
                </v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title class="text-caption text-medium-emphasis">Chain Name</v-list-item-title>
                <v-list-item-subtitle class="text-body-2">
                  {{ stats.chain_name || 'omph_hiv_chain' }}
                </v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title class="text-caption text-medium-emphasis">Protocol Version</v-list-item-title>
                <v-list-item-subtitle class="text-body-2">
                  {{ stats.protocol_version || '2.0' }}
                </v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title class="text-caption text-medium-emphasis">Mining Status</v-list-item-title>
                <v-list-item-subtitle class="text-body-2">
                  <v-chip :color="stats.mining ? 'success' : 'default'" size="x-small">
                    {{ stats.mining ? 'Active' : 'Inactive' }}
                  </v-chip>
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>

            <v-btn
              block
              variant="outlined"
              color="primary"
              class="mt-3"
              @click="runDiagnostics"
              :loading="diagnosticsLoading"
            >
              Run Diagnostics
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Diagnostics Dialog -->
    <v-dialog v-model="diagnosticsDialog" max-width="800px">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">mdi-clipboard-list</v-icon>
          Blockchain Diagnostics Results
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" variant="text" @click="diagnosticsDialog = false"></v-btn>
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="mt-3">
          <div v-for="(result, index) in diagnosticsResults" :key="index" class="mb-3">
            <div class="d-flex align-center">
              <v-icon :color="result.passed ? 'success' : 'error'" size="small" class="mr-2">
                {{ result.passed ? 'mdi-check-circle' : 'mdi-alert-circle' }}
              </v-icon>
              <span class="font-weight-medium">{{ result.test }}</span>
            </div>
            <div class="text-caption ml-6 mt-1 text-medium-emphasis">
              {{ result.message }}
            </div>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="diagnosticsDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { blockchainApi } from '@/api'
import Chart from 'chart.js/auto'

// State
const loading = ref(false)
const blocksLoading = ref(false)
const diagnosticsLoading = ref(false)
const chartLoading = ref(false)
const stats = ref({})
const recentBlocks = ref([])
const streams = ref([])
const verificationResult = ref({ valid: true, message: 'Blockchain integrity verified' })
const chartPeriod = ref('month')
const diagnosticsDialog = ref(false)
const diagnosticsResults = ref([])
let blockChart = null
let refreshInterval = null
let abortController = null
const blockChartCanvas = ref(null)

// Computed properties
const networkStatus = ref('Connecting...')
const networkColor = ref('warning')
const nodeCount = ref(1)
const connections = ref(0)
const latestBlockHeight = ref(0)
const verifiedBlocksCount = ref(0)
const lastAuditTime = ref('Never')

const verificationProgress = ref(100)
const integrityScore = ref(100)

// Methods
const formatNumber = (num) => {
  if (!num) return '0'
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(2) + 'K'
  return num.toString()
}

const formatBytes = (bytes) => {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleString()
}

const formatDifficulty = (difficulty) => {
  if (!difficulty) return 'N/A'
  if (difficulty >= 1000000) return (difficulty / 1000000).toFixed(2) + 'M'
  if (difficulty >= 1000) return (difficulty / 1000).toFixed(2) + 'K'
  return difficulty.toString()
}

const getStreamColor = (streamName) => {
  if (streamName.includes('patient')) return 'info'
  if (streamName.includes('appointment')) return 'primary'
  if (streamName.includes('lab')) return 'warning'
  if (streamName.includes('audit')) return 'success'
  return 'default'
}

const copyToClipboard = (text) => {
  if (!text) return
  navigator.clipboard.writeText(text)
}

const fetchBlockchainInfo = async () => {
  try {
    const response = await blockchainApi.getInfo()
    // response structure: { success: true, data: {...} }
    if (response.success && response.data) {
      stats.value = response.data
      
      // Update computed values
      latestBlockHeight.value = stats.value.total_blocks || 0
      connections.value = stats.value.connections || 0
      networkStatus.value = stats.value.is_valid?.valid !== false ? 'Connected' : 'Warning'
      networkColor.value = stats.value.is_valid?.valid !== false ? 'success' : 'warning'
      
      // Update verification results
      if (stats.value.is_valid) {
        verificationResult.value = stats.value.is_valid
        verificationProgress.value = verificationResult.value.valid ? 100 : 70
        integrityScore.value = verificationResult.value.valid ? 100 : 85
      }
      
      console.log('Blockchain info loaded:', stats.value.total_blocks, 'blocks')
    } else {
      console.error('Invalid response structure:', response)
    }
  } catch (error) {
    console.error('Error fetching blockchain info:', error)
    networkStatus.value = 'Error'
    networkColor.value = 'error'
  }
}

const fetchRecentBlocks = async () => {
  blocksLoading.value = true
  try {
    const response = await blockchainApi.getBlocks({ limit: 10 })
    // response structure: { success: true, data: [...] }
    if (response.success && Array.isArray(response.data)) {
      recentBlocks.value = response.data
      verifiedBlocksCount.value = recentBlocks.value.filter(b => b.verified).length
      console.log('Recent blocks loaded:', recentBlocks.value.length)
    } else {
      console.error('Invalid blocks response:', response)
      recentBlocks.value = []
    }
  } catch (error) {
    console.error('Error fetching recent blocks:', error)
    recentBlocks.value = []
  } finally {
    blocksLoading.value = false
  }
}

const fetchStreams = async () => {
  try {
    const response = await blockchainApi.getStreams()
    // response structure: { success: true, data: [...] }
    if (response.success && Array.isArray(response.data)) {
      streams.value = response.data
      console.log('Streams loaded:', streams.value.length)
    } else {
      console.error('Invalid streams response:', response)
      streams.value = []
    }
  } catch (error) {
    console.error('Error fetching streams:', error)
    streams.value = []
  }
}

const verifyBlockchain = async () => {
  try {
    const response = await blockchainApi.verify()
    // response structure: { success: true, data: {...} }
    if (response.success && response.data) {
      verificationResult.value = response.data
      lastAuditTime.value = new Date().toLocaleString()
      console.log('Verification result:', verificationResult.value.valid ? 'PASSED' : 'FAILED')
    } else {
      console.error('Invalid verification response:', response)
    }
  } catch (error) {
    console.error('Error verifying blockchain:', error)
  }
}

const createOrUpdateChart = (labels, data) => {
  // Wait for DOM to be ready
  nextTick(() => {
    const canvas = document.getElementById('blockChart')
    if (!canvas) {
      console.warn('Canvas element not found')
      return
    }
    
    const ctx = canvas.getContext('2d')
    
    // Destroy existing chart if exists
    if (blockChart) {
      try {
        blockChart.destroy()
      } catch (e) {
        console.warn('Error destroying chart:', e)
      }
      blockChart = null
    }
    
    // Create new chart only if we have data
    if (labels && labels.length > 0 && data && data.length > 0) {
      blockChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Blocks Created',
            data: data,
            borderColor: '#2196F3',
            backgroundColor: 'rgba(33, 150, 243, 0.1)',
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              position: 'top',
            },
            tooltip: {
              mode: 'index',
              intersect: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Number of Blocks'
              }
            },
            x: {
              title: {
                display: true,
                text: 'Date'
              }
            }
          }
        }
      })
    }
  })
}

const updateChartData = (labels, data) => {
  if (blockChart && blockChart.data) {
    // Update existing chart
    blockChart.data.labels = labels
    blockChart.data.datasets[0].data = data
    blockChart.update()
  } else {
    // Create new chart
    createOrUpdateChart(labels, data)
  }
}

const fetchBlockGrowthData = async () => {
  chartLoading.value = true
  
  // Cancel previous request if exists
  if (abortController) {
    abortController.abort()
  }
  
  abortController = new AbortController()
  
  try {
    const response = await blockchainApi.getBlockGrowth(
      { period: chartPeriod.value }, 
      { signal: abortController.signal }
    )
    
    // response structure: { success: true, data: {...}, warning: '...' }
    if (response.success && response.data) {
      const growthData = response.data
      
      // Check if we have a warning about simulated data
      if (response.warning) {
        console.warn('Blockchain growth data warning:', response.warning)
      }
      
      // Ensure we have valid data
      const labels = growthData.timestamps || []
      const data = growthData.blocks || []
      
      if (labels.length > 0 && data.length > 0) {
        updateChartData(labels, data)
        console.log('Chart data loaded:', labels.length, 'points')
      } else {
        console.warn('No chart data available')
      }
    } else {
      console.error('Invalid growth data response:', response)
    }
  } catch (error) {
    if (error.name !== 'AbortError' && error.name !== 'CanceledError') {
      console.error('Error fetching block growth data:', error)
    }
  } finally {
    chartLoading.value = false
    abortController = null
  }
}

const runDiagnostics = async () => {
  diagnosticsLoading.value = true
  diagnosticsDialog.value = true
  
  try {
    const response = await blockchainApi.diagnostics()
    // response structure: { success: true, data: [...] }
    if (response.success && Array.isArray(response.data)) {
      diagnosticsResults.value = response.data
      console.log('Diagnostics loaded:', diagnosticsResults.value.length)
    } else {
      console.error('Invalid diagnostics response:', response)
      diagnosticsResults.value = [
        { test: 'Diagnostics Error', passed: false, message: 'Invalid response from server' }
      ]
    }
  } catch (error) {
    console.error('Error running diagnostics:', error)
    diagnosticsResults.value = [
      { test: 'Diagnostics Error', passed: false, message: error.message }
    ]
  } finally {
    diagnosticsLoading.value = false
  }
}

const refreshAllData = async () => {
  loading.value = true
  try {
    console.log('Refreshing all blockchain data...')
    await Promise.all([
      fetchBlockchainInfo(),
      fetchRecentBlocks(),
      fetchStreams(),
      verifyBlockchain()
    ])
    // Fetch growth data separately
    await fetchBlockGrowthData()
    console.log('All data refreshed successfully')
  } catch (error) {
    console.error('Error refreshing data:', error)
  } finally {
    loading.value = false
  }
}

// Watch for period changes
watch(chartPeriod, () => {
  fetchBlockGrowthData()
})

// Lifecycle
onMounted(() => {
  // Small delay to ensure DOM is ready
  setTimeout(() => {
    refreshAllData()
  }, 100)
  
  // Set up auto-refresh every 30 seconds
  refreshInterval = setInterval(() => {
    fetchBlockchainInfo()
    fetchRecentBlocks()
  }, 30000)
})

onUnmounted(() => {
  // Clear refresh interval
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
  
  // Cancel any pending requests
  if (abortController) {
    abortController.abort()
  }
  
  // Destroy chart
  if (blockChart) {
    try {
      blockChart.destroy()
    } catch (e) {
      console.warn('Error destroying chart:', e)
    }
    blockChart = null
  }
})
</script>

<style scoped>
.blockchain-status-page {
  padding: 16px;
}

.status-card {
  transition: transform 0.2s, box-shadow 0.2s;
}

.status-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
}

.chart-container {
  min-height: 300px;
  position: relative;
}

.chart-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.recent-blocks-table {
  font-size: 0.875rem;
}

.hash-text {
  font-family: monospace;
  font-size: 0.75rem;
}

.copy-icon {
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.copy-icon:hover {
  opacity: 1;
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .blockchain-status-page {
    padding: 8px;
  }
  
  .chart-container {
    min-height: 200px;
  }
}
</style>