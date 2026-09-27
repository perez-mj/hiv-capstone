<!-- frontend/src/components/settings/TransactionTypesTab.vue -->
<template>
  <div class="transaction-types-tab">
    <!-- ─────────────────────────────────────────────
         Header
    ───────────────────────────────────────────── -->
    <div class="header">
      <div class="header__title">
        <div>
          <h2 class="text-h6 font-weight-bold mb-0">Transaction Types</h2>
          <p class="text-caption text-medium-emphasis mb-0">
            Configure the services offered across your offices
          </p>
        </div>
      </div>
      <v-btn
        color="primary"
        prepend-icon="mdi-plus"
        variant="flat"
        class="text-none"
        @click="openCreateDialog"
      >
        New
      </v-btn>
    </div>

    <!-- ─────────────────────────────────────────────
         Filters
    ───────────────────────────────────────────── -->
    <v-card variant="flat" class="filters-card mb-4">
      <v-card-text class="pa-4">
        <v-row dense>
          <v-col cols="12" sm="6" md="3">
            <v-select
              v-model="filters.office"
              label="Office"
              :items="officeOptions"
              item-title="text"
              item-value="value"
              prepend-inner-icon="mdi-office-building-outline"
              variant="outlined"
              density="comfortable"
              hide-details
              clearable
            />
          </v-col>

          <v-col cols="12" sm="6" md="3">
            <v-select
              v-model="filters.is_active"
              label="Status"
              :items="statusOptions"
              item-title="text"
              item-value="value"
              prepend-inner-icon="mdi-toggle-switch-outline"
              variant="outlined"
              density="comfortable"
              hide-details
              clearable
            />
          </v-col>

          <v-col cols="12" md="6">
            <v-text-field
              v-model="filters.search"
              label="Search"
              placeholder="Search by name or description…"
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="comfortable"
              hide-details
              clearable
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- ─────────────────────────────────────────────
         Table
    ───────────────────────────────────────────── -->
    <v-card variant="flat" class="table-card">
      <v-data-table
        :headers="headers"
        :items="filteredTypes"
        :loading="loading"
        :sort-by="[{ key: 'name', order: 'asc' }]"
        hover
        class="modern-table"
      >
        <!-- Name -->
        <template #item.name="{ item }">
          <div class="d-flex align-center">
            <span
              class="color-dot mr-3"
              :style="{ backgroundColor: item.color_code || '#cbd5e1' }"
            />
            <div>
              <div class="font-weight-medium">{{ item.name }}</div>
              <div
                v-if="item.description"
                class="text-caption text-medium-emphasis text-truncate"
                style="max-width: 320px"
              >
                {{ item.description }}
              </div>
            </div>
          </div>
        </template>

        <!-- Office -->
        <template #item.office="{ item }">
          <v-chip
            size="small"
            variant="tonal"
            :color="item.office === 'testing' ? 'info' : 'deep-purple'"
            class="text-capitalize"
          >
            {{ item.office }}
          </v-chip>
        </template>

        <!-- Duration -->
        <template #item.estimated_duration_minutes="{ item }">
          <span class="text-body-2">
            {{ item.estimated_duration_minutes }}
            <span class="text-medium-emphasis">min</span>
          </span>
        </template>

        <!-- Status -->
        <template #item.is_active="{ item }">
          <v-chip
            size="small"
            variant="flat"
            :color="item.is_active ? 'success' : 'grey'"
            :prepend-icon="item.is_active ? 'mdi-check-circle' : 'mdi-close-circle'"
          >
            {{ item.is_active ? 'Active' : 'Inactive' }}
          </v-chip>
        </template>

        <!-- Actions -->
        <template #item.actions="{ item }">
          <div class="d-flex justify-center ga-1">
            <v-tooltip text="Edit" location="top">
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon="mdi-pencil-outline"
                  size="small"
                  variant="text"
                  color="primary"
                  @click="openEditDialog(item)"
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
                  :icon="item.is_active ? 'mdi-pause-circle-outline' : 'mdi-play-circle-outline'"
                  size="small"
                  variant="text"
                  :color="item.is_active ? 'warning' : 'success'"
                  @click="confirmToggle(item)"
                />
              </template>
            </v-tooltip>

            <v-tooltip text="Delete" location="top">
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon="mdi-delete-outline"
                  size="small"
                  variant="text"
                  color="error"
                  @click="confirmDelete(item)"
                />
              </template>
            </v-tooltip>
          </div>
        </template>

        <!-- Empty state -->
        <template #no-data>
          <div class="empty-state">
            <v-icon size="48" color="grey-lighten-1">mdi-tag-off-outline</v-icon>
            <p class="text-body-2 text-medium-emphasis mt-3 mb-0">
              No transaction types found
            </p>
            <v-btn
              color="primary"
              variant="tonal"
              size="small"
              prepend-icon="mdi-plus"
              class="mt-3 text-none"
              @click="openCreateDialog"
            >
              Create your first one
            </v-btn>
          </div>
        </template>

        <!-- Footer -->
        <template #bottom>
          <div class="table-footer">
            <span class="text-caption text-medium-emphasis">
              Showing <strong>{{ filteredTypes.length }}</strong>
              of <strong>{{ transactionTypes.length }}</strong> transaction types
            </span>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- ─────────────────────────────────────────────
         Create / Edit Dialog
    ───────────────────────────────────────────── -->
    <v-dialog v-model="dialog" max-width="620" persistent>
      <v-card class="dialog-card">
        <div class="dialog-header">
          <div class="d-flex align-center">
            <v-avatar size="40" color="primary" variant="tonal" class="mr-3">
              <v-icon>{{ isEditing ? 'mdi-pencil' : 'mdi-plus' }}</v-icon>
            </v-avatar>
            <div>
              <h3 class="text-subtitle-1 font-weight-bold mb-0">{{ dialogTitle }}</h3>
              <p class="text-caption text-medium-emphasis mb-0">
                {{
                  isEditing
                    ? 'Update the details of this transaction type'
                    : 'Fill in the details to create a new transaction type'
                }}
              </p>
            </div>
          </div>
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            @click="closeDialog"
          />
        </div>

        <v-divider />

        <v-card-text class="pa-6">
          <v-form ref="formRef" v-model="formValid" @submit.prevent="saveTransactionType">
            <v-text-field
              v-model="formData.name"
              label="Name"
              placeholder="e.g. Blood Test"
              variant="outlined"
              density="comfortable"
              :rules="[v => !!v || 'Name is required']"
              class="mb-2"
            />

            <v-row>
              <v-col cols="12" sm="6">
                <v-select
                  v-model="formData.office"
                  label="Office"
                  :items="officeOptions"
                  item-title="text"
                  item-value="value"
                  variant="outlined"
                  density="comfortable"
                  :rules="[v => !!v || 'Office is required']"
                />
              </v-col>

              <v-col cols="12" sm="6">
                <v-text-field
                  v-model.number="formData.estimated_duration_minutes"
                  label="Duration (minutes)"
                  type="number"
                  variant="outlined"
                  density="comfortable"
                  :rules="[
                    v => !!v || 'Duration is required',
                    v => v >= 5 || 'Minimum is 5',
                    v => v <= 120 || 'Maximum is 120'
                  ]"
                />
              </v-col>
            </v-row>

            <v-textarea
              v-model="formData.description"
              label="Description"
              placeholder="Optional details about this transaction type"
              variant="outlined"
              density="comfortable"
              rows="3"
              auto-grow
              class="mt-2"
            />

            <v-row class="mt-2" align="center">
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="formData.color_code"
                  label="Color code"
                  placeholder="#FFFFFF"
                  variant="outlined"
                  density="comfortable"
                  :rules="[
                    v => !v || /^#[0-9A-F]{6}$/i.test(v) || 'Invalid hex format (e.g. #4F46E5)'
                  ]"
                />
              </v-col>

              <v-col cols="12" sm="6">
                <div class="color-preview-block">
                  <span class="text-caption text-medium-emphasis">Preview</span>
                  <div class="d-flex align-center mt-1">
                    <span
                      class="color-swatch"
                      :style="{ backgroundColor: formData.color_code || '#FFFFFF' }"
                    />
                    <code class="text-caption ml-3">
                      {{ formData.color_code || '#FFFFFF' }}
                    </code>
                  </div>
                </div>
              </v-col>
            </v-row>

            <v-switch
              v-model="formData.is_active"
              color="success"
              hide-details
              class="mt-2"
              inset
            >
              <template #label>
                <div>
                  <div class="font-weight-medium">Active</div>
                  <div class="text-caption text-medium-emphasis">
                    Inactive types won't appear when scheduling appointments
                  </div>
                </div>
              </template>
            </v-switch>
          </v-form>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
          <v-btn variant="text" class="text-none" @click="closeDialog">Cancel</v-btn>
          <v-spacer />
          <v-btn
            color="primary"
            variant="flat"
            class="text-none"
            :loading="saving"
            :disabled="!formValid"
            @click="saveTransactionType"
          >
            {{ isEditing ? 'Save Changes' : 'Create' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ─────────────────────────────────────────────
         Delete Confirmation
    ───────────────────────────────────────────── -->
    <ConfirmDialog
      v-model="deleteDialog"
      title="Delete transaction type?"
      confirm-text="Delete"
      color="error"
      icon="mdi-alert-outline"
      :loading="deleting"
      @confirm="deleteTransactionType"
    >
      You're about to permanently delete
      <strong class="text-high-emphasis">"{{ deleteItem?.name }}"</strong>.
      This action cannot be undone.
    </ConfirmDialog>

    <!-- ─────────────────────────────────────────────
         Toggle Active Confirmation
    ───────────────────────────────────────────── -->
    <ConfirmDialog
      v-model="toggleDialog"
      :title="`${toggleItem?.is_active ? 'Deactivate' : 'Activate'} transaction type?`"
      :confirm-text="toggleItem?.is_active ? 'Deactivate' : 'Activate'"
      :color="toggleItem?.is_active ? 'warning' : 'success'"
      :icon="toggleItem?.is_active ? 'mdi-pause-circle-outline' : 'mdi-play-circle-outline'"
      :loading="toggling"
      @confirm="toggleTransactionType"
    >
      <strong class="text-high-emphasis">"{{ toggleItem?.name }}"</strong>
      will be marked as
      <strong>{{ toggleItem?.is_active ? 'inactive' : 'active' }}</strong>.
    </ConfirmDialog>

    <!-- ─────────────────────────────────────────────
         Snackbar
    ───────────────────────────────────────────── -->
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
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import transactionTypeService from '@/services/transactionTypeService';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';

/* ─────────────── State ─────────────── */
const transactionTypes = ref([]);
const loading = ref(false);

const filters = ref({
  office: null,
  is_active: null,
  search: ''
});

/* ─────────────── Dialog state ─────────────── */
const dialog = ref(false);
const dialogTitle = ref('New Transaction Type');
const isEditing = ref(false);
const formValid = ref(false);
const saving = ref(false);
const formRef = ref(null);
const formData = ref(emptyForm());

/* ─────────────── Delete state ─────────────── */
const deleteDialog = ref(false);
const deleteItem = ref(null);
const deleting = ref(false);

/* ─────────────── Toggle state ─────────────── */
const toggleDialog = ref(false);
const toggleItem = ref(null);
const toggling = ref(false);

/* ─────────────── Snackbar ─────────────── */
const snackbar = ref({ show: false, message: '', color: 'success' });

/* ─────────────── Constants ─────────────── */
const officeOptions = [
  { text: 'Testing', value: 'testing' },
  { text: 'Treatment', value: 'treatment' }
];

const statusOptions = [
  { text: 'Active', value: '1' },
  { text: 'Inactive', value: '0' }
];

const headers = [
  { title: 'Name', key: 'name', sortable: true },
  { title: 'Office', key: 'office', sortable: true, width: '140px' },
  { title: 'Duration', key: 'estimated_duration_minutes', sortable: true, width: '120px' },
  { title: 'Status', key: 'is_active', sortable: true, width: '120px' },
  { title: 'Actions', key: 'actions', sortable: false, width: '150px', align: 'center' }
];

/* ─────────────── Computed ─────────────── */
const filteredTypes = computed(() => {
  let items = transactionTypes.value;

  if (filters.value.office) {
    items = items.filter(i => i.office === filters.value.office);
  }

  if (filters.value.is_active !== null && filters.value.is_active !== '') {
    const isActive = filters.value.is_active === '1';
    items = items.filter(i => i.is_active === isActive);
  }

  if (filters.value.search) {
    const s = filters.value.search.toLowerCase();
    items = items.filter(
      i =>
        i.name.toLowerCase().includes(s) ||
        (i.description && i.description.toLowerCase().includes(s))
    );
  }

  return items;
});

/* ─────────────── Helpers ─────────────── */
function emptyForm() {
  return {
    name: '',
    office: '',
    estimated_duration_minutes: 30,
    description: '',
    color_code: '',
    is_active: true
  };
}

function showSnackbar(message, color = 'success') {
  snackbar.value = { show: true, message, color };
}

/* ─────────────── Data loading ─────────────── */
async function loadTransactionTypes() {
  loading.value = true;
  try {
    const response = await transactionTypeService.getAll({ include_inactive: true });
    transactionTypes.value = response.data || [];
  } catch (error) {
    console.error('Error loading transaction types:', error);
    showSnackbar('Failed to load transaction types', 'error');
  } finally {
    loading.value = false;
  }
}

/* ─────────────── Create / Edit ─────────────── */
function resetForm() {
  formData.value = emptyForm();
  isEditing.value = false;
  dialogTitle.value = 'New Transaction Type';
  formValid.value = false;
  formRef.value?.resetValidation();
}

function openCreateDialog() {
  resetForm();
  dialog.value = true;
}

function openEditDialog(item) {
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
}

function closeDialog() {
  dialog.value = false;
  resetForm();
}

async function saveTransactionType() {
  if (!formValid.value) return;
  saving.value = true;
  try {
    if (isEditing.value) {
      await transactionTypeService.update(formData.value.id, formData.value);
      showSnackbar('Transaction type updated successfully');
    } else {
      await transactionTypeService.create(formData.value);
      showSnackbar('Transaction type created successfully');
    }
    await loadTransactionTypes();
    closeDialog();
  } catch (error) {
    console.error('Error saving transaction type:', error);
    showSnackbar(
      error.response?.data?.error || 'Failed to save transaction type',
      'error'
    );
  } finally {
    saving.value = false;
  }
}

/* ─────────────── Delete ─────────────── */
function confirmDelete(item) {
  deleteItem.value = item;
  deleteDialog.value = true;
}

async function deleteTransactionType() {
  deleting.value = true;
  try {
    await transactionTypeService.delete(deleteItem.value.id);
    showSnackbar('Transaction type deleted successfully');
    await loadTransactionTypes();
    deleteDialog.value = false;
  } catch (error) {
    console.error('Error deleting transaction type:', error);
    showSnackbar(
      error.response?.data?.error || 'Failed to delete transaction type',
      'error'
    );
  } finally {
    deleting.value = false;
    deleteItem.value = null;
  }
}

/* ─────────────── Toggle Active ─────────────── */
function confirmToggle(item) {
  toggleItem.value = item;
  toggleDialog.value = true;
}

async function toggleTransactionType() {
  toggling.value = true;
  try {
    await transactionTypeService.toggleActive(toggleItem.value.id);
    showSnackbar(
      `Transaction type ${toggleItem.value.is_active ? 'deactivated' : 'activated'} successfully`
    );
    await loadTransactionTypes();
    toggleDialog.value = false;
  } catch (error) {
    console.error('Error toggling transaction type:', error);
    showSnackbar(
      error.response?.data?.error || 'Failed to toggle transaction type',
      'error'
    );
  } finally {
    toggling.value = false;
    toggleItem.value = null;
  }
}

/* ─────────────── Lifecycle ─────────────── */
onMounted(loadTransactionTypes);
</script>

<style scoped>
.transaction-types-tab {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

/* ─── Header ─── */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
}

.header__title {
  display: flex;
  align-items: center;
}

/* ─── Cards ─── */
.filters-card,
.table-card {
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
}

.dialog-card {
  border-radius: 16px;
  overflow: hidden;
}

/* ─── Dialog header ─── */
.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
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
  padding-top: 14px !important;
  padding-bottom: 14px !important;
}

.table-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 12px 20px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

/* ─── Color indicators ─── */
.color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 2px #fff, 0 0 0 3px rgba(0, 0, 0, 0.06);
}

.color-swatch {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  flex-shrink: 0;
}

.color-preview-block {
  padding-top: 4px;
}

/* ─── Empty state ─── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 16px;
}

/* ─── Responsive ─── */
@media (max-width: 600px) {
  .transaction-types-tab {
    padding: 16px;
  }

  .header {
    flex-direction: column;
    align-items: stretch;
  }

  .header__title {
    justify-content: flex-start;
  }
}
</style>