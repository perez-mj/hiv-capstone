<!-- frontend/src/views/staff/treatment/EncounterView.vue -->
<template>
  <v-container fluid class="pa-4">
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="text-h5">
            <v-icon left>mdi-pill</v-icon>
            Treatment Encounter
            <v-spacer></v-spacer>
            <v-chip color="primary" small v-if="patient">
              {{ patient.first_name }} {{ patient.last_name }}
            </v-chip>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <v-form ref="form" v-model="valid">
              <!-- Patient Selection -->
              <v-row v-if="!selectedPatientId">
                <v-col cols="12">
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
                </v-col>
              </v-row>

              <!-- Consultation Notes -->
              <v-row>
                <v-col cols="12">
                  <div class="text-subtitle-1 font-weight-bold mb-2">Consultation Notes</div>
                  <v-textarea
                    v-model="encounter.consultation_notes.subjective"
                    label="Subjective (Patient's complaint)"
                    rows="2"
                    outlined
                  ></v-textarea>
                  <v-textarea
                    v-model="encounter.consultation_notes.objective"
                    label="Objective (Findings)"
                    rows="2"
                    outlined
                  ></v-textarea>
                  <v-textarea
                    v-model="encounter.consultation_notes.assessment"
                    label="Assessment (Diagnosis)"
                    rows="2"
                    outlined
                  ></v-textarea>
                  <v-textarea
                    v-model="encounter.consultation_notes.plan"
                    label="Plan (Treatment plan)"
                    rows="2"
                    outlined
                  ></v-textarea>
                </v-col>
              </v-row>

              <v-divider class="my-4"></v-divider>

              <!-- ART Prescription -->
              <v-row>
                <v-col cols="12">
                  <div class="text-subtitle-1 font-weight-bold mb-2">ART Prescription</div>
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="encounter.art_prescription.medication_name"
                    label="Medication Name"
                    outlined
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="3">
                  <v-text-field
                    v-model="encounter.art_prescription.dosage"
                    label="Dosage"
                    outlined
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="3">
                  <v-text-field
                    v-model="encounter.art_prescription.frequency"
                    label="Frequency"
                    outlined
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="encounter.art_prescription.quantity"
                    label="Quantity"
                    type="number"
                    outlined
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="4">
                  <v-menu
                    v-model="refillMenu"
                    :close-on-content-click="false"
                    transition="scale-transition"
                  >
                    <template v-slot:activator="{ props }">
                      <v-text-field
                        v-model="encounter.art_prescription.refill_date"
                        label="Refill Date"
                        prepend-inner-icon="mdi-calendar"
                        readonly
                        v-bind="props"
                        outlined
                      ></v-text-field>
                    </template>
                    <v-date-picker
                      v-model="encounter.art_prescription.refill_date"
                      @update:model-value="refillMenu = false"
                    ></v-date-picker>
                  </v-menu>
                </v-col>
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="encounter.art_prescription.prescribed_by"
                    label="Prescribed By"
                    outlined
                  ></v-text-field>
                </v-col>
              </v-row>

              <v-divider class="my-4"></v-divider>

              <!-- Lab Results -->
              <v-row>
                <v-col cols="12">
                  <div class="d-flex justify-space-between align-center">
                    <div class="text-subtitle-1 font-weight-bold">Lab Results</div>
                    <v-btn color="primary" small @click="addLabResult">
                      <v-icon left small>mdi-plus</v-icon>
                      Add Lab Result
                    </v-btn>
                  </div>
                </v-col>
                <v-col cols="12">
                  <v-card v-for="(lab, index) in encounter.lab_results" :key="index" outlined class="pa-3 mb-2">
                    <v-row>
                      <v-col cols="12" md="4">
                        <v-select
                          v-model="lab.type"
                          :items="labTypes"
                          label="Test Type"
                          outlined dense
                        ></v-select>
                      </v-col>
                      <v-col cols="12" md="3">
                        <v-text-field
                          v-model="lab.value"
                          label="Value"
                          outlined dense
                        ></v-text-field>
                      </v-col>
                      <v-col cols="12" md="3">
                        <v-menu
                          v-model="lab.dateMenu"
                          :close-on-content-click="false"
                          transition="scale-transition"
                        >
                          <template v-slot:activator="{ props }">
                            <v-text-field
                              v-model="lab.date"
                              label="Date"
                              prepend-inner-icon="mdi-calendar"
                              readonly
                              v-bind="props"
                              outlined dense
                            ></v-text-field>
                          </template>
                          <v-date-picker
                            v-model="lab.date"
                            @update:model-value="lab.dateMenu = false"
                          ></v-date-picker>
                        </v-menu>
                      </v-col>
                      <v-col cols="12" md="2" class="text-right">
                        <v-btn icon small color="error" @click="removeLabResult(index)">
                          <v-icon small>mdi-delete</v-icon>
                        </v-btn>
                      </v-col>
                    </v-row>
                    <v-textarea
                      v-model="lab.notes"
                      label="Notes"
                      rows="1"
                      outlined dense
                    ></v-textarea>
                  </v-card>
                </v-col>
              </v-row>

              <v-divider class="my-4"></v-divider>

              <!-- Adherence Monitoring -->
              <v-row>
                <v-col cols="12">
                  <div class="text-subtitle-1 font-weight-bold mb-2">Adherence Monitoring</div>
                </v-col>
                <v-col cols="12">
                  <v-checkbox
                    v-model="encounter.adherence.missed_doses_last_30_days"
                    label="Patient reported missed doses in the last 30 days"
                    color="primary"
                  ></v-checkbox>
                </v-col>
                <v-col cols="12" md="6" v-if="encounter.adherence.missed_doses_last_30_days">
                  <v-text-field
                    v-model="encounter.adherence.missed_dose_count"
                    label="Number of missed doses"
                    type="number"
                    outlined
                  ></v-text-field>
                </v-col>
                <v-col cols="12">
                  <v-textarea
                    v-model="encounter.adherence.notes"
                    label="Adherence Notes"
                    rows="2"
                    outlined
                  ></v-textarea>
                </v-col>
              </v-row>

              <v-divider class="my-4"></v-divider>

              <!-- Next Appointment -->
              <v-row>
                <v-col cols="12" md="6">
                  <v-menu
                    v-model="nextAppointmentMenu"
                    :close-on-content-click="false"
                    transition="scale-transition"
                  >
                    <template v-slot:activator="{ props }">
                      <v-text-field
                        v-model="encounter.next_appointment_date"
                        label="Next Appointment Date"
                        prepend-inner-icon="mdi-calendar"
                        readonly
                        v-bind="props"
                        outlined
                      ></v-text-field>
                    </template>
                    <v-date-picker
                      v-model="encounter.next_appointment_date"
                      @update:model-value="nextAppointmentMenu = false"
                      min="today"
                    ></v-date-picker>
                  </v-menu>
                </v-col>
                <v-col cols="12" md="6">
                  <v-select
                    v-model="nextAppointmentTime"
                    :items="timeSlots"
                    label="Appointment Time"
                    outlined
                  ></v-select>
                </v-col>
              </v-row>

              <v-divider class="my-4"></v-divider>

              <!-- Submit -->
              <v-row>
                <v-col cols="12" class="text-right">
                  <v-btn color="error" @click="cancel">Cancel</v-btn>
                  <v-btn color="primary" @click="submit" :loading="submitting" :disabled="!valid" class="ml-2">
                    <v-icon left>mdi-check</v-icon>
                    Save Encounter
                  </v-btn>
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
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import patientService from '@/services/patientService'
import treatmentService from '@/services/treatmentService'

