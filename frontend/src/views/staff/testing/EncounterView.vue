<!-- frontend/src/views/staff/testing/EncounterView.vue -->
<template>
  <v-container fluid class="pa-4">
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="text-h5">
            <v-icon left>mdi-test-tube</v-icon>
            Testing Encounter
            <v-spacer></v-spacer>
            <v-chip color="primary" small v-if="patient">
              {{ patient.first_name }} {{ patient.last_name }}
            </v-chip>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <!-- Step Progress -->
            <v-stepper v-model="step" vertical>
              <!-- Step 1: Patient Selection -->
              <v-stepper-step :complete="step > 1" step="1">
                Select Patient
                <small>Choose a patient for testing</small>
              </v-stepper-step>
              <v-stepper-content step="1">
                <v-autocomplete
                  v-model="selectedPatientId"
                  :items="patientOptions"
                  label="Search Patient"
                  prepend-icon="mdi-account-search"
                  item-title="label"
                  item-value="id"
                  :loading="searchLoading"
                  @update:search="searchPatients"
                  clearable
                ></v-autocomplete>
                <v-btn color="primary" @click="step = 2" :disabled="!selectedPatientId">
                  Continue
                </v-btn>
                <v-btn text @click="step = 1">Cancel</v-btn>
              </v-stepper-content>

              <!-- Step 2: Pre-test Counseling -->
              <v-stepper-step :complete="step > 2" step="2">
                Pre-test Counseling
                <small>Complete counseling checklist</small>
              </v-stepper-step>
              <v-stepper-content step="2">
                <v-card outlined class="pa-4 mb-4">
                  <v-checkbox
                    v-model="pretest.conducted"
                    label="Pre-test counseling conducted"
                    color="primary"
                  ></v-checkbox>
                  
                  <v-textarea
                    v-model="pretest.notes"
                    label="Counseling Notes"
                    rows="3"
                    outlined
                    class="mt-2"
                  ></v-textarea>
                  
                  <v-divider class="my-3"></v-divider>
                  
                  <div class="text-subtitle-2 mb-2">Checklist:</div>
                  <v-checkbox
                    v-for="item in pretestChecklist"
                    :key="item.value"
                    v-model="pretest.checklist"
                    :label="item.label"
                    :value="item.value"
                    color="primary"
                  ></v-checkbox>
                </v-card>
                
                <v-btn color="primary" @click="step = 3" :disabled="!pretest.conducted">
                  Next
                </v-btn>
                <v-btn text @click="step = 1">Back</v-btn>
              </v-stepper-content>

              <!-- Step 3: HIV Test Result -->
              <v-stepper-step :complete="step > 3" step="3">
                HIV Test Result
                <small>Record test results</small>
              </v-stepper-step>
              <v-stepper-content step="3">
                <v-card outlined class="pa-4 mb-4">
                  <v-select
                    v-model="hivTest.result"
                    :items="testResults"
                    label="Test Result"
                    outlined
                  ></v-select>
                  
                  <v-text-field
                    v-model="hivTest.kit_lot_number"
                    label="Kit Lot Number"
                    outlined
                  ></v-text-field>
                  
                  <v-text-field
                    v-model="hivTest.tested_by"
                    label="Tested By"
                    outlined
                  ></v-text-field>
                  
                  <v-menu
                    v-model="testDateMenu"
                    :close-on-content-click="false"
                    transition="scale-transition"
                  >
                    <template v-slot:activator="{ props }">
                      <v-text-field
                        v-model="hivTest.test_date"
                        label="Test Date"
                        prepend-inner-icon="mdi-calendar"
                        readonly
                        v-bind="props"
                        outlined
                      ></v-text-field>
                    </template>
                    <v-date-picker
                      v-model="hivTest.test_date"
                      @update:model-value="testDateMenu = false"
                    ></v-date-picker>
                  </v-menu>
                </v-card>
                
                <v-btn color="primary" @click="step = 4" :disabled="!hivTest.result">
                  Next
                </v-btn>
                <v-btn text @click="step = 2">Back</v-btn>
              </v-stepper-content>

              <!-- Step 4: Post-test Counseling -->
              <v-stepper-step :complete="step > 4" step="4">
                Post-test Counseling
                <small>Complete post-test counseling</small>
              </v-stepper-step>
              <v-stepper-content step="4">
                <v-card outlined class="pa-4 mb-4">
                  <v-checkbox
                    v-model="posttest.conducted"
                    label="Post-test counseling conducted"
                    color="primary"
                  ></v-checkbox>
                  
                  <v-textarea
                    v-model="posttest.notes"
                    label="Counseling Notes"
                    rows="3"
                    outlined
                    class="mt-2"
                  ></v-textarea>
                  
                  <v-divider class="my-3"></v-divider>
                  
                  <div class="text-subtitle-2 mb-2">Checklist:</div>
                  <v-checkbox
                    v-for="item in posttestChecklist"
                    :key="item.value"
                    v-model="posttest.checklist"
                    :label="item.label"
                    :value="item.value"
                    color="primary"
                  ></v-checkbox>
                </v-card>
                
                <v-btn color="primary" @click="step = 5" :disabled="!posttest.conducted">
                  Next
                </v-btn>
                <v-btn text @click="step = 3">Back</v-btn>
              </v-stepper-content>

              <!-- Step 5: Review & Submit -->
              <v-stepper-step step="5">
                Review & Submit
                <small>Review and submit encounter</small>
              </v-stepper-step>
              <v-stepper-content step="5">
                <v-card outlined class="pa-4 mb-4">
                  <div class="text-subtitle-1 font-weight-bold mb-2">Summary</div>
                  <v-list dense>
                    <v-list-item>
                      <v-list-item-content>
                        <v-list-item-title>Patient: {{ patientName }}</v-list-item-title>
                      </v-list-item-content>
                    </v-list-item>
                    <v-list-item>
                      <v-list-item-content>
                        <v-list-item-title>Pre-test Counseling: {{ pretest.conducted ? '✅' : '❌' }}</v-list-item-title>
                      </v-list-item-content>
                    </v-list-item>
                    <v-list-item>
                      <v-list-item-content>
                        <v-list-item-title>HIV Result: {{ hivTest.result || 'Not recorded' }}</v-list-item-title>
                      </v-list-item-content>
                    </v-list-item>
                    <v-list-item>
                      <v-list-item-content>
                        <v-list-item-title>Post-test Counseling: {{ posttest.conducted ? '✅' : '❌' }}</v-list-item-title>
                      </v-list-item-content>
                    </v-list-item>
                  </v-list>
                  
                  <v-alert
                    v-if="hivTest.result === 'positive'"
                    type="warning"
                    prominent
                    class="mt-3"
                  >
                    <div class="font-weight-bold">⚠️ Positive Result</div>
                    <div>This patient will be automatically referred to the Treatment Office.</div>
                  </v-alert>
                </v-card>
                
                <v-btn color="success" @click="submitEncounter" :loading="submitting">
                  <v-icon left>mdi-check</v-icon>
                  Submit Encounter
                </v-btn>
                <v-btn text @click="step = 4">Back</v-btn>
              </v-stepper-content>
            </v-stepper>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import patientService from '@/services/patientService'
