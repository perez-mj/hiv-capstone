<!-- frontend/src/components/admin/dialogs/KioskInfoModal.vue -->
<template>
  <v-dialog v-model="dialogVisible" max-width="500" persistent>
    <v-card class="info-dialog">
      <v-card-title class="bg-info text-white">
        <v-icon start color="white">mdi-devices</v-icon>
        Kiosk Device Setup
      </v-card-title>

      <v-card-text class="pa-4">
        <div class="text-center mb-4">
          <v-icon size="48" color="info" class="mb-2">mdi-monitor-dashboard</v-icon>
          <div class="text-subtitle-1 font-weight-medium">Display URL</div>
          <div class="d-flex align-center justify-center mt-2">
            <v-chip class="mr-2">
              <code class="text-caption">{{ displayUrl }}</code>
            </v-chip>
            <v-btn size="small" variant="text" icon="mdi-content-copy" @click="copyUrl" />
          </div>
        </div>

        <v-divider class="my-3" />

        <div class="text-subtitle-2 font-weight-medium mb-3">
          Setup Steps:
        </div>

        <v-timeline density="compact" align="start" side="end">
          <v-timeline-item
            v-for="(step, index) in steps"
            :key="index"
            dot-color="info"
            size="small"
          >
            <div class="text-caption">{{ step }}</div>
          </v-timeline-item>
        </v-timeline>

        <v-alert type="info" variant="tonal" density="compact" class="mt-4">
          <div class="text-caption">
            <strong>Note:</strong> Only authorized devices can register patients and create appointments.
            Always verify the device ID matches the physical device before authorizing.
          </div>
        </v-alert>
      </v-card-text>

      <v-card-actions class="pa-3">
        <v-spacer />
        <v-btn variant="text" @click="close">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  displayUrl: {
    type: String,
    default: ''
  },
  steps: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:show'])

const dialogVisible = computed({
  get: () => props.show,
  set: (val) => emit('update:show', val)
})

const copyUrl = () => {
  navigator.clipboard.writeText(props.displayUrl)
  // You can add a toast notification here if needed
}

const close = () => {
  emit('update:show', false)
}
</script>