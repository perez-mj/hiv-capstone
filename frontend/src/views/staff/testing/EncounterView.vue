<!-- frontend/src/views/staff/testing/EncounterView.vue -->
<template>
  <v-container fluid class="pa-4">
    <v-row>
      <v-col cols="12" lg="8" offset-lg="2">
        <v-card>
          <v-card-title class="d-flex justify-space-between align-center">
            {{ isEditMode ? 'Edit' : 'New' }} Testing Encounter
            <v-spacer></v-spacer>
            <v-chip color="info" variant="flat" v-if="patient">
              {{ patient.first_name }} {{ patient.last_name }}
            </v-chip>
          </v-card-title>
          <v-divider></v-divider>
          
          <v-card-text>
            <!-- Patient Selection -->
            <v-row v-if="!patient">
              <v-col cols="12">
                <v-card variant="outlined" class="pa-4">
                  <div class="text-subtitle-1 font-weight-medium mb-2">Select Patient</div>
                  <v-row>
                    <v-col cols="12" sm="8">
                      <v-text-field
                        v-model="searchQuery"
                        label="Search Patient"
                        placeholder="Type name or contact number..."
                        variant="outlined"
                        density="comfortable"
                        @update:model-value="searchPatients"
                        clearable
                      >
                        <template v-slot:append>
                          <v-progress-circular
                            v-if="searching"
                            indeterminate
                            size="24"
                          ></v-progress-circular>
                        </template>
                      </v-text-field>
                    </v-col>
                    <v-col cols="12" sm="4">
                      <v-btn 
                        block 
                        color="primary" 
                        variant="tonal"
                        @click="navigateToPatientCreate"
                      >
                        <v-icon start>mdi-account-plus</v-icon>
                        New Patient
                      </v-btn>
                    </v-col>
                  </v-row>
                  
                  <v-list v-if="searchResults.length > 0" density="compact">
                    <v-list-item 
                      v-for="p in searchResults" 
                      :key="p.id"
                      @click="selectPatient(p)"
                    >
                      <v-list-item-title>
                        {{ p.first_name }} {{ p.last_name }}
                      </v-list-item-title>
                      <v-list-item-subtitle>
                        {{ p.contact_number }} • {{ p.patient_facility_code }}
                      </v-list-item-subtitle>
                    </v-list-item>
                  </v-list>
                </v-card>
              </v-col>
            </v-row>

            <!-- Encounter Form -->
            <v-form v-else ref="form" v-model="valid">
              <!-- Patient Info -->
              <v-card variant="tonal" class="mb-4 pa-3">
                <v-row>
                  <v-col cols="12" sm="4">
                    <div class="text-caption text-grey">Name</div>
                    <div class="font-weight-medium">{{ patient.first_name }} {{ patient.last_name }}</div>
                  </v-col>
                  <v-col cols="12" sm="3">
                    <div class="text-caption text-grey">Age</div>
                    <div class="font-weight-medium">{{ patientAge }}</div>
                  </v-col>
                  <v-col cols="12" sm="3">
                    <div class="text-caption text-grey">Gender</div>
                    <div class="font-weight-medium">{{ patient.gender || 'N/A' }}</div>
                  </v-col>
                  <v-col cols="12" sm="2">
                    <div class="text-caption text-grey">Status</div>
                    <v-chip :color="patient.status === 'testing' ? 'info' : 'success'" size="small">
                      {{ patient.status }}
                    </v-chip>
                  </v-col>
                </v-row>
              </v-card>

              <!-- Step 1: Pre-test Counseling -->
              <v-card variant="outlined" class="mb-4">
                <v-card-title class="text-subtitle-1 font-weight-medium bg-primary-lighten-4">
                  <v-icon start>mdi-chat</v-icon>
                  Step 1: Pre-test Counseling
                  <v-spacer></v-spacer>
                  <v-checkbox
                    v-model="encounter.pretest_counseling.conducted"
                    label="Completed"
                    hide-details
                    density="compact"
                  ></v-checkbox>
                </v-card-title>
                <v-divider></v-divider>
                <v-card-text class="pt-4">
                  <v-row>
                    <v-col cols="12">
                      <div class="text-subtitle-2 mb-2">Counseling Checklist</div>
                      <v-checkbox
                        v-for="item in pretestChecklist"
                        :key="item.value"
                        v-model="encounter.pretest_counseling.checklist"
                        :value="item.value"
                        :label="item.label"
                        hide-details
                        density="compact"
                      ></v-checkbox>
                    </v-col>
                    <v-col cols="12" class="mt-2">
                      <v-textarea
                        v-model="encounter.pretest_counseling.notes"
                        label="Counseling Notes"
                        placeholder="Enter pre-test counseling notes..."
                        variant="outlined"
                        rows="3"
                      ></v-textarea>
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>

              <!-- Step 2: HIV Test Result -->
              <v-card variant="outlined" class="mb-4">
                <v-card-title class="text-subtitle-1 font-weight-medium bg-info-lighten-4">
                  <v-icon start>mdi-test-tube</v-icon>
                  Step 2: HIV Test Result
                </v-card-title>
                <v-divider></v-divider>
                <v-card-text class="pt-4">
                  <v-row>
                    <v-col cols="12" sm="6">
                      <v-select
                        v-model="encounter.hiv_test.result"
                        :items="testResultOptions"
                        label="Test Result"
                        variant="outlined"
                        density="comfortable"
                        required
                        :rules="[v => !!v || 'Test result is required']"
                        :disabled="!encounter.pretest_counseling.conducted"
                      ></v-select>
                    </v-col>
                    <v-col cols="12" sm="6">
                      <v-text-field
                        v-model="encounter.hiv_test.kit_lot_number"
                        label="Kit Lot Number"
                        variant="outlined"
                        density="comfortable"
                        :disabled="!encounter.pretest_counseling.conducted"
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12" sm="6">
                      <v-text-field
                        v-model="encounter.hiv_test.tested_by"
                        label="Tested By"
                        variant="outlined"
                        density="comfortable"
                        :disabled="!encounter.pretest_counseling.conducted"
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12" sm="6">
                      <v-text-field
                        v-model="encounter.hiv_test.test_date"
                        label="Test Date"
                        type="date"
                        variant="outlined"
                        density="comfortable"
                        :disabled="!encounter.pretest_counseling.conducted"
                      ></v-text-field>
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>

              <!-- Step 3: Post-test Counseling -->
              <v-card variant="outlined" class="mb-4">
                <v-card-title class="text-subtitle-1 font-weight-medium bg-success-lighten-4">
                  <v-icon start>mdi-chat-processing</v-icon>
                  Step 3: Post-test Counseling
                  <v-spacer></v-spacer>
                  <v-checkbox
                    v-model="encounter.posttest_counseling.conducted"
                    label="Completed"
                    hide-details
                    density="compact"
                    :disabled="!encounter.pretest_counseling.conducted || !encounter.hiv_test.result"
                  ></v-checkbox>
                </v-card-title>
                <v-divider></v-divider>
                <v-card-text class="pt-4">
                  <v-row>
                    <v-col cols="12">
                      <div class="text-subtitle-2 mb-2">Counseling Checklist</div>
                      <v-checkbox
                        v-for="item in posttestChecklist"
                        :key="item.value"
                        v-model="encounter.posttest_counseling.checklist"
                        :value="item.value"
                        :label="item.label"
                        hide-details
                        density="compact"
                        :disabled="!encounter.pretest_counseling.conducted || !encounter.hiv_test.result"
                      ></v-checkbox>
                    </v-col>
                    <v-col cols="12" class="mt-2">
                      <v-textarea
                        v-model="encounter.posttest_counseling.notes"
                        label="Counseling Notes"
                        placeholder="Enter post-test counseling notes..."
                        variant="outlined"
                        rows="3"
                        :disabled="!encounter.pretest_counseling.conducted || !encounter.hiv_test.result"
                      ></v-textarea>
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>

              <!-- Step 4: Referral (if positive) -->
              <v-card 
                v-if="encounter.hiv_test.result === 'positive'" 
                variant="outlined" 
                class="mb-4"
                color="warning"
              >
                <v-card-title class="text-subtitle-1 font-weight-medium bg-warning-lighten-4">
                  <v-icon start color="warning">mdi-alert-circle</v-icon>
                  Step 4: Referral to Treatment
                </v-card-title>
                <v-divider></v-divider>
                <v-card-text class="pt-4">
                  <v-alert type="info" variant="tonal" class="mb-3">
                    This patient tested positive and will be referred to the Treatment office.
                  </v-alert>
                  
                  <v-row>
                    <v-col cols="12">
                      <v-checkbox
                        v-model="encounter.referral.referred_to_treatment"
                        label="Refer to Treatment Office"
                        hide-details
                        density="compact"
                      ></v-checkbox>
                    </v-col>
                    <v-col cols="12">
                      <v-textarea
                        v-model="encounter.referral.reason"
                        label="Referral Reason"
                        placeholder="Enter referral reason..."
                        variant="outlined"
                        rows="2"
                      ></v-textarea>
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>

              <!-- Actions -->
              <v-row>
                <v-col cols="12" class="d-flex justify-space-between">
                  <v-btn variant="outlined" @click="cancel">
                    <v-icon start>mdi-close</v-icon>
                    Cancel
                  </v-btn>
                  
                  <div>
                    <v-btn 
                      color="success" 
                      @click="submitEncounter"
                      :loading="submitting"
                      :disabled="!isFormComplete"
                    >
                      <v-icon start>mdi-check</v-icon>
                      {{ isEditMode ? 'Update' : 'Submit' }} Encounter
                    </v-btn>
                  </div>
                </v-col>
              </v-row>
            </v-form>
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
import testingService from '@/services/testingService'
import patientService from '@/services/patientService'

