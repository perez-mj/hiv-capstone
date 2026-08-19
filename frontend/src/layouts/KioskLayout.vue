<!-- frontend/src/layouts/KioskLayout.vue -->
<template>
  <v-app>
    <v-main class="kiosk-main">
      <v-container fluid class="pa-0 fill-height">
        <v-row class="fill-height ma-0">
          <v-col cols="12" class="pa-0 d-flex flex-column">
            <!-- Kiosk Header -->
            <v-card 
              class="kiosk-header rounded-0"
              color="success"
              elevation="4"
            >
              <v-card-text class="d-flex align-center justify-space-between pa-4">
                <div class="d-flex align-center">
                  <v-icon size="48" color="white" class="mr-4">mdi-hospital</v-icon>
                  <div>
                    <div class="text-h5 font-weight-bold text-white">
                      Purple Rain Clinic Kiosk
                    </div>
                    <div class="text-subtitle-1 text-white text-opacity-90">
                      {{ currentDate }}
                    </div>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-h6 text-white">
                    {{ currentTime }}
                  </div>
                </div>
              </v-card-text>
            </v-card>

            <!-- Main Content -->
            <v-card 
              class="flex-grow-1 rounded-0"
              elevation="0"
              flat
            >
              <v-card-text class="pa-6 fill-height">
                <router-view />
              </v-card-text>
            </v-card>

          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const currentDate = ref('')
const currentTime = ref('')
let timer = null

const updateDateTime = () => {
  const now = new Date()
  currentDate.value = now.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
  currentTime.value = now.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  })
}

onMounted(() => {
  updateDateTime()
  timer = setInterval(updateDateTime, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.kiosk-main {
  background: #f5f5f5;
  min-height: 100vh;
}

.kiosk-header {
  min-height: 100px;
}

.kiosk-footer {
  min-height: 40px;
}

/* Touchscreen optimization */
@media (max-width: 600px) {
  .kiosk-header {
    min-height: 80px;
  }
  
  :deep(.v-btn) {
    min-height: 56px !important;
    font-size: 1.1rem !important;
  }
  
  :deep(.v-field) {
    font-size: 1.1rem !important;
  }
  
  :deep(.v-input) {
    font-size: 1.1rem !important;
  }
}
</style>