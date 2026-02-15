<!-- src/pages/kiosk/QueueDisplay.vue -->
<template>
  <v-app>
    <!-- Header for display screen -->
    <v-app-bar :color="colors.primaryDark" dark height="64">
      <v-container class="d-flex align-center">
        <v-icon size="32" class="mr-3">mdi-television</v-icon>
        <v-toolbar-title class="text-h5 font-weight-bold">
          Patient Queue Status
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <div class="text-h6">
          {{ currentTime }}
        </div>
      </v-container>
    </v-app-bar>

    <v-main class="bg-grey-darken-4">
      <v-container fluid class="pa-4 fill-height">
        <!-- Currently Serving - Prominent -->
        <v-row class="mb-4">
          <v-col>
            <v-card
              :color="colors.accent"
              dark
              class="text-center py-4"
              elevation="8"
            >
              <div class="text-overline">CURRENTLY SERVING</div>
              <div class="text-h1 font-weight-bold">
                {{ currentlyServing ? currentlyServing.queue_number : '---' }}
              </div>
              <div class="text-subtitle-1">
                {{ currentlyServing ? currentlyServing.service_name : 'No patient being served' }}
              </div>
            </v-card>
          </v-col>
        </v-row>

        <!-- Waiting Queue -->
        <v-row>
          <v-col cols="12">
            <v-card elevation="4">
              <v-card-title class="text-h6 py-2" :style="{ backgroundColor: colors.primary, color: 'white' }">
                <v-icon left>mdi-format-list-bulleted</v-icon>
                Next in Queue
                <v-spacer></v-spacer>
                <v-chip dark :color="colors.accent">
                  {{ waitingQueue.length }} waiting
                </v-chip>
              </v-card-title>

              <v-list lines="two" class="pa-0">
                <v-list-item
                  v-for="(item, index) in waitingQueue"
                  :key="item.id"
                  :class="{ 'priority-item': item.priority > 0 }"
                >
                  <template v-slot:prepend>
                    <v-avatar
                      :color="index === 0 ? colors.accent : colors.primary"
                      size="56"
                      class="mr-4"
                    >
                      <span class="text-h5 font-weight-bold white--text">
                        {{ item.queue_number }}
                      </span>
                    </v-avatar>
                  </template>

                  <v-list-item-title class="text-h6">
                    {{ item.service_name }}
                  </v-list-item-title>
                  
                  <v-list-item-subtitle>
                    Registered: {{ item.registered_time }}
                  </v-list-item-subtitle>

                  <template v-slot:append>
                    <div class="text-right">
                      <div class="text-h6" :class="{ 'text-warning': item.priority > 0 }">
                        {{ item.estimated_wait }} min
                      </div>
                      <div class="text-caption">est. wait</div>
                    </div>
                  </template>
                </v-list-item>

                <v-list-item v-if="waitingQueue.length === 0">
                  <v-list-item-title class="text-center pa-8">
                    No patients in queue
                  </v-list-item-title>
                </v-list-item>
              </v-list>
            </v-card>
          </v-col>
        </v-row>

        <!-- Instructions Footer -->
        <v-footer
          :color="colors.warning"
          dark
          height="48"
          class="mt-4"
        >
          <v-container class="d-flex align-center">
            <v-icon class="mr-3">mdi-information</v-icon>
            <div class="text-subtitle-2">
              Please wait for your number to be called. Priority patients will be served first.
            </div>
          </v-container>
        </v-footer>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import colors from '@/config/colors'

const currentTime = ref(new Date().toLocaleTimeString())
const currentlyServing = ref(null)
const waitingQueue = ref([])

// Load queue data
const loadQueue = async () => {
  try {
    const response = await axios.get('/api/queue/display')
    currentlyServing.value = response.data.currently_serving
    waitingQueue.value = response.data.waiting.slice(0, 10) // Show next 10
  } catch (error) {
    console.error('Failed to load queue:', error)
  }
}

// Update time and refresh queue
let timeInterval, queueInterval
onMounted(() => {
  loadQueue()
  
  timeInterval = setInterval(() => {
    currentTime.value = new Date().toLocaleTimeString()
  }, 1000)
  
  queueInterval = setInterval(loadQueue, 5000) // Refresh every 5 seconds
})

onUnmounted(() => {
  clearInterval(timeInterval)
  clearInterval(queueInterval)
})
</script>

<style scoped>
/* Large display styles */
.v-list-item {
  min-height: 80px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.v-list-item:last-child {
  border-bottom: none;
}

.priority-item {
  background-color: rgba(255, 152, 0, 0.15);
  border-left: 4px solid v-bind('colors.warning');
}

.text-warning {
  color: v-bind('colors.warning') !important;
  font-weight: bold;
}
</style>