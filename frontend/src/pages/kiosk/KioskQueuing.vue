<!-- src/pages/kiosk/KioskQueuing.vue -->
<template>
  <v-app>
    <!-- Compact App Bar -->
    <v-app-bar elevation="4" :color="colors.primary" dark height="48">
      <v-container class="d-flex align-center py-0 fill-height">
        <v-icon size="24" class="mr-2">mdi-hospital-building</v-icon>
        <v-toolbar-title class="text-subtitle-1 font-weight-bold">
          HIV Care Kiosk
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn variant="text" to="/admin/dashboard" size="small" density="comfortable" class="mr-1">
          <v-icon left size="16">mdi-shield-account</v-icon>
          <span class="text-caption">Staff</span>
        </v-btn>
        <v-btn variant="text" to="/kiosk/display" size="small" density="comfortable">
          <v-icon left size="16">mdi-television</v-icon>
          <span class="text-caption">Display</span>
        </v-btn>
      </v-container>
    </v-app-bar>

    <!-- Main Content - Fixed height calculation -->
    <v-main class="bg-grey-lighten-4" style="height: calc(100vh - 84px); overflow-y: auto;">
      <v-container fluid class="pa-2 fill-height">
        <v-row class="fill-height ma-0" no-gutters>
          <!-- Left Column - Check-in Form -->
          <v-col cols="12" md="7" class="pa-1">
            <v-card elevation="2" class="rounded-lg h-100 d-flex flex-column">
              <!-- Card Header -->
              <v-card-title class="text-subtitle-2 py-2 px-3" :style="{ backgroundColor: colors.primary, color: 'white' }">
                <v-icon size="18" class="mr-1">mdi-account-check</v-icon>
                Patient Check-in
              </v-card-title>

              <v-card-text class="pa-3 flex-grow-1">
                <v-form ref="checkInForm" v-model="formValid" @submit.prevent="handleCheckIn">
                  <!-- Patient ID Section -->
                  <div class="mb-3">
                    <div class="text-caption font-weight-bold mb-1" :style="{ color: colors.primary }">
                      <v-icon left size="14" :color="colors.primary">mdi-card-account-details</v-icon>
                      Patient Identification
                    </div>
                    <div class="d-flex ga-1">
                      <v-text-field
                        v-model="form.patientId"
                        label="Patient ID"
                        :rules="[rules.required]"
                        variant="outlined"
                        prepend-inner-icon="mdi-identifier"
                        @keyup.enter="searchPatient"
                        :loading="searching"
                        density="compact"
                        hide-details="auto"
                        class="flex-grow-1"
                      ></v-text-field>
                      <v-btn
                        :color="colors.primary"
                        :loading="searching"
                        @click="searchPatient"
                        height="40"
                        min-width="70"
                        class="ml-1"
                      >
                        <v-icon size="18">mdi-magnify</v-icon>
                      </v-btn>
                    </div>
                    
                    <!-- Patient Info Alert -->
                    <v-slide-y-transition>
                      <v-alert
                        v-if="patientFound"
                        :color="colors.success"
                        variant="tonal"
                        class="mt-2 pa-2"
                        density="compact"
                        border="start"
                      >
                        <div class="d-flex align-center">
                          <v-icon :color="colors.success" size="16" class="mr-1">mdi-check-circle</v-icon>
                          <div class="text-caption">
                            <strong>{{ patientInfo.name }}</strong><br>
                            <small>Last visit: {{ patientInfo.lastVisit }}</small>
                          </div>
                        </div>
                      </v-alert>
                    </v-slide-y-transition>
                  </div>

                  <!-- Service Selection -->
                  <div class="mb-3">
                    <div class="text-caption font-weight-bold mb-1" :style="{ color: colors.primary }">
                      <v-icon left size="14" :color="colors.primary">mdi-clipboard-list</v-icon>
                      Select Service
                    </div>
                    <div class="d-flex flex-wrap" style="gap: 4px;">
                      <v-card
                        v-for="service in services"
                        :key="service.id"
                        :class="['service-card flex-grow-1', { 'selected': form.service === service.id }]"
                        :style="{
                          borderColor: form.service === service.id ? colors.primary : 'transparent',
                          borderWidth: '2px',
                          borderStyle: 'solid',
                          flexBasis: 'calc(33.333% - 4px)',
                          maxWidth: 'calc(33.333% - 4px)'
                        }"
                        @click="form.service = service.id"
                        elevation="1"
                      >
                        <div class="d-flex flex-column align-center justify-center pa-1" style="height: 65px;">
                          <v-icon
                            size="18"
                            :color="form.service === service.id ? colors.primary : colors.primaryLight"
                            class="mb-1"
                          >
                            {{ service.icon }}
                          </v-icon>
                          <div class="text-caption font-weight-bold text-center">{{ service.name }}</div>
                          <div class="text-overline">{{ service.estimatedTime }}m</div>
                        </div>
                      </v-card>
                    </div>
                  </div>

                  <!-- Special Requirements -->
                  <div class="mb-2">
                    <div class="d-flex ga-3">
                      <v-checkbox
                        v-model="form.wheelchair"
                        label="Wheelchair"
                        :color="colors.primary"
                        density="compact"
                        hide-details
                        class="mt-0"
                      ></v-checkbox>
                      <v-checkbox
                        v-model="form.translator"
                        label="Interpreter"
                        :color="colors.primary"
                        density="compact"
                        hide-details
                        class="mt-0"
                      ></v-checkbox>
                    </div>
                  </div>

                  <!-- Submit Button -->
                  <v-btn
                    block
                    :color="colors.primary"
                    :loading="submitting"
                    @click="handleCheckIn"
                    class="mt-2"
                    height="44"
                    :disabled="!formValid || !form.service"
                  >
                    <v-icon left>mdi-ticket-confirmation</v-icon>
                    <span class="text-button">Get Queue Number</span>
                  </v-btn>
                </v-form>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Right Column - Queue Display -->
          <v-col cols="12" md="5" class="pa-1">
            <v-card elevation="2" class="rounded-lg h-100 d-flex flex-column">
              <v-card-title class="text-subtitle-2 py-2 px-3 d-flex align-center" :style="{ backgroundColor: colors.primaryDark, color: 'white' }">
                <v-icon left size="16">mdi-format-list-numbered</v-icon>
                <span class="text-caption font-weight-bold">Current Queue</span>
                <v-spacer></v-spacer>
                <v-chip size="x-small" :color="colors.accent" text-color="white">
                  {{ queueStats.totalWaiting }} waiting
                </v-chip>
              </v-card-title>

              <v-card-text class="pa-2 flex-grow-1 d-flex flex-column">
                <!-- Currently Serving -->
                <div class="mb-2">
                  <div class="text-caption font-weight-bold mb-1" :style="{ color: colors.primary }">
                    <v-icon left size="12" :color="colors.primary">mdi-clock-start</v-icon>
                    NOW SERVING
                  </div>
                  <v-card
                    v-if="currentlyServing"
                    :color="colors.accent"
                    dark
                    class="pa-2 text-center"
                    elevation="2"
                  >
                    <div class="text-overline">{{ currentlyServing.service_name }}</div>
                    <div class="text-h3 font-weight-bold">{{ currentlyServing.queue_number }}</div>
                  </v-card>
                  <v-card
                    v-else
                    color="grey-lighten-3"
                    class="pa-2 text-center"
                    elevation="1"
                  >
                    <div class="text-caption">No patient being served</div>
                  </v-card>
                </div>

                <!-- Waiting List -->
                <div class="flex-grow-1 d-flex flex-column" style="min-height: 0;">
                  <div class="text-caption font-weight-bold mb-1" :style="{ color: colors.primary }">
                    <v-icon left size="12" :color="colors.primary">mdi-format-list-bulleted</v-icon>
                    NEXT IN LINE
                  </div>
                  
                  <div class="queue-container flex-grow-1" style="overflow-y: auto; max-height: 280px;">
                    <v-list density="compact" bg-color="transparent" class="pa-0">
                      <v-list-item
                        v-for="(item, index) in waitingQueue"
                        :key="item.id"
                        :class="{ 'urgent-item': item.priority > 0 }"
                        class="pa-1 mb-1"
                        rounded="sm"
                      >
                        <template v-slot:prepend>
                          <v-avatar
                            :color="getQueueColor(index)"
                            size="28"
                            class="mr-2"
                          >
                            <span class="text-caption font-weight-bold white--text">
                              {{ item.queue_number }}
                            </span>
                          </v-avatar>
                        </template>

                        <div class="d-flex align-center justify-space-between w-100">
                          <div>
                            <div class="text-caption font-weight-medium">
                              {{ item.service_name }}
                              <v-chip
                                v-if="item.priority > 0"
                                size="x-small"
                                :color="colors.warning"
                                class="ml-1"
                                text-color="white"
                              >
                                Priority
                              </v-chip>
                            </div>
                            <div class="text-overline">{{ item.registered_time }}</div>
                          </div>
                          <div class="text-caption text-grey">
                            {{ item.estimated_wait }}m
                          </div>
                        </div>
                      </v-list-item>

                      <!-- Empty state -->
                      <v-list-item v-if="waitingQueue.length === 0">
                        <div class="text-center text-caption text-grey pa-3">
                          No patients in queue
                        </div>
                      </v-list-item>
                    </v-list>
                  </div>
                </div>

                <!-- Queue Stats -->
                <v-divider class="my-1"></v-divider>
                <div class="d-flex justify-space-between text-overline mt-1">
                  <span>
                    <v-icon size="12" :color="colors.accent">mdi-check-circle</v-icon>
                    {{ queueStats.servedToday }}
                  </span>
                  <span>
                    <v-icon size="12" :color="colors.warning">mdi-clock</v-icon>
                    {{ queueStats.avgWaitTime }}m
                  </span>
                  <span>
                    <v-icon size="12" :color="colors.secondary">mdi-cancel</v-icon>
                    {{ queueStats.noShowToday }}
                  </span>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>

    <!-- Footer -->
    <v-footer :color="colors.primaryDark" dark height="36">
      <v-container class="d-flex align-center justify-space-between pa-0">
        <span class="text-caption">&copy; {{ new Date().getFullYear() }} HIV Care</span>
        <span class="text-caption">Updated: {{ lastUpdated }}</span>
      </v-container>
    </v-footer>

    <!-- Success Dialog -->
    <v-dialog v-model="showSuccessDialog" max-width="350" persistent>
      <v-card class="text-center pa-3">
        <v-icon :color="colors.success" size="48" class="mb-2">mdi-check-circle</v-icon>
        <div class="text-h6 mb-1" :style="{ color: colors.primary }">
          Check-in Successful!
        </div>
        <div class="text-h2 font-weight-bold my-2" :style="{ color: colors.accent }">
          {{ generatedQueueNumber }}
        </div>
        <div class="text-caption mb-3">
          {{ selectedServiceName }} · Wait: {{ estimatedWait }}m
        </div>
        <v-btn
          :color="colors.primary"
          block
          @click="closeSuccessDialog"
          size="large"
        >
          OK
        </v-btn>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import colors from '@/config/colors'

