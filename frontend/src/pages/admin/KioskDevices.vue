<!-- frontend/src/pages/admin/KioskDevices.vue -->
<template>
  <v-container fluid class="kiosk-devices pa-6">
    <!-- Header -->
    <v-row class="mb-6" align="center" justify="space-between">
      <v-col cols="auto">
        <h1 class="text-h4 font-weight-medium" style="color: rgb(var(--v-theme-primary))">
          Kiosk Device Management
        </h1>
      </v-col>
      <v-col cols="auto">
        <v-btn
          color="primary"
          :loading="loading"
          @click="fetchDevices"
          prepend-icon="mdi-refresh"
        >
          Refresh
        </v-btn>
      </v-col>
    </v-row>

    <!-- Stats Cards -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card class="stat-card" elevation="2">
          <v-card-text class="d-flex align-center">
            <v-avatar
              color="primary"
              size="56"
              class="mr-4"
            >
              <v-icon size="32">mdi-cellphone</v-icon>
            </v-avatar>
            <div>
              <div class="text-h4 font-weight-bold">{{ stats.total }}</div>
              <div class="text-subtitle-2 text-medium-emphasis">Total Devices</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="stat-card" elevation="2">
          <v-card-text class="d-flex align-center">
            <v-avatar
              color="success"
              size="56"
              class="mr-4"
            >
              <v-icon size="32">mdi-check-circle</v-icon>
            </v-avatar>
            <div>
              <div class="text-h4 font-weight-bold">{{ stats.authorized }}</div>
              <div class="text-subtitle-2 text-medium-emphasis">Authorized</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="stat-card" elevation="2">
          <v-card-text class="d-flex align-center">
            <v-avatar
              color="warning"
              size="56"
              class="mr-4"
            >
              <v-icon size="32">mdi-timer-sand</v-icon>
            </v-avatar>
            <div>
              <div class="text-h4 font-weight-bold">{{ stats.pending }}</div>
              <div class="text-subtitle-2 text-medium-emphasis">Pending</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="stat-card" elevation="2">
          <v-card-text class="d-flex align-center">
            <v-avatar
              color="info"
              size="56"
              class="mr-4"
            >
              <v-icon size="32">mdi-wifi</v-icon>
            </v-avatar>
            <div>
              <div class="text-h4 font-weight-bold">{{ stats.online }}</div>
              <div class="text-subtitle-2 text-medium-emphasis">Online Now</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Devices Table -->
    <v-card elevation="2">
      <v-data-table
        :headers="headers"
        :items="devices"
        :loading="loading"
        loading-text="Loading devices..."
        hover
        :items-key="(item) => item.device_id"
      >
        <!-- Status Column - FIXED: Computed based on last_seen -->
        <template v-slot:item.status="{ item }">
          <v-chip
            :color="getDeviceStatus(item).color"
            size="small"
            class="font-weight-medium"
          >
            {{ getDeviceStatus(item).text }}
          </v-chip>
        </template>

        <!-- Device Name Column with inline edit -->
        <template v-slot:item.device_name="{ item }">
          <div v-if="editingDeviceId !== item.id" class="d-flex align-center">
            <span>{{ item.device_name }}</span>
          </div>
          <div v-else class="d-flex align-center" style="min-width: 200px">
            <v-text-field
              v-model="editForm.device_name"
              density="compact"
              hide-details
              @keyup.enter="saveDeviceName(item)"
              @keyup.esc="cancelEdit"
              ref="editInput"
              autofocus
            ></v-text-field>
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
            <span>{{ formatDate(item.last_seen) }}</span>
            <small class="text-medium-emphasis">{{ timeAgo(item.last_seen) }}</small>
          </div>
        </template>

        <!-- Registered Column -->
        <template v-slot:item.created_at="{ item }">
          <span class="text-medium-emphasis">{{ formatDate(item.created_at) }}</span>
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
          ></v-switch>
        </template>

        <!-- Actions Column -->
        <template v-slot:item.actions="{ item }">
          <div class="d-flex gap-2">
            <template v-if="editingDeviceId === item.id">
              <v-btn
                icon="mdi-check"
                color="success"
                size="small"
                @click="saveDeviceName(item)"
                title="Save"
              ></v-btn>
              <v-btn
                icon="mdi-close"
                color="error"
                size="small"
                variant="text"
                @click="cancelEdit"
                title="Cancel"
              ></v-btn>
            </template>
            <template v-else>
              <v-btn
                icon="mdi-pencil"
                color="primary"
                size="small"
                variant="text"
                @click="startEdit(item)"
                title="Edit name"
              ></v-btn>
            </template>
            
            <v-btn
              icon="mdi-delete"
              color="error"
              size="small"
              variant="text"
              @click="confirmDelete(item)"
              title="Delete device"
            ></v-btn>
          </div>
        </template>

        <!-- Empty State -->
        <template v-slot:no-data>
          <v-empty-state
            icon="mdi-cellphone-off"
            title="No Kiosk Devices Found"
            text="Connect a kiosk device to get started"
          ></v-empty-state>
        </template>
      </v-data-table>
    </v-card>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="showDeleteModal" max-width="400">
      <v-card>
        <v-card-title class="text-h5">Delete Kiosk Device</v-card-title>
        
        <v-card-text>
          <p>Are you sure you want to delete device <strong>{{ deviceToDelete?.device_name }}</strong>?</p>
          <p class="text-error font-weight-medium mt-4">This action cannot be undone.</p>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            variant="text"
            @click="closeDeleteModal"
          >
            Cancel
          </v-btn>
          <v-btn
            color="error"
            :loading="deleteLoading"
            @click="deleteDevice"
          >
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick, onUnmounted } from 'vue'
import { kioskApi } from '@/api'
import { useToast } from 'vue-toastification'

