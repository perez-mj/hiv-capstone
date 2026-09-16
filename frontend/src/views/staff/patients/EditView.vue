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
            <v-chip v-if="patient.id" color="primary" size="small">
              {{ patient.patient_facility_code}}
            </v-chip>
          </v-card-title>
          <v-divider></v-divider>

          <v-card-text v-if="loading">
            <v-skeleton-loader type="article"></v-skeleton-loader>
          </v-card-text>

          <v-card-text v-else-if="patient.id">
            <v-form ref="form" v-model="valid">
              <!-- ==================== PERSONAL INFO ==================== -->
              <div class="text-subtitle-1 font-weight-bold mb-3">Personal Information</div>
              <v-row>
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="patient.first_name"
                    label="First Name *"
                    required
                    :rules="[v => !!v || 'First name is required']"
                    outlined
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="patient.middle_name"
                    label="Middle Name"
                    outlined
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="patient.last_name"
                    label="Last Name *"
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
                        label="Date of Birth *"
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
                      :max="today"
                    ></v-date-picker>
                  </v-menu>
                </v-col>

                <v-col cols="12" md="6">
                  <v-select
                    v-model="patient.gender"
                    :items="genderOptions"
                    item-title="title"
                    item-value="value"
                    label="Gender *"
                    required
                    :rules="[v => !!v || 'Gender is required']"
                    outlined
                  ></v-select>
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="patient.contact_number"
                    label="Contact Number *"
                    required
                    :rules="[
                      v => !!v || 'Contact number is required',
                      v => /^[0-9+\-\s()]{7,20}$/.test(v) || 'Invalid contact number'
                    ]"
                    outlined
                  ></v-text-field>
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="patient.patient_facility_code"
                    label="Facility Code"
                    readonly
                    outlined
                    prepend-inner-icon="mdi-barcode"
                    hint="Auto-generated — regenerated when status moves to Treatment"
                    persistent-hint
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

              <!-- ==================== STATUS ==================== -->
              <div class="text-subtitle-1 font-weight-bold mb-3">Patient Status</div>
              <v-row>
                <v-col cols="12" md="6">
                  <v-select
                    v-model="patient.status"
                    :items="statusOptions"
                    item-title="title"
                    item-value="value"
                    label="Status"
                    outlined
                    :hint="statusHint"
                    persistent-hint
                  ></v-select>
                </v-col>
              </v-row>

              <v-divider class="my-4"></v-divider>

              <!-- ==================== ENROLLMENT ==================== -->
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
                    :hint="patient.treatment_transition_date
                      ? 'Set automatically when moved to treatment'
                      : 'Not yet in treatment'"
                    persistent-hint
                  ></v-text-field>
                </v-col>
              </v-row>

              <v-divider class="my-4"></v-divider>

              <!-- ==================== GUARDIAN ==================== -->
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

              <!-- ==================== EMERGENCY ==================== -->
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

              <!-- ==================== PORTAL STATUS ==================== -->
              <v-divider class="my-4"></v-divider>
              <div class="text-subtitle-1 font-weight-bold mb-3">Portal Access</div>

              <!--
                Portal accounts are created at patient-creation time.
                If the patient already has one (user_id is set), we show it
                as a success alert with the linked email — no email editing here.
                If not, we inform staff that a portal account doesn't exist.
              -->
              <v-alert
                v-if="patient.user_id"
                type="success"
                variant="tonal"
                density="comfortable"
              >
                Portal account is linked
                <span v-if="patient.user_email"> — <strong>{{ patient.user_email }}</strong></span>
              </v-alert>

              <v-alert
                v-else
                type="info"
                variant="tonal"
                density="comfortable"
              >
                No portal account linked. Portal accounts are created at
                patient registration.
              </v-alert>

              <v-row>
                <v-col cols="12" class="text-right">
                  <v-btn color="error" variant="text" @click="cancel">Cancel</v-btn>
                  <v-btn
                    color="primary"
                    @click="submit"
                    :loading="submitting"
                    :disabled="!valid"
                    class="ml-2"
                  >
                    Update Patient
                  </v-btn>
                </v-col>
              </v-row>
            </v-form>
          </v-card-text>

          <v-card-text v-else>
            <v-alert type="error" variant="tonal">Patient not found.</v-alert>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="4000">
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue'
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

    const today = new Date().toISOString().split('T')[0]

    const patient = reactive({
      id: null,
      user_id: null,           // link to User record (read-only)
      user_email: '',          // display-only, from the linked User
      first_name: '',
      middle_name: '',
      last_name: '',
      birth_date: '',
      gender: '',
      contact_number: '',
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

    const snackbar = ref({ show: false, message: '', color: 'success' })

    const genderOptions = [
      { title: 'Male', value: 'male' },
      { title: 'Female', value: 'female' },
      { title: 'Other', value: 'other' }
    ]

    const statusOptions = [
      { title: 'Testing', value: 'testing' },
      { title: 'Treatment', value: 'treatment' }
    ]

    const statusHint = computed(() =>
      patient.status === 'treatment' && !patient.treatment_transition_date
        ? 'Saving will set the transition date and regenerate the facility code'
        : ''
    )

    const loadPatient = async () => {
      const patientId = route.params.id
      if (!patientId) {
        loading.value = false
        return
      }

      loading.value = true
      try {
        const data = await patientService.getPatient(patientId)
        Object.assign(patient, {
          id: data.id,
          user_id: data.user_id,
          // If backend includes the linked User, surface its email
          user_email: data.User?.email || '',
          first_name: data.first_name || '',
          middle_name: data.middle_name || '',
          last_name: data.last_name || '',
          birth_date: data.birth_date || '',
          gender: data.gender || '',
          contact_number: data.contact_number || '',
          address: data.address || '',
          status: data.status || 'testing',
          patient_facility_code: data.patient_facility_code || '',
          enrollment_date: data.enrollment_date || '',
          treatment_transition_date: data.treatment_transition_date || '',
          guardian_name: data.guardian_name || '',
          guardian_contact: data.guardian_contact || '',
          emergency_contact: data.emergency_contact || '',
          emergency_phone: data.emergency_phone || ''
        })
      } catch (error) {
        const msg = error.response?.data?.error || error.message
        showSnackbar('Failed to load patient: ' + msg, 'error')
      } finally {
        loading.value = false
      }
    }

    const submit = async () => {
      if (!form.value.validate()) return

      submitting.value = true
      try {
        // Only send fields the model allows to be updated.
        // No `email` here — it lives on the linked User and is not
        // editable from the patient edit form.
        const updateData = {
          first_name: patient.first_name,
          middle_name: patient.middle_name,
          last_name: patient.last_name,
          birth_date: patient.birth_date,
          gender: patient.gender,
          contact_number: patient.contact_number,
          address: patient.address,
          status: patient.status,
          guardian_name: patient.guardian_name,
          guardian_contact: patient.guardian_contact,
          emergency_contact: patient.emergency_contact,
          emergency_phone: patient.emergency_phone
        }

        await patientService.updatePatient(route.params.id, updateData)
        showSnackbar('Patient updated successfully!', 'success')
        setTimeout(() => router.push(`/patients/${route.params.id}`), 1500)
      } catch (error) {
        const msg = error.response?.data?.error || error.message
        showSnackbar('Failed to update patient: ' + msg, 'error')
      } finally {
        submitting.value = false
      }
    }

    const cancel = () => router.push(`/patients/${route.params.id}`)

    const showSnackbar = (message, color = 'success') => {
      snackbar.value = { show: true, message, color }
    }

    onMounted(loadPatient)

    return {
      form,
      valid,
      submitting,
      dateMenu,
      loading,
      patient,
      genderOptions,
      statusOptions,
      statusHint,
      today,
      submit,
      cancel,
      snackbar
    }
  }
}
</script>