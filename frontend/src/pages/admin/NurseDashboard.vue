<!-- frontend/src/pages/admin/NurseDashboard.vue -->
<template>
  <v-container fluid class="pa-4 pa-md-6">
    <!-- Welcome Header with Nurse Info -->
    <v-row class="mb-6 align-center">
      <v-col cols="12" md="8">
        <div class="d-flex align-center">
          <v-avatar color="primary" size="48" class="mr-3">
            <span class="text-h5 font-weight-bold text-white">
              {{ nurseInitials }}
            </span>
          </v-avatar>
          <div>
            <h1 class="text-h4 font-weight-medium mb-1">
              Welcome, {{ nurseName || 'Nurse' }}
            </h1>
            <p class="text-subtitle-1 text-medium-emphasis">
              {{ nursePosition }} • {{ currentFacility || 'OMPH HIV Clinic' }}
            </p>
          </div>
        </div>
      </v-col>
      <v-col cols="12" md="4" class="text-md-right">
        <v-chip
          color="primary"
          variant="flat"
          size="large"
          prepend-icon="mdi-calendar"
          class="mr-2"
        >
          {{ currentDate }}
        </v-chip>
        <v-chip
          color="secondary"
          variant="flat"
          size="large"
          prepend-icon="mdi-clock-outline"
        >
          {{ currentTime }}
        </v-chip>
      </v-col>
    </v-row>

    <!-- Loading State -->
    <v-row v-if="loading">
      <v-col v-for="n in 6" :key="n" cols="12" md="6" lg="4">
        <v-skeleton-loader type="card-avatar, article, actions" class="rounded-lg"></v-skeleton-loader>
      </v-col>
    </v-row>

    <!-- Error State -->
    <v-row v-else-if="error">
      <v-col cols="12">
        <v-alert
          color="error"
          variant="tonal"
          icon="mdi-alert-circle"
          class="mb-4"
        >
          {{ error }}
          <template v-slot:append>
            <v-btn color="error" variant="text" @click="fetchDashboardData">
              <v-icon left>mdi-refresh</v-icon> Retry
            </v-btn>
          </template>
        </v-alert>
      </v-col>
    </v-row>

    <template v-else-if="dashboardData">
      <!-- Queue Management Section -->
      <v-row class="mb-6">
        <v-col cols="12">
          <v-card>
            <v-card-item>
              <template v-slot:prepend>
                <v-avatar color="primary" variant="tonal" size="40">
                  <v-icon color="primary">mdi-format-list-group</v-icon>
                </v-avatar>
              </template>
              <v-card-title class="text-h6">Queue Management</v-card-title>
              <v-card-subtitle>Manage today's patient queue</v-card-subtitle>
              
              <template v-slot:append>
                <v-btn
                  color="success"
                  variant="flat"
                  prepend-icon="mdi-plus"
                  size="small"
                  @click="openAddToQueueDialog"
                >
                  Add to Queue
                </v-btn>
              </template>
            </v-card-item>

            <v-card-text>
              <!-- Queue Summary Cards -->
              <v-row class="mb-4">
                <v-col cols="6" sm="3" v-for="stat in queueSummary" :key="stat.label">
                  <v-card
                    :color="stat.color"
                    variant="tonal"
                    class="pa-3 text-center"
                  >
                    <div class="text-h5 font-weight-bold">{{ stat.value }}</div>
                    <div class="text-caption">{{ stat.label }}</div>
                  </v-card>
                </v-col>
              </v-row>

              <!-- Queue List -->
              <v-data-table
                :headers="queueHeaders"
                :items="currentQueue"
                :loading="loading"
                items-per-page="5"
                class="elevation-0"
              >
                <template v-slot:item.queue_number="{ item }">
                  <v-chip
                    :color="getQueueStatusColor(item.status)"
                    size="small"
                    variant="flat"
                    class="font-weight-bold"
                  >
                    #{{ item.queue_number }}
                  </v-chip>
                </template>

                <template v-slot:item.patient_name="{ item }">
                  <div class="font-weight-medium">{{ item.patient_name }}</div>
                  <div class="text-caption text-medium-emphasis">{{ item.patient_facility_code }}</div>
                </template>

                <template v-slot:item.appointment_type="{ item }">
                  <v-chip size="x-small" variant="flat">
                    {{ item.appointment_type }}
                  </v-chip>
                </template>

                <template v-slot:item.waiting_minutes="{ item }">
                  <div :class="getWaitTimeClass(item.waiting_minutes)">
                    <v-icon
                      size="small"
                      :color="getWaitTimeColor(item.waiting_minutes)"
                      class="mr-1"
                    >
                      mdi-clock-outline
                    </v-icon>
                    {{ formatWaitingTime(item.waiting_minutes) }}
                  </div>
                </template>

                <template v-slot:item.status="{ item }">
                  <v-chip
                    :color="getQueueStatusColor(item.status)"
                    size="x-small"
                    variant="flat"
                  >
                    {{ item.status }}
                  </v-chip>
                </template>

                <template v-slot:item.actions="{ item }">
                  <div class="d-flex gap-2">
                    <v-btn
                      v-if="item.status === 'WAITING'"
                      color="info"
                      variant="text"
                      size="small"
                      icon
                      @click="callPatient(item)"
                      title="Call Patient"
                    >
                      <v-icon>mdi-bell-ring</v-icon>
                    </v-btn>
                    
                    <v-btn
                      v-if="item.status === 'CALLED'"
                      color="warning"
                      variant="text"
                      size="small"
                      icon
                      @click="startServing(item)"
                      title="Start Serving"
                    >
                      <v-icon>mdi-play</v-icon>
                    </v-btn>
                    
                    <v-btn
                      v-if="item.status === 'SERVING'"
                      color="success"
                      variant="text"
                      size="small"
                      icon
                      @click="completeServing(item)"
                      title="Complete"
                    >
                      <v-icon>mdi-check</v-icon>
                    </v-btn>
                    
                    <v-btn
                      color="primary"
                      variant="text"
                      size="small"
                      icon
                      @click="viewPatientDetails(item)"
                      title="View Details"
                    >
                      <v-icon>mdi-eye</v-icon>
                    </v-btn>
                    
                    <v-btn
                      v-if="item.status !== 'COMPLETED'"
                      color="error"
                      variant="text"
                      size="small"
                      icon
                      @click="skipPatient(item)"
                      title="Skip"
                    >
                      <v-icon>mdi-skip-next</v-icon>
                    </v-btn>
                  </div>
                </template>

                <template v-slot:no-data>
                  <div class="text-center pa-8">
                    <v-icon size="64" color="grey-lighten-1">mdi-format-list-group</v-icon>
                    <div class="text-h6 mt-4 text-medium-emphasis">Queue is empty</div>
                    <div class="text-caption text-medium-emphasis mb-4">
                      No patients in queue at the moment
                    </div>
                    <v-btn
                      color="primary"
                      variant="flat"
                      prepend-icon="mdi-plus"
                      @click="openAddToQueueDialog"
                    >
                      Add Patient to Queue
                    </v-btn>
                  </div>
                </template>
              </v-data-table>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Today's Appointments and Pending Labs -->
      <v-row class="mb-6">
        <!-- Today's Appointments -->
        <v-col cols="12" lg="8">
          <v-card>
            <v-card-item>
              <template v-slot:prepend>
                <v-avatar color="secondary" variant="tonal" size="40">
                  <v-icon color="secondary">mdi-calendar-check</v-icon>
                </v-avatar>
              </template>
              <v-card-title class="text-h6">Today's Appointments</v-card-title>
              <v-card-subtitle>{{ formatDate(new Date()) }}</v-card-subtitle>
              
              <template v-slot:append>
                <v-btn-toggle v-model="appointmentView" density="compact" divided>
                  <v-btn value="list" size="small">
                    <v-icon>mdi-format-list-bulleted</v-icon>
                  </v-btn>
                  <v-btn value="timeline" size="small">
                    <v-icon>mdi-timeline</v-icon>
                  </v-btn>
                </v-btn-toggle>
              </template>
            </v-card-item>

            <v-card-text>
              <!-- List View -->
              <v-data-table
                v-if="appointmentView === 'list'"
                :headers="appointmentHeaders"
                :items="todayAppointments"
                :loading="loading"
                items-per-page="5"
                class="elevation-0"
              >
                <template v-slot:item.patient_name="{ item }">
                  <div class="font-weight-medium">{{ item.patient_name }}</div>
                  <div class="text-caption text-medium-emphasis">
                    {{ item.patient_facility_code }} • {{ calculateAge(item.date_of_birth) }} yrs
                  </div>
                </template>

                <template v-slot:item.hiv_status="{ item }">
                  <v-chip
                    :color="getHivStatusColor(item.hiv_status)"
                    size="x-small"
                    variant="flat"
                  >
                    {{ item.hiv_status }}
                  </v-chip>
                </template>

                <template v-slot:item.scheduled_at="{ item }">
                  {{ formatTime(item.scheduled_at) }}
                </template>

                <template v-slot:item.status="{ item }">
                  <v-chip
                    :color="getAppointmentStatusColor(item.status)"
                    size="x-small"
                    variant="flat"
                  >
                    {{ item.status }}
                  </v-chip>
                  <v-chip
                    v-if="item.queue_status"
                    :color="getQueueStatusColor(item.queue_status)"
                    size="x-small"
                    variant="flat"
                    class="ml-1"
                  >
                    Queue: {{ item.queue_status }}
                  </v-chip>
                </template>

                <template v-slot:item.actions="{ item }">
                  <v-btn
                    color="primary"
                    variant="text"
                    size="small"
                    icon
                    @click="viewAppointment(item)"
                  >
                    <v-icon>mdi-eye</v-icon>
                  </v-btn>
                  <v-btn
                    v-if="!item.queue_number && ['SCHEDULED', 'CONFIRMED'].includes(item.status)"
                    color="success"
                    variant="text"
                    size="small"
                    icon
                    @click="addToQueue(item)"
                    title="Add to Queue"
                  >
                    <v-icon>mdi-format-list-group-plus</v-icon>
                  </v-btn>
                </template>
              </v-data-table>

              <!-- Timeline View -->
              <v-timeline
                v-else
                density="compact"
                align="start"
                side="end"
              >
                <v-timeline-item
                  v-for="appointment in todayAppointments"
                  :key="appointment.id"
                  :dot-color="getAppointmentStatusColor(appointment.status)"
                  size="small"
                >
                  <div class="d-flex flex-column mb-2">
                    <div class="d-flex align-center">
                      <span class="font-weight-medium">{{ appointment.patient_name }}</span>
                      <v-chip
                        :color="getAppointmentStatusColor(appointment.status)"
                        size="x-small"
                        variant="flat"
                        class="ml-2"
                      >
                        {{ appointment.status }}
                      </v-chip>
                    </div>
                    <div class="text-caption">
                      <v-icon size="small" class="mr-1">mdi-clock-outline</v-icon>
                      {{ formatTime(appointment.scheduled_at) }}
                      <v-icon size="small" class="ml-2 mr-1">mdi-file-document</v-icon>
                      {{ appointment.appointment_type }}
                    </div>
                    <div class="text-caption text-medium-emphasis mt-1">
                      {{ appointment.notes || 'No notes' }}
                    </div>
                  </div>
                </v-timeline-item>
              </v-timeline>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Pending Lab Results -->
        <v-col cols="12" lg="4">
          <v-card class="h-100">
            <v-card-item>
              <template v-slot:prepend>
                <v-avatar color="warning" variant="tonal" size="40">
                  <v-icon color="warning">mdi-flask</v-icon>
                </v-avatar>
              </template>
              <v-card-title class="text-h6">Pending Lab Results</v-card-title>
              <v-card-subtitle>
                {{ pendingLabs.length }} results awaiting entry
              </v-card-subtitle>
            </v-card-item>

            <v-card-text>
              <v-list lines="two" density="compact">
                <v-list-item
                  v-for="lab in pendingLabs"
                  :key="lab.id"
                  @click="enterLabResult(lab)"
                  class="mb-2 rounded-lg cursor-pointer"
                >
                  <template v-slot:prepend>
                    <v-avatar color="warning" size="36" variant="tonal">
                      <v-icon color="warning">mdi-flask</v-icon>
                    </v-avatar>
                  </template>
                  
                  <v-list-item-title class="font-weight-medium">
                    {{ lab.patient_name }}
                  </v-list-item-title>
                  
                  <v-list-item-subtitle>
                    <span>{{ lab.test_type }}</span>
                    <span class="mx-1">•</span>
                    <span>{{ formatDateShort(lab.test_date) }}</span>
                  </v-list-item-subtitle>

                  <template v-slot:append>
                    <v-btn
                      color="primary"
                      variant="text"
                      size="small"
                      icon
                      @click.stop="enterLabResult(lab)"
                    >
                      <v-icon>mdi-pencil</v-icon>
                    </v-btn>
                  </template>
                </v-list-item>

                <v-list-item v-if="pendingLabs.length === 0">
                  <v-list-item-title class="text-center text-medium-emphasis py-4">
                    <v-icon size="48" color="success">mdi-check-circle</v-icon>
                    <div class="mt-2">No pending lab results</div>
                  </v-list-item-title>
                </v-list-item>
              </v-list>
            </v-card-text>

            <v-card-actions>
              <v-btn
                color="primary"
                variant="text"
                block
                @click="viewAllLabs"
              >
                View All Lab Results
                <v-icon end>mdi-arrow-right</v-icon>
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>

      <!-- Recent Encounters and Quick Actions -->
      <v-row>
        <!-- Recent Encounters -->
        <v-col cols="12" lg="8">
          <v-card>
            <v-card-item>
              <template v-slot:prepend>
                <v-avatar color="info" variant="tonal" size="40">
                  <v-icon color="info">mdi-stethoscope</v-icon>
                </v-avatar>
              </template>
              <v-card-title class="text-h6">Recent Encounters</v-card-title>
              <v-card-subtitle>Your recent patient interactions</v-card-subtitle>
            </v-card-item>

            <v-card-text>
              <v-data-table
                :headers="encounterHeaders"
                :items="recentEncounters"
                :loading="loading"
                items-per-page="5"
                class="elevation-0"
              >
                <template v-slot:item.patient_name="{ item }">
                  <div class="font-weight-medium">{{ item.patient_name }}</div>
                  <div class="text-caption text-medium-emphasis">{{ item.patient_facility_code }}</div>
                </template>

                <template v-slot:item.type="{ item }">
                  <v-chip
                    :color="getEncounterTypeColor(item.type)"
                    size="x-small"
                    variant="flat"
                  >
                    {{ item.type }}
                  </v-chip>
                </template>

                <template v-slot:item.encounter_date="{ item }">
                  {{ formatDateTime(item.encounter_date) }}
                </template>

                <template v-slot:item.notes="{ item }">
                  <div class="text-truncate" style="max-width: 200px">
                    {{ item.notes || 'No notes' }}
                  </div>
                </template>

                <template v-slot:item.actions="{ item }">
                  <v-btn
                    color="primary"
                    variant="text"
                    size="small"
                    icon
                    @click="viewEncounter(item)"
                  >
                    <v-icon>mdi-eye</v-icon>
                  </v-btn>
                </template>
              </v-data-table>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Quick Actions & Stats -->
        <v-col cols="12" lg="4">
          <v-row>
            <!-- Quick Actions -->
            <v-col cols="12">
              <v-card>
                <v-card-item>
                  <template v-slot:prepend>
                    <v-avatar color="success" variant="tonal" size="40">
                      <v-icon color="success">mdi-lightning-bolt</v-icon>
                    </v-avatar>
                  </template>
                  <v-card-title class="text-h6">Quick Actions</v-card-title>
                </v-card-item>

                <v-card-text>
                  <v-row>
                    <v-col cols="6" v-for="action in nurseQuickActions" :key="action.title">
                      <v-card
                        :color="action.color"
                        variant="tonal"
                        class="pa-3 text-center cursor-pointer"
                        @click="handleQuickAction(action)"
                      >
                        <v-icon size="32" :color="action.color" class="mb-2">
                          {{ action.icon }}
                        </v-icon>
                        <div class="text-caption font-weight-medium">{{ action.title }}</div>
                      </v-card>
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>
            </v-col>

            <!-- Today's Stats -->
            <v-col cols="12">
              <v-card>
                <v-card-item>
                  <template v-slot:prepend>
                    <v-avatar color="accent" variant="tonal" size="40">
                      <v-icon color="accent">mdi-chart-box</v-icon>
                    </v-avatar>
                  </template>
                  <v-card-title class="text-h6">Today's Stats</v-card-title>
                </v-card-item>

                <v-card-text>
                  <v-list lines="one" density="compact">
                    <v-list-item>
                      <template v-slot:prepend>
                        <v-icon color="primary">mdi-calendar-check</v-icon>
                      </template>
                      <v-list-item-title>Appointments</v-list-item-title>
                      <template v-slot:append>
                        <span class="font-weight-bold">{{ todayAppointments.length }}</span>
                      </template>
                    </v-list-item>

                    <v-list-item>
                      <template v-slot:prepend>
                        <v-icon color="warning">mdi-format-list-group</v-icon>
                      </template>
                      <v-list-item-title>Patients Served</v-list-item-title>
                      <template v-slot:append>
                        <span class="font-weight-bold">{{ patientsServedToday }}</span>
                      </template>
                    </v-list-item>

                    <v-list-item>
                      <template v-slot:prepend>
                        <v-icon color="success">mdi-clock-outline</v-icon>
                      </template>
                      <v-list-item-title>Avg. Wait Time</v-list-item-title>
                      <template v-slot:append>
                        <span class="font-weight-bold">{{ averageWaitTime }}</span>
                      </template>
                    </v-list-item>

                    <v-list-item>
                      <template v-slot:prepend>
                        <v-icon color="info">mdi-flask</v-icon>
                      </template>
                      <v-list-item-title>Labs Pending</v-list-item-title>
                      <template v-slot:append>
                        <span class="font-weight-bold">{{ pendingLabs.length }}</span>
                      </template>
                    </v-list-item>
                  </v-list>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-col>
      </v-row>
    </template>

    <!-- Add to Queue Dialog -->
    <v-dialog v-model="showAddToQueueDialog" max-width="600px">
      <v-card>
        <v-card-title class="text-h5 pa-4">
          <v-icon color="primary" class="mr-2">mdi-format-list-group-plus</v-icon>
          Add Patient to Queue
        </v-card-title>

        <v-card-text>
          <v-select
            v-model="selectedAppointment"
            :items="availableAppointments"
            item-title="patient_name"
            item-value="id"
            label="Select Appointment"
            :return-object="true"
            variant="outlined"
            class="mb-3"
          >
            <template v-slot:item="{ props, item }">
              <v-list-item v-bind="props">
                <template v-slot:title>
                  {{ item.raw.patient_name }}
                </template>
                <template v-slot:subtitle>
                  {{ formatTime(item.raw.scheduled_at) }} • {{ item.raw.appointment_type }}
                </template>
              </v-list-item>
            </template>
          </v-select>

          <v-select
            v-model="priority"
            :items="priorityOptions"
            label="Priority"
            variant="outlined"
            class="mb-3"
          ></v-select>

          <v-textarea
            v-model="queueNotes"
            label="Notes (optional)"
            variant="outlined"
            rows="2"
          ></v-textarea>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="error" variant="text" @click="showAddToQueueDialog = false">
            Cancel
          </v-btn>
          <v-btn
            color="success"
            variant="flat"
            :loading="addingToQueue"
            @click="confirmAddToQueue"
          >
            Add to Queue
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Call Patient Dialog -->
    <v-dialog v-model="showCallDialog" max-width="400px">
      <v-card>
        <v-card-title class="text-h5 pa-4">
          <v-icon color="info" class="mr-2">mdi-bell-ring</v-icon>
          Call Patient
        </v-card-title>

        <v-card-text>
          <p class="text-body-1 mb-2">Calling patient:</p>
          <div class="d-flex align-center mb-4">
            <v-avatar color="primary" size="48" class="mr-3">
              <span class="text-h6 text-white">
                {{ selectedPatient?.patient_name?.charAt(0) || 'P' }}
              </span>
            </v-avatar>
            <div>
              <div class="text-h6">{{ selectedPatient?.patient_name }}</div>
              <div class="text-caption">Queue #{{ selectedPatient?.queue_number }}</div>
            </div>
          </div>

          <v-select
            v-model="callMethod"
            :items="['Public Announcement', 'SMS', 'Both']"
            label="Call Method"
            variant="outlined"
          ></v-select>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="error" variant="text" @click="showCallDialog = false">
            Cancel
          </v-btn>
          <v-btn
            color="info"
            variant="flat"
            @click="confirmCallPatient"
          >
            Call Now
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Enter Lab Result Dialog -->
    <v-dialog v-model="showLabDialog" max-width="500px">
      <v-card>
        <v-card-title class="text-h5 pa-4">
          <v-icon color="warning" class="mr-2">mdi-flask</v-icon>
          Enter Lab Result
        </v-card-title>

        <v-card-text>
          <div class="mb-4">
            <div class="text-subtitle-2">Patient</div>
            <div class="text-h6">{{ selectedLab?.patient_name }}</div>
            <div class="text-caption">Test: {{ selectedLab?.test_type }}</div>
          </div>

          <v-text-field
            v-model="labResultValue"
            label="Result Value"
            variant="outlined"
            class="mb-3"
          ></v-text-field>

          <v-text-field
            v-model="labResultUnit"
            label="Unit"
            variant="outlined"
            class="mb-3"
          ></v-text-field>

          <v-text-field
            v-model="labReferenceRange"
            label="Reference Range"
            variant="outlined"
            class="mb-3"
          ></v-text-field>

          <v-textarea
            v-model="labInterpretation"
            label="Interpretation"
            variant="outlined"
            rows="3"
          ></v-textarea>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="error" variant="text" @click="showLabDialog = false">
            Cancel
          </v-btn>
          <v-btn
            color="success"
            variant="flat"
            :loading="savingLabResult"
            @click="saveLabResult"
          >
            Save Result
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Refresh Button -->
    <v-btn
      color="primary"
      variant="flat"
      fab
      fixed
      bottom
      right
      class="mb-4 mr-4"
      @click="fetchDashboardData"
      :loading="loading"
    >
      <v-icon>mdi-refresh</v-icon>
    </v-btn>
  </v-container>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRouter } from 'vue-router'
