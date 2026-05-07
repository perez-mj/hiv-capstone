<!-- frontend/src/pages/admin/Administration.vue -->
<template>
  <v-container fluid class="pa-4 pa-md-6">
    <AdministrationHeader 
      :selected-items="selectedItems"
      :loading="loading"
      :bulk-deleting="bulkDeleting"
      @refresh="refreshTable"
      @new-record="openCreateDialog"
      @bulk-delete="confirmBulkDelete"
    />

    <AdministrationTabs 
      v-model="activeTable"
      :users-count="usersCount"
      :staff-count="staffCount"
      :kiosk-devices-count="kioskDevicesCount"
      :appointment-types-count="appointmentTypesCount"
    />

    <AdministrationFilters 
      v-model:search="search"
      v-model:sort-by="sortBy"
      v-model:sort-order="sortOrder"
      v-model:filters="filters"
      :active-table="activeTable"
      :has-active-filters="hasActiveFilters"
      :sort-fields="sortFields"
      @toggle-order="toggleSortOrder"
      @clear-filters="clearFilters"
    />

    <v-card elevation="0" border :style="{ borderColor: 'var(--color-border)', borderRadius: 'var(--radius-md)' }">
      <v-card-title class="d-flex justify-space-between align-center py-3 px-4">
        <div class="d-flex align-center">
          <v-icon :color="getTableColor" class="mr-2">{{ getTableIcon }}</v-icon>
          <span class="text-subtitle-1 font-weight-medium">{{ currentTableTitle }}</span>
          <v-chip v-if="selectedItems.length > 0" size="small" color="primary" class="ml-2">
            {{ selectedItems.length }} selected
          </v-chip>
        </div>
        <span class="text-caption text-medium-emphasis">
          Showing {{ paginationStart }} to {{ paginationEnd }} of {{ totalFilteredItems }}
        </span>
      </v-card-title>

      <v-divider :style="{ borderColor: 'var(--color-divider)' }" />

      <v-card-text class="pa-0">
        <AppointmentTypesTable 
          v-if="activeTable === 'appointment_types'"
          :key="`appointment-types-${tableKey}`"
          v-model:page="page"
          v-model:per-page="perPage"
          v-model:selected-items="selectedItems"
          :items="paginatedAppointmentTypes"
          :items-length="filteredAppointmentTypes.length"
          :loading="loading"
          @edit="editAppointmentType"
          @delete="confirmDelete"
          @update:options="handleTableSort"
        />

        <UsersTable 
          v-if="activeTable === 'users'"
          :key="`users-${tableKey}`"
          v-model:page="page"
          v-model:per-page="perPage"
          v-model:selected-items="selectedItems"
          :items="paginatedUsers"
          :items-length="filteredUsers.length"
          :loading="loading"
          @edit="editUser"
          @reset-password="resetPassword"
          @delete="confirmDelete"
          @update:options="handleTableSort"
        />

        <StaffTable 
          v-if="activeTable === 'staff'"
          :key="`staff-${tableKey}`"
          v-model:page="page"
          v-model:per-page="perPage"
          v-model:selected-items="selectedItems"
          :items="paginatedStaff"
          :items-length="filteredStaff.length"
          :loading="loading"
          @edit="editStaff"
          @create-user="createUserForStaff"
          @delete="confirmDelete"
          @update:options="handleTableSort"
        />

        <KioskDevicesTable 
          v-if="activeTable === 'kiosk_devices'"
          :key="`kiosk-${tableKey}`"
          v-model:page="page"
          v-model:per-page="perPage"
          v-model:selected-items="selectedItems"
          :items="paginatedKioskDevices"
          :items-length="filteredKioskDevices.length"
          :loading="loading"
          :auth-loading="authLoading"
          @edit="editKioskDevice"
          @toggle-auth="toggleAuthorization"
          @delete="confirmDelete"
          @update:options="handleTableSort"
        />
      </v-card-text>
    </v-card>

    <!-- Dialogs -->
    <AppointmentTypeDialog 
      v-model:show="dialogs.appointmentType.show"
      v-model:mode="dialogs.appointmentType.mode"
      :title="dialogs.appointmentType.title"
      :data="dialogs.appointmentType.data"
      :saving="dialogs.appointmentType.saving"
      @save="saveAppointmentType"
    />

    <StaffDialog 
      v-model:show="dialogs.staff.show"
      v-model:mode="dialogs.staff.mode"
      :title="dialogs.staff.title"
      :data="dialogs.staff.data"
      :saving="dialogs.staff.saving"
      @save="saveStaff"
    />

    <PasswordResetDialog 
      v-model:show="dialogs.passwordReset.show"
      :user-id="dialogs.passwordReset.userId"
      :username="dialogs.passwordReset.username"
      :loading="dialogs.passwordReset.loading"
      @reset="executePasswordReset"
    />

    <CreateUserDialog 
      v-model:show="dialogs.createUser.show"
      :staff-id="dialogs.createUser.staffId"
      :staff-name="dialogs.createUser.staffName"
      :username="dialogs.createUser.username"
      :password="dialogs.createUser.password"
      :role="dialogs.createUser.role"
      :loading="dialogs.createUser.loading"
      @create="executeCreateUserForStaff"
    />

    <DeleteConfirmDialog 
      v-model:show="dialogs.delete.show"
      :item="dialogs.delete.item"
      :table="dialogs.delete.table"
      :loading="dialogs.delete.loading"
      :title="getDeleteItemTitle()"
      @confirm="executeDelete"
    />

    <BulkDeleteDialog 
      v-model:show="dialogs.bulkDelete.show"
      :count="dialogs.bulkDelete.count"
      :has-users="dialogs.bulkDelete.hasUsers"
      :loading="dialogs.bulkDelete.loading"
      :progress="dialogs.bulkDelete.progress"
      @confirm="executeBulkDelete"
    />

    <UserInfoModal 
      v-model:show="dialogs.userInfo.show"
      @go-to-patients="goToPatientManagement"
      @go-to-staff="goToStaffTab"
    />

    <KioskInfoModal 
      v-model:show="dialogs.kioskInfo.show"
      :display-url="kioskDisplayUrl"
      :steps="kioskSteps"
    />

    <PasswordDisplayDialog 
      v-model:show="dialogs.passwordDisplay.show"
      :staff-name="dialogs.passwordDisplay.staffName"
      :username="dialogs.passwordDisplay.username"
      :password="dialogs.passwordDisplay.password"
    />

    <!-- Toast Notifications -->
    <div class="toast-container">
      <v-alert
        v-for="toast in toasts"
        :key="toast.id"
        :type="toast.type"
        :icon="toast.icon"
        class="toast-notification"
        density="compact"
        variant="tonal"
        closable
        @click:close="removeToast(toast.id)"
      >
        {{ toast.message }}
      </v-alert>
    </div>
  </v-container>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { appointmentsApi, usersApi, kioskApi, staffApi, patientsApi } from '@/api'
