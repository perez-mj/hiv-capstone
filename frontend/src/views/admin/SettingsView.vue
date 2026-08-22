<!-- frontend/src/views/admin/SettingsView.vue -->
<template>
  <v-container fluid class="settings-container">
    <!-- Header Section -->
    <v-row>
      <v-col cols="12">
        <v-card class="settings-header-card" elevation="2">
          <v-card-title class="pa-4">
            <div class="d-flex align-center w-100">
              <div>
                <v-icon large color="primary" class="mr-3">mdi-cog</v-icon>
                <span class="text-h5 font-weight-bold">System Settings</span>
                <span class="text-subtitle-1 grey--text ml-2">Manage application configuration</span>
              </div>
              <v-spacer></v-spacer>
              <v-btn 
                color="primary" 
                @click="addSetting" 
                :disabled="!canAddNew || loading"
                elevation="2"
              >
                <v-icon left>mdi-plus</v-icon>
                Add Setting
              </v-btn>
            </div>
          </v-card-title>
        </v-card>
      </v-col>
    </v-row>

    <!-- Filter Section -->
    <v-row class="mt-2">
      <v-col cols="12">
        <v-card elevation="2">
          <v-card-text class="pa-3">
            <v-row align="center">
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="search"
                  label="Search Settings"
                  prepend-inner-icon="mdi-magnify"
                  clearable
                  dense
                  hide-details
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="3">
                <v-select
                  v-model="selectedCategory"
                  :items="categories"
                  label="Filter by Category"
                  clearable
                  dense
                  hide-details
                ></v-select>
              </v-col>
              <v-col cols="12" md="3">
                <v-select
                  v-model="selectedDataType"
                  :items="dataTypeFilters"
                  label="Filter by Data Type"
                  clearable
                  dense
                  hide-details
                ></v-select>
              </v-col>
              <v-col cols="12" md="2" class="text-right">
                <v-chip 
                  :color="filteredSettings.length === 0 ? 'error' : 'success'" 
                  small
                  label
                >
                  {{ filteredSettings.length }} settings
                </v-chip>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Settings Table -->
    <v-row class="mt-2">
      <v-col cols="12">
        <v-card elevation="2">
          <v-data-table
            :headers="headers"
            :items="filteredSettings"
            :loading="loading"
            :search="search"
            :items-per-page="25"
            :footer-props="{
              itemsPerPageOptions: [10, 25, 50, -1],
              showFirstLastPage: true
            }"
            class="settings-table"
          >
            <!-- Key Column -->
            <template v-slot:item.key="{ item }">
              <div class="d-flex align-center">
                <v-icon 
                  small 
                  :color="getCategoryColor(item.category)" 
                  class="mr-2"
                >
                  mdi-tag
                </v-icon>
                <span class="font-weight-medium">{{ item.key }}</span>
                <v-chip 
                  v-if="item.category" 
                  x-small 
                  :color="getCategoryColor(item.category)"
                  text-color="white"
                  class="ml-2"
                >
                  {{ item.category }}
                </v-chip>
              </div>
            </template>

            <!-- Value Column -->
            <template v-slot:item.value="{ item }">
              <div class="d-flex align-center value-container">
                <template v-if="editingKey === item.key">
                  <v-text-field
                    v-model="editValue"
                    :type="getInputType(item.data_type)"
                    :label="editLabel"
                    dense
                    hide-details
                    class="mr-2 edit-field"
                    autofocus
                    @keyup.enter="saveSetting(item)"
                    @keyup.esc="cancelEdit"
                  ></v-text-field>
                  <v-btn
                    icon
                    x-small
                    color="success"
                    @click="saveSetting(item)"
                    class="mr-1"
                  >
                    <v-icon small>mdi-check</v-icon>
                  </v-btn>
                  <v-btn
                    icon
                    x-small
                    color="error"
                    @click="cancelEdit"
                  >
                    <v-icon small>mdi-close</v-icon>
                  </v-btn>
                </template>
                <template v-else>
                  <div class="value-display" :style="getValueStyle(item)">
                    <span v-if="item.data_type === 'boolean'">
                      <v-chip :color="item.value === 'true' ? 'success' : 'error'" small>
                        {{ item.value === 'true' ? 'Yes' : 'No' }}
                      </v-chip>
                    </span>
                    <span v-else-if="item.data_type === 'json'">
                      <pre class="json-preview">{{ formatJsonValue(item.value) }}</pre>
                    </span>
                    <span v-else>{{ item.value }}</span>
                  </div>
                  <v-btn
                    icon
                    x-small
                    color="primary"
                    @click="startEdit(item)"
                    class="ml-2"
                  >
                    <v-icon small>mdi-pencil</v-icon>
                  </v-btn>
                </template>
              </div>
            </template>

            <!-- Description Column -->
            <template v-slot:item.description="{ item }">
              <span class="description-text">{{ item.description || '—' }}</span>
            </template>

            <!-- Data Type Column -->
            <template v-slot:item.data_type="{ item }">
              <v-chip 
                :color="getDataTypeColor(item.data_type)" 
                small
                text-color="white"
              >
                {{ item.data_type }}
              </v-chip>
            </template>

            <!-- Actions Column -->
            <template v-slot:item.actions="{ item }">
              <v-btn
                icon
                x-small
                color="error"
                @click="deleteSetting(item)"
              >
                <v-icon small>mdi-delete</v-icon>
              </v-btn>
            </template>

            <!-- Empty State -->
            <template v-slot:no-data>
              <div class="text-center pa-8">
                <v-icon large color="grey lighten-1">mdi-cog-off</v-icon>
                <p class="text-subtitle-1 grey--text mt-2">No settings found</p>
                <v-btn color="primary" text @click="loadSettings">Refresh</v-btn>
              </div>
            </template>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>

    <!-- Add Setting Dialog -->
    <v-dialog v-model="addDialog" max-width="600px" persistent>
      <v-card>
        <v-card-title class="pa-4 primary white--text">
          <v-icon left dark>mdi-plus-circle</v-icon>
          Add New Setting
        </v-card-title>
        
        <v-card-text class="pa-4">
          <v-form ref="addForm" v-model="addValid">
            <v-text-field
              v-model="newSetting.key"
              label="Setting Key *"
              :rules="[rules.required, rules.keyFormat]"
              required
              outlined
              dense
              hint="Use lowercase letters and underscores only"
              persistent-hint
            ></v-text-field>
            
            <v-text-field
              v-model="newSetting.value"
              label="Value *"
              :rules="[rules.required]"
              required
              outlined
              dense
            ></v-text-field>
            
            <v-textarea
              v-model="newSetting.description"
              label="Description"
              rows="2"
              outlined
              dense
              hint="Brief description of what this setting controls"
              persistent-hint
            ></v-textarea>
            
            <v-select
              v-model="newSetting.data_type"
              :items="dataTypes"
              label="Data Type *"
              :rules="[rules.required]"
              required
              outlined
              dense
            ></v-select>
            
            <v-select
              v-model="newSetting.category"
              :items="categoryOptions"
              label="Category"
              outlined
              dense
              hint="Optional category for organization"
              persistent-hint
            ></v-select>
          </v-form>
        </v-card-text>
        
        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn 
            color="grey" 
            text 
            @click="addDialog = false"
          >
            Cancel
          </v-btn>
          <v-btn 
            color="primary" 
            :disabled="!addValid || creating"
            @click="createSetting"
            :loading="creating"
          >
            Create Setting
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="deleteDialog" max-width="400px">
      <v-card>
        <v-card-title class="pa-4 error white--text">
          <v-icon left dark>mdi-alert</v-icon>
          Confirm Delete
        </v-card-title>
        <v-card-text class="pa-4">
          <p class="text-body-1">
            Are you sure you want to delete the setting 
            <strong>"{{ deleteKey }}"</strong>?
          </p>
          <p class="text-caption red--text">
            This action cannot be undone.
          </p>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn color="grey" text @click="deleteDialog = false">Cancel</v-btn>
          <v-btn color="error" @click="confirmDelete" :loading="deleting">
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar 
      v-model="snackbar.show" 
      :color="snackbar.color" 
      timeout="4000"
      :multi-line="true"
      top
      right
    >
      <v-icon left dark>{{ snackbar.icon }}</v-icon>
      {{ snackbar.message }}
      <template v-slot:action="{ attrs }">
        <v-btn 
          color="white" 
          text 
          v-bind="attrs" 
          @click="snackbar.show = false"
        >
          Close
        </v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import SettingService from '@/services/settingService';

