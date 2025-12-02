<!-- frontend/src/components/PatientDialog.vue -->
<template>
  <v-dialog
    v-model="dialog"
    max-width="600px"
    persistent
  >
    <v-card>
      <v-card-title class="d-flex justify-space-between align-center">
        <span class="text-h5">{{ getDialogTitle() }}</span>
        <v-btn
          icon
          variant="text"
          @click="closeDialog"
          :disabled="loading"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text>
        <v-form ref="form" v-model="valid" @submit.prevent="savePatient">
          <v-row>
            <!-- Form fields remain the same -->
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.name"
                label="Full Name *"
                variant="outlined"
                density="comfortable"
                :rules="[requiredRule]"
                :disabled="loading || isView"
                required
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.date_of_birth"
                label="Date of Birth *"
                type="date"
                variant="outlined"
                density="comfortable"
                :rules="[requiredRule, dateRule]"
                :disabled="loading || isView"
                required
              />
            </v-col>

            <v-col cols="12">
              <v-text-field
                v-model="formData.contact_info"
                label="Contact Information"
                variant="outlined"
                density="comfortable"
                placeholder="Email or phone number"
                :rules="[contactRule]"
                :disabled="loading || isView"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-select
                v-model="formData.consent"
                :items="consentOptions"
                label="Consent Status *"
                variant="outlined"
                density="comfortable"
                :rules="[requiredRule]"
                :disabled="loading || isView"
                required
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-select
                v-model="formData.hiv_status"
                :items="hivStatusOptions"
                label="HIV Status *"
                variant="outlined"
                density="comfortable"
                :rules="[requiredRule]"
                :disabled="loading || isView"
                required
              />
            </v-col>

            <!-- Enhanced Security Information -->
            <v-col cols="12">
              <v-alert
                :type="isEdit ? 'info' : 'success'"
                variant="tonal"
                density="compact"
              >
                <div class="d-flex align-center">
                  <v-icon class="me-2">{{ isEdit ? 'mdi-information' : 'mdi-shield-check' }}</v-icon>
                  <span>
                    <strong>{{ isEdit ? 'Security Update:' : 'Complete Security Enrollment:' }}</strong> 
                    {{ isEdit 
                      ? 'Changes will create new DLT hash and update biometric verification.'
                      : 'Patient will be secured with blockchain DLT hash and biometric identity link.'
                    }}
                  </span>
                </div>
              </v-alert>
            </v-col>

            <!-- View Mode Display - Enhanced -->
            <v-col cols="12" v-if="isView && props.patient">
              <v-row>
                <v-col cols="6">
                  <v-card variant="outlined">
                    <v-card-text class="text-center">
                      <v-icon :color="getDltStatusColor(props.patient.dlt_status)" size="large" class="mb-2">
                        {{ getDltStatusIcon(props.patient.dlt_status) }}
                      </v-icon>
                      <div class="text-subtitle-2">DLT Status</div>
                      <v-chip :color="getDltStatusColor(props.patient.dlt_status)" variant="flat" size="small">
                        {{ props.patient.dlt_status || 'pending' }}
                      </v-chip>
                    </v-card-text>
                  </v-card>
                </v-col>
                <v-col cols="6">
                  <v-card variant="outlined">
                    <v-card-text class="text-center">
                      <v-icon color="blue" size="large" class="mb-2">mdi-fingerprint</v-icon>
                      <div class="text-subtitle-2">Biometric</div>
                      <v-chip color="green" variant="flat" size="small">
                        Linked
                      </v-chip>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn
          variant="outlined"
          @click="closeDialog"
          :disabled="loading"
        >
          {{ isView ? 'Close' : 'Cancel' }}
        </v-btn>
        <v-btn
          v-if="!isView"
          color="primary"
          :loading="loading"
          :disabled="!valid || loading"
          @click="savePatient"
        >
          {{ isEdit ? 'Update Security' : 'Enroll with Security' }}
        </v-btn>
      </v-card-actions>

      <!-- Enhanced Loading Overlay -->
      <v-overlay :model-value="loading" contained scrim="white" class="align-center justify-center">
        <div class="text-center">
          <v-progress-circular color="primary" indeterminate size="64" />
          <div class="text-h6 mt-4">
            {{ isEdit ? 'Updating Security...' : 'Securing Enrollment...' }}
          </div>
          <div class="text-body-2 text-medium-emphasis mt-2">
            <div v-if="!isEdit">
              <div>✓ Creating patient record</div>
              <div>✓ Generating blockchain DLT hash</div>
              <div>✓ Establishing biometric identity link</div>
            </div>
            <div v-else>
              <div>✓ Updating patient information</div>
              <div>✓ Regenerating DLT hash</div>
              <div>✓ Updating biometric verification</div>
            </div>
          </div>
        </div>
      </v-overlay>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { patientsApi } from '@/api'

