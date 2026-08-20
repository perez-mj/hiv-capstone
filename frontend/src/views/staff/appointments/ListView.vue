<!-- frontend/src/views/staff/appointments/ListView.vue -->
<template>
  <v-container fluid class="pa-4">
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="text-h5">
            <v-icon left>mdi-format-list-bulleted</v-icon>
            Appointments List
            <v-spacer></v-spacer>
            <v-btn color="success" @click="navigateToCreate" class="mr-2">
              <v-icon left>mdi-plus</v-icon>
              New
            </v-btn>
            <v-btn color="primary" @click="navigateToCalendar">
              <v-icon left>mdi-calendar</v-icon>
              Calendar View
            </v-btn>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <!-- Filters -->
            <v-row>
              <v-col cols="12" md="3">
                <v-menu
                  v-model="dateMenu"
                  :close-on-content-click="false"
                  transition="scale-transition"
                >
                  <template v-slot:activator="{ props }">
                    <v-text-field
                      v-model="selectedDate"
                      label="Date"
                      prepend-inner-icon="mdi-calendar"
                      readonly
                      v-bind="props"
                      outlined
                      dense
                    ></v-text-field>
                  </template>
                  <v-date-picker
                    v-model="selectedDate"
                    @update:model-value="dateMenu = false; loadAppointments()"
                    :min="minDate"
                  ></v-date-picker>
                </v-menu>
              </v-col>
              <v-col cols="12" md="3">
                <v-select
                  v-model="officeFilter"
                  :items="officeOptions"
                  label="Office"
                  clearable
                  outlined
                  dense
                  @update:model-value="loadAppointments"
                ></v-select>
              </v-col>
              <v-col cols="12" md="3">
                <v-select
                  v-model="statusFilter"
                  :items="statusOptions"
                  label="Status"
                  clearable
                  outlined
                  dense
                  @update:model-value="loadAppointments"
                ></v-select>
              </v-col>
              <v-col cols="12" md="3" class="text-right">
                <v-btn color="info" @click="refresh" :loading="loading">
                  <v-icon left small>mdi-refresh</v-icon>
                  Refresh
                </v-btn>
              </v-col>
            </v-row>

            <!-- Table -->
            <v-data-table
              :headers="headers"
              :items="filteredAppointments"
              :loading="loading"
              items-per-page="20"
            >
              <template v-slot:item.patient_name="{ item }">
                <div v-if="item.Patient">
                  <router-link :to="`/patients/${item.Patient.id}`" class="text-decoration-none">
                    {{ item.Patient.first_name }} {{ item.Patient.last_name }}
                  </router-link>
                  <div class="text-caption text-grey">{{ item.Patient.contact_number }}</div>
                </div>
                <span v-else class="text-grey">N/A</span>
              </template>
              <template v-slot:item.appointment_date="{ item }">
                {{ formatDate(item.appointment_date) }}
              </template>
              <template v-slot:item.time_slot="{ item }">
                {{ formatTimeSlot(item.time_slot) }}
              </template>
              <template v-slot:item.office="{ item }">
                <v-chip :color="item.office === 'testing' ? 'info' : 'success'" small>
                  {{ item.office }}
                </v-chip>
              </template>
              <template v-slot:item.type="{ item }">
                <v-chip :color="item.type === 'scheduled' ? 'primary' : 'orange'" small text-color="white">
                  {{ item.type }}
                </v-chip>
              </template>
              <template v-slot:item.status="{ item }">
                <v-chip :color="getStatusColor(item.status)" small>
                  {{ item.status }}
                </v-chip>
              </template>
              <template v-slot:item.actions="{ item }">
                <v-btn icon small color="primary" @click="viewAppointment(item)">
                  <v-icon small>mdi-eye</v-icon>
                </v-btn>
                <v-btn icon small color="info" @click="editAppointment(item)"
                       :disabled="item.status === 'completed' || item.status === 'cancelled'">
                  <v-icon small>mdi-pencil</v-icon>
                </v-btn>
                <v-btn icon small color="success" @click="checkIn(item)" 
                       :disabled="item.status !== 'pending'" :loading="checkingIn === item.id">
                  <v-icon small>mdi-check</v-icon>
                </v-btn>
                <v-btn icon small color="error" @click="cancelAppointment(item)"
                       :disabled="item.status === 'completed' || item.status === 'cancelled'">
                  <v-icon small>mdi-cancel</v-icon>
                </v-btn>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Appointment Detail Dialog -->
    <v-dialog v-model="detailDialog" max-width="600px">
      <v-card rounded="lg">
        <v-card-title class="d-flex justify-space-between align-center">
          <span class="text-h6">Appointment Details</span>
          <v-btn
                  icon="mdi-close"
                  variant="text"
                  @click="detailDialog = false"
                ></v-btn>
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pt-4" v-if="selectedAppointment">
          <v-list dense>
            <v-list-item>
              <v-list-item-content>
                <v-list-item-title class="text-caption text-grey">Patient</v-list-item-title>
                <v-list-item-subtitle>
                  {{ selectedAppointment.Patient?.first_name }} {{ selectedAppointment.Patient?.last_name }}
                </v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
            <v-divider></v-divider>
            <v-list-item>
              <v-list-item-content>
                <v-list-item-title class="text-caption text-grey">Date</v-list-item-title>
                <v-list-item-subtitle>{{ formatDate(selectedAppointment.appointment_date) }}</v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
            <v-divider></v-divider>
            <v-list-item>
              <v-list-item-content>
                <v-list-item-title class="text-caption text-grey">Time</v-list-item-title>
                <v-list-item-subtitle>{{ formatTimeSlot(selectedAppointment.time_slot) }}</v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
            <v-divider></v-divider>
            <v-list-item>
              <v-list-item-content>
                <v-list-item-title class="text-caption text-grey">Office</v-list-item-title>
                <v-list-item-subtitle>{{ selectedAppointment.office }}</v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
            <v-divider></v-divider>
            <v-list-item>
              <v-list-item-content>
                <v-list-item-title class="text-caption text-grey">Type</v-list-item-title>
                <v-list-item-subtitle>{{ selectedAppointment.type }}</v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
            <v-divider></v-divider>
            <v-list-item>
              <v-list-item-content>
                <v-list-item-title class="text-caption text-grey">Status</v-list-item-title>
                <v-list-item-subtitle>
                  <v-chip :color="getStatusColor(selectedAppointment.status)" small>
                    {{ selectedAppointment.status }}
                  </v-chip>
                </v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
            <v-divider v-if="selectedAppointment.notes"></v-divider>
            <v-list-item v-if="selectedAppointment.notes">
              <v-list-item-content>
                <v-list-item-title class="text-caption text-grey">Notes</v-list-item-title>
                <v-list-item-subtitle>{{ selectedAppointment.notes }}</v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
            <v-divider v-if="selectedAppointment.cancellation_reason"></v-divider>
            <v-list-item v-if="selectedAppointment.cancellation_reason">
              <v-list-item-content>
                <v-list-item-title class="text-caption text-grey">Cancellation Reason</v-list-item-title>
                <v-list-item-subtitle>{{ selectedAppointment.cancellation_reason }}</v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import appointmentService from '@/services/appointmentService'

