<!-- frontend/src/views/patient/HistoryView.vue -->
<template>
  <div>
    <v-row>
      <v-col cols="12">
        <h2 class="text-h4 mb-4">
          <v-icon left>mdi-test-tube</v-icon>
          Test Results & Treatment History
        </h2>
      </v-col>
    </v-row>

    <!-- Tabs -->
    <v-tabs v-model="tab" color="primary" grow>
      <v-tab value="tests">
        <v-icon left>mdi-clipboard-check</v-icon>
        HIV Test Results
      </v-tab>
      <v-tab value="treatment">
        <v-icon left>mdi-pill</v-icon>
        Treatment History
      </v-tab>
    </v-tabs>

    <v-window v-model="tab" class="mt-4">
      <!-- Test Results -->
      <v-window-item value="tests">
        <v-row>
          <v-col cols="12">
            <v-card>
              <v-card-title class="primary white--text">
                HIV Testing History
                <v-spacer />
                <v-chip dark color="info">
                  {{ testingEncounters.length }} tests
                </v-chip>
              </v-card-title>
              
              <v-card-text>
                <v-list v-if="testingEncounters.length > 0">
                  <v-list-item 
                    v-for="test in testingEncounters" 
                    :key="test.id"
                    three-line
                    class="mb-2 elevation-1"
                  >
                    <v-list-item-icon>
                      <v-icon 
                        :color="getTestResultColor(test.hiv_test?.result)" 
                        size="36"
                      >
                        {{ getTestResultIcon(test.hiv_test?.result) }}
                      </v-icon>
                    </v-list-item-icon>
                    
                    <v-list-item-content>
                      <v-list-item-title>
                        HIV Test - {{ formatDate(test.test_date || test.created_at) }}
                      </v-list-item-title>
                      <v-list-item-subtitle>
                        <v-chip 
                          :color="getTestResultColor(test.hiv_test?.result)" 
                          dark
                          small
                        >
                          {{ test.hiv_test?.result || 'Pending' }}
                        </v-chip>
                        <span v-if="test.hiv_test?.kit_lot_number" class="ml-2">
                          Kit: {{ test.hiv_test.kit_lot_number }}
                        </span>
                      </v-list-item-subtitle>
                      <v-list-item-subtitle class="mt-1">
                        <v-icon small>mdi-account</v-icon>
                        Conducted by: {{ test.hiv_test?.tested_by || 'N/A' }}
                      </v-list-item-subtitle>
                    </v-list-item-content>
                    
                    <v-list-item-action>
                      <v-btn small color="primary" @click="viewTestDetails(test)">
                        View Details
                      </v-btn>
                    </v-list-item-action>
                  </v-list-item>
                </v-list>
                
                <v-alert v-else type="info" class="mt-3">
                  No HIV test results available yet.
                </v-alert>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- Treatment History -->
      <v-window-item value="treatment">
        <v-row>
          <v-col cols="12">
            <v-card>
              <v-card-title class="success white--text">
                ART Treatment History
                <v-spacer />
                <v-chip dark color="info">
                  {{ treatmentEncounters.length }} visits
                </v-chip>
              </v-card-title>
              
              <v-card-text>
                <v-list v-if="treatmentEncounters.length > 0">
                  <v-list-item 
                    v-for="encounter in treatmentEncounters" 
                    :key="encounter.id"
                    three-line
                    class="mb-2 elevation-1"
                  >
                    <v-list-item-icon>
                      <v-icon color="success" size="36">mdi-pill</v-icon>
                    </v-list-item-icon>
                    
                    <v-list-item-content>
                      <v-list-item-title>
                        Treatment Visit - {{ formatDate(encounter.created_at) }}
                      </v-list-item-title>
                      <v-list-item-subtitle>
                        <span v-if="encounter.art_prescription?.medication_name">
                          Medication: {{ encounter.art_prescription.medication_name }}
                        </span>
                        <span v-if="encounter.art_prescription?.dosage" class="ml-2">
                          Dosage: {{ encounter.art_prescription.dosage }}
                        </span>
                      </v-list-item-subtitle>
                      <v-list-item-subtitle v-if="encounter.next_appointment_date">
                        <v-icon small>mdi-calendar</v-icon>
                        Next appointment: {{ formatDate(encounter.next_appointment_date) }}
                      </v-list-item-subtitle>
                    </v-list-item-content>
                    
                    <v-list-item-action>
                      <v-btn small color="success" @click="viewTreatmentDetails(encounter)">
                        View Details
                      </v-btn>
                    </v-list-item-action>
                  </v-list-item>
                </v-list>
                
                <v-alert v-else type="info" class="mt-3">
                  No treatment history available yet.
                </v-alert>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>
    </v-window>

    <!-- Test Details Dialog -->
    <v-dialog v-model="showTestDialog" max-width="600">
      <v-card>
        <v-card-title class="primary white--text">
          Test Details
          <v-spacer />
          <v-btn icon dark @click="showTestDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        
        <v-card-text class="mt-4">
          <v-list>
            <v-list-item>
              <v-list-item-content>
                <v-list-item-title class="text-caption text-grey">Result</v-list-item-title>
                <v-list-item-subtitle>
                  <v-chip 
                    :color="getTestResultColor(selectedTest?.hiv_test?.result)" 
                    dark
                  >
                    {{ selectedTest?.hiv_test?.result || 'N/A' }}
                  </v-chip>
                </v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
            
            <v-divider />
            
            <v-list-item>
              <v-list-item-content>
                <v-list-item-title class="text-caption text-grey">Test Date</v-list-item-title>
                <v-list-item-subtitle>{{ formatDate(selectedTest?.test_date || selectedTest?.created_at) }}</v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
            
            <v-divider />
            
            <v-list-item v-if="selectedTest?.hiv_test?.kit_lot_number">
              <v-list-item-content>
                <v-list-item-title class="text-caption text-grey">Kit Lot Number</v-list-item-title>
                <v-list-item-subtitle>{{ selectedTest.hiv_test.kit_lot_number }}</v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
            
            <v-divider />
            
            <v-list-item v-if="selectedTest?.hiv_test?.tested_by">
              <v-list-item-content>
                <v-list-item-title class="text-caption text-grey">Tested By</v-list-item-title>
                <v-list-item-subtitle>{{ selectedTest.hiv_test.tested_by }}</v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
            
            <v-divider />
            
            <v-list-item v-if="selectedTest?.pretest_counseling?.notes">
              <v-list-item-content>
                <v-list-item-title class="text-caption text-grey">Pre-test Counseling Notes</v-list-item-title>
                <v-list-item-subtitle>{{ selectedTest.pretest_counseling.notes }}</v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
            
            <v-divider />
            
            <v-list-item v-if="selectedTest?.posttest_counseling?.notes">
              <v-list-item-content>
                <v-list-item-title class="text-caption text-grey">Post-test Counseling Notes</v-list-item-title>
                <v-list-item-subtitle>{{ selectedTest.posttest_counseling.notes }}</v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
          </v-list>
        </v-card-text>
        
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" @click="showTestDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Treatment Details Dialog -->
    <v-dialog v-model="showTreatmentDialog" max-width="700">
      <v-card>
        <v-card-title class="success white--text">
          Treatment Details
          <v-spacer />
          <v-btn icon dark @click="showTreatmentDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        
        <v-card-text class="mt-4">
          <v-list>
            <v-list-item v-if="selectedTreatment?.consultation_notes">
              <v-list-item-content>
                <v-list-item-title class="text-caption text-grey">Consultation Notes</v-list-item-title>
                <v-list-item-subtitle>{{ selectedTreatment.consultation_notes }}</v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
            
            <v-divider />
            
            <v-list-item v-if="selectedTreatment?.art_prescription">
              <v-list-item-content>
                <v-list-item-title class="text-caption text-grey">Prescription</v-list-item-title>
                <v-list-item-subtitle>
                  <strong>{{ selectedTreatment.art_prescription.medication_name }}</strong>
                </v-list-item-subtitle>
                <v-list-item-subtitle>
                  Dosage: {{ selectedTreatment.art_prescription.dosage }}
                </v-list-item-subtitle>
                <v-list-item-subtitle>
                  Frequency: {{ selectedTreatment.art_prescription.frequency }}
                </v-list-item-subtitle>
                <v-list-item-subtitle v-if="selectedTreatment.art_prescription.quantity">
                  Quantity: {{ selectedTreatment.art_prescription.quantity }}
                </v-list-item-subtitle>
                <v-list-item-subtitle v-if="selectedTreatment.art_prescription.refill_date">
                  Refill Date: {{ formatDate(selectedTreatment.art_prescription.refill_date) }}
                </v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
            
            <v-divider v-if="selectedTreatment?.lab_results?.length" />
            
            <v-list-item v-if="selectedTreatment?.lab_results?.length">
              <v-list-item-content>
                <v-list-item-title class="text-caption text-grey">Lab Results</v-list-item-title>
                <div v-for="(lab, index) in selectedTreatment.lab_results" :key="index" class="ml-2">
                  <v-chip small color="info" class="mr-1">
                    {{ lab.type }}
                  </v-chip>
                  <span>{{ lab.value }}</span>
                  <span v-if="lab.date" class="text-caption text-grey ml-2">
                    ({{ formatDate(lab.date) }})
                  </span>
                  <span v-if="lab.notes" class="text-caption text-grey ml-2">
                    - {{ lab.notes }}
                  </span>
                </div>
              </v-list-item-content>
            </v-list-item>
            
            <v-divider v-if="selectedTreatment?.adherence" />
            
            <v-list-item v-if="selectedTreatment?.adherence">
              <v-list-item-content>
                <v-list-item-title class="text-caption text-grey">Adherence</v-list-item-title>
                <v-list-item-subtitle>
                  Missed doses in last 30 days: 
                  <v-chip :color="selectedTreatment.adherence.missed_doses_last_30_days ? 'warning' : 'success'" small>
                    {{ selectedTreatment.adherence.missed_doses_last_30_days ? 'Yes' : 'No' }}
                  </v-chip>
                </v-list-item-subtitle>
                <v-list-item-subtitle v-if="selectedTreatment.adherence.missed_dose_count">
                  Missed dose count: {{ selectedTreatment.adherence.missed_dose_count }}
                </v-list-item-subtitle>
                <v-list-item-subtitle v-if="selectedTreatment.adherence.notes">
                  Notes: {{ selectedTreatment.adherence.notes }}
                </v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
            
            <v-divider v-if="selectedTreatment?.next_appointment_date" />
            
            <v-list-item v-if="selectedTreatment?.next_appointment_date">
              <v-list-item-content>
                <v-list-item-title class="text-caption text-grey">Next Appointment</v-list-item-title>
                <v-list-item-subtitle>{{ formatDate(selectedTreatment.next_appointment_date) }}</v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
          </v-list>
        </v-card-text>
        
        <v-card-actions>
          <v-spacer />
          <v-btn color="success" @click="showTreatmentDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { usePatientStore } from '@/stores/patientStore';
