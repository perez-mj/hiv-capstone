<!-- frontend/src/pages/admin/KioskDevices.vue -->
<template>
  <v-container fluid class="pa-4 pa-md-6">
    <!-- Header Section -->
    <div class="d-flex flex-wrap justify-space-between align-center mb-4">
      <div>
        <h1 class="text-h5 text-md-h4 font-weight-bold" :style="{ color: 'var(--color-primary)' }">
          Kiosk Device Management
        </h1>
        <p class="text-body-2 text-medium-emphasis mt-1">
          Monitor and manage all connected kiosk devices
        </p>
      </div>

      <div class="d-flex gap-2 mt-2 mt-sm-0">
        <!-- Last Updated Badge -->
        <v-chip
          v-if="lastUpdated"
          variant="outlined"
          size="small"
          prepend-icon="mdi-clock-outline"
          :style="{ borderColor: 'var(--color-border)' }"
        >
          Updated {{ timeAgo(lastUpdated) }}
        </v-chip>

        <!-- Refresh Button -->
        <v-btn 
          variant="outlined" 
          size="small" 
          prepend-icon="mdi-refresh" 
          @click="fetchDevices"
          :loading="loading"
          :style="{ borderColor: 'var(--color-border)' }"
        >
          Refresh
        </v-btn>
        
        <!-- Delete All Button (only shown when devices exist) -->
        <v-btn 
          v-if="devices.length > 0"
          color="error" 
          size="small" 
          prepend-icon="mdi-delete-sweep" 
          @click="confirmDeleteAll"
          :style="{ 
            backgroundColor: 'var(--color-error)', 
            color: 'white' 
          }"
        >
          Delete All
        </v-btn>
      </div>
    </div>

    <!-- Enhanced Stats Cards -->
    <v-row class="mb-4">
      <v-col v-for="stat in deviceStats" :key="stat.label" cols="6" sm="3" md="3" lg="3">
        <v-card 
          elevation="0" 
          border 
          class="stat-card"
          :style="{ 
            borderColor: 'var(--color-border)', 
            borderRadius: 'var(--radius-md)' 
          }"
        >
          <v-card-text class="pa-3 d-flex align-center">
            <v-avatar 
              size="40" 
              :color="stat.color" 
              class="mr-3"
              :style="{ backgroundColor: `var(--color-${stat.color})` }"
            >
              <v-icon :icon="stat.icon" size="24" color="white"></v-icon>
            </v-avatar>
            <div>
              <div class="text-h6 font-weight-bold">{{ stat.value }}</div>
              <div class="text-caption text-medium-emphasis">{{ stat.label }}</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Search and Filters -->
    <v-card 
      elevation="0" 
      border 
      class="mb-4"
      :style="{ 
        borderColor: 'var(--color-border)', 
        borderRadius: 'var(--radius-md)' 
      }"
    >
      <v-card-text class="pa-3">
        <div class="d-flex flex-wrap align-center ga-3">
          <!-- Search -->
          <div style="min-width: 250px; flex: 1;">
            <v-text-field 
              v-model="search" 
              density="compact" 
              variant="outlined"
              placeholder="Search by name or device ID..." 
              prepend-inner-icon="mdi-magnify" 
              hide-details 
              clearable
              @update:model-value="handleSearch"
              class="compact-field"
            />
          </div>

          <!-- Status Filter -->
          <div class="d-flex align-center ga-1" style="flex-wrap: nowrap;">
            <span class="text-caption text-medium-emphasis mr-1" style="white-space: nowrap;">
              Status:
            </span>
            <v-btn-toggle
              v-model="filters.status"
              mandatory="false"
              density="compact"
              color="primary"
              variant="outlined"
              @update:model-value="handleFilterChange"
            >
              <v-btn value="online" size="small">
                <v-icon start size="14">mdi-wifi</v-icon> Online
              </v-btn>
              <v-btn value="offline" size="small">
                <v-icon start size="14">mdi-wifi-off</v-icon> Offline
              </v-btn>
            </v-btn-toggle>
          </div>

          <!-- Authorization Filter -->
          <div class="d-flex align-center ga-1" style="flex-wrap: nowrap;">
            <span class="text-caption text-medium-emphasis mr-1" style="white-space: nowrap;">
              Auth:
            </span>
            <v-btn-toggle
              v-model="filters.authorized"
              mandatory="false"
              density="compact"
              color="primary"
              variant="outlined"
              @update:model-value="handleFilterChange"
            >
              <v-btn :value="true" size="small">
                <v-icon start size="14">mdi-check-circle</v-icon> Authorized
              </v-btn>
              <v-btn :value="false" size="small">
                <v-icon start size="14">mdi-clock-outline</v-icon> Pending
              </v-btn>
            </v-btn-toggle>
          </div>

          <!-- Clear Filters -->
          <v-btn 
            variant="text" 
            color="primary" 
            size="small" 
            prepend-icon="mdi-filter-remove" 
            @click="clearFilters"
            :disabled="!hasActiveFilters" 
            :style="{ color: 'var(--color-primary)' }" 
          >
            Clear
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- Main Table Card -->
    <v-card 
      elevation="0" 
      border 
      :style="{ 
        borderColor: 'var(--color-border)', 
        borderRadius: 'var(--radius-md)' 
      }"
    >
      <v-card-title class="d-flex justify-space-between align-center py-3 px-4">
        <span class="text-subtitle-1 font-weight-medium">Connected Devices</span>
        <span class="text-caption text-medium-emphasis">
          Showing {{ paginationStart }} to {{ paginationEnd }} of {{ filteredDevices.length }}
        </span>
      </v-card-title>

      <v-divider :style="{ borderColor: 'var(--color-divider)' }" />

      <v-card-text class="pa-0">
        <v-data-table-server 
          v-model:items-per-page="perPage" 
          v-model:page="page" 
          :headers="tableHeaders" 
          :items="paginatedDevices"
          :items-length="filteredDevices.length" 
          :loading="loading" 
          @update:options="handleTableSort"
          class="elevation-0 devices-table" 
          density="compact" 
          hover
        >
          <!-- Loading State -->
          <template v-slot:loading>
            <v-skeleton-loader type="table-row@10" />
          </template>

          <!-- Status Column -->
          <template v-slot:item.status="{ item }">
            <div class="d-flex align-center">
              <v-icon 
                :icon="getDeviceStatus(item).icon" 
                :color="getDeviceStatus(item).color"
                size="16"
                class="mr-1"
              />
              <v-chip 
                :color="getDeviceStatus(item).color" 
                size="x-small" 
                variant="flat"
                class="font-weight-medium"
              >
                {{ getDeviceStatus(item).text }}
              </v-chip>
            </div>
          </template>

          <!-- Device Name Column with inline edit -->
          <template v-slot:item.device_name="{ item }">
            <div v-if="editingDeviceId !== item.id" class="d-flex align-center">
              <span class="font-weight-medium">{{ item.device_name }}</span>
              <v-btn
                icon="mdi-pencil"
                size="x-small"
                variant="text"
                color="primary"
                class="ml-1 edit-hover-btn"
                @click="startEdit(item)"
                title="Edit name"
              />
            </div>
            <div v-else class="d-flex align-center" style="min-width: 200px">
              <v-text-field
                v-model="editForm.device_name"
                density="compact"
                variant="outlined"
                hide-details
                @keyup.enter="saveDeviceName(item)"
                @keyup.esc="cancelEdit"
                ref="editInput"
                autofocus
                class="compact-field"
              />
              <v-btn
                icon="mdi-check"
                color="success"
                size="x-small"
                variant="text"
                class="ml-1"
                @click="saveDeviceName(item)"
                title="Save"
              />
              <v-btn
                icon="mdi-close"
                color="error"
                size="x-small"
                variant="text"
                @click="cancelEdit"
                title="Cancel"
              />
            </div>
          </template>

          <!-- Device ID Column -->
          <template v-slot:item.device_id="{ item }">
          <v-chip variant="outlined" size="small">
            <code>{{ item.device_id }}</code>
          </v-chip>
        </template>

          <!-- Last Seen Column -->
          <template v-slot:item.last_seen="{ item }">
            <div class="d-flex flex-column">
              <span class="text-caption">{{ formatDateTime(item.last_seen) }}</span>
              <span class="text-caption text-medium-emphasis">{{ timeAgo(item.last_seen) }}</span>
            </div>
          </template>

          <!-- Registered Column -->
          <template v-slot:item.created_at="{ item }">
            <span class="text-caption">{{ formatDate(item.created_at) }}</span>
          </template>

          <!-- Authorization Column -->
          <template v-slot:item.is_authorized="{ item }">
            <v-switch
              :model-value="item.is_authorized"
              color="primary"
              hide-details
              density="compact"
              :loading="authLoading === item.device_id"
              @update:model-value="toggleAuthorization(item, $event)"
              class="authorization-switch"
            />
          </template>

          <!-- Actions Column -->
          <template v-slot:item.actions="{ item }">
            <div class="d-flex gap-1">
              <v-btn 
                size="x-small" 
                variant="text" 
                color="error" 
                icon="mdi-delete" 
                @click="confirmDelete(item)"
                :style="{ color: 'var(--color-error)' }" 
                title="Delete device"
              />
            </div>
          </template>

          <!-- Empty State -->
          <template v-slot:no-data>
            <div class="text-center py-8">
              <v-icon size="48" color="grey-lighten-2" class="mb-2">mdi-cellphone-off</v-icon>
              <div class="text-subtitle-2 text-grey">No Devices Found</div>
              <div class="text-caption text-grey mt-1">
                {{ hasActiveFilters ? 'Try adjusting your filters' : 'No devices available' }}
              </div>
            </div>
          </template>
        </v-data-table-server>
      </v-card-text>
    </v-card>

    <!-- Delete Single Device Confirmation Dialog -->
    <v-dialog v-model="showDeleteModal" max-width="360" persistent>
      <v-card class="delete-dialog">
        <v-card-title class="text-subtitle-1 font-weight-bold pa-3 bg-error-lighten-5">
          <v-icon color="error" size="small" class="mr-2">mdi-delete</v-icon>
          Delete Device
        </v-card-title>
        
        <v-card-text class="pa-3">
          <p class="text-body-2 mb-0">
            Are you sure you want to delete device: 
            <span class="font-weight-bold">{{ deviceToDelete?.device_id }}</span>?
          </p>
        </v-card-text>
        
        <v-card-actions class="pa-3 pt-0">
          <v-spacer />
          <v-btn 
            variant="text" 
            color="grey-darken-1" 
            @click="closeDeleteModal"
            :disabled="deleteLoading"
            size="small"
          >
            Cancel
          </v-btn>
          <v-btn 
            color="error" 
            variant="elevated" 
            @click="deleteDevice"
            :loading="deleteLoading"
            prepend-icon="mdi-delete"
            size="small"
          >
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete All Devices Confirmation Dialog -->
    <v-dialog v-model="showDeleteAllModal" max-width="360" persistent>
      <v-card class="delete-dialog">
        <v-card-title class="text-subtitle-1 font-weight-bold pa-3 bg-error-lighten-5">
          <v-icon color="error" size="small" class="mr-2">mdi-delete-sweep</v-icon>
          Delete All Devices
        </v-card-title>
        
        <v-card-text class="pa-3">
          <p class="text-body-2 mb-0">
            Are you sure you want to delete all 
            <span class="font-weight-bold">{{ devices.length }}</span> devices?
          </p>
        </v-card-text>
        
        <v-card-actions class="pa-3 pt-0">
          <v-spacer />
          <v-btn 
            variant="text" 
            color="grey-darken-1" 
            @click="closeDeleteAllModal"
            :disabled="deleteAllLoading"
            size="small"
          >
            Cancel
          </v-btn>
          <v-btn 
            color="error" 
            variant="elevated" 
            @click="deleteAllDevices"
            :loading="deleteAllLoading"
            prepend-icon="mdi-delete-sweep"
            size="small"
          >
            Delete All
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Toast Notifications -->
    <div class="toast-container">
      <transition-group name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast"
          :class="`toast-${toast.type}`"
          @click="removeToast(toast.id)"
        >
          <div class="toast-content">
            <v-icon :icon="toast.icon" size="20" class="mr-2" />
            <span>{{ toast.message }}</span>
          </div>
          <div 
            class="toast-progress" 
            :style="{ animationDuration: `${toast.duration}ms` }" 
          />
        </div>
      </transition-group>
    </div>
  </v-container>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick, onUnmounted } from 'vue'
