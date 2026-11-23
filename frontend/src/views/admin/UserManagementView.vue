<!-- frontend/src/views/admin/UserManagementView.vue -->
<template>
  <v-container fluid class="pa-4 user-management-view">
    <v-row>
      <v-col cols="12">
        <!-- ─────────────────────────────────────────────
             Header
        ───────────────────────────────────────────── -->
        <v-card variant="flat" class="header-card mb-4">
          <v-card-text class="d-flex align-center flex-wrap ga-4 pa-4">
            <div class="flex-grow-1">
              <h2 class="text-h6 font-weight-bold mb-1">User Management</h2>
              <p class="text-caption text-medium-emphasis mb-0">
                Manage system accounts and access
              </p>
            </div>
            <div class="d-flex ga-2 align-center flex-wrap">
              <v-btn
                color="primary"
                variant="tonal"
                prepend-icon="mdi-refresh"
                class="text-none"
                :loading="loading"
                @click="loadUsers"
              >
                Refresh
              </v-btn>
              <v-btn
                color="primary"
                variant="flat"
                prepend-icon="mdi-account-plus"
                class="text-none"
                @click="openCreateDialog"
              >
                Add User
              </v-btn>
            </div>
          </v-card-text>
        </v-card>

        <!-- ─────────────────────────────────────────────
             Filters
        ───────────────────────────────────────────── -->
        <v-card variant="flat" class="filters-card mb-4">
          <v-card-text class="pa-4">
            <v-row dense>
              <v-col cols="12" md="5">
                <v-text-field
                  v-model="search"
                  label="Search"
                  placeholder="Search by username or email…"
                  prepend-inner-icon="mdi-magnify"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  clearable
                />
              </v-col>

              <v-col cols="12" sm="6" md="3">
                <v-select
                  v-model="filterRole"
                  label="Role"
                  :items="roles"
                  item-title="title"
                  item-value="value"
                  prepend-inner-icon="mdi-shield-account-outline"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  clearable
                />
              </v-col>

              <v-col cols="12" sm="6" md="3">
                <v-select
                  v-model="filterStatus"
                  label="Status"
                  :items="statusOptions"
                  item-title="title"
                  item-value="value"
                  prepend-inner-icon="mdi-check-circle-outline"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  clearable
                />
              </v-col>
            </v-row>

            <!-- Active filter chips -->
            <div v-if="hasActiveFilters" class="d-flex align-center flex-wrap ga-2 mt-3">
              <span class="text-caption text-medium-emphasis">Active filters:</span>

              <v-chip
                v-if="search"
                size="small"
                closable
                variant="tonal"
                color="primary"
                @click:close="search = ''"
              >
                <v-icon start size="14">mdi-magnify</v-icon>
                "{{ search }}"
              </v-chip>

              <v-chip
                v-if="filterRole"
                size="small"
                closable
                variant="tonal"
                :color="getRoleColor(filterRole)"
                @click:close="filterRole = null"
              >
                Role: {{ filterRole }}
              </v-chip>

              <v-chip
                v-if="filterStatus !== null && filterStatus !== undefined"
                size="small"
                closable
                variant="tonal"
                :color="filterStatus ? 'success' : 'error'"
                @click:close="filterStatus = null"
              >
                Status: {{ filterStatus ? 'Active' : 'Inactive' }}
              </v-chip>

              <v-btn
                size="small"
                variant="text"
                color="error"
                class="text-none"
                prepend-icon="mdi-close-circle-outline"
                @click="clearAllFilters"
              >
                Clear all
              </v-btn>
            </div>
          </v-card-text>
        </v-card>

        <!-- ─────────────────────────────────────────────
             Table
        ───────────────────────────────────────────── -->
        <v-card variant="flat" class="table-card">
          <v-data-table
            :headers="headers"
            :items="filteredUsers"
            :loading="loading"
            :search="search"
            class="modern-table"
          >
            <template #item.role="{ item }">
              <v-chip
                :color="getRoleColor(item.role)"
                size="small"
                variant="flat"
                class="text-capitalize"
              >
                {{ item.role }}
              </v-chip>
            </template>

            <template #item.office="{ item }">
              <span class="text-capitalize text-body-2">
                {{ item.office || '—' }}
              </span>
            </template>

            <template #item.is_active="{ item }">
              <v-chip
                :color="item.is_active ? 'success' : 'error'"
                size="small"
                variant="flat"
              >
                {{ item.is_active ? 'Active' : 'Inactive' }}
              </v-chip>
            </template>

            <template #item.last_login="{ item }">
              <span class="text-body-2">
                {{ formatDate(item.last_login ?? item.last_login_at) }}
              </span>
            </template>

            <template #item.actions="{ item }">
              <div class="d-flex justify-center ga-1">
                <v-tooltip text="Edit" location="top">
                  <template #activator="{ props }">
                    <v-btn
                      v-bind="props"
                      icon="mdi-pencil-outline"
                      size="small"
                      variant="text"
                      color="info"
                      @click="editUser(item)"
                    />
                  </template>
                </v-tooltip>

                <v-tooltip
                  :text="item.is_active ? 'Deactivate' : 'Activate'"
                  location="top"
                >
                  <template #activator="{ props }">
                    <v-btn
                      v-bind="props"
                      :icon="item.is_active ? 'mdi-account-off-outline' : 'mdi-account-check-outline'"
                      size="small"
                      variant="text"
                      :color="item.is_active ? 'error' : 'success'"
                      @click="confirmToggle(item)"
                    />
                  </template>
                </v-tooltip>
              </div>
            </template>

            <template #no-data>
              <div class="empty-state">
                <v-icon size="48" color="grey-lighten-1">mdi-account-off-outline</v-icon>
                <p class="text-body-2 text-medium-emphasis mt-3 mb-0">
                  {{ hasActiveFilters ? 'No users match your filters' : 'No users yet' }}
                </p>
                <v-btn
                  v-if="hasActiveFilters"
                  variant="tonal"
                  size="small"
                  color="primary"
                  prepend-icon="mdi-filter-off-outline"
                  class="mt-3 text-none"
                  @click="clearAllFilters"
                >
                  Clear filters
                </v-btn>
                <v-btn
                  v-else
                  variant="tonal"
                  size="small"
                  color="primary"
                  prepend-icon="mdi-account-plus"
                  class="mt-3 text-none"
                  @click="openCreateDialog"
                >
                  Add your first user
                </v-btn>
              </div>
            </template>

            <template #bottom>
              <div class="table-footer">
                <span class="text-caption text-medium-emphasis">
                  Showing <strong>{{ filteredUsers.length }}</strong>
                  of <strong>{{ users.length }}</strong> users
                </span>
              </div>
            </template>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>

    <!-- ─────────────────────────────────────────────
         Create / Edit User Dialog
    ───────────────────────────────────────────── -->
    <v-dialog v-model="dialog" max-width="600" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          {{ dialogTitle }}
          <v-spacer />
          <v-btn
            icon="mdi-close"
            variant="text"
            aria-label="Close"
            @click="closeDialog"
          />
        </v-card-title>
        <v-divider />
        <v-card-text class="pt-4">
          <v-form ref="formRef" v-model="valid" lazy-validation>
            <v-text-field
              v-model="formData.username"
              label="Username"
              :rules="[rules.required]"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-account-outline"
              required
            />

            <v-text-field
              v-model="formData.email"
              label="Email"
              type="email"
              :rules="[rules.required, rules.email]"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-email-outline"
              required
            />

            <v-text-field
              v-if="!isEditing"
              v-model="formData.password"
              label="Password"
              type="password"
              :rules="[rules.required, rules.min]"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-lock-outline"
              required
            />

            <v-select
              v-model="formData.role"
              label="Role"
              :items="roles"
              item-title="title"
              item-value="value"
              :rules="[rules.required]"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-shield-account-outline"
              required
              @update:model-value="onRoleChange"
            />

            <v-select
              v-if="formData.role === 'staff'"
              v-model="formData.office"
              label="Office"
              :items="offices"
              item-title="title"
              item-value="value"
              :rules="[rules.required]"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-office-building-outline"
              required
            />
          </v-form>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" class="text-none" @click="closeDialog">
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            class="text-none"
            :loading="saving"
            :disabled="!valid"
            @click="saveUser"
          >
            {{ isEditing ? 'Save Changes' : 'Create User' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ─────────────────────────────────────────────
         Confirm Toggle Dialog
    ───────────────────────────────────────────── -->
    <v-dialog v-model="confirmDialog.show" max-width="420">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon
            :color="confirmDialog.user?.is_active ? 'error' : 'success'"
            class="mr-2"
          >
            {{ confirmDialog.user?.is_active ? 'mdi-account-off-outline' : 'mdi-account-check-outline' }}
          </v-icon>
          {{ confirmDialog.user?.is_active ? 'Deactivate' : 'Activate' }} User
        </v-card-title>
        <v-divider />
        <v-card-text class="pt-4">
          Are you sure you want to
          <strong>{{ confirmDialog.user?.is_active ? 'deactivate' : 'activate' }}</strong>
          <strong>{{ confirmDialog.user?.username }}</strong>?
          <div v-if="confirmDialog.user?.is_active" class="text-caption text-medium-emphasis mt-2">
            They will be signed out and unable to log in until reactivated.
          </div>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" class="text-none" @click="confirmDialog.show = false">
            Cancel
          </v-btn>
          <v-btn
            :color="confirmDialog.user?.is_active ? 'error' : 'success'"
            variant="flat"
            class="text-none"
            :loading="confirmDialog.loading"
            @click="doToggleStatus"
          >
            {{ confirmDialog.user?.is_active ? 'Deactivate' : 'Activate' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="3000"
      location="top"
      rounded="lg"
    >
      <div class="d-flex align-center">
        <v-icon class="mr-2">
          {{ snackbar.color === 'success' ? 'mdi-check-circle' : 'mdi-alert-circle' }}
        </v-icon>
        {{ snackbar.message }}
      </div>
      <template #actions>
        <v-btn icon="mdi-close" variant="text" size="small" @click="snackbar.show = false" />
      </template>
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import api from '@/plugins/axios'

/* ─────────────── State ─────────────── */
const loading = ref(false)
const saving = ref(false)
const users = ref([])
const search = ref('')
const filterRole = ref(null)
const filterStatus = ref(null)
const dialog = ref(false)
const isEditing = ref(false)
const valid = ref(false)
const formRef = ref(null)

const formData = ref(emptyForm())

const snackbar = ref({ show: false, message: '', color: 'success' })

const confirmDialog = reactive({
  show: false,
  user: null,
  loading: false,
})

/* ─────────────── Options ─────────────── */
const roles = [
  { title: 'Admin', value: 'admin' },
  { title: 'Staff', value: 'staff' },
  { title: 'Patient', value: 'patient' },
]

const offices = [
  { title: 'Testing', value: 'testing' },
  { title: 'Treatment', value: 'treatment' },
]

const statusOptions = [
  { title: 'Active', value: true },
  { title: 'Inactive', value: false },
]

const rules = {
  required: (v) => (!!v || v === 0) || 'Required',
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Invalid email',
  min: (v) => (v?.length >= 6) || 'Minimum 6 characters',
}

const headers = [
  { title: 'Username', key: 'username', sortable: true },
  { title: 'Email', key: 'email', sortable: true },
  { title: 'Role', key: 'role', sortable: true, align: 'center', width: '130px' },
  { title: 'Office', key: 'office', sortable: true, align: 'center', width: '120px' },
  { title: 'Status', key: 'is_active', sortable: true, align: 'center', width: '120px' },
  { title: 'Last Login', key: 'last_login', sortable: true, width: '180px' },
  { title: 'Actions', key: 'actions', sortable: false, align: 'center', width: '120px' },
]

/* ─────────────── Computed ─────────────── */
const dialogTitle = computed(() => (isEditing.value ? 'Edit User' : 'Create User'))

const hasActiveFilters = computed(
  () =>
    !!search.value ||
    !!filterRole.value ||
    (filterStatus.value !== null && filterStatus.value !== undefined)
)

const filteredUsers = computed(() => {
  let filtered = users.value

  if (filterRole.value) {
    filtered = filtered.filter((u) => u.role === filterRole.value)
  }

  // Use ==/null check so clearing the select (null) doesn't filter everything out
  if (filterStatus.value === true || filterStatus.value === false) {
    filtered = filtered.filter((u) => !!u.is_active === filterStatus.value)
  }

  return filtered
})

/* ─────────────── Formatting ─────────────── */
function formatDate(value) {
  if (!value) return 'Never'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? 'Never' : d.toLocaleString()
}

function getRoleColor(role) {
  const colors = { admin: 'red', staff: 'blue', patient: 'green' }
  return colors[role] || 'grey'
}

/* ─────────────── Form helpers ─────────────── */
function emptyForm() {
  return { id: null, username: '', email: '', password: '', role: '', office: '' }
}

function closeDialog() {
  dialog.value = false
  // Reset validation state so reopening doesn't show stale errors
  nextTick(() => formRef.value?.resetValidation())
}

/* ─────────────── Load ─────────────── */
async function loadUsers() {
  loading.value = true
  try {
    const { data } = await api.get('/admin/users')
    users.value = Array.isArray(data) ? data : data?.data || []
  } catch (error) {
    showSnackbar(extractError(error, 'Failed to load users'), 'error')
  } finally {
    loading.value = false
  }
}

/* ─────────────── Create / Edit ─────────────── */
function openCreateDialog() {
  isEditing.value = false
  formData.value = emptyForm()
  dialog.value = true
  nextTick(() => formRef.value?.resetValidation())
}

function editUser(user) {
  isEditing.value = true
  formData.value = {
    id: user.id,
    username: user.username || '',
    email: user.email || '',
    password: '',
    role: user.role || '',
    office: user.office || '',
  }
  dialog.value = true
  nextTick(() => formRef.value?.resetValidation())
}

async function saveUser() {
  // Vuetify 3: validate() returns a Promise<{ valid: boolean, errors: [] }>
  const { valid: isValid } = await formRef.value.validate()
  if (!isValid) return

  saving.value = true
  try {
    const payload = { ...formData.value }
    if (isEditing.value) {
      delete payload.id
      // Don't send an empty password on edit (backend may hash it)
      if (!payload.password) delete payload.password
      await api.put(`/admin/users/${formData.value.id}`, payload)
      showSnackbar('User updated successfully', 'success')
    } else {
      delete payload.id
      await api.post('/admin/users', payload)
      showSnackbar('User created successfully', 'success')
    }
    dialog.value = false
    await loadUsers()
  } catch (error) {
    showSnackbar(extractError(error, 'Operation failed'), 'error')
  } finally {
    saving.value = false
  }
}

/* ─────────────── Activate / Deactivate ─────────────── */
function confirmToggle(user) {
  confirmDialog.user = user
  confirmDialog.loading = false
  confirmDialog.show = true
}

async function doToggleStatus() {
  const user = confirmDialog.user
  if (!user) return

  confirmDialog.loading = true
  const action = user.is_active ? 'deactivate' : 'activate'
  try {
    // Use the correct endpoint based on the intended action
    await api.post(`/admin/users/${user.id}/${action}`)
    showSnackbar(`User ${action}d successfully`, 'success')
    confirmDialog.show = false
    await loadUsers()
  } catch (error) {
    showSnackbar(extractError(error, 'Operation failed'), 'error')
  } finally {
    confirmDialog.loading = false
  }
}

/* ─────────────── Misc ─────────────── */
function clearAllFilters() {
  search.value = ''
  filterRole.value = null
  filterStatus.value = null
}

function onRoleChange() {
  if (formData.value.role !== 'staff') {
    formData.value.office = ''
  }
}

function extractError(error, fallback) {
  return (
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  )
}

function showSnackbar(message, color = 'success') {
  snackbar.value = { show: true, message, color }
}

onMounted(loadUsers)
</script>

<style scoped>
.user-management-view {
  max-width: 1400px;
  margin: 0 auto;
}

/* ─── Cards ─── */
.header-card,
.filters-card,
.table-card {
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
}

/* ─── Table ─── */
.modern-table :deep(thead th) {
  font-weight: 600 !important;
  text-transform: uppercase;
  font-size: 0.72rem !important;
  letter-spacing: 0.5px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06) !important;
}

.modern-table :deep(tbody tr) {
  transition: background 0.15s ease;
}

.modern-table :deep(tbody td) {
  padding-top: 12px !important;
  padding-bottom: 12px !important;
}

/* ─── Table footer ─── */
.table-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 12px 20px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

/* ─── Empty state ─── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 16px;
}
</style>