export default {
  name: 'TestingEncounterView',
  setup() {
    const router = useRouter()
    const route = useRoute()
    const form = ref(null)
    const valid = ref(false)
    const submitting = ref(false)
    const searching = ref(false)
    const searchQuery = ref('')
    const searchResults = ref([])
    const patient = ref(null)
    const isEditMode = ref(false)
    const encounterId = ref(null)

    const snackbar = ref({
      show: false,
      message: '',
      color: 'success'
    })

    // Form data
    const encounter = ref({
      pretest_counseling: {
        conducted: false,
        checklist: [],
        notes: ''
      },
      hiv_test: {
        result: null,
        kit_lot_number: '',
        tested_by: '',
        test_date: new Date().toISOString().split('T')[0]
      },
      posttest_counseling: {
        conducted: false,
        checklist: [],
        notes: ''
      },
      referral: {
        referred_to_treatment: true,
        reason: 'HIV Positive result'
      }
    })

    // Options
    const testResultOptions = [
      { title: 'Select result...', value: null },
      { title: 'Positive', value: 'positive' },
      { title: 'Negative', value: 'negative' },
      { title: 'Indeterminate', value: 'indeterminate' }
    ]

    const pretestChecklist = [
      { value: 'informed_consent', label: 'Informed consent obtained' },
      { value: 'risk_assessment', label: 'Risk assessment completed' },
      { value: 'test_explained', label: 'Testing process explained' },
      { value: 'confidentiality', label: 'Confidentiality discussed' },
      { value: 'support_system', label: 'Support system identified' }
    ]

    const posttestChecklist = [
      { value: 'result_discussed', label: 'Result discussed' },
      { value: 'emotional_support', label: 'Emotional support provided' },
      { value: 'next_steps', label: 'Next steps explained' },
      { value: 'prevention_counseling', label: 'Prevention counseling' },
      { value: 'referral_info', label: 'Referral information provided' }
    ]

    // Computed
    const patientAge = computed(() => {
      if (!patient.value?.birth_date) return 'N/A'
      const birth = new Date(patient.value.birth_date)
      const today = new Date()
      let age = today.getFullYear() - birth.getFullYear()
      const m = today.getMonth() - birth.getMonth()
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--
      }
      return age
    })

    const isFormComplete = computed(() => {
      const e = encounter.value
      return e.pretest_counseling.conducted &&
             e.hiv_test.result &&
             e.posttest_counseling.conducted
    })

    // Methods
    const loadPatient = async (id) => {
      try {
        const data = await patientService.getPatient(id)
        patient.value = data
        console.log('Patient loaded:', data)
      } catch (error) {
        showSnackbar('Failed to load patient: ' + error.message, 'error')
      }
    }

    const loadEncounter = async (id) => {
      try {
        const data = await testingService.getEncounter(id)
        encounter.value = data
        patient.value = data.Patient
        isEditMode.value = true
        encounterId.value = id
        console.log('Encounter loaded:', data)
      } catch (error) {
        showSnackbar('Failed to load encounter: ' + error.message, 'error')
      }
    }

    const searchPatients = async () => {
      if (searchQuery.value.length < 2) {
        searchResults.value = []
        return
      }
      
      searching.value = true
      try {
        const results = await patientService.searchPatients(searchQuery.value)
        searchResults.value = results.slice(0, 10)
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        searching.value = false
      }
    }

    const selectPatient = (p) => {
      patient.value = p
      searchQuery.value = ''
      searchResults.value = []
    }

    const submitEncounter = async () => {
      if (!form.value || !form.value.validate()) {
        showSnackbar('Please fill in all required fields', 'warning')
        return
      }

      if (!encounter.value.pretest_counseling.conducted) {
        showSnackbar('Pre-test counseling must be completed', 'warning')
        return
      }

      if (!encounter.value.hiv_test.result) {
        showSnackbar('HIV test result is required', 'warning')
        return
      }

      if (!encounter.value.posttest_counseling.conducted) {
        showSnackbar('Post-test counseling must be completed', 'warning')
        return
      }

      submitting.value = true
      try {
        const data = {
          patient_id: patient.value.id,
          ...encounter.value
        }

        const result = await testingService.createEncounter(data)
        showSnackbar('Encounter submitted successfully!', 'success')
        
        // If positive, navigate to treatment or show message
        if (encounter.value.hiv_test.result === 'positive') {
          setTimeout(() => {
            router.push(`/treatment/encounter/${patient.value.id}`)
          }, 1500)
        } else {
          setTimeout(() => {
            router.push('/testing/queue')
          }, 1500)
        }
      } catch (error) {
        console.error('Submit error:', error)
        showSnackbar('Failed to submit: ' + (error.response?.data?.error || error.message), 'error')
      } finally {
        submitting.value = false
      }
    }

    const cancel = () => {
      if (confirm('Are you sure you want to cancel? Any unsaved data will be lost.')) {
        router.push('/testing/queue')
      }
    }

    const navigateToPatientCreate = () => {
      router.push('/patients/create')
    }

    const showSnackbar = (message, color = 'success') => {
      snackbar.value = { show: true, message, color }
    }

    // Lifecycle
    onMounted(async () => {
      const patientId = route.params.patientId
      const id = route.params.id

      if (id) {
        await loadEncounter(id)
      } else if (patientId) {
        await loadPatient(patientId)
      }
    })

    return {
      // State
      form,
      valid,
      submitting,
      searching,
      searchQuery,
      searchResults,
      patient,
      isEditMode,
      encounterId,
      encounter,
      snackbar,
      
      // Computed
      patientAge,
      isFormComplete,
      
      // Options
      testResultOptions,
      pretestChecklist,
      posttestChecklist,
      
      // Methods
      searchPatients,
      selectPatient,
      submitEncounter,
      cancel,
      navigateToPatientCreate
    }
  }
}
</script>