// ===== STATE =====
const loading = ref(false);
const creating = ref(false);
const deleting = ref(false);
const settings = ref([]);
const search = ref('');
const selectedCategory = ref(null);
const selectedDataType = ref(null);
const editingKey = ref(null);
const editValue = ref('');
const editLabel = ref('');
const addDialog = ref(false);
const addValid = ref(false);
const deleteDialog = ref(false);
const deleteKey = ref('');
const addForm = ref(null);

// ===== SNACKBAR =====
const snackbar = ref({
  show: false,
  message: '',
  color: 'success',
  icon: 'mdi-check-circle'
});

// ===== NEW SETTING =====
const newSetting = ref({
  key: '',
  value: '',
  description: '',
  data_type: 'string',
  category: null
});

// ===== TABLE CONFIG =====
const headers = [
  { 
    title: 'Setting Key', 
    key: 'key', 
    sortable: true,
    width: '25%'
  },
  { 
    title: 'Value', 
    key: 'value', 
    sortable: true,
    width: '30%'
  },
  { 
    title: 'Description', 
    key: 'description', 
    sortable: false,
    width: '25%'
  },
  { 
    title: 'Data Type', 
    key: 'data_type', 
    sortable: true,
    width: '12%'
  },
  { 
    title: 'Actions', 
    key: 'actions', 
    sortable: false,
    width: '8%'
  }
];

