<!-- frontend/src/views/admin/TransactionTypesView.vue -->
<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center justify-space-between">
            <div>
              <v-icon icon="mdi-tag-multiple" class="mr-2" color="primary" />
              Transaction Types Management
            </div>
            <v-btn
              color="primary"
              prepend-icon="mdi-plus"
              @click="openCreateDialog"
            >
              New Transaction Type
            </v-btn>
          </v-card-title>

          <v-divider />

          <v-card-text>
            <!-- Filters -->
            <v-row class="mb-4">
              <v-col cols="12" md="3">
                <v-select
                  v-model="filters.office"
                  label="Office"
                  :items="officeOptions"
                  item-title="text"
                  item-value="value"
                  clearable
                  density="compact"
                  @update:model-value="loadTransactionTypes"
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-select
                  v-model="filters.is_active"
                  label="Status"
                  :items="statusOptions"
                  item-title="text"
                  item-value="value"
                  clearable
                  density="compact"
                  @update:model-value="loadTransactionTypes"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="filters.search"
                  label="Search"
                  placeholder="Search by name..."
                  density="compact"
                  prepend-inner-icon="mdi-magnify"
                  clearable
                  @click:clear="filters.search = ''; loadTransactionTypes()"
                  @keyup.enter="loadTransactionTypes"
                />
              </v-col>
            </v-row>

            <!-- Data Table -->
            <v-data-table
              :headers="headers"
              :items="transactionTypes"
              :loading="loading"
              :search="filters.search"
              :sort-by="[{ key: 'id', order: 'asc' }]"
              hover
              class="elevation-1"
            >
              <!-- Status column -->
              <template #[`item.is_active`]="{ item }">
                <v-chip
                  :color="item.is_active ? 'success' : 'error'"
                  size="small"
                >
                  {{ item.is_active ? 'Active' : 'Inactive' }}
                </v-chip>
              </template>

              <!-- Color preview -->
              <template #[`item.color_code`]="{ item }">
                <div v-if="item.color_code" class="d-flex align-center">
                  <div
                    class="color-preview"
                    :style="{ backgroundColor: item.color_code }"
                  />
                  <span class="ml-2">{{ item.color_code }}</span>
                </div>
                <span v-else class="text-grey">—</span>
              </template>

              <!-- Actions column -->
              <template #[`item.actions`]="{ item }">
                <v-btn
                  icon
                  size="small"
                  variant="text"
                  color="primary"
                  @click="openEditDialog(item)"
                >
                  <v-icon size="small">mdi-pencil</v-icon>
                </v-btn>
                <v-btn
                  v-if="!item.deleted_at"
                  icon
                  size="small"
                  variant="text"
                  color="error"
                  @click="confirmDelete(item)"
                >
                  <v-icon size="small">mdi-delete</v-icon>
                </v-btn>
                <v-btn
                  v-else
                  icon
                  size="small"
                  variant="text"
                  color="success"
                  @click="confirmRestore(item)"
                >
                  <v-icon size="small">mdi-restore</v-icon>
                </v-btn>
              </template>

              <!-- Deleted status -->
              <template #[`item.deleted_at`]="{ item }">
                <v-chip
                  v-if="item.deleted_at"
                  color="warning"
                  size="small"
                >
                  Deleted
                </v-chip>
                <span v-else class="text-grey">—</span>
              </template>

              <!-- Footer with total count -->
              <template #bottom>
                <div class="d-flex align-center justify-space-between pa-2">
                  <span class="text-caption text-grey">
                    Total: {{ transactionTypes.length }} transaction types
                  </span>
                  <v-btn
                    v-if="showDeleted"
                    color="info"
                    size="small"
                    @click="showDeleted = !showDeleted"
                  >
                    Hide Deleted
                  </v-btn>
                  <v-btn
                    v-else
                    color="info"
                    size="small"
                    @click="showDeleted = !showDeleted"
                  >
                    Show Deleted
                  </v-btn>
                </div>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Create/Edit Dialog -->
    <v-dialog v-model="dialog" max-width="600px">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon icon="mdi-tag" class="mr-2" color="primary" />
          {{ dialogTitle }}
        </v-card-title>

        <v-divider />

        <v-card-text>
          <v-form ref="formRef" v-model="formValid" @submit.prevent="saveTransactionType">
            <!-- Name -->
            <v-text-field
              v-model="formData.name"
              label="Name"
              required
              :rules="[v => !!v || 'Name is required']"
              clearable
            />

            <!-- Office -->
            <v-select
              v-model="formData.office"
              label="Office"
              :items="officeOptions"
              item-title="text"
              item-value="value"
              required
              :rules="[v => !!v || 'Office is required']"
            />

            <!-- Estimated Duration -->
            <v-text-field
              v-model.number="formData.estimated_duration_minutes"
              label="Estimated Duration (minutes)"
              type="number"
              required
              :rules="[
                v => !!v || 'Duration is required',
                v => v >= 5 || 'Minimum duration is 5 minutes',
                v => v <= 120 || 'Maximum duration is 120 minutes'
              ]"
            />

            <!-- Description -->
            <v-textarea
              v-model="formData.description"
              label="Description"
              rows="3"
              clearable
            />

            <!-- Color Code -->
            <v-row>
              <v-col cols="6">
                <v-text-field
                  v-model="formData.color_code"
                  label="Color Code"
                  placeholder="#FFFFFF"
                  :rules="[
                    v => !v || /^#[0-9A-F]{6}$/i.test(v) || 'Invalid hex color format'
                  ]"
                  clearable
                />
              </v-col>
              <v-col cols="6">
                <div class="mt-2">
                  <label class="text-caption text-grey">Color Preview</label>
                  <div
                    class="color-preview-large mt-1"
                    :style="{
                      backgroundColor: formData.color_code || '#FFFFFF',
                      border: '1px solid #ddd'
                    }"
                  />
                </div>
              </v-col>
            </v-row>

            <!-- Status -->
            <v-switch
              v-model="formData.is_active"
              label="Active"
              color="success"
            />
          </v-form>
        </v-card-text>

        <v-divider />

        <v-card-actions>
          <v-btn
            color="grey"
            variant="text"
            @click="closeDialog"
          >
            Cancel
          </v-btn>
          <v-spacer />
          <v-btn
            color="primary"
            variant="elevated"
            :loading="saving"
            :disabled="!formValid"
            @click="saveTransactionType"
          >
            {{ isEditing ? 'Update' : 'Create' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="deleteDialog" max-width="400px">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon icon="mdi-alert" color="error" class="mr-2" />
          Confirm Delete
        </v-card-title>

        <v-divider />

        <v-card-text class="pt-4">
          Are you sure you want to delete the transaction type
          <strong>"{{ deleteItem?.name }}"</strong>?
          <br><br>
          <span class="text-caption text-grey">
            This action will soft-delete the item and can be restored later.
          </span>
        </v-card-text>

        <v-card-actions>
          <v-btn
            color="grey"
            variant="text"
            @click="deleteDialog = false"
          >
            Cancel
          </v-btn>
          <v-spacer />
          <v-btn
            color="error"
            variant="elevated"
            :loading="deleting"
            @click="deleteTransactionType"
          >
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Restore Confirmation Dialog -->
    <v-dialog v-model="restoreDialog" max-width="400px">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon icon="mdi-restore" color="success" class="mr-2" />
          Confirm Restore
        </v-card-title>

        <v-divider />

        <v-card-text class="pt-4">
          Are you sure you want to restore the transaction type
          <strong>"{{ restoreItem?.name }}"</strong>?
        </v-card-text>

        <v-card-actions>
          <v-btn
            color="grey"
            variant="text"
            @click="restoreDialog = false"
          >
            Cancel
          </v-btn>
          <v-spacer />
          <v-btn
            color="success"
            variant="elevated"
            :loading="restoring"
            @click="restoreTransactionType"
          >
            Restore
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar notifications -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="3000"
      location="top"
    >
      {{ snackbar.message }}
      <template #actions>
        <v-btn
          icon="mdi-close"
          variant="text"
          @click="snackbar.show = false"
        />
      </template>
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import transactionTypeService from '@/services/transactionTypeService';

// ===== State =====
const transactionTypes = ref([]);
const loading = ref(false);
const showDeleted = ref(false);
const filters = ref({
  office: null,
  is_active: null,
  search: ''
});

// Dialog states
const dialog = ref(false);
const dialogTitle = ref('New Transaction Type');
const isEditing = ref(false);
const formValid = ref(false);
const saving = ref(false);
const formRef = ref(null);
const formData = ref({
  name: '',
  office: '',
  estimated_duration_minutes: 30,
  description: '',
  color_code: '',
  is_active: true
});

// Delete states
const deleteDialog = ref(false);
const deleteItem = ref(null);
const deleting = ref(false);

// Restore states
const restoreDialog = ref(false);
const restoreItem = ref(null);
const restoring = ref(false);

// Snackbar
const snackbar = ref({
  show: false,
  message: '',
  color: 'success'
});

// ===== Options =====
const officeOptions = [
  { text: 'Testing', value: 'testing' },
  { text: 'Treatment', value: 'treatment' }
];

const statusOptions = [
  { text: 'Active', value: '1' },
  { text: 'Inactive', value: '0' }
];

const headers = [
  { title: 'ID', key: 'id', sortable: true, width: '80px' },
  { title: 'Name', key: 'name', sortable: true },
  { title: 'Office', key: 'office', sortable: true },
  { 
    title: 'Duration (min)', 
    key: 'estimated_duration_minutes', 
    sortable: true,
    width: '120px'
  },
  { title: 'Color', key: 'color_code', sortable: false, width: '140px' },
  { title: 'Status', key: 'is_active', sortable: true, width: '120px' },
  { title: 'Deleted', key: 'deleted_at', sortable: true, width: '100px' },
  { title: 'Actions', key: 'actions', sortable: false, width: '120px', align: 'center' }
];

// ===== Computed =====
const filteredTypes = computed(() => {
  let items = transactionTypes.value;
  
  // Filter by office
  if (filters.value.office) {
    items = items.filter(item => item.office === filters.value.office);
  }
  
  // Filter by status
  if (filters.value.is_active !== null && filters.value.is_active !== '') {
    const isActive = filters.value.is_active === '1';
    items = items.filter(item => item.is_active === isActive);
  }
  
  // Filter by search
  if (filters.value.search) {
    const search = filters.value.search.toLowerCase();
    items = items.filter(item => 
      item.name.toLowerCase().includes(search) ||
      (item.description && item.description.toLowerCase().includes(search))
    );
  }
  
  // Show/hide deleted
  if (!showDeleted.value) {
    items = items.filter(item => !item.deleted_at);
  }
  
  return items;
});

// ===== Methods =====
const loadTransactionTypes = async () => {
  loading.value = true;
  try {
    const response = await transactionTypeService.getAll();
    transactionTypes.value = response.data || [];
  } catch (error) {
    console.error('Error loading transaction types:', error);
    showSnackbar('Failed to load transaction types', 'error');
  } finally {
    loading.value = false;
  }
};

const resetForm = () => {
  formData.value = {
    name: '',
    office: '',
    estimated_duration_minutes: 30,
    description: '',
    color_code: '',
    is_active: true
  };
  isEditing.value = false;
  dialogTitle.value = 'New Transaction Type';
  formValid.value = false;
  formRef.value?.reset();
};

const openCreateDialog = () => {
  resetForm();
  dialog.value = true;
};

const openEditDialog = (item) => {
  resetForm();
  formData.value = {
    id: item.id,
    name: item.name,
    office: item.office,
    estimated_duration_minutes: item.estimated_duration_minutes,
    description: item.description || '',
    color_code: item.color_code || '',
    is_active: item.is_active
  };
  isEditing.value = true;
  dialogTitle.value = 'Edit Transaction Type';
  dialog.value = true;
};

const closeDialog = () => {
  dialog.value = false;
  resetForm();
};

const saveTransactionType = async () => {
  if (!formValid.value) return;
  
  saving.value = true;
  try {
    if (isEditing.value) {
      await transactionTypeService.update(formData.value.id, formData.value);
      showSnackbar('Transaction type updated successfully', 'success');
    } else {
      await transactionTypeService.create(formData.value);
      showSnackbar('Transaction type created successfully', 'success');
    }
    await loadTransactionTypes();
    closeDialog();
  } catch (error) {
    console.error('Error saving transaction type:', error);
    const message = error.response?.data?.message || 'Failed to save transaction type';
    showSnackbar(message, 'error');
  } finally {
    saving.value = false;
  }
};

const confirmDelete = (item) => {
  deleteItem.value = item;
  deleteDialog.value = true;
};

const deleteTransactionType = async () => {
  deleting.value = true;
  try {
    await transactionTypeService.delete(deleteItem.value.id);
    showSnackbar('Transaction type deleted successfully', 'success');
    await loadTransactionTypes();
  } catch (error) {
    console.error('Error deleting transaction type:', error);
    showSnackbar('Failed to delete transaction type', 'error');
  } finally {
    deleting.value = false;
    deleteDialog.value = false;
    deleteItem.value = null;
  }
};

const confirmRestore = (item) => {
  restoreItem.value = item;
  restoreDialog.value = true;
};

const restoreTransactionType = async () => {
  restoring.value = true;
  try {
    await transactionTypeService.restore(restoreItem.value.id);
    showSnackbar('Transaction type restored successfully', 'success');
    await loadTransactionTypes();
  } catch (error) {
    console.error('Error restoring transaction type:', error);
    showSnackbar('Failed to restore transaction type', 'error');
  } finally {
    restoring.value = false;
    restoreDialog.value = false;
    restoreItem.value = null;
  }
};

const showSnackbar = (message, color = 'success') => {
  snackbar.value = {
    show: true,
    message,
    color
  };
};

// ===== Lifecycle =====
onMounted(() => {
  loadTransactionTypes();
});

// Watch for filter changes
watch(showDeleted, () => {
  // Just update the displayed filtered data
});
</script>

<style scoped>
.color-preview {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid #ddd;
  flex-shrink: 0;
}

.color-preview-large {
  width: 40px;
  height: 40px;
  border-radius: 4px;
}

/* Make sure the table scrolls nicely on mobile */
.v-data-table {
  overflow-x: auto;
}

/* Better spacing for action buttons */
.v-btn {
  margin: 0 2px;
}
</style>