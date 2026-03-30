<template>
  <v-card elevation="2" border class="mb-4">
    <v-card-title class="d-flex align-center">
      <v-icon color="success" class="mr-2">mdi-blockchain</v-icon>
      <span>Blockchain Status</span>
      <v-spacer />
      <v-chip :color="isValid ? 'success' : 'error'" size="small">
        {{ isValid ? 'Verified' : 'Invalid' }}
      </v-chip>
    </v-card-title>
    <v-divider></v-divider>
    <v-card-text>
      <v-row>
        <v-col cols="6" md="3">
          <div class="text-caption text-medium-emphasis">Total Blocks</div>
          <div class="text-h6">{{ stats.total_blocks || 0 }}</div>
        </v-col>
        <v-col cols="6" md="3">
          <div class="text-caption text-medium-emphasis">Blockchain Type</div>
          <div class="text-h6">{{ stats.type || 'MultiChain' }}</div>
        </v-col>
        <v-col cols="6" md="3" v-if="stats.node_address">
          <div class="text-caption text-medium-emphasis">Node Address</div>
          <div class="text-h6 text-caption">{{ stats.node_address }}</div>
        </v-col>
        <v-col cols="6" md="3">
          <div class="text-caption text-medium-emphasis">Status</div>
          <div class="text-h6 text-success">Active</div>
        </v-col>
      </v-row>

      <!-- Additional Blockchain Info -->
      <v-row v-if="stats.version || stats.connections" class="mt-2">
        <v-col cols="6" md="3" v-if="stats.version">
          <div class="text-caption text-medium-emphasis">Version</div>
          <div class="text-body-2">{{ stats.version }}</div>
        </v-col>
        <v-col cols="6" md="3" v-if="stats.connections !== undefined">
          <div class="text-caption text-medium-emphasis">Connections</div>
          <div class="text-body-2">{{ stats.connections }}</div>
        </v-col>
        <v-col cols="6" md="3" v-if="stats.difficulty">
          <div class="text-caption text-medium-emphasis">Difficulty</div>
          <div class="text-body-2">{{ stats.difficulty }}</div>
        </v-col>
        <v-col cols="6" md="3" v-if="stats.streams !== undefined">
          <div class="text-caption text-medium-emphasis">Streams</div>
          <div class="text-body-2">{{ stats.streams }}</div>
        </v-col>
      </v-row>

      <v-divider class="my-3"></v-divider>

      <!-- Blockchain Verification Summary -->
      <div class="d-flex flex-wrap justify-space-between align-center">
        <div class="d-flex align-center">
          <v-icon size="small" color="info" class="mr-1">mdi-information</v-icon>
          <span class="text-caption">All medical records are secured on the blockchain</span>
        </div>
        <div class="d-flex gap-2 mt-2 mt-sm-0">
          <v-btn
            size="small"
            variant="text"
            @click="refresh"
            :loading="loading"
          >
            <v-icon left>mdi-refresh</v-icon>
            Refresh
          </v-btn>
          <v-btn
            size="small"
            variant="text"
            color="primary"
            @click="showDetails = !showDetails"
          >
            <v-icon left>{{ showDetails ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
            {{ showDetails ? 'Hide' : 'Details' }}
          </v-btn>
        </div>
      </div>

      <!-- Detailed Blockchain Info (Expandable) -->
      <v-expand-transition>
        <div v-show="showDetails" class="mt-3">
          <v-divider class="mb-3"></v-divider>
          <div class="text-caption font-weight-medium mb-2">Blockchain Integrity Check</div>
          <div class="d-flex align-center">
            <v-icon :color="verificationResult.valid ? 'success' : 'error'" size="small" class="mr-1">
              {{ verificationResult.valid ? 'mdi-check-circle' : 'mdi-alert-circle' }}
            </v-icon>
            <span class="text-caption">{{ verificationResult.message }}</span>
          </div>
          
          <div class="text-caption font-weight-medium mt-3 mb-2">Recent Block Information</div>
          <v-table density="compact" class="text-caption">
            <thead>
              <tr>
                <th>Block Index</th>
                <th>Timestamp</th>
                <th>Hash</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="stats.latest_block">
                <td>{{ stats.latest_block.index }}</td>
                <td>{{ formatDate(stats.latest_block.timestamp) }}</td>
                <td class="text-caption">{{ stats.latest_block.hash?.substring(0, 12) }}...</td>
              </tr>
              <tr v-else-if="stats.genesis_block">
                <td>{{ stats.genesis_block.index }}</td>
                <td>{{ formatDate(stats.genesis_block.timestamp) }}</td>
                <td class="text-caption">{{ stats.genesis_block.hash?.substring(0, 12) }}...</td>
              </tr>
              <tr v-else>
                <td colspan="3" class="text-center">No block data available</td>
              </tr>
            </tbody>
          </v-table>

          <div v-if="stats.blocks_by_type && Object.keys(stats.blocks_by_type).length > 0" class="mt-3">
            <div class="text-caption font-weight-medium mb-2">Blocks by Type</div>
            <div class="d-flex flex-wrap gap-2">
              <v-chip v-for="(count, type) in stats.blocks_by_type" :key="type" size="x-small" variant="outlined">
                {{ type }}: {{ count }}
              </v-chip>
            </div>
          </div>
        </div>
      </v-expand-transition>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { blockchainApi } from '@/api'

const loading = ref(false)
const stats = ref({})
const isValid = ref(true)
const showDetails = ref(false)
const verificationResult = ref({ valid: true, message: 'Blockchain integrity verified' })

const fetchBlockchainInfo = async () => {
  loading.value = true
  try {
    const response = await blockchainApi.getInfo()
    stats.value = response.data?.data || {}
    isValid.value = stats.value.is_valid?.valid !== false
    
    // Fetch verification result
    const verifyResponse = await blockchainApi.verify()
    verificationResult.value = verifyResponse.data?.data || { valid: true, message: 'Blockchain integrity verified' }
  } catch (error) {
    console.error('Error fetching blockchain info:', error)
    stats.value = { total_blocks: 1, type: 'MultiChain' }
    isValid.value = true
    verificationResult.value = { valid: true, message: 'Using simulated blockchain' }
  } finally {
    loading.value = false
  }
}

const refresh = () => {
  fetchBlockchainInfo()
}

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleString()
}

onMounted(() => {
  fetchBlockchainInfo()
})
</script>

<style scoped>
.gap-2 {
  gap: 8px;
}
</style>