import debounce from 'lodash/debounce'

// Components
import AdministrationHeader from '@/components/admin/AdministrationHeader.vue'
import AdministrationTabs from '@/components/admin/AdministrationTabs.vue'
import AdministrationFilters from '@/components/admin/AdministrationFilters.vue'
import AppointmentTypesTable from '@/components/admin/tables/AppointmentTypesTable.vue'
import UsersTable from '@/components/admin/tables/UsersTable.vue'
import StaffTable from '@/components/admin/tables/StaffTable.vue'
import KioskDevicesTable from '@/components/admin/tables/KioskDevicesTable.vue'
import AppointmentTypeDialog from '@/components/admin/dialogs/AppointmentTypeDialog.vue'
import StaffDialog from '@/components/admin/dialogs/StaffDialog.vue'
import PasswordResetDialog from '@/components/admin/dialogs/PasswordResetDialog.vue'
import CreateUserDialog from '@/components/admin/dialogs/CreateUserDialog.vue'
import DeleteConfirmDialog from '@/components/admin/dialogs/DeleteConfirmDialog.vue'
import BulkDeleteDialog from '@/components/admin/dialogs/BulkDeleteDialog.vue'
import UserInfoModal from '@/components/admin/dialogs/UserInfoModal.vue'
import KioskInfoModal from '@/components/admin/dialogs/KioskInfoModal.vue'
import PasswordDisplayDialog from '@/components/admin/dialogs/PasswordDisplayDialog.vue'

const router = useRouter()

// Toast system
const toasts = ref([])
let toastId = 0

const showToast = (message, type = 'success', duration = 3000) => {
  const id = toastId++
  const icon = {
    success: 'mdi-check-circle',
    error: 'mdi-alert-circle',
    warning: 'mdi-alert',
    info: 'mdi-information'
  }[type] || 'mdi-information'

  toasts.value.push({ id, message, type, icon, duration })
  setTimeout(() => removeToast(id), duration)
}

const removeToast = (id) => {
  const index = toasts.value.findIndex(t => t.id === id)
  if (index !== -1) toasts.value.splice(index, 1)
}

// State
const loading = ref(false)
const bulkDeleting = ref(false)
const authLoading = ref(null)
const activeTable = ref('appointment_types')
const search = ref('')
const page = ref(1)
const perPage = ref(10)
const sortBy = ref('created_at_desc')
const sortOrder = ref('desc')
const selectedItems = ref([])
const filters = ref({ role: null, status: null })
const tableKey = ref(0)

// Data Stores
const appointmentTypes = ref([])
const users = ref([])
const staff = ref([])
const kioskDevices = ref([])
const patients = ref([])

