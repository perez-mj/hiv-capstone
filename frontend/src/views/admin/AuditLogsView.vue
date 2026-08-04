<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title>
            Audit Logs
            <v-spacer></v-spacer>
            <v-btn color="primary" @click="refreshLogs">
              <v-icon left>mdi-refresh</v-icon>
              Refresh
            </v-btn>
          </v-card-title>
          
          <v-card-text>
            <!-- Filters -->
            <v-row>
              <v-col cols="12" md-3>
                <v-select
                  v-model="filters.action"
                  :items="actions"
                  label="Action"
                  clearable
                ></v-select>
              </v-col>
              <v-col cols="12" md-3>
                <v-select
                  v-model="filters.entity_type"
                  :items="entityTypes"
                  label="Entity Type"
                  clearable
                ></v-select>
              </v-col>
              <v-col cols="12" md-3>
                <v-text-field
                  v-model="filters.user_id"
                  label="User ID"
                  type="number"
                  clearable
                ></v-text-field>
              </v-col>
              <v-col cols="12" md-3>
                <v-menu
                  v-model="dateMenu"
                  :close-on-content-click="false"
                  transition="scale-transition"
                  offset-y
                  max-width="290px"
                  min-width="290px"
                >
                  <template v-slot:activator="{ on, attrs }">
                    <v-text-field
                      v-model="dateRange"
                      label="Date Range"
                      prepend-inner-icon="mdi-calendar"
                      readonly
                      v-bind="attrs"
                      v-on="on"
                      clearable
                    ></v-text-field>
                  </template>
                  <v-date-picker
                    v-model="dateRange"
                    range
                    no-title
                    scrollable
                  ></v-date-picker>
                </v-menu>
              </v-col>
            </v-row>
            
            <v-row>
              <v-col cols="12" md-6>
                <v-text-field
                  v-model="search"
                  label="Search (JSON data)"
                  prepend-inner-icon="mdi-magnify"
                  clearable
                ></v-text-field>
              </v-col>
              <v-col cols="12" md-6 class="text-right">
                <v-chip class="mr-2">
                  Total: {{ pagination.total }}
                </v-chip>
                <v-chip>
                  Page {{ pagination.page }} of {{ pagination.totalPages }}
                </v-chip>
              </v-col>
            </v-row>
            
            <!-- Audit Logs Table -->
            <v-data-table
              :headers="headers"
              :items="auditLogs"
              :loading="loading"
              :search="search"
              :server-items-length="pagination.total"
              :options.sync="options"
              @update:options="loadLogs"
              class="elevation-1"
            >
              <template v-slot:item.action="{ item }">
                <v-chip :color="getActionColor(item.action)" small dark>
                  {{ item.action }}
                </v-chip>
              </template>
              
              <template v-slot:item.created_at="{ item }">
                {{ formatDate(item.created_at) }}
              </template>
              
              <template v-slot:item.old_data="{ item }">
                <v-btn
                  small
                  text
                  color="primary"
                  @click="viewJson(item.old_data, 'Old Data')"
                  :disabled="!item.old_data"
                >
                  View
                </v-btn>
              </template>
              
              <template v-slot:item.new_data="{ item }">
                <v-btn
                  small
                  text
                  color="primary"
                  @click="viewJson(item.new_data, 'New Data')"
                  :disabled="!item.new_data"
                >
                  View
                </v-btn>
              </template>
              
              <template v-slot:item.User="{ item }">
                <div>
                  <div>{{ item.User?.username }}</div>
                  <small class="text-caption">{{ item.User?.email }}</small>
                </div>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- JSON Viewer Dialog -->
    <v-dialog v-model="jsonDialog" max-width="800px">
      <v-card>
        <v-card-title>
          {{ jsonTitle }}
          <v-spacer></v-spacer>
          <v-btn icon @click="jsonDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text>
          <pre class="json-viewer">{{ jsonContent }}</pre>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="copyJson">
            <v-icon left>mdi-content-copy</v-icon>
            Copy
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue';
import api from '@/plugins/axios';

