<!-- frontend/src/views/staff/appointments/DetailView.vue -->
<template>
  <v-container fluid class="pa-4">
    <v-row>
      <v-col cols="12" md="8" offset-md="2">
        <v-card>
          <v-card-title class="text-h5">
            <v-icon left>mdi-calendar-check</v-icon>
            Appointment Details
            <v-spacer></v-spacer>
            <v-chip color="primary" small v-if="appointment">
              #{{ appointment.id }}
            </v-chip>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text v-if="appointment">
            <v-row>
              <v-col cols="12" md="6">
                <div class="text-subtitle-2 font-weight-bold">Patient</div>
                <div v-if="appointment.Patient">
                  <router-link :to="`/patients/${appointment.Patient.id}`" class="text-decoration-none">
                    {{ appointment.Patient.first_name }} {{ appointment.Patient.last_name }}
                  </router-link>
                  <div class="text-caption text-grey">{{ appointment.Patient.contact_number }}</div>
                </div>
                <div v-else class="text-grey">N/A</div>
              </v-col>
              <v-col cols="12" md="6">
                <div class="text-subtitle-2 font-weight-bold">Status</div>
                <v-chip :color="getStatusColor(appointment.status)">
                  {{ appointment.status }}
                </v-chip>
              </v-col>
              <v-col cols="12" md="6">
                <div class="text-subtitle-2 font-weight-bold">Date</div>
                <div>{{ formatDate(appointment.appointment_date) }}</div>
              </v-col>
              <v-col cols="12" md="6">
                <div class="text-subtitle-2 font-weight-bold">Time</div>
                <div>{{ formatTimeSlot(appointment.time_slot) }}</div>
              </v-col>
              <v-col cols="12" md="6">
                <div class="text-subtitle-2 font-weight-bold">Office</div>
                <v-chip :color="appointment.office === 'testing' ? 'info' : 'success'" small>
                  {{ appointment.office }}
                </v-chip>
              </v-col>
              <v-col cols="12" md="6">
                <div class="text-subtitle-2 font-weight-bold">Type</div>
                <v-chip :color="appointment.type === 'scheduled' ? 'primary' : 'orange'" small text-color="white">
                  {{ appointment.type }}
                </v-chip>
              </v-col>
              <v-col cols="12" v-if="appointment.notes">
                <div class="text-subtitle-2 font-weight-bold">Notes</div>
                <div>{{ appointment.notes }}</div>
              </v-col>
              <v-col cols="12" v-if="appointment.cancellation_reason">
                <div class="text-subtitle-2 font-weight-bold">Cancellation Reason</div>
                <div>{{ appointment.cancellation_reason }}</div>
              </v-col>
            </v-row>

            <v-divider class="my-4"></v-divider>

            <v-row>
              <v-col cols="12" class="text-right">
                <v-btn color="primary" @click="editAppointment" 
                       :disabled="appointment.status === 'completed' || appointment.status === 'cancelled'">
                  <v-icon left>mdi-pencil</v-icon>
                  Edit
                </v-btn>
                <v-btn color="success" @click="checkIn" 
                       :disabled="appointment.status !== 'pending'" 
                       :loading="checkingIn" class="ml-2">
                  <v-icon left>mdi-check-in</v-icon>
                  Check In
                </v-btn>
                <v-btn color="error" @click="cancelAppointment"
                       :disabled="appointment.status === 'completed' || appointment.status === 'cancelled'" 
                       class="ml-2">
                  <v-icon left>mdi-cancel</v-icon>
                  Cancel
                </v-btn>
              </v-col>
            </v-row>
          </v-card-text>
          <v-card-text v-else class="text-center py-8">
            <v-icon size="64" color="grey lighten-2">mdi-calendar-off</v-icon>
            <div class="text-h6 text-grey mt-2">Appointment not found</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import appointmentService from '@/services/appointmentService'

export default {
  name: 'AppointmentDetail',
  setup() {
    const router = useRouter()
    const route = useRoute()
    const appointment = ref(null)
    const checkingIn = ref(false)

    const snackbar = ref({
      show: false,
      message: '',
      color: 'success'
    })

    const loadAppointment = async () => {
      const id = route.params.id
      if (!id) return

      try {
        // Since we don't have a get by ID endpoint, fetch by date and filter
        const appointments = await appointmentService.getAppointmentsByDate(
          new Date().toISOString().split('T')[0]
        )
        const found = appointments.find(a => a.id === parseInt(id))
        if (found) {
          appointment.value = found
        } else {
          showSnackbar('Appointment not found', 'error')
        }
      } catch (error) {
        showSnackbar('Failed to load appointment: ' + error.message, 'error')
      }
    }

    const checkIn = async () => {
      if (!appointment.value) return
      
      checkingIn.value = true
      try {
        await appointmentService.checkInPatient(appointment.value.id)
        showSnackbar('Patient checked in successfully', 'success')
        await loadAppointment()
      } catch (error) {
        showSnackbar('Failed to check in: ' + error.message, 'error')
      } finally {
        checkingIn.value = false
      }
    }

    const cancelAppointment = async () => {
      if (!appointment.value) return
      
      const patientName = appointment.value.Patient 
        ? `${appointment.value.Patient.first_name} ${appointment.value.Patient.last_name}`
        : 'Unknown'
      
      if (!confirm(`Cancel appointment for ${patientName}?`)) return
      
      try {
        await appointmentService.cancelAppointment(appointment.value.id, 'Cancelled by staff')
        showSnackbar('Appointment cancelled', 'warning')
        await loadAppointment()
      } catch (error) {
        showSnackbar('Failed to cancel: ' + error.message, 'error')
      }
    }

    const editAppointment = () => {
      if (appointment.value) {
        router.push(`/appointments/${appointment.value.id}/edit`)
      }
    }

    const formatDate = (date) => {
      if (!date) return 'N/A'
      return new Date(date).toLocaleDateString()
    }

    const formatTimeSlot = (time) => {
      if (!time) return 'N/A'
      const parts = time.split(':')
      const hour = parseInt(parts[0])
      const minute = parts[1]
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const hour12 = hour % 12 || 12
      return `${hour12}:${minute} ${ampm}`
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

    onMounted(() => {
      loadAppointment()
    })

    return {
      appointment,
      checkingIn,
      snackbar,
      checkIn,
      cancelAppointment,
      editAppointment,
      formatDate,
      formatTimeSlot,
      getStatusColor
    }
  }
}
</script>