// Computed counts for tabs
const usersCount = computed(() => users.value.length)
const staffCount = computed(() => staff.value.length)
const kioskDevicesCount = computed(() => kioskDevices.value.length)
const appointmentTypesCount = computed(() => appointmentTypes.value.length)

// Dialog states
const dialogs = reactive({
  appointmentType: { show: false, mode: 'create', title: '', data: {}, saving: false },
  staff: { show: false, mode: 'create', title: '', data: {}, saving: false },
  passwordReset: { show: false, userId: null, username: '', newPassword: '', loading: false },
  createUser: { show: false, staffId: null, staffName: '', username: '', password: '', role: 'NURSE', loading: false },
  delete: { show: false, loading: false, item: null, table: null },
  bulkDelete: { show: false, loading: false, count: 0, hasUsers: false, progress: { show: false, current: 0, total: 0 } },
  userInfo: { show: false },
  kioskInfo: { show: false },
  passwordDisplay: { show: false, staffName: '', username: '', password: '' }
})

const kioskDisplayUrl = `${window.location.origin}/kiosk/display`
const kioskSteps = [
  'Navigate to the kiosk display page on the device',
  'Device automatically generates a random 8-character hex ID',
  'Device appears in this table with "Unauthorized" status',
  'Verify the device ID matches the physical device',
  'Toggle authorization switch to approve the device'
]

// Sort fields
const sortFields = computed(() => {
  const baseFields = [
    { title: 'Newest First', value: 'created_at_desc' },
    { title: 'Oldest First', value: 'created_at_asc' }
  ]

  if (activeTable.value === 'appointment_types') {
    baseFields.push(
      { title: 'Type Name (A-Z)', value: 'type_name_asc' },
      { title: 'Type Name (Z-A)', value: 'type_name_desc' }
    )
  } else if (activeTable.value === 'users') {
    baseFields.push(
      { title: 'Username (A-Z)', value: 'username_asc' },
      { title: 'Username (Z-A)', value: 'username_desc' },
      { title: 'Last Login (Recent)', value: 'last_login_desc' },
      { title: 'Last Login (Oldest)', value: 'last_login_asc' }
    )
  } else if (activeTable.value === 'staff') {
    baseFields.push(
      { title: 'Name (A-Z)', value: 'last_name_asc' },
      { title: 'Name (Z-A)', value: 'last_name_desc' }
    )
  } else if (activeTable.value === 'kiosk_devices') {
    baseFields.push(
      { title: 'Device ID (A-Z)', value: 'device_id_asc' },
      { title: 'Device ID (Z-A)', value: 'device_id_desc' },
      { title: 'Device Name (A-Z)', value: 'device_name_asc' },
      { title: 'Device Name (Z-A)', value: 'device_name_desc' },
      { title: 'Last Seen (Recent)', value: 'last_seen_desc' },
      { title: 'Last Seen (Oldest)', value: 'last_seen_asc' }
    )
  }

  return baseFields
})

// Helper function - FIXED: Better data extraction
const extractDataFromResponse = (response, defaultValue = []) => {
  if (!response) return defaultValue
  // Since http.js interceptor returns response.data directly
  if (Array.isArray(response)) return response
  if (response.data && Array.isArray(response.data)) return response.data
  if (Array.isArray(response.items)) return response.items
  if (Array.isArray(response.records)) return response.records
  return defaultValue
}

// Fetch functions
const fetchAppointmentTypes = async () => {
  try {
    const response = await appointmentsApi.getTypes()
    // Response is already the data object from http interceptor
    const data = extractDataFromResponse(response, [])
    appointmentTypes.value = [...data]
  } catch (error) {
    console.error('Error fetching appointment types:', error)
    showToast('Failed to load appointment types', 'error')
    appointmentTypes.value = []
  }
}

const fetchUsers = async () => {
  try {
    const response = await usersApi.getAll()
    const data = extractDataFromResponse(response, [])
    users.value = [...data]
  } catch (error) {
    console.error('Error fetching users:', error)
    users.value = []
  }
}

const fetchStaff = async () => {
  try {
    const response = await staffApi.getAll()
    const data = extractDataFromResponse(response, [])
    staff.value = [...data]
  } catch (error) {
    console.error('Error fetching staff:', error)
    staff.value = []
  }
}

const fetchKioskDevices = async () => {
  try {
    const response = await kioskApi.getDevices()
    const devicesData = extractDataFromResponse(response, [])
    kioskDevices.value = devicesData.map(device => ({
      ...device,
      is_authorized: Boolean(device.is_authorized)
    }))
  } catch (error) {
    console.error('Error fetching kiosk devices:', error)
    showToast('Failed to load kiosk devices', 'error')
    kioskDevices.value = []
  }
}

