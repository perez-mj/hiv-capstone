<!-- src/components/TestConnection.vue -->
<template>
  <v-alert type="info" density="compact" class="mb-4">
    <div class="d-flex align-center justify-space-between">
      <div>
        <strong>Connection Status:</strong>
        <span class="ml-2" :class="connectionClass">
          {{ connectionText }}
        </span>
      </div>
      <v-btn 
        v-if="connectionStatus === 'failed'" 
        @click="testConnection" 
        size="x-small" 
        variant="outlined"
        :loading="testing"
      >
        Retry
      </v-btn>
    </div>
    <div v-if="connectionStatus === 'failed'" class="mt-2 text-caption">
      <v-icon size="small" class="mr-1">mdi-alert</v-icon>
      Make sure backend is running on http://localhost:5000
    </div>
  </v-alert>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import http from '@/api/http'

const testing = ref(false)
const connectionStatus = ref('checking')

const connectionText = computed(() => {
  switch(connectionStatus.value) {
    case 'checking': return 'Checking...'
    case 'success': return 'Connected ✅'
    case 'failed': return 'Disconnected ❌'
    default: return 'Unknown'
  }
})

const connectionClass = computed(() => {
  switch(connectionStatus.value) {
    case 'success': return 'text-success'
    case 'failed': return 'text-error'
    default: return 'text-warning'
  }
})

const testConnection = async () => {
  testing.value = true
  try {
    // Try to reach the backend
    const response = await http.get('/auth/check', {
      timeout: 3000,
      validateStatus: (status) => status < 500 // Don't throw on 401/403
    })
    
    if (response.status === 200 || response.status === 401) {
      connectionStatus.value = 'success'
    } else {
      connectionStatus.value = 'failed'
    }
  } catch (error) {
    console.log('Connection test failed:', error.message)
    connectionStatus.value = 'failed'
  } finally {
    testing.value = false
  }
}

onMounted(() => {
  testConnection()
})
</script>