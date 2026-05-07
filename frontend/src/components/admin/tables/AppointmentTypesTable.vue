<!-- frontend/src/components/admin/tables/AppointmentTypesTable.vue -->
<template>
  <v-data-table-server 
    :items-per-page="perPage"
    @update:items-per-page="$emit('update:perPage', $event)"
    :page="page"
    @update:page="$emit('update:page', $event)"
    :items-length="itemsLength"
    :loading="loading"
    :headers="headers"
    :items="items"
    show-select
    :model-value="selectedItems"
    @update:model-value="$emit('update:selectedItems', $event)"
    @update:options="$emit('update:options', $event)"
    class="elevation-0 devices-table" 
    density="compact" 
    hover
  >
    <template v-slot:loading>
      <v-skeleton-loader type="table-row@10" />
    </template>

    <template v-slot:item.is_active="{ item }">
      <v-chip :color="item.is_active ? 'success' : 'error'" size="x-small" variant="flat" class="font-weight-medium">
        {{ item.is_active ? 'Active' : 'Inactive' }}
      </v-chip>
    </template>

    <template v-slot:item.duration_minutes="{ item }">
      <v-chip variant="outlined" size="small">
        {{ item.duration_minutes }} mins
      </v-chip>
    </template>

    <template v-slot:item.created_at="{ item }">
      <span class="text-caption">{{ formatDate(item.created_at) }}</span>
    </template>

    <template v-slot:item.actions="{ item }">
      <div class="d-flex gap-1">
        <v-btn size="x-small" variant="text" color="primary" icon="mdi-pencil" @click="$emit('edit', item)" title="Edit" />
        <v-btn size="x-small" variant="text" color="error" icon="mdi-delete" @click="$emit('delete', item, 'appointment_types')" title="Delete" />
      </div>
    </template>

    <template v-slot:no-data>
      <div class="text-center py-8">
        <v-icon size="48" color="grey-lighten-2" class="mb-2">mdi-calendar-remove</v-icon>
        <div class="text-subtitle-2 text-grey">No Appointment Types Found</div>
        <div class="text-caption text-grey mt-1">
          Click "New Record" to create one
        </div>
      </div>
    </template>
  </v-data-table-server>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  },
  itemsLength: {
    type: Number,
    default: 0
  },
  loading: {
    type: Boolean,
    default: false
  },
  page: {
    type: Number,
    default: 1
  },
  perPage: {
    type: Number,
    default: 10
  },
  selectedItems: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:page', 'update:perPage', 'update:selectedItems', 'edit', 'delete', 'update:options'])

const headers = computed(() => [
  { title: 'ID', key: 'id', sortable: true, width: '80' },
  { title: 'Type Name', key: 'type_name', sortable: true },
  { title: 'Description', key: 'description' },
  { title: 'Duration', key: 'duration_minutes', sortable: true },
  { title: 'Status', key: 'is_active', sortable: true, width: '100' },
  { title: 'Created', key: 'created_at', sortable: true, width: '100' },
  { title: 'Actions', key: 'actions', sortable: false, align: 'center', width: '100' }
])

const formatDate = (dateString) => {
  if (!dateString) return 'Never'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}
</script>