const fetchPatients = async () => {
  try {
    const response = await patientsApi.getAll({ limit: 1000 })
    const data = extractDataFromResponse(response, [])
    patients.value = [...data]
  } catch (error) {
    console.error('Error fetching patients:', error)
    patients.value = []
  }
}

// Filtered Data Computed
const filteredAppointmentTypes = computed(() => {
  let filtered = [...appointmentTypes.value]
  
  if (search.value) {
    const term = search.value.toLowerCase()
    filtered = filtered.filter(item =>
      item.type_name?.toLowerCase().includes(term) ||
      item.description?.toLowerCase().includes(term)
    )
  }
  
  if (sortBy.value) {
    const [sortField, sortDir] = sortBy.value.split('_')
    const direction = sortDir === 'asc' ? 1 : -1
    
    filtered.sort((a, b) => {
      let aVal = a[sortField]
      let bVal = b[sortField]
      
      if (aVal == null) aVal = ''
      if (bVal == null) bVal = ''
      
      if (typeof aVal === 'string') aVal = aVal.toLowerCase()
      if (typeof bVal === 'string') bVal = bVal.toLowerCase()
      
      if (aVal < bVal) return -1 * direction
      if (aVal > bVal) return 1 * direction
      return 0
    })
  }
  
  return filtered
})

const filteredUsers = computed(() => {
  let filtered = [...users.value]
  
  if (search.value) {
    const term = search.value.toLowerCase()
    filtered = filtered.filter(item =>
      item.username?.toLowerCase().includes(term) ||
      item.email?.toLowerCase().includes(term)
    )
  }
  
  if (filters.value.role) {
    if (filters.value.role === 'STAFF') {
      filtered = filtered.filter(item => ['ADMIN', 'NURSE'].includes(item.role))
    } else if (filters.value.role === 'PATIENT') {
      filtered = filtered.filter(item => item.role === 'PATIENT')
    }
  }
  
  if (filters.value.status) {
    filtered = filtered.filter(item =>
      filters.value.status === 'active' ? item.is_active : !item.is_active
    )
  }
  
  if (sortBy.value) {
    const [sortField, sortDir] = sortBy.value.split('_')
    const direction = sortDir === 'asc' ? 1 : -1
    
    filtered.sort((a, b) => {
      let aVal = a[sortField]
      let bVal = b[sortField]
      
      if (sortField === 'last_login') {
        aVal = a.last_login ? new Date(a.last_login).getTime() : 0
        bVal = b.last_login ? new Date(b.last_login).getTime() : 0
      } else {
        if (aVal == null) aVal = ''
        if (bVal == null) bVal = ''
        if (typeof aVal === 'string') aVal = aVal.toLowerCase()
        if (typeof bVal === 'string') bVal = bVal.toLowerCase()
      }
      
      if (aVal < bVal) return -1 * direction
      if (aVal > bVal) return 1 * direction
      return 0
    })
  }
  
  return filtered
})

const filteredStaff = computed(() => {
  let filtered = [...staff.value]
  
  if (search.value) {
    const term = search.value.toLowerCase()
    filtered = filtered.filter(item =>
      item.first_name?.toLowerCase().includes(term) ||
      item.last_name?.toLowerCase().includes(term) ||
      item.position?.toLowerCase().includes(term)
    )
  }
  
  if (sortBy.value) {
    const [sortField, sortDir] = sortBy.value.split('_')
    const direction = sortDir === 'asc' ? 1 : -1
    
    filtered.sort((a, b) => {
      let aVal = a[sortField]
      let bVal = b[sortField]
      
      if (aVal == null) aVal = ''
      if (bVal == null) bVal = ''
      if (typeof aVal === 'string') aVal = aVal.toLowerCase()
      if (typeof bVal === 'string') bVal = bVal.toLowerCase()
      
      if (aVal < bVal) return -1 * direction
      if (aVal > bVal) return 1 * direction
      return 0
    })
  }
  
  return filtered
})

const filteredKioskDevices = computed(() => {
  let filtered = [...kioskDevices.value]
  
  if (search.value) {
    const term = search.value.toLowerCase()
    filtered = filtered.filter(item =>
      item.device_id?.toLowerCase().includes(term) ||
      item.device_name?.toLowerCase().includes(term)
    )
  }
  
  if (sortBy.value) {
    const [sortField, sortDir] = sortBy.value.split('_')
    const direction = sortDir === 'asc' ? 1 : -1
    
    filtered.sort((a, b) => {
      let aVal = a[sortField]
      let bVal = b[sortField]
      
      if (sortField === 'last_seen') {
        aVal = a.last_seen ? new Date(a.last_seen).getTime() : 0
        bVal = b.last_seen ? new Date(b.last_seen).getTime() : 0
      } else {
        if (aVal == null) aVal = ''
        if (bVal == null) bVal = ''
        if (typeof aVal === 'string') aVal = aVal.toLowerCase()
        if (typeof bVal === 'string') bVal = bVal.toLowerCase()
      }
      
      if (aVal < bVal) return -1 * direction
      if (aVal > bVal) return 1 * direction
      return 0
    })
  }
  
  return filtered
})

