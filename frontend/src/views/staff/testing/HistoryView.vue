<!-- frontend/src/views/staff/testing/HistoryView.vue -->
<template>
  <v-container fluid class="pa-4">
    <v-row>
      <v-col cols="12" lg="10" offset-lg="1">
        <v-card>
          <v-card-title class="text-h5">
            <v-icon start>mdi-history</v-icon>
            Testing History
            <v-spacer></v-spacer>
            <v-chip color="info" variant="flat" v-if="patient">
              {{ patient.first_name }} {{ patient.last_name }}
            </v-chip>
          </v-card-title>
          <v-divider></v-divider>
          
          <v-card-text>
            <!-- Patient Info -->
            <v-card variant="tonal" class="mb-4 pa-3" v-if="patient">
              <v-row>
                <v-col cols="12" sm="3">
                  <div class="text-caption text-grey">Name</div>
                  <div class="font-weight-medium">{{ patient.first_name }} {{ patient.last_name }}</div>
                </v-col>
                <v-col cols="12" sm="3">
                  <div class="text-caption text-grey">Contact</div>
                  <div class="font-weight-medium">{{ patient.contact_number || 'N/A' }}</div>
                </v-col>
                <v-col cols="12" sm="3">
                  <div class="text-caption text-grey">Facility Code</div>
                  <div class="font-weight-medium">{{ patient.patient_facility_code || 'N/A' }}</div>
                </v-col>
                <v-col cols="12" sm="3">
                  <div class="text-caption text-grey">Status</div>
                  <v-chip :color="patient.status === 'testing' ? 'info' : 'success'" size="small">
                    {{ patient.status }}
                  </v-chip>
                </v-col>
              </v-row>
            </v-card>

            <!-- Loading -->
            <div v-if="loading" class="text-center pa-4">
              <v-progress-circular indeterminate color="primary"></v-progress-circular>
              <p class="mt-2">Loading history...</p>
            </div>

            <!-- History List -->
            <v-list v-else-if="encounters.length > 0" lines="two">
              <v-list-item 
                v-for="encounter in encounters" 
                :key="encounter.id"
                @click="viewEncounter(encounter.id)"
              >
                <template v-slot:prepend>
                  <v-icon :color="getResultColor(encounter.hiv_test?.result)">
                    {{ getResultIcon(encounter.hiv_test?.result) }}
                  </v-icon>
                </template>
                
                <v-list-item-title>
                  <span class="font-weight-medium">Encounter #{{ encounter.id }}</span>
                  <v-chip 
                    :color="getResultColor(encounter.hiv_test?.result)" 
                    size="small" 
                    class="ml-2"
                  >
                    {{ encounter.hiv_test?.result || 'Pending' }}
                  </v-chip>
                </v-list-item-title>
                
                <v-list-item-subtitle>
                  <div>
                    <span class="text-caption">Date: {{ formatDate(encounter.created_at) }}</span>
                    <span class="text-caption ml-4">Staff: {{ encounter.User?.username || 'Unknown' }}</span>
                  </div>
                  <div class="text-caption text-grey">
                    {{ encounter.pretest_counseling?.conducted ? '✓ Pre-test' : '✗ Pre-test' }} • 
                    {{ encounter.posttest_counseling?.conducted ? '✓ Post-test' : '✗ Post-test' }} • 
                    {{ encounter.referral?.referred_to_treatment ? '↗ Referred' : 'No referral' }}
                  </div>
                </v-list-item-subtitle>
                
                <template v-slot:append>
                  <v-icon>mdi-chevron-right</v-icon>
                </template>
              </v-list-item>
            </v-list>

            <!-- Empty State -->
            <v-empty-state
              v-else
              title="No Testing History"
              text="This patient has no testing encounters yet"
              icon="mdi-test-tube-empty"
            ></v-empty-state>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Encounter Detail Dialog -->
    <v-dialog v-model="detailDialog" max-width="800px">
      <v-card v-if="selectedEncounter">
        <v-card-title>
          <span class="text-h6">Encounter Details #{{ selectedEncounter.id }}</span>
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" variant="text" @click="detailDialog = false"></v-btn>
        </v-card-title>
        <v-divider></v-divider>
        
        <v-card-text class="pt-4">
          <v-row>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 font-weight-bold text-grey">Result</div>
              <v-chip :color="getResultColor(selectedEncounter.hiv_test?.result)" size="large">
                {{ selectedEncounter.hiv_test?.result || 'N/A' }}
              </v-chip>
            </v-col>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 font-weight-bold text-grey">Date</div>
              <div>{{ formatDate(selectedEncounter.created_at) }}</div>
            </v-col>
          </v-row>

          <v-divider class="my-4"></v-divider>

          <v-row>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 font-weight-bold text-grey">Pre-test Counseling</div>
              <v-icon :color="selectedEncounter.pretest_counseling?.conducted ? 'success' : 'error'">
                {{ selectedEncounter.pretest_counseling?.conducted ? 'mdi-check-circle' : 'mdi-close-circle' }}
              </v-icon>
              <div class="text-caption mt-1" v-if="selectedEncounter.pretest_counseling?.notes">
                {{ selectedEncounter.pretest_counseling.notes }}
              </div>
              <div class="text-caption" v-if="selectedEncounter.pretest_counseling?.checklist">
                Checklist: {{ selectedEncounter.pretest_counseling.checklist.join(', ') }}
              </div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 font-weight-bold text-grey">Post-test Counseling</div>
              <v-icon :color="selectedEncounter.posttest_counseling?.conducted ? 'success' : 'error'">
                {{ selectedEncounter.posttest_counseling?.conducted ? 'mdi-check-circle' : 'mdi-close-circle' }}
              </v-icon>
              <div class="text-caption mt-1" v-if="selectedEncounter.posttest_counseling?.notes">
                {{ selectedEncounter.posttest_counseling.notes }}
              </div>
              <div class="text-caption" v-if="selectedEncounter.posttest_counseling?.checklist">
                Checklist: {{ selectedEncounter.posttest_counseling.checklist.join(', ') }}
              </div>
            </v-col>
          </v-row>

          <v-divider class="my-4" v-if="selectedEncounter.referral?.referred_to_treatment"></v-divider>

          <v-row v-if="selectedEncounter.referral?.referred_to_treatment">
            <v-col cols="12">
              <div class="text-subtitle-2 font-weight-bold text-grey">Referral</div>
              <v-alert type="info" variant="tonal">
                Referred to Treatment Office
                <div class="text-caption mt-1" v-if="selectedEncounter.referral?.reason">
                  Reason: {{ selectedEncounter.referral.reason }}
                </div>
              </v-alert>
            </v-col>
          </v-row>

          <!-- Blockchain Hash -->
          <v-divider class="my-4"></v-divider>
          <v-row>
            <v-col cols="12">
              <div class="text-subtitle-2 font-weight-bold text-grey">Blockchain Audit</div>
              <v-chip color="success" size="small" v-if="selectedEncounter.blockchain_hash">
                <v-icon start size="16">mdi-lock</v-icon>
                Verified
              </v-chip>
              <v-chip color="error" size="small" v-else>
                <v-icon start size="16">mdi-lock-open</v-icon>
                Not Verified
              </v-chip>
              <div class="text-caption mt-1" style="word-break: break-all;">
                {{ selectedEncounter.blockchain_hash || 'No blockchain hash' }}
              </div>
            </v-col>
          </v-row>
        </v-card-text>
        
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="viewEncounterDetail(selectedEncounter.id)">
            <v-icon start>mdi-eye</v-icon>
            Full Details
          </v-btn>
          <v-btn variant="outlined" @click="detailDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import testingService from '@/services/testingService'