import { kioskApi } from '@/api'
import debounce from 'lodash/debounce'

// Toast system
const toasts = ref([])
let toastId = 0

function showToast(message, type = 'success', duration = 3000) {
  const id = toastId++
  const icon = {
    success: 'mdi-check-circle',
    error: 'mdi-alert-circle',
    warning: 'mdi-alert',
    info: 'mdi-information'
  }[type] || 'mdi-information'
  
  toasts.value.push({
    id,
    message,
    type,
    icon,
    duration
  })
  
  setTimeout(() => {
    removeToast(id)
  }, duration)
}

function removeToast(id) {
  const index = toasts.value.findIndex(t => t.id === id)
  if (index !== -1) {
    toasts.value.splice(index, 1)
  }
}

// State
const loading = ref(false)
const authLoading = ref(null)
const deleteLoading = ref(false)
const deleteAllLoading = ref(false)
const devices = ref([])
const showDeleteModal = ref(false)
const showDeleteAllModal = ref(false)
const deviceToDelete = ref(null)
const editingDeviceId = ref(null)
const editInput = ref(null)
const search = ref('')
const filters = ref({
  status: null,
  authorized: null
})
const page = ref(1)
const perPage = ref(10)
const sortBy = ref('last_seen_desc')
const sortOrder = ref('desc')
const lastUpdated = ref(null)
let statusUpdateInterval = null

