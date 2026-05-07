<!-- frontend/src/components/admin/tables/UsersTable.vue -->
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

    <template v-slot:item.role="{ item }">
      <v-chip :color="getRoleColor(item.role)" size="x-small" variant="flat" class="font-weight-medium">
        {{ item.role }}
      </v-chip>
    </template>

    <template v-slot:item.is_active="{ item }">
      <v-chip :color="item.is_active ? 'success' : 'error'" size="x-small" variant="flat" class="font-weight-medium">
        {{ item.is_active ? 'Active' : 'Inactive' }}
      </v-chip>
    </template>

    <template v-slot:item.last_login="{ item }">
      <div class="d-flex flex-column">
        <span class="text-caption">{{ item.last_login ? formatDateTime(item.last_login) : 'Never' }}</span>
        <span class="text-caption text-medium-emphasis">{{ item.last_login ? timeAgo(item.last_login) : '' }}</span>
      </div>
    </template>

    <template v-slot:item.actions="{ item }">
      <div class="d-flex gap-1">
        <v-btn size="x-small" variant="text" color="primary" icon="mdi-pencil" @click="$emit('edit', item)" title="Edit" />
        <v-btn size="x-small" variant="text" color="warning" icon="mdi-lock-reset" @click="$emit('reset-password', item)" title="Reset Password" />
        <v-btn size="x-small" variant="text" color="error" icon="mdi-delete" @click="$emit('delete', item, 'users')" :style="{ color: 'var(--color-error)' }" title="Delete" />
      </div>
    </template>

    <template v-slot:no-data>
      <div class="text-center py-8">
        <v-icon size="48" color="grey-lighten-2" class="mb-2">mdi-account-off</v-icon>
        <div class="text-subtitle-2 text-grey">No Users Found</div>
        <div class="text-caption text-grey mt-1">
          User accounts are created automatically when you create a Patient or Staff member
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

const emit = defineEmits(['update:page', 'update:perPage', 'update:selectedItems', 'edit', 'reset-password', 'delete', 'update:options'])

const headers = computed(() => [
  { title: '', key: 'data-table-select', width: '48' },
  { title: 'ID', key: 'id', width: '80' },
  { title: 'Username', key: 'username', sortable: true },
  { title: 'Email', key: 'email' },
  { title: 'Role', key: 'role', sortable: true, width: '100' },
  { title: 'Status', key: 'is_active', sortable: true, width: '100' },
  { title: 'Last Login', key: 'last_login', sortable: true, width: '140' },
  { title: 'Actions', key: 'actions', sortable: false, align: 'center', width: '140' }
])

const getRoleColor = (role) => {
  const colors = {
    ADMIN: 'error',
    NURSE: 'warning',
    PATIENT: 'success'
  }
  return colors[role] || 'primary'
}

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