// Paginated Data
const paginatedAppointmentTypes = computed(() => {
  const start = (page.value - 1) * perPage.value
  const end = start + perPage.value
  return filteredAppointmentTypes.value.slice(start, end)
})

const paginatedUsers = computed(() => {
  const start = (page.value - 1) * perPage.value
  const end = start + perPage.value
  return filteredUsers.value.slice(start, end)
})

const paginatedStaff = computed(() => {
  const start = (page.value - 1) * perPage.value
  const end = start + perPage.value
  return filteredStaff.value.slice(start, end)
})

const paginatedKioskDevices = computed(() => {
  const start = (page.value - 1) * perPage.value
  const end = start + perPage.value
  return filteredKioskDevices.value.slice(start, end)
})

const totalFilteredItems = computed(() => {
  switch (activeTable.value) {
    case 'appointment_types': return filteredAppointmentTypes.value.length
    case 'users': return filteredUsers.value.length
    case 'staff': return filteredStaff.value.length
    case 'kiosk_devices': return filteredKioskDevices.value.length
    default: return 0
  }
})

const hasActiveFilters = computed(() => {
  return !!search.value || !!filters.value.role || !!filters.value.status
})

const paginationStart = computed(() => {
  return totalFilteredItems.value ? (page.value - 1) * perPage.value + 1 : 0
})

const paginationEnd = computed(() => {
  return Math.min(page.value * perPage.value, totalFilteredItems.value)
})

const currentTableTitle = computed(() => {
  const titles = {
    appointment_types: 'Appointment Types',
    users: 'Users',
    staff: 'Staff',
    kiosk_devices: 'Kiosk Devices'
  }
  return titles[activeTable.value] || 'Administration'
})

const getTableIcon = computed(() => {
  const icons = {
    appointment_types: 'mdi-calendar-clock',
    users: 'mdi-account-group',
    staff: 'mdi-doctor',
    kiosk_devices: 'mdi-devices'
  }
  return icons[activeTable.value] || 'mdi-table'
})

const getTableColor = computed(() => {
  const colors = {
    appointment_types: 'primary',
    users: 'success',
    staff: 'warning',
    kiosk_devices: 'info'
  }
  return colors[activeTable.value] || 'primary'
})

// Helper functions
const generateUsernameFromName = () => {
  if (dialogs.staff.data.first_name && dialogs.staff.data.last_name) {
    const firstName = dialogs.staff.data.first_name.toLowerCase().replace(/[^a-z0-9]/g, '')
    const lastName = dialogs.staff.data.last_name.toLowerCase().replace(/[^a-z0-9]/g, '')
    const baseUsername = `${firstName}.${lastName}`
    const randomNum = Math.floor(Math.random() * 900) + 100
    return `${baseUsername}${randomNum}`
  }
  return ''
}

const generateRandomPassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%'
  let password = ''
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

const clearSelection = () => {
  selectedItems.value = []
}

const getDeleteItemTitle = () => {
  const titles = {
    appointment_types: 'Appointment Type',
    users: 'User',
    staff: 'Staff',
    kiosk_devices: 'Kiosk Device'
  }
  return titles[dialogs.delete.table] || 'Record'
}

const forceTableRefresh = () => {
  tableKey.value++
}

// CRUD Operations - FIXED: Correct API response handling
const refreshTable = async () => {
  loading.value = true
  try {
    switch (activeTable.value) {
      case 'appointment_types':
        await fetchAppointmentTypes()
        break
      case 'users':
        await Promise.all([fetchUsers(), fetchPatients(), fetchStaff()])
        break
      case 'staff':
        await Promise.all([fetchStaff(), fetchUsers()])
        break
      case 'kiosk_devices':
        await fetchKioskDevices()
        break
    }
    
    await nextTick()
    const totalPages = Math.ceil(totalFilteredItems.value / perPage.value)
    if (page.value > totalPages && totalPages > 0) {
      page.value = totalPages
    }
    
    forceTableRefresh()
  } catch (error) {
    console.error('Refresh error:', error)
    showToast('Failed to refresh data', 'error')
  } finally {
    loading.value = false
  }
}