const props = defineProps({
  modelValue: Boolean,
  patient: Object,
  mode: String // 'create', 'edit', or 'view'
})

const emit = defineEmits(['update:modelValue', 'saved'])

// Reactive data
const dialog = ref(false)
const valid = ref(false)
const loading = ref(false)
const form = ref(null)

const formData = ref({
  name: '',
  date_of_birth: '',
  contact_info: '',
  consent: true,
  hiv_status: ''
})

// Options
const consentOptions = [
  { title: 'Consented', value: true },
  { title: 'Not Consented', value: false }
]

const hivStatusOptions = [
  { title: 'Reactive', value: 'Reactive' },
  { title: 'Non-Reactive', value: 'Non-Reactive' }
]

// Validation rules
const requiredRule = value => !!value || 'This field is required'
const dateRule = value => {
  if (!value) return true
  const date = new Date(value)
  const today = new Date()
  return date <= today || 'Date of birth cannot be in the future'
}
const contactRule = value => {
  if (!value) return true
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const phoneRegex = /^\+?[\d\s-()]{10,}$/
  return emailRegex.test(value) || phoneRegex.test(value) || 'Enter a valid email or phone number'
}

// Computed
const isEdit = computed(() => props.mode === 'edit')
const isView = computed(() => props.mode === 'view')
const isCreate = computed(() => props.mode === 'create')

// Watchers
watch(() => props.modelValue, (value) => {
  dialog.value = value
  if (value) {
    initializeForm()
  }
})

watch(dialog, (value) => {
  emit('update:modelValue', value)
})

// Methods
function getDialogTitle() {
  switch (props.mode) {
    case 'create': return 'New Patient Enrollment'
    case 'edit': return 'Edit Patient'
    case 'view': return 'Patient Details'
    default: return 'Patient'
  }
}

function initializeForm() {
  if ((isEdit.value || isView.value) && props.patient) {
    // Populate form with existing patient data
    formData.value = {
      name: props.patient.name || '',
      date_of_birth: formatDateForInput(props.patient.date_of_birth),
      contact_info: props.patient.contact_info || props.patient.contact || '',
      consent: props.patient.consent_status === 'YES' || props.patient.consent === true,
      hiv_status: props.patient.hiv_status || ''
    }
  } else {
    // Reset form for new patient
    formData.value = {
      name: '',
      date_of_birth: '',
      contact_info: '',
      consent: true,
      hiv_status: ''
    }
  }

  // Reset validation
  nextTick(() => {
    if (form.value) {
      form.value.resetValidation()
    }
  })
}

function formatDateForInput(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toISOString().split('T')[0]
}

function formatDate(dateString) {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleString()
}

function getDltStatusColor(status) {
  const colors = {
    'verified': 'green',
    'pending': 'orange',
    'failed': 'red'
  }
  return colors[status] || 'grey'
}

function getDltStatusIcon(status) {
  const icons = {
    'verified': 'mdi-check-circle',
    'pending': 'mdi-clock',
    'failed': 'mdi-alert-circle'
  }
  return icons[status] || 'mdi-help-circle'
}

async function savePatient() {
  if (!form.value?.validate()) return

  loading.value = true
  try {
    const patientData = {
      name: formData.value.name,
      date_of_birth: formData.value.date_of_birth,
      contact_info: formData.value.contact_info,
      consent: formData.value.consent,
      hiv_status: formData.value.hiv_status
    }

    if (isEdit.value) {
      // Update existing patient
      await patientsApi.update(props.patient.patient_id, patientData)
    } else {
      // Create new patient - generate patient_id on backend or use a simple one
      const patientId = `HIV-${Date.now()}-${Math.floor(Math.random() * 10000)}`
      await patientsApi.create({
        patient_id: patientId,
        ...patientData
      })
    }
    
    emit('saved')
    closeDialog()
  } catch (error) {
    console.error('Failed to save patient:', error)
    // You can show an error message here
  } finally {
    loading.value = false
  }
}

function closeDialog() {
  if (!loading.value) {
    dialog.value = false
  }
}
</script>