const editForm = reactive({
  device_name: ''
})

// Table headers
const tableHeaders = [
  { title: 'Status', key: 'status', sortable: false, width: '100' },
  { title: 'Device Name', key: 'device_name', sortable: true },
  { title: 'Device ID', key: 'device_id', sortable: true },
  { title: 'Last Seen', key: 'last_seen', sortable: true, width: '140' },
  { title: 'Registered', key: 'created_at', sortable: true, width: '100' },
  { title: 'Auth', key: 'is_authorized', sortable: true, align: 'center', width: '80' },
  { title: 'Actions', key: 'actions', sortable: false, align: 'center', width: '60' }
]

// Device status calculation
const getDeviceStatus = (device) => {
  if (!device.last_seen) {
    return { text: 'Pending', color: 'warning', icon: 'mdi-timer-sand' }
  }
  
  const lastSeen = new Date(device.last_seen)
  const now = new Date()
  const minutesSinceLastSeen = (now - lastSeen) / (1000 * 60)
  
  if (minutesSinceLastSeen < 2) {
    return { text: 'Online', color: 'success', icon: 'mdi-wifi' }
  } else {
    return { text: 'Offline', color: 'error', icon: 'mdi-wifi-off' }
  }
}

// Enhanced stats (without percentages)
const deviceStats = computed(() => {
  const total = devices.value.length
  const authorized = devices.value.filter(d => d.is_authorized).length
  const online = devices.value.filter(d => {
    const status = getDeviceStatus(d)
    return status.text === 'Online'
  }).length
  const offline = devices.value.filter(d => {
    const status = getDeviceStatus(d)
    return status.text === 'Offline'
  }).length
  const pending = devices.value.filter(d => {
    const status = getDeviceStatus(d)
    return status.text === 'Pending'
  }).length

  return [
    {
      label: 'Total Devices',
      value: total,
      icon: 'mdi-cellphone',
      color: 'primary'
    },
    {
      label: 'Online Now',
      value: online,
      icon: 'mdi-wifi',
      color: 'success'
    },
    {
      label: 'Authorized',
      value: authorized,
      icon: 'mdi-check-circle',
      color: 'info'
    },
    {
      label: 'Pending',
      value: pending,
      icon: 'mdi-timer-sand',
      color: 'warning'
    }
  ]
})

