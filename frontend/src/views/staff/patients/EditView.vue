<!-- frontend/src/views/staff/patients/EditView.vue -->
<template>
  <v-container fluid class="pa-4">
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="text-h5">
            <v-icon left>mdi-account-edit</v-icon>
            Edit Patient
            <v-spacer></v-spacer>
            <v-chip color="primary" small v-if="patient">
              {{ patient.first_name }} {{ patient.last_name }}
            </v-chip>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text v-if="patient">
            <v-form ref="form" v-model="valid">
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="patient.first_name"
                    label="First Name"
                    required
                    :rules="[v => !!v || 'First name is required']"
                    outlined
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="patient.last_name"
                    label="Last Name"
                    required
                    :rules="[v => !!v || 'Last name is required']"
                    outlined
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="6">
                  <v-menu
                    v-model="dateMenu"
                    :close-on-content-click="false"
                    transition="scale-transition"
                  >
                    <template v-slot:activator="{ props }">
                      <v-text-field
                        v-model="patient.birth_date"
                        label="Date of Birth"
                        prepend-inner-icon="mdi-calendar"
                        readonly
                        required
                        :rules="[v => !!v || 'Date of birth is required']"
                        v-bind="props"
                        outlined
                      ></v-text-field>
                    </template>
                    <v-date-picker
                      v-model="patient.birth_date"
                      @update:model-value="dateMenu = false"
                      max="today"
                    ></v-date-picker>
                  </v-menu>
                </v-col>
                <v-col cols="12" md="6">
                  <v-select
                    v-model="patient.gender"
                    :items="genderOptions"
                    label="Gender"
                    required
                    :rules="[v => !!v || 'Gender is required']"
                    outlined
                  ></v-select>
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="patient.contact_number"
                    label="Contact Number"
                    required
                    :rules="[v => !!v || 'Contact number is required']"
                    outlined
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="patient.email"
                    label="Email (optional)"
                    type="email"
                    outlined
                  ></v-text-field>
                </v-col>
                <v-col cols="12">
                  <v-textarea
                    v-model="patient.address"
                    label="Address"
                    rows="2"
                    outlined
                  ></v-textarea>
                </v-col>
              </v-row>

              <v-divider class="my-4"></v-divider>

              <div class="text-subtitle-1 font-weight-bold mb-3">Patient Status</div>
              <v-row>
                <v-col cols="12" md="6">
                  <v-select
                    v-model="patient.status"
                    :items="statusOptions"
                    label="Status"
                    outlined
                    hint="Changing to Treatment will set transition date automatically"
                    persistent-hint
                  ></v-select>
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="patient.patient_facility_code"
                    label="Facility Code"
                    readonly
                    outlined
                    prepend-inner-icon="mdi-barcode"
                  ></v-text-field>
                </v-col>
              </v-row>

              <v-divider class="my-4"></v-divider>

              <div class="text-subtitle-1 font-weight-bold mb-3">Enrollment Information</div>
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="patient.enrollment_date"
                    label="Enrollment Date"
                    prepend-inner-icon="mdi-calendar-plus"
                    readonly
                    outlined
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="patient.treatment_transition_date"
                    label="Treatment Transition Date"
                    prepend-inner-icon="mdi-calendar-check"
                    readonly
                    outlined
                    :hint="patient.treatment_transition_date ? 'Set automatically when moved to treatment' : 'Not yet in treatment'"
                    persistent-hint
                  ></v-text-field>
                </v-col>
              </v-row>

              <v-divider class="my-4"></v-divider>

              <div class="text-subtitle-1 font-weight-bold mb-3">Guardian Information</div>
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="patient.guardian_name"
                    label="Guardian Name"
                    outlined
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="patient.guardian_contact"
                    label="Guardian Contact"
                    outlined
                  ></v-text-field>
                </v-col>
              </v-row>

              <v-divider class="my-4"></v-divider>

              <div class="text-subtitle-1 font-weight-bold mb-3">Emergency Contact</div>
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="patient.emergency_contact"
                    label="Emergency Contact Name"
                    outlined
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="patient.emergency_phone"
                    label="Emergency Contact Phone"
                    outlined
                  ></v-text-field>
                </v-col>
              </v-row>

              <v-row>
                <v-col cols="12" class="text-right">
                  <v-btn color="error" @click="cancel">Cancel</v-btn>
                  <v-btn color="primary" @click="submit" :loading="submitting" :disabled="!valid" class="ml-2">
                    <v-icon left>mdi-check</v-icon>
                    Update Patient
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
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import patientService from '@/services/patientService'

export default {
  name: 'PatientEdit',
  setup() {
    const router = useRouter()
    const route = useRoute()
    const form = ref(null)
    const valid = ref(false)
    const submitting = ref(false)
    const dateMenu = ref(false)
    const loading = ref(true)

    const patient = reactive({
      first_name: '',
      last_name: '',
      birth_date: '',
      gender: '',
      contact_number: '',
      email: '',
      address: '',
      status: 'testing',
      patient_facility_code: '',
      enrollment_date: '',
      treatment_transition_date: '',
      guardian_name: '',
      guardian_contact: '',
      emergency_contact: '',
      emergency_phone: ''
    })

    const snackbar = ref({
      show: false,
      message: '',
      color: 'success'
    })

    const genderOptions = [
      { title: 'Male', value: 'male' },
      { title: 'Female', value: 'female' },
      { title: 'Other', value: 'other' }
    ]

    const statusOptions = [
      { title: 'Testing', value: 'testing' },
      { title: 'Treatment', value: 'treatment' }
    ]

    const loadPatient = async () => {
      const patientId = route.params.id
      if (!patientId) return

      loading.value = true
      try {
        const data = await patientService.getPatient(patientId)
        Object.assign(patient, data)
      } catch (error) {
        showSnackbar('Failed to load patient: ' + error.message, 'error')
      } finally {
        loading.value = false
      }
    }

    const submit = async () => {
      if (!form.value.validate()) return

      submitting.value = true
      try {
        // Only send updatable fields
        const updateData = {
          first_name: patient.first_name,
          last_name: patient.last_name,
          birth_date: patient.birth_date,
          gender: patient.gender,
          contact_number: patient.contact_number,
          email: patient.email,
          address: patient.address,
          status: patient.status,
          guardian_name: patient.guardian_name,
          guardian_contact: patient.guardian_contact,
          emergency_contact: patient.emergency_contact,
          emergency_phone: patient.emergency_phone
        }

        await patientService.updatePatient(route.params.id, updateData)
        showSnackbar('Patient updated successfully!', 'success')
        setTimeout(() => {
          router.push(`/patients/${route.params.id}`)
        }, 1500)
      } catch (error) {
        showSnackbar('Failed to update patient: ' + error.message, 'error')
      } finally {
        submitting.value = false
      }
    }

    const cancel = () => {
      router.push(`/patients/${route.params.id}`)
    }

    const showSnackbar = (message, color = 'success') => {
      snackbar.value = { show: true, message, color }
    }

    onMounted(() => {
      loadPatient()
    })

    return {
      form,
      valid,
      submitting,
      dateMenu,
      loading,
      patient,
      genderOptions,
      statusOptions,
      submit,
      cancel,
      snackbar
    }
  }
}
</script>