import { format } from 'date-fns'
import { dashboardApi, queueApi, labResultsApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'vue-toastification'

// Router and stores
const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

// Refs
const loading = ref(true)
const error = ref(null)
const nurseName = ref('')
const nurseInitials = ref('')
const nursePosition = ref('')
const currentFacility = ref('OMPH HIV Clinic')
const currentTime = ref('')
const currentDate = ref('')
const dashboardData = ref(null)
const appointmentView = ref('list')

// Dialog controls
const showAddToQueueDialog = ref(false)
const showCallDialog = ref(false)
const showLabDialog = ref(false)
const addingToQueue = ref(false)
const savingLabResult = ref(false)

// Form data
const selectedAppointment = ref(null)
const priority = ref(0)
const queueNotes = ref('')
const selectedPatient = ref(null)
const callMethod = ref('Public Announcement')
const selectedLab = ref(null)
const labResultValue = ref('')
const labResultUnit = ref('')
const labReferenceRange = ref('')
const labInterpretation = ref('')

// Priority options
const priorityOptions = [
  { title: 'Normal', value: 0 },
  { title: 'High', value: 1 },
  { title: 'Emergency', value: 2 }
]

// Table headers
const queueHeaders = [
  { title: 'Queue #', key: 'queue_number', width: '100' },
  { title: 'Patient', key: 'patient_name' },
  { title: 'Type', key: 'appointment_type', width: '120' },
  { title: 'Wait Time', key: 'waiting_minutes', width: '120' },
  { title: 'Status', key: 'status', width: '100' },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' }
]

const appointmentHeaders = [
  { title: 'Patient', key: 'patient_name' },
  { title: 'HIV Status', key: 'hiv_status', width: '120' },
  { title: 'Type', key: 'appointment_type', width: '120' },
  { title: 'Time', key: 'scheduled_at', width: '100' },
  { title: 'Status', key: 'status', width: '150' },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' }
]

const encounterHeaders = [
  { title: 'Patient', key: 'patient_name' },
  { title: 'Type', key: 'type', width: '120' },
  { title: 'Date/Time', key: 'encounter_date', width: '150' },
  { title: 'Notes', key: 'notes' },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end', width: '80' }
]

const nurseQuickActions = [
  { title: 'New Encounter', icon: 'mdi-stethoscope', color: 'primary', route: '/encounters/new' },
  { title: 'Add to Queue', icon: 'mdi-format-list-group-plus', color: 'secondary', action: 'openAddToQueue' },
  { title: 'Enter Lab', icon: 'mdi-flask', color: 'warning', route: '/lab-results/new' },
  { title: 'View Schedule', icon: 'mdi-calendar', color: 'success', route: '/schedule' }
]

// Computed properties from dashboard data
const nurseInfo = computed(() => {
  return dashboardData.value?.nurse || {}
})

const currentQueue = computed(() => {
  return dashboardData.value?.current_queue || []
})

const todayAppointments = computed(() => {
  return dashboardData.value?.today_appointments || []
})

const pendingLabs = computed(() => {
  return dashboardData.value?.pending_lab_results || []
})

const recentEncounters = computed(() => {
  return dashboardData.value?.recent_encounters || []
})

const queueSummary = computed(() => {
  const summary = dashboardData.value?.queue_summary || {}
  return [
    { label: 'Waiting', value: summary.waiting || 0, color: 'warning' },
    { label: 'Called', value: summary.called || 0, color: 'info' },
    { label: 'Serving', value: summary.serving || 0, color: 'success' },
    { label: 'Total', value: summary.total || 0, color: 'primary' }
  ]
})

const availableAppointments = computed(() => {
  if (!todayAppointments.value) return []
  return todayAppointments.value.filter(a => 
    ['SCHEDULED', 'CONFIRMED'].includes(a.status) && !a.queue_number
  )
})

const patientsServedToday = computed(() => {
  if (!todayAppointments.value) return 0
  return todayAppointments.value.filter(a => a.status === 'COMPLETED').length
})

const averageWaitTime = computed(() => {
  // Calculate from current queue or default
  if (!currentQueue.value || currentQueue.value.length === 0) return '0 min'
  
  const waitTimes = currentQueue.value
    .filter(q => q.waiting_minutes > 0)
    .map(q => q.waiting_minutes)
  
  if (waitTimes.length === 0) return '0 min'
  
  const avgMinutes = Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length)
  return formatWaitingTime(avgMinutes)
})

