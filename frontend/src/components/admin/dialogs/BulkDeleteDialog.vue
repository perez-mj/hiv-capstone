<!-- frontend/src/components/admin/dialogs/BulkDeleteDialog.vue -->
<template>
  <v-dialog v-model="dialogVisible" max-width="450" persistent>
    <v-card>
      <v-card-title class="bg-error text-white">
        <v-icon start color="white">mdi-delete-sweep</v-icon>
        Bulk Delete
      </v-card-title>

      <v-card-text class="pa-4">
        <div v-if="!progress.show">
          <div class="text-center">
            <v-icon size="64" color="error" class="mb-3">mdi-alert-circle</v-icon>
            <div class="text-subtitle-1 font-weight-medium mb-2">
              Delete {{ count }} {{ count === 1 ? 'record' : 'records' }}?
            </div>
            <div class="text-caption text-medium-emphasis">
              This action cannot be undone.
            </div>
            <div v-if="hasUsers" class="mt-3 pa-2 bg-warning-lighten-5 rounded text-warning-darken-3">
              <v-icon size="small" class="mr-1">mdi-alert</v-icon>
              Warning: Deleting users will also delete their associated patient or staff records
            </div>
          </div>
        </div>

        <div v-else class="text-center">
          <v-progress-circular
            :model-value="(progress.current / progress.total) * 100"
            size="80"
            width="8"
            color="primary"
            class="mb-3"
          >
            {{ Math.round((progress.current / progress.total) * 100) }}%
          </v-progress-circular>
          <div class="text-subtitle-1 font-weight-medium">
            Deleting records...
          </div>
          <div class="text-caption text-medium-emphasis mt-1">
            {{ progress.current }} of {{ progress.total }} completed
          </div>
        </div>
      </v-card-text>

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn v-if="!progress.show" variant="text" @click="close" :disabled="loading">Cancel</v-btn>
        <v-btn color="error" @click="confirmDelete" :loading="loading" :disabled="progress.show">
          Delete {{ count }} Records
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { computed } from 'vue'

export default {
  name: 'BulkDeleteDialog',
  props: {
    show: {
      type: Boolean,
      default: false
    },
    count: {
      type: Number,
      default: 0
    },
    hasUsers: {
      type: Boolean,
      default: false
    },
    loading: {
      type: Boolean,
      default: false
    },
    progress: {
      type: Object,
      default: () => ({ show: false, current: 0, total: 0 })
    }
  },
  emits: ['update:show', 'confirm'],
  setup(props, { emit }) {
    const dialogVisible = computed({
      get: () => props.show,
      set: (val) => emit('update:show', val)
    })

    const close = () => {
      emit('update:show', false)
    }

    const confirmDelete = () => {
      emit('confirm')
    }

    return {
      dialogVisible,
      close,
      confirmDelete
    }
  }
}
</script>