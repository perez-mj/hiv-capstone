<!-- frontend/src/views/staff/treatment/EncounterView.vue -->
<template>
  <v-container fluid class="pa-4">
    <v-row>
      <v-col cols="12" lg="8" offset-lg="2">
        <v-card>
          <v-card-title class="text-h5">
            <v-icon start>mdi-clipboard-pulse</v-icon>
            {{ isEditMode ? 'Edit' : 'New' }} Treatment Encounter
            <v-spacer></v-spacer>
            <v-chip color="success" variant="flat" v-if="patient">
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
                  
                  <v-alert type="info" variant="tonal" class="mb-3">
                    <strong>Note:</strong> Only patients with status "treatment" can be seen here.
                  </v-alert>
                  
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
                        <v-chip 
                          :color="p.status === 'treatment' ? 'success' : 'warning'" 
                          size="x-small"
                          class="ml-2"
                        >
                          {{ p.status }}
                        </v-chip>
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
                    <v-chip color="success" size="small">Treatment</v-chip>
                  </v-col>
                </v-row>
              </v-card>

              <!-- Consultation Notes (SOAP) -->
              <v-card variant="outlined" class="mb-4">
                <v-card-title class="text-subtitle-1 font-weight-medium bg-info-lighten-4">
                  <v-icon start>mdi-note-text</v-icon>
                  Consultation Notes (SOAP Format)
                </v-card-title>
                <v-divider></v-divider>
                <v-card-text class="pt-4">
                  <v-row>
                    <v-col cols="12" sm="6">
                      <v-textarea
                        v-model="encounter.consultation_notes.subjective"
                        label="Subjective (Patient's symptoms, complaints)"
                        placeholder="What the patient reports..."
                        variant="outlined"
                        rows="3"
                      ></v-textarea>
                    </v-col>
                    <v-col cols="12" sm="6">
                      <v-textarea
                        v-model="encounter.consultation_notes.objective"
                        label="Objective (Clinical findings, vitals)"
                        placeholder="Physical exam findings, test results..."
                        variant="outlined"
                        rows="3"
                      ></v-textarea>
                    </v-col>
                    <v-col cols="12" sm="6">
                      <v-textarea
                        v-model="encounter.consultation_notes.assessment"
                        label="Assessment (Diagnosis, clinical impression)"
                        placeholder="Your assessment and diagnosis..."
                        variant="outlined"
                        rows="3"
                      ></v-textarea>
                    </v-col>
                    <v-col cols="12" sm="6">
                      <v-textarea
                        v-model="encounter.consultation_notes.plan"
                        label="Plan (Treatment, follow-up, referrals)"
                        placeholder="Treatment plan, medications, follow-up..."
                        variant="outlined"
                        rows="3"
                      ></v-textarea>
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>

              <!-- ART Prescription -->
              <v-card variant="outlined" class="mb-4">
                <v-card-title class="text-subtitle-1 font-weight-medium bg-success-lighten-4">
                  <v-icon start>mdi-pill</v-icon>
                  ART Prescription
                </v-card-title>
                <v-divider></v-divider>
                <v-card-text class="pt-4">
                  <v-row>
                    <v-col cols="12" sm="6">
                      <v-text-field
                        v-model="encounter.art_prescription.medication_name"
                        label="Medication Name"
                        placeholder="e.g., Tenofovir/Lamivudine/Dolutegravir"
                        variant="outlined"
                        density="comfortable"
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12" sm="6">
                      <v-text-field
                        v-model="encounter.art_prescription.dosage"
                        label="Dosage"
                        placeholder="e.g., 300mg/300mg/50mg"
                        variant="outlined"
                        density="comfortable"
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12" sm="4">
                      <v-text-field
                        v-model="encounter.art_prescription.frequency"
                        label="Frequency"
                        placeholder="e.g., Once daily"
                        variant="outlined"
                        density="comfortable"
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12" sm="4">
                      <v-text-field
                        v-model="encounter.art_prescription.quantity"
                        label="Quantity"
                        placeholder="e.g., 30 tablets"
                        variant="outlined"
                        density="comfortable"
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12" sm="4">
                      <v-text-field
                        v-model="encounter.art_prescription.refill_date"
                        label="Refill Date"
                        type="date"
                        variant="outlined"
                        density="comfortable"
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12">
                      <v-text-field
                        v-model="encounter.art_prescription.prescribed_by"
                        label="Prescribed By"
                        placeholder="Doctor's name"
                        variant="outlined"
                        density="comfortable"
                      ></v-text-field>
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>

              <!-- Lab Results -->
              <v-card variant="outlined" class="mb-4">
                <v-card-title class="text-subtitle-1 font-weight-medium bg-warning-lighten-4">
                  <v-icon start>mdi-flask</v-icon>
                  Lab Results
                </v-card-title>
                <v-divider></v-divider>
                <v-card-text class="pt-4">
                  <v-row>
                    <v-col cols="12" sm="6">
                      <v-text-field
                        v-model="labResults.cd4.value"
                        label="CD4 Count"
                        placeholder="e.g., 450"
                        variant="outlined"
                        density="comfortable"
                      ></v-text-field>
                      <v-text-field
                        v-model="labResults.cd4.date"
                        label="CD4 Date"
                        type="date"
                        variant="outlined"
                        density="comfortable"
                      ></v-text-field>
                      <v-textarea
                        v-model="labResults.cd4.notes"
                        label="CD4 Notes"
                        variant="outlined"
                        rows="2"
                      ></v-textarea>
                    </v-col>
                    <v-col cols="12" sm="6">
                      <v-text-field
                        v-model="labResults.viral_load.value"
                        label="Viral Load"
                        placeholder="e.g., < 40"
                        variant="outlined"
                        density="comfortable"
                      ></v-text-field>
                      <v-text-field
                        v-model="labResults.viral_load.date"
                        label="Viral Load Date"
                        type="date"
                        variant="outlined"
                        density="comfortable"
                      ></v-text-field>
                      <v-textarea
                        v-model="labResults.viral_load.notes"
                        label="Viral Load Notes"
                        variant="outlined"
                        rows="2"
                      ></v-textarea>
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>

              <!-- Adherence Monitoring -->
              <v-card variant="outlined" class="mb-4">
                <v-card-title class="text-subtitle-1 font-weight-medium bg-error-lighten-4">
                  <v-icon start>mdi-calendar-check</v-icon>
                  Adherence Monitoring
                </v-card-title>
                <v-divider></v-divider>
                <v-card-text class="pt-4">
                  <v-row>
                    <v-col cols="12" sm="6">
                      <v-select
                        v-model="encounter.adherence.missed_doses_last_30_days"
                        :items="adherenceOptions"
                        label="Missed doses in last 30 days?"
                        variant="outlined"
                        density="comfortable"
                      ></v-select>
                    </v-col>
                    <v-col cols="12" sm="6">
                      <v-text-field
                        v-model="encounter.adherence.missed_dose_count"
                        label="Number of missed doses"
                        placeholder="e.g., 2"
                        type="number"
                        variant="outlined"
                        density="comfortable"
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12">
                      <v-textarea
                        v-model="encounter.adherence.notes"
                        label="Adherence Notes"
                        placeholder="Additional notes about adherence..."
                        variant="outlined"
                        rows="2"
                      ></v-textarea>
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>

              <!-- Next Appointment -->
              <v-card variant="outlined" class="mb-4">
                <v-card-title class="text-subtitle-1 font-weight-medium bg-primary-lighten-4">
                  <v-icon start>mdi-calendar-plus</v-icon>
                  Next Appointment
                </v-card-title>
                <v-divider></v-divider>
                <v-card-text class="pt-4">
                  <v-row>
                    <v-col cols="12" sm="6">
                      <v-text-field
                        v-model="encounter.next_appointment_date"
                        label="Next Appointment Date"
                        type="date"
                        variant="outlined"
                        density="comfortable"
                      ></v-text-field>
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
                      v-if="!isEditMode"
                      color="primary" 
                      variant="tonal"
                      @click="saveDraft"
                      class="mr-2"
                    >
                      <v-icon start>mdi-content-save</v-icon>
                      Save Draft
                    </v-btn>
                    
                    <v-btn 
                      color="success" 
                      @click="submitEncounter"
                      :loading="submitting"
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
import treatmentService from '@/services/treatmentService'
import patientService from '@/services/patientService'