let timeInterval = null

// Methods
const fetchDashboardData = async () => {
  loading.value = true
  error.value = null
  
  try {
    const response = await dashboardApi.getNurseDashboard()
    
    // The http.js interceptor returns response.data directly
    // So response should be the actual dashboard data
    console.log('Nurse dashboard data received:', response)
    
    // Check if response has the expected structure
    if (response && response.current_queue !== undefined) {
      dashboardData.value = response
    } else if (response && response.data && response.data.current_queue !== undefined) {
      // Handle nested data structure
      dashboardData.value = response.data
    } else {
      console.warn('Unexpected response structure:', response)
      dashboardData.value = response
    }
    
    // Set nurse info from response
    const nurse = dashboardData.value?.nurse
    if (nurse) {
      nurseName.value = nurse.name || ''
      nursePosition.value = nurse.position || 'Nurse'
      nurseInitials.value = nurseName.value
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2)
    } else if (authStore.user) {
      // Fallback to auth store
      nurseName.value = authStore.user.username || authStore.user.name || 'Nurse'
      nurseInitials.value = nurseName.value.charAt(0).toUpperCase()
    }
  } catch (err) {
    console.error('Failed to fetch dashboard data:', err)
    error.value = err.message || 'Failed to load dashboard data. Please try again.'
    toast.error('Failed to load dashboard data')
  } finally {
    loading.value = false
  }
}

