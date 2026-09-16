<!-- frontend/src/views/staff/patients/CreateView.vue -->
<template>
  <v-container fluid class="pa-4">
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="text-h5">
            <v-icon left>mdi-account-plus</v-icon>
            Add New Patient
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
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
                    hint="Must be unique — used as patient identifier"
                    persistent-hint
                    outlined
                  ></v-text-field>
                </v-col>

                <v-col cols="12" md="6">
                  <v-select
                    v-model="patient.status"
                    :items="['testing', 'treatment']"
                    label="Status"
                    readonly
                    outlined
                    hint="New patients start in Testing status"
                    persistent-hint
                  ></v-select>
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

              <!-- ==================== ENROLLMENT ==================== -->
              <div class="text-subtitle-1 font-weight-bold mb-3">Enrollment Information</div>
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field
                    :model-value="today"
                    label="Enrollment Date"
                    prepend-inner-icon="mdi-calendar"
                    readonly
                    outlined
                    hint="Auto-set to today's date by the server"
                    persistent-hint
                  ></v-text-field>
                </v-col>
              </v-row>

              <v-divider class="my-4"></v-divider>

              <!-- ==================== GUARDIAN ==================== -->
              <div class="text-subtitle-1 font-weight-bold mb-3">
                Guardian Information <span class="text-caption">(for minors under 18)</span>
              </div>
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

              <v-divider class="my-4"></v-divider>

              <!-- ==================== PORTAL ACCESS ==================== -->
              <div class="text-subtitle-1 font-weight-bold mb-3">Portal Access</div>
              <v-checkbox
                v-model="createPortalAccount"
                label="Create patient portal account"
                color="primary"
                hint="Requires a unique username, email, and password of at least 8 characters"
                persistent-hint
              ></v-checkbox>

              <v-row v-if="createPortalAccount">
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="portalCredentials.username"
                    label="Username *"
                    required
                    :rules="[
                      v => !!v || 'Username is required',
                      v => v.length >= 3 || 'Minimum 3 characters',
                      v => /^[a-zA-Z0-9_.-]+$/.test(v) || 'Only letters, numbers, _ . - allowed'
                    ]"
                    outlined
                  ></v-text-field>
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="portalCredentials.email"
                    label="Email *"
                    type="email"
                    required
                    :rules="[
                      v => !!v || 'Email is required',
                      v => /.+@.+\..+/.test(v) || 'Invalid email'
                    ]"
                    hint="Used for portal login and notifications"
                    persistent-hint
                    outlined
                  ></v-text-field>
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="portalCredentials.password"
                    label="Password *"
                    type="password"
                    required
                    :rules="[
                      v => !!v || 'Password is required',
                      v => v.length >= 8 || 'Minimum 8 characters'
                    ]"
                    outlined
                  ></v-text-field>
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="portalCredentials.confirmPassword"
                    label="Confirm Password *"
                    type="password"
                    required
                    :rules="[
                      v => !!v || 'Please confirm the password',
                      v => v === portalCredentials.password || 'Passwords do not match'
                    ]"
                    outlined
                  ></v-text-field>
                </v-col>
              </v-row>

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
                    <v-icon left>mdi-check</v-icon>
                    Save Patient
                  </v-btn>
                </v-col>
              </v-row>
            </v-form>
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
import { ref, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'
import patientService from '@/services/patientService'

export default {
  name: 'PatientCreate',
  setup() {
    const router = useRouter()
    const form = ref(null)
    const valid = ref(false)
    const submitting = ref(false)
    const dateMenu = ref(false)
    const createPortalAccount = ref(false)

    const today = new Date().toISOString().split('T')[0]

    // Patient fields — match the Patient model exactly.
    // NOTE: no `email` here — email belongs to the User (portal account).
    const patient = reactive({
      first_name: '',
      middle_name: '',
      last_name: '',
      birth_date: '',
      gender: '',
      contact_number: '',
      address: '',
      status: 'testing',
      guardian_name: '',
      guardian_contact: '',
      emergency_contact: '',
      emergency_phone: ''
    })

    // Portal (User) fields — only sent when createPortalAccount is true
    const portalCredentials = reactive({
      username: '',
      email: '',
      password: '',
      confirmPassword: ''
    })

    const snackbar = ref({ show: false, message: '', color: 'success' })

    const genderOptions = [
      { title: 'Male', value: 'male' },
      { title: 'Female', value: 'female' },
      { title: 'Other', value: 'other' }
    ]

    // Clear portal credentials when the checkbox is unchecked
    watch(createPortalAccount, (enabled) => {
      if (!enabled) {
        portalCredentials.username = ''
        portalCredentials.email = ''
        portalCredentials.password = ''
        portalCredentials.confirmPassword = ''
      }
    })

    const submit = async () => {
      if (!form.value.validate()) return

      submitting.value = true
      try {
        const payload = { ...patient }

        if (createPortalAccount.value) {
          payload.create_portal_account = true
          payload.username = portalCredentials.username
          payload.email = portalCredentials.email
          payload.password = portalCredentials.password
        }

        await patientService.createPatient(payload)
        showSnackbar('Patient created successfully!', 'success')
        setTimeout(() => router.push('/patients'), 1500)
      } catch (error) {
        const msg = error.response?.data?.error || error.message
        showSnackbar('Failed to create patient: ' + msg, 'error')
      } finally {
        submitting.value = false
      }
    }

    const cancel = () => router.push('/patients')

    const showSnackbar = (message, color = 'success') => {
      snackbar.value = { show: true, message, color }
    }

    return {
      form,
      valid,
      submitting,
      dateMenu,
      patient,
      portalCredentials,
      createPortalAccount,
      genderOptions,
      today,
      submit,
      cancel,
      snackbar
    }
  }
}
</script>