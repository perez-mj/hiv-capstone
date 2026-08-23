<!-- frontend/src/views/admin/AppointmentSettingsView.vue -->
<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center justify-space-between">
            <div>
              <v-icon icon="mdi-cog" class="mr-2" color="primary" />
              Appointment Settings Management
            </div>
            <v-btn
              color="primary"
              prepend-icon="mdi-plus"
              @click="openCreateDialog"
            >
              New Settings
            </v-btn>
          </v-card-title>

          <v-divider />

          <v-card-text>
            <!-- Data Table -->
            <v-data-table
              :headers="headers"
              :items="settingsList"
              :loading="loading"
              :sort-by="[{ key: 'office', order: 'asc' }]"
              hover
              class="elevation-1"
            >
              <!-- Office column -->
              <template #[`item.office`]="{ item }">
                <v-chip
                  :color="item.office ? 'primary' : 'grey'"
                  size="small"
                >
                  {{ item.office || 'Global' }}
                </v-chip>
              </template>

              <!-- Working hours -->
              <template #[`item.working_hours`]="{ item }">
                {{ formatTime(item.start_time) }} - {{ formatTime(item.end_time) }}
              </template>

              <!-- Lunch break -->
              <template #[`item.lunch_break`]="{ item }">
                {{ formatTime(item.lunch_start) }} - {{ formatTime(item.lunch_end) }}
              </template>

              <!-- Working days -->
              <template #[`item.working_days`]="{ item }">
                <div class="d-flex gap-1 flex-wrap">
                  <v-chip
                    v-for="day in item.working_days || []"
                    :key="day"
                    size="x-small"
                    color="primary"
                    variant="outlined"
                  >
                    {{ formatDay(day) }}
                  </v-chip>
                </div>
              </template>

              <!-- Slot duration -->
              <template #[`item.slot_duration_minutes`]="{ item }">
                {{ item.slot_duration_minutes }} min
              </template>

              <!-- Capacity -->
              <template #[`item.capacity`]="{ item }">
                {{ item.max_capacity_per_slot }}/slot · {{ item.daily_capacity }}/day
              </template>

              <!-- Status -->
              <template #[`item.is_active`]="{ item }">
                <v-chip
                  :color="item.is_active ? 'success' : 'error'"
                  size="small"
                >
                  {{ item.is_active ? 'Active' : 'Inactive' }}
                </v-chip>
              </template>

              <!-- Actions -->
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
                  icon
                  size="small"
                  variant="text"
                  :color="item.is_active ? 'warning' : 'success'"
                  @click="toggleActive(item)"
                >
                  <v-icon size="small">
                    {{ item.is_active ? 'mdi-pause' : 'mdi-play' }}
                  </v-icon>
                </v-btn>
                <v-btn
                  icon
                  size="small"
                  variant="text"
                  color="error"
                  @click="confirmDelete(item)"
                  :disabled="!item.office"
                >
                  <v-icon size="small">mdi-delete</v-icon>
                </v-btn>
                <v-btn
                  v-if="item.office"
                  icon
                  size="small"
                  variant="text"
                  color="info"
                  @click="applyToOffice(item)"
                >
                  <v-icon size="small">mdi-content-copy</v-icon>
                </v-btn>
              </template>

              <!-- No data -->
              <template #no-data>
                <div class="text-center pa-4">
                  <v-icon icon="mdi-cog-off" size="48" color="grey-lighten-1" />
                  <p class="mt-2 text-grey">No appointment settings found</p>
                  <v-btn
                    color="primary"
                    variant="text"
                    @click="loadSettings"
                  >
                    Refresh
                  </v-btn>
                </div>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Create/Edit Dialog -->
    <v-dialog v-model="dialog" max-width="800px">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon icon="mdi-cog" class="mr-2" color="primary" />
          {{ dialogTitle }}
        </v-card-title>

        <v-divider />

        <v-card-text>
          <v-form ref="formRef" v-model="formValid" @submit.prevent="saveSettings">
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formData.office"
                  label="Office (leave empty for global)"
                  placeholder="e.g., testing, treatment"
                  :disabled="isEditing && !formData.office"
                  clearable
                  hint="Leave empty for global settings"
                  persistent-hint
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-switch
                  v-model="formData.is_active"
                  label="Active"
                  color="success"
                  inset
                />
              </v-col>
            </v-row>

            <v-divider class="my-4" />

            <h4 class="text-subtitle-1 font-weight-medium mb-3">Working Hours</h4>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formData.start_time"
                  label="Start Time"
                  type="time"
                  required
                  :rules="[v => !!v || 'Start time is required']"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formData.end_time"
                  label="End Time"
                  type="time"
                  required
                  :rules="[v => !!v || 'End time is required']"
                />
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="formData.slot_duration_minutes"
                  label="Slot Duration (minutes)"
                  type="number"
                  required
                  :rules="[
                    v => !!v || 'Slot duration is required',
                    v => v >= 5 || 'Minimum is 5 minutes',
                    v => v <= 120 || 'Maximum is 120 minutes'
                  ]"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="formData.max_capacity_per_slot"
                  label="Max Capacity per Slot"
                  type="number"
                  required
                  :rules="[
                    v => !!v || 'Capacity is required',
                    v => v >= 1 || 'Minimum is 1',
                    v => v <= 20 || 'Maximum is 20'
                  ]"
                />
              </v-col>
            </v-row>

            <v-divider class="my-4" />

            <h4 class="text-subtitle-1 font-weight-medium mb-3">Lunch Break</h4>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formData.lunch_start"
                  label="Lunch Start"
                  type="time"
                  required
                  :rules="[v => !!v || 'Lunch start is required']"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formData.lunch_end"
                  label="Lunch End"
                  type="time"
                  required
                  :rules="[v => !!v || 'Lunch end is required']"
                />
              </v-col>
            </v-row>

            <v-divider class="my-4" />

            <h4 class="text-subtitle-1 font-weight-medium mb-3">Daily Capacity</h4>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="formData.daily_capacity"
                  label="Daily Capacity"
                  type="number"
                  required
                  :rules="[
                    v => !!v || 'Daily capacity is required',
                    v => v >= 1 || 'Minimum is 1',
                    v => v <= 100 || 'Maximum is 100'
                  ]"
                />
              </v-col>
            </v-row>

            <v-divider class="my-4" />

            <h4 class="text-subtitle-1 font-weight-medium mb-3">Working Days</h4>
            <v-row>
              <v-col cols="12">
                <v-select
                  v-model="formData.working_days"
                  label="Working Days"
                  :items="dayOptions"
                  item-title="text"
                  item-value="value"
                  multiple
                  chips
                  required
                  :rules="[v => v && v.length > 0 || 'At least one working day is required']"
                >
                  <template #selection="{ item, index }">
                    <v-chip
                      v-if="index < 3"
                      size="small"
                      color="primary"
                    >
                      {{ item.title }}
                    </v-chip>
                    <span
                      v-if="index === 3"
                      class="text-grey text-caption"
                    >
                      (+{{ formData.working_days.length - 3 }} more)
                    </span>
                  </template>
                </v-select>
              </v-col>
            </v-row>

            <v-divider class="my-4" />

            <h4 class="text-subtitle-1 font-weight-medium mb-3">Booking Rules</h4>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="formData.advance_booking_days"
                  label="Advance Booking (days)"
                  type="number"
                  required
                  :rules="[
                    v => !!v || 'Advance booking days is required',
                    v => v >= 1 || 'Minimum is 1 day',
                    v => v <= 365 || 'Maximum is 365 days'
                  ]"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="formData.booking_lead_time_minutes"
                  label="Booking Lead Time (minutes)"
                  type="number"
                  required
                  :rules="[
                    v => v >= 0 || 'Cannot be negative',
                    v => v <= 1440 || 'Maximum is 1440 minutes (24 hours)'
                  ]"
                />
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="formData.max_appointments_per_patient_per_day"
                  label="Max Appointments per Patient per Day"
                  type="number"
                  required
                  :rules="[
                    v => !!v || 'This field is required',
                    v => v >= 1 || 'Minimum is 1',
                    v => v <= 10 || 'Maximum is 10'
                  ]"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="formData.cancellation_deadline_hours"
                  label="Cancellation Deadline (hours)"
                  type="number"
                  required
                  :rules="[
                    v => v >= 0 || 'Cannot be negative',
                    v => v <= 168 || 'Maximum is 168 hours (7 days)'
                  ]"
                />
              </v-col>
            </v-row>

            <v-divider class="my-4" />

            <h4 class="text-subtitle-1 font-weight-medium mb-3">Features</h4>
            <v-row>
              <v-col cols="12" md="6">
                <v-switch
                  v-model="formData.allow_online_booking"
                  label="Allow Online Booking"
                  color="success"
                  inset
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-switch
                  v-model="formData.allow_online_cancellation"
                  label="Allow Online Cancellation"
                  color="success"
                  inset
                />
              </v-col>
            </v-row>
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
            @click="saveSettings"
          >
            {{ isEditing ? 'Update' : 'Create' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation -->
    <v-dialog v-model="deleteDialog" max-width="400px">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon icon="mdi-alert" color="error" class="mr-2" />
          Confirm Delete
        </v-card-title>

        <v-divider />

        <v-card-text class="pt-4">
          Are you sure you want to delete the settings for
          <strong>{{ deleteItem?.office || 'Global' }}</strong>?
          <br><br>
          <span class="text-caption text-grey">
            This action cannot be undone.
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
            @click="deleteSettings"
          >
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Apply to Office Dialog -->
    <v-dialog v-model="applyDialog" max-width="500px">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon icon="mdi-content-copy" color="info" class="mr-2" />
          Apply Settings to Office
        </v-card-title>

        <v-divider />

        <v-card-text class="pt-4">
          <p>
            Apply settings from
            <strong>{{ applySource?.office || 'Global' }}</strong>
            to:
          </p>

          <v-select
            v-model="applyTarget"
            label="Target Office"
            :items="availableOffices"
            item-title="text"
            item-value="value"
            required
            :rules="[v => !!v || 'Target office is required']"
          />
        </v-card-text>

        <v-card-actions>
          <v-btn
            color="grey"
            variant="text"
            @click="applyDialog = false"
          >
            Cancel
          </v-btn>
          <v-spacer />
          <v-btn
            color="info"
            variant="elevated"
            :loading="applying"
            @click="applySettings"
          >
            Apply Settings
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
import { ref, onMounted, computed } from 'vue';
import appointmentSettingService from '@/services/appointmentSettingService';

// ===== State =====
const settings = ref([]);
const loading = ref(false);

// Dialog states
const dialog = ref(false);
const dialogTitle = ref('New Appointment Settings');
const isEditing = ref(false);
const formValid = ref(false);
const saving = ref(false);
const formRef = ref(null);

const formData = ref({
  office: '',
  start_time: '08:00',
  end_time: '17:00',
  slot_duration_minutes: 30,
  max_capacity_per_slot: 5,
  lunch_start: '12:00',
  lunch_end: '13:00',
  daily_capacity: 20,
  working_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
  holidays: [],
  advance_booking_days: 30,
  booking_lead_time_minutes: 60,
  max_appointments_per_patient_per_day: 1,
  allow_online_booking: true,
  allow_online_cancellation: true,
  cancellation_deadline_hours: 24,
  is_active: true
});

// Delete state
const deleteDialog = ref(false);
const deleteItem = ref(null);
const deleting = ref(false);

// Apply state
const applyDialog = ref(false);
const applySource = ref(null);
const applyTarget = ref('');
const applying = ref(false);

// Snackbar
const snackbar = ref({
  show: false,
  message: '',
  color: 'success'
});

// ===== Options =====
const dayOptions = [
  { text: 'Monday', value: 'mon' },
  { text: 'Tuesday', value: 'tue' },
  { text: 'Wednesday', value: 'wed' },
  { text: 'Thursday', value: 'thu' },
  { text: 'Friday', value: 'fri' },
  { text: 'Saturday', value: 'sat' },
  { text: 'Sunday', value: 'sun' }
];

const headers = [
  { title: 'Office', key: 'office', sortable: true },
  { title: 'Working Hours', key: 'working_hours', sortable: false },
  { title: 'Lunch Break', key: 'lunch_break', sortable: false },
  { title: 'Working Days', key: 'working_days', sortable: false },
  { title: 'Slot', key: 'slot_duration_minutes', sortable: true },
  { title: 'Capacity', key: 'capacity', sortable: false },
  { title: 'Status', key: 'is_active', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, align: 'center' }
];

// ===== Computed =====
const settingsList = computed(() => {
  return settings.value;
});

const availableOffices = computed(() => {
  const offices = settings.value
    .filter(s => s.office && s.office !== applySource.value?.office)
    .map(s => ({
      text: s.office.charAt(0).toUpperCase() + s.office.slice(1),
      value: s.office
    }));
  
  // Add option to apply to all
  offices.push({
    text: 'All Offices',
    value: 'all'
  });
  
  return offices;
});

// ===== Methods =====
const loadSettings = async () => {
  loading.value = true;
  try {
    const response = await appointmentSettingService.getAll();
    settings.value = response.data || [];
  } catch (error) {
    console.error('Error loading settings:', error);
    showSnackbar('Failed to load settings', 'error');
  } finally {
    loading.value = false;
  }
};

const formatTime = (time) => {
  if (!time) return '';
  const parts = time.split(':');
  if (parts.length >= 2) {
    const hours = parseInt(parts[0]);
    const minutes = parts[1];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  }
  return time;
};

const formatDay = (day) => {
  const map = {
    mon: 'Mon',
    tue: 'Tue',
    wed: 'Wed',
    thu: 'Thu',
    fri: 'Fri',
    sat: 'Sat',
    sun: 'Sun'
  };
  return map[day] || day;
};

const resetForm = () => {
  formData.value = {
    office: '',
    start_time: '08:00',
    end_time: '17:00',
    slot_duration_minutes: 30,
    max_capacity_per_slot: 5,
    lunch_start: '12:00',
    lunch_end: '13:00',
    daily_capacity: 20,
    working_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
    holidays: [],
    advance_booking_days: 30,
    booking_lead_time_minutes: 60,
    max_appointments_per_patient_per_day: 1,
    allow_online_booking: true,
    allow_online_cancellation: true,
    cancellation_deadline_hours: 24,
    is_active: true
  };
  isEditing.value = false;
  dialogTitle.value = 'New Appointment Settings';
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
    office: item.office || '',
    start_time: item.start_time?.substring(0, 5) || '08:00',
    end_time: item.end_time?.substring(0, 5) || '17:00',
    slot_duration_minutes: item.slot_duration_minutes,
    max_capacity_per_slot: item.max_capacity_per_slot,
    lunch_start: item.lunch_start?.substring(0, 5) || '12:00',
    lunch_end: item.lunch_end?.substring(0, 5) || '13:00',
    daily_capacity: item.daily_capacity,
    working_days: item.working_days || ['mon', 'tue', 'wed', 'thu', 'fri'],
    holidays: item.holidays || [],
    advance_booking_days: item.advance_booking_days,
    booking_lead_time_minutes: item.booking_lead_time_minutes,
    max_appointments_per_patient_per_day: item.max_appointments_per_patient_per_day,
    allow_online_booking: item.allow_online_booking,
    allow_online_cancellation: item.allow_online_cancellation,
    cancellation_deadline_hours: item.cancellation_deadline_hours,
    is_active: item.is_active
  };
  isEditing.value = true;
  dialogTitle.value = 'Edit Appointment Settings';
  dialog.value = true;
};

const closeDialog = () => {
  dialog.value = false;
  resetForm();
};

const saveSettings = async () => {
  if (!formValid.value) return;
  
  saving.value = true;
  try {
    const data = { ...formData.value };
    // Convert empty office string to null
    if (data.office === '') data.office = null;
    
    let response;
    if (isEditing.value) {
      response = await appointmentSettingService.update(data.id, data);
    } else {
      response = await appointmentSettingService.create(data);
    }
    
    showSnackbar(response.message || 'Settings saved successfully', 'success');
    await loadSettings();
    closeDialog();
  } catch (error) {
    console.error('Error saving settings:', error);
    const message = error.response?.data?.message || 'Failed to save settings';
    showSnackbar(message, 'error');
  } finally {
    saving.value = false;
  }
};

const confirmDelete = (item) => {
  deleteItem.value = item;
  deleteDialog.value = true;
};

const deleteSettings = async () => {
  deleting.value = true;
  try {
    const response = await appointmentSettingService.delete(deleteItem.value.id);
    showSnackbar(response.message || 'Settings deleted successfully', 'success');
    await loadSettings();
  } catch (error) {
    console.error('Error deleting settings:', error);
    showSnackbar(error.response?.data?.message || 'Failed to delete settings', 'error');
  } finally {
    deleting.value = false;
    deleteDialog.value = false;
    deleteItem.value = null;
  }
};

const toggleActive = async (item) => {
  try {
    const response = await appointmentSettingService.toggleActive(item.id);
    showSnackbar(response.message || 'Status toggled successfully', 'success');
    await loadSettings();
  } catch (error) {
    console.error('Error toggling status:', error);
    showSnackbar(error.response?.data?.message || 'Failed to toggle status', 'error');
  }
};

const applyToOffice = (item) => {
  applySource.value = item;
  applyTarget.value = '';
  applyDialog.value = true;
};

const applySettings = async () => {
  if (!applyTarget.value) {
    showSnackbar('Please select a target office', 'warning');
    return;
  }
  
  applying.value = true;
  try {
    const targetOffice = applyTarget.value === 'all' ? null : applyTarget.value;
    const response = await appointmentSettingService.applyToAll(
      applySource.value.id,
      targetOffice
    );
    showSnackbar(response.message || 'Settings applied successfully', 'success');
    await loadSettings();
    applyDialog.value = false;
  } catch (error) {
    console.error('Error applying settings:', error);
    showSnackbar(error.response?.data?.message || 'Failed to apply settings', 'error');
  } finally {
    applying.value = false;
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
  loadSettings();
});
</script>

<style scoped>
.gap-1 {
  gap: 4px;
}
</style>