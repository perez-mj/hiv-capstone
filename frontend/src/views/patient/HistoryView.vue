<template>
  <v-container fluid class="pa-4">
    <!-- Header -->
    <v-row align="center" class="mb-4">
      <v-col cols="12">
        <h1 class="text-h5 font-weight-bold mb-1">Visit History</h1>
        <div class="text-caption text-medium-emphasis">
          Your complete record of testing and treatment visits
        </div>
      </v-col>
    </v-row>

    <!-- Summary cards -->
    <v-row class="mb-4">
      <v-col cols="12" sm="4">
        <v-card elevation="2" class="pa-4">
          <div class="d-flex align-center">
            <v-avatar color="blue-lighten-4" size="48" class="mr-3">
              <v-icon color="blue-darken-2">mdi-flask</v-icon>
            </v-avatar>
            <div>
              <div class="text-caption text-medium-emphasis">Testing Visits</div>
              <div class="text-h6 font-weight-bold">{{ testingCount }}</div>
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="4">
        <v-card elevation="2" class="pa-4">
          <div class="d-flex align-center">
            <v-avatar color="teal-lighten-4" size="48" class="mr-3">
              <v-icon color="teal-darken-2">mdi-medical-bag</v-icon>
            </v-avatar>
            <div>
              <div class="text-caption text-medium-emphasis">Treatment Visits</div>
              <div class="text-h6 font-weight-bold">{{ treatmentCount }}</div>
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="4">
        <v-card elevation="2" class="pa-4">
          <div class="d-flex align-center">
            <v-avatar color="purple-lighten-4" size="48" class="mr-3">
              <v-icon color="purple-darken-2">mdi-calendar-clock</v-icon>
            </v-avatar>
            <div>
              <div class="text-caption text-medium-emphasis">Last Visit</div>
              <div class="text-h6 font-weight-bold">{{ lastVisitLabel }}</div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Filters -->
    <v-card class="mb-4" elevation="2">
      <v-card-text>
        <v-row dense align="center">
          <v-col cols="12" sm="3">
            <v-select
              v-model="filters.office"
              :items="officeOptions"
              item-title="label"
              item-value="value"
              label="Office"
              variant="outlined"
              density="comfortable"
              hide-details
            />
          </v-col>
          <v-col cols="12" sm="3">
            <v-text-field v-model="filters.from" label="From" type="date" variant="outlined" density="comfortable" hide-details />
          </v-col>
          <v-col cols="12" sm="3">
            <v-text-field v-model="filters.to" label="To" type="date" variant="outlined" density="comfortable" hide-details />
          </v-col>
          <v-col cols="12" sm="3" class="d-flex justify-end">
            <v-btn variant="text" @click="resetFilters" class="mr-2">Reset</v-btn>
            <v-btn color="primary" variant="flat" prepend-icon="mdi-magnify" :loading="loading" @click="loadHistory">
              Apply
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Timeline -->
    <v-card elevation="2">
      <v-card-title class="text-subtitle-1 font-weight-bold">Timeline</v-card-title>
      <v-divider />
      <v-card-text>
        <v-skeleton-loader v-if="loading" type="list-item-two-line@5" />
        <div v-else-if="encounters.length === 0" class="text-center py-10">
          <v-icon size="64" color="grey-lighten-1">mdi-history</v-icon>
          <div class="text-h6 mt-3">No visits found</div>
          <div class="text-body-2 text-medium-emphasis">
            Your visit history will appear here once you've completed an encounter.
          </div>
        </div>

        <v-timeline v-else side="end" density="comfortable" truncate-line="both">
          <v-timeline-item
            v-for="enc in encounters"
            :key="enc.id"
            :dot-color="enc.office === 'testing' ? 'blue-darken-2' : 'teal-darken-2'"
            :icon="enc.office === 'testing' ? 'mdi-flask' : 'mdi-medical-bag'"
            size="small"
          >
            <v-card elevation="1" class="mb-3">
              <v-card-title class="d-flex align-center text-body-1 font-weight-bold py-2">
                <span>{{ enc.TransactionType?.name || 'Encounter' }}</span>
                <v-chip
                  size="small"
                  class="ml-2"
                  :color="enc.office === 'testing' ? 'blue-lighten-4' : 'teal-lighten-4'"
                  variant="flat"
                >
                  {{ enc.office }}
                </v-chip>
                <v-spacer />
                <span class="text-caption text-medium-emphasis">
                  {{ formatDateTime(enc.occurred_at) }}
                </span>
              </v-card-title>
              <v-divider />
              <v-card-text class="py-3">
                <v-row dense v-if="enc.data && Object.keys(enc.data).length">
                  <v-col
                    v-for="(value, key) in enc.data"
                    :key="key"
                    cols="12"
                    sm="6"
                  >
                    <div class="text-caption text-medium-emphasis">{{ humanize(key) }}</div>
                    <div class="text-body-2">{{ formatValue(value) }}</div>
                  </v-col>
                </v-row>
                <div v-else class="text-caption text-medium-emphasis">No details recorded.</div>

                <template v-if="enc.notes">
                  <v-divider class="my-2" />
                  <div class="text-caption text-medium-emphasis">Notes</div>
                  <div class="text-body-2" style="white-space: pre-wrap">{{ enc.notes }}</div>
                </template>

                <div v-if="enc.Staff" class="text-caption text-medium-emphasis mt-2">
                  Attended by: {{ enc.Staff.username }}
                </div>
              </v-card-text>
            </v-card>
          </v-timeline-item>
        </v-timeline>
      </v-card-text>
    </v-card>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000" location="top right">
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import api from '@/plugins/axios';

const encounters = ref([]);
const loading = ref(false);

const filters = reactive({
  office: 'all',
  from: '',
  to: '',
});

const officeOptions = [
  { label: 'All Offices', value: 'all' },
  { label: 'Testing', value: 'testing' },
  { label: 'Treatment', value: 'treatment' },
];

const snackbar = reactive({ show: false, message: '', color: 'success' });
function notify(message, color = 'success') {
  snackbar.message = message;
  snackbar.color = color;
  snackbar.show = true;
}

const testingCount = computed(() => encounters.value.filter(e => e.office === 'testing').length);
const treatmentCount = computed(() => encounters.value.filter(e => e.office === 'treatment').length);

const lastVisitLabel = computed(() => {
  if (encounters.value.length === 0) return '—';
  const latest = encounters.value.reduce((a, b) =>
    new Date(a.occurred_at) > new Date(b.occurred_at) ? a : b
  );
  return new Date(latest.occurred_at).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: '2-digit',
  });
});

function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function humanize(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

async function loadHistory() {
  loading.value = true;
  try {
    const params = {};
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
    const { data } = await api.get('/encounters/my', { params });
    let list = data || [];
    if (filters.office !== 'all') {
      list = list.filter(e => e.office === filters.office);
    }
    encounters.value = list;
  } catch (e) {
    notify('Failed to load visit history: ' + (e.response?.data?.error || e.message), 'error');
  } finally {
    loading.value = false;
  }
}

function resetFilters() {
  filters.office = 'all';
  filters.from = '';
  filters.to = '';
  loadHistory();
}

onMounted(loadHistory);
</script>

<style scoped>
.v-timeline-item__body {
  width: 100%;
}
</style>