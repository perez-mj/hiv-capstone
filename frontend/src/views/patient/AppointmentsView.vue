<!-- frontend/src/views/patient/AppointmentsView.vue -->
<template>
  <div>
    <v-row>
      <v-col cols="12">
        <h2 class="text-h4 mb-4">
          <v-icon left>mdi-calendar-clock</v-icon>
          My Appointments
        </h2>
      </v-col>
    </v-row>

    <!-- Tabs -->
    <v-tabs v-model="tab" color="primary" grow>
      <v-tab value="upcoming">
        <v-icon left>mdi-calendar-today</v-icon>
        Upcoming
      </v-tab>
      <v-tab value="past">
        <v-icon left>mdi-history</v-icon>
        Past
      </v-tab>
      <v-tab value="book">
        <v-icon left>mdi-plus</v-icon>
        Book New
      </v-tab>
    </v-tabs>

    <v-window v-model="tab" class="mt-4">
      <!-- Upcoming Appointments -->
      <v-window-item value="upcoming">
        <v-card>
          <v-card-text>
            <!-- Loading State -->
            <div v-if="appointmentStore.loading" class="text-center pa-8">
              <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
              <p class="mt-4 text-medium-emphasis">Loading appointments...</p>
            </div>

            <v-list v-else-if="upcomingAppointments.length > 0">
              <v-list-item 
                v-for="appointment in upcomingAppointments" 
                :key="appointment.id"
                three-line
                class="mb-2 elevation-1"
              >
                <v-list-item-icon>
                  <v-icon :color="appointment.office === 'testing' ? 'info' : 'primary'" size="36">
                    {{ appointment.office === 'testing' ? 'mdi-test-tube' : 'mdi-hospital-building' }}
                  </v-icon>
                </v-list-item-icon>
                
                <v-list-item-content>
                  <v-list-item-title class="text-h6">
                    {{ getOfficeDisplayName(appointment.office) }}
                  </v-list-item-title>
                  
                  <v-list-item-subtitle>
                    <v-icon small>mdi-calendar</v-icon>
                    {{ formatDate(appointment.appointment_date) }}
                    <v-icon small class="ml-2">mdi-clock</v-icon>
                    {{ formatTimeSlot(appointment.time_slot) }}
                  </v-list-item-subtitle>
                  
                  <v-list-item-subtitle>
                    <!-- Status Chip -->
                    <v-chip 
                      :color="getStatusColor(appointment.status)" 
                      size="small"
                      dark
                    >
                      {{ getStatusDisplayName(appointment.status) }}
                    </v-chip>
                    
                    <!-- Queue Number -->
                    <span v-if="appointment.queue_number" class="ml-2">
                      <v-icon small>mdi-format-list-numbered</v-icon>
                      Queue #{{ appointment.queue_number }}
                    </span>
                    
                    <!-- Transaction Type -->
                    <span v-if="appointment.TransactionType" class="ml-2">
                      <v-chip 
                        size="small" 
                        :color="appointment.TransactionType.color_code || 'grey'" 
                        text-color="white"
                      >
                        {{ appointment.TransactionType.name }}
                      </v-chip>
                    </span>
                  </v-list-item-subtitle>
                </v-list-item-content>
                
                <v-list-item-action>
                  <v-btn 
                    v-if="appointment.status === 'pending'"
                    size="small"
                    color="error"
                    variant="tonal"
                    @click="cancelAppointment(appointment.id)"
                    :loading="cancellingId === appointment.id"
                  >
                    Cancel
                  </v-btn>
                  <v-btn 
                    v-else-if="appointment.status === 'checked-in'"
                    size="small"
                    color="info"
                    disabled
                  >
                    In Progress
                  </v-btn>
                  <v-btn
                    v-else-if="appointment.status === 'completed'"
                    size="small"
                    color="success"
                    disabled
                  >
                    Completed
                  </v-btn>
                </v-list-item-action>
              </v-list-item>
            </v-list>
            
            <v-alert v-else type="info" class="mt-3" rounded>
              <v-icon left>mdi-information</v-icon>
              No upcoming appointments.
              <v-btn size="small" color="primary" @click="tab = 'book'" class="ml-2" variant="tonal">
                Book an Appointment
              </v-btn>
            </v-alert>
          </v-card-text>
        </v-card>
      </v-window-item>

      <!-- Past Appointments -->
      <v-window-item value="past">
        <v-card>
          <v-card-text>
            <div v-if="appointmentStore.loading" class="text-center pa-8">
              <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
              <p class="mt-4 text-medium-emphasis">Loading appointments...</p>
            </div>

            <v-data-table
              v-else
              :headers="pastHeaders"
              :items="pastAppointments"
              :items-per-page="10"
              class="elevation-1"
              rounded
            >
              <template #item.appointment_date="{ item }">
                {{ formatDate(item.appointment_date) }}
              </template>
              
              <template #item.time_slot="{ item }">
                {{ formatTimeSlot(item.time_slot) }}
              </template>

              <template #item.office="{ item }">
                <v-chip size="small" :color="item.office === 'testing' ? 'info' : 'primary'" text-color="white">
                  {{ getOfficeDisplayName(item.office) }}
                </v-chip>
              </template>

              <template #item.transaction_type="{ item }">
                <v-chip 
                  v-if="item.TransactionType" 
                  size="small" 
                  :color="item.TransactionType.color_code || 'grey'" 
                  text-color="white"
                >
                  {{ item.TransactionType.name }}
                </v-chip>
                <span v-else class="text-caption text-medium-emphasis">—</span>
              </template>
              
              <template #item.status="{ item }">
                <v-chip :color="getStatusColor(item.status)" size="small" dark>
                  {{ getStatusDisplayName(item.status) }}
                </v-chip>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-window-item>

      <!-- Book Appointment -->
      <v-window-item value="book">
        <v-row justify="center">
          <v-col cols="12" md="8">
            <v-card class="rounded-lg">
              <v-card-text class="pa-4">
                <!-- Loading state -->
                <div v-if="loadingForm" class="text-center pa-8">
                  <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
                  <p class="mt-4 text-medium-emphasis">Loading appointment form...</p>
                </div>
                
                <v-form v-else ref="bookingForm" v-model="valid">
                  <v-row>
                    <!-- Transaction Type Selection -->
                    <v-col cols="12">
                      <v-select
                        v-model="bookingData.transaction_type_id"
                        :items="transactionTypes"
                        label="Service Type"
                        prepend-inner-icon="mdi-clipboard-list"
                        :rules="[v => !!v || 'Service type is required']"
                        required
                        variant="outlined"
                        density="comfortable"
                        item-title="name"
                        item-value="id"
                        @update:model-value="onTransactionTypeChange"
                      >
                        <template #item="{ props, item }">
                          <v-list-item v-bind="props">
                            <template #title>
                              <span>{{ item.raw.name }}</span>
                            </template>
                            <template #subtitle>
                              <v-chip 
                                size="x-small" 
                                :color="item.raw.office === 'testing' ? 'info' : 'primary'"
                                class="mr-1"
                                text-color="white"
                              >
                                {{ getOfficeDisplayName(item.raw.office) }}
                              </v-chip>
                              <span class="text-caption text-medium-emphasis">
                                ~{{ item.raw.estimated_duration_minutes }} min
                              </span>
                              <span v-if="item.raw.description" class="text-caption text-medium-emphasis ml-1">
                                — {{ item.raw.description }}
                              </span>
                            </template>
                          </v-list-item>
                        </template>
                        <template #selection="{ item }">
                          <span>{{ item.raw.name }}</span>
                          <v-chip 
                            size="x-small" 
                            :color="item.raw.office === 'testing' ? 'info' : 'primary'"
                            class="ml-2"
                            text-color="white"
                          >
                            {{ getOfficeDisplayName(item.raw.office) }}
                          </v-chip>
                        </template>
                      </v-select>
                      
                      <!-- Selected service details -->
                      <div v-if="selectedTransactionType" class="mt-2">
                        <v-row no-gutters>
                          <v-col cols="6">
                            <span class="text-caption text-medium-emphasis">Office:</span>
                            <v-chip 
                              size="x-small" 
                              :color="selectedTransactionType.office === 'testing' ? 'info' : 'primary'"
                              text-color="white"
                              class="ml-1"
                            >
                              {{ getOfficeDisplayName(selectedTransactionType.office) }}
                            </v-chip>
                          </v-col>
                          <v-col cols="6">
                            <span class="text-caption text-medium-emphasis">Duration:</span>
                            <span class="text-caption font-weight-medium ml-1">
                              {{ selectedTransactionType.estimated_duration_minutes }} min
                            </span>
                          </v-col>
                        </v-row>
                      </div>
                    </v-col>

                    <!-- Appointment Date -->
                    <v-col cols="12" md="6">
                      <v-menu
                        v-model="dateMenu"
                        :close-on-content-click="false"
                        transition="scale-transition"
                        offset-y
                        min-width="290"
                      >
                        <template #activator="{ props }">
                          <v-text-field
                            :model-value="displayDate"
                            label="Appointment Date"
                            prepend-inner-icon="mdi-calendar"
                            readonly
                            :rules="[v => !!v || 'Date is required']"
                            v-bind="props"
                            required
                            variant="outlined"
                            density="comfortable"
                            :disabled="!bookingData.transaction_type_id"
                            @click="dateMenu = true"
                          ></v-text-field>
                        </template>
                        <v-date-picker
                          :model-value="selectedDate"
                          @update:model-value="onDateSelected"
                          :min="minDate"
                          :max="maxDate"
                          locale="en-US"
                          :allowed-dates="allowedDates"
                        ></v-date-picker>
                      </v-menu>
                      
                      <!-- Date availability info -->
                      <div v-if="dateAvailabilityInfo" class="mt-1">
                        <v-chip
                          :color="dateAvailabilityInfo.available ? 'success' : 'error'"
                          size="x-small"
                          variant="tonal"
                        >
                          {{ dateAvailabilityInfo.available ? 'Available' : 'Not Available' }}
                          <span v-if="dateAvailabilityInfo.available && dateAvailabilityInfo.slotsCount !== undefined">
                            - {{ dateAvailabilityInfo.slotsCount }} slots available
                          </span>
                        </v-chip>
                        <span v-if="!dateAvailabilityInfo.available && dateAvailabilityInfo.reason" class="text-caption text-error ml-1">
                          {{ dateAvailabilityInfo.reason }}
                        </span>
                      </div>
                    </v-col>

                    <!-- Time Slot -->
                    <v-col cols="12" md="6">
                      <v-select
                        v-model="bookingData.time_slot"
                        :items="availableSlots"
                        label="Time Slot"
                        :rules="[v => !!v || 'Time slot is required']"
                        required
                        variant="outlined"
                        density="comfortable"
                        :loading="slotsLoading"
                        :disabled="!bookingData.appointment_date || slotsLoading || availableSlots.length === 0"
                        item-title="display_title"
                        item-value="time"
                        item-disabled="disabled"
                      >
                        <template #item="{ props, item }">
                          <v-list-item v-bind="props" :disabled="item.raw.disabled">
                            <template #title>
                              <span>{{ formatTimeSlot(item.raw.time) }}</span>
                              <v-chip
                                v-if="item.raw.isBooked"
                                color="error"
                                size="x-small"
                                class="ml-2"
                              >
                                Booked
                              </v-chip>
                              <v-chip
                                v-else-if="item.raw.isPast"
                                color="grey"
                                size="x-small"
                                class="ml-2"
                              >
                                Past
                              </v-chip>
                              <v-chip
                                v-else-if="item.raw.available"
                                color="success"
                                size="x-small"
                                class="ml-2"
                              >
                                Available
                              </v-chip>
                            </template>
                          </v-list-item>
                        </template>
                        <template #selection="{ item }">
                          <span>{{ formatTimeSlot(item.raw.time) }}</span>
                          <v-chip
                            v-if="item.raw.isBooked"
                            color="error"
                            size="x-small"
                            class="ml-2"
                          >
                            Booked
                          </v-chip>
                          <v-chip
                            v-else-if="item.raw.isPast"
                            color="grey"
                            size="x-small"
                            class="ml-2"
                          >
                            Past
                          </v-chip>
                        </template>
                      </v-select>
                      
                      <!-- Slot loading and status info -->
                      <div v-if="slotsLoading" class="text-caption text-grey mt-1">
                        <v-progress-circular indeterminate size="16" class="mr-1"></v-progress-circular>
                        Loading available slots...
                      </div>
                      <div v-else-if="availableSlots.length === 0 && bookingData.appointment_date" class="text-caption text-error mt-1">
                        No time slots available for this date
                      </div>
                      <div v-else-if="availableSlots.filter(s => s.available).length === 0 && availableSlots.length > 0" class="text-caption text-warning mt-1">
                        All slots are booked for this date
                      </div>
                      <div v-else-if="bookingData.time_slot && !slotsLoading" class="text-caption text-success mt-1">
                        Selected: {{ formatTimeSlot(bookingData.time_slot) }}
                      </div>
                    </v-col>

                    <!-- Notes -->
                    <v-col cols="12">
                      <v-textarea
                        v-model="bookingData.notes"
                        label="Notes"
                        rows="2"
                        variant="outlined"
                        density="comfortable"
                        hint="Any special instructions or notes for this appointment"
                      ></v-textarea>
                    </v-col>

                    <!-- Appointment Summary -->
                    <v-col cols="12" v-if="bookingData.appointment_date && bookingData.time_slot">
                      <v-expansion-panels class="mt-2">
                        <v-expansion-panel>
                          <v-expansion-panel-title>
                            <v-icon left>mdi-information</v-icon>
                            Appointment Summary
                          </v-expansion-panel-title>
                          <v-expansion-panel-text>
                            <v-list density="compact">
                              <v-list-item>
                                <v-list-item-title class="font-weight-bold">Service</v-list-item-title>
                                <v-list-item-subtitle>
                                  {{ selectedTransactionType?.name || 'Not selected' }}
                                  <v-chip 
                                    v-if="selectedTransactionType"
                                    size="x-small" 
                                    :color="selectedTransactionType.office === 'testing' ? 'info' : 'primary'"
                                    text-color="white"
                                    class="ml-1"
                                  >
                                    {{ getOfficeDisplayName(selectedTransactionType.office) }}
                                  </v-chip>
                                </v-list-item-subtitle>
                              </v-list-item>
                              <v-list-item>
                                <v-list-item-title class="font-weight-bold">Date & Time</v-list-item-title>
                                <v-list-item-subtitle>
                                  {{ formatDate(bookingData.appointment_date) }} at {{ formatTimeSlot(bookingData.time_slot) }}
                                </v-list-item-subtitle>
                              </v-list-item>
                              <v-list-item v-if="selectedTransactionType">
                                <v-list-item-title class="font-weight-bold">Estimated Duration</v-list-item-title>
                                <v-list-item-subtitle>
                                  {{ selectedTransactionType.estimated_duration_minutes }} minutes
                                </v-list-item-subtitle>
                              </v-list-item>
                              <v-list-item v-if="bookingData.notes">
                                <v-list-item-title class="font-weight-bold">Notes</v-list-item-title>
                                <v-list-item-subtitle>{{ bookingData.notes }}</v-list-item-subtitle>
                              </v-list-item>
                            </v-list>
                          </v-expansion-panel-text>
                        </v-expansion-panel>
                      </v-expansion-panels>
                    </v-col>
                  </v-row>
                </v-form>
              </v-card-text>
              
              <v-divider></v-divider>
              
              <v-card-actions class="pa-4">
                <v-spacer />
                <v-btn color="error" @click="resetBookingForm" variant="outlined">Clear</v-btn>
                <v-btn 
                  color="primary" 
                  @click="bookAppointment" 
                  :loading="bookingLoading"
                  :disabled="!valid || bookingLoading || !bookingData.time_slot"
                  variant="flat"
                >
                  <v-icon start>{{ 'mdi-check' }}</v-icon>
                  Book Appointment
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>
    </v-window>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="5000" rounded>
      <v-icon left size="20" class="mr-2">{{ snackbar.icon }}</v-icon>
      {{ snackbar.message }}
    </v-snackbar>

    <!-- Confirmation Dialog -->
    <v-dialog v-model="confirmDialog.show" max-width="400">
      <v-card class="rounded-lg">
        <v-card-title class="text-h6">
          <v-icon left color="warning">mdi-alert</v-icon>
          Cancel Appointment
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pt-4">
          Are you sure you want to cancel this appointment? This action cannot be undone.
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn color="secondary" @click="confirmDialog.show = false" variant="outlined">No, Keep It</v-btn>
          <v-btn color="error" @click="confirmCancelAppointment" :loading="cancellingId !== null" variant="flat">
            Yes, Cancel
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useAppointmentStore } from '@/stores/appointmentStore';
import transactionTypeService from '@/services/transactionTypeService';
import appointmentService from '@/services/appointmentService';