export default {
  name: 'AppointmentList',
  setup() {
    const router = useRouter()
    const route = useRoute()
    const appointments = ref([])
    const loading = ref(false)
    const checkingIn = ref(null)
    const selectedDate = ref('')
    const officeFilter = ref(null)
    const statusFilter = ref(null)
    const dateMenu = ref(false)
    const detailDialog = ref(false)
    const selectedAppointment = ref(null)

    const snackbar = ref({
      show: false,
      message: '',
      color: 'success'
    })

    // Set initial date to today
    const minDate = computed(() => {
      const today = new Date()
      return today.toISOString().split('T')[0]
    })

    // Initialize selectedDate with today's date
    const today = new Date()
    selectedDate.value = today.toISOString().split('T')[0]

    const officeOptions = [
      { title: 'Testing', value: 'testing' },
      { title: 'Treatment', value: 'treatment' }
    ]

    const statusOptions = [
      { title: 'Pending', value: 'pending' },
      { title: 'Checked-in', value: 'checked-in' },
      { title: 'Completed', value: 'completed' },
      { title: 'Cancelled', value: 'cancelled' },
      { title: 'No-Show', value: 'no-show' }
    ]

    const headers = [
      { title: 'Patient', key: 'patient_name' },
      { title: 'Date', key: 'appointment_date' },
      { title: 'Time', key: 'time_slot', align: 'center' },
      { title: 'Office', key: 'office', align: 'center' },
      { title: 'Type', key: 'type', align: 'center' },
      { title: 'Status', key: 'status', align: 'center' },
      { title: 'Actions', key: 'actions', align: 'center', sortable: false }
    ]

    const filteredAppointments = computed(() => {
      let items = appointments.value
      
      if (statusFilter.value) {
        items = items.filter(a => a.status === statusFilter.value)
      }
      
      return items
    })

    const loadAppointments = async () => {
      // Validate that we have a date
      if (!selectedDate.value) {
        console.warn('No date selected, using today')
        const today = new Date()
        selectedDate.value = today.toISOString().split('T')[0]
      }

      loading.value = true
      try {
        const data = await appointmentService.getAppointmentsByDate(
          selectedDate.value,
          officeFilter.value
        )
        appointments.value = data || []
      } catch (error) {
        console.error('Failed to load appointments:', error)
        showSnackbar('Failed to load appointments: ' + (error.message || 'Unknown error'), 'error')
        appointments.value = []
      } finally {
        loading.value = false
      }
    }

    const checkIn = async (appointment) => {
      checkingIn.value = appointment.id
      try {
        await appointmentService.checkInPatient(appointment.id)
        showSnackbar('Patient checked in successfully', 'success')
        detailDialog.value = false
        await loadAppointments()
      } catch (error) {
        showSnackbar('Failed to check in: ' + error.message, 'error')
      } finally {
        checkingIn.value = null
      }
    }

    const cancelAppointment = async (appointment) => {
      const patientName = appointment.Patient 
        ? `${appointment.Patient.first_name} ${appointment.Patient.last_name}`
        : 'Unknown'
      
      if (!confirm(`Cancel appointment for ${patientName}?`)) return
      
      try {
        await appointmentService.cancelAppointment(appointment.id, 'Cancelled by staff')
        showSnackbar('Appointment cancelled', 'warning')
        detailDialog.value = false
        await loadAppointments()
      } catch (error) {
        showSnackbar('Failed to cancel: ' + error.message, 'error')
      }
    }

    const viewAppointment = (appointment) => {
      selectedAppointment.value = appointment
      detailDialog.value = true
    }

    const editAppointment = (appointment) => {
      detailDialog.value = false
      router.push(`/appointments/${appointment.id}/edit`)
    }

    const navigateToCreate = () => {
      router.push('/appointments/create')
    }

    const navigateToCalendar = () => {
      router.push('/appointments/calendar')
    }

    const refresh = () => {
      loadAppointments()
    }

    const formatDate = (date) => {
      if (!date) return 'N/A'
      try {
        return new Date(date).toLocaleDateString()
      } catch {
        return 'Invalid date'
      }
    }

    const formatTimeSlot = (time) => {
      if (!time) return 'N/A'
      try {
        const parts = time.split(':')
        const hour = parseInt(parts[0])
        const minute = parts[1]
        const ampm = hour >= 12 ? 'PM' : 'AM'
        const hour12 = hour % 12 || 12
        return `${hour12}:${minute} ${ampm}`
      } catch {
        return time
      }
    }

    const getStatusColor = (status) => {
      const colors = {
        pending: 'info',
        'checked-in': 'warning',
        completed: 'success',
        cancelled: 'error',
        'no-show': 'grey'
      }
      return colors[status] || 'primary'
    }

    const showSnackbar = (message, color = 'success') => {
      snackbar.value = { show: true, message, color }
    }

    // Watch for URL query params
    watch(() => route.query.date, (newDate) => {
      if (newDate) {
        selectedDate.value = newDate
        loadAppointments()
      }
    })

    // Watch selectedDate to reload appointments
    watch(() => selectedDate.value, (newVal) => {
      if (newVal) {
        loadAppointments()
      }
    })

    onMounted(() => {
      // Set date from query param or use today
      if (route.query.date) {
        selectedDate.value = route.query.date
      } else {
        const today = new Date()
        selectedDate.value = today.toISOString().split('T')[0]
      }
      loadAppointments()
    })

    return {
      appointments,
      loading,
      checkingIn,
      selectedDate,
      officeFilter,
      statusFilter,
      dateMenu,
      detailDialog,
      selectedAppointment,
      minDate,
      officeOptions,
      statusOptions,
      headers,
      filteredAppointments,
      loadAppointments,
      checkIn,
      cancelAppointment,
      viewAppointment,
      editAppointment,
      navigateToCreate,
      navigateToCalendar,
      refresh,
      formatDate,
      formatTimeSlot,
      getStatusColor,
      snackbar
    }
  }
}
</script>