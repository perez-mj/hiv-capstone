<!-- frontend/src/components/appointments/AppointmentDetailsDialog.vue -->
<template>
  <v-dialog :model-value="modelValue" max-width="600" @update:model-value="$emit('update:modelValue', $event)">
    <v-card>
      <v-card-title class="d-flex justify-space-between align-center">
        <span>Appointment Details</span>
        <v-chip 
          v-if="appointment"
          :color="getStatusColor(appointment.status)"
          size="small"
        >
          {{ appointment.status || 'Unknown' }}
        </v-chip>
        <v-btn icon @click="$emit('close')">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text>
        <v-skeleton-loader v-if="loading" type="paragraph" />
        <div v-else-if="appointment" class="appointment-details">
          <!-- Queue Information -->
          <v-card v-if="appointment.queue_number" variant="outlined" class="mb-4">
            <v-card-text class="d-flex align-center">
              <v-icon color="primary" size="40" class="mr-4">mdi-account-queue</v-icon>
              <div>
                <div class="text-caption text-medium-emphasis">Queue Number</div>
                <div class="text-h4 font-weight-bold">{{ appointment.queue_number }}</div>
                <div class="text-caption">
                  Status: 
                  <v-chip size="x-small" :color="getQueueStatusColor(appointment.queue_status)" class="ml-1">
                    {{ appointment.queue_status || 'Unknown' }}
                  </v-chip>
                </div>
              </div>
            </v-card-text>
          </v-card>

          <v-row>
            <v-col cols="6">
              <div class="text-caption text-medium-emphasis">Appointment #</div>
              <div class="text-body-1 mb-4 font-weight-medium">
                {{ appointment.appointment_number || appointment.id || 'N/A' }}
              </div>
            </v-col>
            <v-col cols="6">
              <div class="text-caption text-medium-emphasis">Date & Time</div>
              <div class="text-body-1 mb-4">{{ formatDateTime(appointment.scheduled_at) }}</div>
            </v-col>
            <v-col cols="12">
              <div class="text-caption text-medium-emphasis">Patient</div>
              <div class="text-body-1 mb-2">{{ getPatientName(appointment) }}</div>
              <div v-if="appointment.patient" class="text-body-2">
                <div v-if="appointment.patient.contact_number">📞 {{ appointment.patient.contact_number }}</div>
                <div v-if="appointment.patient.email">✉️ {{ appointment.patient.email }}</div>
              </div>
            </v-col>
            <v-col cols="12">
              <div class="text-caption text-medium-emphasis">Appointment Type</div>
              <div class="text-body-1 mb-4">
                {{ appointment.appointment_type?.type_name || appointment.type_name || 'Unknown' }}
                <span v-if="appointment.duration_minutes" class="text-body-2 text-medium-emphasis">
                  ({{ appointment.duration_minutes }} mins)
                </span>
              </div>
            </v-col>
            <v-col cols="12" v-if="appointment.notes">
              <div class="text-caption text-medium-emphasis">Notes</div>
              <div class="text-body-1">{{ appointment.notes }}</div>
            </v-col>
            <v-col cols="12">
              <div class="text-caption text-medium-emphasis">Created</div>
              <div class="text-body-2 text-medium-emphasis">
                {{ formatDateTime(appointment.created_at) }}
              </div>
            </v-col>
          </v-row>

          <!-- Lab Results Section -->
          <v-divider class="my-4" />
          <div class="text-h6 mb-2">Lab Results</div>
          <div v-if="appointment.lab_results?.length > 0">
            <v-chip
              v-for="lab in appointment.lab_results"
              :key="lab.id"
              size="small"
              class="mr-2 mb-2"
            >
              {{ lab.test_type || 'Unknown' }}: {{ lab.result_value || 'N/A' }} {{ lab.result_unit || '' }}
            </v-chip>
          </div>
          <div v-else class="text-body-2 text-medium-emphasis">
            No lab results for this appointment
          </div>

          <!-- Prescriptions Section -->
          <v-divider class="my-4" />
          <div class="text-h6 mb-2">Prescriptions</div>
          <div v-if="appointment.prescriptions?.length > 0">
            <v-list density="compact">
              <v-list-item
                v-for="prescription in appointment.prescriptions"
                :key="prescription.id"
              >
                <v-list-item-title>{{ prescription.medication_name || 'Unknown' }}</v-list-item-title>
                <v-list-item-subtitle>{{ prescription.dosage_instructions || 'No instructions' }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </div>
          <div v-else class="text-body-2 text-medium-emphasis">
            No prescriptions for this appointment
          </div>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn-group>
          <v-btn 
            v-if="isScheduledOrConfirmed"
            color="primary" 
            variant="outlined"
            @click="emit('update-status', 'CONFIRMED')"
            :loading="updatingStatus"
          >
            Confirm
          </v-btn>
          <v-btn 
            v-if="isScheduledOrConfirmed"
            color="success" 
            variant="outlined"
            @click="emit('update-status', 'IN_PROGRESS')"
            :loading="updatingStatus"
          >
            Start
          </v-btn>
          <v-btn 
            v-if="appointment?.status === 'IN_PROGRESS'"
            color="success" 
            variant="outlined"
            @click="emit('update-status', 'COMPLETED')"
            :loading="updatingStatus"
          >
            Complete
          </v-btn>
          <v-btn 
            v-if="isScheduledOrConfirmed"
            color="error" 
            variant="outlined"
            @click="emit('cancel')"
            :loading="cancelling"
          >
            Cancel
          </v-btn>
          <v-btn 
            color="primary" 
            @click="emit('close')"
          >
            Close
          </v-btn>
        </v-btn-group>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: Boolean,
  appointment: Object,
  loading: Boolean,
  updatingStatus: Boolean,
  cancelling: Boolean
})

const emit = defineEmits([
  'update:modelValue',
  'update-status',
  'cancel',
  'close'
])

const isScheduledOrConfirmed = computed(() => {
  const status = props.appointment?.status
  return status === 'SCHEDULED' || status === 'CONFIRMED'
})

const getStatusColor = (status) => {
  const colors = {
    'SCHEDULED': 'info',
    'CONFIRMED': 'success',
    'IN_PROGRESS': 'warning',
    'COMPLETED': 'success',
    'CANCELLED': 'error',
    'NO_SHOW': 'grey'
  }
  return colors[status] || 'grey'
}

const getQueueStatusColor = (status) => {
  const colors = {
    'WAITING': 'grey',
    'CALLED': 'warning',
    'SERVING': 'success',
    'COMPLETED': 'info',
    'SKIPPED': 'error'
  }
  return colors[status] || 'grey'
}

const getPatientName = (appointment) => {
  if (!appointment) return 'Unknown'
  
  if (appointment.patient_name) return appointment.patient_name
  if (appointment.patient?.full_name) return appointment.patient.full_name
  if (appointment.patient?.first_name || appointment.patient?.last_name) {
    return `${appointment.patient.last_name || ''}${appointment.patient.last_name && appointment.patient.first_name ? ', ' : ''}${appointment.patient.first_name || ''}`.trim()
  }
  
  return `Patient ${appointment.patient_id || 'Unknown'}`
}

const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A'
  try {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return 'Invalid Date'
  }
}
</script>