// Filtered devices
const filteredDevices = computed(() => {
  let filtered = [...devices.value]
  
  // Search filter
  if (search.value) {
    const term = search.value.toLowerCase()
    filtered = filtered.filter(d => 
      d.device_name?.toLowerCase().includes(term) ||
      d.device_id?.toLowerCase().includes(term)
    )
  }
  
  // Status filter
  if (filters.value.status) {
    filtered = filtered.filter(d => {
      const status = getDeviceStatus(d).text.toLowerCase()
      return status === filters.value.status.toLowerCase()
    })
  }
  
  // Authorization filter
  if (filters.value.authorized !== null) {
    filtered = filtered.filter(d => d.is_authorized === filters.value.authorized)
  }
  
  // Sorting
  const [sortField, sortDir] = sortBy.value.split('_')
  filtered.sort((a, b) => {
    let aVal = a[sortField]
    let bVal = b[sortField]
    
    if (sortField === 'last_seen') {
      aVal = a.last_seen ? new Date(a.last_seen) : new Date(0)
      bVal = b.last_seen ? new Date(b.last_seen) : new Date(0)
    }
    
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
    return 0
  })
  
  return filtered
})

// Pagination
const paginatedDevices = computed(() => {
  const start = (page.value - 1) * perPage.value
  const end = start + perPage.value
  return filteredDevices.value.slice(start, end)
})

