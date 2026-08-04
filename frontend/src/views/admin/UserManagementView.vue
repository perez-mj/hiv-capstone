<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex justify-space-between align-center">
            <div>User Management</div>
            <v-btn color="primary" @click="openCreateDialog">
              <v-icon left>mdi-account-plus</v-icon>
              Add User
            </v-btn>
          </v-card-title>
          
          <v-card-text>
            <v-row>
              <v-col cols="12" md-4>
                <v-text-field
                  v-model="search"
                  label="Search"
                  prepend-inner-icon="mdi-magnify"
                  clearable
                ></v-text-field>
              </v-col>
              <v-col cols="12" md-3>
                <v-select
                  v-model="filterRole"
                  :items="roles"
                  label="Filter by Role"
                  clearable
                ></v-select>
              </v-col>
              <v-col cols="12" md-3>
                <v-select
                  v-model="filterStatus"
                  :items="statusOptions"
                  label="Filter by Status"
                  clearable
                ></v-select>
              </v-col>
            </v-row>
            
            <v-data-table
              :headers="headers"
              :items="filteredUsers"
              :loading="loading"
              :search="search"
              class="elevation-1"
            >
              <template v-slot:item.role="{ item }">
                <v-chip :color="getRoleColor(item.role)" small>
                  {{ item.role }}
                </v-chip>
              </template>
              
              <template v-slot:item.is_active="{ item }">
                <v-chip :color="item.is_active ? 'success' : 'error'" small>
                  {{ item.is_active ? 'Active' : 'Inactive' }}
                </v-chip>
              </template>
              
              <template v-slot:item.last_login="{ item }">
                {{ formatDate(item.last_login) }}
              </template>
              
              <template v-slot:item.actions="{ item }">
                <v-icon small class="mr-2" @click="editUser(item)">
                  mdi-pencil
                </v-icon>
                <v-icon small @click="toggleUserStatus(item)" :color="item.is_active ? 'error' : 'success'">
                  {{ item.is_active ? 'mdi-account-off' : 'mdi-account-check' }}
                </v-icon>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Create/Edit User Dialog -->
    <v-dialog v-model="dialog" max-width="600px">
      <v-card>
        <v-card-title>
          {{ dialogTitle }}
        </v-card-title>
        <v-card-text>
          <v-form ref="form" v-model="valid">
            <v-text-field
              v-model="formData.username"
              label="Username"
              :rules="[rules.required]"
              required
            ></v-text-field>
            
            <v-text-field
              v-model="formData.email"
              label="Email"
              type="email"
              :rules="[rules.required, rules.email]"
              required
            ></v-text-field>
            
            <v-text-field
              v-if="!isEditing"
              v-model="formData.password"
              label="Password"
              type="password"
              :rules="[rules.required, rules.min]"
              required
            ></v-text-field>
            
            <v-select
              v-model="formData.role"
              :items="roles"
              label="Role"
              :rules="[rules.required]"
              required
              @change="onRoleChange"
            ></v-select>
            
            <v-select
              v-if="formData.role === 'staff'"
              v-model="formData.office"
              :items="offices"
              label="Office"
              :rules="[rules.required]"
              required
            ></v-select>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="error" text @click="dialog = false">Cancel</v-btn>
          <v-btn color="primary" :disabled="!valid" @click="saveUser">
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '@/plugins/axios';

const loading = ref(false);
const users = ref([]);
const search = ref('');
const filterRole = ref('');
const filterStatus = ref('');
const dialog = ref(false);
const isEditing = ref(false);
const valid = ref(false);
const form = ref(null);

const snackbar = ref({
  show: false,
  message: '',
  color: 'success'
});

const formData = ref({
  id: null,
  username: '',
  email: '',
  password: '',
  role: '',
  office: ''
});

const headers = [
  { title: 'Username', key: 'username', sortable: true },
  { title: 'Email', key: 'email', sortable: true },
  { title: 'Role', key: 'role', sortable: true },
  { title: 'Office', key: 'office', sortable: true },
  { title: 'Status', key: 'is_active', sortable: true },
  { title: 'Last Login', key: 'last_login', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false }
];

const roles = [
  { title: 'Admin', value: 'admin' },
  { title: 'Staff', value: 'staff' },
  { title: 'Patient', value: 'patient' }
];

const offices = [
  { title: 'Testing', value: 'testing' },
  { title: 'Treatment', value: 'treatment' }
];

const statusOptions = [
  { title: 'Active', value: true },
  { title: 'Inactive', value: false }
];

const rules = {
  required: value => !!value || 'Required',
  email: value => {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(value) || 'Invalid email';
  },
  min: value => (value?.length >= 6) || 'Minimum 6 characters'
};

const dialogTitle = computed(() => isEditing.value ? 'Edit User' : 'Create User');

const filteredUsers = computed(() => {
  let filtered = users.value;
  
  if (filterRole.value) {
    filtered = filtered.filter(u => u.role === filterRole.value);
  }
  
  if (filterStatus.value !== '') {
    filtered = filtered.filter(u => u.is_active === filterStatus.value);
  }
  
  return filtered;
});

const formatDate = (date) => {
  if (!date) return 'Never';
  return new Date(date).toLocaleString();
};

const getRoleColor = (role) => {
  const colors = {
    admin: 'red',
    staff: 'blue',
    patient: 'green'
  };
  return colors[role] || 'grey';
};

const loadUsers = async () => {
  loading.value = true;
  try {
    const response = await api.get('/admin/users');
    users.value = response.data;
  } catch (error) {
    showSnackbar('Failed to load users', 'error');
  } finally {
    loading.value = false;
  }
};

const openCreateDialog = () => {
  isEditing.value = false;
  formData.value = {
    id: null,
    username: '',
    email: '',
    password: '',
    role: '',
    office: ''
  };
  dialog.value = true;
};

const editUser = (user) => {
  isEditing.value = true;
  formData.value = {
    id: user.id,
    username: user.username,
    email: user.email,
    password: '',
    role: user.role,
    office: user.office
  };
  dialog.value = true;
};

const saveUser = async () => {
  if (!form.value.validate()) return;
  
  try {
    if (isEditing.value) {
      await api.put(`/admin/users/${formData.value.id}`, formData.value);
      showSnackbar('User updated successfully');
    } else {
      await api.post('/admin/users', formData.value);
      showSnackbar('User created successfully');
    }
    dialog.value = false;
    loadUsers();
  } catch (error) {
    showSnackbar(error.response?.data?.error || 'Operation failed', 'error');
  }
};

const toggleUserStatus = async (user) => {
  const action = user.is_active ? 'deactivate' : 'activate';
  if (!confirm(`Are you sure you want to ${action} this user?`)) return;
  
  try {
    await api.post(`/admin/users/${user.id}/deactivate`);
    showSnackbar(`User ${action}d successfully`);
    loadUsers();
  } catch (error) {
    showSnackbar('Operation failed', 'error');
  }
};

const onRoleChange = () => {
  if (formData.value.role !== 'staff') {
    formData.value.office = '';
  }
};

const showSnackbar = (message, color = 'success') => {
  snackbar.value = {
    show: true,
    message,
    color
  };
};

onMounted(() => {
  loadUsers();
});
</script>