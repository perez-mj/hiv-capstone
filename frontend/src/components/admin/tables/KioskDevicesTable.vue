<!-- frontend/src/components/admin/tables/KioskDevicesTable.vue -->
<template>
  <v-data-table-server 
    :items-per-page="perPage"
    @update:items-per-page="$emit('update:perPage', $event)"
    :page="page"
    @update:page="$emit('update:page', $event)"
    :selected="selectedItems"
    @update:selected="$emit('update:selectedItems', $event)"
    :headers="headers"
    :items="items"
    :items-length="itemsLength"
    :loading="loading"
    show-select 
    @update:options="$emit('update:options', $event)"
    class="elevation-0 devices-table" 
    density="compact" 
    hover
  >
    <template v-slot:loading>
      <v-skeleton-loader type="table-row@10" />
    </template>

    <template v-slot:item.device_id="{ item }">
      <v-chip variant="outlined" size="small">
        <code>{{ item.device_id }}</code>
      </v-chip>
    </template>

    <template v-slot:item.is_authorized="{ item }">
      <v-switch 
        :model-value="item.is_authorized" 
        color="primary" 
        hide-details 
        density="compact"
        :loading="authLoading === item.device_id" 
        @update:model-value="$emit('toggle-auth', item, $event)"
        class="authorization-switch" 
      />
    </template>

    <template v-slot:item.last_seen="{ item }">
      <div class="d-flex flex-column">
        <span class="text-caption">{{ item.last_seen ? formatDateTime(item.last_seen) : 'Never' }}</span>
        <span class="text-caption text-medium-emphasis">{{ item.last_seen ? timeAgo(item.last_seen) : '' }}</span>
      </div>
    </template>

    <template v-slot:item.actions="{ item }">
      <div class="d-flex gap-1">
        <v-btn size="x-small" variant="text" color="primary" icon="mdi-pencil" @click="$emit('edit', item)" title="Edit" />
        <v-btn size="x-small" variant="text" :color="item.is_authorized ? 'warning' : 'success'" :icon="item.is_authorized ? 'mdi-shield-off' : 'mdi-shield'" @click="$emit('toggle-auth', item, !item.is_authorized)" title="Toggle Authorization" />
        <v-btn size="x-small" variant="text" color="error" icon="mdi-delete" @click="$emit('delete', item, 'kiosk_devices')" :style="{ color: 'var(--color-error)' }" title="Delete" />
      </div>
    </template>

    <template v-slot:no-data>
      <div class="text-center py-8">
        <v-icon size="48" color="grey-lighten-2" class="mb-2">mdi-devices-off</v-icon>
        <div class="text-subtitle-2 text-grey">No Kiosk Devices Found</div>
        <div class="text-caption text-grey mt-1">
          Devices register automatically when they access the kiosk display page
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
  authLoading: {
    type: String,
    default: null
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

const emit = defineEmits(['update:page', 'update:perPage', 'update:selectedItems', 'edit', 'toggle-auth', 'delete', 'update:options'])

const headers = computed(() => [
  { title: '', key: 'data-table-select', width: '48' },
  { title: 'ID', key: 'id', width: '80' },
  { title: 'Device ID', key: 'device_id', sortable: true },
  { title: 'Device Name', key: 'device_name', sortable: true },
  { title: 'Authorized', key: 'is_authorized', sortable: true, width: '100' },
  { title: 'Last Seen', key: 'last_seen', sortable: true, width: '140' },
  { title: 'Actions', key: 'actions', sortable: false, align: 'center', width: '140' }
])

const formatDateTime = (dateString) => {
  if (!dateString) return 'Never'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const timeAgo = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now - date) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}
</script>