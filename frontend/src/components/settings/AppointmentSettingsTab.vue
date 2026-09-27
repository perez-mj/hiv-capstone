<!-- frontend/src/components/settings/AppointmentSettingsTab.vue -->
<template>
  <div class="appointment-settings-tab">
    <!-- ─────────────────────────────────────────────
         Header
    ───────────────────────────────────────────── -->
    <div class="header">
      <div>
        <h2 class="text-h6 font-weight-bold mb-0">
          Appointment Scheduling Rules
        </h2>
        <p class="text-caption text-medium-emphasis mb-0">
          Configure working hours, capacity, and booking rules per office
        </p>
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
         Table
    ───────────────────────────────────────────── -->
    <v-card variant="flat" class="table-card">
      <v-data-table
        :headers="headers"
        :items="settingsList"
        :loading="loading"
        :sort-by="[{ key: 'office', order: 'asc' }]"
        hover
        class="modern-table"
      >
        <!-- Office -->
        <template #item.office="{ item }">
          <v-chip
            size="small"
            variant="tonal"
            :color="item.office ? 'primary' : 'grey'"
            :prepend-icon="item.office ? 'mdi-office-building' : 'mdi-earth'"
            class="text-capitalize font-weight-medium"
          >
            {{ item.office || 'Global' }}
          </v-chip>
        </template>

        <!-- Working Hours -->
        <template #item.working_hours="{ item }">
          <span class="text-body-2">
            {{ formatTime(item.start_time) }}
            <span class="text-medium-emphasis">–</span>
            {{ formatTime(item.end_time) }}
          </span>
        </template>

        <!-- Lunch Break -->
        <template #item.lunch_break="{ item }">
          <span class="text-body-2">
            {{ formatTime(item.lunch_start) }}
            <span class="text-medium-emphasis">–</span>
            {{ formatTime(item.lunch_end) }}
          </span>
        </template>

        <!-- Working Days -->
        <template #item.working_days="{ item }">
          <div class="d-flex flex-wrap ga-1">
            <v-chip
              v-for="day in item.working_days || []"
              :key="day"
              size="x-small"
              variant="tonal"
              color="primary"
              class="font-weight-medium"
            >
              {{ formatDay(day) }}
            </v-chip>
          </div>
        </template>

        <!-- Slot duration -->
        <template #item.slot_duration_minutes="{ item }">
          <span class="text-body-2">
            {{ item.slot_duration_minutes }}
            <span class="text-medium-emphasis">min</span>
          </span>
        </template>

        <!-- Capacity -->
        <template #item.capacity="{ item }">
          <div class="text-body-2">
            <div>
              <v-icon size="14" color="primary" class="mr-1">mdi-account-multiple</v-icon>
              {{ item.max_capacity_per_slot }}<span class="text-medium-emphasis">/slot</span>
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ item.daily_capacity }}/day total
            </div>
          </div>
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

            <v-tooltip text="Apply to another office" location="top">
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon="mdi-content-copy"
                  size="small"
                  variant="text"
                  color="info"
                  :disabled="!item.office"
                  @click="openApplyDialog(item)"
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
                  :disabled="!item.office"
                  @click="confirmDelete(item)"
                />
              </template>
            </v-tooltip>
          </div>
        </template>

        <!-- Empty state -->
        <template #no-data>
          <div class="empty-state">
            <v-icon size="48" color="grey-lighten-1">mdi-cog-off-outline</v-icon>
            <p class="text-body-2 text-medium-emphasis mt-3 mb-0">
              No appointment settings found
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
              Showing <strong>{{ settingsList.length }}</strong> settings
              configuration{{ settingsList.length === 1 ? '' : 's' }}
            </span>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- ─────────────────────────────────────────────
         Create / Edit Dialog
    ───────────────────────────────────────────── -->
    <v-dialog v-model="dialog" max-width="820" persistent scrollable>
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
                    ? 'Update the scheduling rules for this office'
                    : 'Define a new scheduling ruleset for an office'
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
          <v-form ref="formRef" v-model="formValid" @submit.prevent="saveSettings">
            <!-- Office -->
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formData.office"
                  label="Office"
                  placeholder="e.g. testing, treatment"
                  prepend-inner-icon="mdi-office-building-outline"
                  variant="outlined"
                  density="comfortable"
                  :disabled="isEditing"
                  clearable
                  hint="Leave empty for global settings"
                  persistent-hint
                />
              </v-col>
              <v-col cols="12" md="6" class="d-flex align-center">
                <v-switch
                  v-model="formData.is_active"
                  color="success"
                  hide-details
                  inset
                >
                  <template #label>
                    <div>
                      <div class="font-weight-medium">Active</div>
                      <div class="text-caption text-medium-emphasis">
                        Inactive rules won't be used for booking
                      </div>
                    </div>
                  </template>
                </v-switch>
              </v-col>
            </v-row>

            <!-- Working Hours -->
            <div class="section-heading">
              <v-icon size="18" color="primary">mdi-clock-outline</v-icon>
              <span>Working Hours</span>
            </div>

            <v-row>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="formData.start_time"
                  label="Start Time"
                  type="time"
                  prepend-inner-icon="mdi-clock-start"
                  variant="outlined"
                  density="comfortable"
                  :rules="[v => !!v || 'Start time is required']"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="formData.end_time"
                  label="End Time"
                  type="time"
                  prepend-inner-icon="mdi-clock-end"
                  variant="outlined"
                  density="comfortable"
                  :rules="[
                    v => !!v || 'End time is required',
                    v => !formData.start_time || v > formData.start_time || 'Must be after start time'
                  ]"
                />
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model.number="formData.slot_duration_minutes"
                  label="Slot Duration (minutes)"
                  type="number"
                  prepend-inner-icon="mdi-timer-outline"
                  variant="outlined"
                  density="comfortable"
                  :rules="[
                    v => !!v || 'Slot duration is required',
                    v => v >= 5 || 'Minimum is 5 minutes',
                    v => v <= 120 || 'Maximum is 120 minutes'
                  ]"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model.number="formData.max_capacity_per_slot"
                  label="Max Capacity per Slot"
                  type="number"
                  prepend-inner-icon="mdi-account-multiple-outline"
                  variant="outlined"
                  density="comfortable"
                  :rules="[
                    v => !!v || 'Capacity is required',
                    v => v >= 1 || 'Minimum is 1',
                    v => v <= 20 || 'Maximum is 20'
                  ]"
                />
              </v-col>
            </v-row>

            <!-- Lunch Break -->
            <div class="section-heading">
              <v-icon size="18" color="primary">mdi-food-outline</v-icon>
              <span>Lunch Break</span>
            </div>

            <v-row>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="formData.lunch_start"
                  label="Lunch Start"
                  type="time"
                  variant="outlined"
                  density="comfortable"
                  :rules="[v => !!v || 'Lunch start is required']"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="formData.lunch_end"
                  label="Lunch End"
                  type="time"
                  variant="outlined"
                  density="comfortable"
                  :rules="[
                    v => !!v || 'Lunch end is required',
                    v => !formData.lunch_start || v > formData.lunch_start || 'Must be after lunch start'
                  ]"
                />
              </v-col>
            </v-row>

            <!-- Daily Capacity -->
            <div class="section-heading">
              <v-icon size="18" color="primary">mdi-calendar-check-outline</v-icon>
              <span>Daily Capacity</span>
            </div>

            <v-row>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model.number="formData.daily_capacity"
                  label="Daily Capacity"
                  type="number"
                  prepend-inner-icon="mdi-account-group-outline"
                  variant="outlined"
                  density="comfortable"
                  :rules="[
                    v => !!v || 'Daily capacity is required',
                    v => v >= 1 || 'Minimum is 1',
                    v => v <= 100 || 'Maximum is 100'
                  ]"
                />
              </v-col>
            </v-row>

            <!-- Working Days -->
            <div class="section-heading">
              <v-icon size="18" color="primary">mdi-calendar-week-outline</v-icon>
              <span>Working Days</span>
            </div>

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
                  closable-chips
                  prepend-inner-icon="mdi-calendar-multiselect"
                  variant="outlined"
                  density="comfortable"
                  :rules="[v => (v && v.length > 0) || 'At least one working day is required']"
                />
              </v-col>
            </v-row>

            <!-- Booking Rules -->
            <div class="section-heading">
              <v-icon size="18" color="primary">mdi-book-clock-outline</v-icon>
              <span>Booking Rules</span>
            </div>

            <v-row>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model.number="formData.advance_booking_days"
                  label="Advance Booking (days)"
                  type="number"
                  variant="outlined"
                  density="comfortable"
                  :rules="[
                    v => !!v || 'Advance booking days is required',
                    v => v >= 1 || 'Minimum is 1 day',
                    v => v <= 365 || 'Maximum is 365 days'
                  ]"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model.number="formData.booking_lead_time_minutes"
                  label="Booking Lead Time (minutes)"
                  type="number"
                  variant="outlined"
                  density="comfortable"
                  :rules="[
                    v => v >= 0 || 'Cannot be negative',
                    v => v <= 1440 || 'Maximum is 1440 minutes'
                  ]"
                />
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model.number="formData.max_appointments_per_patient_per_day"
                  label="Max per Patient per Day"
                  type="number"
                  variant="outlined"
                  density="comfortable"
                  :rules="[
                    v => !!v || 'This field is required',
                    v => v >= 1 || 'Minimum is 1',
                    v => v <= 10 || 'Maximum is 10'
                  ]"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model.number="formData.cancellation_deadline_hours"
                  label="Cancellation Deadline (hours)"
                  type="number"
                  variant="outlined"
                  density="comfortable"
                  :rules="[
                    v => v >= 0 || 'Cannot be negative',
                    v => v <= 168 || 'Maximum is 168 hours'
                  ]"
                />
              </v-col>
            </v-row>

            <!-- Features -->
            <div class="section-heading">
              <v-icon size="18" color="primary">mdi-toggle-switch-outline</v-icon>
              <span>Features</span>
            </div>

            <v-row>
              <v-col cols="12" sm="6">
                <v-switch
                  v-model="formData.allow_online_booking"
                  color="success"
                  hide-details
                  inset
                >
                  <template #label>
                    <div class="font-weight-medium">Allow Online Booking</div>
                  </template>
                </v-switch>
              </v-col>
              <v-col cols="12" sm="6">
                <v-switch
                  v-model="formData.allow_online_cancellation"
                  color="success"
                  hide-details
                  inset
                >
                  <template #label>
                    <div class="font-weight-medium">Allow Online Cancellation</div>
                  </template>
                </v-switch>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
          <v-btn variant="text" class="text-none" @click="closeDialog">
            Cancel
          </v-btn>
          <v-spacer />
          <v-btn
            color="primary"
            variant="flat"
            class="text-none"
            :loading="saving"
            :disabled="!formValid"
            @click="saveSettings"
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
      title="Delete appointment settings?"
      confirm-text="Delete"
      color="error"
      icon="mdi-alert-outline"
      :loading="deleting"
      @confirm="deleteSettings"
    >
      You're about to permanently delete the settings for
      <strong class="text-high-emphasis">
        "{{ deleteItem?.office || 'Global' }}"
      </strong>.
      This action cannot be undone.
    </ConfirmDialog>

    <!-- ─────────────────────────────────────────────
         Toggle Active Confirmation
    ───────────────────────────────────────────── -->
    <ConfirmDialog
      v-model="toggleDialog"
      :title="`${toggleItem?.is_active ? 'Deactivate' : 'Activate'} settings?`"
      :confirm-text="toggleItem?.is_active ? 'Deactivate' : 'Activate'"
      :color="toggleItem?.is_active ? 'warning' : 'success'"
      :icon="toggleItem?.is_active ? 'mdi-pause-circle-outline' : 'mdi-play-circle-outline'"
      :loading="toggling"
      @confirm="toggleActive"
    >
      The settings for
      <strong class="text-high-emphasis">
        "{{ toggleItem?.office || 'Global' }}"
      </strong>
      will be marked as
      <strong>{{ toggleItem?.is_active ? 'inactive' : 'active' }}</strong>.
    </ConfirmDialog>

    <!-- ─────────────────────────────────────────────
         Apply to Office Dialog
    ───────────────────────────────────────────── -->
    <v-dialog v-model="applyDialog" max-width="520" persistent>
      <v-card class="dialog-card">
        <div class="dialog-header">
          <div class="d-flex align-center">
            <v-avatar size="40" color="info" variant="tonal" class="mr-3">
              <v-icon>mdi-content-copy</v-icon>
            </v-avatar>
            <div>
              <h3 class="text-subtitle-1 font-weight-bold mb-0">Apply Settings</h3>
              <p class="text-caption text-medium-emphasis mb-0">
                Copy this configuration to another office
              </p>
            </div>
          </div>
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            @click="closeApplyDialog"
          />
        </div>

        <v-divider />

        <v-card-text class="pa-6">
          <v-alert
            type="info"
            variant="tonal"
            density="comfortable"
            class="mb-4"
            border="start"
          >
            Source:
            <strong class="text-capitalize">{{ applySource?.office || 'Global' }}</strong>
          </v-alert>

          <v-form ref="applyFormRef" v-model="applyFormValid">
            <v-select
              v-model="applyTarget"
              label="Target Office"
              :items="availableOffices"
              item-title="text"
              item-value="value"
              prepend-inner-icon="mdi-office-building-outline"
              variant="outlined"
              density="comfortable"
              :rules="[v => !!v || 'Target office is required']"
            />
          </v-form>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
          <v-btn variant="text" class="text-none" @click="closeApplyDialog">
            Cancel
          </v-btn>
          <v-spacer />
          <v-btn
            color="info"
            variant="flat"
            class="text-none"
            :loading="applying"
            :disabled="!applyFormValid"
            @click="applySettings"
          >
            Apply Settings
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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
import { ref, onMounted, computed } from 'vue'
import appointmentSettingService from '@/services/appointmentSettingService'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'

