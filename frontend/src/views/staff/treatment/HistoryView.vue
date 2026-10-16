<!-- frontend/src/views/staff/treatment/HistoryView.vue -->
<template>
  <v-container fluid class="pa-4">
    <!-- Header -->
    <v-row align="center" class="mb-4">
      <v-col cols="12" md="8">
        <div class="d-flex align-center">
          <v-btn
            icon
            variant="text"
            class="mr-2"
            :to="backToPatientRoute"
            @click.prevent="goBack"
          >
            <v-icon>mdi-arrow-left</v-icon>
          </v-btn>
          <div>
            <h1 class="text-h5 font-weight-bold mb-0">Treatment History</h1>
            <div class="text-caption text-medium-emphasis">
              Past treatment encounters for
              <strong>{{ patientFullName || 'patient' }}</strong>
            </div>
          </div>
        </div>
      </v-col>
      <v-col cols="12" md="4" class="text-md-right">
        <div class="d-flex ga-2 justify-end flex-wrap">
          <v-btn
            variant="tonal"
            color="teal-darken-2"
            prepend-icon="mdi-account-outline"
            :to="backToPatientRoute"
          >
            Patient
          </v-btn>
          <v-btn
            color="teal-darken-2"
            variant="flat"
            prepend-icon="mdi-plus"
            :to="{ name: 'TreatmentEncounter', params: { patientId } }"
          >
            New Encounter
          </v-btn>
        </div>
      </v-col>
    </v-row>

    <!-- Filters -->
    <v-card class="mb-4" elevation="2">
      <v-card-text>
        <v-row dense align="center">
          <v-col cols="12" sm="4">
            <v-text-field
              v-model="filters.from"
              label="From"
              type="date"
              variant="outlined"
              density="comfortable"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" sm="4">
            <v-text-field
              v-model="filters.to"
              label="To"
              type="date"
              variant="outlined"
              density="comfortable"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" sm="4" class="d-flex align-center">
            <v-checkbox
              v-model="filters.includeVoided"
              label="Include voided"
              hide-details
              density="comfortable"
              color="teal-darken-2"
            />
          </v-col>
        </v-row>
      </v-card-text>
      <v-divider />
      <v-card-actions class="pa-3">
        <v-spacer />
        <v-btn variant="text" class="text-none" @click="resetFilters">Reset</v-btn>
        <v-btn
          color="teal-darken-2"
          variant="flat"
          class="text-none"
          prepend-icon="mdi-magnify"
          :loading="loading"
          @click="loadHistory"
        >
          Apply
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Summary strip -->
    <v-card variant="flat" class="mb-4 summary-strip">
      <v-card-text class="pa-4">
        <v-row dense>
          <v-col cols="12" sm="4">
            <div class="text-caption text-medium-emphasis">Total encounters</div>
            <div class="text-h6 font-weight-bold">{{ encounters.length }}</div>
          </v-col>
          <v-col cols="12" sm="4">
            <div class="text-caption text-medium-emphasis">Active</div>
            <div class="text-h6 font-weight-bold text-success">
              {{ encounters.filter((e) => !e.voided_at).length }}
            </div>
          </v-col>
          <v-col cols="12" sm="4">
            <div class="text-caption text-medium-emphasis">Voided</div>
            <div class="text-h6 font-weight-bold text-error">
              {{ encounters.filter((e) => e.voided_at).length }}
            </div>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Table -->
    <v-card elevation="2">
      <v-data-table
        :headers="headers"
        :items="encounters"
        :loading="loading"
        item-value="id"
        class="modern-table elevation-0"
        :items-per-page="15"
        :items-per-page-options="[10, 15, 25, 50]"
        no-data-text="No treatment encounters found."
      >
        <template #item.occurred_at="{ item }">
          <div class="d-flex flex-column">
            <span class="text-body-2">{{ formatDate(item.occurred_at) }}</span>
            <span class="text-caption text-medium-emphasis">
              {{ formatTime(item.occurred_at) }}
            </span>
          </div>
        </template>

        <template #item.transaction_type="{ item }">
          <div class="d-flex align-center">
            <span
              class="color-dot mr-2"
              :style="{ backgroundColor: item.TransactionType?.color_code || '#cbd5e1' }"
            />
            <div class="d-flex flex-column">
              <span class="text-body-2 font-weight-medium">
                {{ item.TransactionType?.name || '—' }}
              </span>
              <span
                v-if="item.schema_version"
                class="text-caption text-medium-emphasis"
              >
                schema v{{ item.schema_version }}
              </span>
            </div>
          </div>
        </template>

        <template #item.summary="{ item }">
          <div class="summary-cell">
            <template v-if="summaryChips(item).length">
              <v-chip
                v-for="(chip, i) in summaryChips(item)"
                :key="i"
                size="small"
                variant="tonal"
                :color="chip.color"
                class="mr-1 mb-1"
              >
                <strong class="mr-1">{{ chip.label }}:</strong>
                <span class="text-truncate" style="max-width: 160px">
                  {{ chip.value }}
                </span>
              </v-chip>
            </template>
            <span v-else class="text-caption text-medium-emphasis">—</span>
          </div>
        </template>

        <template #item.staff="{ item }">
          <span class="text-caption">
            {{ item.Staff?.username || '—' }}
          </span>
        </template>

        <template #item.status="{ item }">
          <v-chip
            v-if="item.voided_at"
            color="error"
            size="small"
            variant="tonal"
            prepend-icon="mdi-cancel"
          >
            Voided
          </v-chip>
          <v-chip
            v-else
            color="success"
            size="small"
            variant="tonal"
            prepend-icon="mdi-check-circle"
          >
            Active
          </v-chip>
        </template>

        <template #item.actions="{ item }">
          <div class="d-flex justify-end ga-1">
            <v-tooltip text="View details" location="top">
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon="mdi-eye-outline"
                  size="small"
                  variant="text"
                  color="primary"
                  @click="openDetail(item)"
                />
              </template>
            </v-tooltip>

            <v-tooltip v-if="!item.voided_at" text="Void encounter" location="top">
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon="mdi-cancel"
                  size="small"
                  variant="text"
                  color="error"
                  @click="openVoidDialog(item)"
                />
              </template>
            </v-tooltip>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Detail Dialog -->
    <EncounterDetailDialog
      v-model="detailDialog"
      :encounter="selectedEncounter"
    />

    <!-- Void Dialog -->
    <v-dialog v-model="voidDialog" max-width="480" persistent>
      <v-card class="dialog-card">
        <v-card-title class="d-flex align-center pa-4">
          <v-icon class="mr-2" color="error">mdi-cancel</v-icon>
          <span class="text-subtitle-1 font-weight-bold">Void Encounter</span>
          <v-spacer />
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            :disabled="voiding"
            @click="voidDialog = false"
          />
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-4">
          <p class="text-body-2 mb-3">
            Are you sure you want to void encounter
            <strong>#{{ voidTarget?.id }}</strong>?
            This action is recorded in the audit log.
          </p>
          <v-textarea
            v-model="voidReason"
            label="Reason for voiding *"
            variant="outlined"
            rows="3"
            auto-grow
            :rules="[(v) => !!v.trim() || 'Reason is required']"
          />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn
            variant="text"
            class="text-none"
            :disabled="voiding"
            @click="voidDialog = false"
          >
            Cancel
          </v-btn>
          <v-btn
            color="error"
            variant="flat"
            class="text-none"
            :loading="voiding"
            :disabled="!voidReason.trim()"
            @click="confirmVoid"
          >
            Void Encounter
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      timeout="3000"
      location="top right"
      rounded="lg"
    >
      <div class="d-flex align-center">
        <v-icon class="mr-2">
          {{ snackbar.color === 'success' ? 'mdi-check-circle' : 'mdi-alert-circle' }}
        </v-icon>
        {{ snackbar.message }}
      </div>
      <template #actions>
        <v-btn icon="mdi-close" variant="text" size="small" @click="snackbar.show = false" />
      </template>
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import treatmentService from '@/services/treatmentService';
import patientService from '@/services/patientService';
import EncounterDetailDialog from '@/components/encounters/EncounterDetailDialog.vue';

