<!-- frontend/src/views/staff/appointments/CreateView.vue -->
<template>
  <v-container fluid class="pa-4">
    <v-row>
      <v-col cols="12" md="8" offset-md="2">
        <v-card class="rounded-lg">
          <v-card-title class="d-flex align-center pa-4 bg-surface">
            <v-icon class="mr-2 text-primary">mdi-calendar-plus</v-icon>
            <span class="text-h5 font-weight-medium">Book New Appointment</span>
          </v-card-title>
          
          <v-divider></v-divider>
          
          <v-card-text class="pa-4">
            <!-- Loading state -->
            <div v-if="loading" class="text-center pa-8">
              <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
              <p class="mt-4 text-medium-emphasis">Loading appointment form...</p>
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
              :patient-id="patientId"
              :settings="appointmentSettings"
              mode="create"
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
  name: 'AppointmentCreate',
  components: { AppointmentForm },
  setup() {
    const router = useRouter()
    const route = useRoute()
    const appointmentStore = useAppointmentStore()
    
    const loading = ref(false)
    const error = ref(null)
    const appointmentSettings = ref(null)
    const snackbar = ref({
      show: false,
      message: '',
      color: 'success',
      icon: 'mdi-check-circle'
    })

    const patientId = computed(() => {
      const id = route.query.patientId
      return id ? parseInt(id) : null
    })

    const onSuccess = (appointment) => {
      showSnackbar('Appointment created successfully!', 'success')
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
      loading.value = true
      try {
        appointmentSettings.value = await appointmentStore.loadAppointmentSettings()
        console.log('Settings loaded:', appointmentSettings.value)
      } catch (err) {
        console.error('Failed to load settings:', err)
        error.value = 'Failed to load appointment settings'
        showSnackbar(error.value, 'error')
      } finally {
        loading.value = false
      }
    })

    return {
      patientId,
      loading,
      error,
      appointmentSettings,
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
</style>