/* ─────────────── State ─────────────── */
const settings = ref([])
const loading = ref(false)

const dialog = ref(false)
const dialogTitle = ref('New Appointment Settings')
const isEditing = ref(false)
const formValid = ref(false)
const saving = ref(false)
const formRef = ref(null)

const deleteDialog = ref(false)
const deleteItem = ref(null)
const deleting = ref(false)

const toggleDialog = ref(false)
const toggleItem = ref(null)
const toggling = ref(false)

const applyDialog = ref(false)
const applySource = ref(null)
const applyTarget = ref('')
const applying = ref(false)
const applyFormRef = ref(null)
const applyFormValid = ref(false)

const snackbar = ref({ show: false, message: '', color: 'success' })

const formData = ref(defaultForm())

/* ─────────────── Constants ─────────────── */
function defaultForm() {
  return {
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
  }
}

const dayOptions = [
  { text: 'Monday', value: 'mon' },
  { text: 'Tuesday', value: 'tue' },
  { text: 'Wednesday', value: 'wed' },
  { text: 'Thursday', value: 'thu' },
  { text: 'Friday', value: 'fri' },
  { text: 'Saturday', value: 'sat' },
  { text: 'Sunday', value: 'sun' }
]

const headers = [
  { title: 'Office', key: 'office', sortable: true, width: '100px' },
  { title: 'Working Hours', key: 'working_hours', sortable: false, width: '180px' },
  { title: 'Lunch Break', key: 'lunch_break', sortable: false, width: '180px' },
  { title: 'Working Days', key: 'working_days', sortable: false },
  { title: 'Slot', key: 'slot_duration_minutes', sortable: true, width: '100px' },
  { title: 'Capacity', key: 'capacity', sortable: false, width: '150px' },
  { title: 'Status', key: 'is_active', sortable: true, width: '120px' },
  { title: 'Actions', key: 'actions', sortable: false, align: 'center', width: '180px' }
]

