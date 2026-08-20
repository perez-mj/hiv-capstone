<!-- frontend/src/views/staff/treatment/HistoryView.vue -->
<template>
  <v-container fluid class="pa-4">
    <v-row>
      <v-col cols="12" lg="10" offset-lg="1">
        <v-card>
          <v-card-title class="text-h5">
            <v-icon start>mdi-history</v-icon>
            Treatment History
            <v-spacer></v-spacer>
            <v-chip color="success" variant="flat" v-if="patient">
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
                  <v-chip color="success" size="small">Treatment</v-chip>
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
                  <v-icon color="success">mdi-clipboard-pulse</v-icon>
                </template>
                
                <v-list-item-title>
                  <span class="font-weight-medium">Encounter #{{ encounter.id }}</span>
                  <v-chip color="info" size="small" class="ml-2" v-if="encounter.next_appointment_date">
                    Next: {{ formatDate(encounter.next_appointment_date) }}
                  </v-chip>
                </v-list-item-title>
                
                <v-list-item-subtitle>
                  <div>
                    <span class="text-caption">Date: {{ formatDate(encounter.created_at) }}</span>
                    <span class="text-caption ml-4">Staff: {{ encounter.User?.username || 'Unknown' }}</span>
                  </div>
                  <div class="text-caption text-grey">
                    Medication: {{ encounter.art_prescription?.medication_name || 'N/A' }} •
                    CD4: {{ getLatestLabResult(encounter.lab_results, 'CD4') || 'N/A' }} •
                    Viral Load: {{ getLatestLabResult(encounter.lab_results, 'viral_load') || 'N/A' }}
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
              title="No Treatment History"
              text="This patient has no treatment encounters yet"
              icon="mdi-clipboard-pulse-outline"
            ></v-empty-state>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Encounter Detail Dialog -->
    <v-dialog v-model="detailDialog" max-width="800px">
      <v-card v-if="selectedEncounter">
        <v-card-title>
          <span class="text-h6">Treatment Encounter #{{ selectedEncounter.id }}</span>
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" variant="text" @click="detailDialog = false"></v-btn>
        </v-card-title>
        <v-divider></v-divider>
        
        <v-card-text class="pt-4">
          <v-row>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 font-weight-bold text-grey">Date</div>
              <div>{{ formatDate(selectedEncounter.created_at) }}</div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 font-weight-bold text-grey">Staff</div>
              <div>{{ selectedEncounter.User?.username || 'Unknown' }}</div>
            </v-col>
          </v-row>

          <v-divider class="my-4"></v-divider>

          <!-- SOAP Notes -->
          <div class="text-subtitle-2 font-weight-bold text-grey mb-2">Consultation Notes (SOAP)</div>
          <v-row>
            <v-col cols="12" sm="6">
              <div class="text-caption font-weight-bold">Subjective</div>
              <div class="text-body-2">{{ selectedEncounter.consultation_notes?.subjective || 'N/A' }}</div>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="text-caption font-weight-bold">Objective</div>
              <div class="text-body-2">{{ selectedEncounter.consultation_notes?.objective || 'N/A' }}</div>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="text-caption font-weight-bold">Assessment</div>
              <div class="text-body-2">{{ selectedEncounter.consultation_notes?.assessment || 'N/A' }}</div>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="text-caption font-weight-bold">Plan</div>
              <div class="text-body-2">{{ selectedEncounter.consultation_notes?.plan || 'N/A' }}</div>
            </v-col>
          </v-row>

          <v-divider class="my-4"></v-divider>

          <!-- ART Prescription -->
          <div class="text-subtitle-2 font-weight-bold text-grey mb-2">ART Prescription</div>
          <v-row>
            <v-col cols="12" sm="6">
              <div class="text-caption font-weight-bold">Medication</div>
              <div class="text-body-2">{{ selectedEncounter.art_prescription?.medication_name || 'N/A' }}</div>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="text-caption font-weight-bold">Dosage</div>
              <div class="text-body-2">{{ selectedEncounter.art_prescription?.dosage || 'N/A' }}</div>
            </v-col>
            <v-col cols="12" sm="4">
              <div class="text-caption font-weight-bold">Frequency</div>
              <div class="text-body-2">{{ selectedEncounter.art_prescription?.frequency || 'N/A' }}</div>
            </v-col>
            <v-col cols="12" sm="4">
              <div class="text-caption font-weight-bold">Quantity</div>
              <div class="text-body-2">{{ selectedEncounter.art_prescription?.quantity || 'N/A' }}</div>
            </v-col>
            <v-col cols="12" sm="4">
              <div class="text-caption font-weight-bold">Refill Date</div>
              <div class="text-body-2">{{ formatDate(selectedEncounter.art_prescription?.refill_date) }}</div>
            </v-col>
          </v-row>

          <v-divider class="my-4"></v-divider>

          <!-- Lab Results -->
          <div class="text-subtitle-2 font-weight-bold text-grey mb-2">Lab Results</div>
          <v-row>
            <v-col cols="12" sm="6" v-if="selectedEncounter.lab_results">
              <div class="text-caption font-weight-bold">CD4 Count</div>
              <div class="text-body-2">{{ getLatestLabResult(selectedEncounter.lab_results, 'CD4') || 'N/A' }}</div>
            </v-col>
            <v-col cols="12" sm="6" v-if="selectedEncounter.lab_results">
              <div class="text-caption font-weight-bold">Viral Load</div>
              <div class="text-body-2">{{ getLatestLabResult(selectedEncounter.lab_results, 'viral_load') || 'N/A' }}</div>
            </v-col>
          </v-row>

          <v-divider class="my-4"></v-divider>

          <!-- Adherence -->
          <div class="text-subtitle-2 font-weight-bold text-grey mb-2">Adherence</div>
          <v-row>
            <v-col cols="12" sm="6">
              <div class="text-caption font-weight-bold">Missed doses (30 days)</div>
              <v-chip :color="selectedEncounter.adherence?.missed_doses_last_30_days === 'no' ? 'success' : 'warning'" size="small">
                {{ selectedEncounter.adherence?.missed_doses_last_30_days || 'N/A' }}
              </v-chip>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="text-caption font-weight-bold">Missed dose count</div>
              <div class="text-body-2">{{ selectedEncounter.adherence?.missed_dose_count || 0 }}</div>
            </v-col>
            <v-col cols="12" v-if="selectedEncounter.adherence?.notes">
              <div class="text-caption font-weight-bold">Notes</div>
              <div class="text-body-2">{{ selectedEncounter.adherence.notes }}</div>
            </v-col>
          </v-row>

          <v-divider class="my-4" v-if="selectedEncounter.next_appointment_date"></v-divider>

          <!-- Next Appointment -->
          <v-row v-if="selectedEncounter.next_appointment_date">
            <v-col cols="12">
              <div class="text-subtitle-2 font-weight-bold text-grey">Next Appointment</div>
              <v-alert type="info" variant="tonal">
                {{ formatDate(selectedEncounter.next_appointment_date) }}
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
import treatmentService from '@/services/treatmentService'
import patientService from '@/services/patientService'

export default {
  name: 'TreatmentHistoryView',
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
        const patientData = await patientService.getPatient(patientId)
        patient.value = patientData

        const data = await treatmentService.getPatientEncounters(patientId)
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
      router.push(`/treatment/encounter/${id}`)
    }

    const getLatestLabResult = (labResults, type) => {
      if (!labResults || labResults.length === 0) return null
      const result = labResults.find(r => r.type === type)
      return result ? `${result.value} (${formatDate(result.date)})` : null
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
      getLatestLabResult,
      formatDate
    }
  }
}
</script>