const loading = ref(false);
const auditLogs = ref([]);
const search = ref('');
const dateMenu = ref(false);
const dateRange = ref([]);
const jsonDialog = ref(false);
const jsonTitle = ref('');
const jsonContent = ref('');

const snackbar = ref({
  show: false,
  message: '',
  color: 'success'
});

const filters = reactive({
  action: '',
  entity_type: '',
  user_id: ''
});

const pagination = reactive({
  page: 1,
  total: 0,
  totalPages: 0,
  limit: 20
});

const options = ref({
  page: 1,
  itemsPerPage: 20,
  sortBy: [],
  sortDesc: []
});

const headers = [
  { title: 'ID', key: 'id', sortable: true },
  { title: 'Action', key: 'action', sortable: true },
  { title: 'Entity Type', key: 'entity_type', sortable: true },
  { title: 'Entity ID', key: 'entity_id', sortable: true },
  { title: 'User', key: 'User', sortable: false },
  { title: 'Old Data', key: 'old_data', sortable: false },
  { title: 'New Data', key: 'new_data', sortable: false },
  { title: 'Timestamp', key: 'created_at', sortable: true }
];

const actions = [
  { title: 'CREATE', value: 'CREATE' },
  { title: 'UPDATE', value: 'UPDATE' },
  { title: 'DELETE', value: 'DELETE' },
  { title: 'LOGIN', value: 'LOGIN' },
  { title: 'LOGOUT', value: 'LOGOUT' },
  { title: 'VIEW', value: 'VIEW' }
];

const entityTypes = [
  { title: 'User', value: 'User' },
  { title: 'Patient', value: 'Patient' },
  { title: 'Appointment', value: 'Appointment' },
  { title: 'TestingEncounter', value: 'TestingEncounter' },
  { title: 'TreatmentEncounter', value: 'TreatmentEncounter' },
  { title: 'SystemSetting', value: 'SystemSetting' }
];

const getActionColor = (action) => {
  const colors = {
    CREATE: 'success',
    UPDATE: 'warning',
    DELETE: 'error',
    LOGIN: 'info',
    LOGOUT: 'info',
    VIEW: 'primary'
  };
  return colors[action] || 'grey';
};

const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString();
};

const loadLogs = async () => {
  loading.value = true;
  try {
    const params = {
      page: options.value.page,
      limit: options.value.itemsPerPage,
      action: filters.action,
      entity_type: filters.entity_type,
      user_id: filters.user_id
    };
    
    if (dateRange.value && dateRange.value.length === 2) {
      params.start_date = dateRange.value[0];
      params.end_date = dateRange.value[1];
    }
    
    const response = await api.get('/admin/audit-logs', { params });
    auditLogs.value = response.data.data;
    pagination.total = response.data.total;
    pagination.totalPages = response.data.totalPages;
    pagination.page = response.data.page;
  } catch (error) {
    showSnackbar('Failed to load audit logs', 'error');
  } finally {
    loading.value = false;
  }
};

const refreshLogs = () => {
  loadLogs();
};

const viewJson = (data, title) => {
  jsonTitle.value = title;
  jsonContent.value = JSON.stringify(data, null, 2);
  jsonDialog.value = true;
};

const copyJson = () => {
  navigator.clipboard.writeText(jsonContent.value);
  showSnackbar('Copied to clipboard');
};

const showSnackbar = (message, color = 'success') => {
  snackbar.value = {
    show: true,
    message,
    color
  };
};

// Watch for filter changes
watch([() => filters.action, () => filters.entity_type, () => filters.user_id, dateRange], () => {
  options.value.page = 1;
  loadLogs();
});

onMounted(() => {
  loadLogs();
});
</script>

<style scoped>
.json-viewer {
  background-color: #f5f5f5;
  padding: 16px;
  border-radius: 4px;
  overflow-x: auto;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  max-height: 500px;
}
</style>