import testingService from '@/services/testingService'

export default {
  name: 'TestingEncounter',
  setup() {
    const router = useRouter()
    const route = useRoute()
    
    const step = ref(1)
    const submitting = ref(false)
    const searchLoading = ref(false)
    const selectedPatientId = ref(null)
    const patient = ref(null)
    const patientOptions = ref([])
    const testDateMenu = ref(false)

    const pretest = ref({
      conducted: false,
      notes: '',
      checklist: []
    })

    const hivTest = ref({
      result: null,
      kit_lot_number: '',
      tested_by: '',
      test_date: new Date().toISOString().split('T')[0]
    })

    const posttest = ref({
      conducted: false,
      notes: '',
      checklist: []
    })

    const pretestChecklist = [
      { label: 'Explained HIV testing process', value: 'explained_process' },
      { label: 'Discussed risk factors', value: 'risk_factors' },
      { label: 'Obtained informed consent', value: 'informed_consent' },
      { label: 'Discussed confidentiality', value: 'confidentiality' }
    ]

    const posttestChecklist = [
      { label: 'Discussed test result', value: 'discussed_result' },
      { label: 'Provided risk reduction counseling', value: 'risk_reduction' },
      { label: 'Discussed next steps', value: 'next_steps' },
      { label: 'Provided referral if needed', value: 'referral' }
    ]

    const testResults = [
      { title: 'Positive', value: 'positive' },
      { title: 'Negative', value: 'negative' },
      { title: 'Indeterminate', value: 'indeterminate' }
    ]

    const snackbar = ref({
      show: false,
      message: '',
      color: 'success'
    })

    const patientName = computed(() => {
      if (patient.value) {
        return `${patient.value.first_name} ${patient.value.last_name}`
      }
      return 'Not selected'
    })

    const searchPatients = async (search) => {
      if (!search || search.length < 2) {
        patientOptions.value = []
        return
      }
      searchLoading.value = true
      try {
        const response = await patientService.searchPatients(search)
        patientOptions.value = response.map(p => ({
          id: p.id,
          label: `${p.first_name} ${p.last_name} - ${p.contact_number}`
        }))
      } catch (error) {
        console.error('Search failed:', error)
      } finally {
        searchLoading.value = false
      }
    }

    const loadPatient = async (id) => {
      try {
        const response = await patientService.getPatient(id)
        patient.value = response
      } catch (error) {
        showSnackbar('Failed to load patient: ' + error.message, 'error')
      }
    }

    const submitEncounter = async () => {
      if (!selectedPatientId.value) {
        showSnackbar('Please select a patient', 'error')
        return
      }

      submitting.value = true
      try {
        const data = {
          patient_id: selectedPatientId.value,
          pretest_counseling: pretest.value,
          hiv_test: hivTest.value,
          posttest_counseling: posttest.value,
          referral: {
            referred_to_treatment: hivTest.value.result === 'positive',
            reason: hivTest.value.result === 'positive' ? 'HIV Positive' : null,
            referred_at: hivTest.value.result === 'positive' ? new Date() : null
          }
        }

        await testingService.createEncounter(data)
        showSnackbar('Encounter submitted successfully!', 'success')
        
        // Navigate back to queue after delay
        setTimeout(() => {
          router.push('/testing/queue')
        }, 1500)
      } catch (error) {
        showSnackbar('Failed to submit: ' + error.message, 'error')
      } finally {
        submitting.value = false
      }
    }

    const showSnackbar = (message, color = 'success') => {
      snackbar.value = { show: true, message, color }
    }

    // Load patient if ID is in route params
    onMounted(() => {
      if (route.params.patientId) {
        selectedPatientId.value = parseInt(route.params.patientId)
        loadPatient(selectedPatientId.value)
        // Auto-advance to step 2
        setTimeout(() => {
          step.value = 2
        }, 500)
      }
    })

    return {
      step,
      submitting,
      searchLoading,
      selectedPatientId,
      patient,
      patientOptions,
      testDateMenu,
      pretest,
      hivTest,
      posttest,
      pretestChecklist,
      posttestChecklist,
      testResults,
      patientName,
      searchPatients,
      loadPatient,
      submitEncounter,
      snackbar
    }
  }
}
</script>