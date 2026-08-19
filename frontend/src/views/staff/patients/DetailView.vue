<!-- frontend/src/views/staff/patients/DetailView.vue -->
<template>
  <v-container fluid class="pa-4">
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="text-h5">
            <v-icon left>mdi-account</v-icon>
            Patient Details
            <v-spacer></v-spacer>
            <v-btn color="primary" @click="editPatient" v-if="patient">
              <v-icon left>mdi-pencil</v-icon>
              Edit
            </v-btn>
            <v-btn color="success" @click="startEncounter" v-if="patient && canStartEncounter">
              <v-icon left>{{ encounterIcon }}</v-icon>
              Start {{ encounterLabel }}
            </v-btn>
          </v-card-title>
          <v-divider></v-divider>
          
          <v-card-text v-if="patient">
            <v-row>
              <!-- Patient Information -->
              <v-col cols="12" md="6">
                <v-card outlined class="pa-4">
                  <div class="text-subtitle-1 font-weight-bold mb-3">Personal Information</div>
                  <v-list dense>
                    <v-list-item>
                      <v-list-item-content>
                        <v-list-item-title class="text-caption text-grey">Full Name</v-list-item-title>
                        <v-list-item-subtitle>{{ patient.first_name }} {{ patient.last_name }}</v-list-item-subtitle>
                      </v-list-item-content>
                    </v-list-item>
                    <v-divider></v-divider>
                    <v-list-item>
                      <v-list-item-content>
                        <v-list-item-title class="text-caption text-grey">Facility Code</v-list-item-title>
                        <v-list-item-subtitle>
                          <v-chip color="primary" small>{{ patient.patient_facility_code }}</v-chip>
                        </v-list-item-subtitle>
                      </v-list-item-content>
                    </v-list-item>
                    <v-divider></v-divider>
                    <v-list-item>
                      <v-list-item-content>
                        <v-list-item-title class="text-caption text-grey">Date of Birth</v-list-item-title>
                        <v-list-item-subtitle>{{ formatDate(patient.birth_date) }} ({{ calculateAge(patient.birth_date) }} years)</v-list-item-subtitle>
                      </v-list-item-content>
                    </v-list-item>
                    <v-divider></v-divider>
                    <v-list-item>
                      <v-list-item-content>
                        <v-list-item-title class="text-caption text-grey">Gender</v-list-item-title>
                        <v-list-item-subtitle>{{ patient.gender }}</v-list-item-subtitle>
                      </v-list-item-content>
                    </v-list-item>
                    <v-divider></v-divider>
                    <v-list-item>
                      <v-list-item-content>
                        <v-list-item-title class="text-caption text-grey">Contact Number</v-list-item-title>
                        <v-list-item-subtitle>{{ patient.contact_number }}</v-list-item-subtitle>
                      </v-list-item-content>
                    </v-list-item>
                    <v-divider></v-divider>
                    <v-list-item>
                      <v-list-item-content>
                        <v-list-item-title class="text-caption text-grey">Address</v-list-item-title>
                        <v-list-item-subtitle>{{ patient.address || 'N/A' }}</v-list-item-subtitle>
                      </v-list-item-content>
                    </v-list-item>
                  </v-list>
                </v-card>
              </v-col>

              <!-- Status & Emergency -->
              <v-col cols="12" md="6">
                <v-card outlined class="pa-4 mb-4">
                  <div class="text-subtitle-1 font-weight-bold mb-3">Status</div>
                  <v-chip :color="patient.status === 'treatment' ? 'success' : 'info'" large>
                    {{ patient.status }}
                  </v-chip>
                  <div class="mt-2">
                    <v-chip color="primary" small v-if="patient.user_id">
                      <v-icon left small>mdi-account</v-icon>
                      Has Portal Access
                    </v-chip>
                    <v-chip color="grey" small v-else>
                      No Portal Access
                    </v-chip>
                  </div>
                </v-card>

                <!-- Enrollment Information -->
                <v-card outlined class="pa-4 mb-4">
                  <div class="text-subtitle-1 font-weight-bold mb-3">Enrollment Information</div>
                  <v-list dense>
                    <v-list-item>
                      <v-list-item-content>
                        <v-list-item-title class="text-caption text-grey">Enrollment Date</v-list-item-title>
                        <v-list-item-subtitle>
                          <v-icon small color="primary" class="mr-1">mdi-calendar-plus</v-icon>
                          {{ formatDate(patient.enrollment_date) }}
                        </v-list-item-subtitle>
                      </v-list-item-content>
                    </v-list-item>
                    <v-divider v-if="patient.treatment_transition_date"></v-divider>
                    <v-list-item v-if="patient.treatment_transition_date">
                      <v-list-item-content>
                        <v-list-item-title class="text-caption text-grey">Treatment Transition Date</v-list-item-title>
                        <v-list-item-subtitle>
                          <v-icon small color="success" class="mr-1">mdi-calendar-check</v-icon>
                          {{ formatDate(patient.treatment_transition_date) }}
                          <span class="text-caption text-grey ml-2">
                            (Moved to treatment)
                          </span>
                        </v-list-item-subtitle>
                      </v-list-item-content>
                    </v-list-item>
                  </v-list>
                </v-card>

                <v-card outlined class="pa-4">
                  <div class="text-subtitle-1 font-weight-bold mb-3">Emergency Contact</div>
                  <v-list dense>
                    <v-list-item>
                      <v-list-item-content>
                        <v-list-item-title class="text-caption text-grey">Name</v-list-item-title>
                        <v-list-item-subtitle>{{ patient.emergency_contact || 'N/A' }}</v-list-item-subtitle>
                      </v-list-item-content>
                    </v-list-item>
                    <v-divider></v-divider>
                    <v-list-item>
                      <v-list-item-content>
                        <v-list-item-title class="text-caption text-grey">Phone</v-list-item-title>
                        <v-list-item-subtitle>{{ patient.emergency_phone || 'N/A' }}</v-list-item-subtitle>
                      </v-list-item-content>
                    </v-list-item>
                    <v-divider v-if="patient.guardian_name"></v-divider>
                    <v-list-item v-if="patient.guardian_name">
                      <v-list-item-content>
                        <v-list-item-title class="text-caption text-grey">Guardian</v-list-item-title>
                        <v-list-item-subtitle>{{ patient.guardian_name }} ({{ patient.guardian_contact }})</v-list-item-subtitle>
                      </v-list-item-content>
                    </v-list-item>
                  </v-list>
                </v-card>
              </v-col>
            </v-row>

            <!-- History Tabs -->
            <v-row>
              <v-col cols="12">
                <v-card outlined>
                  <v-tabs v-model="activeTab" color="primary">
                    <v-tab value="testing">
                      <v-icon left>mdi-test-tube</v-icon>
                      Testing History
                    </v-tab>
                    <v-tab value="treatment">
                      <v-icon left>mdi-pill</v-icon>
                      Treatment History
                    </v-tab>
                    <v-tab value="appointments">
                      <v-icon left>mdi-calendar</v-icon>
                      Appointments
                    </v-tab>
                  </v-tabs>

                  <v-window v-model="activeTab">
                    <!-- Testing History -->
                    <v-window-item value="testing">
                      <v-card-text>
                        <v-data-table
                          :headers="testingHeaders"
                          :items="testingHistory"
                          :loading="loadingHistory"
                          items-per-page="10"
                        >
                          <template v-slot:item.hiv_test="{ item }">
                            <v-chip :color="item.hiv_test?.result === 'positive' ? 'error' : 
                                            item.hiv_test?.result === 'negative' ? 'success' : 'warning'" 
                                    small>
                              {{ item.hiv_test?.result || 'N/A' }}
                            </v-chip>
                          </template>
                          <template v-slot:item.created_at="{ item }">
                            {{ formatDate(item.created_at) }}
                          </template>
                          <template v-slot:item.actions="{ item }">
                            <v-btn icon small color="primary" @click="viewTestingEncounter(item)">
                              <v-icon small>mdi-eye</v-icon>
                            </v-btn>
                          </template>
                        </v-data-table>
                      </v-card-text>
                    </v-window-item>

                    <!-- Treatment History -->
                    <v-window-item value="treatment">
                      <v-card-text>
                        <v-data-table
                          :headers="treatmentHeaders"
                          :items="treatmentHistory"
                          :loading="loadingHistory"
                          items-per-page="10"
                        >
                          <template v-slot:item.art_prescription="{ item }">
                            <div v-if="item.art_prescription">
                              {{ item.art_prescription.medication_name || 'N/A' }}
                              <span class="text-caption text-grey">
                                ({{ item.art_prescription.dosage }})
                              </span>
                            </div>
                            <span v-else>N/A</span>
                          </template>
                          <template v-slot:item.created_at="{ item }">
                            {{ formatDate(item.created_at) }}
                          </template>
                          <template v-slot:item.actions="{ item }">
                            <v-btn icon small color="primary" @click="viewTreatmentEncounter(item)">
                              <v-icon small>mdi-eye</v-icon>
                            </v-btn>
                          </template>
                        </v-data-table>
                      </v-card-text>
                    </v-window-item>

                    <!-- Appointments -->
                    <v-window-item value="appointments">
                      <v-card-text>
                        <v-data-table
                          :headers="appointmentHeaders"
                          :items="appointments"
                          :loading="loadingHistory"
                          items-per-page="10"
                        >
                          <template v-slot:item.time_slot="{ item }">
                            {{ formatTimeSlot(item.time_slot) }}
                          </template>
                          <template v-slot:item.status="{ item }">
                            <v-chip :color="getStatusColor(item.status)" small>
                              {{ item.status }}
                            </v-chip>
                          </template>
                        </v-data-table>
                      </v-card-text>
                    </v-window-item>
                  </v-window>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>

          <v-card-text v-else class="text-center py-8">
            <v-icon size="64" color="grey lighten-2">mdi-account-off</v-icon>
            <div class="text-h6 text-grey mt-2">Patient not found</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Testing Encounter Dialog -->
    <v-dialog v-model="testingDialog" max-width="800px">
      <v-card>
        <v-card-title>
          <span class="text-h6">Testing Encounter Details</span>
          <v-spacer></v-spacer>
          <v-btn icon @click="testingDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pt-4" v-if="selectedTesting">
          <v-row>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 font-weight-bold">Pre-test Counseling</div>
              <div class="text-caption">Conducted: {{ selectedTesting.pretest_counseling?.conducted ? 'Yes' : 'No' }}</div>
              <div class="text-caption">Notes: {{ selectedTesting.pretest_counseling?.notes || 'N/A' }}</div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 font-weight-bold">HIV Test</div>
              <div class="text-caption">Result: {{ selectedTesting.hiv_test?.result || 'N/A' }}</div>
              <div class="text-caption">Kit Lot: {{ selectedTesting.hiv_test?.kit_lot_number || 'N/A' }}</div>
              <div class="text-caption">Test Date: {{ selectedTesting.hiv_test?.test_date || 'N/A' }}</div>
            </v-col>
          </v-row>
          <v-divider class="my-3"></v-divider>
          <v-row>
            <v-col cols="12">
              <div class="text-subtitle-2 font-weight-bold">Post-test Counseling</div>
              <div class="text-caption">Conducted: {{ selectedTesting.posttest_counseling?.conducted ? 'Yes' : 'No' }}</div>
              <div class="text-caption">Notes: {{ selectedTesting.posttest_counseling?.notes || 'N/A' }}</div>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Treatment Encounter Dialog -->
    <v-dialog v-model="treatmentDialog" max-width="800px">
      <v-card>
        <v-card-title>
          <span class="text-h6">Treatment Encounter Details</span>
          <v-spacer></v-spacer>
          <v-btn icon @click="treatmentDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pt-4" v-if="selectedTreatment">
          <v-row>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 font-weight-bold">Consultation</div>
              <div class="text-caption">{{ selectedTreatment.consultation_notes?.subjective || 'N/A' }}</div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 font-weight-bold">Prescription</div>
              <div class="text-caption" v-if="selectedTreatment.art_prescription">
                {{ selectedTreatment.art_prescription.medication_name }} 
                {{ selectedTreatment.art_prescription.dosage }}
                <br>
                <span class="text-caption text-grey">Refill: {{ selectedTreatment.art_prescription.refill_date || 'N/A' }}</span>
              </div>
              <div v-else class="text-caption">No prescription</div>
            </v-col>
          </v-row>
          <v-divider class="my-3"></v-divider>
          <v-row>
            <v-col cols="12">
              <div class="text-subtitle-2 font-weight-bold">Lab Results</div>
              <div v-if="selectedTreatment.lab_results && selectedTreatment.lab_results.length">
                <v-chip v-for="lab in selectedTreatment.lab_results" :key="lab.type" small class="mr-2">
                  {{ lab.type }}: {{ lab.value }}
                </v-chip>
              </div>
              <div v-else class="text-caption">No lab results recorded</div>
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
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import patientService from '@/services/patientService'
import testingService from '@/services/testingService'
import treatmentService from '@/services/treatmentService'
import appointmentService from '@/services/appointmentService'
import { useAuthStore } from '@/stores/authStore'

