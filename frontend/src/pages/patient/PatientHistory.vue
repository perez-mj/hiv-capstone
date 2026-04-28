<!-- frontend/src/pages/patient/PatientHistory.vue -->
<template>
  <div class="patient-history">
    <v-card>
      <v-card-title>
        Medical History
      </v-card-title>

      <v-card-text>
        <v-tabs v-model="activeTab" color="primary" fixed-tabs>
          <v-tab value="labs">
            <v-icon start>mdi-microscope</v-icon>
            Lab Results
          </v-tab>
          <v-tab value="encounters">
            <v-icon start>mdi-hospital</v-icon>
            Clinical Visits
          </v-tab>
        </v-tabs>

        <v-window v-model="activeTab">
          <!-- Lab Results Tab -->
          <v-window-item value="labs">
            <!-- Filter Section -->
            <div class="d-flex flex-wrap gap-3 my-4">
              <v-select v-model="labFilters.test_type" :items="testTypes" label="Test Type" clearable
                density="compact" variant="outlined" class="filter-select"></v-select>
              <v-menu>
                <template v-slot:activator="{ props }">
                  <v-text-field v-model="labFilters.date_range_label" label="Date Range" readonly
                    v-bind="props" density="compact" variant="outlined" class="filter-select"></v-text-field>
                </template>
                <v-date-picker v-model="labFilters.date_range" range></v-date-picker>
              </v-menu>
              <v-btn color="primary" @click="loadLabResults" :loading="labsLoading">Apply</v-btn>
              <v-btn variant="text" @click="resetLabFilters">Reset</v-btn>
            </div>

            <!-- CD4/VL Summary Cards -->
            <v-row class="mb-4">
              <v-col cols="6">
                <v-card class="text-center" :color="cd4Color" variant="tonal">
                  <v-card-text>
                    <div class="text-h5 font-weight-bold">{{ latestCD4 || 'N/A' }}</div>
                    <div class="text-caption">Latest CD4</div>
                    <div class="text-caption">{{ cd4Trend }}</div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="6">
                <v-card class="text-center" :color="vlColor" variant="tonal">
                  <v-card-text>
                    <div class="text-h5 font-weight-bold">{{ latestVL || 'N/A' }}</div>
                    <div class="text-caption">Latest Viral Load</div>
                    <div class="text-caption">{{ vlTrend }}</div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>

            <!-- Chart (if you have chart library) -->
            <v-card v-if="cd4History.length" class="mb-4" variant="outlined">
              <v-card-text>
                <div class="text-subtitle-1 font-weight-bold mb-2">CD4 Trend</div>
                <canvas ref="cd4Chart" height="150"></canvas>
              </v-card-text>
            </v-card>

            <!-- Lab Results List -->
            <v-list v-if="labResults.length" lines="two">
              <v-list-item v-for="lab in labResults" :key="lab.id" class="mb-2 border rounded">
                <template v-slot:prepend>
                  <v-avatar :color="getLabStatusColor(lab)" size="48">
                    <v-icon color="white">{{ getLabIcon(lab.test_type) }}</v-icon>
                  </v-avatar>
                </template>
                
                <v-list-item-title class="font-weight-bold">
                  {{ formatLabType(lab.test_type) }}
                </v-list-item-title>
                
                <v-list-item-subtitle>
                  {{ formatDate(lab.test_date) }}
                  <br>
                  Result: <span :class="getLabTextClass(lab)">{{ lab.result_value }} {{ lab.result_unit }}</span>
                  <br v-if="lab.interpretation">
                  <v-chip size="x-small" :color="getLabStatusColor(lab)" text-color="white">
                    {{ lab.interpretation }}
                  </v-chip>
                </v-list-item-subtitle>
                
                <template v-slot:append>
                  <v-btn icon variant="text" size="small" @click="viewLabDetails(lab)">
                    <v-icon>mdi-chevron-right</v-icon>
                  </v-btn>
                </template>
              </v-list-item>
            </v-list>
            
            <v-progress-circular v-else-if="labsLoading" indeterminate class="d-block mx-auto my-4"></v-progress-circular>
            
            <v-alert v-else type="info" variant="tonal" class="mt-4">
              No lab results found.
            </v-alert>

            <!-- Lab Pagination -->
            <v-pagination v-if="labTotalPages > 1" v-model="labCurrentPage" :length="labTotalPages"
              @update:model-value="loadLabResults" class="mt-4"></v-pagination>
          </v-window-item>

          <!-- Encounters Tab -->
          <v-window-item value="encounters">
            <v-list v-if="encounters.length" lines="three">
              <v-list-item v-for="encounter in encounters" :key="encounter.id" class="mb-2 border rounded">
                <template v-slot:prepend>
                  <v-avatar :color="getEncounterColor(encounter.type)" size="48">
                    <v-icon color="white">{{ getEncounterIcon(encounter.type) }}</v-icon>
                  </v-avatar>
                </template>
                
                <v-list-item-title class="font-weight-bold">
                  {{ formatEncounterType(encounter.type) }}
                </v-list-item-title>
                
                <v-list-item-subtitle>
                  {{ formatDateTime(encounter.encounter_date) }}
                  <br>
                  With: Dr. {{ encounter.staff_last_name }}
                  <br v-if="encounter.notes">
                  <span class="text-caption text-medium-emphasis">
                    {{ truncate(encounter.notes, 100) }}
                  </span>
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
            
            <v-progress-circular v-else-if="encountersLoading" indeterminate class="d-block mx-auto my-4"></v-progress-circular>
            
            <v-alert v-else type="info" variant="tonal" class="mt-4">
              No clinical visits found.
            </v-alert>

            <!-- Encounter Pagination -->
            <v-pagination v-if="encounterTotalPages > 1" v-model="encounterCurrentPage" :length="encounterTotalPages"
              @update:model-value="loadEncounters" class="mt-4"></v-pagination>
          </v-window-item>
        </v-window>
      </v-card-text>
    </v-card>

    <!-- Lab Details Dialog -->
    <v-dialog v-model="showLabDetails" max-width="500px">
      <v-card v-if="selectedLab">
        <v-card-title>
          {{ formatLabType(selectedLab.test_type) }} Details
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" variant="text" @click="showLabDetails = false"></v-btn>
        </v-card-title>
        <v-card-text>
          <v-list lines="two">
            <v-list-item>
              <v-list-item-title class="font-weight-bold">Test Date</v-list-item-title>
              <v-list-item-subtitle>{{ formatDateTime(selectedLab.test_date) }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <v-list-item-title class="font-weight-bold">Result</v-list-item-title>
              <v-list-item-subtitle>
                {{ selectedLab.result_value }} {{ selectedLab.result_unit }}
              </v-list-item-subtitle>
            </v-list-item>
            <v-list-item v-if="selectedLab.reference_range">
              <v-list-item-title class="font-weight-bold">Reference Range</v-list-item-title>
              <v-list-item-subtitle>{{ selectedLab.reference_range }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item v-if="selectedLab.interpretation">
              <v-list-item-title class="font-weight-bold">Interpretation</v-list-item-title>
              <v-list-item-subtitle>{{ selectedLab.interpretation }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item v-if="selectedLab.performed_by_username">
              <v-list-item-title class="font-weight-bold">Performed By</v-list-item-title>
              <v-list-item-subtitle>{{ selectedLab.performed_by_username }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" variant="text" @click="showLabDetails = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useSnackbarStore } from '@/stores/snackbar'
import http from '@/api/http'

const route = useRoute()
const snackbarStore = useSnackbarStore()

// Tab state
const activeTab = ref(route.query.tab === 'encounters' ? 'encounters' : 'labs')

// Lab results state
const labResults = ref([])
const labsLoading = ref(false)
const labCurrentPage = ref(1)
const labTotalPages = ref(1)
const labTotalItems = ref(0)

// Lab filters
const labFilters = ref({
  test_type: null,
  date_range: null,
  date_range_label: ''
})

const testTypes = [
  { title: 'All', value: null },
  { title: 'CD4 Count', value: 'CD4' },
  { title: 'Viral Load', value: 'VIRAL_LOAD' },
  { title: 'Complete Blood Count', value: 'COMPLETE_BLOOD_COUNT' },
  { title: 'Liver Function', value: 'LIVER_FUNCTION' },
  { title: 'Renal Function', value: 'RENAL_FUNCTION' }
]

// Summary stats
const latestCD4 = ref(null)
const latestVL = ref(null)
const cd4History = ref([])
const vlHistory = ref([])

// Encounters state
const encounters = ref([])
const encountersLoading = ref(false)
const encounterCurrentPage = ref(1)
const encounterTotalPages = ref(1)

// Dialog state
const showLabDetails = ref(false)
const selectedLab = ref(null)

// Chart ref
const cd4Chart = ref(null)

// Computed
const cd4Color = computed(() => {
  if (!latestCD4.value) return 'grey'
  const val = parseInt(latestCD4.value)
  if (val >= 500) return 'success'
  if (val >= 200) return 'warning'
  return 'error'
})

const vlColor = computed(() => {
  if (!latestVL.value) return 'grey'
  const val = parseInt(latestVL.value)
  if (val < 40) return 'success'
  if (val < 1000) return 'warning'
  return 'error'
})

const cd4Trend = computed(() => {
  if (cd4History.value.length < 2) return 'Insufficient data'
  const prev = cd4History.value[1]?.result_value
  const curr = cd4History.value[0]?.result_value
  if (!prev || !curr) return ''
  const diff = parseInt(curr) - parseInt(prev)
  return diff > 0 ? `↑ +${diff} from last` : diff < 0 ? `↓ ${diff} from last` : 'Stable'
})

const vlTrend = computed(() => {
  if (vlHistory.value.length < 2) return 'Insufficient data'
  const prev = parseInt(vlHistory.value[1]?.result_value)
  const curr = parseInt(vlHistory.value[0]?.result_value)
  if (!prev || !curr) return ''
  if (curr < 40) return 'Undetectable'
  if (curr < prev) return `↓ ${prev - curr} decrease`
  if (curr > prev) return `↑ +${curr - prev} increase`
  return 'Stable'
})

// Methods
const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const formatDateTime = (dateStr) => {
  return new Date(dateStr).toLocaleString()
}

const formatLabType = (type) => {
  const types = {
    'CD4': 'CD4 Count',
    'VIRAL_LOAD': 'Viral Load',
    'COMPLETE_BLOOD_COUNT': 'Complete Blood Count',
    'LIVER_FUNCTION': 'Liver Function Test',
    'RENAL_FUNCTION': 'Renal Function Test'
  }
  return types[type] || type
}

const formatEncounterType = (type) => {
  const types = {
    'CONSULTATION': 'Consultation',
    'TESTING': 'Laboratory Testing',
    'REFILL': 'Medication Refill',
    'OTHERS': 'Other Visit'
  }
  return types[type] || type
}

const getLabIcon = (type) => {
  if (type === 'CD4') return 'mdi-blood-bag'
  if (type === 'VIRAL_LOAD') return 'mdi-virus'
  return 'mdi-test-tube'
}

const getEncounterIcon = (type) => {
  const icons = {
    'CONSULTATION': 'mdi-stethoscope',
    'TESTING': 'mdi-microscope',
    'REFILL': 'mdi-pill',
    'OTHERS': 'mdi-clipboard'
  }
  return icons[type] || 'mdi-hospital'
}

const getEncounterColor = (type) => {
  const colors = {
    'CONSULTATION': 'primary',
    'TESTING': 'info',
    'REFILL': 'success',
    'OTHERS': 'warning'
  }
  return colors[type] || 'grey'
}

const getLabStatus = (lab) => {
  if (lab.test_type === 'CD4') {
    const val = parseInt(lab.result_value)
    if (val >= 500) return 'Normal'
    if (val >= 200) return 'Moderate'
    return 'Low'
  }
  if (lab.test_type === 'VIRAL_LOAD') {
    const val = parseInt(lab.result_value)
    if (val < 40) return 'Undetectable'
    if (val < 1000) return 'Low'
    return 'High'
  }
  return 'Normal'
}

const getLabStatusColor = (lab) => {
  const status = getLabStatus(lab)
  if (status === 'Normal' || status === 'Undetectable') return 'success'
  if (status === 'Moderate' || status === 'Low') return 'warning'
  return 'error'
}

const getLabTextClass = (lab) => {
  const status = getLabStatus(lab)
  if (status === 'Normal' || status === 'Undetectable') return 'text-success'
  if (status === 'Moderate' || status === 'Low') return 'text-warning'
  return 'text-error'
}

const truncate = (text, length) => {
  if (!text) return ''
  return text.length > length ? text.substring(0, length) + '...' : text
}

const viewLabDetails = (lab) => {
  selectedLab.value = lab
  showLabDetails.value = true
}

const loadLabResults = async () => {
  labsLoading.value = true
  try {
    const params = {
      page: labCurrentPage.value,
      limit: 20
    }
    if (labFilters.value.test_type) params.test_type = labFilters.value.test_type
    if (labFilters.value.date_range && labFilters.value.date_range.length === 2) {
      params.start_date = labFilters.value.date_range[0]
      params.end_date = labFilters.value.date_range[1]
    }
    
    const res = await http.get('/patients/me/lab-results', { params })
    const data = res.data || res
    
    // Handle both array and paginated response
    labResults.value = Array.isArray(data) ? data : (data.data || [])
    labTotalItems.value = data.total || labResults.value.length
    labTotalPages.value = data.total_pages || Math.ceil(labTotalItems.value / 20) || 1
    
    // Extract CD4 and VL history
    const allResults = labResults.value
    cd4History.value = allResults.filter(l => l.test_type === 'CD4')
    vlHistory.value = allResults.filter(l => l.test_type === 'VIRAL_LOAD')
    
    if (cd4History.value.length) latestCD4.value = cd4History.value[0].result_value
    if (vlHistory.value.length) latestVL.value = vlHistory.value[0].result_value
    
    // Draw chart after data loads
    await nextTick()
    if (cd4History.value.length && cd4Chart.value) {
      drawCD4Chart()
    }
    
  } catch (error) {
    console.error('Failed to load lab results:', error)
    snackbarStore.showError('Failed to load lab results')
  } finally {
    labsLoading.value = false
  }
}

const loadEncounters = async () => {
  encountersLoading.value = true
  try {
    const res = await http.get('/patients/me/encounters', {
      params: { page: encounterCurrentPage.value, limit: 20 }
    })
    const data = res.data || res
    encounters.value = Array.isArray(data) ? data : (data.data || [])
    encounterTotalPages.value = data.total_pages || Math.ceil(encounters.value.length / 20) || 1
  } catch (error) {
    console.error('Failed to load encounters:', error)
    snackbarStore.showError('Failed to load visit history')
  } finally {
    encountersLoading.value = false
  }
}

const resetLabFilters = () => {
  labFilters.value = {
    test_type: null,
    date_range: null,
    date_range_label: ''
  }
  labCurrentPage.value = 1
  loadLabResults()
}

const drawCD4Chart = () => {
  if (!cd4Chart.value) return
  
  // Simple placeholder for chart - you can integrate Chart.js or similar
  // This is a simplified version
  console.log('CD4 History:', cd4History.value.map(h => ({ date: h.test_date, value: h.result_value })))
}

// Watch tab changes
watch(activeTab, (newTab) => {
  if (newTab === 'labs' && !labResults.value.length) {
    loadLabResults()
  } else if (newTab === 'encounters' && !encounters.value.length) {
    loadEncounters()
  }
})

onMounted(() => {
  if (activeTab.value === 'labs') {
    loadLabResults()
  } else {
    loadEncounters()
  }
})
</script>

<style scoped>
.filter-select {
  min-width: 150px;
  max-width: 200px;
}

@media (max-width: 600px) {
  .filter-select {
    min-width: 100%;
    max-width: 100%;
  }
}
</style>