const route = useRoute();
const router = useRouter();

const patientId = Number(route.params.patientId);
const patient = ref(null);

const encounters = ref([]);
const loading = ref(false);

const filters = reactive({
  from: '',
  to: '',
  includeVoided: true,
});

const headers = [
  { title: 'Date', key: 'occurred_at', sortable: true, width: '160px' },
  { title: 'Transaction Type', key: 'transaction_type', sortable: false, width: '220px' },
  { title: 'Summary', key: 'summary', sortable: false },
  { title: 'Staff', key: 'staff', sortable: false, width: '140px' },
  { title: 'Status', key: 'status', sortable: false, width: '130px' },
  { title: '', key: 'actions', sortable: false, align: 'end', width: '110px' },
];

const detailDialog = ref(false);
const selectedEncounter = ref(null);

const voidDialog = ref(false);
const voidTarget = ref(null);
const voidReason = ref('');
const voiding = ref(false);

const snackbar = reactive({ show: false, message: '', color: 'success' });
function notify(message, color = 'success') {
  snackbar.message = message;
  snackbar.color = color;
  snackbar.show = true;
}

const patientFullName = computed(() => {
  if (!patient.value) return '';
  const p = patient.value;
  return [p.first_name, p.middle_name, p.last_name, p.suffix].filter(Boolean).join(' ');
});

