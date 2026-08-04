<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <v-card class="pa-4">
          <v-card-title class="text-h5">
            Admin Dashboard
          </v-card-title>
          <v-card-subtitle>
            Welcome back, {{ user?.username }}! Here's an overview of the system.
          </v-card-subtitle>
        </v-card>
      </v-col>
    </v-row>

    <!-- Stats Cards -->
    <v-row>
      <v-col cols="12" sm-6 md-4 lg-2>
        <v-card class="text-center pa-4" color="primary" dark>
          <v-icon size="40" class="mb-2">mdi-account-group</v-icon>
          <div class="text-h4">{{ stats.total_users || 0 }}</div>
          <div>Total Users</div>
        </v-card>
      </v-col>
      
      <v-col cols="12" sm-6 md-4 lg-2>
        <v-card class="text-center pa-4" color="success" dark>
          <v-icon size="40" class="mb-2">mdi-account-check</v-icon>
          <div class="text-h4">{{ stats.active_users || 0 }}</div>
          <div>Active Users</div>
        </v-card>
      </v-col>
      
      <v-col cols="12" sm-6 md-4 lg-2>
        <v-card class="text-center pa-4" color="info" dark>
          <v-icon size="40" class="mb-2">mdi-account-heart</v-icon>
          <div class="text-h4">{{ stats.total_patients || 0 }}</div>
          <div>Total Patients</div>
        </v-card>
      </v-col>
      
      <v-col cols="12" sm-6 md-4 lg-2>
        <v-card class="text-center pa-4" color="warning" dark>
          <v-icon size="40" class="mb-2">mdi-calendar-clock</v-icon>
          <div class="text-h4">{{ stats.total_appointments || 0 }}</div>
          <div>Appointments</div>
        </v-card>
      </v-col>
      
      <v-col cols="12" sm-6 md-4 lg-2>
        <v-card class="text-center pa-4" color="error" dark>
          <v-icon size="40" class="mb-2">mdi-clipboard-list</v-icon>
          <div class="text-h4">{{ stats.recent_audits || 0 }}</div>
          <div>Audits (7d)</div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Users by Role Chart -->
    <v-row>
      <v-col cols="12" md-6>
        <v-card>
          <v-card-title>Users by Role</v-card-title>
          <v-card-text>
            <v-data-table
              :headers="roleHeaders"
              :items="stats.users_by_role || []"
              hide-default-footer
              class="elevation-1"
            >
              <template v-slot:item.count="{ item }">
                <v-chip :color="getRoleChartColor(item.role)" dark>
                  {{ item.count }}
                </v-chip>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>
      
      <v-col cols="12" md-6>
        <v-card>
          <v-card-title>Quick Actions</v-card-title>
          <v-card-text>
            <v-list>
              <v-list-item @click="$router.push('/admin/users')">
                <v-list-item-icon>
                  <v-icon color="primary">mdi-account-plus</v-icon>
                </v-list-item-icon>
                <v-list-item-content>
                  <v-list-item-title>Add New User</v-list-item-title>
                  <v-list-item-subtitle>Create staff or admin accounts</v-list-item-subtitle>
                </v-list-item-content>
              </v-list-item>
              
              <v-list-item @click="$router.push('/admin/settings')">
                <v-list-item-icon>
                  <v-icon color="primary">mdi-cog</v-icon>
                </v-list-item-icon>
                <v-list-item-content>
                  <v-list-item-title>System Settings</v-list-item-title>
                  <v-list-item-subtitle>Configure system parameters</v-list-item-subtitle>
                </v-list-item-content>
              </v-list-item>
              
              <v-list-item @click="$router.push('/admin/audit-logs')">
                <v-list-item-icon>
                  <v-icon color="primary">mdi-history</v-icon>
                </v-list-item-icon>
                <v-list-item-content>
                  <v-list-item-title>View Audit Logs</v-list-item-title>
                  <v-list-item-subtitle>Monitor system activity</v-list-item-subtitle>
                </v-list-item-content>
              </v-list-item>
              
              <v-list-item @click="refreshStats">
                <v-list-item-icon>
                  <v-icon color="primary">mdi-refresh</v-icon>
                </v-list-item-icon>
                <v-list-item-content>
                  <v-list-item-title>Refresh Statistics</v-list-item-title>
                  <v-list-item-subtitle>Update dashboard data</v-list-item-subtitle>
                </v-list-item-content>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/stores/authStore';
import api from '@/plugins/axios';

const authStore = useAuthStore();
const user = ref(authStore.user);
const stats = ref({
  total_users: 0,
  active_users: 0,
  total_patients: 0,
  total_appointments: 0,
  recent_audits: 0,
  users_by_role: []
});

const snackbar = ref({
  show: false,
  message: '',
  color: 'success'
});

const roleHeaders = [
  { title: 'Role', key: 'role', sortable: false },
  { title: 'Count', key: 'count', sortable: false }
];

const getRoleChartColor = (role) => {
  const colors = {
    admin: 'red',
    staff: 'blue',
    patient: 'green'
  };
  return colors[role] || 'grey';
};

const loadStats = async () => {
  try {
    const response = await api.get('/admin/dashboard/stats');
    stats.value = response.data;
  } catch (error) {
    showSnackbar('Failed to load dashboard statistics', 'error');
  }
};

const refreshStats = () => {
  loadStats();
  showSnackbar('Statistics refreshed');
};

const showSnackbar = (message, color = 'success') => {
  snackbar.value = {
    show: true,
    message,
    color
  };
};

onMounted(() => {
  loadStats();
});
</script>