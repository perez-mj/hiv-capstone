<!-- frontend/src/views/staff/appointments/ListView.vue -->
<template>
  <v-container fluid class="pa-4">
    <v-row>
      <v-col cols="12">
        <v-card class="rounded-lg">
          <v-card-title class="text-h5 pa-4 bg-surface">
            <v-icon class="mr-2 text-primary">mdi-format-list-bulleted</v-icon>
            Appointments List
            <v-spacer></v-spacer>
            <v-btn 
              color="success" 
              @click="navigateToCreate" 
              class="mr-2 text-capitalize"
              variant="flat"
              rounded
            >
              <v-icon left size="20">mdi-plus</v-icon>
              New
            </v-btn>
            <v-btn 
              color="primary" 
              @click="navigateToCalendar"
              variant="flat"
              rounded
            >
              <v-icon left size="20">mdi-calendar</v-icon>
              Calendar View
            </v-btn>
          </v-card-title>
          
          <v-divider></v-divider>
          
          <v-card-text class="pa-4">
            <!-- Filters -->
            <v-row class="mb-4">
              <v-col cols="12" md="3">
                <v-menu
                  v-model="dateMenu"
                  :close-on-content-click="false"
                  transition="scale-transition"
                  offset-y
                >
                  <template v-slot:activator="{ props }">
                    <v-text-field
                      v-model="selectedDate"
                      label="Date"
                      prepend-inner-icon="mdi-calendar"
                      readonly
                      v-bind="props"
                      variant="outlined"
                      density="compact"
                      hide-details
                      class="rounded-lg"
                    ></v-text-field>
                  </template>
                  <v-date-picker
                    v-model="selectedDate"
                    @update:model-value="dateMenu = false; loadAppointments()"
                    :min="minDate"
                    color="primary"
                  ></v-date-picker>
                </v-menu>
              </v-col>
              <v-col cols="12" md="3">
                <v-select
                  v-model="officeFilter"
                  :items="officeOptions"
                  label="Office"
                  clearable
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="rounded-lg"
                  @update:model-value="loadAppointments"
                ></v-select>
              </v-col>
              <v-col cols="12" md="3">
                <v-select
                  v-model="statusFilter"
                  :items="statusOptions"
                  label="Status"
                  clearable
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="rounded-lg"
                  @update:model-value="loadAppointments"
                ></v-select>
              </v-col>
              <v-col cols="12" md="3" class="text-right d-flex align-center justify-end">
                <v-btn 
                  color="primary" 
                  @click="refresh" 
                  :loading="loading"
                  variant="tonal"
                  rounded
                  class="text-capitalize"
                >
                  <v-icon left size="18">mdi-refresh</v-icon>
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
              class="rounded-lg"
              hover
            >
              <template v-slot:item.patient_name="{ item }">
                <div v-if="item.Patient">
                  <router-link :to="`/patients/${item.Patient.id}`" class="text-decoration-none font-weight-medium">
                    {{ item.Patient.first_name }} {{ item.Patient.last_name }}
                  </router-link>
                  <div class="text-caption text-medium-emphasis">{{ item.Patient.contact_number }}</div>
                </div>
                <span v-else class="text-medium-emphasis">N/A</span>
              </template>
              
              <template v-slot:item.transaction_type="{ item }">
                <div v-if="item.TransactionType">
                  <v-chip 
                    :color="item.TransactionType.color_code || 'primary'"
                    size="small"
                    class="font-weight-medium"
                    :style="`background-color: ${item.TransactionType.color_code || '#1976D2'}20; color: ${item.TransactionType.color_code || '#1976D2'}; border: 1px solid ${item.TransactionType.color_code || '#1976D2'}40;`"
                  >
                    {{ item.TransactionType.name }}
                  </v-chip>
                  <div class="text-caption text-medium-emphasis mt-1">
                    {{ item.TransactionType.estimated_duration_minutes }} min
                  </div>
                </div>
                <span v-else class="text-medium-emphasis">N/A</span>
              </template>
              
              <template v-slot:item.appointment_date="{ item }">
                {{ formatDate(item.appointment_date) }}
              </template>
              
              <template v-slot:item.time_slot="{ item }">
                {{ formatTimeSlot(item.time_slot) }}
              </template>
              
              <template v-slot:item.office="{ item }">
                <v-chip 
                  :color="item.office === 'testing' ? 'info' : 'success'" 
                  size="small"
                  variant="tonal"
                >
                  {{ item.office }}
                </v-chip>
              </template>
              
              <template v-slot:item.status="{ item }">
                <v-chip 
                  :color="getStatusColor(item.status)" 
                  size="small"
                  variant="tonal"
                  class="font-weight-medium"
                >
                  {{ item.status }}
                </v-chip>
              </template>
              
              <template v-slot:item.actions="{ item }">
                <v-tooltip text="View details" location="top">
                  <template v-slot:activator="{ props }">
                    <v-btn 
                      icon="mdi-eye"
                      size="small" 
                      color="primary" 
                      variant="text"
                      @click="viewAppointment(item)"
                      v-bind="props"
                    ></v-btn>
                  </template>
                </v-tooltip>
                
                <v-tooltip text="Edit appointment" location="top">
                  <template v-slot:activator="{ props }">
                    <v-btn 
                      icon="mdi-pencil"
                      size="small" 
                      color="info" 
                      variant="text"
                      @click="editAppointment(item)"
                      :disabled="item.status === 'completed' || item.status === 'cancelled'"
                      v-bind="props"
                    ></v-btn>
                  </template>
                </v-tooltip>
                
                <v-tooltip text="Check in patient" location="top">
                  <template v-slot:activator="{ props }">
                    <v-btn 
                      icon="mdi-check"
                      size="small" 
                      color="success" 
                      variant="text"
                      @click="checkIn(item)" 
                      :disabled="item.status !== 'pending'"
                      :loading="checkingIn === item.id"
                      v-bind="props"
                    ></v-btn>
                  </template>
                </v-tooltip>
                
                <v-tooltip text="Cancel appointment" location="top">
                  <template v-slot:activator="{ props }">
                    <v-btn 
                      icon="mdi-cancel"
                      size="small" 
                      color="error" 
                      variant="text"
                      @click="cancelAppointment(item)"
                      :disabled="item.status === 'completed' || item.status === 'cancelled'"
                      v-bind="props"
                    ></v-btn>
                  </template>
                </v-tooltip>
              </template>
              
              <!-- Empty state -->
              <template v-slot:no-data>
                <div class="text-center pa-8">
                  <v-icon size="48" color="grey-lighten-1">mdi-calendar-blank</v-icon>
                  <div class="text-h6 mt-4 text-medium-emphasis">No appointments found</div>
                  <div class="text-body-2 text-medium-emphasis">Try adjusting your filters or create a new appointment</div>
                </div>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Appointment Detail Dialog -->
    <v-dialog v-model="detailDialog" max-width="600px">
      <v-card rounded="lg">
        <v-card-title class="d-flex justify-space-between align-center pa-4">
          <span class="text-h6 font-weight-bold">Appointment Details</span>
          <v-btn
            icon="mdi-close"
            variant="text"
            @click="detailDialog = false"
            size="small"
          ></v-btn>
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pt-4" v-if="selectedAppointment">
          <v-list density="compact">
            <v-list-item>
              <v-list-item-content>
                <v-list-item-title class="text-caption font-weight-bold text-medium-emphasis">Patient</v-list-item-title>
                <v-list-item-subtitle class="text-body-1">
                  {{ selectedAppointment.Patient?.first_name }} {{ selectedAppointment.Patient?.last_name }}
                </v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
            <v-divider></v-divider>
            
            <v-list-item>
              <v-list-item-content>
                <v-list-item-title class="text-caption font-weight-bold text-medium-emphasis">Transaction Type</v-list-item-title>
                <v-list-item-subtitle class="text-body-1">
                  <v-chip 
                    v-if="selectedAppointment.TransactionType"
                    :color="selectedAppointment.TransactionType.color_code || 'primary'"
                    size="small"
                    class="font-weight-medium"
                    :style="`background-color: ${selectedAppointment.TransactionType.color_code || '#1976D2'}20; color: ${selectedAppointment.TransactionType.color_code || '#1976D2'}; border: 1px solid ${selectedAppointment.TransactionType.color_code || '#1976D2'}40;`"
                  >
                    {{ selectedAppointment.TransactionType.name }}
                  </v-chip>
                  <span v-else class="text-medium-emphasis">N/A</span>
                </v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
            <v-divider></v-divider>
            
            <v-list-item>
              <v-list-item-content>
                <v-list-item-title class="text-caption font-weight-bold text-medium-emphasis">Date</v-list-item-title>
                <v-list-item-subtitle class="text-body-1">{{ formatDate(selectedAppointment.appointment_date) }}</v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
            <v-divider></v-divider>
            
            <v-list-item>
              <v-list-item-content>
                <v-list-item-title class="text-caption font-weight-bold text-medium-emphasis">Time</v-list-item-title>
                <v-list-item-subtitle class="text-body-1">{{ formatTimeSlot(selectedAppointment.time_slot) }}</v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
            <v-divider></v-divider>
            
            <v-list-item>
              <v-list-item-content>
                <v-list-item-title class="text-caption font-weight-bold text-medium-emphasis">Office</v-list-item-title>
                <v-list-item-subtitle class="text-body-1">
                  <v-chip 
                    :color="selectedAppointment.office === 'testing' ? 'info' : 'success'" 
                    size="small"
                    variant="tonal"
                  >
                    {{ selectedAppointment.office }}
                  </v-chip>
                </v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
            <v-divider></v-divider>
            
            <v-list-item>
              <v-list-item-content>
                <v-list-item-title class="text-caption font-weight-bold text-medium-emphasis">Status</v-list-item-title>
                <v-list-item-subtitle>
                  <v-chip 
                    :color="getStatusColor(selectedAppointment.status)" 
                    size="small"
                    variant="tonal"
                    class="font-weight-medium"
                  >
                    {{ selectedAppointment.status }}
                  </v-chip>
                </v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
            
            <v-divider v-if="selectedAppointment.notes"></v-divider>
            <v-list-item v-if="selectedAppointment.notes">
              <v-list-item-content>
                <v-list-item-title class="text-caption font-weight-bold text-medium-emphasis">Notes</v-list-item-title>
                <v-list-item-subtitle class="text-body-2">{{ selectedAppointment.notes }}</v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
            
            <v-divider v-if="selectedAppointment.cancellation_reason"></v-divider>
            <v-list-item v-if="selectedAppointment.cancellation_reason">
              <v-list-item-content>
                <v-list-item-title class="text-caption font-weight-bold text-medium-emphasis">Cancellation Reason</v-list-item-title>
                <v-list-item-subtitle class="text-body-2">{{ selectedAppointment.cancellation_reason }}</v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000" rounded>
      <v-icon left size="20" class="mr-2">{{ snackbar.icon }}</v-icon>
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAppointmentStore } from '@/stores/appointmentStore'