const toast = useToast()
const loading = ref(false)
const authLoading = ref(null)
const deleteLoading = ref(false)
const devices = ref([])
const showDeleteModal = ref(false)
const deviceToDelete = ref(null)
const editingDeviceId = ref(null)
const editInput = ref(null)
let statusUpdateInterval = null

const editForm = reactive({
  device_name: ''
})

// Table headers - FIXED: Removed status from being sortable since it's computed
const headers = [
  { title: 'Status', key: 'status', align: 'start', sortable: false },
  { title: 'Device Name', key: 'device_name', align: 'start', sortable: true },
  { title: 'Device ID', key: 'device_id', align: 'start', sortable: true },
  { title: 'Last Seen', key: 'last_seen', align: 'start', sortable: true },
  { title: 'Registered', key: 'created_at', align: 'start', sortable: true },
  { title: 'Authorization', key: 'is_authorized', align: 'center', sortable: true },
  { title: 'Actions', key: 'actions', align: 'center', sortable: false }
]

// FIXED: Function to determine device status based on last_seen
const getDeviceStatus = (device) => {
  if (!device.last_seen) {
    return { text: 'Pending', color: 'warning' }
  }
  
  const lastSeen = new Date(device.last_seen)
  const now = new Date()
  const minutesSinceLastSeen = (now - lastSeen) / (1000 * 60)
  
  // Device is considered online if seen in the last 2 minutes
  if (minutesSinceLastSeen < 2) {
    return { text: 'Online', color: 'success' }
  } else {
    return { text: 'Offline', color: 'error' }
  }
}

// Statistics - FIXED: Now uses computed status
const stats = computed(() => {
  const total = devices.value.length
  const authorized = devices.value.filter(d => d.is_authorized).length
  
  // Calculate online based on last_seen
  const online = devices.value.filter(d => {
    if (!d.last_seen) return false
    const lastSeen = new Date(d.last_seen)
    const now = new Date()
    const minutesSinceLastSeen = (now - lastSeen) / (1000 * 60)
    return minutesSinceLastSeen < 2
  }).length
  
  return {
    total,
    authorized,
    pending: total - authorized,
    online
  }
})

// Get status color (kept for backward compatibility, but we'll use getDeviceStatus instead)
const getStatusColor = (status) => {
  const colors = {
    'Online': 'success',
    'Offline': 'error',
    'Pending': 'warning'
  }
  return colors[status] || 'grey'
}

// Fetch devices on mount
onMounted(() => {
  fetchDevices()
  // Start periodic status updates
  startStatusUpdates()
})

