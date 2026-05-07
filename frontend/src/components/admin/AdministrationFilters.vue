<!-- frontend/src/components/admin/AdministrationFilters.vue -->
<template>
  <v-card elevation="0" border class="mb-4" :style="{
    borderColor: 'var(--color-border)',
    borderRadius: 'var(--radius-md)'
  }">
    <v-card-text class="pa-3">
      <div class="d-flex flex-wrap align-center ga-3">
        <div style="min-width: 200px; flex: 1;">
          <v-text-field 
            :model-value="search"
            @update:model-value="$emit('update:search', $event)"
            density="compact" 
            variant="outlined" 
            placeholder="Search records..."
            prepend-inner-icon="mdi-magnify" 
            hide-details 
            clearable 
            class="compact-field" 
          />
        </div>

        <div v-if="activeTable === 'users'" class="d-flex align-center ga-1" style="flex-wrap: nowrap;">
          <span class="text-caption text-medium-emphasis mr-1" style="white-space: nowrap;">
            Role:
          </span>
          <v-btn-toggle 
            :model-value="filters.role"
            @update:model-value="$emit('update:filters', { ...filters, role: $event })"
            mandatory="false" 
            density="compact" 
            color="primary" 
            variant="outlined"
          >
            <v-btn value="STAFF" size="small">
              <v-icon start size="14">mdi-doctor</v-icon> Staff
            </v-btn>
            <v-btn value="PATIENT" size="small">
              <v-icon start size="14">mdi-account</v-icon> Patient
            </v-btn>
          </v-btn-toggle>
        </div>

        <div v-if="activeTable === 'users'" class="d-flex align-center ga-1" style="flex-wrap: nowrap;">
          <span class="text-caption text-medium-emphasis mr-1" style="white-space: nowrap;">
            Status:
          </span>
          <v-btn-toggle 
            :model-value="filters.status"
            @update:model-value="$emit('update:filters', { ...filters, status: $event })"
            mandatory="false" 
            density="compact" 
            color="primary" 
            variant="outlined"
          >
            <v-btn value="active" size="small">
              <v-icon start size="14">mdi-check-circle</v-icon> Active
            </v-btn>
            <v-btn value="inactive" size="small">
              <v-icon start size="14">mdi-cancel</v-icon> Inactive
            </v-btn>
          </v-btn-toggle>
        </div>

        <div style="min-width: 120px;">
          <v-select 
            :model-value="sortBy"
            @update:model-value="$emit('update:sort-by', $event)"
            density="compact" 
            variant="outlined" 
            :items="sortFields" 
            placeholder="Sort"
            hide-details 
            class="compact-field" 
          />
        </div>

        <v-btn 
          variant="outlined" 
          density="compact" 
          size="small"
          :icon="sortOrder === 'asc' ? 'mdi-sort-ascending' : 'mdi-sort-descending'" 
          @click="$emit('toggle-order')"
          :style="{ borderColor: 'var(--color-border)', minWidth: '36px' }" 
        />

        <v-btn 
          variant="text" 
          color="primary" 
          size="small" 
          prepend-icon="mdi-filter-remove" 
          @click="$emit('clear-filters')"
          :disabled="!hasActiveFilters" 
          :style="{ color: 'var(--color-primary)' }"
        >
          Clear
        </v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
defineProps({
  search: {
    type: String,
    default: ''
  },
  sortBy: {
    type: String,
    default: 'created_at_desc'
  },
  sortOrder: {
    type: String,
    default: 'desc'
  },
  filters: {
    type: Object,
    default: () => ({ role: null, status: null })
  },
  activeTable: {
    type: String,
    required: true
  },
  hasActiveFilters: {
    type: Boolean,
    default: false
  },
  sortFields: {
    type: Array,
    default: () => []
  }
})

defineEmits(['update:search', 'update:sort-by', 'update:sort-order', 'update:filters', 'toggle-order', 'clear-filters'])
</script>

<style scoped>
.ga-3 {
  gap: 16px;
}
</style>