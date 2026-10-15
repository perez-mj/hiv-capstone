<!-- frontend/src/views/staff/treatment/EncounterView.vue -->
<template>
  <v-container fluid class="pa-4">
    <!-- Header -->
    <v-row align="center" class="mb-4">
      <v-col cols="12" md="8">
        <div class="d-flex align-center">
          <v-btn icon variant="text" @click="goBack" class="mr-2">
            <v-icon>mdi-arrow-left</v-icon>
          </v-btn>
          <div>
            <h1 class="text-h5 font-weight-bold mb-0">Treatment Encounter</h1>
            <div class="text-caption text-medium-emphasis">
              Record a new treatment transaction for the selected patient
            </div>
          </div>
        </div>
      </v-col>
      <v-col cols="12" md="4" class="text-md-right">
        <v-chip color="teal-darken-2" variant="flat" prepend-icon="mdi-medical-bag">
          Treatment Office
        </v-chip>
      </v-col>
    </v-row>

    <!-- Patient Selector -->
    <v-card v-if="!patientId" class="mb-4" elevation="2">
      <v-card-title class="text-subtitle-1 font-weight-bold">Select Patient</v-card-title>
      <v-card-text>
        <v-autocomplete
          v-model="selectedPatientId"
          :items="patientOptions"
          :loading="loadingPatients"
          item-title="label"
          item-value="id"
          label="Search patient by name or facility code"
          prepend-inner-icon="mdi-account-search"
          variant="outlined"
          hide-details
          clearable
          @update:search="searchPatients"
          @update:model-value="onPatientSelected"
        />
      </v-card-text>
    </v-card>

    <!-- Patient summary -->
    <v-card v-if="patient" class="mb-4" elevation="2">
      <v-card-text>
        <v-row dense>
          <v-col cols="12" sm="4">
            <div class="text-caption text-medium-emphasis">Patient</div>
            <div class="text-body-1 font-weight-medium">{{ patientFullName }}</div>
          </v-col>
          <v-col cols="12" sm="4">
            <div class="text-caption text-medium-emphasis">Facility Code</div>
            <div class="text-body-1">{{ patient.patient_facility_code }}</div>
          </v-col>
          <v-col cols="12" sm="4">
            <div class="text-caption text-medium-emphasis">Contact</div>
            <div class="text-body-1">{{ patient.contact_number || '—' }}</div>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Encounter Form -->
    <v-card v-if="patient" elevation="2">
      <v-card-title class="text-subtitle-1 font-weight-bold">Encounter Details</v-card-title>
      <v-divider />
      <v-card-text>
        <v-form ref="formRef" v-model="formValid" lazy-validation>
          <v-row>
            <v-col cols="12" md="6">
              <v-select
                v-model="form.transaction_type_id"
                :items="transactionTypes"
                item-title="name"
                item-value="id"
                label="Transaction Type *"
                :rules="[v => !!v || 'Transaction type is required']"
                variant="outlined"
                :loading="loadingTypes"
                prepend-inner-icon="mdi-tag"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                v-model="form.occurred_at"
                label="Occurred At"
                type="datetime-local"
                variant="outlined"
                prepend-inner-icon="mdi-clock-outline"
              />
            </v-col>

            <v-col cols="12">
              <v-divider class="my-2" />
              <div class="text-subtitle-2 font-weight-bold mb-2">Clinical Data</div>

              <div v-if="currentTypeSchema.length === 0" class="text-caption text-medium-emphasis">
                No additional fields required for this transaction type.
              </div>

              <v-row v-else>
                <v-col
                  v-for="field in currentTypeSchema"
                  :key="field.key"
                  cols="12"
                  :md="field.cols || 6"
                >
                  <v-text-field
                    v-if="field.type === 'text' || field.type === 'number'"
                    v-model="form.data[field.key]"
                    :label="field.label"
                    :type="field.type"
                    :rules="field.required ? [v => v !== '' && v !== null && v !== undefined || `${field.label} is required`] : []"
                    variant="outlined"
                  />

                  <v-textarea
                    v-else-if="field.type === 'textarea'"
                    v-model="form.data[field.key]"
                    :label="field.label"
                    :rules="field.required ? [v => !!v || `${field.label} is required`] : []"
                    variant="outlined"
                    rows="3"
                    auto-grow
                  />

                  <v-select
                    v-else-if="field.type === 'select'"
                    v-model="form.data[field.key]"
                    :items="field.options || []"
                    :label="field.label"
                    :rules="field.required ? [v => !!v || `${field.label} is required`] : []"
                    variant="outlined"
                  />

                  <v-switch
                    v-else-if="field.type === 'boolean'"
                    v-model="form.data[field.key]"
                    :label="field.label"
                    color="primary"
                    inset
                  />

                  <v-text-field
                    v-else-if="field.type === 'date'"
                    v-model="form.data[field.key]"
                    :label="field.label"
                    type="date"
                    :rules="field.required ? [v => !!v || `${field.label} is required`] : []"
                    variant="outlined"
                  />
                </v-col>
              </v-row>
            </v-col>

            <v-col cols="12">
              <v-textarea
                v-model="form.notes"
                label="Notes (optional)"
                variant="outlined"
                rows="3"
                auto-grow
                prepend-inner-icon="mdi-note-text-outline"
              />
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>

      <v-divider />
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="resetForm">Reset</v-btn>
        <v-btn
          color="teal-darken-2"
          variant="flat"
          :loading="submitting"
          :disabled="!formValid || !form.transaction_type_id"
          prepend-icon="mdi-content-save"
          @click="submit"
        >
          Save Encounter
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Empty state -->
    <v-card v-if="!patient && !patientId" class="pa-8 text-center" elevation="2">
      <v-icon size="64" color="grey-lighten-1">mdi-account-search-outline</v-icon>
      <div class="text-h6 mt-3">No patient selected</div>
      <div class="text-body-2 text-medium-emphasis">
        Search and select a patient above to begin a treatment encounter.
      </div>
    </v-card>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000" location="top right">
      {{ snackbar.message }}
      <template #actions>
        <v-btn variant="text" @click="snackbar.show = false">Close</v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import treatmentService from '@/services/treatmentService';