// Queue management methods
const openAddToQueueDialog = () => {
  if (availableAppointments.value.length === 0) {
    toast.warning('No available appointments to add to queue')
    return
  }
  showAddToQueueDialog.value = true
}

const confirmAddToQueue = async () => {
  if (!selectedAppointment.value) {
    toast.warning('Please select an appointment')
    return
  }
  
  addingToQueue.value = true
  try {
    await queueApi.addWalkin({
      appointmentId: selectedAppointment.value.id,
      priority: priority.value,
      notes: queueNotes.value
    })
    
    toast.success('Patient added to queue successfully')
    showAddToQueueDialog.value = false
    selectedAppointment.value = null
    priority.value = 0
    queueNotes.value = ''
    
    // Refresh data
    await fetchDashboardData()
  } catch (err) {
    console.error('Failed to add to queue:', err)
    toast.error(err.message || 'Failed to add patient to queue')
  } finally {
    addingToQueue.value = false
  }
}

const callPatient = (patient) => {
  selectedPatient.value = patient
  showCallDialog.value = true
}

const confirmCallPatient = async () => {
  try {
    await queueApi.callPatient(selectedPatient.value.id)
    toast.success(`Called patient #${selectedPatient.value.queue_number}`)
    showCallDialog.value = false
    await fetchDashboardData()
  } catch (err) {
    console.error('Failed to call patient:', err)
    toast.error(err.message || 'Failed to call patient')
  }
}

