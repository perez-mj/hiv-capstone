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
            <v-list v-if="upcomingAppointments.length > 0">
              <v-list-item 
                v-for="appointment in upcomingAppointments" 
                :key="appointment.id"
                three-line
                class="mb-2 elevation-1"
              >
                <v-list-item-icon>
                  <v-icon :color="getOfficeColor(appointment.office)" size="36">mdi-hospital</v-icon>
                </v-list-item-icon>
                
                <v-list-item-content>
                  <v-list-item-title class="text-h6">
                    {{ appointment.office.charAt(0).toUpperCase() + appointment.office.slice(1) }} Office
                  </v-list-item-title>
                  <v-list-item-subtitle>
                    <v-icon small>mdi-calendar</v-icon>
                    {{ formatDate(appointment.appointment_date) }}
                    <v-icon small class="ml-2">mdi-clock</v-icon>
                    {{ formatTimeSlot(appointment.time_slot) }}
                  </v-list-item-subtitle>
                  <v-list-item-subtitle>
                    <v-chip 
                      :color="getStatusColor(appointment.status)" 
                      small
                      dark
                    >
                      {{ appointment.status }}
                    </v-chip>
                    <span v-if="appointment.queue_number" class="ml-2">
                      <v-icon small>mdi-format-list-numbered</v-icon>
                      Queue #{{ appointment.queue_number }}
                    </span>
                    <span v-if="appointment.type === 'walk-in'" class="ml-2">
                      <v-chip small color="grey">Walk-in</v-chip>
                    </span>
                  </v-list-item-subtitle>
                </v-list-item-content>
                
                <v-list-item-action>
                  <v-btn 
                    v-if="appointment.status === 'pending'"
                    small 
                    color="error" 
                    @click="cancelAppointment(appointment.id)"
                  >
                    Cancel
                  </v-btn>
                  <v-btn 
                    v-else-if="appointment.status === 'checked-in'"
                    small
                    color="info"
                    disabled
                  >
                    In Progress
                  </v-btn>
                </v-list-item-action>
              </v-list-item>
            </v-list>
            
            <v-alert v-else type="info" class="mt-3">
              No upcoming appointments.
              <v-btn small color="primary" @click="tab = 'book'" class="ml-2">
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
            <v-data-table
              :headers="pastHeaders"
              :items="pastAppointments"
              :items-per-page="10"
              class="elevation-1"
            >
              <template #item.appointment_date="{ item }">
                {{ formatDate(item.appointment_date) }}
              </template>
              
              <template #item.time_slot="{ item }">
                {{ formatTimeSlot(item.time_slot) }}
              </template>
              
              <template #item.status="{ item }">
                <v-chip :color="getStatusColor(item.status)" small dark>
                  {{ item.status }}
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
            <v-card>
              <v-card-title class="primary white--text">
                <v-icon left>mdi-calendar-plus</v-icon>
                Book New Appointment
              </v-card-title>
              
              <v-card-text class="mt-4">
                <v-form ref="bookingForm" v-model="valid">
                  <v-select
                    v-model="bookingData.office"
                    label="Select Office"
                    :items="['testing', 'treatment']"
                    :item-title="item => item.charAt(0).toUpperCase() + item.slice(1)"
                    :rules="[rules.required]"
                    prepend-icon="mdi-hospital"
                    required
                  ></v-select>
                  
                  <v-text-field
                    v-model="bookingData.appointment_date"
                    label="Appointment Date"
                    type="date"
                    :min="minDate"
                    :rules="[rules.required, rules.futureDate]"
                    prepend-icon="mdi-calendar"
                    required
                  ></v-text-field>
                  
                  <v-select
                    v-model="bookingData.time_slot"
                    label="Select Time Slot"
                    :items="timeSlots"
                    :rules="[rules.required]"
                    prepend-icon="mdi-clock"
                    required
                    :disabled="!bookingData.appointment_date"
                  ></v-select>
                  
                  <v-checkbox
                    v-model="bookingData.isWalkIn"
                    label="I need a walk-in appointment"
                    color="primary"
                  ></v-checkbox>
                </v-form>
              </v-card-text>
              
              <v-card-actions>
                <v-spacer />
                <v-btn color="secondary" @click="resetBookingForm">Clear</v-btn>
                <v-btn 
                  color="primary" 
                  @click="bookAppointment" 
                  :loading="loading"
                  :disabled="!valid"
                >
                  <v-icon left>mdi-check</v-icon>
                  Book Appointment
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>
    </v-window>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="5000">
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAppointmentStore } from '@/stores/appointmentStore';