const router = useRouter()
const checkInForm = ref(null)
const formValid = ref(false)
const searching = ref(false)
const submitting = ref(false)
const patientFound = ref(false)
const showSuccessDialog = ref(false)
const generatedQueueNumber = ref('')
const estimatedWait = ref(0)
const selectedServiceName = ref('')
const lastUpdated = ref(new Date().toLocaleTimeString())

// Form data
const form = reactive({
  patientId: '',
  service: null,
  wheelchair: false,
  translator: false
})

// Patient info
const patientInfo = ref({
  name: '',
  lastVisit: ''
})

// Services
const services = ref([
  { id: 1, name: 'Consultation', icon: 'mdi-doctor', estimatedTime: 30 },
  { id: 2, name: 'Lab Test', icon: 'mdi-test-tube', estimatedTime: 20 },
  { id: 3, name: 'Medication', icon: 'mdi-pill', estimatedTime: 15 },
  { id: 4, name: 'Counseling', icon: 'mdi-heart', estimatedTime: 45 },
  { id: 5, name: 'Emergency', icon: 'mdi-alert', estimatedTime: 60 },
  { id: 6, name: 'Registration', icon: 'mdi-file-document', estimatedTime: 25 }
])

// Queue data
const currentlyServing = ref(null)
const waitingQueue = ref([])

