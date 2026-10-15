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
            <h1 class="text-h5 font-weight-bold mb-0">Testing History</h1>
            <div class="text-caption text-medium-emphasis">
              Past testing encounters for {{ patientFullName || 'patient' }}
            </div>
          </div>
        </div>
      </v-col>
      <v-col cols="12" md="4" class="text-md-right">
        <v-btn
          color="primary"
          variant="flat"
          prepend-icon="mdi-plus"
          :to="{ name: 'TestingEncounter', params: { patientId } }"
        >
          New Encounter
        </v-btn>
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
            />
          </v-col>
          <v-col cols="12" sm="4">
            <v-checkbox
              v-model="filters.includeVoided"
              label="Include voided"
              hide-details
              density="comfortable"
            />
          </v-col>
        </v-row>
      </v-card-text>
      <v-divider />
      <v-card-actions class="pa-3">
        <v-spacer />
        <v-btn variant="text" @click="resetFilters">Reset</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          prepend-icon="mdi-magnify"
          :loading="loading"
          @click="loadHistory"
        >
          Apply
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Table -->
    <v-card elevation="2">
      <v-data-table
        :headers="headers"
        :items="encounters"
        :loading="loading"
        item-value="id"
        class="elevation-0"
        :items-per-page="15"
        no-data-text="No testing encounters found."
      >
        <template #item.occurred_at="{ item }">
          {{ formatDateTime(item.occurred_at) }}
        </template>

        <template #item.transaction_type="{ item }">
          <div class="d-flex align-center">
            <v-avatar
              size="12"
              :color="item.TransactionType?.color_code || 'grey'"
              class="mr-2"
            />
            <span>{{ item.TransactionType?.name || '—' }}</span>
          </div>
        </template>

        <template #item.staff="{ item }">
          {{ item.Staff?.username || '—' }}
        </template>

        <template #item.status="{ item }">
          <v-chip
            v-if="item.voided_at"
            color="error"
            size="small"
            variant="flat"
          >
            Voided
          </v-chip>
          <v-chip v-else color="success" size="small" variant="flat">
            Active
          </v-chip>
        </template>

        <template #item.actions="{ item }">
          <v-btn
            icon
            size="small"
            variant="text"
            color="primary"
            @click="openDetail(item)"
          >
            <v-icon>mdi-eye</v-icon>
          </v-btn>
          <v-btn
            v-if="!item.voided_at"
            icon
            size="small"
            variant="text"
            color="error"
            @click="openVoidDialog(item)"
          >
            <v-icon>mdi-cancel</v-icon>
          </v-btn>
        </template>
      </v-data-table>
    </v-card>

    <!-- Detail Dialog -->
    <v-dialog v-model="detailDialog" max-width="720">
      <v-card v-if="selectedEncounter">
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">mdi-flask</v-icon>
          Testing Encounter #{{ selectedEncounter.id }}
          <v-spacer />
          <v-btn icon variant="text" @click="detailDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-divider />
        <v-card-text>
          <v-row dense>
            <v-col cols="12" sm="6">
              <div class="text-caption text-medium-emphasis">Occurred At</div>
              <div>{{ formatDateTime(selectedEncounter.occurred_at) }}</div>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="text-caption text-medium-emphasis">Transaction Type</div>
              <div>{{ selectedEncounter.TransactionType?.name }}</div>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="text-caption text-medium-emphasis">Staff</div>
              <div>{{ selectedEncounter.Staff?.username }}</div>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="text-caption text-medium-emphasis">Recorded</div>
              <div>{{ formatDateTime(selectedEncounter.created_at) }}</div>
            </v-col>
          </v-row>

          <v-divider class="my-4" />

          <div class="text-subtitle-2 font-weight-bold mb-2">Clinical Data</div>
          <v-table density="compact">
            <tbody>
              <tr v-for="(value, key) in selectedEncounter.data" :key="key">
                <td class="text-medium-emphasis" style="width: 40%">{{ humanize(key) }}</td>
                <td>{{ formatValue(value) }}</td>
              </tr>
              <tr v-if="!selectedEncounter.data || Object.keys(selectedEncounter.data).length === 0">
                <td colspan="2" class="text-medium-emphasis">No data recorded.</td>
              </tr>
            </tbody>
          </v-table>

          <template v-if="selectedEncounter.notes">
            <v-divider class="my-4" />
            <div class="text-subtitle-2 font-weight-bold mb-2">Notes</div>
            <div class="text-body-2" style="white-space: pre-wrap">{{ selectedEncounter.notes }}</div>
          </template>

          <template v-if="selectedEncounter.voided_at">
            <v-alert type="error" variant="tonal" class="mt-4">
              <strong>Voided:</strong> {{ selectedEncounter.void_reason }}
              <div class="text-caption">at {{ formatDateTime(selectedEncounter.voided_at) }}</div>
            </v-alert>
          </template>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Void Dialog -->
    <v-dialog v-model="voidDialog" max-width="480">
      <v-card>
        <v-card-title>Void Encounter</v-card-title>
        <v-card-text>
          <p class="mb-3">
            Are you sure you want to void encounter #{{ voidTarget?.id }}?
            This action is recorded in the audit log.
          </p>
          <v-textarea
            v-model="voidReason"
            label="Reason for voiding *"
            variant="outlined"
            rows="3"
            auto-grow
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="voidDialog = false">Cancel</v-btn>
          <v-btn
            color="error"
            variant="flat"
            :loading="voiding"
            :disabled="!voidReason.trim()"
            @click="confirmVoid"
          >
            Void
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000" location="top right">
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import testingService from '@/services/testingService';
import patientService from '@/services/patientService';

const route = useRoute();
const router = useRouter();

const patientId = Number(route.params.patientId);
const patient = ref(null);

const encounters = ref([]);
const loading = ref(false);

const filters = reactive({
  from: '',
  to: '',
  includeVoided: false,
});

const headers = [
  { title: 'Date', key: 'occurred_at', sortable: true },
  { title: 'Transaction Type', key: 'transaction_type', sortable: false },
  { title: 'Staff', key: 'staff', sortable: false },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' },
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

function goBack() {
  router.back();
}

function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function humanize(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
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
    encounters.value = await testingService.getEncounters(params);
  } catch (e) {
    notify('Failed to load history: ' + (e.response?.data?.error || e.message), 'error');
  } finally {
    loading.value = false;
  }
}

function resetFilters() {
  filters.from = '';
  filters.to = '';
  filters.includeVoided = false;
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
    await testingService.voidEncounter(voidTarget.value.id, voidReason.value.trim());
    notify('Encounter voided.', 'success');
    voidDialog.value = false;
    loadHistory();
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
</style>