export default {
  name: 'PatientDetail',
  setup() {
    const router = useRouter()
    const route = useRoute()
    const authStore = useAuthStore()
    
    const patient = ref(null)
    const loading = ref(false)
    const loadingHistory = ref(false)
    const activeTab = ref('testing')
    const testingHistory = ref([])
    const treatmentHistory = ref([])
    const appointments = ref([])
    const testingDialog = ref(false)
    const treatmentDialog = ref(false)
    const selectedTesting = ref(null)
    const selectedTreatment = ref(null)

    const snackbar = ref({
      show: false,
      message: '',
      color: 'success'
    })

    const testingHeaders = [
      { title: 'Date', key: 'created_at' },
      { title: 'Pre-test', key: 'pretest_counseling', align: 'center' },
      { title: 'Result', key: 'hiv_test', align: 'center' },
      { title: 'Post-test', key: 'posttest_counseling', align: 'center' },
      { title: 'Actions', key: 'actions', align: 'center', sortable: false }
    ]

    const treatmentHeaders = [
      { title: 'Date', key: 'created_at' },
      { title: 'Prescription', key: 'art_prescription' },
      { title: 'Next Appointment', key: 'next_appointment_date', align: 'center' },
      { title: 'Actions', key: 'actions', align: 'center', sortable: false }
    ]

    const appointmentHeaders = [
      { title: 'Date', key: 'appointment_date' },
      { title: 'Time', key: 'time_slot', align: 'center' },
      { title: 'Office', key: 'office', align: 'center' },
      { title: 'Type', key: 'type', align: 'center' },
      { title: 'Status', key: 'status', align: 'center' }
    ]

    const canStartEncounter = computed(() => {
      if (!patient.value) return false
      const office = authStore.userOffice
      if (office === 'testing') {
        return patient.value.status === 'testing'
      }
      if (office === 'treatment') {
        return patient.value.status === 'treatment'
      }
      return false
    })

    const encounterLabel = computed(() => {
      return authStore.userOffice === 'testing' ? 'Testing' : 'Treatment'
    })

    const encounterIcon = computed(() => {
      return authStore.userOffice === 'testing' ? 'mdi-test-tube' : 'mdi-pill'
    })

    const loadPatient = async () => {
      const patientId = route.params.id
      if (!patientId) return

      loading.value = true
      try {
        const data = await patientService.getPatient(patientId)
        patient.value = data
      } catch (error) {
        showSnackbar('Failed to load patient: ' + error.message, 'error')
      } finally {
        loading.value = false
      }
    }

    const loadHistory = async () => {
      const patientId = route.params.id
      if (!patientId) return

      loadingHistory.value = true
      try {
        const history = await patientService.getPatientHistory(patientId)
        testingHistory.value = history.testing || []
        treatmentHistory.value = history.treatment || []
        
        // Load appointments - you may want to use a different endpoint
        // This is a placeholder - you'd need an endpoint to get patient appointments
        appointments.value = []
      } catch (error) {
        console.error('Failed to load history:', error)
      } finally {
        loadingHistory.value = false
      }
    }

    const editPatient = () => {
      router.push(`/patients/${patient.value.id}/edit`)
    }

    const startEncounter = () => {
      const office = authStore.userOffice || 'testing'
      router.push(`/${office}/encounter/${patient.value.id}`)
    }

    const viewTestingEncounter = (encounter) => {
      selectedTesting.value = encounter
      testingDialog.value = true
    }

    const viewTreatmentEncounter = (encounter) => {
      selectedTreatment.value = encounter
      treatmentDialog.value = true
    }

    const calculateAge = (birthDate) => {
      if (!birthDate) return 'N/A'
      const today = new Date()
      const birth = new Date(birthDate)
      let age = today.getFullYear() - birth.getFullYear()
      const m = today.getMonth() - birth.getMonth()
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--
      }
      return age
    }

    const formatDate = (date) => {
      if (!date) return 'N/A'
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }

    const formatTimeSlot = (time) => {
      if (!time) return 'N/A'
      const parts = time.split(':')
      const hour = parseInt(parts[0])
      const minute = parts[1]
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const hour12 = hour % 12 || 12
      return `${hour12}:${minute} ${ampm}`
    }

    const getStatusColor = (status) => {
      const colors = {
        pending: 'info',
        'checked-in': 'warning',
        completed: 'success',
        cancelled: 'error',
        'no-show': 'grey'
      }
      return colors[status] || 'primary'
    }

    const showSnackbar = (message, color = 'success') => {
      snackbar.value = { show: true, message, color }
    }

    onMounted(() => {
      loadPatient()
      loadHistory()
    })

    return {
      patient,
      loading,
      loadingHistory,
      activeTab,
      testingHistory,
      treatmentHistory,
      appointments,
      testingDialog,
      treatmentDialog,
      selectedTesting,
      selectedTreatment,
      testingHeaders,
      treatmentHeaders,
      appointmentHeaders,
      canStartEncounter,
      encounterLabel,
      encounterIcon,
      editPatient,
      startEncounter,
      viewTestingEncounter,
      viewTreatmentEncounter,
      calculateAge,
      formatDate,
      formatTimeSlot,
      getStatusColor,
      snackbar
    }
  }
}
</script>