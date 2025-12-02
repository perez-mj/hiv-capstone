<!-- frontend/src/pages/admin/AdminManagement.vue -->
<template>
  <v-container fluid class="pa-6">
    <!-- Page Header -->
    <div class="page-header d-flex justify-space-between align-center mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold text-primary">Admin Management</h1>
        <p class="text-body-1 text-medium-emphasis mt-2">
          Manage system administrators and user access
        </p>
      </div>
      <v-btn 
        color="primary" 
        prepend-icon="mdi-account-plus"
        @click="addAdmin"
      >
        Add Admin
      </v-btn>
    </div>

    <!-- Add/Edit Admin Dialog -->
    <v-dialog v-model="showAdminDialog" max-width="600" persistent>
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
          <span>{{ isEditMode ? 'Edit Administrator' : 'Add Administrator' }}</span>
          <v-btn icon @click="closeAdminDialog">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <v-card-text>
          <v-form ref="adminForm" v-model="valid" @submit.prevent="saveAdmin">
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="adminForm.full_name"
                  label="Full Name *"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                  prepend-inner-icon="mdi-account"
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-text-field
                  v-model="adminForm.username"
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
                  v-model="adminForm.email"
                  label="Email Address"
                  variant="outlined"
                  density="comfortable"
                  :rules="[emailRule]"
                  prepend-inner-icon="mdi-email"
                />
              </v-col>

              <v-col cols="12" v-if="!isEditMode">
                <v-text-field
                  v-model="adminForm.password"
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
                  v-model="adminForm.confirmPassword"
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
                  v-model="adminForm.is_active"
                  label="Active Account"
                  color="success"
                  hide-details
                  :disabled="isEditMode && adminForm.id === currentUser.id"
                />
              </v-col>

              <v-col cols="12">
                <v-alert 
                  :type="isEditMode ? 'info' : 'success'" 
                  variant="tonal" 
                  density="compact"
                >
                  <div class="d-flex align-center">
                    <v-icon class="me-2">{{ isEditMode ? 'mdi-information' : 'mdi-shield-check' }}</v-icon>
                    <span>
                      <strong>{{ isEditMode ? 'Security Update:' : 'Complete Admin Setup:' }}</strong> 
                      {{ isEditMode 
                        ? 'Changes will update admin access and permissions.'
                        : 'New administrator will receive system access with full privileges.'
                      }}
                    </span>
                  </div>
                </v-alert>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="outlined" @click="closeAdminDialog" :disabled="saving">
            Cancel
          </v-btn>
          <v-btn 
            color="primary" 
            @click="saveAdmin" 
            :loading="saving"
            :disabled="!valid || saving"
            prepend-icon="mdi-content-save"
          >
            {{ isEditMode ? 'Update' : 'Create' }} Admin
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Stats Cards -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="2" border>
          <v-card-text class="text-center">
            <v-icon color="primary" size="48" class="mb-2">mdi-account-group</v-icon>
            <div class="text-h5 font-weight-bold">{{ stats.total }}</div>
            <div class="text-body-2 text-medium-emphasis">Total Admins</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="2" border>
          <v-card-text class="text-center">
            <v-icon color="success" size="48" class="mb-2">mdi-shield-check</v-icon>
            <div class="text-h5 font-weight-bold">{{ stats.active }}</div>
            <div class="text-body-2 text-medium-emphasis">Active</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="2" border>
          <v-card-text class="text-center">
            <v-icon color="warning" size="48" class="mb-2">mdi-account-clock</v-icon>
            <div class="text-h5 font-weight-bold">{{ stats.recentlyActive }}</div>
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
          <v-col cols="12" md="3">
            <v-select
              v-model="sortBy"
              density="comfortable"
              variant="outlined"
              :items="sortOptions"
              placeholder="Sort By"
              hide-details
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
        <span class="text-h6">Administrators</span>
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
            Showing {{ filteredAdmins.length }} of {{ admins.length }} administrators
          </span>
        </div>
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-0">
        <v-data-table
          :headers="headers"
          :items="filteredAdmins"
          :loading="loading"
          :search="search"
          :sort-by="[{ key: sortBy, order: 'desc' }]"
          class="elevation-0"
        >
          <!-- Loading State -->
          <template v-slot:loading>
            <v-skeleton-loader type="table-row@6" />
          </template>

          <!-- Admin Info Column -->
          <template v-slot:item.adminInfo="{ item }">
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
                  {{ item.email }}
                </div>
              </div>
            </div>
          </template>

          <!-- Status Column -->
          <template v-slot:item.is_active="{ item }">
            <v-chip 
              :color="getStatusColor(item.is_active)" 
              size="small"
              variant="flat"
              :prepend-icon="getStatusIcon(item.is_active)"
            >
              {{ item.is_active ? 'Active' : 'Inactive' }}
            </v-chip>
          </template>

          <!-- Last Login Column -->
          <template v-slot:item.last_login="{ item }">
            <div v-if="item.last_login" class="text-no-wrap">
              {{ formatDate(item.last_login) }}
            </div>
            <div v-else class="text-caption text-medium-emphasis">
              Never
            </div>
            <div v-if="item.last_login" class="text-caption text-medium-emphasis">
              {{ formatTimeAgo(item.last_login) }}
            </div>
          </template>

          <!-- Created Date Column -->
          <template v-slot:item.created_at="{ item }">
            <div class="text-no-wrap">
              {{ formatDate(item.created_at) }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ formatTimeAgo(item.created_at) }}
            </div>
          </template>

          <!-- Actions Column -->
          <template v-slot:item.actions="{ item }">
            <div class="d-flex gap-2">
              <v-btn
                size="small"
                variant="outlined"
                color="primary"
                prepend-icon="mdi-pencil"
                @click="editAdmin(item)"
                :disabled="item.id === currentUser.id"
              >
                Edit
              </v-btn>
              <v-btn
                size="small"
                variant="outlined"
                :color="item.is_active ? 'warning' : 'success'"
                :prepend-icon="item.is_active ? 'mdi-account-cancel' : 'mdi-account-check'"
                @click="toggleAdminStatus(item)"
                :disabled="item.id === currentUser.id"
                :loading="item.togglingStatus"
              >
                {{ item.is_active ? 'Deactivate' : 'Activate' }}
              </v-btn>
              <v-btn
                size="small"
                variant="outlined"
                color="error"
                prepend-icon="mdi-delete"
                @click="deleteAdmin(item)"
                :disabled="item.id === currentUser.id"
                :loading="item.deleting"
              >
                Delete
              </v-btn>
            </div>
          </template>

          <!-- Empty State -->
          <template v-slot:no-data>
            <div class="text-center py-8">
              <v-icon size="64" color="grey-lighten-2" class="mb-4">mdi-account-group-off</v-icon>
              <div class="text-h6 text-grey">No administrators found</div>
              <div class="text-body-2 text-grey mt-2">
                {{ hasActiveFilters ? 'Try adjusting your filters' : 'No administrators configured' }}
              </div>
              <v-btn 
                color="primary" 
                class="mt-4"
                @click="showAddDialog = true"
              >
                <v-icon start>mdi-account-plus</v-icon>
                Add First Administrator
              </v-btn>
            </div>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- Add/Edit Admin Dialog -->
    <v-dialog v-model="showAdminDialog" max-width="600" persistent>
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
          <span>{{ isEditMode ? 'Edit Administrator' : 'Add Administrator' }}</span>
          <v-btn icon @click="closeAdminDialog">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <v-card-text>
          <v-form ref="adminForm" v-model="valid" @submit.prevent="saveAdmin">
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="adminForm.full_name"
                  label="Full Name *"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                  prepend-inner-icon="mdi-account"
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-text-field
                  v-model="adminForm.username"
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
                  v-model="adminForm.email"
                  label="Email Address"
                  variant="outlined"
                  density="comfortable"
                  :rules="[emailRule]"
                  prepend-inner-icon="mdi-email"
                />
              </v-col>

              <v-col cols="12" v-if="!isEditMode">
                <v-text-field
                  v-model="adminForm.password"
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
                  v-model="adminForm.confirmPassword"
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
                  v-model="adminForm.is_active"
                  label="Active Account"
                  color="success"
                  hide-details
                  :disabled="isEditMode && adminForm.id === currentUser.id"
                />
              </v-col>

              <v-col cols="12">
                <v-alert 
                  :type="isEditMode ? 'info' : 'success'" 
                  variant="tonal" 
                  density="compact"
                >
                  <div class="d-flex align-center">
                    <v-icon class="me-2">{{ isEditMode ? 'mdi-information' : 'mdi-shield-check' }}</v-icon>
                    <span>
                      <strong>{{ isEditMode ? 'Security Update:' : 'Complete Admin Setup:' }}</strong> 
                      {{ isEditMode 
                        ? 'Changes will update admin access and permissions.'
                        : 'New administrator will receive system access with full privileges.'
                      }}
                    </span>
                  </div>
                </v-alert>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="outlined" @click="closeAdminDialog" :disabled="saving">
            Cancel
          </v-btn>
          <v-btn 
            color="primary" 
            @click="saveAdmin" 
            :loading="saving"
            :disabled="!valid || saving"
            prepend-icon="mdi-content-save"
          >
            {{ isEditMode ? 'Update' : 'Create' }} Admin
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Admin Details Dialog -->
    <v-dialog v-model="showDetailsDialog" max-width="500">
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
          <span>Admin Details</span>
          <v-btn icon @click="showDetailsDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text>
          <div v-if="selectedAdmin" class="text-center">
            <v-avatar :color="selectedAdmin.is_active ? 'primary' : 'grey'" size="64" class="mb-4">
              <span class="text-h6 text-white">{{ getInitials(selectedAdmin.full_name) }}</span>
            </v-avatar>
            <div class="text-h6 mb-2">{{ selectedAdmin.full_name }}</div>
            <div class="text-body-2 text-medium-emphasis mb-1">@{{ selectedAdmin.username }}</div>
            <div class="text-body-2 text-medium-emphasis mb-4">{{ selectedAdmin.email || 'No email' }}</div>
            
            <v-divider class="my-4" />
            
            <v-row class="text-left">
              <v-col cols="6">
                <div class="text-caption text-medium-emphasis">Status</div>
                <v-chip 
                  :color="getStatusColor(selectedAdmin.is_active)" 
                  size="small"
                  class="mt-1"
                >
                  {{ selectedAdmin.is_active ? 'Active' : 'Inactive' }}
                </v-chip>
              </v-col>
              <v-col cols="6">
                <div class="text-caption text-medium-emphasis">Last Login</div>
                <div class="text-body-2 mt-1">
                  {{ selectedAdmin.last_login ? formatDateTime(selectedAdmin.last_login) : 'Never' }}
                </div>
              </v-col>
              <v-col cols="6">
                <div class="text-caption text-medium-emphasis">Created</div>
                <div class="text-body-2 mt-1">
                  {{ formatDate(selectedAdmin.created_at) }}
                </div>
              </v-col>
              <v-col cols="6">
                <div class="text-caption text-medium-emphasis">Last Updated</div>
                <div class="text-body-2 mt-1">
                  {{ formatDate(selectedAdmin.updated_at) }}
                </div>
              </v-col>
            </v-row>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" @click="showDetailsDialog = false">
            Close
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
import { adminApi } from '@/api'