/* ─────────────── Computed ─────────────── */
const settingsList = computed(() => settings.value)

const availableOffices = computed(() => {
  const excluded = new Set([applySource.value?.office, null, undefined])
  const offices = settings.value
    .filter(s => s.office && !excluded.has(s.office))
    .map(s => ({
      text: s.office.charAt(0).toUpperCase() + s.office.slice(1),
      value: s.office
    }))
  offices.push({ text: 'Global (All Offices)', value: 'all' })
  return offices
})

/* ─────────────── Helpers ─────────────── */
const dayLabels = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed',
  thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun'
}

function formatDay(day) {
  return dayLabels[day] || day
}

function formatTime(time) {
  if (!time) return '—'
  const [hh, mm] = time.split(':')
  const hours = parseInt(hh, 10)
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours % 12 || 12
  return `${hour12}:${mm} ${ampm}`
}

function showSnackbar(message, color = 'success') {
  snackbar.value = { show: true, message, color }
}

/* ─────────────── Data loading ─────────────── */
async function loadSettings() {
  loading.value = true
  try {
    const response = await appointmentSettingService.getAll()
    settings.value = response.data || []
  } catch (error) {
    console.error('Error loading settings:', error)
    showSnackbar('Failed to load settings', 'error')
  } finally {
    loading.value = false
  }
}