const backToPatientRoute = computed(() => ({
  name: 'PatientDetail',
  params: { id: patientId },
}));

function goBack() {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push(backToPatientRoute.value);
  }
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

function formatTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function summaryChips(encounter) {
  const schema = encounter?.TransactionType?.checklist_schema?.fields || [];
  const data = encounter?.data || {};

  const score = (type) => {
    if (type === 'enum') return 3;
    if (type === 'boolean') return 2;
    if (type === 'number') return 2;
    if (type === 'text') return 1;
    return 0;
  };

  const candidates = schema
    .filter((f) => {
      const v = data[f.key];
      if (v === undefined || v === null || v === '') return false;
      if (Array.isArray(v) && v.length === 0) return false;
      return true;
    })
    .map((f) => ({ ...f, value: data[f.key] }));

  if (candidates.length === 0) {
    return Object.entries(data)
      .slice(0, 3)
      .map(([key, value]) => ({
        label: humanize(key),
        value: formatScalar(value),
        color: 'primary',
      }));
  }

  return candidates
    .sort((a, b) => score(b.type) - score(a.type))
    .slice(0, 3)
    .map((f) => ({
      label: f.label || humanize(f.key),
      value: formatScalar(f.value, f.type),
      color: chipColor(f),
    }));
}

function chipColor(field) {
  if (field.type === 'boolean') return field.value ? 'success' : 'grey';
  const v = String(field.value || '').toLowerCase();
  if (v.includes('positive') || v.includes('reactive')) return 'error';
  if (v.includes('negative') || v.includes('non-reactive')) return 'success';
  if (v.includes('inconclusive') || v.includes('invalid')) return 'warning';
  return 'primary';
}

function formatScalar(value, type) {
  if (value === null || value === undefined || value === '') return '—';
  if (type === 'boolean' || typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  const s = String(value);
  return s.length > 40 ? s.slice(0, 40) + '…' : s;
}

function humanize(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

async function loadPatient() {
  try {
    patient.value = await patientService.getPatient(patientId);
  } catch (e) {
    notify('Failed to load patient: ' + (e.response?.data?.error || e.message), 'error');
  }
}

async function loadHistory() {
  loading.value = true;
  try {
    const params = { patient_id: patientId };
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
    if (filters.includeVoided) params.include_voided = 'true';

    const result = await treatmentService.getEncounters(params);
    encounters.value = Array.isArray(result) ? result : [];
  } catch (e) {
    notify('Failed to load history: ' + (e.response?.data?.error || e.message), 'error');
    encounters.value = [];
  } finally {
    loading.value = false;
  }
}

function resetFilters() {
  filters.from = '';
  filters.to = '';
  filters.includeVoided = true;
  loadHistory();
}

function openDetail(item) {
  selectedEncounter.value = item;
  detailDialog.value = true;
}

function openVoidDialog(item) {
  voidTarget.value = item;
  voidReason.value = '';
  voidDialog.value = true;
}

async function confirmVoid() {
  if (!voidTarget.value || !voidReason.value.trim()) return;
  voiding.value = true;
  try {
    await treatmentService.voidEncounter(voidTarget.value.id, voidReason.value.trim());
    notify('Encounter voided.', 'success');
    voidDialog.value = false;
    await loadHistory();
  } catch (e) {
    notify('Failed to void encounter: ' + (e.response?.data?.error || e.message), 'error');
  } finally {
    voiding.value = false;
  }
}

onMounted(async () => {
  await Promise.all([loadPatient(), loadHistory()]);
});
</script>

<style scoped>
.modern-table :deep(thead th) {
  font-weight: 600 !important;
  text-transform: uppercase;
  font-size: 0.72rem !important;
  letter-spacing: 0.5px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06) !important;
}
.modern-table :deep(tbody td) {
  padding-top: 14px !important;
  padding-bottom: 14px !important;
}
.summary-strip {
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
}
.dialog-card {
  border-radius: 16px;
  overflow: hidden;
}
.color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 2px #fff, 0 0 0 3px rgba(0, 0, 0, 0.06);
  display: inline-block;
}
.summary-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  max-width: 620px;
}
</style>