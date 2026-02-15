<!-- src/pages/admin/QueueManagement.vue -->
<template>
  <v-container fluid>
    <!-- Header -->
    <v-row class="mb-6">
      <v-col>
        <div class="d-flex align-center justify-space-between">
          <div>
            <h1 class="text-h4 font-weight-bold" :style="{ color: colors.primary }">
              Queue Management
            </h1>
            <p class="text-subtitle-1 text-grey">Manage patient flow and counter assignments</p>
          </div>
          <v-btn
            :color="colors.accent"
            @click="openSettings"
            prepend-icon="mdi-cog"
          >
            Queue Settings
          </v-btn>
        </div>
      </v-col>
    </v-row>

    <!-- Stats Cards -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3" v-for="stat in queueStats" :key="stat.label">
        <v-card elevation="4" class="pa-4">
          <div class="d-flex align-center">
            <v-avatar :color="stat.color" size="50" class="mr-3">
              <v-icon color="white" size="28">{{ stat.icon }}</v-icon>
            </v-avatar>
            <div>
              <div class="text-h5 font-weight-bold">{{ stat.value }}</div>
              <div class="text-caption text-grey">{{ stat.label }}</div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Counter Management -->
    <v-row class="mb-6">
      <v-col cols="12">
        <v-card elevation="4">
          <v-card-title class="d-flex align-center">
            <v-icon left :color="colors.primary">mdi-counter</v-icon>
            Active Counters
            <v-spacer></v-spacer>
            <v-btn
              :color="colors.primary"
              size="small"
              @click="addCounter"
              prepend-icon="mdi-plus"
            >
              Add Counter
            </v-btn>
          </v-card-title>
          <v-card-text>
            <v-row>
              <v-col
                v-for="counter in counters"
                :key="counter.id"
                cols="12"
                md="4"
                lg="3"
              >
                <v-card
                  :color="counter.active ? colors.primary : 'grey-lighten-2'"
                  :dark="counter.active"
                  class="counter-card"
                  elevation="3"
                >
                  <v-card-title class="d-flex justify-space-between">
                    <span>Counter {{ counter.number }}</span>
                    <v-switch
                      v-model="counter.active"
                      :color="colors.accent"
                      hide-details
                      density="compact"
                      @change="toggleCounter(counter)"
                    ></v-switch>
                  </v-card-title>
                  <v-card-text>
                    <div class="text-h3 text-center font-weight-bold my-4">
                      {{ counter.currentNumber || '---' }}
                    </div>
                    <div class="text-center mb-3">
                      <v-chip :color="colors.accent" text-color="white">
                        {{ counter.service }}
                      </v-chip>
                    </div>
                    <v-divider></v-divider>
                    <div class="d-flex justify-space-between mt-3">
                      <v-btn
                        :color="colors.primary"
                        size="small"
                        variant="tonal"
                        @click="callNext(counter)"
                        :disabled="!counter.active"
                      >
                        <v-icon left>mdi-phone</v-icon>
                        Call Next
                      </v-btn>
                      <v-btn
                        :color="colors.warning"
                        size="small"
                        variant="tonal"
                        @click="noShow(counter)"
                        :disabled="!counter.active"
                      >
                        <v-icon left>mdi-cancel</v-icon>
                        No-show
                      </v-btn>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Queue List -->
    <v-row>
      <v-col cols="12">
        <v-card elevation="4">
          <v-card-title>
            <v-icon left :color="colors.primary">mdi-format-list-bulleted</v-icon>
            Current Queue
            <v-spacer></v-spacer>
            <v-text-field
              v-model="search"
              prepend-inner-icon="mdi-magnify"
              label="Search"
              density="compact"
              variant="outlined"
              hide-details
              class="mr-4"
              style="max-width: 300px;"
            ></v-text-field>
            <v-btn
              :color="colors.accent"
              size="small"
              @click="exportQueue"
              prepend-icon="mdi-export"
            >
              Export
            </v-btn>
          </v-card-title>

          <v-data-table
            :headers="headers"
            :items="queue"
            :search="search"
            class="elevation-1"
          >
            <!-- Status Column -->
            <template v-slot:item.status="{ item }">
              <v-chip
                :color="getStatusColor(item.status)"
                text-color="white"
                size="small"
              >
                {{ item.status }}
              </v-chip>
            </template>

            <!-- Priority Column -->
            <template v-slot:item.priority="{ item }">
              <v-icon
                :color="getPriorityColor(item.priority)"
                size="small"
              >
                {{ getPriorityIcon(item.priority) }}
              </v-icon>
              {{ item.priority }}
            </template>

            <!-- Actions Column -->
            <template v-slot:item.actions="{ item }">
              <v-btn
                :color="colors.primary"
                size="x-small"
                icon
                variant="text"
                @click="assignCounter(item)"
                title="Assign to counter"
              >
                <v-icon>mdi-counter</v-icon>
              </v-btn>
              <v-btn
                :color="colors.accent"
                size="x-small"
                icon
                variant="text"
                @click="markAsCalled(item)"
                title="Mark as called"
              >
                <v-icon>mdi-phone</v-icon>
              </v-btn>
              <v-btn
                :color="colors.warning"
                size="x-small"
                icon
                variant="text"
                @click="markAsNoShow(item)"
                title="Mark as no-show"
              >
                <v-icon>mdi-cancel</v-icon>
              </v-btn>
            </template>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>

    <!-- Assign Counter Dialog -->
    <v-dialog v-model="showAssignDialog" max-width="400">
      <v-card>
        <v-card-title>Assign to Counter</v-card-title>
        <v-card-text>
          <v-select
            v-model="selectedCounter"
            :items="availableCounters"
            item-title="number"
            item-value="id"
            label="Select Counter"
            variant="outlined"
            :prepend-icon="'mdi-counter'"
          ></v-select>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showAssignDialog = false">Cancel</v-btn>
          <v-btn :color="colors.primary" @click="confirmAssign">Assign</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import colors from '@/config/colors'