const startServing = async (patient) => {
  try {
    await queueApi.startServing(patient.id)
    toast.success(`Now serving patient #${patient.queue_number}`)
    await fetchDashboardData()
  } catch (err) {
    console.error('Failed to start serving:', err)
    toast.error(err.message || 'Failed to start serving')
  }
}

const completeServing = async (patient) => {
  try {
    await queueApi.completeServing(patient.id)
    toast.success(`Completed serving patient #${patient.queue_number}`)
    await fetchDashboardData()
  } catch (err) {
    console.error('Failed to complete serving:', err)
    toast.error(err.message || 'Failed to complete serving')
  }
}

const skipPatient = async (patient) => {
  if (confirm(`Skip patient #${patient.queue_number}?`)) {
    try {
      await queueApi.skipPatient(patient.id)
      toast.info(`Skipped patient #${patient.queue_number}`)
      await fetchDashboardData()
    } catch (err) {
      console.error('Failed to skip patient:', err)
      toast.error(err.message || 'Failed to skip patient')
    }
  }
}

// Lab result methods
const enterLabResult = (lab) => {
  selectedLab.value = lab
  showLabDialog.value = true
}

const saveLabResult = async () => {
  if (!labResultValue.value) {
    toast.warning('Please enter result value')
    return
  }
  
  savingLabResult.value = true
  try {
    await labResultsApi.update(selectedLab.value.id, {
      result_value: labResultValue.value,
      result_unit: labResultUnit.value,
      reference_range: labReferenceRange.value,
      interpretation: labInterpretation.value
    })
    
    toast.success('Lab result saved successfully')
    showLabDialog.value = false
    resetLabForm()
    await fetchDashboardData()
  } catch (err) {
    console.error('Failed to save lab result:', err)
    toast.error(err.message || 'Failed to save lab result')
  } finally {
    savingLabResult.value = false
  }
}