// ===== FILTER OPTIONS =====
const dataTypes = [
  { title: 'String', value: 'string' },
  { title: 'Number', value: 'number' },
  { title: 'Boolean', value: 'boolean' },
  { title: 'JSON', value: 'json' }
];

const dataTypeFilters = [
  { title: 'String', value: 'string' },
  { title: 'Number', value: 'number' },
  { title: 'Boolean', value: 'boolean' },
  { title: 'JSON', value: 'json' }
];

const categoryOptions = [
  { title: 'Clinic Operations', value: 'clinic_operations' },
  { title: 'Appointment', value: 'appointment' },
  { title: 'Clinical', value: 'clinical' },
  { title: 'Kiosk', value: 'kiosk' },
  { title: 'Security', value: 'security' },
  { title: 'Appearance', value: 'appearance' },
  { title: 'Notifications', value: 'notifications' },
  { title: 'Queue', value: 'queue' },
  { title: 'Registration', value: 'registration' },
  { title: 'Compliance', value: 'compliance' }
];

// ===== COMPUTED =====
const categories = computed(() => {
  const cats = new Set();
  settings.value.forEach(s => {
    if (s.category) cats.add(s.category);
  });
  return Array.from(cats).map(c => ({ title: c.replace('_', ' ').toUpperCase(), value: c }));
});

const filteredSettings = computed(() => {
  let result = settings.value;

  // Filter by search
  if (search.value) {
    const searchLower = search.value.toLowerCase();
    result = result.filter(s => 
      s.key.toLowerCase().includes(searchLower) ||
      (s.description && s.description.toLowerCase().includes(searchLower))
    );
  }

  // Filter by category
  if (selectedCategory.value) {
    result = result.filter(s => s.category === selectedCategory.value);
  }

  // Filter by data type
  if (selectedDataType.value) {
    result = result.filter(s => s.data_type === selectedDataType.value);
  }

  return result;
});

const canAddNew = computed(() => {
  return !editingKey.value && !loading.value;
});

// ===== RULES =====
const rules = {
  required: value => !!value || 'This field is required',
  keyFormat: value => /^[a-z_]+$/.test(value) || 'Use lowercase letters and underscores only'
};

// ===== METHODS =====
const loadSettings = async () => {
  loading.value = true;
  try {
    const settingsData = await SettingService.getAllSettings();
    settings.value = settingsData;
  } catch (error) {
    showSnackbar('Failed to load settings: ' + error.message, 'error');
  } finally {
    loading.value = false;
  }
};

const startEdit = (setting) => {
  editingKey.value = setting.key;
  editValue.value = setting.value;
  editLabel.value = setting.key;
};

