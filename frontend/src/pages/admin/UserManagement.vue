<!-- frontend/src/pages/admin/UserManagement.vue -->
<template>
  <v-container fluid class="pa-6">
    <!-- Page Header -->
    <div class="page-header d-flex justify-space-between align-center mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold text-primary">User Management</h1>
        <p class="text-body-1 text-medium-emphasis mt-2">
          Manage system users and access permissions
        </p>
      </div>
      <v-btn 
        color="primary" 
        prepend-icon="mdi-account-plus"
        @click="addUser"
      >
        Add User
      </v-btn>
    </div>

    <!-- Stats Cards -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="2" border>
          <v-card-text class="text-center">
            <v-icon color="primary" size="48" class="mb-2">mdi-account-group</v-icon>
            <div class="text-h5 font-weight-bold">{{ stats.total }}</div>
            <div class="text-body-2 text-medium-emphasis">Total Users</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="2" border>
          <v-card-text class="text-center">
            <v-icon color="success" size="48" class="mb-2">mdi-shield-check</v-icon>
            <div class="text-h5 font-weight-bold">{{ stats.active }}</div>
            <div class="text-body-2 text-medium-emphasis">Active Users</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="2" border>
          <v-card-text class="text-center">
            <v-icon color="warning" size="48" class="mb-2">mdi-account-clock</v-icon>
            <div class="text-h5 font-weight-bold">{{ stats.activeToday }}</div>
            <div class="text-body-2 text-medium-emphasis">Active Today</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="2" border>
          <v-card-text class="text-center">
            <v-icon color="info" size="48" class="mb-2">mdi-calendar-plus</v-icon>
            <div class="text-h5 font-weight-bold">{{ stats.newThisWeek }}</div>
            <div class="text-body-2 text-medium-emphasis">New This Week</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Search and Filters -->
    <v-card elevation="2" class="mb-4" border>
      <v-card-text>
        <v-row dense align="center">
          <v-col cols="12" md="4">
            <v-text-field
              v-model="search"
              density="comfortable"
              variant="outlined"
              placeholder="Search by name, username, or email..."
              prepend-inner-icon="mdi-magnify"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-select
              v-model="statusFilter"
              density="comfortable"
              variant="outlined"
              :items="statusOptions"
              placeholder="Filter by Status"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" md="2" class="text-right">
            <v-btn
              variant="outlined"
              prepend-icon="mdi-filter-remove"
              @click="clearFilters"
              :disabled="!hasActiveFilters"
            >
              Clear
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Main Table -->
    <v-card elevation="2" border>
      <v-card-title class="d-flex justify-space-between align-center">
        <span class="text-h6">Users</span>
        <div class="d-flex align-center gap-2">
          <v-btn
            variant="outlined"
            prepend-icon="mdi-refresh"
            @click="refreshData"
            :loading="loading"
            size="small"
          >
            Refresh
          </v-btn>
          <span class="text-body-2 text-medium-emphasis">
            Showing {{ filteredUsers.length }} of {{ users.length }} users
          </span>
        </div>
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-0">
        <v-data-table
          :headers="headers"
          :items="filteredUsers"
          :loading="loading"
          :search="search"
          :sort-by="[{ key: 'created_at', order: 'desc' }]"
          class="elevation-0"
        >
          <!-- Loading State -->
          <template v-slot:loading>
            <v-skeleton-loader type="table-row@6" />
          </template>

          <!-- User Info Column -->
          <template v-slot:item.userInfo="{ item }">
            <div class="d-flex align-center">
              <v-avatar 
                :color="item.is_active ? 'primary' : 'grey'" 
                size="40" 
                class="mr-3"
              >
                <span class="text-caption text-white">
                  {{ getInitials(item.full_name) }}
                </span>
              </v-avatar>
              <div>
                <div class="font-weight-medium">{{ item.full_name }}</div>
                <div class="text-caption text-medium-emphasis">
                  {{ item.email || 'No email' }}
                </div>
              </div>
            </div>
          </template>

          <!-- Status Column -->
          <template v-slot:item.is_active="{ item }">
            <v-chip 
              :color="item.is_active ? 'success' : 'error'" 
              size="small"
              variant="flat"
              :prepend-icon="item.is_active ? 'mdi-check-circle' : 'mdi-close-circle'"
            >
              {{ item.is_active ? 'Active' : 'Inactive' }}
            </v-chip>
          </template>

          <!-- Last Login Column -->
          <template v-slot:item.last_login="{ item }">
            <div v-if="item.last_login" class="text-no-wrap">
              {{ formatDateTime(item.last_login) }}
            </div>
            <div v-else class="text-caption text-medium-emphasis">
              Never
            </div>
          </template>

          <!-- Created Date Column -->
          <template v-slot:item.created_at="{ item }">
            <div class="text-no-wrap">
              {{ formatDate(item.created_at) }}
            </div>
          </template>

          <!-- Actions Column -->
          <template v-slot:item.actions="{ item }">
            <div class="d-flex gap-1">
              <v-btn
                size="small"
                variant="text"
                color="primary"
                icon="mdi-pencil"
                @click="editUser(item)"
                :disabled="item.id === currentUser.id"
                title="Edit user"
              />
              <v-btn
                size="small"
                variant="text"
                :color="item.is_active ? 'warning' : 'success'"
                :icon="item.is_active ? 'mdi-account-cancel' : 'mdi-account-check'"
                @click="toggleUserStatus(item)"
                :disabled="item.id === currentUser.id"
                :loading="item.togglingStatus"
                :title="item.is_active ? 'Deactivate' : 'Activate'"
              />
              <v-btn
                size="small"
                variant="text"
                color="error"
                icon="mdi-delete"
                @click="deleteUser(item)"
                :disabled="item.id === currentUser.id"
                :loading="item.deleting"
                title="Delete user"
              />
            </div>
          </template>

          <!-- Empty State -->
          <template v-slot:no-data>
            <div class="text-center py-8">
              <v-icon size="64" color="grey-lighten-2" class="mb-4">mdi-account-group-off</v-icon>
              <div class="text-h6 text-grey">No users found</div>
              <div class="text-body-2 text-grey mt-2">
                {{ hasActiveFilters ? 'Try adjusting your filters' : 'No users configured' }}
              </div>
              <v-btn 
                color="primary" 
                class="mt-4"
                @click="addUser"
              >
                <v-icon start>mdi-account-plus</v-icon>
                Add First User
              </v-btn>
            </div>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- Add/Edit User Dialog -->
    <v-dialog v-model="showUserDialog" max-width="500" persistent>
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
          <span>{{ isEditMode ? 'Edit User' : 'Add User' }}</span>
          <v-btn icon @click="closeUserDialog">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <v-card-text>
          <v-form ref="userForm" v-model="valid" @submit.prevent="saveUser">
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="userForm.full_name"
                  label="Full Name *"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                  prepend-inner-icon="mdi-account"
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-text-field
                  v-model="userForm.username"
                  label="Username *"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule, usernameRule]"
                  prepend-inner-icon="mdi-at"
                  :disabled="isEditMode"
                />
              </v-col>

              <v-col cols="12">
                <v-text-field
                  v-model="userForm.email"
                  label="Email Address"
                  variant="outlined"
                  density="comfortable"
                  :rules="[emailRule]"
                  prepend-inner-icon="mdi-email"
                />
              </v-col>

              <v-col cols="12" v-if="!isEditMode">
                <v-text-field
                  v-model="userForm.password"
                  label="Password *"
                  :type="showPassword ? 'text' : 'password'"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule, passwordRule]"
                  prepend-inner-icon="mdi-lock"
                  :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                  @click:append-inner="showPassword = !showPassword"
                />
              </v-col>

              <v-col cols="12" v-if="!isEditMode">
                <v-text-field
                  v-model="userForm.confirmPassword"
                  label="Confirm Password *"
                  :type="showConfirmPassword ? 'text' : 'password'"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule, confirmPasswordRule]"
                  prepend-inner-icon="mdi-lock-check"
                  :append-inner-icon="showConfirmPassword ? 'mdi-eye-off' : 'mdi-eye'"
                  @click:append-inner="showConfirmPassword = !showConfirmPassword"
                />
              </v-col>

              <v-col cols="12">
                <v-switch
                  v-model="userForm.is_active"
                  label="Active Account"
                  color="success"
                  hide-details
                  :disabled="isEditMode && userForm.id === currentUser.id"
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="outlined" @click="closeUserDialog" :disabled="saving">
            Cancel
          </v-btn>
          <v-btn 
            color="primary" 
            @click="saveUser" 
            :loading="saving"
            :disabled="!valid || saving"
            prepend-icon="mdi-content-save"
          >
            {{ isEditMode ? 'Update' : 'Create' }} User
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar for notifications -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/api'