import patientService from '@/services/patientService'

export default {
  name: 'TestingHistoryView',
  setup() {
    const router = useRouter()
    const route = useRoute()
    const patient = ref(null)
    const encounters = ref([])
    const loading = ref(false)
    const detailDialog = ref(false)
    const selectedEncounter = ref(null)

    const snackbar = ref({
      show: false,
      message: '',
      color: 'success'
    })

    const loadHistory = async () => {
      const patientId = route.params.patientId
      if (!patientId) {
        showSnackbar('Patient ID is required', 'error')
        return
      }

      loading.value = true
      try {
        // Load patient info
        const patientData = await patientService.getPatient(patientId)
        patient.value = patientData

        // Load encounters
        const data = await testingService.getPatientEncounters(patientId)
        encounters.value = data || []
      } catch (error) {
        showSnackbar('Failed to load history: ' + error.message, 'error')
      } finally {
        loading.value = false
      }
    }

    const viewEncounter = (id) => {
      const encounter = encounters.value.find(e => e.id === id)
      if (encounter) {
        selectedEncounter.value = encounter
        detailDialog.value = true
      }
    }

    const viewEncounterDetail = (id) => {
      detailDialog.value = false
      router.push(`/testing/encounter/${id}`)
    }

    const getResultColor = (result) => {
      const colors = {
        positive: 'error',
        negative: 'success',
        indeterminate: 'warning'
      }
      return colors[result] || 'grey'
    }

    const getResultIcon = (result) => {
      const icons = {
        positive: 'mdi-alert-circle',
        negative: 'mdi-check-circle',
        indeterminate: 'mdi-help-circle'
      }
      return icons[result] || 'mdi-circle-outline'
    }

    const formatDate = (date) => {
      if (!date) return 'N/A'
      try {
        return new Date(date).toLocaleString()
      } catch {
        return 'N/A'
      }
    }

    const showSnackbar = (message, color = 'success') => {
      snackbar.value = { show: true, message, color }
    }

    onMounted(() => {
      loadHistory()
    })

    return {
      patient,
      encounters,
      loading,
      detailDialog,
      selectedEncounter,
      snackbar,
      viewEncounter,
      viewEncounterDetail,
      getResultColor,
      getResultIcon,
      formatDate
    }
  }
}
</script>