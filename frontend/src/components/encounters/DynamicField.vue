<!-- frontend/src/components/encounters/DynamicField.vue -->
<template>
  <!-- text -->
  <v-text-field
    v-if="field.type === 'text'"
    :model-value="modelValue"
    :label="label"
    :rules="rules"
    :maxlength="field.maxLength || undefined"
    variant="outlined"
    @update:model-value="$emit('update:modelValue', $event)"
  />

  <!-- number -->
  <v-text-field
    v-else-if="field.type === 'number'"
    :model-value="modelValue"
    :label="label"
    :rules="[...rules, numberRangeRule]"
    type="number"
    variant="outlined"
    @update:model-value="onNumberInput"
  />

  <!-- textarea -->
  <v-textarea
    v-else-if="field.type === 'textarea'"
    :model-value="modelValue"
    :label="label"
    :rules="rules"
    :maxlength="field.maxLength || undefined"
    variant="outlined"
    rows="3"
    auto-grow
    @update:model-value="$emit('update:modelValue', $event)"
  />

  <!-- enum (single select) -->
  <v-select
    v-else-if="field.type === 'enum'"
    :model-value="modelValue"
    :items="field.options || []"
    :label="label"
    :rules="rules"
    variant="outlined"
    clearable
    @update:model-value="$emit('update:modelValue', $event)"
  />

  <!-- multiselect -->
  <v-select
    v-else-if="field.type === 'multiselect'"
    :model-value="modelValue"
    :items="field.options || []"
    :label="label"
    :rules="rules"
    variant="outlined"
    multiple
    chips
    closable-chips
    @update:model-value="$emit('update:modelValue', $event)"
  />

  <!-- boolean -->
  <v-switch
    v-else-if="field.type === 'boolean'"
    :model-value="modelValue"
    :label="label"
    color="primary"
    inset
    hide-details
    @update:model-value="$emit('update:modelValue', $event)"
  />

  <!-- date -->
  <v-text-field
    v-else-if="field.type === 'date'"
    :model-value="modelValue"
    :label="label"
    :rules="rules"
    type="datetime-local"
    variant="outlined"
    @update:model-value="$emit('update:modelValue', $event)"
  />

  <!-- unknown type: show a muted fallback -->
  <v-text-field
    v-else
    :model-value="modelValue"
    :label="`${label} (unsupported type: ${field.type})`"
    variant="outlined"
    disabled
  />
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  field: { type: Object, required: true },
  modelValue: { type: [String, Number, Boolean, Array, null], default: null },
});
defineEmits(['update:modelValue']);

const label = computed(() => props.field.required ? `${props.field.label} *` : props.field.label);

const rules = computed(() => {
  if (!props.field.required) return [];
  const f = props.field;
  switch (f.type) {
    case 'multiselect':
      return [(v) => (Array.isArray(v) && v.length > 0) || `${f.label} is required`];
    case 'boolean':
      return [(v) => v === true || `${f.label} must be checked`];
    case 'number':
      return [(v) => (v !== '' && v !== null && v !== undefined) || `${f.label} is required`];
    default:
      return [(v) => (v !== '' && v !== null && v !== undefined) || `${f.label} is required`];
  }
});

const numberRangeRule = (v) => {
  if (v === '' || v === null || v === undefined) return true;
  const n = Number(v);
  if (Number.isNaN(n)) return 'Must be a number';
  if (props.field.min !== undefined && n < props.field.min) return `Minimum is ${props.field.min}`;
  if (props.field.max !== undefined && n > props.field.max) return `Maximum is ${props.field.max}`;
  return true;
};

function onNumberInput(value) {
  // emit as number when possible, else raw string
  if (value === '' || value === null || value === undefined) {
    return;
  }
  const n = Number(value);
  // Emit raw so the field doesn't fight user typing, but keep numeric when clean
  if (!Number.isNaN(n) && String(n) === String(value)) {
    return;
  }
}
</script>