const cancelEdit = () => {
  editingKey.value = null;
  editValue.value = '';
  editLabel.value = '';
};

const saveSetting = async (setting) => {
  try {
    await SettingService.updateSetting(setting.key, editValue.value);
    showSnackbar(`Setting "${setting.key}" updated successfully`);
    cancelEdit();
    await loadSettings();
  } catch (error) {
    showSnackbar('Failed to update setting: ' + error.message, 'error');
  }
};

const addSetting = () => {
  newSetting.value = {
    key: '',
    value: '',
    description: '',
    data_type: 'string',
    category: null
  };
  addDialog.value = true;
};

const createSetting = async () => {
  if (!addForm.value.validate()) return;
  
  creating.value = true;
  try {
    await SettingService.createSetting({
      key: newSetting.value.key,
      value: newSetting.value.value,
      description: newSetting.value.description,
      data_type: newSetting.value.data_type,
      category: newSetting.value.category
    });
    showSnackbar(`Setting "${newSetting.value.key}" created successfully`);
    addDialog.value = false;
    await loadSettings();
  } catch (error) {
    showSnackbar('Failed to create setting: ' + error.message, 'error');
  } finally {
    creating.value = false;
  }
};

const deleteSetting = (setting) => {
  deleteKey.value = setting.key;
  deleteDialog.value = true;
};

const confirmDelete = async () => {
  deleting.value = true;
  try {
    await SettingService.deleteSetting(deleteKey.value);
    showSnackbar(`Setting "${deleteKey.value}" deleted successfully`);
    deleteDialog.value = false;
    await loadSettings();
  } catch (error) {
    showSnackbar('Failed to delete setting: ' + error.message, 'error');
  } finally {
    deleting.value = false;
    deleteKey.value = '';
  }
};

const getInputType = (dataType) => {
  switch(dataType) {
    case 'number': return 'number';
    case 'boolean': return 'checkbox';
    default: return 'text';
  }
};

const formatJsonValue = (value) => {
  try {
    const parsed = JSON.parse(value);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return value;
  }
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

const getCategoryColor = (category) => {
  const colors = {
    clinic_operations: 'blue-darken-2',
    appointment: 'teal-darken-2',
    clinical: 'red-darken-2',
    kiosk: 'purple-darken-2',
    security: 'grey-darken-2',
    appearance: 'pink-darken-2',
    notifications: 'cyan-darken-2',
    queue: 'orange-darken-2',
    registration: 'green-darken-2',
    compliance: 'brown-darken-2'
  };
  return colors[category] || 'grey';
};

const getValueStyle = (item) => {
  if (item.data_type === 'json') {
    return { maxWidth: '300px', overflow: 'auto' };
  }
  return {};
};

const showSnackbar = (message, color = 'success') => {
  const icons = {
    success: 'mdi-check-circle',
    error: 'mdi-alert-circle',
    warning: 'mdi-alert',
    info: 'mdi-information'
  };
  snackbar.value = {
    show: true,
    message,
    color,
    icon: icons[color] || icons.info
  };
};

// ===== WATCHERS =====
watch(selectedCategory, () => {
  // Reset page when filter changes
});

// ===== LIFECYCLE =====
onMounted(() => {
  loadSettings();
});
</script>

<style scoped>
.settings-container {
  min-height: 100vh;
  padding: 16px;
}

.settings-header-card {
  border-radius: 12px;
}

.settings-table {
  border-radius: 12px;
}

.value-container {
  min-height: 40px;
}

.value-display {
  flex: 1;
  min-width: 0;
  word-break: break-word;
}

.edit-field {
  flex: 1;
  min-width: 100px;
}

.json-preview {
  margin: 0;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  max-height: 100px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.description-text {
  color: #666;
  font-size: 13px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.settings-table :deep(.v-data-table-header) {
  background-color: #f5f7fa;
}

.settings-table :deep(.v-data-table-header th) {
  font-weight: 600;
  font-size: 13px;
  color: #333;
}

.settings-table :deep(tbody tr:hover) {
  background-color: rgba(26, 115, 232, 0.05);
}

.settings-table :deep(tbody tr) {
  transition: background-color 0.2s;
}
</style>