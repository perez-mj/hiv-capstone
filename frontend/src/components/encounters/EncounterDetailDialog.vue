<!-- frontend/src/components/encounters/EncounterDetailDialog.vue -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="820"
    scrollable
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card v-if="encounter" class="dialog-card">
      <!-- Header -->
      <v-card-title class="d-flex align-center pa-4">
        <v-icon class="mr-2" color="primary">
          {{ encounter.office === 'testing' ? 'mdi-flask' : 'mdi-medical-bag' }}
        </v-icon>
        <div class="flex-grow-1">
          <div class="text-subtitle-1 font-weight-bold">
            {{ encounter.TransactionType?.name || 'Encounter' }}
            <span class="text-caption text-medium-emphasis ml-2">
              #{{ encounter.id }}
            </span>
          </div>
          <div class="text-caption text-medium-emphasis">
            {{ formatDateTime(encounter.occurred_at) }}
            · {{ encounter.Staff?.username || 'unknown staff' }}
            · schema v{{ encounter.schema_version || 1 }}
          </div>
        </div>

        <v-chip
          v-if="encounter.voided_at"
          color="error"
          size="small"
          variant="flat"
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

        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          class="ml-2"
          @click="$emit('update:modelValue', false)"
        />
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-4">
        <!-- Metadata grid -->
        <v-row dense class="mb-2">
          <v-col cols="12" sm="6">
            <div class="text-caption text-medium-emphasis">Occurred At</div>
            <div class="text-body-2">{{ formatDateTime(encounter.occurred_at) }}</div>
          </v-col>
          <v-col cols="12" sm="6">
            <div class="text-caption text-medium-emphasis">Transaction Type</div>
            <div class="text-body-2 d-flex align-center">
              <span
                class="color-dot mr-2"
                :style="{ backgroundColor: encounter.TransactionType?.color_code || '#cbd5e1' }"
              />
              {{ encounter.TransactionType?.name || '—' }}
            </div>
          </v-col>
          <v-col cols="12" sm="6">
            <div class="text-caption text-medium-emphasis">Staff</div>
            <div class="text-body-2">{{ encounter.Staff?.username || '—' }}</div>
          </v-col>
          <v-col cols="12" sm="6">
            <div class="text-caption text-medium-emphasis">Recorded</div>
            <div class="text-body-2">{{ formatDateTime(encounter.createdAt) }}</div>
          </v-col>
        </v-row>

        <v-divider class="my-3" />

        <!-- Void banner -->
        <v-alert
          v-if="encounter.voided_at"
          type="error"
          variant="tonal"
          density="compact"
          class="mb-4"
        >
          <div class="text-body-2">
            <strong>Voided on:</strong> {{ formatDateTime(encounter.voided_at) }}
          </div>
          <div v-if="encounter.void_reason" class="text-body-2 mt-1">
            <strong>Reason:</strong> {{ encounter.void_reason }}
          </div>
        </v-alert>

        <!-- Clinical Data -->
        <div class="text-subtitle-2 font-weight-bold mb-2">Clinical Data</div>

        <div v-if="fields.length === 0" class="text-caption text-medium-emphasis">
          No structured data recorded for this encounter.
        </div>

        <v-row v-else dense>
          <v-col
            v-for="f in fields"
            :key="f.key"
            cols="12"
            :md="isWideField(f.type) ? 12 : 6"
          >
            <div class="field-block">
              <div class="text-caption text-medium-emphasis font-weight-medium mb-1">
                {{ f.label }}
              </div>
              <div class="text-body-2">
                <!-- multiselect -->
                <template v-if="f.type === 'multiselect'">
                  <v-chip
                    v-for="(opt, i) in f.value"
                    :key="i"
                    size="small"
                    variant="tonal"
                    color="primary"
                    class="mr-1 mb-1"
                  >
                    {{ opt }}
                  </v-chip>
                  <span
                    v-if="!Array.isArray(f.value) || !f.value.length"
                    class="text-medium-emphasis"
                  >
                    —
                  </span>
                </template>

                <!-- boolean -->
                <template v-else-if="f.type === 'boolean'">
                  <v-icon
                    size="16"
                    :color="f.value ? 'success' : 'grey'"
                    class="mr-1"
                  >
                    {{ f.value ? 'mdi-check-circle' : 'mdi-close-circle' }}
                  </v-icon>
                  {{ f.value ? 'Yes' : 'No' }}
                </template>

                <!-- enum -->
                <template v-else-if="f.type === 'enum'">
                  <v-chip size="small" variant="tonal" :color="enumColor(f.value)">
                    {{ f.value || '—' }}
                  </v-chip>
                </template>

                <!-- date -->
                <template v-else-if="f.type === 'date'">
                  {{ f.value ? formatDateTime(f.value) : '—' }}
                </template>

                <!-- text / number / fallback -->
                <template v-else>
                  <span class="preserve-wrap">
                    {{ f.value !== undefined && f.value !== null && f.value !== ''
                      ? f.value : '—' }}
                  </span>
                </template>
              </div>
            </div>
          </v-col>
        </v-row>

        <!-- Raw payload (collapsible) -->
        <v-expansion-panels variant="accordion" class="mt-4">
          <v-expansion-panel>
            <v-expansion-panel-title class="text-caption text-medium-emphasis">
              <v-icon size="16" class="mr-2">mdi-code-json</v-icon>
              Raw payload
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <pre class="raw-json">{{ prettyData }}</pre>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn
          variant="text"
          class="text-none"
          @click="$emit('update:modelValue', false)"
        >
          Close
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  encounter: { type: Object, default: null },
});
defineEmits(['update:modelValue']);

/* ─── Build display list from checklist_schema + data ─── */
const fields = computed(() => {
  const enc = props.encounter;
  if (!enc) return [];

  const schemaFields = enc.TransactionType?.checklist_schema?.fields || [];
  const data = enc.data || {};

  // If there's no schema, fall back to raw keys of `data`
  if (schemaFields.length === 0) {
    return Object.entries(data).map(([key, value]) => ({
      key,
      label: humanize(key),
      type: 'text',
      value,
    }));
  }

  return schemaFields
    .filter((f) => {
      const v = data[f.key];
      if (v === undefined || v === null || v === '') return false;
      if (Array.isArray(v) && v.length === 0) return false;
      return true;
    })
    .map((f) => ({
      key: f.key,
      label: f.label || humanize(f.key),
      type: f.type || 'text',
      value: data[f.key],
    }));
});

const prettyData = computed(() => {
  try {
    return JSON.stringify(props.encounter?.data || {}, null, 2);
  } catch {
    return String(props.encounter?.data || '');
  }
});

/* ─── Helpers ─── */
function isWideField(type) {
  return type === 'textarea' || type === 'multiselect';
}

function humanize(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function enumColor(value) {
  const v = String(value || '').toLowerCase();
  if (v.includes('positive') || v.includes('reactive')) return 'error';
  if (v.includes('negative') || v.includes('non-reactive')) return 'success';
  if (v.includes('inconclusive') || v.includes('invalid')) return 'warning';
  return 'primary';
}
</script>

<style scoped>
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
}
.field-block {
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.015);
  border-radius: 8px;
  height: 100%;
}
.raw-json {
  background: rgba(0, 0, 0, 0.04);
  padding: 12px;
  border-radius: 8px;
  font-size: 0.75rem;
  line-height: 1.35;
  overflow-x: auto;
  max-height: 260px;
  white-space: pre-wrap;
  word-break: break-word;
}
.preserve-wrap {
  white-space: pre-wrap;
  word-break: break-word;
}
</style>