export default {
  name: 'AppointmentList',
  setup() {
    const router = useRouter()
    const route = useRoute()
    const appointmentStore = useAppointmentStore()
    
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
      color: 'success',
      icon: 'mdi-check-circle'
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
      { title: 'Patient', key: 'patient_name', sortable: false },
      { title: 'Transaction Type', key: 'transaction_type', sortable: false },
      { title: 'Date', key: 'appointment_date' },
      { title: 'Time', key: 'time_slot', align: 'center' },
      { title: 'Office', key: 'office', align: 'center' },
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
        // Use store instead of direct service call
        const data = await appointmentStore.loadAppointmentsByDate(
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
        await appointmentStore.checkInPatient(appointment.id)
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
        await appointmentStore.cancelAppointment(appointment.id, 'Cancelled by staff')
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
        return new Date(date).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })
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
      const icons = {
        success: 'mdi-check-circle',
        error: 'mdi-alert-circle',
        warning: 'mdi-alert',
        info: 'mdi-information'
      }
      snackbar.value = { 
        show: true, 
        message, 
        color,
        icon: icons[color] || 'mdi-information'
      }
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

<style scoped>
.v-card {
  transition: none !important;
}

:deep(.v-data-table) {
  border-radius: 12px;
  background: transparent;
}

:deep(.v-data-table .v-table) {
  border-radius: 12px;
}

:deep(.v-data-table .v-data-table__tr) {
  transition: background 0.2s ease;
}

:deep(.v-data-table .v-data-table__tr:hover) {
  background: rgba(0, 0, 0, 0.02);
}

:deep(.v-field) {
  border-radius: 12px !important;
}

:deep(.v-select .v-field) {
  border-radius: 12px !important;
}

:deep(.v-btn--variant-text) {
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

:deep(.v-btn--variant-text:hover) {
  opacity: 1;
  background: transparent !important;
}

:deep(.v-chip) {
  font-weight: 500;
}

.bg-surface {
  background: transparent;
}

.text-capitalize {
  text-transform: capitalize;
}
</style>