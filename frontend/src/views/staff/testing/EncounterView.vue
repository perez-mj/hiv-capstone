<!-- frontend/src/views/staff/testing/EncounterView.vue -->
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
            <h1 class="text-h5 font-weight-bold mb-0">Testing Encounter</h1>
            <div class="text-caption text-medium-emphasis">
              Record a new testing transaction for the selected patient
            </div>
          </div>
        </div>
      </v-col>
      <v-col cols="12" md="4" class="text-md-right">
        <v-chip color="blue-darken-2" variant="flat" prepend-icon="mdi-flask">
          Testing Office
        </v-chip>
      </v-col>
    </v-row>

    <!-- Patient Selector (when no patientId in route) -->
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
              >
                <template #item="{ props, item }">
                  <v-list-item v-bind="props">
                    <template #prepend>
                      <v-avatar
                        size="12"
                        :color="item.raw.color_code || 'grey'"
                        class="mr-2"
                      />
                    </template>
                    <v-list-item-subtitle v-if="item.raw.estimated_duration_minutes">
                      {{ item.raw.estimated_duration_minutes }} min
                    </v-list-item-subtitle>
                  </v-list-item>
                </template>
              </v-select>
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

            <!-- ────── Dynamic fields from checklist_schema ────── -->
            <v-col cols="12">
              <v-divider class="my-2" />
              <div class="d-flex align-center justify-space-between mb-2">
                <div class="text-subtitle-2 font-weight-bold">Clinical Data</div>
                <v-chip
                  v-if="currentSchemaVersion"
                  size="x-small"
                  variant="tonal"
                  color="medium-emphasis"
                >
                  schema v{{ currentSchemaVersion }}
                </v-chip>
              </div>

              <div
                v-if="currentChecklistFields.length === 0"
                class="text-caption text-medium-emphasis"
              >
                No additional fields configured for this transaction type.
              </div>

              <v-row v-else>
                <v-col
                  v-for="field in currentChecklistFields"
                  :key="field.key"
                  cols="12"
                  :md="field.type === 'textarea' ? 12 : 6"
                >
                  <DynamicField
                    :field="field"
                    v-model="form.data[field.key]"
                  />
                </v-col>
              </v-row>
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>

      <v-divider />
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="resetForm">Reset</v-btn>
        <v-btn
          color="primary"
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
        Search and select a patient above to begin a testing encounter.
      </div>
    </v-card>
    <!-- ← NEW: follow-up scheduler -->
<QuickScheduleDialog
  v-model="scheduleDialog"
  :patient="patient"
  office="testing"     
  @scheduled="onScheduled"
/>

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
import testingService from '@/services/testingService';
import patientService from '@/services/patientService';
import transactionTypeService from '@/services/transactionTypeService';
import DynamicField from '@/components/encounters/DynamicField.vue';
import QuickScheduleDialog from '@/components/appointments/QuickScheduleDialog.vue';

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
const scheduleDialog = ref(false);

const form = reactive({
  transaction_type_id: null,
  occurred_at: defaultDateTimeLocal(),
  data: {},
});

/* ─────────────── Schema source ─────────────── */
const currentTransactionType = computed(() =>
  transactionTypes.value.find(t => t.id === form.transaction_type_id) || null
);

const currentChecklistFields = computed(() => {
  const tt = currentTransactionType.value;
  const fields = tt?.checklist_schema?.fields;
  return Array.isArray(fields) ? fields : [];
});

const currentSchemaVersion = computed(
  () => currentTransactionType.value?.schema_version || null
);

const patientFullName = computed(() => {
  if (!patient.value) return '';
  const p = patient.value;
  return [p.first_name, p.middle_name, p.last_name, p.suffix].filter(Boolean).join(' ');
});

// ----- Snackbar -----
const snackbar = reactive({ show: false, message: '', color: 'success' });
function notify(message, color = 'success') {
  snackbar.message = message;
  snackbar.color = color;
  snackbar.show = true;
}

// ----- Helpers -----
function defaultDateTimeLocal() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function onScheduled(appointment) {
  const d = appointment.appointment_date;
  const t = appointment.time_slot;
  notify(`Follow-up scheduled for ${d} at ${t}.`, 'success');
}

function goBack() {
  router.back();
}

// ----- Data loading -----
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
    const list = await transactionTypeService.getTransactionTypes('testing', { is_active: true });
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
    const result = await patientService.getPatients(1, 20, query, 'testing');
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
  await nextTick()
  await router.replace({ name: 'TestingEncounter', params: { patientId: id } })
  patientId.value = id
  await loadPatient()
  resetForm()
}

// ----- Form behavior -----
function resetForm() {
  form.transaction_type_id = transactionTypes.value.length === 1 ? transactionTypes.value[0].id : null;
  form.occurred_at = defaultDateTimeLocal();
  form.data = {};
  formRef.value?.resetValidation();
}

// ← NEW: clear stale keys when the transaction type changes
watch(
  () => form.transaction_type_id,
  () => {
    form.data = {};
    formRef.value?.resetValidation();
  }
);

async function submit() {
  if (!formRef.value) return;
  const valid = await formRef.value.validate();
  if (!valid.valid) return;

  submitting.value = true;
  try {
    await testingService.createEncounter({
      patient_id: patientId.value,
      transaction_type_id: form.transaction_type_id,
      data: form.data,
      occurred_at: form.occurred_at ? new Date(form.occurred_at).toISOString() : undefined,
    });
    notify('Testing encounter saved successfully.', 'success');
    resetForm();
    scheduleDialog.value = true;
  } catch (e) {
    const details = e.response?.data?.details;
    const message =
      e.response?.data?.error ||
      (Array.isArray(details) ? details.map(d => `${d.instancePath || ''} ${d.message}`).join('; ') : null) ||
      e.message;
    notify('Failed to save encounter: ' + message, 'error');
  } finally {
    submitting.value = false;
  }
}

// ----- Lifecycle -----
onMounted(async () => {
  await loadTransactionTypes();
  if (patientId.value) {
    await loadPatient();
  }
});

watch(patientId, (v) => {
  if (v) loadPatient();
});
</script>

<style scoped>
</style>