const paginationStart = computed(() => 
  filteredDevices.value.length ? (page.value - 1) * perPage.value + 1 : 0
)
const paginationEnd = computed(() => 
  Math.min(page.value * perPage.value, filteredDevices.value.length)
)

const hasActiveFilters = computed(() => {
  return search.value || filters.value.status || filters.value.authorized !== null
})

// Debounced search
const debouncedSearch = debounce(() => {
  page.value = 1
}, 500)

function handleSearch() {
  debouncedSearch()
}

function handleFilterChange() {
  page.value = 1
}

function handleTableSort(options) {
  const { sortBy: sortItems, sortDesc } = options
  if (sortItems?.length) {
    const key = sortItems[0]
    const order = sortDesc[0] ? 'desc' : 'asc'
    sortBy.value = `${key}_${order}`
    sortOrder.value = order
  }
}

function clearFilters() {
  search.value = ''
  filters.value.status = null
  filters.value.authorized = null
  page.value = 1
}

// API methods
onMounted(() => {
  fetchDevices()
  startStatusUpdates()
})

onUnmounted(() => {
  if (statusUpdateInterval) {
    clearInterval(statusUpdateInterval)
  }
})

const startStatusUpdates = () => {
  statusUpdateInterval = setInterval(() => {
    // Force reactivity update
    devices.value = [...devices.value]
  }, 30000)
}

const fetchDevices = async () => {
  loading.value = true
  try {
    const response = await kioskApi.getDevices()
    devices.value = response.data.devices.map(device => ({
      ...device,
      is_authorized: Boolean(device.is_authorized)
    }))
    lastUpdated.value = new Date().toISOString()
    showToast('Devices refreshed', 'success')
  } catch (error) {
    console.error('Fetch devices error:', error)
    showToast('Failed to fetch devices', 'error')
  } finally {
    loading.value = false
  }
}