export default {
  name: 'TreatmentEncounterView',
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
      consultation_notes: {
        subjective: '',
        objective: '',
        assessment: '',
        plan: ''
      },
      art_prescription: {
        medication_name: '',
        dosage: '',
        frequency: '',
        quantity: '',
        refill_date: '',
        prescribed_by: ''
      },
      lab_results: [],
      adherence: {
        missed_doses_last_30_days: 'no',
        missed_dose_count: 0,
        notes: ''
      },
      next_appointment_date: ''
    })

    // Lab results helper
    const labResults = ref({
      cd4: {
        value: '',
        date: '',
        notes: ''
      },
      viral_load: {
        value: '',
        date: '',
        notes: ''
      }
    })

    // Options
    const adherenceOptions = [
      { title: 'No', value: 'no' },
      { title: 'Yes, occasional', value: 'occasional' },
      { title: 'Yes, frequent', value: 'frequent' }
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

    // Methods
    const loadPatient = async (id) => {
      try {
        const data = await patientService.getPatient(id)
        if (data.status !== 'treatment') {
          showSnackbar('Patient must be in treatment status', 'warning')
          return
        }
        patient.value = data
      } catch (error) {
        showSnackbar('Failed to load patient: ' + error.message, 'error')
      }
    }

    const loadEncounter = async (id) => {
      try {
        const data = await treatmentService.getEncounter(id)
        encounter.value = data
        patient.value = data.Patient
        isEditMode.value = true
        encounterId.value = id
        
        // Populate lab results if they exist
        if (data.lab_results && data.lab_results.length > 0) {
          data.lab_results.forEach(result => {
            if (result.type === 'CD4') {
              labResults.value.cd4 = result
            } else if (result.type === 'viral_load') {
              labResults.value.viral_load = result
            }
          })
        }
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
        // Only show treatment patients
        searchResults.value = results.filter(p => p.status === 'treatment').slice(0, 10)
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        searching.value = false
      }
    }

    const selectPatient = (p) => {
      if (p.status !== 'treatment') {
        showSnackbar('Patient must be in treatment status', 'warning')
        return
      }
      patient.value = p
      searchQuery.value = ''
      searchResults.value = []
    }

    const prepareLabResults = () => {
      const results = []
      
      if (labResults.value.cd4.value) {
        results.push({
          type: 'CD4',
          value: labResults.value.cd4.value,
          date: labResults.value.cd4.date || new Date().toISOString().split('T')[0],
          notes: labResults.value.cd4.notes || ''
        })
      }
      
      if (labResults.value.viral_load.value) {
        results.push({
          type: 'viral_load',
          value: labResults.value.viral_load.value,
          date: labResults.value.viral_load.date || new Date().toISOString().split('T')[0],
          notes: labResults.value.viral_load.notes || ''
        })
      }
      
      return results
    }

    const saveDraft = () => {
      showSnackbar('Draft saved (local)', 'info')
    }

    const submitEncounter = async () => {
      if (!form.value || !form.value.validate()) {
        showSnackbar('Please fill in all required fields', 'warning')
        return
      }

      submitting.value = true
      try {
        const data = {
          patient_id: patient.value.id,
          consultation_notes: encounter.value.consultation_notes,
          art_prescription: encounter.value.art_prescription,
          lab_results: prepareLabResults(),
          adherence: encounter.value.adherence,
          next_appointment_date: encounter.value.next_appointment_date
        }

        const result = await treatmentService.createEncounter(data)
        showSnackbar('Treatment encounter submitted successfully!', 'success')
        
        setTimeout(() => {
          router.push('/treatment/queue')
        }, 1500)
      } catch (error) {
        console.error('Submit error:', error)
        showSnackbar('Failed to submit: ' + (error.response?.data?.error || error.message), 'error')
      } finally {
        submitting.value = false
      }
    }

    const cancel = () => {
      if (confirm('Are you sure you want to cancel? Any unsaved data will be lost.')) {
        router.push('/treatment/queue')
      }
    }

    const navigateToPatientCreate = () => {
      router.push('/patients/create')
    }

    const showSnackbar = (message, color = 'success') => {
      snackbar.value = { show: true, message, color }
    }

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
      labResults,
      snackbar,
      patientAge,
      adherenceOptions,
      searchPatients,
      selectPatient,
      saveDraft,
      submitEncounter,
      cancel,
      navigateToPatientCreate,
      prepareLabResults
    }
  }
}
</script>