const appointmentStore = useAppointmentStore();
const tab = ref('upcoming');
const bookingLoading = ref(false);
const slotsLoading = ref(false);
const loadingForm = ref(false);
const valid = ref(false);
const bookingForm = ref(null);
const cancellingId = ref(null);
const dateMenu = ref(false);

// Dialog state
const confirmDialog = ref({
  show: false,
  appointmentId: null
});

// Snackbar state
const snackbar = ref({
  show: false,
  message: '',
  color: 'success',
  icon: 'mdi-check-circle'
});

// Transaction types
const transactionTypes = ref([]);
const availableSlots = ref([]);
const selectedDate = ref('');
const dateAvailabilityInfo = ref(null);

// Booking data
const bookingData = ref({
  transaction_type_id: null,
  appointment_date: '',
  time_slot: '',
  notes: ''
});

// Computed
const selectedTransactionType = computed(() => {
  return transactionTypes.value.find(t => t.id === bookingData.value.transaction_type_id);
});

const displayDate = computed(() => {
  if (!selectedDate.value) return '';
  try {
    const date = new Date(selectedDate.value + 'T00:00:00');
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  } catch (e) {
    console.error('Date formatting error:', e);
  }
  return selectedDate.value;
});

const minDate = computed(() => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
});

const maxDate = computed(() => {
  const now = new Date();
  now.setDate(now.getDate() + 30);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
});