const saveAppointmentType = async (formData) => {
  dialogs.appointmentType.saving = true
  try {
    let response
    if (dialogs.appointmentType.mode === 'create') {
      response = await appointmentsApi.createType(formData)
    } else {
      response = await appointmentsApi.updateType(dialogs.appointmentType.data.id, formData)
    }
    
    // response is already the data object from http interceptor
    if (response && response.success !== false) {
      showToast(`Appointment type ${dialogs.appointmentType.mode === 'create' ? 'created' : 'updated'} successfully`, 'success')
      dialogs.appointmentType.show = false
      await refreshTable()
    } else {
      showToast(response?.message || response?.error || 'Failed to save', 'error')
    }
  } catch (error) {
    console.error('Error saving appointment type:', error)
    showToast(error.message || error.error || 'Failed to save', 'error')
  } finally {
    dialogs.appointmentType.saving = false
  }
}

const saveStaff = async (formData) => {
  dialogs.staff.saving = true
  try {
    let response
    if (dialogs.staff.mode === 'create') {
      const staffData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        middle_name: formData.middle_name || '',
        position: formData.position || '',
        contact_number: formData.contact_number || '',
        username: formData.username || generateUsernameFromName(),
        password: formData.password || generateRandomPassword(),
        role: formData.role || 'NURSE'
      }
      response = await staffApi.createWithUser(staffData)
      
      // response is already the data object
      if (response && response.success !== false) {
        if (response.generated_password) {
          dialogs.passwordDisplay.staffName = `${staffData.first_name} ${staffData.last_name}`
          dialogs.passwordDisplay.username = response.data?.username || staffData.username
          dialogs.passwordDisplay.password = response.generated_password
          dialogs.passwordDisplay.show = true
        }
        showToast(`Staff created successfully`, 'success')
        dialogs.staff.show = false
        await refreshTable()
      } else {
        showToast(response?.message || response?.error || 'Failed to create staff', 'error')
      }
    } else {
      response = await staffApi.update(formData.id, {
        user_id: formData.user_id,
        first_name: formData.first_name,
        last_name: formData.last_name,
        middle_name: formData.middle_name,
        position: formData.position,
        contact_number: formData.contact_number
      })
      
      if (response && response.success !== false) {
        showToast(`Staff updated successfully`, 'success')
        dialogs.staff.show = false
        await refreshTable()
      } else {
        showToast(response?.message || response?.error || 'Failed to update staff', 'error')
      }
    }
  } catch (error) {
    console.error('Error saving staff:', error)
    showToast(error.message || error.error || 'Failed to save', 'error')
  } finally {
    dialogs.staff.saving = false
  }
}

const executeDelete = async () => {
  dialogs.delete.loading = true
  try {
    let response
    switch (dialogs.delete.table) {
      case 'appointment_types':
        response = await appointmentsApi.deleteType(dialogs.delete.item.id)
        break
      case 'users':
        response = await usersApi.delete(dialogs.delete.item.id)
        break
      case 'staff':
        response = await staffApi.delete(dialogs.delete.item.id)
        break
      case 'kiosk_devices':
        response = await kioskApi.deleteDevice(dialogs.delete.item.device_id)
        break
    }
    
    // response is already the data object from http interceptor
    // The backend returns { success: true, message: "...", data: null }
    if (response && response.success === true) {
      showToast(response.message || 'Record deleted successfully', 'success')
      dialogs.delete.show = false
      clearSelection()
      await refreshTable()
    } else {
      showToast(response?.message || response?.error || 'Failed to delete record', 'error')
    }
  } catch (error) {
    console.error('Error deleting record:', error)
    showToast(error.message || error.error || 'Failed to delete record', 'error')
  } finally {
    dialogs.delete.loading = false
  }
}