const authStore = useAuthStore()

const loading = ref(false)
const saving = ref(false)
const search = ref('')
const statusFilter = ref('')
const users = ref([])
const showUserDialog = ref(false)
const isEditMode = ref(false)
const valid = ref(false)
const selectedUser = ref(null)
const showPassword = ref(false)
const showConfirmPassword = ref(false)

const snackbar = ref({
  show: false,
  message: '',
  color: 'success'
})

const userForm = ref({
  id: null,
  username: '',
  full_name: '',
  email: '',
  is_active: true,
  password: '',
  confirmPassword: ''
})

// Current user (from auth store)
const currentUser = computed(() => authStore.user || { id: 1 })

// Stats
const stats = ref({
  total: 0,
  active: 0,
  activeToday: 0,
  newThisWeek: 0
})

// Table headers
const headers = ref([
  { title: 'User', key: 'userInfo', sortable: true },
  { title: 'Username', key: 'username', sortable: true },
  { title: 'Email', key: 'email', sortable: true },
  { title: 'Status', key: 'is_active', sortable: true },
  { title: 'Last Login', key: 'last_login', sortable: true },
  { title: 'Created', key: 'created_at', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end', width: '120' }
])

// Filter options
const statusOptions = [
  { title: 'Active', value: 'active' },
  { title: 'Inactive', value: 'inactive' }
]

// Computed properties
const filteredUsers = computed(() => {
  let filtered = users.value

  // Status filter
  if (statusFilter.value) {
    filtered = filtered.filter(a => 
      statusFilter.value === 'active' ? a.is_active : !a.is_active
    )
  }

  // Search filter
  if (search.value) {
    const query = search.value.toLowerCase()
    filtered = filtered.filter(a => 
      a.full_name.toLowerCase().includes(query) ||
      a.email?.toLowerCase().includes(query) ||
      a.username.toLowerCase().includes(query)
    )
  }

  return filtered
})

const hasActiveFilters = computed(() => {
  return search.value || statusFilter.value
})

// Methods
function formatDate(dateString) {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function formatDateTime(dateString) {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getInitials(name) {
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

function clearFilters() {
  search.value = ''
  statusFilter.value = ''
}

// Validation rules
const requiredRule = value => !!value || 'This field is required'
const emailRule = value => !value || /.+@.+\..+/.test(value) || 'Valid email is required'
const usernameRule = value => /^[a-zA-Z0-9_]+$/.test(value) || 'Username can only contain letters, numbers, and underscores'
const passwordRule = value => value.length >= 6 || 'Password must be at least 6 characters'
const confirmPasswordRule = value => value === userForm.value.password || 'Passwords must match'

function showSnackbar(message, color = 'success') {
  snackbar.value = {
    show: true,
    message,
    color
  }
}

function addUser() {
  selectedUser.value = null
  isEditMode.value = false
  userForm.value = {
    id: null,
    username: '',
    full_name: '',
    email: '',
    is_active: true,
    password: '',
    confirmPassword: ''
  }
  showUserDialog.value = true
}

function editUser(user) {
  selectedUser.value = user
  userForm.value = { 
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    email: user.email || '',
    is_active: user.is_active
  }
  isEditMode.value = true
  showUserDialog.value = true
}

function closeUserDialog() {
  showUserDialog.value = false
  isEditMode.value = false
  userForm.value = {
    id: null,
    username: '',
    full_name: '',
    email: '',
    is_active: true,
    password: '',
    confirmPassword: ''
  }
  showPassword.value = false
  showConfirmPassword.value = false
}

async function saveUser() {
  if (!valid.value) return

  saving.value = true
  try {
    if (isEditMode.value) {
      // Update existing user
      const response = await api.users.update(userForm.value.id, {
        full_name: userForm.value.full_name,
        email: userForm.value.email,
        is_active: userForm.value.is_active
      })
      
      // Update local user data
      const index = users.value.findIndex(a => a.id === userForm.value.id)
      if (index !== -1) {
        users.value[index] = { ...users.value[index], ...response.data.admin }
      }
      showSnackbar('User updated successfully')
    } else {
      // Create new user
      const response = await api.users.create({
        username: userForm.value.username,
        full_name: userForm.value.full_name,
        email: userForm.value.email,
        password: userForm.value.password,
        is_active: userForm.value.is_active
      })
      
      // Add new user to beginning of list
      users.value.unshift(response.data.admin)
      showSnackbar('User created successfully')
    }
    
    closeUserDialog()
    
  } catch (error) {
    console.error('Error saving user:', error)
    showSnackbar(
      'Failed to save user: ' + (error.response?.data?.error || error.message), 
      'error'
    )
  } finally {
    saving.value = false
  }
}

async function toggleUserStatus(user) {
  user.togglingStatus = true
  
  try {
    const response = await api.users.toggleStatus(user.id)
    
    // Update local user status
    user.is_active = !user.is_active
    showSnackbar(`User ${user.is_active ? 'activated' : 'deactivated'} successfully`)
    
  } catch (error) {
    console.error('Error toggling user status:', error)
    showSnackbar(
      'Failed to update user status: ' + (error.response?.data?.error || error.message), 
      'error'
    )
  } finally {
    user.togglingStatus = false
  }
}

async function deleteUser(user) {
  if (!confirm(`Are you sure you want to delete user ${user.full_name}? This action cannot be undone.`)) {
    return
  }

  user.deleting = true
  
  try {
    await api.users.delete(user.id)
    const index = users.value.findIndex(a => a.id === user.id)
    if (index !== -1) {
      users.value.splice(index, 1)
    }
    
    showSnackbar('User deleted successfully')
    
  } catch (error) {
    console.error('Error deleting user:', error)
    showSnackbar(
      'Failed to delete user: ' + (error.response?.data?.error || error.message), 
      'error'
    )
  } finally {
    user.deleting = false
  }
}

async function loadUsers() {
  loading.value = true
  try {
    // Load users
    const usersResponse = await api.users.getAll()
    users.value = usersResponse.data.admins
    
    // Load stats
    const statsResponse = await api.users.getStats()
    stats.value = statsResponse.data.stats
    
  } catch (error) {
    console.error('Error loading users:', error)
    showSnackbar(
      'Failed to load users: ' + (error.response?.data?.error || error.message), 
      'error'
    )
  } finally {
    loading.value = false
  }
}

async function refreshData() {
  await loadUsers()
  showSnackbar('Data refreshed successfully')
}

// Lifecycle
onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.page-header {
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
  padding-bottom: 16px;
}

.gap-1 {
  gap: 4px;
}

:deep(.v-data-table-header) {
  background-color: rgba(0, 0, 0, 0.02);
}

:deep(.v-data-table .v-table__wrapper > table > thead > tr > th) {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.87);
}
</style>