// Mock data for demonstration
currentlyServing.value = {
  queue_number: 'A045',
  service_name: 'Consultation'
}

waitingQueue.value = [
  { id: 1, queue_number: 'A046', service_name: 'Consultation', registered_time: '09:30', estimated_wait: 15, priority: 0 },
  { id: 2, queue_number: 'B032', service_name: 'ART Refill', registered_time: '09:32', estimated_wait: 10, priority: 1 },
  { id: 3, queue_number: 'C018', service_name: 'Lab Test', registered_time: '09:35', estimated_wait: 20, priority: 0 },
  { id: 4, queue_number: 'D007', service_name: 'Counseling', registered_time: '09:38', estimated_wait: 30, priority: 0 },
  { id: 5, queue_number: 'E015', service_name: 'Pharmacy', registered_time: '09:40', estimated_wait: 10, priority: 0 }
]

// Queue statistics
const queueStats = computed(() => {
  return {
    totalWaiting: waitingQueue.value.length,
    servedToday: 42,
    avgWaitTime: 18,
    noShowToday: 3
  }
})

// Validation rules
const rules = {
  required: v => !!v || 'Required'
}

// Search patient
const searchPatient = async () => {
  if (!form.patientId) return
  searching.value = true
  setTimeout(() => {
    patientFound.value = true
    patientInfo.value = {
      name: 'John Doe',
      lastVisit: '2024-02-15'
    }
    searching.value = false
  }, 500)
}