// State
const search = ref('')
const showAssignDialog = ref(false)
const selectedCounter = ref(null)
const selectedQueueItem = ref(null)

// Queue statistics
const queueStats = ref([
  { label: 'Total Waiting', value: 24, icon: 'mdi-account-group', color: colors.primary },
  { label: 'Avg Wait Time', value: '18 min', icon: 'mdi-clock-fast', color: colors.accent },
  { label: 'Completed Today', value: 42, icon: 'mdi-check-circle', color: colors.success },
  { label: 'No-Show Today', value: 3, icon: 'mdi-cancel', color: colors.warning }
])

// Counters
const counters = ref([
  { id: 1, number: 1, active: true, currentNumber: 'A045', service: 'Consultation' },
  { id: 2, number: 2, active: true, currentNumber: 'B032', service: 'ART Refill' },
  { id: 3, number: 3, active: true, currentNumber: 'C018', service: 'Lab Test' },
  { id: 4, number: 4, active: false, currentNumber: '---', service: 'Counseling' }
])

// Table headers
const headers = [
  { title: 'Queue #', key: 'number', sortable: true },
  { title: 'Patient ID', key: 'patientId', sortable: true },
  { title: 'Service', key: 'service', sortable: true },
  { title: 'Registered', key: 'registeredTime', sortable: true },
  { title: 'Est. Wait', key: 'estimatedWait', sortable: true },
  { title: 'Priority', key: 'priority', sortable: true },
  { title: 'Status', key: 'status', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false }
]

// Queue data
const queue = ref([
  {
    number: 'A046',
    patientId: 'PT001',
    service: 'Consultation',
    registeredTime: '09:30',
    estimatedWait: '15 min',
    priority: 'normal',
    status: 'waiting'
  },
  {
    number: 'B033',
    patientId: 'PT002',
    service: 'ART Refill',
    registeredTime: '09:32',
    estimatedWait: '10 min',
    priority: 'high',
    status: 'waiting'
  },
  {
    number: 'C019',
    patientId: 'PT003',
    service: 'Lab Test',
    registeredTime: '09:35',
    estimatedWait: '20 min',
    priority: 'normal',
    status: 'waiting'
  },
  {
    number: 'D007',
    patientId: 'PT004',
    service: 'Counseling',
    registeredTime: '09:38',
    estimatedWait: '30 min',
    priority: 'normal',
    status: 'called'
  }
])

// Computed
const availableCounters = computed(() => {
  return counters.value.filter(c => c.active)
})

// Methods
const getStatusColor = (status) => {
  switch(status) {
    case 'waiting': return colors.warning
    case 'called': return colors.accent
    case 'completed': return colors.success
    case 'no-show': return colors.error
    default: return colors.primary
  }
}

const getPriorityColor = (priority) => {
  switch(priority) {
    case 'high': return colors.warning
    case 'normal': return colors.primary
    case 'low': return colors.accent
    default: return colors.primary
  }
}

const getPriorityIcon = (priority) => {
  switch(priority) {
    case 'high': return 'mdi-alert'
    case 'normal': return 'mdi-check'
    case 'low': return 'mdi-arrow-down'
    default: return 'mdi-help'
  }
}

const toggleCounter = (counter) => {
  console.log('Toggling counter:', counter)
}

const callNext = (counter) => {
  console.log('Calling next for counter:', counter)
}

const noShow = (counter) => {
  console.log('Marking no-show for counter:', counter)
}

const addCounter = () => {
  console.log('Adding new counter')
}

const exportQueue = () => {
  console.log('Exporting queue')
}

const assignCounter = (item) => {
  selectedQueueItem.value = item
  showAssignDialog.value = true
}

const markAsCalled = (item) => {
  console.log('Marking as called:', item)
}

const markAsNoShow = (item) => {
  console.log('Marking as no-show:', item)
}

const confirmAssign = () => {
  console.log('Assigning to counter:', selectedCounter.value)
  showAssignDialog.value = false
}

const openSettings = () => {
  console.log('Opening queue settings')
}
</script>

<style scoped>
.counter-card {
  transition: all 0.3s ease;
}

.counter-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0,0,0,0.2) !important;
}
</style>