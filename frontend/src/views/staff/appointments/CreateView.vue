<!-- frontend/src/views/staff/appointments/CreateView.vue -->
<template>
  <v-container fluid class="pa-4">
    <v-row>
      <v-col cols="12" md="8" offset-md="2">
        <v-card>
          <v-card-title class="text-h5">
            <v-icon left>mdi-calendar-plus</v-icon>
            Book New Appointment
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <AppointmentForm
              :patient-id="patientId"
              :office="office"
              mode="create"
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
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AppointmentForm from '@/components/staff/AppointmentForm.vue'

export default {
  name: 'AppointmentCreate',
  components: { AppointmentForm },
  setup() {
    const router = useRouter()
    const route = useRoute()
    
    const snackbar = ref({
      show: false,
      message: '',
      color: 'success'
    })

    const patientId = computed(() => {
      return route.query.patientId ? parseInt(route.query.patientId) : null
    })

    const office = computed(() => {
      return route.query.office || null
    })

    const onSuccess = (appointment) => {
      showSnackbar('Appointment created successfully!', 'success')
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

    return {
      patientId,
      office,
      snackbar,
      onSuccess,
      goBack
    }
  }
}
</script>