// Handle check-in
const handleCheckIn = async () => {
  if (!formValid.value || !form.service) return
  submitting.value = true
  
  setTimeout(() => {
    const service = services.value.find(s => s.id === form.service)
    generatedQueueNumber.value = 'A046'
    selectedServiceName.value = service.name
    estimatedWait.value = service.estimatedTime
    showSuccessDialog.value = true
    submitting.value = false
    
    // Reset form
    form.patientId = ''
    form.service = null
    form.wheelchair = false
    form.translator = false
    patientFound.value = false
  }, 1500)
}

const getQueueColor = (index) => {
  if (index === 0) return colors.accent
  if (index === 1) return colors.warning
  return colors.primaryLight
}

const closeSuccessDialog = () => {
  showSuccessDialog.value = false
}

// Auto-refresh
let interval
onMounted(() => {
  interval = setInterval(() => {
    lastUpdated.value = new Date().toLocaleTimeString()
  }, 1000)
})

onUnmounted(() => {
  clearInterval(interval)
})
</script>

<style scoped>
/* Fix for 1024x600 resolution */
.v-application {
  font-size: 12px;
}

.h-100 {
  height: 100%;
}

.service-card {
  transition: all 0.2s ease;
  cursor: pointer;
  border-radius: 6px;
}

.service-card:active {
  transform: scale(0.98);
}

.service-card.selected {
  background-color: rgba(32, 100, 85, 0.1);
}

.queue-container {
  scrollbar-width: thin;
  scrollbar-color: rgba(0,0,0,0.2) transparent;
}

.queue-container::-webkit-scrollbar {
  width: 4px;
}

.queue-container::-webkit-scrollbar-thumb {
  background: rgba(0,0,0,0.2);
  border-radius: 4px;
}

.urgent-item {
  background-color: rgba(255, 152, 0, 0.1);
  border-left: 3px solid v-bind('colors.warning');
}

.v-list-item {
  min-height: 36px;
  padding: 4px 8px;
}

/* Ensure proper touch targets */
.v-btn {
  min-width: 40px;
}

/* Responsive fixes */
@media (max-width: 960px) {
  .v-col-md-7,
  .v-col-md-5 {
    flex: 0 0 100%;
    max-width: 100%;
  }
  
  .service-card {
    flex-basis: calc(50% - 4px) !important;
    max-width: calc(50% - 4px) !important;
  }
}

@media (max-width: 600px) {
  .service-card {
    flex-basis: 100% !important;
    max-width: 100% !important;
  }
}
</style>