onUnmounted(() => {
  // Clean up interval on component unmount
  if (statusUpdateInterval) {
    clearInterval(statusUpdateInterval)
  }
})

// Start periodic status updates
const startStatusUpdates = () => {
  // Update status every 30 seconds
  statusUpdateInterval = setInterval(() => {
    // Force reactivity update by reassigning the array
    devices.value = [...devices.value]
  }, 30000)
}

// Fetch all kiosk devices
const fetchDevices = async () => {
  loading.value = true
  try {
    const response = await kioskApi.getDevices()
    // Ensure we have proper boolean values and don't store status
    devices.value = response.data.devices.map(device => ({
      ...device,
      is_authorized: Boolean(device.is_authorized)
      // Removed status - now computed on the fly
    }))
    toast.success('Devices refreshed')
  } catch (error) {
    console.error('Fetch devices error:', error)
    toast.error('Failed to fetch devices')
  } finally {
    loading.value = false
  }
}

// Toggle device authorization
const toggleAuthorization = async (device, newValue) => {
  // Store original value in case of error
  const originalValue = device.is_authorized
  
  // Optimistically update UI
  device.is_authorized = newValue
  authLoading.value = device.device_id
  
  try {
    if (newValue) {
      await kioskApi.authorizeDevice(device.device_id)
      toast.success(`Device ${device.device_name} authorized`)
    } else {
      await kioskApi.deauthorizeDevice(device.device_id)
      toast.success(`Device ${device.device_name} deauthorized`)
    }
  } catch (error) {
    console.error('Toggle authorization error:', error)
    toast.error('Failed to update authorization')
    // Revert on error
    device.is_authorized = originalValue
  } finally {
    authLoading.value = null
  }
}

// Start editing device name
const startEdit = (device) => {
  editingDeviceId.value = device.id
  editForm.device_name = device.device_name
  nextTick(() => {
    if (editInput.value) {
      editInput.value.focus()
    }
  })
}

// Save edited device name
const saveDeviceName = async (device) => {
  if (!editForm.device_name.trim()) {
    toast.warning('Device name cannot be empty')
    return
  }

  try {
    await kioskApi.updateDevice(device.device_id, {
      device_name: editForm.device_name
    })
    
    // Update the specific device in the array
    const index = devices.value.findIndex(d => d.device_id === device.device_id)
    if (index !== -1) {
      // Create a new object to trigger reactivity
      devices.value[index] = {
        ...devices.value[index],
        device_name: editForm.device_name,
        // Preserve all other properties including authorization status
        is_authorized: devices.value[index].is_authorized
      }
      // Force array update
      devices.value = [...devices.value]
    }
    
    editingDeviceId.value = null
    toast.success('Device name updated')
  } catch (error) {
    console.error('Update device error:', error)
    toast.error('Failed to update device name')
  }
}

// Cancel editing
const cancelEdit = () => {
  editingDeviceId.value = null
  editForm.device_name = ''
}

// Confirm delete
const confirmDelete = (device) => {
  deviceToDelete.value = device
  showDeleteModal.value = true
}

// Close delete modal
const closeDeleteModal = () => {
  showDeleteModal.value = false
  deviceToDelete.value = null
}

// Delete device
const deleteDevice = async () => {
  if (!deviceToDelete.value) return
  
  deleteLoading.value = true
  try {
    await kioskApi.deleteDevice(deviceToDelete.value.device_id)
    
    // Remove from list with proper reactivity
    devices.value = devices.value.filter(d => d.device_id !== deviceToDelete.value.device_id)
    
    toast.success('Device deleted successfully')
    closeDeleteModal()
  } catch (error) {
    console.error('Delete device error:', error)
    toast.error('Failed to delete device')
  } finally {
    deleteLoading.value = false
  }
}

// Utility: Format date
const formatDate = (dateString) => {
  if (!dateString) return 'Never'
  
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Utility: Time ago
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
.kiosk-devices {
  max-width: 1400px;
  margin: 0 auto;
}

.stat-card {
  transition: transform 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.gap-2 {
  gap: 8px;
}

:deep(.v-data-table .v-chip) {
  font-weight: 500;
}

:deep(.v-data-table td) {
  padding: 12px 16px;
}

:deep(.v-empty-state) {
  padding: 48px 0;
}
</style>