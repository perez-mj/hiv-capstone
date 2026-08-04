<!-- frontend/src/views/staff/DashboardView.vue -->
<template>
  <v-container fluid class="pa-4">
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="text-h5">
            <v-icon left>mdi-account-group</v-icon>
            Staff Dashboard - {{ officeLabel }}
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <v-row>
              <v-col cols="12" md="4">
                <v-card outlined>
                  <v-card-title class="text-subtitle-1">Today's Queue</v-card-title>
                  <v-card-text>
                    <div class="text-h3 text-center mb-2">{{ queueStats.waiting }}</div>
                    <div class="text-center text-caption">Patients Waiting</div>
                    <v-divider class="my-2"></v-divider>
                    <div class="d-flex justify-space-between">
                      <div>
                        <div class="text-h6">{{ queueStats.completed }}</div>
                        <div class="text-caption">Completed</div>
                      </div>
                      <div>
                        <div class="text-h6">{{ queueStats.skipped }}</div>
                        <div class="text-caption">Skipped</div>
                      </div>
                      <div>
                        <div class="text-h6">{{ queueStats.noShow }}</div>
                        <div class="text-caption">No-Show</div>
                      </div>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
              
              <v-col cols="12" md="8">
                <v-card outlined>
                  <v-card-title class="text-subtitle-1">Now Serving</v-card-title>
                  <v-card-text>
                    <div v-if="currentServing" class="text-center">
                      <div class="text-h2">{{ currentServing.queue_number }}</div>
                      <div class="text-h6">{{ currentServing.patient_name }}</div>
                      <v-chip color="primary" small>In Progress</v-chip>
                    </div>
                    <div v-else class="text-center text-h6 text-grey">
                      No one currently being served
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title class="text-subtitle-1">
            Quick Actions
            <v-spacer></v-spacer>
            <v-btn color="primary" @click="navigateToOfficeQueue" small>
              <v-icon left small>mdi-queue</v-icon>
              Go to Queue
            </v-btn>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <v-row>
              <v-col cols="6">
                <v-btn block color="primary" @click="navigateToEncounter" outlined>
                  <v-icon left>mdi-plus</v-icon>
                  New Encounter
                </v-btn>
              </v-col>
              <v-col cols="6">
                <v-btn block color="info" @click="navigateToPatients" outlined>
                  <v-icon left>mdi-account-search</v-icon>
                  Find Patient
                </v-btn>
              </v-col>
              <v-col cols="6">
                <v-btn block color="success" @click="navigateToAppointments" outlined>
                  <v-icon left>mdi-calendar</v-icon>
                  Appointments
                </v-btn>
              </v-col>
              <v-col cols="6">
                <v-btn block color="warning" @click="navigateToHistory" outlined>
                  <v-icon left>mdi-history</v-icon>
                  View History
                </v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card>
          <v-card-title class="text-subtitle-1">Today's Overview</v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <v-list dense>
              <v-list-item>
                <v-list-item-icon>
                  <v-icon color="primary">mdi-account-check</v-icon>
                </v-list-item-icon>
                <v-list-item-content>
                  <v-list-item-title>Appointments Today</v-list-item-title>
                  <v-list-item-subtitle>{{ appointmentsToday }} scheduled</v-list-item-subtitle>
                </v-list-item-content>
              </v-list-item>
              <v-list-item>
                <v-list-item-icon>
                  <v-icon color="success">mdi-check-circle</v-icon>
                </v-list-item-icon>
                <v-list-item-content>
                  <v-list-item-title>Patients Seen</v-list-item-title>
                  <v-list-item-subtitle>{{ patientsSeen }} completed</v-list-item-subtitle>
                </v-list-item-content>
              </v-list-item>
              <v-list-item>
                <v-list-item-icon>
                  <v-icon color="warning">mdi-clock</v-icon>
                </v-list-item-icon>
                <v-list-item-content>
                  <v-list-item-title>Average Wait Time</v-list-item-title>
                  <v-list-item-subtitle>{{ avgWaitTime }} minutes</v-list-item-subtitle>
                </v-list-item-content>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQueueStore } from '@/stores/queueStore'
import socketService from '@/services/socketService'

export default {
  name: 'StaffDashboard',
  setup() {
    const router = useRouter()
    const queueStore = useQueueStore()
    
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const office = ref(user.office || 'testing')
    const officeLabel = ref(office.value === 'testing' ? 'Testing Office' : 'Treatment Office')
    
    const currentServing = ref(null)
    const waitingList = ref([])
    const queueStats = ref({
      waiting: 0,
      completed: 0,
      skipped: 0,
      noShow: 0
    })
    const appointmentsToday = ref(0)
    const patientsSeen = ref(0)
    const avgWaitTime = ref(15)

    const loadQueue = async () => {
      await queueStore.loadQueue(office.value)
      currentServing.value = queueStore.currentServing
      waitingList.value = queueStore.waitingList
      queueStats.value = queueStore.stats
      queueStats.value.waiting = queueStore.waitingCount
    }

    const navigateToOfficeQueue = () => {
      router.push(`/${office.value}/queue`)
    }

    const navigateToEncounter = () => {
      router.push(`/${office.value}/encounter`)
    }

    const navigateToPatients = () => {
      router.push('/patients')
    }

    const navigateToAppointments = () => {
      router.push('/appointments')
    }

    const navigateToHistory = () => {
      router.push('/patients')
    }

    // Socket listeners
    const handleQueueUpdate = (data) => {
      if (data.office === office.value) {
        loadQueue()
      }
    }

    onMounted(() => {
      loadQueue()
      
      socketService.connect()
      socketService.joinRoom(office.value)
      socketService.on('queue-updated', handleQueueUpdate)
      
      // Load today's stats
      appointmentsToday.value = 0 // Will be loaded from API
      patientsSeen.value = queueStats.value.completed
    })

    return {
      office,
      officeLabel,
      currentServing,
      waitingList,
      queueStats,
      appointmentsToday,
      patientsSeen,
      avgWaitTime,
      navigateToOfficeQueue,
      navigateToEncounter,
      navigateToPatients,
      navigateToAppointments,
      navigateToHistory
    }
  }
}
</script>