/* ─────────────── Create / Edit ─────────────── */
function resetForm() {
  formData.value = defaultForm()
  isEditing.value = false
  dialogTitle.value = 'New Appointment Settings'
  formValid.value = false
  formRef.value?.resetValidation()
}

function openCreateDialog() {
  resetForm()
  dialog.value = true
}

function openEditDialog(item) {
  resetForm()
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
  }
  isEditing.value = true
  dialogTitle.value = 'Edit Appointment Settings'
  dialog.value = true
}

function closeDialog() {
  dialog.value = false
  resetForm()
}

async function saveSettings() {
  if (!formValid.value) return
  saving.value = true
  try {
    const data = { ...formData.value }
    if (data.office === '') data.office = null

    const response = isEditing.value
      ? await appointmentSettingService.update(data.id, data)
      : await appointmentSettingService.create(data)

    showSnackbar(response.message || 'Settings saved successfully')
    await loadSettings()
    closeDialog()
  } catch (error) {
    console.error('Error saving settings:', error)
    showSnackbar(error.response?.data?.message || 'Failed to save settings', 'error')
  } finally {
    saving.value = false
  }
}

/* ─────────────── Delete ─────────────── */
function confirmDelete(item) {
  deleteItem.value = item
  deleteDialog.value = true
}