const appointmentStore = useAppointmentStore();
const tab = ref('upcoming');
const loading = ref(false);
const valid = ref(false);
const bookingForm = ref(null);

const snackbar = ref({
  show: false,
  message: '',
  color: 'success'
});

// FIXED: Time slots as simple time strings (matching backend)
const timeSlots = [
  '08:00',
  '08:30',
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00'
];

const bookingData = ref({
  office: 'testing',
  appointment_date: '',
  time_slot: '',
  isWalkIn: false
});

const minDate = computed(() => {
  const today = new Date();
  return today.toISOString().split('T')[0];
});

const pastHeaders = [
  { title: 'Date', key: 'appointment_date', sortable: true },
  { title: 'Office', key: 'office', sortable: true },
  { title: 'Time', key: 'time_slot', sortable: true },
  { title: 'Status', key: 'status', sortable: true },
];

const rules = {
  required: value => !!value || 'This field is required',
  futureDate: value => {
    if (!value) return true;
    const selectedDate = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedDate >= today || 'Date must be today or in the future';
  }
};

const upcomingAppointments = computed(() => {
  return appointmentStore.appointments
    .filter(a => ['pending', 'checked-in'].includes(a.status))
    .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date));
});

const pastAppointments = computed(() => {
  return appointmentStore.appointments
    .filter(a => ['completed', 'cancelled', 'no-show'].includes(a.status))
    .sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date));
});

const getOfficeColor = (office) => {
  return office === 'testing' ? 'warning' : 'success';
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
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

// FIXED: Format time slot for display
const formatTimeSlot = (time) => {
  if (!time) return 'N/A';
  try {
    const parts = time.split(':');
    const hour = parseInt(parts[0]);
    const minute = parts[1] || '00';
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minute} ${ampm}`;
  } catch {
    return time;
  }
};

// FIXED: Book appointment with correct data format
const bookAppointment = async () => {
  if (!bookingForm.value.validate()) return;
  
  loading.value = true;
  try {
    // Prepare data for backend
    const appointmentData = {
      office: bookingData.value.office,
      appointment_date: bookingData.value.appointment_date,
      time_slot: bookingData.value.time_slot,
      type: bookingData.value.isWalkIn ? 'walk-in' : 'scheduled'
    };
    
    console.log('Booking appointment with data:', appointmentData);
    await appointmentStore.bookAppointment(appointmentData);
    
    snackbar.value = {
      show: true,
      message: 'Appointment booked successfully!',
      color: 'success'
    };
    resetBookingForm();
    tab.value = 'upcoming';
    await appointmentStore.loadMyAppointments();
  } catch (error) {
    console.error('Booking error:', error);
    snackbar.value = {
      show: true,
      message: error.response?.data?.error || 'Failed to book appointment',
      color: 'error'
    };
  } finally {
    loading.value = false;
  }
};

const cancelAppointment = async (appointmentId) => {
  if (!confirm('Are you sure you want to cancel this appointment?')) return;
  
  try {
    await appointmentStore.cancelAppointment(appointmentId, 'Cancelled by patient');
    snackbar.value = {
      show: true,
      message: 'Appointment cancelled successfully',
      color: 'success'
    };
    await appointmentStore.loadMyAppointments();
  } catch (error) {
    snackbar.value = {
      show: true,
      message: 'Failed to cancel appointment',
      color: 'error'
    };
  }
};

const resetBookingForm = () => {
  bookingData.value = {
    office: 'testing',
    appointment_date: '',
    time_slot: '',
    isWalkIn: false
  };
  bookingForm.value?.resetValidation();
};

onMounted(async () => {
  await appointmentStore.loadMyAppointments();
});
</script>