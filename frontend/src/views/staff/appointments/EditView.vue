<!-- frontend/src/views/staff/appointments/EditView.vue -->
<template>
  <v-container fluid class="pa-4">
    <v-row>
      <v-col cols="12" md="8" offset-md="2">
        <v-card>
          <v-card-title class="text-h5">
            <v-icon left>mdi-pencil</v-icon>
            Edit Appointment
            <v-spacer></v-spacer>
            <v-chip color="primary" small>
              #{{ appointmentId }}
            </v-chip>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <!-- Loading state -->
            <div v-if="loading" class="text-center pa-4">
              <v-progress-circular indeterminate color="primary"></v-progress-circular>
              <p class="mt-2">Loading appointment...</p>
            </div>
            
            <!-- Error state -->
            <div v-else-if="error" class="text-center pa-4">
              <v-icon color="error" size="64">mdi-alert-circle</v-icon>
              <p class="mt-2 text-h6">{{ error }}</p>
              <v-btn color="primary" @click="goBack">Go Back</v-btn>
            </div>
            
            <!-- Form -->
            <AppointmentForm
              v-else
              :appointment="appointmentData"
              mode="edit"
              @success="onSuccess"
              @cancel="goBack"
            />
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
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AppointmentForm from '@/components/staff/AppointmentForm.vue'
import appointmentService from '@/services/appointmentService'

export default {
  name: 'AppointmentEdit',
  components: { AppointmentForm },
  setup() {
    const router = useRouter()
    const route = useRoute()
    
    const appointmentData = ref(null)
    const loading = ref(false)
    const error = ref(null)
    const snackbar = ref({
      show: false,
      message: '',
      color: 'success'
    })

    const appointmentId = computed(() => {
      return parseInt(route.params.id)
    })

    const loadAppointment = async () => {
      if (!appointmentId.value) {
        error.value = 'Invalid appointment ID'
        return
      }
      
      loading.value = true
      error.value = null
      
      try {
        console.log(`Loading appointment with ID: ${appointmentId.value}`)
        const appointment = await appointmentService.getAppointment(appointmentId.value)
        
        if (appointment) {
          console.log('Appointment loaded successfully:', appointment)
          appointmentData.value = appointment
        } else {
          error.value = 'Appointment not found'
        }
      } catch (err) {
        console.error('Error loading appointment:', err)
        error.value = err.message || 'Failed to load appointment'
        showSnackbar('Failed to load appointment: ' + error.value, 'error')
      } finally {
        loading.value = false
      }
    }

    const onSuccess = (appointment) => {
      showSnackbar('Appointment updated successfully!', 'success')
      setTimeout(() => {
        router.push('/appointments')
      }, 1500)
    }

    const goBack = () => {
      router.push('/appointments')
    }

    const showSnackbar = (message, color = 'success') => {
      snackbar.value = { show: true, message, color }
    }

    onMounted(() => {
      console.log('EditView mounted.')
      console.log('Route params:', route.params)
      console.log('Appointment ID:', appointmentId.value)
      loadAppointment()
    })

    return {
      appointmentData,
      appointmentId,
      loading,
      error,
      snackbar,
      onSuccess,
      goBack
    }
  }
}
</script>