const toggleAuthorization = async (device, newValue) => {
  const originalValue = device.is_authorized
  device.is_authorized = newValue
  authLoading.value = device.device_id
  
  try {
    if (newValue) {
      await kioskApi.authorizeDevice(device.device_id)
      showToast(`Device ${device.device_name} authorized`, 'success')
    } else {
      await kioskApi.deauthorizeDevice(device.device_id)
      showToast(`Device ${device.device_name} deauthorized`, 'success')
    }
  } catch (error) {
    console.error('Toggle authorization error:', error)
    device.is_authorized = originalValue
    showToast('Failed to update authorization', 'error')
  } finally {
    authLoading.value = null
  }
}

const startEdit = (device) => {
  editingDeviceId.value = device.id
  editForm.device_name = device.device_name
  nextTick(() => {
    if (editInput.value) {
      editInput.value.focus()
    }
  })
}

const saveDeviceName = async (device) => {
  if (!editForm.device_name.trim()) {
    showToast('Device name cannot be empty', 'warning')
    return
  }

  try {
    await kioskApi.updateDevice(device.device_id, {
      device_name: editForm.device_name
    })
    
    const index = devices.value.findIndex(d => d.device_id === device.device_id)
    if (index !== -1) {
      devices.value[index] = {
        ...devices.value[index],
        device_name: editForm.device_name
      }
      devices.value = [...devices.value]
    }
    
    editingDeviceId.value = null
    showToast('Device name updated', 'success')
  } catch (error) {
    console.error('Update device error:', error)
    showToast('Failed to update device name', 'error')
  }
}

const cancelEdit = () => {
  editingDeviceId.value = null
  editForm.device_name = ''
}

const confirmDelete = (device) => {
  deviceToDelete.value = device
  showDeleteModal.value = true
}

const closeDeleteModal = () => {
  showDeleteModal.value = false
  deviceToDelete.value = null
}

const deleteDevice = async () => {
  if (!deviceToDelete.value) return
  
  deleteLoading.value = true
  try {
    await kioskApi.deleteDevice(deviceToDelete.value.device_id)
    devices.value = devices.value.filter(d => d.device_id !== deviceToDelete.value.device_id)
    showToast('Device deleted successfully', 'success')
    closeDeleteModal()
  } catch (error) {
    console.error('Delete device error:', error)
    showToast('Failed to delete device', 'error')
  } finally {
    deleteLoading.value = false
  }
}

const confirmDeleteAll = () => {
  showDeleteAllModal.value = true
}

const closeDeleteAllModal = () => {
  showDeleteAllModal.value = false
}

const deleteAllDevices = async () => {
  deleteAllLoading.value = true
  try {
    // Delete each device one by one
    const deletePromises = devices.value.map(device => 
      kioskApi.deleteDevice(device.device_id)
    )
    
    await Promise.all(deletePromises)
    devices.value = []
    showToast(`All devices deleted successfully`, 'success')
    closeDeleteAllModal()
  } catch (error) {
    console.error('Delete all devices error:', error)
    showToast('Failed to delete all devices', 'error')
  } finally {
    deleteAllLoading.value = false
  }
}