const resetLabForm = () => {
  selectedLab.value = null
  labResultValue.value = ''
  labResultUnit.value = ''
  labReferenceRange.value = ''
  labInterpretation.value = ''
}

// Navigation methods
const viewPatientDetails = (patient) => {
  router.push(`/patients/${patient.appointment_id || patient.id}`)
}

const viewAppointment = (appointment) => {
  router.push(`/appointments/${appointment.id}`)
}

const viewEncounter = (encounter) => {
  router.push(`/encounters/${encounter.id}`)
}

const viewAllLabs = () => {
  router.push('/lab-results')
}

const addToQueue = (appointment) => {
  selectedAppointment.value = appointment
  showAddToQueueDialog.value = true
}

const handleQuickAction = (action) => {
  if (action.action === 'openAddToQueue') {
    openAddToQueueDialog()
  } else if (action.route) {
    router.push(action.route)
  }
}

// Utility methods
const getQueueStatusColor = (status) => {
  const colors = {
    'WAITING': 'warning',
    'CALLED': 'info',
    'SERVING': 'success',
    'COMPLETED': 'success',
    'SKIPPED': 'error'
  }
  return colors[status] || 'grey'
}

const getAppointmentStatusColor = (status) => {
  const colors = {
    'SCHEDULED': 'info',
    'CONFIRMED': 'primary',
    'IN_PROGRESS': 'warning',
    'COMPLETED': 'success',
    'CANCELLED': 'error',
    'NO_SHOW': 'error'
  }
  return colors[status] || 'grey'
}