const executeBulkDelete = async () => {
  dialogs.bulkDelete.loading = true
  dialogs.bulkDelete.progress.show = true
  dialogs.bulkDelete.progress.total = selectedItems.value.length
  dialogs.bulkDelete.progress.current = 0
  
  try {
    const results = { success: 0, failed: 0, errors: [] }
    const itemsToDelete = [...selectedItems.value]
    
    for (const item of itemsToDelete) {
      dialogs.bulkDelete.progress.current++
      
      try {
        let response
        switch (activeTable.value) {
          case 'appointment_types':
            response = await appointmentsApi.deleteType(item.id)
            break
          case 'users':
            response = await usersApi.delete(item.id)
            break
          case 'staff':
            response = await staffApi.delete(item.id)
            break
          case 'kiosk_devices':
            response = await kioskApi.deleteDevice(item.device_id)
            break
        }
        
        if (response && response.success === true) {
          results.success++
        } else {
          results.failed++
          results.errors.push({ item, error: response?.message || 'Unknown error' })
        }
      } catch (error) {
        results.failed++
        results.errors.push({ item, error: error.message || error.error || 'Unknown error' })
      }
      
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    dialogs.bulkDelete.show = false
    dialogs.bulkDelete.progress.show = false
    clearSelection()
    await refreshTable()
    
    if (results.failed === 0) {
      showToast(`Successfully deleted ${results.success} records`, 'success')
    } else if (results.success > 0) {
      showToast(`Deleted ${results.success} records, ${results.failed} failed`, 'warning')
      console.warn('Bulk delete errors:', results.errors)
    } else {
      showToast(`Failed to delete any records`, 'error')
    }
  } catch (error) {
    console.error('Error in bulk delete:', error)
    showToast('Failed to complete bulk delete', 'error')
    dialogs.bulkDelete.show = false
    dialogs.bulkDelete.progress.show = false
  } finally {
    dialogs.bulkDelete.loading = false
  }
}

const executeCreateUserForStaff = async (userData) => {
  dialogs.createUser.loading = true
  try {
    const payload = {
      username: userData.username,
      password: userData.password,
      role: userData.role,
      is_active: true,
      staff_id: dialogs.createUser.staffId
    }
    const response = await usersApi.create(payload)
    
    if (response && response.success === true) {
      showToast('User account created successfully', 'success')
      dialogs.createUser.show = false
      await refreshTable()
    } else {
      showToast(response?.message || response?.error || 'Failed to create user', 'error')
    }
  } catch (error) {
    console.error('Error creating user:', error)
    showToast(error.message || error.error || 'Failed to create user', 'error')
  } finally {
    dialogs.createUser.loading = false
  }
}

const executePasswordReset = async (newPassword) => {
  dialogs.passwordReset.loading = true
  try {
    const response = await usersApi.changePassword(dialogs.passwordReset.userId, {
      password: newPassword
    })
    
    if (response && response.success === true) {
      showToast('Password reset successfully', 'success')
      dialogs.passwordReset.show = false
      await refreshTable()
    } else {
      showToast(response?.message || response?.error || 'Failed to reset password', 'error')
    }
  } catch (error) {
    console.error('Error resetting password:', error)
    showToast(error.message || error.error || 'Failed to reset password', 'error')
  } finally {
    dialogs.passwordReset.loading = false
  }
}

const toggleAuthorization = async (device, newValue) => {
  const originalValue = device.is_authorized
  device.is_authorized = newValue
  authLoading.value = device.device_id
  
  try {
    if (newValue) {
      await kioskApi.authorizeDevice(device.device_id)
      showToast(`Device ${device.device_name || device.device_id} authorized`, 'success')
    } else {
      await kioskApi.deauthorizeDevice(device.device_id)
      showToast(`Device ${device.device_name || device.device_id} deauthorized`, 'success')
    }
    await fetchKioskDevices()
    forceTableRefresh()
  } catch (error) {
    console.error('Toggle authorization error:', error)
    device.is_authorized = originalValue
    showToast('Failed to update authorization', 'error')
  } finally {
    authLoading.value = null
  }
}

// UI Event Handlers
const handleTableSort = (options) => {
  const { sortBy: sortItems, sortDesc } = options
  if (sortItems?.length) {
    const key = sortItems[0]
    const order = sortDesc[0] ? 'desc' : 'asc'
    sortBy.value = `${key}_${order}`
    sortOrder.value = order
  }
}

const toggleSortOrder = () => {
  const newOrder = sortOrder.value === 'asc' ? 'desc' : 'asc'
  sortOrder.value = newOrder
  const baseField = sortBy.value.split('_').slice(0, -1).join('_') || 'created_at'
  sortBy.value = `${baseField}_${newOrder}`
}

const clearFilters = () => {
  search.value = ''
  filters.value = { role: null, status: null }
  sortBy.value = 'created_at_desc'
  sortOrder.value = 'desc'
  page.value = 1
}

const openCreateDialog = () => {
  switch (activeTable.value) {
    case 'users':
      dialogs.userInfo.show = true
      break
    case 'kiosk_devices':
      dialogs.kioskInfo.show = true
      break
    case 'appointment_types':
      dialogs.appointmentType.mode = 'create'
      dialogs.appointmentType.title = 'Create Appointment Type'
      dialogs.appointmentType.data = {
        type_name: '',
        description: '',
        duration_minutes: 30,
        is_active: true
      }
      dialogs.appointmentType.show = true
      break
    case 'staff':
      dialogs.staff.mode = 'create'
      dialogs.staff.title = 'Create Staff'
      dialogs.staff.data = {
        user_id: null,
        first_name: '',
        last_name: '',
        middle_name: '',
        position: '',
        contact_number: '',
        username: '',
        password: '',
        role: 'NURSE'
      }
      dialogs.staff.show = true
      break
  }
}

const editAppointmentType = (item) => {
  dialogs.appointmentType.mode = 'edit'
  dialogs.appointmentType.title = 'Edit Appointment Type'
  dialogs.appointmentType.data = { ...item }
  dialogs.appointmentType.show = true
}

const editUser = (item) => {
  showToast('User details can be edited in patient or staff management', 'info')
}

const editStaff = (item) => {
  dialogs.staff.mode = 'edit'
  dialogs.staff.title = 'Edit Staff'
  dialogs.staff.data = { ...item }
  dialogs.staff.show = true
}

const editKioskDevice = (item) => {
  showToast('Device name can be edited in the device details', 'info')
}

const createUserForStaff = (staffMember) => {
  dialogs.createUser.staffId = staffMember.id
  dialogs.createUser.staffName = `${staffMember.first_name} ${staffMember.last_name}`
  dialogs.createUser.username = `${staffMember.first_name.toLowerCase()}.${staffMember.last_name.toLowerCase()}`
  dialogs.createUser.password = ''
  dialogs.createUser.role = 'NURSE'
  dialogs.createUser.show = true
}

const confirmDelete = (item, table) => {
  dialogs.delete.item = item
  dialogs.delete.table = table
  dialogs.delete.show = true
}

const confirmBulkDelete = () => {
  dialogs.bulkDelete.count = selectedItems.value.length
  dialogs.bulkDelete.hasUsers = activeTable.value === 'users'
  dialogs.bulkDelete.progress.show = false
  dialogs.bulkDelete.show = true
}

const resetPassword = (user) => {
  dialogs.passwordReset.userId = user.id
  dialogs.passwordReset.username = user.username
  dialogs.passwordReset.newPassword = ''
  dialogs.passwordReset.show = true
}

const goToPatientManagement = () => {
  dialogs.userInfo.show = false
  router.push('/admin/patients')
}

const goToStaffTab = () => {
  dialogs.userInfo.show = false
  activeTable.value = 'staff'
}

// Watchers
watch(activeTable, () => {
  page.value = 1
  search.value = ''
  filters.value = { role: null, status: null }
  sortBy.value = 'created_at_desc'
  sortOrder.value = 'desc'
  clearSelection()
  refreshTable()
})

watch([search, () => filters.value.role, () => filters.value.status, sortBy], () => {
  page.value = 1
}, { deep: true })

watch(page, () => {
  clearSelection()
})

// Initial load
onMounted(() => {
  refreshTable()
})
</script>

<style scoped>
/* Keep all existing styles */
.toast-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 350px;
}

