<!-- frontend/src/pages/admin/QueueManagement.vue -->
<template>
  <v-container fluid class="pa-4 pa-md-6 queue-management">
    <!-- Header Section -->
    <div class="d-flex flex-wrap justify-space-between align-center mb-4">
      <div class="d-flex align-center">
        <div>
          <h1 class="text-h5 text-md-h4 font-weight-bold text-primary">
            Queue Management
          </h1>
          <p class="text-body-2 text-medium-emphasis mt-1">
            Manage patient queue and service flow
          </p>
        </div>
      </div>

      <div class="d-flex gap-2 mt-2 mt-sm-0">
        <v-btn variant="outlined" size="small" prepend-icon="mdi-refresh" @click="refreshData" :loading="loading">
          Refresh
        </v-btn>
        <v-btn color="primary" size="small" prepend-icon="mdi-calendar" @click="goToCalendar">
          Calendar
        </v-btn>
      </div>
    </div>

    <!-- Queue Stats -->
    <v-row class="mb-4">
      <v-col cols="6" sm="6" md="3">
        <v-card elevation="0" variant="outlined" class="stat-card" color="warning">
          <v-card-text class="text-center pa-3">
            <v-icon color="warning" size="28" class="mb-1">mdi-clock-outline</v-icon>
            <div class="text-subtitle-2 text-medium-emphasis">Waiting</div>
            <div class="text-h3 font-weight-bold text-warning">
              {{ stats.waiting_count || 0 }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="6" sm="6" md="3">
        <v-card elevation="0" variant="outlined" class="stat-card" color="info">
          <v-card-text class="text-center pa-3">
            <v-icon color="info" size="28" class="mb-1">mdi-phone</v-icon>
            <div class="text-subtitle-2 text-medium-emphasis">Called</div>
            <div class="text-h3 font-weight-bold text-info">
              {{ stats.called_count || 0 }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="6" sm="6" md="3">
        <v-card elevation="0" variant="outlined" class="stat-card">
          <v-card-text class="text-center pa-3">
            <v-icon color="purple" size="28" class="mb-1">mdi-account-check</v-icon>
            <div class="text-subtitle-2 text-medium-emphasis">In Service</div>
            <div class="text-h3 font-weight-bold text-purple">
              {{ stats.serving_count || 0 }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="6" sm="6" md="3">
        <v-card elevation="0" variant="outlined" class="stat-card" color="success">
          <v-card-text class="text-center pa-3">
            <v-icon color="success" size="28" class="mb-1">mdi-timer</v-icon>
            <div class="text-subtitle-2 text-medium-emphasis">Est. Wait Time</div>
            <div class="text-h5 font-weight-bold text-success">
              {{ estimatedWaitTime }} min
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Add Walk-in Patient Card -->
    <v-row class="mb-4">
      <v-col cols="12">
        <v-card elevation="0" variant="outlined">
          <v-card-text class="d-flex align-center justify-space-between pa-4">
            <div class="d-flex align-center">
              <v-icon color="primary" class="mr-3">mdi-walk</v-icon>
              <div>
                <div class="text-subtitle-1 font-weight-medium">Add Walk-in Patient</div>
                <div class="text-caption text-medium-emphasis">
                  Register and queue a patient without prior appointment
                </div>
              </div>
            </div>
            <v-btn color="primary" size="small" prepend-icon="mdi-plus" @click="openWalkinDialog">
              Add Walk-in
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Now Serving Banner -->
    <v-row v-if="nowServing" class="mb-4">
      <v-col cols="12">
        <v-card class="now-serving-card" elevation="0" color="primary">
          <v-card-text class="d-flex flex-wrap align-center justify-space-between pa-4">
            <div class="d-flex align-center">
              <v-icon size="48" color="white" class="mr-4">mdi-account-check</v-icon>
              <div>
                <div class="text-h6 text-white">Now Serving</div>
                <div class="text-h3 font-weight-bold text-white">{{ nowServing.queue_number }}</div>
                <div class="text-h6 text-white">{{ nowServing.patient_first_name }} {{ nowServing.patient_last_name }} - {{ nowServing.type_name }}</div>
              </div>
            </div>
            <v-btn color="success" size="small" class="mt-2 mt-sm-0" prepend-icon="mdi-check"
              @click="completeServing(nowServing)" :loading="actionLoading === nowServing.id">
              Complete Service
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Search and Filters Card -->
    <v-card elevation="0" variant="outlined" class="mb-4">
      <v-card-text class="pa-3">
        <div class="d-flex flex-wrap align-center ga-3">
          <div style="min-width: 200px; flex: 1;">
            <v-text-field v-model="search" density="compact" variant="outlined" placeholder="Search patients..."
              prepend-inner-icon="mdi-magnify" hide-details clearable @update:model-value="handleSearch"
              class="compact-field" />
          </div>

          <div class="d-flex align-center ga-1" style="flex-wrap: nowrap;">
            <span class="text-caption text-medium-emphasis mr-1">Priority:</span>
            <v-btn-toggle v-model="filters.priority" mandatory="false" density="compact" color="primary"
              variant="outlined" @update:model-value="handleFilterChange">
              <v-btn value="priority" size="small">
                <v-icon start size="14">mdi-alert</v-icon> Priority
              </v-btn>
              <v-btn value="regular" size="small">
                <v-icon start size="14">mdi-check</v-icon> Regular
              </v-btn>
            </v-btn-toggle>
          </div>

          <div class="d-flex align-center ga-1" style="flex-wrap: nowrap;">
            <span class="text-caption text-medium-emphasis mr-1">Type:</span>
            <v-btn-toggle v-model="filters.is_walkin" mandatory="false" density="compact" color="primary"
              variant="outlined" @update:model-value="handleFilterChange">
              <v-btn :value="true" size="small">
                <v-icon start size="14">mdi-walk</v-icon> Walk-in
              </v-btn>
              <v-btn :value="false" size="small">
                <v-icon start size="14">mdi-calendar</v-icon> Scheduled
              </v-btn>
            </v-btn-toggle>
          </div>

          <div style="min-width: 120px;">
            <v-select v-model="sortBy" density="compact" variant="outlined" :items="sortFields" placeholder="Sort"
              hide-details @update:model-value="handleSortChange" class="compact-field" />
          </div>

          <v-btn variant="outlined" density="compact" size="small"
            :icon="sortOrder === 'asc' ? 'mdi-sort-ascending' : 'mdi-sort-descending'" @click="toggleSortOrder" />

          <v-btn variant="text" color="primary" size="small" prepend-icon="mdi-filter-remove" @click="clearFilters"
            :disabled="!hasActiveFilters">
            Clear
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- Main Queue Display -->
    <v-row>
      <!-- Waiting Queue -->
      <v-col cols="12" md="4">
        <v-card elevation="0" variant="outlined" class="queue-column">
          <v-card-title class="d-flex align-center py-3 px-4 bg-warning-lighten-5">
            <v-icon color="warning" class="mr-2">mdi-clock-outline</v-icon>
            <span class="text-subtitle-1 font-weight-medium">Waiting</span>
            <v-chip size="x-small" color="warning" class="ml-2">{{ filteredWaiting.length }}</v-chip>
            <v-spacer />
            <v-btn v-if="filteredWaiting.length > 0 && !nowServing" color="success" size="x-small"
              prepend-icon="mdi-phone" @click="callNextPatient" :loading="actionLoading === 'next'">
              Call Next
            </v-btn>
          </v-card-title>

          <v-divider />

          <v-card-text class="pa-0 queue-list-container">
            <v-list class="queue-list" lines="two" bg-color="transparent">
              <v-list-item v-for="(patient, index) in filteredWaiting" :key="patient.id"
                :class="{ 'priority-high': patient.priority > 0 }" @click="(e) => openPatientActions(e, patient)">
                <template v-slot:prepend>
                  <v-avatar :color="getPriorityColor(patient.priority)" size="36" class="mr-2">
                    <span class="text-subtitle-2 font-weight-bold text-white">{{ patient.queue_number }}</span>
                  </v-avatar>
                </template>

                <v-list-item-title class="font-weight-medium text-body-2">
                  {{ patient.patient_first_name }} {{ patient.patient_last_name }}
                </v-list-item-title>

                <v-list-item-subtitle class="text-caption">
                  <div class="d-flex align-center flex-wrap">
                    <v-icon size="12" class="mr-1">mdi-calendar</v-icon>
                    {{ formatTime(patient.scheduled_at) }}
                    <v-chip size="x-small" class="ml-1">{{ patient.type_name }}</v-chip>
                    <v-chip v-if="patient.is_walkin" size="x-small" color="success" class="ml-1">
                      Walk-in
                    </v-chip>
                  </div>
                  <div v-if="patient.priority > 0" class="text-error d-flex align-center mt-1">
                    <v-icon size="12">mdi-alert</v-icon>
                    <span class="ml-1">Priority Patient</span>
                  </div>
                </v-list-item-subtitle>

                <template v-slot:append>
                  <div class="d-flex flex-column align-end">
                    <div class="text-caption text-medium-emphasis mb-1">
                      Est: {{ (index + 1) * 15 }} min
                    </div>
                    <div class="d-flex">
                      <v-btn icon="mdi-phone" size="x-small" color="info" class="mr-1" 
                        @click.stop="callPatient(patient)" :disabled="!!nowServing" 
                        :loading="actionLoading === patient.id" />
                      <v-btn icon="mdi-skip-next" size="x-small" color="warning" 
                        @click.stop="showSkipDialog(patient)" />
                    </div>
                  </div>
                </template>
              </v-list-item>

              <v-list-item v-if="!filteredWaiting.length" class="text-center py-8">
                <v-icon size="48" color="grey-lighten-2" class="mb-2">mdi-account-off</v-icon>
                <div class="text-body-2 text-grey">No patients waiting</div>
                <div v-if="hasActiveFilters" class="text-caption text-grey mt-1">
                  Try adjusting your filters
                </div>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Called Queue -->
      <v-col cols="12" md="4">
        <v-card elevation="0" variant="outlined" class="queue-column">
          <v-card-title class="d-flex align-center py-3 px-4 bg-info-lighten-5">
            <v-icon color="info" class="mr-2">mdi-phone</v-icon>
            <span class="text-subtitle-1 font-weight-medium">Called</span>
            <v-chip size="x-small" color="info" class="ml-2">{{ filteredCalled.length }}</v-chip>
          </v-card-title>

          <v-divider />

          <v-card-text class="pa-0 queue-list-container">
            <v-list class="queue-list" lines="two" bg-color="transparent">
              <v-list-item v-for="patient in filteredCalled" :key="patient.id" 
                @click="(e) => openPatientActions(e, patient)">
                <template v-slot:prepend>
                  <v-avatar color="info" size="36" class="mr-2">
                    <span class="text-subtitle-2 font-weight-bold text-white">{{ patient.queue_number }}</span>
                  </v-avatar>
                </template>

                <v-list-item-title class="font-weight-medium text-body-2">
                  {{ patient.patient_first_name }} {{ patient.patient_last_name }}
                </v-list-item-title>

                <v-list-item-subtitle class="text-caption">
                  <v-icon size="12" class="mr-1">mdi-clock</v-icon>
                  Called: {{ formatTime(patient.called_at) }}
                </v-list-item-subtitle>

                <template v-slot:append>
                  <div class="d-flex">
                    <v-btn icon="mdi-play" size="x-small" color="success" class="mr-1"
                      @click.stop="startServing(patient)" :loading="actionLoading === patient.id" />
                    <v-btn icon="mdi-skip-next" size="x-small" color="warning" 
                      @click.stop="showSkipDialog(patient)" />
                  </div>
                </template>
              </v-list-item>

              <v-list-item v-if="!filteredCalled.length" class="text-center py-8">
                <v-icon size="48" color="grey-lighten-2" class="mb-2">mdi-phone-off</v-icon>
                <div class="text-body-2 text-grey">No patients called</div>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Serving Queue -->
      <v-col cols="12" md="4">
        <v-card elevation="0" variant="outlined" class="queue-column">
          <v-card-title class="d-flex align-center py-3 px-4 bg-purple-lighten-5">
            <v-icon color="purple" class="mr-2">mdi-account-check</v-icon>
            <span class="text-subtitle-1 font-weight-medium">In Service</span>
            <v-chip size="x-small" color="purple" class="ml-2">{{ filteredServing.length }}</v-chip>
          </v-card-title>

          <v-divider />

          <v-card-text class="pa-0 queue-list-container">
            <v-list class="queue-list" lines="two" bg-color="transparent">
              <v-list-item v-for="patient in filteredServing" :key="patient.id"
                @click="(e) => openPatientActions(e, patient)">
                <template v-slot:prepend>
                  <v-avatar color="purple" size="36" class="mr-2">
                    <span class="text-subtitle-2 font-weight-bold text-white">{{ patient.queue_number }}</span>
                  </v-avatar>
                </template>

                <v-list-item-title class="font-weight-medium text-body-2">
                  {{ patient.patient_first_name }} {{ patient.patient_last_name }}
                </v-list-item-title>

                <v-list-item-subtitle class="text-caption">
                  <div>
                    <v-icon size="12" class="mr-1">mdi-clock-start</v-icon>
                    Started: {{ formatTime(patient.served_at) }}
                  </div>
                  <div v-if="patient.served_at" class="text-caption text-medium-emphasis">
                    Elapsed: {{ getElapsedTime(patient.served_at) }}
                  </div>
                </v-list-item-subtitle>

                <template v-slot:append>
                  <v-btn icon="mdi-check" size="x-small" color="success" 
                    @click.stop="completeServing(patient)" :loading="actionLoading === patient.id" />
                </template>
              </v-list-item>

              <v-list-item v-if="!filteredServing.length" class="text-center py-8">
                <v-icon size="48" color="grey-lighten-2" class="mb-2">mdi-account-off</v-icon>
                <div class="text-body-2 text-grey">No patients in service</div>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- History Section -->
    <v-row class="mt-6">
      <v-col cols="12">
        <v-card elevation="0" variant="outlined">
          <v-card-title class="d-flex align-center py-3 px-4">
            <v-icon color="primary" class="mr-2">mdi-history</v-icon>
            <span class="text-subtitle-1 font-weight-medium">Today's Queue History</span>
            <v-spacer />
            <v-btn color="error" variant="text" size="small" prepend-icon="mdi-delete-sweep"
              @click="showResetDialog" :disabled="!hasQueueEntries">
              Reset Queue
            </v-btn>
          </v-card-title>

          <v-divider />

          <v-card-text class="pa-0">
            <v-table density="compact" class="queue-history-table">
              <thead>
                <tr>
                  <th class="text-caption font-weight-bold">Queue #</th>
                  <th class="text-caption font-weight-bold">Patient</th>
                  <th class="text-caption font-weight-bold">Type</th>
                  <th class="text-caption font-weight-bold">Called</th>
                  <th class="text-caption font-weight-bold">Served</th>
                  <th class="text-caption font-weight-bold">Completed</th>
                  <th class="text-caption font-weight-bold">Status</th>
                  <th class="text-caption font-weight-bold">Wait Time</th>
                  <th class="text-caption font-weight-bold">Service Time</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="entry in history" :key="entry.id">
                  <td class="text-body-2 font-weight-medium">#{{ entry.queue_number }}</td>
                  <td class="text-body-2">{{ entry.patient_first_name }} {{ entry.patient_last_name }}</td>
                  <td class="text-body-2">{{ entry.type_name }}</td>
                  <td class="text-caption">{{ entry.called_at ? formatShortTime(entry.called_at) : '-' }}</td>
                  <td class="text-caption">{{ entry.served_at ? formatShortTime(entry.served_at) : '-' }}</td>
                  <td class="text-caption">{{ entry.completed_at ? formatShortTime(entry.completed_at) : '-' }}</td>
                  <td>
                    <v-chip :color="getHistoryStatusColor(entry.status)" size="x-small">
                      {{ entry.status }}
                    </v-chip>
                  </td>
                  <td class="text-body-2">{{ entry.wait_duration || 0 }} min</td>
                  <td class="text-body-2">{{ entry.service_duration || 0 }} min</td>
                </tr>
                <tr v-if="!history.length">
                  <td colspan="9" class="text-center py-4 text-grey text-body-2">
                    No queue history for today
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Walk-in Dialog -->
    <v-dialog v-model="walkinDialog" max-width="500px" persistent>
      <v-card class="edit-dialog">
        <v-card-title class="text-subtitle-1 font-weight-bold pa-3 bg-primary-lighten-5">
          <v-icon color="primary" size="small" class="mr-2">mdi-walk</v-icon>
          Add Walk-in Patient
        </v-card-title>

        <v-card-text class="pa-3">
          <v-form ref="walkinForm" v-model="walkinFormValid">
            <v-autocomplete v-model="walkinData.patient" :items="patients"
              :item-title="(item) => `${item.last_name}, ${item.first_name} (${item.patient_facility_code})`"
              :item-value="(item) => item" label="Search Patient" color="primary" 
              :rules="[v => !!v || 'Patient is required']" prepend-inner-icon="mdi-account" 
              :loading="searchingPatients" @update:search="searchPatients" return-object required clearable 
              variant="outlined" density="compact" class="mb-3" hide-details="auto">
              <template v-slot:item="{ props, item }">
                <v-list-item v-bind="props" :title="`${item.raw.last_name}, ${item.raw.first_name}`"
                  :subtitle="`${item.raw.patient_facility_code} | ${item.raw.hiv_status}`" density="compact" />
              </template>
            </v-autocomplete>

            <v-select v-model="walkinData.appointment_type_id" :items="appointmentTypes" item-title="type_name"
              item-value="id" label="Service Type" color="primary" :rules="[v => !!v || 'Service type is required']"
              prepend-inner-icon="mdi-clipboard-text" required variant="outlined" density="compact" class="mb-3"
              hide-details="auto" />

            <v-textarea v-model="walkinData.notes" label="Notes" color="primary" prepend-inner-icon="mdi-note-text"
              rows="2" variant="outlined" density="compact" hide-details="auto" />
          </v-form>
        </v-card-text>

        <v-card-actions class="pa-3 pt-0">
          <v-spacer />
          <v-btn variant="text" color="grey-darken-1" @click="closeWalkinDialog" :disabled="walkinLoading" size="small">
            Cancel
          </v-btn>
          <v-btn color="primary" variant="elevated" @click="addWalkinPatient" :loading="walkinLoading"
            prepend-icon="mdi-plus" size="small">
            Add to Queue
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Skip Dialog -->
    <v-dialog v-model="skipDialog" max-width="360px" persistent>
      <v-card class="delete-dialog">
        <v-card-title class="text-subtitle-1 font-weight-bold pa-3 bg-warning-lighten-5">
          <v-icon color="warning" size="small" class="mr-2">mdi-skip-next</v-icon>
          Skip Patient
        </v-card-title>

        <v-card-text class="pa-3">
          <p class="text-body-2 mb-2">
            Are you sure you want to skip
            <span class="font-weight-bold">{{ skipPatient?.patient_first_name }} {{ skipPatient?.patient_last_name }}</span>?
          </p>
          <v-textarea v-model="skipReason" label="Reason for skipping (optional)" rows="2" variant="outlined"
            density="compact" hide-details="auto" />
        </v-card-text>

        <v-card-actions class="pa-3 pt-0">
          <v-spacer />
          <v-btn variant="text" color="grey-darken-1" @click="skipDialog = false" :disabled="actionLoading" size="small">
            Cancel
          </v-btn>
          <v-btn color="warning" variant="elevated" @click="skipPatientConfirm" :loading="actionLoading"
            prepend-icon="mdi-skip-next" size="small">
            Skip Patient
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Reset Queue Dialog -->
    <v-dialog v-model="resetDialog" max-width="360px" persistent>
      <v-card class="delete-dialog">
        <v-card-title class="text-subtitle-1 font-weight-bold pa-3 bg-error-lighten-5">
          <v-icon color="error" size="small" class="mr-2">mdi-delete-sweep</v-icon>
          Reset Queue
        </v-card-title>

        <v-card-text class="pa-3">
          <p class="text-body-2 mb-2 font-weight-bold text-error">Warning: This action cannot be undone!</p>
          <p class="text-body-2">Are you sure you want to reset today's queue? All active queue entries will be removed.</p>
        </v-card-text>

        <v-card-actions class="pa-3 pt-0">
          <v-spacer />
          <v-btn variant="text" color="grey-darken-1" @click="resetDialog = false" :disabled="actionLoading" size="small">
            Cancel
          </v-btn>
          <v-btn color="error" variant="elevated" @click="resetQueue" :loading="actionLoading"
            prepend-icon="mdi-delete-sweep" size="small">
            Reset Queue
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Patient Actions Menu -->
    <v-menu v-model="patientMenu.show" :position-x="patientMenu.x" :position-y="patientMenu.y" absolute offset-y>
      <v-list density="compact" class="patient-actions-menu">
        <v-list-item v-if="patientMenu.patient?.status === 'WAITING'" @click="callPatient(patientMenu.patient)">
          <template v-slot:prepend>
            <v-icon color="info" size="small">mdi-phone</v-icon>
          </template>
          <v-list-item-title class="text-body-2">Call Patient</v-list-item-title>
        </v-list-item>

        <v-list-item v-if="patientMenu.patient?.status === 'CALLED'" @click="startServing(patientMenu.patient)">
          <template v-slot:prepend>
            <v-icon color="success" size="small">mdi-play</v-icon>
          </template>
          <v-list-item-title class="text-body-2">Start Serving</v-list-item-title>
        </v-list-item>

        <v-list-item v-if="patientMenu.patient?.status === 'SERVING'" @click="completeServing(patientMenu.patient)">
          <template v-slot:prepend>
            <v-icon color="success" size="small">mdi-check</v-icon>
          </template>
          <v-list-item-title class="text-body-2">Complete Service</v-list-item-title>
        </v-list-item>

        <v-divider />

        <v-list-item @click="showSkipDialog(patientMenu.patient)">
          <template v-slot:prepend>
            <v-icon color="warning" size="small">mdi-skip-next</v-icon>
          </template>
          <v-list-item-title class="text-body-2">Skip Patient</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>

    <!-- Toast Notifications -->
    <div class="toast-container">
      <transition-group name="toast">
        <div v-for="toast in toasts" :key="toast.id" class="toast" :class="`toast-${toast.type}`"
          @click="removeToast(toast.id)">
          <div class="toast-content">
            <v-icon :icon="toast.icon" size="20" class="mr-2" />
            <span>{{ toast.message }}</span>
          </div>
          <div class="toast-progress" :style="{ animationDuration: `${toast.duration}ms` }" />
        </div>
      </transition-group>
    </div>
  </v-container>
</template>

<script>
import { ref, reactive, computed, onMounted, onUnmounted, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import { format, parseISO, formatDistanceToNow } from 'date-fns'
import { queueApi, appointmentsApi, patientsApi } from '@/api'
import debounce from 'lodash/debounce'

export default {
  name: 'QueueManagement',

  setup() {
    const router = useRouter()

    // Toast System
    const toasts = ref([])
    let toastId = 0

    const showToast = (message, type = 'success', duration = 3000) => {
      const id = toastId++
      const icon = {
        success: 'mdi-check-circle',
        error: 'mdi-alert-circle',
        warning: 'mdi-alert',
        info: 'mdi-information'
      }[type] || 'mdi-information'

      toasts.value.push({ id, message, type, icon, duration })
      setTimeout(() => removeToast(id), duration)
    }

    const removeToast = (id) => {
      const index = toasts.value.findIndex(t => t.id === id)
      if (index !== -1) toasts.value.splice(index, 1)
    }

    // State Management
    const loading = ref(false)
    const actionLoading = ref(null)
    const queue = shallowRef({ waiting: [], called: [], serving: [] })
    const nowServing = shallowRef(null)
    const stats = shallowRef({ waiting_count: 0, called_count: 0, serving_count: 0 })
    const history = shallowRef([])
    
    // UI State
    const search = ref('')
    const sortBy = ref('queue_number_asc')
    const sortOrder = ref('asc')
    const filters = ref({ priority: null, is_walkin: null })
    
    // Dialog State
    const skipDialog = ref(false)
    const resetDialog = ref(false)
    const skipPatient = ref(null)
    const skipReason = ref('')
    const walkinDialog = ref(false)
    const walkinFormValid = ref(false)
    const walkinForm = ref(null)
    const walkinLoading = ref(false)
    
    // Data
    const appointmentTypes = ref([])
    const patients = ref([])
    const searchingPatients = ref(false)
    const walkinData = reactive({ patient: null, appointment_type_id: null, notes: '' })
    
    // Patient Menu
    const patientMenu = reactive({ show: false, x: 0, y: 0, patient: null })

    // Cache Management
    let lastQueueFetch = 0
    let lastHistoryFetch = 0
    let cachedFilteredData = new Map()
    const QUEUE_CACHE_DURATION = 8000
    const HISTORY_CACHE_DURATION = 60000

    // Sort Fields
    const sortFields = [
      { title: 'Queue Number (Asc)', value: 'queue_number_asc' },
      { title: 'Queue Number (Desc)', value: 'queue_number_desc' },
      { title: 'Scheduled Time (Earliest)', value: 'scheduled_at_asc' },
      { title: 'Scheduled Time (Latest)', value: 'scheduled_at_desc' }
    ]

    // Computed Properties with Caching
    const filteredWaiting = computed(() => {
      const currentQueue = queue.value.waiting || []
      if (!currentQueue.length) return []
      
      const cacheKey = `${search.value}|${filters.value.priority}|${filters.value.is_walkin}|${sortBy.value}|${currentQueue.length}`
      
      if (cachedFilteredData.has(cacheKey)) {
        return cachedFilteredData.get(cacheKey)
      }
      
      let filtered = [...currentQueue]

      if (search.value) {
        const term = search.value.toLowerCase()
        filtered = filtered.filter(item =>
          `${item.patient_first_name} ${item.patient_last_name}`.toLowerCase().includes(term) ||
          item.queue_number?.toString().includes(term)
        )
      }

      if (filters.value.priority === 'priority') {
        filtered = filtered.filter(item => item.priority > 0)
      } else if (filters.value.priority === 'regular') {
        filtered = filtered.filter(item => !item.priority || item.priority === 0)
      }

      if (filters.value.is_walkin !== null) {
        filtered = filtered.filter(item => item.is_walkin === filters.value.is_walkin)
      }

      const [sortField, sortDir] = sortBy.value.split('_')
      const multiplier = sortDir === 'asc' ? 1 : -1
      
      if (sortField === 'queue_number') {
        filtered.sort((a, b) => (a.queue_number - b.queue_number) * multiplier)
      } else if (sortField === 'scheduled_at') {
        filtered.sort((a, b) => {
          const aTime = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0
          const bTime = b.scheduled_at ? new Date(b.scheduled_at).getTime() : 0
          return (aTime - bTime) * multiplier
        })
      }
      
      if (cachedFilteredData.size > 50) {
        const firstKey = cachedFilteredData.keys().next().value
        cachedFilteredData.delete(firstKey)
      }
      
      cachedFilteredData.set(cacheKey, filtered)
      return filtered
    })

    const filteredCalled = computed(() => {
      const called = queue.value.called || []
      if (!called.length || !search.value) return called
      
      const term = search.value.toLowerCase()
      return called.filter(item =>
        `${item.patient_first_name} ${item.patient_last_name}`.toLowerCase().includes(term) ||
        item.queue_number?.toString().includes(term)
      )
    })

    const filteredServing = computed(() => {
      const serving = queue.value.serving || []
      if (!serving.length || !search.value) return serving
      
      const term = search.value.toLowerCase()
      return serving.filter(item =>
        `${item.patient_first_name} ${item.patient_last_name}`.toLowerCase().includes(term) ||
        item.queue_number?.toString().includes(term)
      )
    })

    const estimatedWaitTime = computed(() => (filteredWaiting.value?.length || 0) * 15)
    const hasQueueEntries = computed(() => filteredWaiting.value.length + filteredCalled.value.length + filteredServing.value.length > 0)
    const hasActiveFilters = computed(() => !!(search.value || filters.value.priority || filters.value.is_walkin !== null))

    // Data Fetching Methods
    const fetchQueueData = async (forceRefresh = false) => {
      const now = Date.now()
      
      if (!forceRefresh && lastQueueFetch && (now - lastQueueFetch) < QUEUE_CACHE_DURATION) {
        return
      }
      
      loading.value = true
      try {
        const response = await queueApi.getCurrent()
        
        let queueData = {}
        
        if (response.data?.success) {
          queueData = response.data.data || {}
        } else if (response.data) {
          queueData = response.data
        } else {
          queueData = response
        }
        
        queue.value = {
          waiting: queueData.waiting || [],
          called: queueData.called || [],
          serving: queueData.serving || []
        }
        nowServing.value = queueData.now_serving || null
        stats.value = queueData.stats || { waiting_count: 0, called_count: 0, serving_count: 0 }
        
        lastQueueFetch = now
        
        const shouldFetchHistory = !lastHistoryFetch || (now - lastHistoryFetch) > HISTORY_CACHE_DURATION
        if (shouldFetchHistory) {
          await fetchQueueHistory()
        }
      } catch (error) {
        console.error('Error fetching queue data:', error)
        showToast('Failed to load queue data', 'error')
      } finally {
        loading.value = false
      }
    }

    const fetchQueueHistory = async () => {
      try {
        const today = format(new Date(), 'yyyy-MM-dd')
        const response = await queueApi.getHistory({
          start_date: today,
          end_date: today,
          limit: 20,
          page: 1
        })

        if (response.data?.success) {
          const historyData = response.data.data?.data || response.data?.data || []
          history.value = historyData
        } else if (response.data?.data) {
          history.value = response.data.data
        } else if (Array.isArray(response.data)) {
          history.value = response.data
        } else {
          history.value = []
        }
        
        lastHistoryFetch = Date.now()
      } catch (error) {
        console.error('Error fetching queue history:', error)
        history.value = []
      }
    }

    const fetchAppointmentTypes = async () => {
      try {
        const response = await appointmentsApi.getTypes()
        appointmentTypes.value = response.data?.success ? response.data.data : (response.data || [])
      } catch (error) {
        console.error('Error fetching appointment types:', error)
      }
    }

    // Queue Actions
    const callPatient = async (patient) => {
      actionLoading.value = patient.id
      
      const waitingIndex = queue.value.waiting.findIndex(w => w.id === patient.id)
      if (waitingIndex !== -1) {
        const [movedPatient] = queue.value.waiting.splice(waitingIndex, 1)
        movedPatient.status = 'CALLED'
        movedPatient.called_at = new Date().toISOString()
        queue.value.called.unshift(movedPatient)
        cachedFilteredData.clear()
      }
      
      try {
        await queueApi.callPatient(patient.id)
        showToast(`Patient #${patient.queue_number} called`, 'success')
        await fetchQueueData(true)
        patientMenu.show = false
      } catch (error) {
        console.error('Error calling patient:', error)
        showToast(error.response?.data?.error || 'Failed to call patient', 'error')
        await fetchQueueData(true)
      } finally {
        actionLoading.value = null
      }
    }

    const callNextPatient = async () => {
      actionLoading.value = 'next'
      try {
        await queueApi.callPatient('next')
        showToast('Next patient called successfully', 'success')
        await fetchQueueData(true)
      } catch (error) {
        console.error('Error calling next patient:', error)
        showToast(error.response?.data?.error || 'Failed to call next patient', 'error')
      } finally {
        actionLoading.value = null
      }
    }

    const startServing = async (patient) => {
      actionLoading.value = patient.id
      
      const calledIndex = queue.value.called.findIndex(c => c.id === patient.id)
      if (calledIndex !== -1) {
        const [movedPatient] = queue.value.called.splice(calledIndex, 1)
        movedPatient.status = 'SERVING'
        movedPatient.served_at = new Date().toISOString()
        queue.value.serving.unshift(movedPatient)
        cachedFilteredData.clear()
      }
      
      try {
        await queueApi.startServing(patient.id)
        showToast(`Started serving patient #${patient.queue_number}`, 'success')
        await fetchQueueData(true)
        patientMenu.show = false
      } catch (error) {
        console.error('Error starting service:', error)
        showToast(error.response?.data?.error || 'Failed to start service', 'error')
        await fetchQueueData(true)
      } finally {
        actionLoading.value = null
      }
    }

    const completeServing = async (patient) => {
      actionLoading.value = patient.id
      
      const servingIndex = queue.value.serving.findIndex(s => s.id === patient.id)
      if (servingIndex !== -1) {
        queue.value.serving.splice(servingIndex, 1)
        cachedFilteredData.clear()
      }
      
      try {
        await queueApi.completeServing(patient.id)
        showToast(`Completed service for patient #${patient.queue_number}`, 'success')
        await fetchQueueData(true)
        await fetchQueueHistory()
        patientMenu.show = false
      } catch (error) {
        console.error('Error completing service:', error)
        showToast(error.response?.data?.error || 'Failed to complete service', 'error')
        await fetchQueueData(true)
      } finally {
        actionLoading.value = null
      }
    }

    const addWalkinPatient = async () => {
      if (!walkinForm.value?.validate()) return
      if (!walkinData.patient) {
        showToast('Please select a patient', 'error')
        return
      }

      walkinLoading.value = true
      try {
        const response = await queueApi.addWalkin({
          patient_id: walkinData.patient.id,
          appointment_type_id: parseInt(walkinData.appointment_type_id),
          notes: walkinData.notes
        })

        let success = false
        let queueNumber = null
        
        if (response?.data?.success) {
          success = true
          queueNumber = response.data.data?.queue_number
        } else if (response?.success) {
          success = true
          queueNumber = response.data?.queue_number
        } else if (response?.data?.queue_number) {
          success = true
          queueNumber = response.data.queue_number
        }

        if (success) {
          showToast(`Walk-in patient added to queue as #${queueNumber}`, 'success')
          closeWalkinDialog()
          await fetchQueueData(true)
          cachedFilteredData.clear()
        } else {
          showToast(response?.data?.message || 'Failed to add walk-in patient', 'error')
        }
      } catch (error) {
        console.error('Error adding walk-in:', error)
        const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to add walk-in patient'
        showToast(errorMessage, 'error')
      } finally {
        walkinLoading.value = false
      }
    }

    const skipPatientConfirm = async () => {
      if (!skipPatient.value) return

      actionLoading.value = skipPatient.value.id
      try {
        await queueApi.skipPatient(skipPatient.value.id, { reason: skipReason.value || undefined })
        showToast(`Patient #${skipPatient.value.queue_number} skipped`, 'warning')
        await fetchQueueData(true)
        cachedFilteredData.clear()
        skipDialog.value = false
        skipPatient.value = null
        skipReason.value = ''
      } catch (error) {
        console.error('Error skipping patient:', error)
        showToast(error.response?.data?.error || 'Failed to skip patient', 'error')
      } finally {
        actionLoading.value = null
      }
    }

    const resetQueue = async () => {
      actionLoading.value = 'reset'
      try {
        await queueApi.resetQueue()
        showToast('Queue reset successfully', 'success')
        await fetchQueueData(true)
        cachedFilteredData.clear()
        resetDialog.value = false
      } catch (error) {
        console.error('Error resetting queue:', error)
        showToast(error.response?.data?.error || 'Failed to reset queue', 'error')
      } finally {
        actionLoading.value = null
      }
    }

    // Search and Filter Handlers
    const searchPatients = debounce(async (searchTerm) => {
      if (!searchTerm || searchTerm.length < 2) {
        patients.value = []
        return
      }

      searchingPatients.value = true
      try {
        const response = await patientsApi.search(searchTerm, 10)
        patients.value = response.data || []
      } catch (error) {
        console.error('Error searching patients:', error)
        showToast('Failed to search patients', 'error')
      } finally {
        searchingPatients.value = false
      }
    }, 500)

    const handleSearch = debounce(() => {
      cachedFilteredData.clear()
    }, 300)

    const handleFilterChange = () => {
      cachedFilteredData.clear()
    }

    const handleSortChange = () => {
      const parts = sortBy.value.split('_')
      if (parts.length > 1 && ['asc', 'desc'].includes(parts[parts.length - 1])) {
        sortOrder.value = parts[parts.length - 1]
      }
      cachedFilteredData.clear()
    }

    const toggleSortOrder = () => {
      const newOrder = sortOrder.value === 'asc' ? 'desc' : 'asc'
      sortOrder.value = newOrder
      const baseField = sortBy.value.split('_').slice(0, -1).join('_') || 'queue_number'
      sortBy.value = `${baseField}_${newOrder}`
      cachedFilteredData.clear()
    }

    const clearFilters = () => {
      search.value = ''
      filters.value.priority = null
      filters.value.is_walkin = null
      sortBy.value = 'queue_number_asc'
      sortOrder.value = 'asc'
      cachedFilteredData.clear()
    }

    const refreshData = () => {
      fetchQueueData(true)
    }

    // Dialog Handlers
    const openWalkinDialog = () => { walkinDialog.value = true }
    const closeWalkinDialog = () => {
      walkinDialog.value = false
      walkinData.patient = null
      walkinData.appointment_type_id = null
      walkinData.notes = ''
      walkinForm.value?.reset()
    }

    const showSkipDialog = (patient) => {
      skipPatient.value = patient
      skipReason.value = ''
      skipDialog.value = true
      patientMenu.show = false
    }

    const showResetDialog = () => { resetDialog.value = true }

    const openPatientActions = (event, patient) => {
      patientMenu.show = false
      patientMenu.x = event.clientX
      patientMenu.y = event.clientY
      patientMenu.patient = patient
      setTimeout(() => { patientMenu.show = true }, 50)
    }

    // Navigation
    const goToCalendar = () => router.push('/admin/appointments-calendar')

    // Utility Functions
    const formatTime = (datetime) => datetime ? format(parseISO(datetime), 'h:mm a') : '-'
    const formatShortTime = (datetime) => datetime ? format(parseISO(datetime), 'h:mm a') : '-'
    const getElapsedTime = (startTime) => startTime ? formatDistanceToNow(parseISO(startTime), { addSuffix: false }) : '0 min'
    const getPriorityColor = (priority) => priority > 0 ? 'error' : 'warning'
    const getHistoryStatusColor = (status) => {
      const colors = { 'WAITING': 'warning', 'CALLED': 'info', 'SERVING': 'purple', 'COMPLETED': 'success', 'SKIPPED': 'error' }
      return colors[status] || 'grey'
    }

    // Lifecycle
    let refreshInterval
    let isPageVisible = true

    const handleVisibilityChange = () => {
      isPageVisible = !document.hidden
      if (isPageVisible) fetchQueueData(true)
    }

    watch([() => filters.value.priority, () => filters.value.is_walkin, search], () => {
      cachedFilteredData.clear()
    })

    onMounted(() => {
      fetchQueueData()
      fetchAppointmentTypes()
      refreshInterval = setInterval(() => {
        if (isPageVisible && document.hasFocus()) fetchQueueData(false)
      }, 20000)
      document.addEventListener('visibilitychange', handleVisibilityChange)
    })

    onUnmounted(() => {
      if (refreshInterval) clearInterval(refreshInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      cachedFilteredData.clear()
    })

    return {
      loading, actionLoading, queue, nowServing, stats, history,
      search, sortBy, sortOrder, sortFields, filters,
      skipDialog, resetDialog, skipPatient, skipReason,
      walkinDialog, walkinFormValid, walkinForm, walkinLoading,
      appointmentTypes, patients, searchingPatients, walkinData,
      patientMenu, toasts,
      filteredWaiting, filteredCalled, filteredServing,
      estimatedWaitTime, hasQueueEntries, hasActiveFilters,
      removeToast, refreshData, goToCalendar,
      callPatient, callNextPatient, startServing, completeServing,
      addWalkinPatient, skipPatientConfirm, resetQueue,
      openWalkinDialog, closeWalkinDialog, showSkipDialog, showResetDialog, openPatientActions,
      handleSearch, handleFilterChange, handleSortChange, toggleSortOrder, clearFilters,
      searchPatients, formatTime, formatShortTime, getElapsedTime, getPriorityColor, getHistoryStatusColor
    }
  }
}
</script>

<style scoped>
/* ===== LAYOUT UTILITIES ===== */
.gap-2 {
  gap: 8px;
}

.gap-1 {
  gap: 4px;
}

.ga-3 {
  gap: 16px;
}

/* ===== COMPACT FIELD ===== */
.compact-field :deep(.v-field) {
  font-size: 0.875rem;
}

.compact-field :deep(.v-field__input) {
  min-height: 36px;
  padding-top: 0;
  padding-bottom: 0;
}

/* ===== STAT CARD ===== */
.stat-card {
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
}

/* ===== QUEUE COLUMN ===== */
.queue-column {
  height: calc(100vh - 400px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.queue-list-container {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.queue-list {
  background: transparent;
}

.queue-list :deep(.v-list-item) {
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
  cursor: pointer;
  transition: background-color 0.2s;
  min-height: 72px;
}

.queue-list :deep(.v-list-item:hover) {
  background-color: rgba(0, 0, 0, 0.04);
}

.queue-list :deep(.v-list-item.priority-high) {
  background-color: rgba(176, 0, 32, 0.05);
}

.queue-list :deep(.v-list-item-title) {
  font-size: 0.875rem;
  line-height: 1.4;
  margin-bottom: 2px;
}

.queue-list :deep(.v-list-item-subtitle) {
  font-size: 0.75rem;
  line-height: 1.4;
  opacity: 0.8;
}

:deep(.v-avatar) {
  font-weight: 600;
}

/* ===== NOW SERVING CARD ===== */
.now-serving-card {
  background: linear-gradient(135deg, #2d8a08 0%, #1565C0 100%);
}

/* ===== QUEUE HISTORY TABLE ===== */
.queue-history-table :deep(table) {
  width: 100%;
  border-collapse: collapse;
}

.queue-history-table :deep(th) {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
  background-color: rgba(0, 0, 0, 0.04);
  padding: 8px 16px;
  text-align: left;
  white-space: nowrap;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

.queue-history-table :deep(td) {
  padding: 8px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
  font-size: 0.875rem;
}

.queue-history-table :deep(tr:hover td) {
  background-color: rgba(0, 0, 0, 0.04);
}

/* ===== DIALOGS ===== */
.edit-dialog,
.delete-dialog {
  border-radius: 8px;
  overflow: hidden;
}

/* ===== BACKGROUND LIGHTEN CLASSES ===== */
.bg-primary-lighten-5 {
  background-color: rgba(45, 138, 8, 0.05);
}

.bg-info-lighten-5 {
  background-color: rgba(33, 150, 243, 0.1);
}

.bg-success-lighten-5 {
  background-color: rgba(76, 175, 80, 0.05);
}

.bg-error-lighten-5 {
  background-color: rgba(176, 0, 32, 0.05);
}

.bg-warning-lighten-5 {
  background-color: rgba(255, 193, 7, 0.1);
}

.bg-purple-lighten-5 {
  background-color: rgba(156, 39, 176, 0.1);
}

/* ===== PATIENT ACTIONS MENU ===== */
.patient-actions-menu {
  min-width: 200px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.patient-actions-menu :deep(.v-list-item) {
  min-height: 40px;
  padding: 0 16px;
}

.patient-actions-menu :deep(.v-list-item-title) {
  font-size: 0.875rem;
}

/* ===== TOAST NOTIFICATIONS ===== */
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.toast {
  position: relative;
  min-width: 300px;
  max-width: 400px;
  padding: 12px 16px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  pointer-events: auto;
  overflow: hidden;
  animation: toast-slide-in 0.3s ease;
  border-left: 4px solid;
}

.toast-success {
  border-left-color: #4CAF50;
  background-color: #e8f5e9;
}

.toast-error {
  border-left-color: #B00020;
  background-color: #ffebee;
}

.toast-warning {
  border-left-color: #FB8C00;
  background-color: #fff3e0;
}

.toast-info {
  border-left-color: #2196F3;
  background-color: #e3f2fd;
}

.toast-content {
  display: flex;
  align-items: center;
  color: rgba(0, 0, 0, 0.87);
}

.toast-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background-color: rgba(0, 0, 0, 0.2);
  animation: toast-progress linear forwards;
}

.toast-success .toast-progress {
  background-color: #4CAF50;
}

.toast-error .toast-progress {
  background-color: #B00020;
}

.toast-warning .toast-progress {
  background-color: #FB8C00;
}

.toast-info .toast-progress {
  background-color: #2196F3;
}

@keyframes toast-slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes toast-progress {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

/* ===== RESPONSIVE ===== */
@media (max-width: 960px) {
  .queue-column {
    height: 500px;
    margin-bottom: 16px;
  }
}

@media (max-width: 600px) {
  .now-serving-card .v-card-text {
    flex-direction: column;
    text-align: center;
  }
  
  .now-serving-card .v-icon {
    margin-bottom: 16px;
  }
  
  .toast-container {
    left: 20px;
    right: 20px;
  }
  
  .toast {
    min-width: auto;
    max-width: none;
  }
}
</style>