// Past appointments table headers
const pastHeaders = [
  { title: 'Date', key: 'appointment_date', sortable: true },
  { title: 'Office', key: 'office', sortable: true },
  { title: 'Service', key: 'transaction_type', sortable: true },
  { title: 'Time', key: 'time_slot', sortable: true },
  { title: 'Status', key: 'status', sortable: true },
];

// Computed appointments
const upcomingAppointments = computed(() => {
  return appointmentStore.appointments
    .filter(a => ['pending', 'checked-in'].includes(a.status))
    .sort((a, b) => {
      const dateCompare = new Date(a.appointment_date) - new Date(b.appointment_date);
      if (dateCompare !== 0) return dateCompare;
      return (a.time_slot || '').localeCompare(b.time_slot || '');
    });
});

const pastAppointments = computed(() => {
  return appointmentStore.appointments
    .filter(a => ['completed', 'cancelled', 'no-show'].includes(a.status))
    .sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date));
});

// Helper functions
const getOfficeDisplayName = (office) => {
  const names = {
    testing: 'Testing',
    treatment: 'Treatment'
  };
  return names[office] || office || 'Unknown';
};

const getStatusDisplayName = (status) => {
  const names = {
    pending: 'Pending',
    'checked-in': 'Checked In',
    completed: 'Completed',
    cancelled: 'Cancelled',
    'no-show': 'No Show'
  };
  return names[status] || status || 'Unknown';
};