async function deleteSettings() {
  deleting.value = true
  try {
    const response = await appointmentSettingService.delete(deleteItem.value.id)
    showSnackbar(response.message || 'Settings deleted successfully')
    await loadSettings()
    deleteDialog.value = false
  } catch (error) {
    console.error('Error deleting settings:', error)
    showSnackbar(error.response?.data?.message || 'Failed to delete settings', 'error')
  } finally {
    deleting.value = false
    deleteItem.value = null
  }
}

/* ─────────────── Toggle Active ─────────────── */
function confirmToggle(item) {
  toggleItem.value = item
  toggleDialog.value = true
}

async function toggleActive() {
  toggling.value = true
  try {
    const response = await appointmentSettingService.toggleActive(toggleItem.value.id)
    showSnackbar(response.message || 'Status toggled successfully')
    await loadSettings()
    toggleDialog.value = false
  } catch (error) {
    console.error('Error toggling status:', error)
    showSnackbar(error.response?.data?.message || 'Failed to toggle status', 'error')
  } finally {
    toggling.value = false
    toggleItem.value = null
  }
}

/* ─────────────── Apply to Office ─────────────── */
function openApplyDialog(item) {
  applySource.value = item
  applyTarget.value = ''
  applyFormValid.value = false
  applyFormRef.value?.resetValidation()
  applyDialog.value = true
}

function closeApplyDialog() {
  applyDialog.value = false
  applySource.value = null
  applyTarget.value = ''
  applyFormRef.value?.resetValidation()
}

async function applySettings() {
  if (!applyFormValid.value) return
  applying.value = true
  try {
    const targetOffice = applyTarget.value === 'all' ? null : applyTarget.value
    const response = await appointmentSettingService.applyToAll(applySource.value.id, targetOffice)
    showSnackbar(response.message || 'Settings applied successfully')
    await loadSettings()
    closeApplyDialog()
  } catch (error) {
    console.error('Error applying settings:', error)
    showSnackbar(error.response?.data?.message || 'Failed to apply settings', 'error')
  } finally {
    applying.value = false
  }
}

/* ─────────────── Lifecycle ─────────────── */
onMounted(loadSettings)
</script>

<style scoped>
.appointment-settings-tab {
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

/* ─── Cards ─── */
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

/* ─── Section headings ─── */
.section-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  margin: 24px 0 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  color: rgb(var(--v-theme-primary));
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

/* ─── Empty state ─── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 16px;
}

/* ─── Responsive ─── */
@media (max-width: 600px) {
  .appointment-settings-tab {
    padding: 16px;
  }

  .header {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>