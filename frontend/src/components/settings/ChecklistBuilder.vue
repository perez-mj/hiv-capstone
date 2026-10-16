<!-- frontend/src/components/settings/ChecklistBuilder.vue -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="900"
    persistent
    scrollable
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="checklist-dialog">
      <!-- Header -->
      <div class="dialog-header">
        <div class="d-flex align-center">
          <v-avatar size="40" color="primary" variant="tonal" class="mr-3">
            <v-icon>mdi-format-list-checks</v-icon>
          </v-avatar>
          <div>
            <h3 class="text-h6 font-weight-bold mb-0">Checklist — {{ transactionType?.name }}</h3>
            <p class="text-caption text-medium-emphasis mb-0">
              Define the fields staff will fill in for this transaction type.
              <span v-if="transactionType?.schema_version" class="ml-1">
                (current v{{ transactionType.schema_version }})
              </span>
            </p>
          </div>
        </div>
        <v-btn icon="mdi-close" variant="text" size="small" :disabled="saving" @click="close" />
      </div>

      <v-divider />

      <v-card-text class="pa-6">
        <!-- Empty state -->
        <div v-if="fields.length === 0" class="empty-state mb-4">
          <v-icon size="48" color="grey-lighten-1">mdi-playlist-plus</v-icon>
          <div class="text-body-2 text-medium-emphasis mt-2">
            No fields yet. Add the first one below.
          </div>
        </div>

        <!-- Field rows -->
        <v-card
          v-for="(field, i) in fields"
          :key="field._uid"
          variant="outlined"
          class="field-card mb-3"
        >
          <v-card-text class="pa-4">
            <div class="d-flex align-center justify-space-between mb-3">
              <div class="d-flex align-center">
                <v-icon size="18" color="medium-emphasis" class="mr-2">mdi-drag-vertical</v-icon>
                <span class="text-caption text-medium-emphasis">
                  Field {{ i + 1 }}<span v-if="field.key"> · <code>{{ field.key }}</code></span>
                </span>
              </div>
              <div class="d-flex ga-1">
                <v-btn
                  icon="mdi-arrow-up"
                  size="x-small"
                  variant="text"
                  :disabled="i === 0"
                  @click="move(i, -1)"
                />
                <v-btn
                  icon="mdi-arrow-down"
                  size="x-small"
                  variant="text"
                  :disabled="i === fields.length - 1"
                  @click="move(i, 1)"
                />
                <v-btn
                  icon="mdi-delete-outline"
                  size="x-small"
                  variant="text"
                  color="error"
                  @click="removeField(i)"
                />
              </div>
            </div>

            <v-row dense>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="field.key"
                  label="Key *"
                  placeholder="e.g. hiv_result"
                  variant="outlined"
                  density="comfortable"
                  hide-details="auto"
                  :rules="[keyRule]"
                  @update:model-value="normalizeKey(field)"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="field.label"
                  label="Label *"
                  placeholder="e.g. HIV Test Result"
                  variant="outlined"
                  density="comfortable"
                  hide-details="auto"
                  :rules="[v => !!v || 'Label is required']"
                />
              </v-col>

              <v-col cols="12" sm="4">
                <v-select
                  v-model="field.type"
                  :items="typeOptions"
                  item-title="text"
                  item-value="value"
                  label="Type *"
                  variant="outlined"
                  density="comfortable"
                  hide-details="auto"
                />
              </v-col>

              <v-col cols="12" sm="4">
                <v-text-field
                  v-model.number="field.maxLength"
                  label="Max length"
                  type="number"
                  variant="outlined"
                  density="comfortable"
                  hide-details="auto"
                  :disabled="!['text', 'textarea'].includes(field.type)"
                />
              </v-col>

              <v-col cols="12" sm="4" class="d-flex align-center">
                <v-switch
                  v-model="field.required"
                  color="primary"
                  hide-details
                  inset
                  density="comfortable"
                  label="Required"
                />
              </v-col>

              <!-- Options for enum / multiselect -->
              <v-col
                v-if="['enum', 'multiselect'].includes(field.type)"
                cols="12"
              >
                <v-combobox
                  v-model="field.options"
                  label="Options *"
                  hint="Type a value and press Enter to add"
                  variant="outlined"
                  density="comfortable"
                  multiple
                  chips
                  closable-chips
                  persistent-hint
                  :rules="[v => (v && v.length > 0) || 'At least one option is required']"
                />
              </v-col>

              <!-- Number min/max -->
              <template v-if="field.type === 'number'">
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model.number="field.min"
                    label="Min"
                    type="number"
                    variant="outlined"
                    density="comfortable"
                    hide-details
                  />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model.number="field.max"
                    label="Max"
                    type="number"
                    variant="outlined"
                    density="comfortable"
                    hide-details
                  />
                </v-col>
              </template>
            </v-row>
          </v-card-text>
        </v-card>

        <v-btn
          variant="tonal"
          color="primary"
          prepend-icon="mdi-plus"
          class="text-none"
          @click="addField"
        >
          Add field
        </v-btn>

        <!-- Error surface -->
        <v-alert
          v-if="serverError"
          type="error"
          variant="tonal"
          density="compact"
          class="mt-4"
          closable
          @click:close="serverError = ''"
        >
          {{ serverError }}
        </v-alert>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" class="text-none" :disabled="saving" @click="close">Cancel</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          class="text-none"
          :loading="saving"
          :disabled="!isValid"
          @click="save"
        >
          Save Checklist
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import transactionTypeService from '@/services/transactionTypeService';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  transactionType: { type: Object, default: null },
});
const emit = defineEmits(['update:modelValue', 'saved']);