const getHivStatusColor = (status) => {
  const colors = {
    'REACTIVE': 'warning',
    'NON_REACTIVE': 'success',
    'INDETERMINATE': 'info'
  }
  return colors[status] || 'grey'
}

const getEncounterTypeColor = (type) => {
  const colors = {
    'CONSULTATION': 'primary',
    'TESTING': 'warning',
    'REFILL': 'success',
    'OTHERS': 'info'
  }
  return colors[type] || 'grey'
}

const getWaitTimeClass = (minutes) => {
  if (!minutes) return ''
  if (minutes > 30) return 'text-error'
  if (minutes > 15) return 'text-warning'
  return 'text-success'
}

const getWaitTimeColor = (minutes) => {
  if (!minutes) return 'success'
  if (minutes > 30) return 'error'
  if (minutes > 15) return 'warning'
  return 'success'
}

const formatWaitingTime = (minutes) => {
  if (!minutes) return '0 min'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}m`
}

const formatTime = (datetime) => {
  if (!datetime) return 'N/A'
  return format(new Date(datetime), 'hh:mm a')
}

const formatDateTime = (datetime) => {
  if (!datetime) return 'N/A'
  return format(new Date(datetime), 'MMM d, hh:mm a')
}

const formatDateShort = (date) => {
  if (!date) return 'N/A'
  return format(new Date(date), 'MMM d, yyyy')
}

const formatDate = (date) => {
  return format(date, 'EEEE, MMMM d, yyyy')
}

const calculateAge = (dob) => {
  if (!dob) return 'N/A'
  const today = new Date()
  const birthDate = new Date(dob)
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

// Time update
const updateTime = () => {
  const now = new Date()
  currentTime.value = format(now, 'hh:mm:ss a')
  currentDate.value = format(now, 'EEEE, MMMM d, yyyy')
}

// Lifecycle hooks
onMounted(() => {
  fetchDashboardData()
  updateTime()
  timeInterval = setInterval(updateTime, 1000)
})

onBeforeUnmount(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
})
</script>

<style scoped>
.v-card {
  transition: all var(--transition-normal);
}

.v-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg) !important;
}

.cursor-pointer {
  cursor: pointer;
}

.gap-2 {
  gap: 8px;
}

.text-success {
  color: var(--color-success) !important;
}

.text-warning {
  color: var(--color-warning) !important;
}

.text-error {
  color: var(--color-error) !important;
}

/* Queue list styling */
.v-data-table :deep(.v-data-table__tr) {
  transition: background-color var(--transition-fast);
}

.v-data-table :deep(.v-data-table__tr:hover) {
  background-color: rgba(var(--color-primary-rgb), 0.05);
}

/* Custom scrollbar */
.v-list::-webkit-scrollbar {
  width: 6px;
}

.v-list::-webkit-scrollbar-track {
  background: var(--color-surface-dark);
  border-radius: var(--radius-full);
}

.v-list::-webkit-scrollbar-thumb {
  background: var(--color-primary-light);
  border-radius: var(--radius-full);
}

.v-list::-webkit-scrollbar-thumb:hover {
  background: var(--color-primary);
}
</style>