// Utility functions
const formatDate = (dateString) => {
  if (!dateString) return 'Never'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
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

<style scoped>
@import '@/styles/variables.css';

.gap-2 {
  gap: var(--spacing-sm);
}

.gap-1 {
  gap: var(--spacing-xs);
}

.ga-3 {
  gap: var(--spacing-md);
}

/* Stat card styling */
.stat-card {
  transition: all var(--transition-fast);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

/* Compact field styling */
.compact-field :deep(.v-field) {
  font-size: var(--font-size-sm);
}

.compact-field :deep(.v-field__input) {
  min-height: 36px;
  padding-top: 0;
  padding-bottom: 0;
}

/* Edit button hover effect */
.edit-hover-btn {
  opacity: 0;
  transition: opacity var(--transition-fast);
}

tr:hover .edit-hover-btn {
  opacity: 1;
}

/* Table styling */
:deep(.v-data-table-header th) {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-secondary);
  background-color: var(--color-surface-dark);
  padding: var(--spacing-sm) var(--spacing-md) !important;
  white-space: nowrap;
}

:deep(.v-data-table .v-table__wrapper > table > tbody > tr > td) {
  padding: var(--spacing-sm) var(--spacing-md) !important;
  font-size: var(--font-size-sm);
  border-bottom: 1px solid var(--color-divider);
}

:deep(.v-data-table .v-table__wrapper > table > tbody > tr:hover) {
  background-color: var(--color-surface-light);
}

/* Chip styling */
:deep(.v-chip) {
  font-size: var(--font-size-xs);
  height: 22px;
}

:deep(.v-chip.v-chip--size-x-small) {
  --v-chip-height: 20px;
  font-size: var(--font-size-xs);
}

/* Switch styling */
.authorization-switch :deep(.v-switch__thumb) {
  color: var(--color-surface);
}

.authorization-switch :deep(.v-selection-control--dirty) {
  color: var(--color-primary);
}

/* Delete Dialog Styling - Matches Logout Modal from Sidebar */
.delete-dialog {
  border-radius: var(--radius-md);
  overflow: hidden;
}

.bg-error-lighten-5 {
  background-color: rgba(var(--color-error-rgb), 0.05);
}

.delete-dialog :deep(.v-card-title) {
  font-size: var(--font-size-sm);
  line-height: 1.4;
}

.delete-dialog :deep(.v-card-text) {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}

.delete-dialog :deep(.v-btn) {
  font-size: var(--font-size-xs);
  letter-spacing: 0.3px;
  text-transform: none;
}

.delete-dialog :deep(.v-btn--variant-elevated) {
  box-shadow: var(--shadow-sm);
}

/* Toast notifications */
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: var(--z-toast);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  pointer-events: none;
}

.toast {
  position: relative;
  min-width: 300px;
  max-width: 400px;
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  cursor: pointer;
  pointer-events: auto;
  overflow: hidden;
  animation: toast-slide-in var(--transition-normal);
  border-left: 4px solid;
}

.toast-success {
  border-left-color: var(--color-success);
  background-color: #e8f5e9;
}

.toast-error {
  border-left-color: var(--color-error);
  background-color: #ffebee;
}

.toast-warning {
  border-left-color: var(--color-warning);
  background-color: #fff3e0;
}

.toast-info {
  border-left-color: var(--color-info);
  background-color: #e3f2fd;
}

.toast-content {
  display: flex;
  align-items: center;
  color: var(--color-text-primary);
}

.toast-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background-color: rgba(0, 0, 0, 0.2);
  animation: toast-progress linear forwards;
}

@keyframes toast-slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes toast-progress {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}

.toast-enter-active,
.toast-leave-active {
  transition: all var(--transition-normal);
}

.toast-enter-from,
.toast-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

/* Dark theme support */
:root.dark-theme .stat-card {
  background-color: var(--color-surface);
  border-color: var(--color-border);
}

:root.dark-theme :deep(.v-data-table-header th) {
  background-color: var(--color-surface-dark);
  color: var(--color-text-secondary);
}

:root.dark-theme :deep(.v-data-table .v-table__wrapper > table > tbody > tr:hover) {
  background-color: var(--color-surface-dark);
}

:root.dark-theme .toast-success {
  background-color: #1b5e20;
}

:root.dark-theme .toast-error {
  background-color: #b71c1c;
}

:root.dark-theme .toast-warning {
  background-color: #bf360c;
}

:root.dark-theme .toast-info {
  background-color: #0d47a1;
}

:root.dark-theme .toast-content {
  color: white;
}
</style>