<template>
  <v-container fluid class="pa-4">
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="text-h5">
            <v-icon left>mdi-history</v-icon>
            Treatment History
            <v-spacer></v-spacer>
            <v-chip color="primary" small v-if="patient">
              {{ patient.first_name }} {{ patient.last_name }}
            </v-chip>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <v-data-table
              :headers="headers"
              :items="encounters"
              :loading="loading"
              items-per-page="10"
            >
              <template v-slot:item.art_prescription="{ item }">
                <div v-if="item.art_prescription">
                  <div class="font-weight-medium">{{ item.art_prescription.medication_name || 'N/A' }}</div>
                  <div class="text-caption text-grey">{{ item.art_prescription.dosage }} - {{ item.art_prescription.frequency }}</div>
                </div>
                <span v-else class="text-grey">No prescription</span>
              </template>

              <template v-slot:item.created_at="{ item }">
                {{ formatDate(item.created_at) }}
              </template>

              <template v-slot:item.next_appointment_date="{ item }">
                <v-chip v-if="item.next_appointment_date" color="info" small>
                  {{ formatDate(item.next_appointment_date) }}
                </v-chip>
                <span v-else class="text-grey">Not scheduled</span>
              </template>

              <template v-slot:item.actions="{ item }">
                <v-btn icon small color="primary" @click="viewEncounter(item)">
                  <v-icon small>mdi-eye</v-icon>
                </v-btn>
                <v-chip v-if="item.blockchain_hash" color="success" small>
                  <v-icon small left>mdi-blockchain</v-icon>
                  Verified
                </v-chip>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- View Encounter Dialog -->
    <v-dialog v-model="encounterDialog" max-width="800px">
      <v-card>
        <v-card-title>
          <span class="text-h6">Treatment Encounter Details</span>
          <v-spacer></v-spacer>
          <v-btn icon @click="encounterDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pt-4" v-if="selectedEncounter">
          <!-- Consultation Notes -->
          <div class="text-subtitle-2 font-weight-bold">Consultation Notes</div>
          <v-card outlined class="pa-3 mb-3">
            <div class="text-caption font-weight-bold">Subjective</div>
            <div class="text-caption">{{ selectedEncounter.consultation_notes?.subjective || 'N/A' }}</div>
            <div class="text-caption font-weight-bold mt-2">Objective</div>
            <div class="text-caption">{{ selectedEncounter.consultation_notes?.objective || 'N/A' }}</div>
            <div class="text-caption font-weight-bold mt-2">Assessment</div>
            <div class="text-caption">{{ selectedEncounter.consultation_notes?.assessment || 'N/A' }}</div>
            <div class="text-caption font-weight-bold mt-2">Plan</div>
            <div class="text-caption">{{ selectedEncounter.consultation_notes?.plan || 'N/A' }}</div>
          </v-card>

          <!-- Prescription -->
          <div class="text-subtitle-2 font-weight-bold">Prescription</div>
          <v-card outlined class="pa-3 mb-3">
            <div class="text-caption">Medication: {{ selectedEncounter.art_prescription?.medication_name || 'N/A' }}</div>
            <div class="text-caption">Dosage: {{ selectedEncounter.art_prescription?.dosage || 'N/A' }}</div>
            <div class="text-caption">Frequency: {{ selectedEncounter.art_prescription?.frequency || 'N/A' }}</div>
            <div class="text-caption">Quantity: {{ selectedEncounter.art_prescription?.quantity || 'N/A' }}</div>
            <div class="text-caption">Refill Date: {{ selectedEncounter.art_prescription?.refill_date || 'N/A' }}</div>
            <div class="text-caption">Prescribed By: {{ selectedEncounter.art_prescription?.prescribed_by || 'N/A' }}</div>
          </v-card>

          <!-- Lab Results -->
          <div class="text-subtitle-2 font-weight-bold">Lab Results</div>
          <v-card outlined class="pa-3 mb-3">
            <div v-if="selectedEncounter.lab_results && selectedEncounter.lab_results.length">
              <div v-for="lab in selectedEncounter.lab_results" :key="lab.type" class="mb-2">
                <v-chip small class="mr-2">{{ lab.type }}</v-chip>
                <span>{{ lab.value }}</span>
                <span class="text-caption text-grey ml-2">{{ lab.date }}</span>
                <div class="text-caption text-grey" v-if="lab.notes">{{ lab.notes }}</div>
              </div>
            </div>
            <div v-else class="text-caption text-grey">No lab results recorded</div>
          </v-card>

          <!-- Adherence -->
          <div class="text-subtitle-2 font-weight-bold">Adherence</div>
          <v-card outlined class="pa-3 mb-3">
            <div class="text-caption">
              Missed doses in last 30 days: 
              <v-chip :color="selectedEncounter.adherence?.missed_doses_last_30_days ? 'error' : 'success'" small>
                {{ selectedEncounter.adherence?.missed_doses_last_30_days ? 'Yes' : 'No' }}
              </v-chip>
            </div>
            <div class="text-caption" v-if="selectedEncounter.adherence?.missed_dose_count">
              Missed dose count: {{ selectedEncounter.adherence.missed_dose_count }}
            </div>
            <div class="text-caption" v-if="selectedEncounter.adherence?.notes">
              Notes: {{ selectedEncounter.adherence.notes }}
            </div>
          </v-card>

          <!-- Next Appointment -->
          <div class="text-subtitle-2 font-weight-bold">Next Appointment</div>
          <v-card outlined class="pa-3">
            <div class="text-caption">
              {{ selectedEncounter.next_appointment_date ? formatDate(selectedEncounter.next_appointment_date) : 'Not scheduled' }}
            </div>
          </v-card>

          <v-divider class="my-3"></v-divider>

          <!-- Blockchain -->
          <div class="text-subtitle-2 font-weight-bold">Blockchain Verification</div>
          <v-card outlined class="pa-3">
            <div class="text-caption">Hash: {{ selectedEncounter.blockchain_hash || 'N/A' }}</div>
            <v-chip color="success" small v-if="selectedEncounter.blockchain_hash">
              <v-icon small left>mdi-check-circle</v-icon>
              Verified
            </v-chip>
          </v-card>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import patientService from '@/services/patientService'