import patientService from '@/services/patientService';
import transactionTypeService from '@/services/transactionTypeService';

const route = useRoute();
const router = useRouter();

const patientId = ref(route.params.patientId ? Number(route.params.patientId) : null);

// ----- Patient -----
const patient = ref(null);
const selectedPatientId = ref(patientId.value);
const patientOptions = ref([]);
const loadingPatients = ref(false);

// ----- Transaction types -----
const transactionTypes = ref([]);
const loadingTypes = ref(false);

// ----- Form -----
const formRef = ref(null);
const formValid = ref(false);
const submitting = ref(false);

const form = reactive({
  transaction_type_id: null,
  occurred_at: defaultDateTimeLocal(),
  data: {},
  notes: '',
});

// ----- Treatment transaction type schemas -----
const TRANSACTION_TYPE_SCHEMAS = {
  'ARV Refill': [
    { key: 'regimen', label: 'ARV Regimen', type: 'select', required: true, options: ['TLD', 'ABC/3TC+DTG', 'AZT/3TC+EFV', 'Other'], cols: 6 },
    { key: 'months_supply', label: 'Months of Supply', type: 'select', required: true, options: [1, 3, 6], cols: 6 },
    { key: 'pills_dispensed', label: 'Pills Dispensed', type: 'number', cols: 6 },
    { key: 'next_refill_date', label: 'Next Refill Date', type: 'date', cols: 6 },
    { key: 'adherence', label: 'Adherence', type: 'select', options: ['Good', 'Fair', 'Poor'], cols: 6 },
    { key: 'remarks', label: 'Remarks', type: 'textarea', cols: 12 },
  ],
  'Consultation': [
    { key: 'chief_complaint', label: 'Chief Complaint', type: 'textarea', required: true, cols: 12 },
    { key: 'assessment', label: 'Assessment', type: 'textarea', cols: 12 },
    { key: 'plan', label: 'Plan', type: 'textarea', cols: 12 },
  ],
  'Vital Signs': [
    { key: 'blood_pressure', label: 'Blood Pressure', type: 'text', cols: 6 },
    { key: 'heart_rate', label: 'Heart Rate (bpm)', type: 'number', cols: 6 },
    { key: 'temperature', label: 'Temperature (°C)', type: 'number', cols: 6 },
    { key: 'weight', label: 'Weight (kg)', type: 'number', cols: 6 },
    { key: 'height', label: 'Height (cm)', type: 'number', cols: 6 },
  ],
  'default': [
    { key: 'findings', label: 'Findings', type: 'textarea', required: true, cols: 12 },
    { key: 'remarks', label: 'Remarks', type: 'textarea', cols: 12 },
  ],
};

