<template>
  <v-container fluid class="pa-4">
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="text-h5">
            <v-icon left>mdi-history</v-icon>
            Testing History
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
              <template v-slot:item.pretest_counseling="{ item }">
                <v-chip :color="item.pretest_counseling?.conducted ? 'success' : 'error'" small>
                  {{ item.pretest_counseling?.conducted ? '✅' : '❌' }}
                </v-chip>
              </template>
              <template v-slot:item.hiv_test="{ item }">
                <v-chip 
                  :color="item.hiv_test?.result === 'positive' ? 'error' : 
                          item.hiv_test?.result === 'negative' ? 'success' : 'warning'" 
                  small
                >
                  {{ item.hiv_test?.result || 'N/A' }}
                </v-chip>
              </template>
              <template v-slot:item.created_at="{ item }">
                {{ formatDate(item.created_at) }}
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
          <span class="text-h6">Encounter Details</span>
          <v-spacer></v-spacer>
          <v-btn icon @click="encounterDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pt-4" v-if="selectedEncounter">
          <v-row>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 font-weight-bold">Pre-test Counseling</div>
              <div class="text-caption">Conducted: {{ selectedEncounter.pretest_counseling?.conducted ? 'Yes' : 'No' }}</div>
              <div class="text-caption">Notes: {{ selectedEncounter.pretest_counseling?.notes || 'N/A' }}</div>
              <div class="text-caption">Checklist: {{ selectedEncounter.pretest_counseling?.checklist?.join(', ') || 'N/A' }}</div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 font-weight-bold">HIV Test</div>
              <div class="text-caption">Result: {{ selectedEncounter.hiv_test?.result || 'N/A' }}</div>
              <div class="text-caption">Kit Lot: {{ selectedEncounter.hiv_test?.kit_lot_number || 'N/A' }}</div>
              <div class="text-caption">Tested By: {{ selectedEncounter.hiv_test?.tested_by || 'N/A' }}</div>
              <div class="text-caption">Test Date: {{ selectedEncounter.hiv_test?.test_date || 'N/A' }}</div>
            </v-col>
          </v-row>
          <v-divider class="my-3"></v-divider>
          <v-row>
            <v-col cols="12">
              <div class="text-subtitle-2 font-weight-bold">Post-test Counseling</div>
              <div class="text-caption">Conducted: {{ selectedEncounter.posttest_counseling?.conducted ? 'Yes' : 'No' }}</div>
              <div class="text-caption">Notes: {{ selectedEncounter.posttest_counseling?.notes || 'N/A' }}</div>
              <div class="text-caption">Checklist: {{ selectedEncounter.posttest_counseling?.checklist?.join(', ') || 'N/A' }}</div>
            </v-col>
          </v-row>
          <v-divider class="my-3"></v-divider>
          <v-row>
            <v-col cols="12">
              <div class="text-subtitle-2 font-weight-bold">Referral</div>
              <div class="text-caption">Referred: {{ selectedEncounter.referral?.referred_to_treatment ? 'Yes' : 'No' }}</div>
              <div class="text-caption" v-if="selectedEncounter.referral?.referred_to_treatment">
                Reason: {{ selectedEncounter.referral?.reason || 'HIV Positive' }}
              </div>
            </v-col>
          </v-row>
          <v-divider class="my-3"></v-divider>
          <v-row>
            <v-col cols="12">
              <div class="text-subtitle-2 font-weight-bold">Blockchain Verification</div>
              <div class="text-caption">Hash: {{ selectedEncounter.blockchain_hash || 'N/A' }}</div>
              <v-chip color="success" small v-if="selectedEncounter.blockchain_hash">
                <v-icon small left>mdi-check-circle</v-icon>
                Verified
              </v-chip>
            </v-col>
          </v-row>
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
import testingService from '@/services/testingService'

export default {
  name: 'TestingHistory',
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
      { title: 'Pre-test', key: 'pretest_counseling', align: 'center' },
      { title: 'Result', key: 'hiv_test', align: 'center' },
      { title: 'Post-test', key: 'posttest_counseling', align: 'center' },
      { title: 'Actions', key: 'actions', align: 'center', sortable: false }
    ]

    const loadData = async () => {
      const patientId = route.params.patientId
      if (!patientId) return

      loading.value = true
      try {
        const [patientData, historyData] = await Promise.all([
          patientService.getPatient(patientId),
          testingService.getPatientEncounters(patientId)
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