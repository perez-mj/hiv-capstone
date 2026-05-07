<!-- frontend/src/components/admin/AdministrationHeader.vue -->
<template>
  <div class="d-flex flex-wrap justify-space-between align-center mb-4">
    <div>
      <h1 class="text-h5 text-md-h4 font-weight-bold" :style="{ color: 'var(--color-primary)' }">
        Administration
      </h1>
      <p class="text-body-2 text-medium-emphasis mt-1">
        Manage lookup tables and reference data
      </p>
    </div>

    <div class="d-flex gap-2 mt-2 mt-sm-0">
      <v-btn 
        v-if="selectedItems.length > 0" 
        variant="outlined" 
        color="error" 
        size="small"
        prepend-icon="mdi-delete-sweep" 
        @click="$emit('bulk-delete')" 
        :loading="bulkDeleting"
        :style="{ borderColor: 'var(--color-error)' }"
      >
        Delete Selected ({{ selectedItems.length }})
      </v-btn>

      <v-btn 
        variant="outlined" 
        size="small" 
        prepend-icon="mdi-refresh" 
        @click="$emit('refresh')" 
        :loading="loading"
        :style="{ borderColor: 'var(--color-border)' }"
      >
        Refresh
      </v-btn>

      <v-btn 
  v-if="activeTable === 'kiosk_devices'" 
  variant="outlined" 
  size="small" 
  prepend-icon="mdi-auto-refresh" 
  @click="$emit('toggle-auto-refresh')"
  :color="isAutoRefreshEnabled ? 'primary' : 'default'"
  :style="{ borderColor: 'var(--color-border)' }"
>
  Auto {{ isAutoRefreshEnabled ? 'ON' : 'OFF' }}
</v-btn>

      <v-btn 
        color="primary" 
        size="small" 
        prepend-icon="mdi-plus" 
        @click="$emit('new-record')"
        :style="{ backgroundColor: 'var(--color-primary)', color: 'white' }"
      >
        New Record
      </v-btn>
    </div>
  </div>
</template>

<script setup>
defineProps({
  selectedItems: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  bulkDeleting: {
    type: Boolean,
    default: false
  }
})

defineEmits(['refresh', 'new-record', 'bulk-delete'])
</script>

<style scoped>
.gap-2 {
  gap: 8px;
}
</style>