.toast-notification {
  margin-bottom: 8px;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.gap-2 {
  gap: 8px;
}

.gap-1 {
  gap: 4px;
}

.ga-3 {
  gap: 16px;
}

:deep(.v-btn.bg-primary) {
  background-color: #1A4D3A !important;
  color: #FFFFFF !important;
}

:deep(.v-btn.text-primary) {
  color: #1A4D3A !important;
}

:deep(.v-btn--variant-outlined) {
  border-color: rgba(26, 77, 58, 0.2) !important;
}

:deep(.v-tabs) {
  border-bottom: 1px solid rgba(26, 77, 58, 0.1);
}

:deep(.v-tab--selected) {
  color: #1A4D3A !important;
  font-weight: 700;
}

:deep(.v-tab__slider) {
  background: #1A4D3A !important;
  height: 3px !important;
}

:deep(.v-data-table) {
  background: transparent !important;
}

:deep(.v-data-table-header th) {
  background-color: #1A4D3A !important;
  color: #FFFFFF !important;
  font-weight: 600 !important;
  text-transform: uppercase;
  font-size: 0.75rem !important;
  letter-spacing: 0.5px;
}

:deep(.v-data-table__tr:hover) {
  background-color: #F0F4F2 !important;
}

:deep(.v-field--focused) {
  color: #1A4D3A !important;
}

:deep(.v-field__outline) {
  --v-field-border-opacity: 0.15;
}

.edit-dialog :deep(.v-card-title),
.delete-dialog :deep(.v-card-title),
.info-dialog :deep(.v-card-title) {
  background-color: #1A4D3A !important;
  color: #FFFFFF !important;
  padding: 16px !important;
}

.bg-error-lighten-5 {
  background-color: #FFF5F5 !important;
}

.bg-success-lighten-5 {
  background-color: #F1F8F5 !important;
}

.bg-info-lighten-5 {
  background-color: #F0F7F9 !important;
}

:deep(.v-chip.bg-success) {
  background-color: #2E7D32 !important;
  color: white !important;
}

:deep(.v-chip.bg-primary) {
  background-color: #1A4D3A !important;
  color: white !important;
}

:deep(.v-timeline-item__dot--info) {
  background-color: #1A4D3A !important;
}

::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #F8FAF9;
}

::-webkit-scrollbar-thumb {
  background: #1A4D3A;
  border-radius: 4px;
}

:root.dark-theme {
  --color-primary: #2D634F;
}

:root.dark-theme :deep(.v-card) {
  background-color: #121212 !important;
  border-color: rgba(255, 255, 255, 0.1) !important;
}

:root.dark-theme :deep(.v-data-table-header th) {
  background-color: #0D261D !important;
}
</style>