import { useAuthStore } from '@/stores/authStore';
import api from '@/plugins/axios';

const patientStore = usePatientStore();
const authStore = useAuthStore();

const tab = ref('tests');
const testingEncounters = ref([]);
const treatmentEncounters = ref([]);
const showTestDialog = ref(false);
const showTreatmentDialog = ref(false);
const selectedTest = ref(null);
const selectedTreatment = ref(null);

const getTestResultColor = (result) => {
  const colors = {
    positive: 'error',
    negative: 'success',
    indeterminate: 'warning'
  };
  return colors[result] || 'grey';
};

const getTestResultIcon = (result) => {
  const icons = {
    positive: 'mdi-alert-circle',
    negative: 'mdi-check-circle',
    indeterminate: 'mdi-help-circle'
  };
  return icons[result] || 'mdi-circle-outline';
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const viewTestDetails = (test) => {
  selectedTest.value = test;
  showTestDialog.value = true;
};

const viewTreatmentDetails = (encounter) => {
  selectedTreatment.value = encounter;
  showTreatmentDialog.value = true;
};

const loadPatientHistory = async () => {
  try {
    const patientId = patientStore.currentPatient?.id;
    if (!patientId) {
      // Get patient by user ID
      const response = await api.get('/patients/me');
      patientStore.currentPatient = response.data;
      const id = response.data.id;
      
      const historyResponse = await api.get(`/patients/${id}/history`);
      testingEncounters.value = historyResponse.data.testing || [];
      treatmentEncounters.value = historyResponse.data.treatment || [];
    } else {
      const historyResponse = await api.get(`/patients/${patientId}/history`);
      testingEncounters.value = historyResponse.data.testing || [];
      treatmentEncounters.value = historyResponse.data.treatment || [];
    }
  } catch (error) {
    console.error('Error loading patient history:', error);
  }
};

onMounted(() => {
  loadPatientHistory();
});
</script>