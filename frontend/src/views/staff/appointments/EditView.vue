<!-- frontend/src/views/staff/appointments/EditView.vue -->
<template>
  <v-container fluid class="pa-4">
    <v-row>
      <v-col cols="12" md="8" offset-md="2">
        <v-card class="rounded-lg">
          <v-card-title class="d-flex align-center pa-4 bg-surface">
            <v-icon class="mr-2 text-primary">mdi-pencil</v-icon>
            <span class="text-h5 font-weight-medium">Edit Appointment</span>
            <v-spacer></v-spacer>
            <v-chip 
              color="primary" 
              size="small"
              variant="tonal"
              class="font-weight-medium"
            >
              #{{ appointmentId }}
            </v-chip>
          </v-card-title>
          
          <v-divider></v-divider>
          
          <v-card-text class="pa-4">
            <!-- Loading state -->
            <div v-if="loading" class="text-center pa-8">
              <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
              <p class="mt-4 text-medium-emphasis">Loading appointment...</p>
            </div>
            
            <!-- Error state -->
            <div v-else-if="error" class="text-center pa-8">
              <v-icon color="error" size="64">mdi-alert-circle</v-icon>
              <p class="mt-2 text-h6 text-medium-emphasis">{{ error }}</p>
              <v-btn color="primary" @click="goBack" rounded variant="flat" class="mt-2 text-capitalize">
                <v-icon left size="18">mdi-arrow-left</v-icon>
                Go Back
              </v-btn>
            </div>
            
            <!-- Form -->
            <AppointmentForm
              v-else
              :appointment="appointmentData"
              :settings="appointmentSettings"
              mode="edit"
              @success="onSuccess"
              @cancel="goBack"
            />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000" rounded>
      <v-icon left size="20" class="mr-2">{{ snackbar.icon }}</v-icon>
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AppointmentForm from '@/components/staff/AppointmentForm.vue'
import { useAppointmentStore } from '@/stores/appointmentStore'

export default {
  name: 'AppointmentEdit',
  components: { AppointmentForm },
  setup() {
    const router = useRouter()
    const route = useRoute()
    const appointmentStore = useAppointmentStore()
    
    const appointmentData = ref(null)
    const appointmentSettings = ref(null)
    const loading = ref(false)
    const error = ref(null)
    const snackbar = ref({
      show: false,
      message: '',
      color: 'success',
      icon: 'mdi-check-circle'
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
        const appointment = await appointmentStore.getAppointment(appointmentId.value)
        
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
        router.push(`/appointments/${appointment.id}`)
      }, 1500)
    }

    const goBack = () => {
      router.push('/appointments')
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

    onMounted(async () => {
      console.log('EditView mounted.')
      console.log('Route params:', route.params)
      console.log('Appointment ID:', appointmentId.value)
      
      // Load settings first
      appointmentSettings.value = await appointmentStore.loadAppointmentSettings()
      await loadAppointment()
    })

    return {
      appointmentData,
      appointmentSettings,
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

<style scoped>
.v-card {
  transition: none !important;
}

.bg-surface {
  background: transparent;
}

.text-capitalize {
  text-transform: capitalize;
}

:deep(.v-field) {
  border-radius: 12px !important;
}

:deep(.v-btn) {
  border-radius: 8px !important;
}
</style>