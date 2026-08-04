<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title>
            System Settings
            <v-spacer></v-spacer>
            <v-btn color="primary" @click="addSetting" :disabled="!canAddNew">
              <v-icon left>mdi-cog-plus</v-icon>
              Add Setting
            </v-btn>
          </v-card-title>
          
          <v-card-text>
            <v-row>
              <v-col cols="12" md-4>
                <v-text-field
                  v-model="search"
                  label="Search Settings"
                  prepend-inner-icon="mdi-magnify"
                  clearable
                ></v-text-field>
              </v-col>
            </v-row>
            
            <v-data-table
              :headers="headers"
              :items="filteredSettings"
              :loading="loading"
              :search="search"
              class="elevation-1"
            >
              <template v-slot:item.value="{ item }">
                <div class="d-flex align-center">
                  <v-text-field
                    v-if="editingKey === item.key"
                    v-model="editValue"
                    :type="getInputType(item.data_type)"
                    :label="item.key"
                    dense
                    hide-details
                    class="mr-2"
                  ></v-text-field>
                  <span v-else>{{ formatValue(item) }}</span>
                  <v-icon
                    v-if="editingKey === item.key"
                    small
                    class="ml-2"
                    color="success"
                    @click="saveSetting(item)"
                  >
                    mdi-check
                  </v-icon>
                  <v-icon
                    v-if="editingKey === item.key"
                    small
                    class="ml-1"
                    color="error"
                    @click="cancelEdit"
                  >
                    mdi-close
                  </v-icon>
                  <v-icon
                    v-else
                    small
                    class="ml-2"
                    @click="startEdit(item)"
                  >
                    mdi-pencil
                  </v-icon>
                </div>
              </template>
              
              <template v-slot:item.data_type="{ item }">
                <v-chip :color="getDataTypeColor(item.data_type)" small>
                  {{ item.data_type }}
                </v-chip>
              </template>
              
              <template v-slot:item.actions="{ item }">
                <v-icon small color="error" @click="deleteSetting(item)">
                  mdi-delete
                </v-icon>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Add Setting Dialog -->
    <v-dialog v-model="addDialog" max-width="500px">
      <v-card>
        <v-card-title>Add New Setting</v-card-title>
        <v-card-text>
          <v-form ref="addForm" v-model="addValid">
            <v-text-field
              v-model="newSetting.key"
              label="Setting Key"
              :rules="[rules.required, rules.keyFormat]"
              required
            ></v-text-field>
            
            <v-text-field
              v-model="newSetting.value"
              label="Value"
              :rules="[rules.required]"
              required
            ></v-text-field>
            
            <v-textarea
              v-model="newSetting.description"
              label="Description"
              rows="2"
            ></v-textarea>
            
            <v-select
              v-model="newSetting.data_type"
              :items="dataTypes"
              label="Data Type"
              :rules="[rules.required]"
              required
            ></v-select>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="error" text @click="addDialog = false">Cancel</v-btn>
          <v-btn color="primary" :disabled="!addValid" @click="createSetting">
            Create
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
import { ref, computed, onMounted } from 'vue';
import api from '@/plugins/axios';

const loading = ref(false);
const settings = ref([]);
const search = ref('');
const editingKey = ref(null);
const editValue = ref('');
const addDialog = ref(false);
const addValid = ref(false);
const addForm = ref(null);

const snackbar = ref({
  show: false,
  message: '',
  color: 'success'
});

const newSetting = ref({
  key: '',
  value: '',
  description: '',
  data_type: 'string'
});

const headers = [
  { title: 'Key', key: 'key', sortable: true },
  { title: 'Value', key: 'value', sortable: true },
  { title: 'Description', key: 'description', sortable: false },
  { title: 'Data Type', key: 'data_type', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false }
];

const dataTypes = [
  { title: 'String', value: 'string' },
  { title: 'Number', value: 'number' },
  { title: 'Boolean', value: 'boolean' },
  { title: 'JSON', value: 'json' }
];

const rules = {
  required: value => !!value || 'Required',
  keyFormat: value => /^[a-z_]+$/.test(value) || 'Use lowercase letters and underscores only'
};

const filteredSettings = computed(() => {
  if (!search.value) return settings.value;
  return settings.value.filter(s => 
    s.key.toLowerCase().includes(search.value.toLowerCase()) ||
    (s.description && s.description.toLowerCase().includes(search.value.toLowerCase()))
  );
});

const canAddNew = computed(() => {
  return !editingKey.value;
});

const getInputType = (dataType) => {
  switch(dataType) {
    case 'number': return 'number';
    case 'boolean': return 'checkbox';
    default: return 'text';
  }
};

const formatValue = (setting) => {
  if (setting.data_type === 'boolean') {
    return setting.value === 'true' ? 'Yes' : 'No';
  }
  if (setting.data_type === 'json') {
    try {
      return JSON.stringify(JSON.parse(setting.value), null, 2);
    } catch {
      return setting.value;
    }
  }
  return setting.value;
};

const getDataTypeColor = (dataType) => {
  const colors = {
    string: 'blue',
    number: 'green',
    boolean: 'orange',
    json: 'purple'
  };
  return colors[dataType] || 'grey';
};

const loadSettings = async () => {
  loading.value = true;
  try {
    const response = await api.get('/admin/settings');
    const settingsArray = Object.entries(response.data).map(([key, value]) => ({
      key,
      value: String(value),
      data_type: typeof value === 'string' ? 'string' : 
                  typeof value === 'number' ? 'number' :
                  typeof value === 'boolean' ? 'boolean' : 'json',
      description: ''
    }));
    settings.value = settingsArray;
  } catch (error) {
    showSnackbar('Failed to load settings', 'error');
  } finally {
    loading.value = false;
  }
};

const startEdit = (setting) => {
  editingKey.value = setting.key;
  editValue.value = setting.value;
};

const cancelEdit = () => {
  editingKey.value = null;
  editValue.value = '';
};

const saveSetting = async (setting) => {
  try {
    await api.put(`/admin/settings/${setting.key}`, { value: editValue.value });
    showSnackbar('Setting updated successfully');
    cancelEdit();
    loadSettings();
  } catch (error) {
    showSnackbar('Failed to update setting', 'error');
  }
};

const addSetting = () => {
  newSetting.value = {
    key: '',
    value: '',
    description: '',
    data_type: 'string'
  };
  addDialog.value = true;
};

const createSetting = async () => {
  if (!addForm.value.validate()) return;
  
  try {
    await api.post('/admin/settings', newSetting.value);
    showSnackbar('Setting created successfully');
    addDialog.value = false;
    loadSettings();
  } catch (error) {
    showSnackbar(error.response?.data?.error || 'Failed to create setting', 'error');
  }
};

const deleteSetting = async (setting) => {
  if (!confirm(`Delete setting "${setting.key}"? This action cannot be undone.`)) return;
  
  try {
    await api.delete(`/admin/settings/${setting.key}`);
    showSnackbar('Setting deleted successfully');
    loadSettings();
  } catch (error) {
    showSnackbar('Failed to delete setting', 'error');
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
  loadSettings();
});
</script>