const getStatusColor = (status) => {
  const colors = {
    pending: 'warning',
    'checked-in': 'info',
    completed: 'success',
    cancelled: 'error',
    'no-show': 'error'
  };
  return colors[status] || 'grey';
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
};

const formatTimeSlot = (time) => {
  if (!time) return 'N/A';
  try {
    const parts = time.split(':');
    const hour = parseInt(parts[0]);
    const minute = parts[1] || '00';
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minute.padStart(2, '0')} ${ampm}`;
  } catch {
    return time;
  }
};

const formatDateToYYYYMMDD = (date) => {
  if (!date) return null;
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Load transaction types
const loadTransactionTypes = async () => {
  try {
    console.log('Loading transaction types...');
    const response = await transactionTypeService.getTransactionTypes();
    if (response && response.data) {
      transactionTypes.value = response.data;
    } else if (Array.isArray(response)) {
      transactionTypes.value = response;
    } else {
      transactionTypes.value = [];
    }
    console.log('Transaction types loaded:', transactionTypes.value);
  } catch (error) {
    console.error('Failed to load transaction types:', error);
    transactionTypes.value = [];
    showSnackbar('Failed to load service types', 'error');
  }
};

// Load available slots
const loadAvailableSlots = async () => {
  if (!selectedDate.value || !selectedTransactionType.value) {
    availableSlots.value = [];
    bookingData.value.time_slot = '';
    dateAvailabilityInfo.value = null;
    return;
  }

  slotsLoading.value = true;
  
  try {
    const dateStr = formatDateToYYYYMMDD(selectedDate.value);
    if (!dateStr) {
      console.error('Invalid date format:', selectedDate.value);
      availableSlots.value = [];
      dateAvailabilityInfo.value = {
        available: false,
        slotsCount: 0,
        totalSlots: 0,
        reason: 'Invalid date format'
      };
      slotsLoading.value = false;
      return;
    }
    
    const office = selectedTransactionType.value.office;
    console.log(`Loading available slots for ${dateStr} in ${office}`);
    const result = await appointmentService.getAvailableSlots(
      dateStr,
      office,
      null
    );
    
    console.log('Available slots result:', result);
    
    if (result && result.slots) {
      availableSlots.value = result.slots.map(slot => ({
        time: slot.time,
        display_title: formatTimeSlot(slot.time),
        available: slot.available || false,
        isBooked: slot.isBooked || false,
        isPast: slot.isPast || false,
        disabled: !slot.available
      }));
      
      dateAvailabilityInfo.value = {
        available: result.available || false,
        slotsCount: result.count || 0,
        totalSlots: result.allSlots ? result.allSlots.length : result.slots.length,
        reason: result.message || null
      };
      
      // Auto-select first available slot
      const availableSlot = availableSlots.value.find(s => s.available);
      bookingData.value.time_slot = availableSlot ? availableSlot.time : '';
    } else {
      availableSlots.value = [];
      dateAvailabilityInfo.value = {
        available: false,
        slotsCount: 0,
        totalSlots: 0,
        reason: result?.message || 'No slots available'
      };
      bookingData.value.time_slot = '';
    }
  } catch (error) {
    console.error('Failed to load slots:', error);
    availableSlots.value = [];
    dateAvailabilityInfo.value = {
      available: false,
      slotsCount: 0,
      totalSlots: 0,
      reason: 'Failed to load available slots'
    };
    showSnackbar('Failed to load available time slots', 'error');
  } finally {
    slotsLoading.value = false;
  }
};

// Event handlers
const onTransactionTypeChange = async () => {
  bookingData.value.appointment_date = '';
  bookingData.value.time_slot = '';
  selectedDate.value = '';
  availableSlots.value = [];
  dateAvailabilityInfo.value = null;
};

const onDateSelected = async (value) => {
  console.log('Date selected (raw):', value);
  dateMenu.value = false;
  if (value) {
    const formattedDate = formatDateToYYYYMMDD(value);
    if (formattedDate) {
      selectedDate.value = formattedDate;
      bookingData.value.appointment_date = formattedDate;
      console.log('Date formatted to:', formattedDate);
      await nextTick();
      await loadAvailableSlots();
    } else {
      console.error('Invalid date selected:', value);
      showSnackbar('Invalid date selected', 'error');
    }
  }
};

const allowedDates = (date) => {
  const dateStr = date.toISOString().split('T')[0];
  return dateStr >= minDate.value;
};

// Book appointment
const bookAppointment = async () => {
  if (!bookingForm.value || !bookingForm.value.validate()) {
    return;
  }
  
  const selectedSlot = availableSlots.value.find(s => s.time === bookingData.value.time_slot);
  if (selectedSlot && !selectedSlot.available) {
    showSnackbar('Selected time slot is not available', 'error');
    return;
  }

  if (!bookingData.value.transaction_type_id) {
    showSnackbar('Please select a service type', 'error');
    return;
  }

  const appointmentDate = formatDateToYYYYMMDD(selectedDate.value);
  if (!appointmentDate) {
    showSnackbar('Invalid appointment date', 'error');
    return;
  }

  bookingLoading.value = true;
  try {
    // For patients, we DON'T send patient_id or office
    // The backend gets patient_id from the authenticated user
    // office is determined from transaction_type_id
    const data = {
      transaction_type_id: bookingData.value.transaction_type_id,
      appointment_date: appointmentDate,
      time_slot: bookingData.value.time_slot,
      notes: bookingData.value.notes || ''
    };

    console.log('Booking appointment with data:', data);
    await appointmentStore.bookAppointment(data);
    
    showSnackbar('Appointment booked successfully!', 'success');
    resetBookingForm();
    tab.value = 'upcoming';
    await appointmentStore.loadMyAppointments();
  } catch (error) {
    console.error('Booking error:', error);
    const errorMessage = error.response?.data?.error || error.message || 'Failed to book appointment';
    showSnackbar(errorMessage, 'error');
  } finally {
    bookingLoading.value = false;
  }
};

// Cancel appointment with confirmation
const cancelAppointment = (appointmentId) => {
  confirmDialog.value = {
    show: true,
    appointmentId: appointmentId
  };
};

const confirmCancelAppointment = async () => {
  const appointmentId = confirmDialog.value.appointmentId;
  if (!appointmentId) return;
  
  cancellingId.value = appointmentId;
  try {
    await appointmentStore.cancelAppointment(appointmentId, 'Cancelled by patient');
    showSnackbar('Appointment cancelled successfully', 'success');
    await appointmentStore.loadMyAppointments();
  } catch (error) {
    console.error('Cancel error:', error);
    const errorMessage = error.response?.data?.error || 'Failed to cancel appointment';
    showSnackbar(errorMessage, 'error');
  } finally {
    cancellingId.value = null;
    confirmDialog.value.show = false;
  }
};

// Reset booking form
const resetBookingForm = () => {
  bookingData.value = {
    transaction_type_id: null,
    appointment_date: '',
    time_slot: '',
    notes: ''
  };
  selectedDate.value = '';
  availableSlots.value = [];
  dateAvailabilityInfo.value = null;
  bookingForm.value?.resetValidation();
};

// Show snackbar
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
    icon: icons[color] || 'mdi-information'
  };
};

// Initialize
onMounted(async () => {
  loadingForm.value = true;
  try {
    // Load appointments
    await appointmentStore.loadMyAppointments();
    
    // Load appointment settings
    try {
      await appointmentStore.loadAppointmentSettings();
    } catch (error) {
      console.warn('Failed to load appointment settings:', error);
    }
    
    // Load transaction types
    await loadTransactionTypes();
    
    // Set default date
    selectedDate.value = minDate.value;
    bookingData.value.appointment_date = minDate.value;
    
    // Auto-select first transaction type
    if (transactionTypes.value.length > 0) {
      bookingData.value.transaction_type_id = transactionTypes.value[0].id;
      await nextTick();
      await loadAvailableSlots();
    }
  } catch (error) {
    console.error('Error initializing form:', error);
    showSnackbar('Failed to load appointment form', 'error');
  } finally {
    loadingForm.value = false;
  }
});

// Watch for transaction type changes after initialization
watch(() => bookingData.value.transaction_type_id, async (newVal, oldVal) => {
  if (newVal && newVal !== oldVal && !loadingForm.value) {
    await onTransactionTypeChange();
  }
});
</script>

<style scoped>
.v-list-item {
  border-radius: 8px;
  transition: all 0.2s ease;
}

.v-list-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.v-card {
  border-radius: 12px;
}

.bg-primary {
  background: rgb(var(--v-theme-primary)) !important;
}

.v-card-title.bg-primary .v-icon,
.v-card-title.bg-primary span {
  color: white !important;
}

.v-list-item--disabled {
  opacity: 0.5;
  pointer-events: none;
}

.v-date-picker {
  width: 100%;
}
</style>