import treatmentService from '@/services/treatmentService'

export default {
  name: 'TreatmentHistory',
  setup() {
    const route = useRoute()
    const patient = ref(null)
    const encounters = ref([])
    const loading = ref(false)
    const encounterDialog = ref(false)
    const selectedEncounter = ref(null)

    const snackbar = ref({
      show: false,
      message: '',
      color: 'success'
    })

    const headers = [
      { title: 'Date', key: 'created_at' },
      { title: 'Prescription', key: 'art_prescription' },
      { title: 'Next Appointment', key: 'next_appointment_date', align: 'center' },
      { title: 'Actions', key: 'actions', align: 'center', sortable: false }
    ]

    const loadData = async () => {
      const patientId = route.params.patientId
      if (!patientId) return

      loading.value = true
      try {
        const [patientData, historyData] = await Promise.all([
          patientService.getPatient(patientId),
          treatmentService.getPatientEncounters(patientId)
        ])
        patient.value = patientData
        encounters.value = historyData
      } catch (error) {
        showSnackbar('Failed to load data: ' + error.message, 'error')
      } finally {
        loading.value = false
      }
    }

    const viewEncounter = (encounter) => {
      selectedEncounter.value = encounter
      encounterDialog.value = true
    }

    const formatDate = (date) => {
      if (!date) return 'N/A'
      return new Date(date).toLocaleString()
    }

    const showSnackbar = (message, color = 'success') => {
      snackbar.value = { show: true, message, color }
    }

    onMounted(() => {
      loadData()
    })

    return {
      patient,
      encounters,
      loading,
      encounterDialog,
      selectedEncounter,
      headers,
      viewEncounter,
      formatDate,
      snackbar
    }
  }
}
</script>