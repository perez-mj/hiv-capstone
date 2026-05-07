<!-- frontend/src/components/admin/dialogs/DeleteConfirmDialog.vue -->
<template>
  <v-dialog v-model="dialogVisible" max-width="400" persistent>
    <v-card class="delete-dialog">
      <v-card-title class="bg-error text-white">
        <v-icon start color="white">mdi-delete</v-icon>
        Delete {{ title }}
      </v-card-title>

      <v-card-text class="pa-4">
        <div class="text-center">
          <v-icon size="64" color="error" class="mb-3">mdi-alert-circle</v-icon>
          <div class="text-subtitle-1 font-weight-medium mb-2">
            Are you sure you want to delete this {{ title.toLowerCase() }}?
          </div>
          <div class="text-caption text-medium-emphasis">
            This action cannot be undone.
          </div>
          <div v-if="item" class="mt-3 pa-2 bg-grey-lighten-5 rounded">
            <strong>{{ getItemDisplayName() }}</strong>
          </div>
        </div>
      </v-card-text>

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="close" :disabled="loading">Cancel</v-btn>
        <v-btn color="error" @click="confirmDelete" :loading="loading">
          Delete
        </v-btn>
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
  item: {
    type: Object,
    default: null
  },
  table: {
    type: String,
    default: ''
  },
  loading: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: 'Record'
  }
})

const emit = defineEmits(['update:show', 'confirm'])

const dialogVisible = computed({
  get: () => props.show,
  set: (val) => emit('update:show', val)
})

const getItemDisplayName = () => {
  if (!props.item) return ''
  if (props.table === 'users') return props.item.username
  if (props.table === 'staff') return `${props.item.first_name} ${props.item.last_name}`
  if (props.table === 'appointment_types') return props.item.type_name
  if (props.table === 'kiosk_devices') return props.item.device_name || props.item.device_id
  return 'this item'
}

const close = () => {
  emit('update:show', false)
}

const confirmDelete = () => {
  emit('confirm')
}
</script>