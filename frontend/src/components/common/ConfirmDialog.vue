<!-- frontend/src/components/common/ConfirmDialog.vue -->
<template>
  <v-dialog v-model="model" :max-width="maxWidth" persistent>
    <v-card class="dialog-card">
      <v-card-text class="pa-6 text-center">
        <v-avatar
          size="56"
          :color="color"
          variant="tonal"
          class="mb-4"
        >
          <v-icon size="28">{{ icon }}</v-icon>
        </v-avatar>

        <h3 class="text-h6 font-weight-bold mb-2">{{ title }}</h3>

        <p class="text-body-2 text-medium-emphasis mb-0">
          <slot>
            {{ message }}
          </slot>
        </p>
      </v-card-text>

      <v-card-actions class="pa-4 pt-0">
        <v-btn
          variant="text"
          class="text-none flex-grow-1"
          :disabled="loading"
          @click="onCancel"
        >
          {{ cancelText }}
        </v-btn>
        <v-btn
          :color="color"
          variant="flat"
          class="text-none flex-grow-1"
          :loading="loading"
          @click="onConfirm"
        >
          {{ confirmText }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: 'Are you sure?' },
  message: { type: String, default: '' },
  confirmText: { type: String, default: 'Confirm' },
  cancelText: { type: String, default: 'Cancel' },
  color: { type: String, default: 'primary' },
  icon: { type: String, default: 'mdi-alert-outline' },
  maxWidth: { type: [Number, String], default: 440 },
  loading: { type: Boolean, default: false }
});

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel']);

const model = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

function onConfirm() {
  emit('confirm');
}

function onCancel() {
  emit('update:modelValue', false);
  emit('cancel');
}
</script>

<style scoped>
.dialog-card {
  border-radius: 16px;
  overflow: hidden;
}
</style>