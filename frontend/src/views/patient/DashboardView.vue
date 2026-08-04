<!-- frontend/src/views/patient/DashboardView.vue -->
<template>
  <div>
    <!-- Welcome Section -->
    <v-row>
      <v-col cols="12">
        <v-card color="primary" dark class="pa-4 mb-4">
          <v-row align="center">
            <v-col cols="12" md="8">
              <h2 class="text-h4 mb-2">Welcome back, {{ patient?.first_name || 'Patient' }}!</h2>
              <p class="text-subtitle-1 mb-0">
                <v-icon small>mdi-calendar-today</v-icon>
                Today is {{ today }}
              </p>
            </v-col>
            <v-col cols="12" md="4" class="text-md-right">
              <v-btn color="white" variant="outlined" to="/patient/appointments">
                <v-icon left>mdi-plus</v-icon>
                Book Appointment
              </v-btn>
            </v-col>
          </v-row>
        </v-card>
      </v-col>
    </v-row>

    <!-- Quick Stats -->
    <v-row>
      <v-col cols="12" md="4">
        <v-card>
          <v-card-text>
            <div class="d-flex align-center">
              <v-icon color="primary" size="48">mdi-calendar-check</v-icon>
              <div class="ml-3">
                <div class="text-h5">{{ upcomingAppointments.length }}</div>
                <div class="text-caption text-grey">Upcoming Appointments</div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card>
          <v-card-text>
            <div class="d-flex align-center">
              <v-icon color="success" size="48">mdi-clipboard-check</v-icon>
              <div class="ml-3">
                <div class="text-h5">{{ completedVisits }}</div>
                <div class="text-caption text-grey">Total Visits</div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card>
          <v-card-text>
            <div class="d-flex align-center">
              <v-icon :color="statusColor" size="48">{{ statusIcon }}</v-icon>
              <div class="ml-3">
                <div class="text-h5">{{ patient?.status || 'N/A' }}</div>
                <div class="text-caption text-grey">Current Status</div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Upcoming Appointments -->
    <v-row>
      <v-col cols="12" md="8">
        <v-card>
          <v-card-title>
            <v-icon left>mdi-calendar-clock</v-icon>
            Upcoming Appointments
            <v-spacer />
            <v-btn small color="primary" to="/patient/appointments">View All</v-btn>
          </v-card-title>
          
          <v-divider />
          
          <v-card-text>
            <v-list v-if="upcomingAppointments.length > 0">
              <v-list-item 
                v-for="appointment in upcomingAppointments.slice(0, 3)" 
                :key="appointment.id"
                three-line
              >
                <v-list-item-icon>
                  <v-icon :color="getOfficeColor(appointment.office)">mdi-hospital</v-icon>
                </v-list-item-icon>
                
                <v-list-item-content>
                  <v-list-item-title>{{ appointment.office.charAt(0).toUpperCase() + appointment.office.slice(1) }} Office</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ formatDate(appointment.appointment_date) }} at {{ appointment.time_slot }}
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
                      Queue #: {{ appointment.queue_number }}
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
                </v-list-item-action>
              </v-list-item>
            </v-list>
            
            <v-alert v-else type="info" class="mt-3">
              No upcoming appointments. 
              <router-link to="/patient/appointments">Book one now!</router-link>
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Quick Actions & Recent Results -->
      <v-col cols="12" md="4">
        <v-card class="mb-4">
          <v-card-title>
            <v-icon left>mdi-flash</v-icon>
            Quick Actions
          </v-card-title>
          <v-divider />
          <v-card-text>
            <v-btn block color="primary" to="/patient/appointments" class="mb-2">
              <v-icon left>mdi-calendar-plus</v-icon>
              Book Appointment
            </v-btn>
            <v-btn block color="info" to="/patient/results" class="mb-2">
              <v-icon left>mdi-file-document</v-icon>
              View Results
            </v-btn>
            <v-btn block color="secondary" to="/patient/profile">
              <v-icon left>mdi-account-edit</v-icon>
              Update Profile
            </v-btn>
          </v-card-text>
        </v-card>

        <!-- Recent Test Results -->
        <v-card>
          <v-card-title>
            <v-icon left>mdi-test-tube</v-icon>
            Recent Results
          </v-card-title>
          <v-divider />
          <v-card-text>
            <v-list v-if="recentTests.length > 0" dense>
              <v-list-item v-for="test in recentTests.slice(0, 3)" :key="test.id">
                <v-list-item-content>
                  <v-list-item-title>{{ test.hiv_test?.result || 'Pending' }}</v-list-item-title>
                  <v-list-item-subtitle>{{ formatDate(test.created_at) }}</v-list-item-subtitle>
                </v-list-item-content>
                <v-list-item-action>
                  <v-chip 
                    :color="getTestResultColor(test.hiv_test?.result)" 
                    small
                    dark
                  >
                    {{ test.hiv_test?.result || 'N/A' }}
                  </v-chip>
                </v-list-item-action>
              </v-list-item>
            </v-list>
            <v-alert v-else type="info" dense>
              No test results available yet.
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/authStore';
import { useAppointmentStore } from '@/stores/appointmentStore';
import { usePatientStore } from '@/stores/patientStore';
import api from '@/plugins/axios';

const authStore = useAuthStore();
const appointmentStore = useAppointmentStore();
const patientStore = usePatientStore();

const patient = ref(null);
const upcomingAppointments = ref([]);
const completedVisits = ref(0);
const recentTests = ref([]);

const today = computed(() => {
  return new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
});

const statusColor = computed(() => {
  if (patient.value?.status === 'treatment') return 'success';
  if (patient.value?.status === 'testing') return 'warning';
  return 'grey';
});

const statusIcon = computed(() => {
  if (patient.value?.status === 'treatment') return 'mdi-check-circle';
  if (patient.value?.status === 'testing') return 'mdi-clock-outline';
  return 'mdi-help-circle';
});

const loadPatientData = async () => {
  try {
    // Get patient by user ID
    const response = await api.get('/patients/me');
    patient.value = response.data;
    
    // Load appointments
    await appointmentStore.loadMyAppointments();
    const allAppointments = appointmentStore.appointments;
    
    // Filter upcoming appointments (pending or checked-in)
    upcomingAppointments.value = allAppointments
      .filter(a => ['pending', 'checked-in'].includes(a.status))
      .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date));
    
    // Count completed visits
    completedVisits.value = allAppointments.filter(a => a.status === 'completed').length;
    
    // Load test results
    const historyResponse = await api.get(`/patients/${patient.value.id}/history`);
    const testingHistory = historyResponse.data.testing || [];
    recentTests.value = testingHistory.slice(0, 5);
    
  } catch (error) {
    console.error('Error loading patient data:', error);
  }
};

const cancelAppointment = async (appointmentId) => {
  try {
    await appointmentStore.cancelAppointment(appointmentId, 'Cancelled by patient');
    await loadPatientData();
  } catch (error) {
    console.error('Error cancelling appointment:', error);
  }
};

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

const getTestResultColor = (result) => {
  const colors = {
    positive: 'error',
    negative: 'success',
    indeterminate: 'warning'
  };
  return colors[result] || 'grey';
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

onMounted(() => {
  loadPatientData();
});
</script>