const authStore = useAuthStore()

const loading = ref(false)
const saving = ref(false)
const search = ref('')
const statusFilter = ref('')
const sortBy = ref('created_at')
const admins = ref([])
const showAdminDialog = ref(false) // Fixed: Using only one dialog control variable
const showDetailsDialog = ref(false)
const isEditMode = ref(false)
const valid = ref(false)
const selectedAdmin = ref(null)
const showPassword = ref(false)
const showConfirmPassword = ref(false)

const snackbar = ref({
  show: false,
  message: '',
  color: 'success'
})

const adminForm = ref({
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
const stats = computed(() => {
  const total = admins.value.length
  const active = admins.value.filter(a => a.is_active).length
  const recentlyActive = admins.value.filter(a => {
    if (!a.last_login) return false
    const lastLogin = new Date(a.last_login)
    const today = new Date()
    return lastLogin.toDateString() === today.toDateString()
  }).length
  const newThisWeek = admins.value.filter(a => {
    const created = new Date(a.created_at)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return created >= weekAgo
  }).length

  return { total, active, recentlyActive, newThisWeek }
})

// Table headers
const headers = ref([
  { title: 'Administrator', key: 'adminInfo', sortable: true },
  { title: 'Username', key: 'username', sortable: true },
  { title: 'Email', key: 'email', sortable: true },
  { title: 'Status', key: 'is_active', sortable: true },
  { title: 'Last Login', key: 'last_login', sortable: true },
  { title: 'Created', key: 'created_at', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' }
])

// Filter and sort options
const statusOptions = [
  { title: 'Active', value: 'active' },
  { title: 'Inactive', value: 'inactive' }
]

const sortOptions = [
  { title: 'Newest First', value: 'created_at' },
  { title: 'Oldest First', value: 'created_at_asc' },
  { title: 'Name A-Z', value: 'full_name' },
  { title: 'Name Z-A', value: 'full_name_desc' },
  { title: 'Last Login', value: 'last_login' },
  { title: 'Username', value: 'username' }
]

// Computed properties
const filteredAdmins = computed(() => {
  let filtered = admins.value

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

  // Sorting
  return sortAdmins(filtered, sortBy.value)
})

const hasActiveFilters = computed(() => {
  return search.value || statusFilter.value
})

function addAdmin() {
  selectedAdmin.value = null
  isEditMode.value = false
  adminForm.value = {
    id: null,
    username: '',
    full_name: '',
    email: '',
    is_active: true,
    password: '',
    confirmPassword: ''
  }
  showAdminDialog.value = true // Fixed: Setting the correct dialog control variable
}

function editAdmin(admin) {
  selectedAdmin.value = admin
  adminForm.value = { 
    id: admin.id,
    username: admin.username,
    full_name: admin.full_name,
    email: admin.email || '',
    is_active: admin.is_active
  }
  isEditMode.value = true
  showAdminDialog.value = true
}

function closeAdminDialog() {
  showAdminDialog.value = false
  isEditMode.value = false
  adminForm.value = {
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


// Methods
function getStatusColor(isActive) {
  return isActive ? 'success' : 'error'
}

function getStatusIcon(isActive) {
  return isActive ? 'mdi-check-circle' : 'mdi-close-circle'
}

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

function formatTimeAgo(dateString) {
  if (!dateString) return 'Never'
  const now = new Date()
  const time = new Date(dateString)
  const diffMs = now - time
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${Math.floor(diffHours / 24)}d ago`
}

function getInitials(name) {
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

function sortAdmins(admins, sortKey) {
  const sorted = [...admins]
  switch (sortKey) {
    case 'created_at':
      return sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    case 'created_at_asc':
      return sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    case 'full_name':
      return sorted.sort((a, b) => a.full_name.localeCompare(b.full_name))
    case 'full_name_desc':
      return sorted.sort((a, b) => b.full_name.localeCompare(a.full_name))
    case 'last_login':
      return sorted.sort((a, b) => new Date(b.last_login || 0) - new Date(a.last_login || 0))
    case 'username':
      return sorted.sort((a, b) => a.username.localeCompare(b.username))
    default:
      return sorted
  }
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
const confirmPasswordRule = value => value === adminForm.value.password || 'Passwords must match'

function showSnackbar(message, color = 'success') {
  snackbar.value = {
    show: true,
    message,
    color
  }
}

function viewAdminDetails(admin) {
  selectedAdmin.value = admin
  showDetailsDialog.value = true
}

async function saveAdmin() {
  if (!valid.value) return

  saving.value = true
  try {
    if (isEditMode.value) {
      // Update existing admin
      const response = await adminApi.update(adminForm.value.id, {
        full_name: adminForm.value.full_name,
        email: adminForm.value.email,
        is_active: adminForm.value.is_active
      })
      
      const index = admins.value.findIndex(a => a.id === adminForm.value.id)
      if (index !== -1) {
        admins.value[index] = { ...admins.value[index], ...response.data.admin }
      }
      showSnackbar('Administrator updated successfully')
    } else {
      // Create new admin
      const response = await adminApi.create({
        username: adminForm.value.username,
        full_name: adminForm.value.full_name,
        email: adminForm.value.email,
        password: adminForm.value.password,
        is_active: adminForm.value.is_active
      })
      
      admins.value.unshift(response.data.admin)
      showSnackbar('Administrator created successfully')
    }
    
    closeAdminDialog()
    
  } catch (error) {
    console.error('Error saving admin:', error)
    showSnackbar('Failed to save administrator: ' + (error.response?.data?.error || error.message), 'error')
  } finally {
    saving.value = false
  }
}

async function toggleAdminStatus(admin) {
  admin.togglingStatus = true
  
  try {
    const response = await adminApi.update(admin.id, {
      is_active: !admin.is_active
    })
    
    admin.is_active = !admin.is_active
    showSnackbar(`Administrator ${admin.is_active ? 'activated' : 'deactivated'} successfully`)
    
  } catch (error) {
    console.error('Error toggling admin status:', error)
    showSnackbar('Failed to update administrator status', 'error')
  } finally {
    admin.togglingStatus = false
  }
}

async function deleteAdmin(admin) {
  if (!confirm(`Are you sure you want to delete administrator ${admin.full_name}? This action cannot be undone.`)) {
    return
  }

  admin.deleting = true
  
  try {
    await adminApi.delete(admin.id)
    const index = admins.value.findIndex(a => a.id === admin.id)
    if (index !== -1) {
      admins.value.splice(index, 1)
    }
    
    showSnackbar('Administrator deleted successfully')
    
  } catch (error) {
    console.error('Error deleting admin:', error)
    showSnackbar('Failed to delete administrator', 'error')
  } finally {
    admin.deleting = false
  }
}

async function loadAdmins() {
  loading.value = true
  try {
    const response = await adminApi.getAll()
    admins.value = response.data.admins
    
  } catch (error) {
    console.error('Error loading admins:', error)
    showSnackbar('Failed to load administrators', 'error')
  } finally {
    loading.value = false
  }
}

async function refreshData() {
  await loadAdmins()
  showSnackbar('Data refreshed successfully')
}

// Lifecycle
onMounted(() => {
  loadAdmins()
})
</script>

<style scoped>
.page-header {
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
  padding-bottom: 16px;
}

.gap-2 {
  gap: 8px;
}

:deep(.v-data-table-header) {
  background-color: rgba(0, 0, 0, 0.02);
}

:deep(.v-data-table .v-table__wrapper > table > thead > tr > th) {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.87);
}
</style>