export default {
  name: 'TreatmentEncounter',
  setup() {
    const router = useRouter()
    const route = useRoute()
    const form = ref(null)
    const valid = ref(false)
    const submitting = ref(false)
    const searchLoading = ref(false)
    const selectedPatientId = ref(null)
    const patient = ref(null)
    const patientOptions = ref([])
    const refillMenu = ref(false)
    const nextAppointmentMenu = ref(false)
    const nextAppointmentTime = ref('09:00')

    const encounter = reactive({
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
        missed_doses_last_30_days: false,
        missed_dose_count: 0,
        notes: ''
      },
      next_appointment_date: ''
    })

    const snackbar = ref({
      show: false,
      message: '',
      color: 'success'
    })

    const labTypes = [
      { title: 'CD4 Count', value: 'CD4' },
      { title: 'Viral Load', value: 'viral_load' },
      { title: 'Hemoglobin', value: 'hemoglobin' },
      { title: 'Creatinine', value: 'creatinine' },
      { title: 'ALT', value: 'ALT' },
      { title: 'AST', value: 'AST' }
    ]

    const timeSlots = [
      '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
      '11:00', '11:30', '13:00', '13:30', '14:00', '14:30',
      '15:00', '15:30', '16:00'
    ]

    const searchPatients = async (search) => {
      if (!search || search.length < 2) {
        patientOptions.value = []
        return
      }
      searchLoading.value = true
      try {
        const response = await patientService.searchPatients(search)
        patientOptions.value = response
          .filter(p => p.status === 'treatment')
          .map(p => ({
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
        selectedPatientId.value = response.id
        
        // Check if patient is in treatment
        if (response.status !== 'treatment') {
          showSnackbar('Patient must be in treatment status', 'warning')
        }
      } catch (error) {
        showSnackbar('Failed to load patient: ' + error.message, 'error')
      }
    }

    const addLabResult = () => {
      encounter.lab_results.push({
        type: '',
        value: '',
        date: new Date().toISOString().split('T')[0],
        dateMenu: false,
        notes: ''
      })
    }

    const removeLabResult = (index) => {
      encounter.lab_results.splice(index, 1)
    }

    const submit = async () => {
      if (!form.value.validate()) return
      if (!selectedPatientId.value) {
        showSnackbar('Please select a patient', 'error')
        return
      }

      submitting.value = true
      try {
        const data = {
          patient_id: selectedPatientId.value,
          consultation_notes: encounter.consultation_notes,
          art_prescription: encounter.art_prescription,
          lab_results: encounter.lab_results,
          adherence: encounter.adherence,
          next_appointment_date: encounter.next_appointment_date
        }

        await treatmentService.createEncounter(data)
        showSnackbar('Treatment encounter saved successfully!', 'success')
        
        setTimeout(() => {
          router.push('/treatment/queue')
        }, 1500)
      } catch (error) {
        showSnackbar('Failed to save: ' + error.message, 'error')
      } finally {
        submitting.value = false
      }
    }

    const cancel = () => {
      router.push('/treatment/queue')
    }

    const showSnackbar = (message, color = 'success') => {
      snackbar.value = { show: true, message, color }
    }

    onMounted(() => {
      if (route.params.patientId) {
        loadPatient(route.params.patientId)
      }
    })

    return {
      form,
      valid,
      submitting,
      searchLoading,
      selectedPatientId,
      patient,
      patientOptions,
      encounter,
      refillMenu,
      nextAppointmentMenu,
      nextAppointmentTime,
      labTypes,
      timeSlots,
      searchPatients,
      addLabResult,
      removeLabResult,
      submit,
      cancel,
      snackbar
    }
  }
}
</script>