const currentTypeSchema = computed(() => {
  const tt = transactionTypes.value.find(t => t.id === form.transaction_type_id);
  if (!tt) return [];
  return TRANSACTION_TYPE_SCHEMAS[tt.name] || TRANSACTION_TYPE_SCHEMAS['default'];
});

const patientFullName = computed(() => {
  if (!patient.value) return '';
  const p = patient.value;
  return [p.first_name, p.middle_name, p.last_name, p.suffix].filter(Boolean).join(' ');
});

const snackbar = reactive({ show: false, message: '', color: 'success' });
function notify(message, color = 'success') {
  snackbar.message = message;
  snackbar.color = color;
  snackbar.show = true;
}

function defaultDateTimeLocal() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function goBack() {
  router.back();
}

async function loadPatient() {
  if (!patientId.value) return;
  try {
    patient.value = await patientService.getPatient(patientId.value);
    selectedPatientId.value = patient.value.id;
  } catch (e) {
    notify('Failed to load patient: ' + (e.response?.data?.error || e.message), 'error');
  }
}

async function loadTransactionTypes() {
  loadingTypes.value = true;
  try {
    // Signature: getTransactionTypes(office, params)
    const list = await transactionTypeService.getTransactionTypes('treatment', { is_active: true });
    transactionTypes.value = list;
    if (!form.transaction_type_id && list.length === 1) {
      form.transaction_type_id = list[0].id;
    }
  } catch (e) {
    notify('Failed to load transaction types: ' + (e.response?.data?.error || e.message), 'error');
  } finally {
    loadingTypes.value = false;
  }
}

async function searchPatients(query) {
  if (!query || query.length < 2) {
    patientOptions.value = [];
    return;
  }
  loadingPatients.value = true;
  try {
    // Signature: getPatients(page, limit, search, purpose, year)
    const result = await patientService.getPatients(1, 20, query, 'treatment');
    // Backend returns { items, total, page, totalPages }
    const rows = result?.items || result?.data || result?.patients || (Array.isArray(result) ? result : []);
    patientOptions.value = rows.map(p => ({
      id: p.id,
      label: `${p.first_name} ${p.last_name} — ${p.patient_facility_code}`,
    }));
  } catch (e) {
    console.error('Patient search failed:', e);
    patientOptions.value = [];
  } finally {
    loadingPatients.value = false;
  }
}

async function onPatientSelected(id) {
  if (!id) return
  // Let the autocomplete finish its selection event first.
  await nextTick()
  // Route change first, then flip the v-if state so the autocomplete
  // isn't unmounted mid-patch.
  await router.replace({ name: 'TreatmentEncounter', params: { patientId: id } })
  patientId.value = id
  await loadPatient()
  resetForm()
}

function resetForm() {
  form.transaction_type_id = transactionTypes.value.length === 1 ? transactionTypes.value[0].id : null;
  form.occurred_at = defaultDateTimeLocal();
  form.data = {};
  form.notes = '';
  formRef.value?.resetValidation();
}

async function submit() {
  if (!formRef.value) return;
  const valid = await formRef.value.validate();
  if (!valid.valid) return;

  submitting.value = true;
  try {
    await treatmentService.createEncounter({
      patient_id: patientId.value,
      transaction_type_id: form.transaction_type_id,
      data: form.data,
      notes: form.notes || undefined,
      occurred_at: form.occurred_at ? new Date(form.occurred_at).toISOString() : undefined,
    });
    notify('Treatment encounter saved successfully.', 'success');
    resetForm();
  } catch (e) {
    notify('Failed to save encounter: ' + (e.response?.data?.error || e.message), 'error');
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  await loadTransactionTypes();
  if (patientId.value) await loadPatient();
});

watch(patientId, (v) => { if (v) loadPatient(); });
</script>

<style scoped>
</style>