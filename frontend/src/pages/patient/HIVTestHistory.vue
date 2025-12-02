<!-- frontend/src/pages/patient/HIVTestHistory.vue -->
<template>
  <v-container fluid class="pa-6">
    <div class="page-header mb-6">
      <h1 class="text-h4 font-weight-bold text-primary">HIV Test History</h1>
      <p class="text-body-1 text-medium-emphasis mt-2">
        View your complete HIV testing history and results
      </p>
    </div>

    <v-card elevation="2" border>
      <v-card-title class="d-flex justify-space-between align-center">
        <span>Test Records</span>
        <v-btn variant="outlined" prepend-icon="mdi-download" @click="exportTestHistory">
          Export History
        </v-btn>
      </v-card-title>

      <v-card-text class="pa-0">
        <v-data-table :headers="headers" :items="tests" :loading="loading" class="elevation-0">
          <!-- Loading State -->
          <template v-slot:loading>
            <v-skeleton-loader type="table-row@6" />
          </template>

          <!-- Date Column -->
          <template v-slot:item.test_date="{ item }">
            <div class="text-no-wrap">
              {{ formatDate(item.test_date) }}
            </div>
          </template>

          <!-- Result Column -->
          <template v-slot:item.result="{ item }">
            <v-chip :color="item.result === 'Reactive' ? 'red' : 'green'" size="small" variant="flat">
              {{ item.result }}
            </v-chip>
          </template>

          <!-- Facility Column -->
          <template v-slot:item.facility="{ item }">
            <div class="d-flex align-center">
              <v-icon class="mr-2" color="primary">mdi-hospital-building</v-icon>
              <div>
                <div class="font-weight-medium">{{ item.facility_name }}</div>
                <div class="text-caption text-medium-emphasis" v-if="item.facility_location">
                  {{ item.facility_location }}
                </div>
              </div>
            </div>
          </template>

          <!-- DLT Status Column -->
          <template v-slot:item.dlt_verified="{ item }">
            <v-chip :color="item.dlt_verified ? 'success' : 'warning'" size="small" variant="flat"
              :prepend-icon="item.dlt_verified ? 'mdi-shield-check' : 'mdi-shield-alert'">
              {{ item.dlt_verified ? 'Verified' : 'Pending' }}
            </v-chip>
          </template>

          <!-- Empty State -->
          <template v-slot:no-data>
            <div class="text-center py-8">
              <v-icon size="64" color="grey-lighten-2" class="mb-4">mdi-heart-pulse</v-icon>
              <div class="text-h6 text-grey">No Test History Found</div>
              <div class="text-body-2 text-grey mt-2">
                Your HIV test records will appear here
              </div>
            </div>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- Test Details Dialog -->
    <v-dialog v-model="showTestDialog" max-width="600">
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
          <span>Test Details</span>
          <v-btn icon @click="showTestDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text>
          <div v-if="selectedTest" class="test-details">
            <v-row>
              <v-col cols="6">
                <div class="text-caption text-medium-emphasis">Test Date</div>
                <div class="text-body-1 mb-4">{{ formatDate(selectedTest.test_date) }}</div>
              </v-col>
              <v-col cols="6">
                <div class="text-caption text-medium-emphasis">Result</div>
                <v-chip :color="selectedTest.result === 'Reactive' ? 'red' : 'green'" class="mb-4">
                  {{ selectedTest.result }}
                </v-chip>
              </v-col>
              <v-col cols="12">
                <div class="text-caption text-medium-emphasis">Facility</div>
                <div class="text-body-1 mb-2">{{ selectedTest.facility_name }}</div>
                <div class="text-caption text-medium-emphasis" v-if="selectedTest.facility_location">
                  {{ selectedTest.facility_location }}
                </div>
              </v-col>
              <v-col cols="12" v-if="selectedTest.test_type">
                <div class="text-caption text-medium-emphasis">Test Type</div>
                <div class="text-body-1 mb-2">{{ selectedTest.test_type }}</div>
              </v-col>
              <v-col cols="12" v-if="selectedTest.notes">
                <div class="text-caption text-medium-emphasis">Notes</div>
                <div class="text-body-1 mb-2">{{ selectedTest.notes }}</div>
              </v-col>
              <v-col cols="12">
                <div class="text-caption text-medium-emphasis">DLT Verification</div>
                <v-chip :color="selectedTest.dlt_verified ? 'success' : 'warning'"
                  :prepend-icon="selectedTest.dlt_verified ? 'mdi-shield-check' : 'mdi-shield-alert'">
                  {{ selectedTest.dlt_verified ? 'Verified on Blockchain' : 'Verification Pending' }}
                </v-chip>
              </v-col>
            </v-row>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { patientApi } from '@/api'

const loading = ref(false)
const tests = ref([])
const showTestDialog = ref(false)
const selectedTest = ref(null)

const headers = ref([
  { title: 'Test Date', key: 'test_date', sortable: true },
  { title: 'Result', key: 'result', sortable: true },
  { title: 'Facility', key: 'facility', sortable: true },
  { title: 'Test Type', key: 'test_type', sortable: true },
  { title: 'DLT Status', key: 'dlt_verified', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' }
])

onMounted(async () => {
  await loadTestHistory()
})

async function loadTestHistory() {
  loading.value = true
  try {
    const response = await patientApi.getTestHistory()
    tests.value = response.data.tests || []
  } catch (error) {
    console.error('Error loading test history:', error)
  } finally {
    loading.value = false
  }
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function viewTestDetails(test) {
  selectedTest.value = test
  showTestDialog.value = true
}

function exportTestHistory() {
  try {
    const dataStr = JSON.stringify(tests.value, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `hiv-test-history-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error exporting test history:', error)
  }
}
</script>