/* ─────────────── State ─────────────── */
const fields = ref([]);
const saving = ref(false);
const serverError = ref('');

let uidCounter = 0;
const nextUid = () => `f_${Date.now()}_${uidCounter++}`;

const typeOptions = [
  { text: 'Text',         value: 'text' },
  { text: 'Text Area',    value: 'textarea' },
  { text: 'Number',       value: 'number' },
  { text: 'Boolean',      value: 'boolean' },
  { text: 'Select',       value: 'enum' },
  { text: 'Multi-select', value: 'multiselect' },
  { text: 'Date',         value: 'date' },
];

/* ─────────────── Validation ─────────────── */
const keyRule = (v) => {
  if (!v) return 'Key is required';
  if (!/^[a-z][a-z0-9_]*$/.test(v)) {
    return 'Lowercase letters, digits, underscore; must start with a letter';
  }
  const dupes = fields.value.filter(f => f.key === v);
  if (dupes.length > 1) return 'Key must be unique';
  return true;
};

const isValid = computed(() => {
  if (fields.value.length === 0) return true;
  const keys = new Set();
  for (const f of fields.value) {
    if (!f.key || !f.label || !f.type) return false;
    if (!/^[a-z][a-z0-9_]*$/.test(f.key)) return false;
    if (keys.has(f.key)) return false;
    keys.add(f.key);
    if (['enum', 'multiselect'].includes(f.type)) {
      if (!Array.isArray(f.options) || f.options.length === 0) return false;
    }
  }
  return true;
});

/* ─────────────── Field helpers ─────────────── */
function normalizeKey(field) {
  field.key = (field.key || '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/^[^a-z]+/, '');
}

function addField() {
  fields.value.push({
    _uid: nextUid(),
    key: '',
    label: '',
    type: 'text',
    required: false,
    options: [],
    maxLength: undefined,
    min: undefined,
    max: undefined,
  });
}

function removeField(i) {
  fields.value.splice(i, 1);
}

function move(i, delta) {
  const j = i + delta;
  if (j < 0 || j >= fields.value.length) return;
  const [item] = fields.value.splice(i, 1);
  fields.value.splice(j, 0, item);
}

/* ─────────────── Load / save ─────────────── */
function loadFromProp() {
  const raw = props.transactionType?.checklist_schema?.fields || [];
  fields.value = raw.map(f => ({ _uid: nextUid(), ...f }));
  serverError.value = '';
}

watch(
  () => [props.modelValue, props.transactionType?.id],
  ([open]) => {
    if (open) loadFromProp();
  },
  { immediate: true }
);

function close() {
  if (saving.value) return;
  emit('update:modelValue', false);
}

function serialize(field) {
  const out = {
    key: field.key,
    label: field.label,
    type: field.type,
    required: !!field.required,
  };
  if (['enum', 'multiselect'].includes(field.type)) out.options = field.options || [];
  if (field.type === 'number') {
    if (field.min !== undefined && field.min !== null && field.min !== '') out.min = field.min;
    if (field.max !== undefined && field.max !== null && field.max !== '') out.max = field.max;
  }
  if (['text', 'textarea'].includes(field.type) && field.maxLength) out.maxLength = field.maxLength;
  return out;
}

async function save() {
  if (!isValid.value || saving.value) return;
  saving.value = true;
  serverError.value = '';
  try {
    const payload = fields.value.map(serialize);
    const updated = await transactionTypeService.updateChecklist(props.transactionType.id, payload);
    emit('saved', updated);
    emit('update:modelValue', false);
  } catch (e) {
    console.error('Save checklist error:', e);
    const details = e.response?.data?.details;
    serverError.value =
      e.response?.data?.error ||
      (Array.isArray(details) ? details.map(d => d.message).join('; ') : null) ||
      'Failed to save checklist';
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.checklist-dialog {
  border-radius: 16px;
  overflow: hidden;
}
.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
}
.field-card {
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.01);
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px;
  border: 1px dashed rgba(0, 0, 0, 0.12);
  border-radius: 10px;
}
code {
  font-size: 0.75rem;
  color: rgb(var(--v-theme-primary));
}
</style>