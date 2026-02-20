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
            <div class="text-h5 font-weight-bold">{{ stats.total || 0 }}</div>
            <div class="text-body-2 text-medium-emphasis">Total Users</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="2" border>
          <v-card-text class="text-center">
            <v-icon color="success" size="48" class="mb-2">mdi-shield-check</v-icon>
            <div class="text-h5 font-weight-bold">{{ stats.active || 0 }}</div>
            <div class="text-body-2 text-medium-emphasis">Active Users</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="2" border>
          <v-card-text class="text-center">
            <v-icon color="info" size="48" class="mb-2">mdi-account-group</v-icon>
            <div class="text-h5 font-weight-bold">{{ stats.byRole?.ADMIN || 0 }}</div>
            <div class="text-body-2 text-medium-emphasis">Admins</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="2" border>
          <v-card-text class="text-center">
            <v-icon color="warning" size="48" class="mb-2">mdi-nurse</v-icon>
            <div class="text-h5 font-weight-bold">{{ stats.byRole?.NURSE || 0 }}</div>
            <div class="text-body-2 text-medium-emphasis">Nurses</div>
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
              placeholder="Search by username or email..."
              prepend-inner-icon="mdi-magnify"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-select
              v-model="roleFilter"
              density="comfortable"
              variant="outlined"
              :items="roleOptions"
              item-title="title"
              item-value="value"
              placeholder="Filter by Role"
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
              item-title="title"
              item-value="value"
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
                  {{ getUserInitials(item) }}
                </span>
              </v-avatar>
              <div>
                <div class="font-weight-medium">{{ getUserDisplayName(item) }}</div>
                <div class="text-caption text-medium-emphasis">
                  {{ item.email || 'No email' }}
                </div>
              </div>
            </div>
          </template>

          <!-- Role Column -->
          <template v-slot:item.role="{ item }">
            <v-chip 
              :color="getRoleColor(item.role)" 
              size="small"
              variant="flat"
              :prepend-icon="getRoleIcon(item.role)"
            >
              {{ item.role }}
            </v-chip>
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
                :disabled="item.id === currentUser?.id"
                title="Edit user"
              />
              <v-btn
                size="small"
                variant="text"
                color="info"
                icon="mdi-lock-reset"
                @click="openPasswordDialog(item)"
                :disabled="item.id === currentUser?.id"
                title="Change password"
              />
              <v-btn
                size="small"
                variant="text"
                :color="item.is_active ? 'warning' : 'success'"
                :icon="item.is_active ? 'mdi-account-cancel' : 'mdi-account-check'"
                @click="toggleUserStatus(item)"
                :disabled="item.id === currentUser?.id"
                :loading="item.togglingStatus"
                :title="item.is_active ? 'Deactivate' : 'Activate'"
              />
              <v-btn
                size="small"
                variant="text"
                color="error"
                icon="mdi-delete"
                @click="deleteUser(item)"
                :disabled="item.id === currentUser?.id"
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
    <v-dialog v-model="showUserDialog" max-width="600" persistent>
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
                <v-select
                  v-model="userFormData.role"
                  label="Role *"
                  :items="roleOptions"
                  item-title="title"
                  item-value="value"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                  prepend-inner-icon="mdi-shield-account"
                  :disabled="isEditMode"
                  @update:model-value="onRoleChange"
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-text-field
                  v-model="userFormData.username"
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
                  v-model="userFormData.email"
                  label="Email Address"
                  variant="outlined"
                  density="comfortable"
                  :rules="[emailRule]"
                  prepend-inner-icon="mdi-email"
                />
              </v-col>

              <v-col cols="12" v-if="!isEditMode">
                <v-text-field
                  v-model="userFormData.password"
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
                  v-model="userFormData.confirmPassword"
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

              <!-- Staff Details (for ADMIN/NURSE roles) -->
              <template v-if="userFormData.role === 'ADMIN' || userFormData.role === 'NURSE'">
                <v-col cols="12">
                  <v-divider class="my-2">
                    <span class="text-caption text-medium-emphasis">Staff Details</span>
                  </v-divider>
                </v-col>

                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="userFormData.staff.first_name"
                    label="First Name *"
                    variant="outlined"
                    density="comfortable"
                    :rules="[requiredRule]"
                    prepend-inner-icon="mdi-account"
                  />
                </v-col>

                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="userFormData.staff.middle_name"
                    label="Middle Name"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-account"
                  />
                </v-col>

                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="userFormData.staff.last_name"
                    label="Last Name *"
                    variant="outlined"
                    density="comfortable"
                    :rules="[requiredRule]"
                    prepend-inner-icon="mdi-account"
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="userFormData.staff.position"
                    label="Position"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-badge-account"
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="userFormData.staff.contact_number"
                    label="Contact Number"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-phone"
                  />
                </v-col>
              </template>

              <!-- Patient Link (for PATIENT role) -->
              <template v-if="userFormData.role === 'PATIENT'">
                <v-col cols="12">
                  <v-divider class="my-2">
                    <span class="text-caption text-medium-emphasis">Link to Patient</span>
                  </v-divider>
                </v-col>

                <v-col cols="12">
                  <v-autocomplete
                    v-model="userFormData.patient_id"
                    :items="patients"
                    item-title="full_name"
                    item-value="patient_id"
                    label="Select Patient *"
                    variant="outlined"
                    density="comfortable"
                    :rules="[requiredRule]"
                    prepend-inner-icon="mdi-account"
                    :loading="loadingPatients"
                    :disabled="isEditMode"
                    clearable
                  >
                    <template v-slot:item="{ props, item }">
                      <v-list-item v-bind="props" :subtitle="item.raw.patient_id" />
                    </template>
                  </v-autocomplete>
                </v-col>
              </template>

              <v-col cols="12">
                <v-switch
                  v-model="userFormData.is_active"
                  label="Active Account"
                  color="success"
                  hide-details
                  :disabled="isEditMode && userFormData.id === currentUser?.id"
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

    <!-- Password Change Dialog -->
    <v-dialog v-model="showPasswordDialog" max-width="400" persistent>
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
          <span>Change Password for {{ selectedUser ? getUserDisplayName(selectedUser) : '' }}</span>
          <v-btn icon @click="showPasswordDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <v-card-text>
          <v-form ref="passwordForm" v-model="passwordValid" @submit.prevent="changePassword">
            <v-text-field
              v-model="passwordFormData.password"
              label="New Password *"
              :type="showNewPassword ? 'text' : 'password'"
              variant="outlined"
              density="comfortable"
              :rules="[requiredRule, passwordRule]"
              prepend-inner-icon="mdi-lock"
              :append-inner-icon="showNewPassword ? 'mdi-eye-off' : 'mdi-eye'"
              @click:append-inner="showNewPassword = !showNewPassword"
            />
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="outlined" @click="showPasswordDialog = false" :disabled="changingPassword">
            Cancel
          </v-btn>
          <v-btn 
            color="primary" 
            @click="changePassword" 
            :loading="changingPassword"
            :disabled="!passwordValid || changingPassword"
          >
            Update Password
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
import { ref, computed, onMounted, reactive, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/api'

const authStore = useAuthStore()

// Refs
const loading = ref(false)
const saving = ref(false)
const loadingPatients = ref(false)
const search = ref('')
const roleFilter = ref('')
const statusFilter = ref('')
const users = ref([])
const patients = ref([])
const showUserDialog = ref(false)
const showPasswordDialog = ref(false)
const isEditMode = ref(false)
const valid = ref(false)
const passwordValid = ref(false)
const selectedUser = ref(null)
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const showNewPassword = ref(false)
const changingPassword = ref(false)
const userForm = ref(null)
const passwordForm = ref(null)

// Reactive form data
const userFormData = reactive({
  id: null,
  username: '',
  email: '',
  role: 'NURSE',
  is_active: true,
  password: '',
  confirmPassword: '',
  staff: {
    first_name: '',
    last_name: '',
    middle_name: '',
    position: '',
    contact_number: ''
  },
  patient_id: null
})

const passwordFormData = reactive({
  password: ''
})

// Snackbar
const snackbar = reactive({
  show: false,
  message: '',
  color: 'success'
})

// Current user (from auth store)
const currentUser = computed(() => authStore.user || { id: 1 })

// Stats
const stats = ref({
  total: 0,
  active: 0,
  byRole: {
    ADMIN: 0,
    NURSE: 0,
    PATIENT: 0
  },
  activeToday: 0,
  newThisWeek: 0
})

// Table headers
const headers = ref([
  { title: 'User', key: 'userInfo', sortable: true },
  { title: 'Username', key: 'username', sortable: true },
  { title: 'Role', key: 'role', sortable: true },
  { title: 'Status', key: 'is_active', sortable: true },
  { title: 'Last Login', key: 'last_login', sortable: true },
  { title: 'Created', key: 'created_at', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end', width: '160' }
])

// Filter options
const roleOptions = [
  { title: 'Admin', value: 'ADMIN' },
  { title: 'Nurse', value: 'NURSE' },
  { title: 'Patient', value: 'PATIENT' }
]

const statusOptions = [
  { title: 'Active', value: 'active' },
  { title: 'Inactive', value: 'inactive' }
]

// Computed properties
const filteredUsers = computed(() => {
  let filtered = users.value

  // Role filter
  if (roleFilter.value) {
    filtered = filtered.filter(u => u.role === roleFilter.value)
  }

  // Status filter
  if (statusFilter.value) {
    filtered = filtered.filter(u => 
      statusFilter.value === 'active' ? u.is_active : !u.is_active
    )
  }

  // Search filter
  if (search.value) {
    const query = search.value.toLowerCase()
    filtered = filtered.filter(u => 
      u.email?.toLowerCase().includes(query) ||
      u.username.toLowerCase().includes(query)
    )
  }

  return filtered
})

const hasActiveFilters = computed(() => {
  return search.value || roleFilter.value || statusFilter.value
})

// Watch for role changes to reset validation
function onRoleChange() {
  if (userForm.value) {
    userForm.value.validate()
  }
}

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

function getUserDisplayName(user) {
  if (user.staff) {
    const { first_name, last_name, middle_name } = user.staff
    return [first_name, middle_name, last_name].filter(Boolean).join(' ')
  }
  if (user.patient) {
    const { first_name, last_name, middle_name } = user.patient
    return [first_name, middle_name, last_name].filter(Boolean).join(' ')
  }
  return user.username
}

function getUserInitials(user) {
  const name = getUserDisplayName(user)
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

function getRoleColor(role) {
  const colors = {
    ADMIN: 'error',
    NURSE: 'warning',
    PATIENT: 'success'
  }
  return colors[role] || 'grey'
}

function getRoleIcon(role) {
  const icons = {
    ADMIN: 'mdi-shield-crown',
    NURSE: 'mdi-nurse',
    PATIENT: 'mdi-account-heart'
  }
  return icons[role] || 'mdi-account'
}

function clearFilters() {
  search.value = ''
  roleFilter.value = ''
  statusFilter.value = ''
}

// Validation rules
const requiredRule = value => !!value || 'This field is required'
const emailRule = value => !value || /.+@.+\..+/.test(value) || 'Valid email is required'
const usernameRule = value => /^[a-zA-Z0-9_]+$/.test(value) || 'Username can only contain letters, numbers, and underscores'
const passwordRule = value => value.length >= 6 || 'Password must be at least 6 characters'
const confirmPasswordRule = value => value === userFormData.password || 'Passwords must match'

function showSnackbar(message, color = 'success') {
  snackbar.show = true
  snackbar.message = message
  snackbar.color = color
}

async function loadPatients() {
  loadingPatients.value = true
  try {
    const response = await api.patients.getAll()
    patients.value = response.data.patients || []
  } catch (error) {
    console.error('Error loading patients:', error)
  } finally {
    loadingPatients.value = false
  }
}

function resetForm() {
  userFormData.id = null
  userFormData.username = ''
  userFormData.email = ''
  userFormData.role = 'NURSE'
  userFormData.is_active = true
  userFormData.password = ''
  userFormData.confirmPassword = ''
  userFormData.staff = {
    first_name: '',
    last_name: '',
    middle_name: '',
    position: '',
    contact_number: ''
  }
  userFormData.patient_id = null
  
  passwordFormData.password = ''
  
  showPassword.value = false
  showConfirmPassword.value = false
  showNewPassword.value = false
}

function addUser() {
  resetForm()
  selectedUser.value = null
  isEditMode.value = false
  showUserDialog.value = true
}

function editUser(user) {
  selectedUser.value = user
  isEditMode.value = true
  
  // Populate form with user data
  userFormData.id = user.id
  userFormData.username = user.username
  userFormData.email = user.email || ''
  userFormData.role = user.role
  userFormData.is_active = user.is_active
  
  if (user.staff) {
    userFormData.staff = {
      first_name: user.staff.first_name || '',
      last_name: user.staff.last_name || '',
      middle_name: user.staff.middle_name || '',
      position: user.staff.position || '',
      contact_number: user.staff.contact_number || ''
    }
  } else {
    userFormData.staff = {
      first_name: '',
      last_name: '',
      middle_name: '',
      position: '',
      contact_number: ''
    }
  }
  
  userFormData.patient_id = user.patient?.patient_id || null
  
  showUserDialog.value = true
}

function closeUserDialog() {
  showUserDialog.value = false
  resetForm()
}

function openPasswordDialog(user) {
  selectedUser.value = user
  passwordFormData.password = ''
  showPasswordDialog.value = true
}

async function saveUser() {
  const { valid } = await userForm.value.validate()
  if (!valid) return

  saving.value = true
  try {
    const formData = {
      username: userFormData.username,
      email: userFormData.email || null,
      role: userFormData.role,
      is_active: userFormData.is_active
    }
    
    if (!isEditMode.value) {
      formData.password = userFormData.password
    }
    
    // Add role-specific data
    if (userFormData.role === 'ADMIN' || userFormData.role === 'NURSE') {
      // Only include staff fields that have values
      const staffData = {}
      if (userFormData.staff.first_name) staffData.first_name = userFormData.staff.first_name
      if (userFormData.staff.last_name) staffData.last_name = userFormData.staff.last_name
      if (userFormData.staff.middle_name) staffData.middle_name = userFormData.staff.middle_name
      if (userFormData.staff.position) staffData.position = userFormData.staff.position
      if (userFormData.staff.contact_number) staffData.contact_number = userFormData.staff.contact_number
      
      if (Object.keys(staffData).length > 0) {
        formData.staff = staffData
      }
    } else if (userFormData.role === 'PATIENT') {
      formData.patient_id = userFormData.patient_id
    }

    if (isEditMode.value) {
      // Update existing user
      const response = await api.users.update(userFormData.id, formData)
      
      // Update local user data
      const index = users.value.findIndex(u => u.id === userFormData.id)
      if (index !== -1) {
        users.value[index] = response.data.user
      }
      showSnackbar('User updated successfully')
    } else {
      // Create new user
      const response = await api.users.create(formData)
      
      // Add new user to beginning of list
      users.value.unshift(response.data.user)
      showSnackbar('User created successfully')
    }
    
    closeUserDialog()
    await loadStats()
    
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

async function changePassword() {
  const { valid } = await passwordForm.value.validate()
  if (!valid) return

  changingPassword.value = true
  try {
    await api.users.changePassword(selectedUser.value.id, {
      password: passwordFormData.password
    })
    
    showSnackbar('Password updated successfully')
    showPasswordDialog.value = false
    
  } catch (error) {
    console.error('Error changing password:', error)
    showSnackbar(
      'Failed to change password: ' + (error.response?.data?.error || error.message), 
      'error'
    )
  } finally {
    changingPassword.value = false
  }
}

async function toggleUserStatus(user) {
  user.togglingStatus = true
  
  try {
    const response = await api.users.toggleStatus(user.id)
    
    // Update local user status
    user.is_active = response.data.user.is_active
    showSnackbar(`User ${user.is_active ? 'activated' : 'deactivated'} successfully`)
    await loadStats()
    
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
  if (!confirm(`Are you sure you want to delete user ${getUserDisplayName(user)}? This action cannot be undone.`)) {
    return
  }

  user.deleting = true
  
  try {
    await api.users.delete(user.id)
    const index = users.value.findIndex(u => u.id === user.id)
    if (index !== -1) {
      users.value.splice(index, 1)
    }
    
    showSnackbar('User deleted successfully')
    await loadStats()
    
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
    const response = await api.users.getAll()
    users.value = response.data.users || []
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

async function loadStats() {
  try {
    const response = await api.users.getStats()
    stats.value = response.data.stats || {
      total: 0,
      active: 0,
      byRole: { ADMIN: 0, NURSE: 0, PATIENT: 0 },
      activeToday: 0,
      newThisWeek: 0
    }
  } catch (error) {
    console.error('Error loading stats:', error)
  }
}

async function refreshData() {
  await Promise.all([loadUsers(), loadStats()])
  showSnackbar('Data refreshed successfully')
}

// Lifecycle
onMounted(() => {
  loadUsers()
  loadStats()
  loadPatients()
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