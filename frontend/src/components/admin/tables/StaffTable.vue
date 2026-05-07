<!-- frontend/src/components/admin/tables/StaffTable.vue -->
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

    <template v-slot:item.full_name="{ item }">
      <span class="font-weight-medium">{{ item.first_name }} {{ item.middle_name || '' }} {{ item.last_name }}</span>
    </template>

    <template v-slot:item.user_status="{ item }">
      <v-chip v-if="item.user_id" :color="item.user_active ? 'success' : 'error'" size="x-small" variant="flat">
        {{ item.user_active ? 'User Active' : 'User Inactive' }}
      </v-chip>
      <v-chip v-else color="warning" size="x-small" variant="flat">
        No User Account
      </v-chip>
    </template>

    <template v-slot:item.actions="{ item }">
      <div class="d-flex gap-1">
        <v-btn size="x-small" variant="text" color="primary" icon="mdi-pencil" @click="$emit('edit', item)" title="Edit" />
        <v-btn v-if="!item.user_id" size="x-small" variant="text" color="success" icon="mdi-account-plus" @click="$emit('create-user', item)" title="Create User Account" />
        <v-btn size="x-small" variant="text" color="error" icon="mdi-delete" @click="$emit('delete', item, 'staff')" :style="{ color: 'var(--color-error)' }" title="Delete" />
      </div>
    </template>

    <template v-slot:no-data>
      <div class="text-center py-8">
        <v-icon size="48" color="grey-lighten-2" class="mb-2">mdi-doctor-off</v-icon>
        <div class="text-subtitle-2 text-grey">No Staff Found</div>
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

const emit = defineEmits(['update:page', 'update:perPage', 'update:selectedItems', 'edit', 'create-user', 'delete', 'update:options'])

const headers = computed(() => [
  { title: '', key: 'data-table-select', width: '48' },
  { title: 'ID', key: 'id', width: '80' },
  { title: 'Name', key: 'full_name', sortable: true },
  { title: 'Position', key: 'position' },
  { title: 'Contact', key: 'contact_number' },
  { title: 'User Status', key: 'user_status', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'center', width: '140' }
])
</script>