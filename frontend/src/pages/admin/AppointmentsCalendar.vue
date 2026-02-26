<!-- frontend/src/views/appointments/AppointmentsCalendar.vue -->
<template>
  <v-container fluid class="pa-4 pa-md-6 appointments-calendar">
    <!-- Header Section -->
    <v-row class="mb-4 align-center">
      <v-col cols="12" md="6">
        <div class="d-flex align-center">
          <v-btn icon variant="text" @click="goToToday" class="mr-2" :color="colors.primary">
            <v-icon>mdi-calendar-today</v-icon>
          </v-btn>
          <h1 class="text-h4 font-weight-medium" :style="{ color: colors.primary }">
            Appointments Calendar
          </h1>
        </div>
      </v-col>

      <v-col cols="12" md="6" class="text-md-right">
        <v-btn :color="colors.secondary" prepend-icon="mdi-plus" @click="openCreateDialog" class="mr-2">
          New Appointment
        </v-btn>
        <v-btn :color="colors.accent" variant="outlined" prepend-icon="mdi-view-list" @click="switchToListView">
          List View
        </v-btn>
      </v-col>
    </v-row>

    <!-- Filter Section -->
    <v-row class="mb-4">
      <v-col cols="12" md="4">
        <v-select v-model="filters.appointmentType" :items="appointmentTypes" item-title="type_name" item-value="id"
          label="Filter by Type" clearable :color="colors.primary" @update:model-value="fetchAppointments" />
      </v-col>
      <v-col cols="12" md="4">
        <v-select v-model="filters.status" :items="statusOptions" label="Filter by Status" clearable
          :color="colors.primary" @update:model-value="fetchAppointments" />
      </v-col>
      <v-col cols="12" md="4">
        <v-text-field v-model="filters.search" label="Search Patient" prepend-inner-icon="mdi-magnify" clearable
          :color="colors.primary" @update:model-value="debouncedSearch" />
      </v-col>
    </v-row>

    <!-- Capacity Warning -->
    <v-row v-if="dailyAppointmentCount >= 16" class="mb-4">
      <v-col cols="12">
        <v-alert type="warning" variant="tonal" :color="colors.warning" class="mb-0">
          <div class="d-flex align-center">
            <v-icon class="mr-2">mdi-alert</v-icon>
            <span>
              <strong>Clinic at maximum capacity!</strong>
              Today's appointments ({{ dailyAppointmentCount }}/16) have reached the daily limit.
              No more appointments can be scheduled for today.
            </span>
          </div>
        </v-alert>
      </v-col>
    </v-row>

    <!-- Calendar View Toggle -->
    <v-row class="mb-4">
      <v-col cols="12">
        <v-btn-toggle v-model="calendarView" mandatory border divided :color="colors.primary">
          <v-btn value="day" prepend-icon="mdi-calendar-day">
            Day
          </v-btn>
          <v-btn value="week" prepend-icon="mdi-calendar-week">
            Week
          </v-btn>
          <v-btn value="month" prepend-icon="mdi-calendar-month">
            Month
          </v-btn>
        </v-btn-toggle>
      </v-col>
    </v-row>

    <!-- Main Calendar -->
    <v-card :elevation="4" class="calendar-card" :style="{
      borderRadius: colors.radiusLg,
      border: `1px solid ${colors.border}`
    }">
      <!-- Calendar Toolbar -->
      <v-toolbar :color="colors.surface" flat class="calendar-toolbar"
        :style="{ borderBottom: `1px solid ${colors.border}` }">
        <v-btn icon @click="previousPeriod" :color="colors.primary">
          <v-icon>mdi-chevron-left</v-icon>
        </v-btn>

        <v-toolbar-title class="text-h6 font-weight-medium">
          {{ calendarTitle }}
        </v-toolbar-title>

        <v-btn icon @click="nextPeriod" :color="colors.primary">
          <v-icon>mdi-chevron-right</v-icon>
        </v-btn>

        <v-spacer />

        <v-btn :color="colors.primary" variant="text" @click="goToToday">
          Today
        </v-btn>
      </v-toolbar>

      <!-- Loading State -->
      <v-skeleton-loader v-if="loading" type="table" class="pa-4" />

      <!-- Calendar Grid -->
      <div v-else class="calendar-grid" :class="`view-${calendarView}`">
        <!-- Day View -->
        <template v-if="calendarView === 'day'">
          <div class="day-view">
            <div class="time-slots">
              <div v-for="hour in workingHours" :key="hour" class="time-slot"
                :style="{ borderBottom: `1px solid ${colors.border}` }">
                <div class="time-label" :style="{ color: colors.textSecondary }">
                  {{ formatHour(hour) }}
                </div>
                <div class="slot-appointments">
                  <template v-for="appointment in getAppointmentsForTimeSlot(hour)" :key="appointment.id">
                    <v-hover v-slot="{ isHovering, props }">
                      <v-card v-bind="props" class="appointment-card" :class="{
                        'hover': isHovering,
                        [appointment.status.toLowerCase()]: true
                      }" :style="getAppointmentStyle(appointment)" @click="openAppointmentDetails(appointment)">
                        <div class="appointment-time">
                          {{ formatTime(appointment.scheduled_at) }}
                        </div>
                        <div class="appointment-patient">
                          {{ appointment.patient_first_name }} {{ appointment.patient_last_name }}
                        </div>
                        <div class="appointment-type">
                          <v-chip size="x-small" :color="getTypeColor(appointment.type_name)" text-color="white">
                            {{ appointment.type_name }}
                          </v-chip>
                        </div>
                        <v-chip v-if="appointment.queue_number" size="x-small" :color="colors.accent"
                          class="queue-number">
                          Q{{ appointment.queue_number }}
                        </v-chip>
                      </v-card>
                    </v-hover>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- Week View -->
        <template v-else-if="calendarView === 'week'">
          <div class="week-view">
            <div class="week-header">
              <div class="time-column"></div>
              <div v-for="day in weekDays" :key="day.date" class="day-column"
                :class="{ 'is-today': day.isToday, 'at-capacity': day.appointmentCount >= 16 }"
                @click="selectedDate = day.date">
                <div class="day-name">{{ day.name }}</div>
                <div class="day-number">{{ day.number }}</div>
                <div class="day-count" :style="{ color: getDayCapacityColor(day.appointmentCount) }">
                  {{ day.appointmentCount }}/16
                </div>
                <v-progress-linear v-model="day.capacityPercentage" :color="getDayCapacityColor(day.appointmentCount)"
                  height="4" class="mt-1" />
              </div>
            </div>
            <div class="week-body">
              <div class="time-column">
                <div v-for="hour in workingHours" :key="hour" class="hour-marker"
                  :style="{ color: colors.textSecondary }">
                  {{ formatHour(hour) }}
                </div>
              </div>
              <div v-for="day in weekDays" :key="day.date" class="day-column" :class="{ 'is-today': day.isToday }">
                <div v-for="hour in workingHours" :key="hour" class="hour-slot"
                  :style="{ borderBottom: `1px solid ${colors.border}` }"
                  @click="createAppointmentAtTime(day.date, hour)">
                  <template v-for="appointment in getAppointmentsForDayAndTime(day.date, hour)" :key="appointment.id">
                    <v-hover v-slot="{ isHovering, props }">
                      <v-card v-bind="props" class="appointment-card compact" :class="{
                        'hover': isHovering,
                        [appointment.status.toLowerCase()]: true
                      }" :style="getAppointmentStyle(appointment)" @click.stop="openAppointmentDetails(appointment)">
                        <div class="appointment-patient">
                          {{ getInitials(appointment.patient_first_name, appointment.patient_last_name) }}
                        </div>
                        <v-tooltip activator="parent" location="top">
                          {{ appointment.patient_first_name }} {{ appointment.patient_last_name }} - {{
                            appointment.type_name }}
                        </v-tooltip>
                      </v-card>
                    </v-hover>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- Month View -->
        <template v-else>
          <div class="month-view">
            <div class="month-header">
              <div v-for="day in dayNames" :key="day" class="header-day">
                {{ day }}
              </div>
            </div>
            <div class="month-grid">
              <div v-for="day in calendarDays" :key="day.date" class="month-day" :class="{
                'other-month': !day.isCurrentMonth,
                'is-today': day.isToday,
                'has-appointments': day.hasAppointments,
                'at-capacity': day.appointmentCount >= 16
              }" @click="selectDate(day.date)">
                <div class="day-number">
                  {{ day.number }}
                  <span class="day-count-badge" :style="{ backgroundColor: getDayCapacityColor(day.appointmentCount) }">
                    {{ day.appointmentCount }}
                  </span>
                </div>
                <div class="day-appointments">
                  <v-hover v-for="appointment in getAppointmentsForDay(day.date).slice(0, 2)" :key="appointment.id"
                    v-slot="{ isHovering, props }">
                    <div v-bind="props" class="appointment-indicator" :class="{
                      'hover': isHovering,
                      [appointment.status.toLowerCase()]: true
                    }" @click.stop="openAppointmentDetails(appointment)">
                      <span class="appointment-time">
                        {{ formatShortTime(appointment.scheduled_at) }}
                      </span>
                      <span class="appointment-name">
                        {{ appointment.patient_last_name }}
                      </span>
                    </div>
                  </v-hover>
                  <div v-if="getAppointmentsForDay(day.date).length > 2" class="more-appointments"
                    @click.stop="showDayDetails(day.date)">
                    +{{ getAppointmentsForDay(day.date).length - 2 }} more
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </v-card>

    <!-- Statistics Section -->
    <v-row class="mt-6">
      <v-col cols="12" md="3">
        <v-card :elevation="2" class="stat-card" :style="{ borderLeft: `4px solid ${colors.primary}` }">
          <v-card-text>
            <div class="text-subtitle-2" :style="{ color: colors.textSecondary }">
              Today's Appointments
            </div>
            <div class="text-h4 font-weight-bold" :style="{ color: colors.primary }">
              {{ statistics.total }}/16
            </div>
            <v-progress-linear v-model="dailyCapacityPercentage" :color="dailyCapacityColor" height="8" class="mt-2" />
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="3">
        <v-card :elevation="2" class="stat-card" :style="{ borderLeft: `4px solid ${colors.success}` }">
          <v-card-text>
            <div class="text-subtitle-2" :style="{ color: colors.textSecondary }">
              Completed
            </div>
            <div class="text-h4 font-weight-bold" :style="{ color: colors.success }">
              {{ statistics.completed }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="3">
        <v-card :elevation="2" class="stat-card" :style="{ borderLeft: `4px solid ${colors.warning}` }">
          <v-card-text>
            <div class="text-subtitle-2" :style="{ color: colors.textSecondary }">
              Scheduled
            </div>
            <div class="text-h4 font-weight-bold" :style="{ color: colors.warning }">
              {{ statistics.scheduled }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="3">
        <v-card :elevation="2" class="stat-card" :style="{ borderLeft: `4px solid ${colors.info}` }">
          <v-card-text>
            <div class="text-subtitle-2" :style="{ color: colors.textSecondary }">
              In Progress
            </div>
            <div class="text-h4 font-weight-bold" :style="{ color: colors.info }">
              {{ statistics.inProgress }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Appointment Details Dialog -->
    <v-dialog v-model="detailsDialog" max-width="600px">
      <v-card v-if="selectedAppointment" :style="{ borderRadius: colors.radiusLg }">
        <v-card-title class="d-flex align-center pa-4">
          <v-icon :color="colors.primary" size="24" class="mr-2">
            mdi-calendar-check
          </v-icon>
          <span class="text-h6">Appointment Details</span>
          <v-spacer />
          <v-chip :color="getStatusColor(selectedAppointment.status)" text-color="white" size="small">
            {{ selectedAppointment.status }}
          </v-chip>
          <v-btn icon variant="text" @click="detailsDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <v-divider />

        <v-card-text class="pa-4">
          <v-row>
            <v-col cols="12" class="pb-0">
              <div class="text-subtitle-2 font-weight-bold" :style="{ color: colors.textSecondary }">
                Appointment Number
              </div>
              <div class="text-body-1 mb-3">
                {{ selectedAppointment.appointment_number }}
              </div>
            </v-col>

            <v-col cols="6">
              <div class="text-subtitle-2 font-weight-bold" :style="{ color: colors.textSecondary }">
                Patient
              </div>
              <div class="text-body-1">
                {{ selectedAppointment.patient_first_name }} {{ selectedAppointment.patient_last_name }}
              </div>
              <div class="text-caption" :style="{ color: colors.textSecondary }">
                {{ selectedAppointment.patient_facility_code }}
              </div>
            </v-col>

            <v-col cols="6">
              <div class="text-subtitle-2 font-weight-bold" :style="{ color: colors.textSecondary }">
                Contact
              </div>
              <div class="text-body-1">
                {{ selectedAppointment.patient_contact || 'N/A' }}
              </div>
            </v-col>

            <v-col cols="6">
              <div class="text-subtitle-2 font-weight-bold" :style="{ color: colors.textSecondary }">
                Date & Time
              </div>
              <div class="text-body-1">
                {{ formatFullDate(selectedAppointment.scheduled_at) }}
              </div>
            </v-col>

            <v-col cols="6">
              <div class="text-subtitle-2 font-weight-bold" :style="{ color: colors.textSecondary }">
                Type
              </div>
              <v-chip :color="getTypeColor(selectedAppointment.type_name)" text-color="white" size="small">
                {{ selectedAppointment.type_name }}
              </v-chip>
              <div class="text-caption">
                {{ selectedAppointment.duration_minutes }} minutes
              </div>
            </v-col>

            <v-col cols="12" v-if="selectedAppointment.queue_number">
              <div class="text-subtitle-2 font-weight-bold" :style="{ color: colors.textSecondary }">
                Queue Information
              </div>
              <v-chip :color="colors.accent" text-color="white" size="small" class="mr-2">
                Queue #{{ selectedAppointment.queue_number }}
              </v-chip>
              <v-chip :color="getQueueStatusColor(selectedAppointment.queue_status)" text-color="white" size="small">
                {{ selectedAppointment.queue_status }}
              </v-chip>
            </v-col>

            <v-col cols="12" v-if="selectedAppointment.notes">
              <div class="text-subtitle-2 font-weight-bold" :style="{ color: colors.textSecondary }">
                Notes
              </div>
              <div class="text-body-2 pa-2 rounded" :style="{ background: colors.surfaceDark }">
                {{ selectedAppointment.notes }}
              </div>
            </v-col>
          </v-row>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="detailsDialog = false">
            Close
          </v-btn>
          <v-btn :color="colors.primary" variant="flat" @click="editAppointment">
            Edit
          </v-btn>
          <v-btn v-if="canUpdateStatus" :color="colors.secondary" variant="flat" @click="openStatusDialog">
            Update Status
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Create/Edit Appointment Dialog -->
    <v-dialog v-model="appointmentDialog" max-width="600px">
      <v-card :style="{ borderRadius: colors.radiusLg }">
        <v-card-title class="pa-4">
          <v-icon :color="colors.primary" size="24" class="mr-2">
            {{ editingAppointment ? 'mdi-pencil' : 'mdi-plus-circle' }}
          </v-icon>
          {{ editingAppointment ? 'Edit Appointment' : 'New Appointment' }}
        </v-card-title>

        <v-divider />

        <v-card-text class="pa-4">
          <v-alert v-if="isSelectedDateAtCapacity && !editingAppointment" type="error" variant="tonal" class="mb-4">
            <div class="d-flex align-center">
              <v-icon class="mr-2">mdi-alert-circle</v-icon>
              <span>This date has reached maximum capacity (16/16 appointments). Please select another date.</span>
            </div>
          </v-alert>

          <v-form ref="appointmentForm" v-model="formValid">
            <v-row>
              <v-col cols="12">
                <v-autocomplete
  v-model="formData.patient"
  :items="patients"
  :item-title="(item) => `${item.last_name}, ${item.first_name}${item.middle_name ? ' ' + item.middle_name : ''} (${item.patient_facility_code})`"
  item-value="id"
  label="Select Patient"
  :color="colors.primary"
  :rules="[rules.required]"
  prepend-inner-icon="mdi-account"
  :loading="searchingPatients"
  :search-input.sync="patientSearch"
  @update:search="searchPatients"
  return-object
  required
>
  <template v-slot:item="{ props, item }">
    <v-list-item
      v-bind="props"
      :title="`${item.raw.last_name}, ${item.raw.first_name}`"
      :subtitle="`${item.raw.patient_facility_code} | ${item.raw.hiv_status} | ${item.raw.contact_number || 'No contact'}`"
    />
  </template>
</v-autocomplete>
              </v-col>

              <v-col cols="12" md="6">
                <v-select v-model="formData.appointment_type_id" :items="appointmentTypes" item-title="type_name"
                  item-value="id" label="Appointment Type" :color="colors.primary" :rules="[rules.required]"
                  prepend-inner-icon="mdi-clipboard-text" required @update:model-value="updateDuration" />
              </v-col>

              <v-col cols="12" md="6">
                <v-text-field v-model="formData.duration" label="Duration (minutes)" type="number"
                  :color="colors.primary" readonly disabled prepend-inner-icon="mdi-clock-outline" />
              </v-col>

              <v-col cols="12" md="6">
                <v-text-field v-model="formData.scheduled_date" label="Date" type="date" :color="colors.primary"
                  :rules="[rules.required]" :min="minDate" prepend-inner-icon="mdi-calendar" required
                  @update:model-value="checkAvailability" />
              </v-col>

              <v-col cols="12" md="6">
                <v-select v-model="formData.scheduled_time" :items="availableTimeSlots" item-title="display"
                  item-value="value" label="Time" :color="colors.primary" :rules="[rules.required]"
                  :disabled="!formData.scheduled_date || checkingAvailability || isSelectedDateAtCapacity"
                  :loading="checkingAvailability" prepend-inner-icon="mdi-clock" required />
              </v-col>

              <v-col cols="12">
                <v-textarea v-model="formData.notes" label="Notes" :color="colors.primary"
                  prepend-inner-icon="mdi-note-text" rows="3" />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="closeAppointmentDialog">
            Cancel
          </v-btn>
          <v-btn :color="colors.primary" variant="flat" :loading="saving"
            :disabled="isSelectedDateAtCapacity && !editingAppointment" @click="saveAppointment">
            {{ editingAppointment ? 'Update' : 'Create' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Update Status Dialog -->
    <v-dialog v-model="statusDialog" max-width="400px">
      <v-card :style="{ borderRadius: colors.radiusLg }">
        <v-card-title class="pa-4">
          <v-icon :color="colors.warning" class="mr-2">mdi-status</v-icon>
          Update Appointment Status
        </v-card-title>

        <v-divider />

        <v-card-text class="pa-4">
          <v-select v-model="newStatus" :items="validStatusTransitions" item-title="title" item-value="value"
            label="New Status" :color="colors.primary" prepend-inner-icon="mdi-swap-horizontal">
            <template v-slot:item="{ props, item }">
              <v-list-item v-bind="props" :prepend-icon="getStatusIcon(item.value)" />
            </template>
          </v-select>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="statusDialog = false">
            Cancel
          </v-btn>
          <v-btn :color="colors.primary" variant="flat" :loading="updatingStatus" @click="updateAppointmentStatus">
            Update
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { useAppointmentStore } from '@/stores/appointmentStore'
import { usePatientStore } from '@/stores/patientStore'
import {
  format, addDays, subDays, addWeeks, subWeeks,
  addMonths, subMonths, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, eachDayOfInterval,
  isToday, isSameMonth, parseISO
} from 'date-fns'
import debounce from 'lodash/debounce'
import colors from '@/config/colors'

export default {
  name: 'AppointmentsCalendar',

  setup() {
    const router = useRouter()
    const toast = useToast()
    const appointmentStore = useAppointmentStore()
    const patientStore = usePatientStore()

    // State
    const loading = ref(false)
    const saving = ref(false)
    const updatingStatus = ref(false)
    const checkingAvailability = ref(false)
    const searchingPatients = ref(false)
    const appointments = ref([])
    const appointmentTypes = ref([])
    const patients = ref([])
    const selectedDate = ref(new Date())
    const calendarView = ref('month')
    const detailsDialog = ref(false)
    const appointmentDialog = ref(false)
    const statusDialog = ref(false)
    const editingAppointment = ref(false)
    const selectedAppointment = ref(null)
    const appointmentForm = ref(null)
    const formValid = ref(false)
    const newStatus = ref('')
    const patientSearch = ref('')
    const availableTimeSlots = ref([])

    const filters = reactive({
      appointmentType: null,
      status: null,
      search: ''
    })

    const formData = reactive({
  patient: null, // This will hold the entire patient object
  patient_id: null, // We'll extract the ID from the patient object
  appointment_type_id: null,
  scheduled_date: '',
  scheduled_time: '',
  duration: 30,
  notes: ''
})

    // Constants
    const MAX_DAILY_APPOINTMENTS = 16
    const workingHours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17]
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const statusOptions = [
      { title: 'Scheduled', value: 'SCHEDULED' },
      { title: 'Confirmed', value: 'CONFIRMED' },
      { title: 'In Progress', value: 'IN_PROGRESS' },
      { title: 'Completed', value: 'COMPLETED' },
      { title: 'Cancelled', value: 'CANCELLED' },
      { title: 'No Show', value: 'NO_SHOW' }
    ]
    const rules = {
      required: v => !!v || 'This field is required'
    }
    const minDate = computed(() => {
      return format(new Date(), 'yyyy-MM-dd')
    })

    // Computed
    const calendarTitle = computed(() => {
      if (calendarView.value === 'day') {
        return format(selectedDate.value, 'EEEE, MMMM d, yyyy')
      } else if (calendarView.value === 'week') {
        const start = startOfWeek(selectedDate.value, { weekStartsOn: 0 })
        const end = endOfWeek(selectedDate.value, { weekStartsOn: 0 })
        return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`
      } else {
        return format(selectedDate.value, 'MMMM yyyy')
      }
    })

    const dailyAppointmentCount = computed(() => {
      const today = format(new Date(), 'yyyy-MM-dd')
      return appointments.value.filter(a =>
        format(parseISO(a.scheduled_at), 'yyyy-MM-dd') === today
      ).length
    })

    const dailyCapacityPercentage = computed(() => {
      return (dailyAppointmentCount.value / MAX_DAILY_APPOINTMENTS) * 100
    })

    const dailyCapacityColor = computed(() => {
      if (dailyAppointmentCount.value >= MAX_DAILY_APPOINTMENTS) return colors.error
      if (dailyAppointmentCount.value >= MAX_DAILY_APPOINTMENTS * 0.8) return colors.warning
      return colors.success
    })

    const isSelectedDateAtCapacity = computed(() => {
      if (!formData.scheduled_date) return false
      const count = getAppointmentsCountForDay(formData.scheduled_date)
      return count >= MAX_DAILY_APPOINTMENTS
    })

    const weekDays = computed(() => {
      const start = startOfWeek(selectedDate.value, { weekStartsOn: 0 })
      const end = endOfWeek(selectedDate.value, { weekStartsOn: 0 })
      return eachDayOfInterval({ start, end }).map(date => {
        const dateStr = format(date, 'yyyy-MM-dd')
        const count = getAppointmentsCountForDay(dateStr)
        return {
          date: dateStr,
          name: format(date, 'EEE'),
          number: format(date, 'd'),
          isToday: isToday(date),
          appointmentCount: count,
          capacityPercentage: (count / MAX_DAILY_APPOINTMENTS) * 100
        }
      })
    })

    const calendarDays = computed(() => {
      const start = startOfMonth(selectedDate.value)
      const end = endOfMonth(selectedDate.value)
      const startDate = startOfWeek(start, { weekStartsOn: 0 })
      const endDate = endOfWeek(end, { weekStartsOn: 0 })

      return eachDayOfInterval({ start: startDate, end: endDate }).map(date => ({
        date: format(date, 'yyyy-MM-dd'),
        number: format(date, 'd'),
        isCurrentMonth: isSameMonth(date, selectedDate.value),
        isToday: isToday(date),
        hasAppointments: getAppointmentsForDay(date).length > 0,
        appointmentCount: getAppointmentsForDay(date).length
      }))
    })

    const statistics = computed(() => {
      const today = format(new Date(), 'yyyy-MM-dd')
      const todayAppointments = appointments.value.filter(a =>
        format(parseISO(a.scheduled_at), 'yyyy-MM-dd') === today
      )

      return {
        total: todayAppointments.length,
        completed: todayAppointments.filter(a => a.status === 'COMPLETED').length,
        scheduled: todayAppointments.filter(a => ['SCHEDULED', 'CONFIRMED'].includes(a.status)).length,
        inProgress: todayAppointments.filter(a => a.status === 'IN_PROGRESS').length,
        cancelled: todayAppointments.filter(a => a.status === 'CANCELLED').length,
        noShow: todayAppointments.filter(a => a.status === 'NO_SHOW').length
      }
    })

    const validStatusTransitions = computed(() => {
      if (!selectedAppointment.value) return []

      const transitions = {
        'SCHEDULED': ['CONFIRMED', 'CANCELLED'],
        'CONFIRMED': ['IN_PROGRESS', 'CANCELLED', 'NO_SHOW'],
        'IN_PROGRESS': ['COMPLETED', 'CANCELLED'],
        'COMPLETED': [],
        'CANCELLED': [],
        'NO_SHOW': []
      }

      const allowed = transitions[selectedAppointment.value.status] || []
      return statusOptions.filter(opt => allowed.includes(opt.value))
    })

    const canUpdateStatus = computed(() => {
      return selectedAppointment.value &&
        !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(selectedAppointment.value.status)
    })

    // Methods
    const fetchAppointmentTypes = async () => {
      try {
        const response = await appointmentStore.fetchTypes()
        appointmentTypes.value = response || []
      } catch (error) {
        console.error('Error fetching appointment types:', error)
        toast.error('Failed to load appointment types')
      }
    }

    const fetchAppointments = async () => {
      loading.value = true
      try {
        const params = {
          start_date: format(startOfMonth(selectedDate.value), 'yyyy-MM-dd'),
          end_date: format(endOfMonth(selectedDate.value), 'yyyy-MM-dd')
        }

        if (filters.appointmentType) params.type_id = filters.appointmentType
        if (filters.status) params.status = filters.status
        if (filters.search) params.search = filters.search

        const response = await appointmentStore.fetchAppointments(params)
        appointments.value = response || []
      } catch (error) {
        console.error('Error fetching appointments:', error)
        toast.error('Failed to load appointments')
      } finally {
        loading.value = false
      }
    }

    const searchPatients = debounce(async (search) => {
      if (!search || search.length < 3) {
        patients.value = []
        return
      }

      searchingPatients.value = true
      try {
        const response = await patientStore.searchPatients(search)
        // The backend returns the patients array directly
        patients.value = response || []
        console.log('Patients found:', patients.value)
      } catch (error) {
        console.error('Error searching patients:', error)
        toast.error('Failed to search patients')
      } finally {
        searchingPatients.value = false
      }
    }, 500)

    const checkAvailability = async () => {
      if (!formData.scheduled_date || !formData.appointment_type_id) return

      checkingAvailability.value = true
      try {
        // Ensure date is in YYYY-MM-DD format
        const dateStr = formData.scheduled_date

        const response = await appointmentStore.checkAvailability({
          date: dateStr,
          type_id: parseInt(formData.appointment_type_id)
        })

        if (response.success) {
          // Filter out past times for today
          const now = new Date()
          const today = new Date().toISOString().split('T')[0]
          const isToday = dateStr === today

          availableTimeSlots.value = (response.data.slots || [])
            .filter(slot => {
              // First check if slot is available
              if (!slot.available) return false

              // For today, filter out past times
              if (isToday) {
                const [hours, minutes] = slot.time.split(':').map(Number)
                const slotTime = new Date()
                slotTime.setHours(hours, minutes, 0, 0)
                return slotTime > now
              }

              return true
            })
            .map(slot => ({
              value: slot.time,
              title: slot.time,
              display: slot.display
            }))
        }
      } catch (error) {
        console.error('Error checking availability:', error)
        toast.error('Failed to check availability')
      } finally {
        checkingAvailability.value = false
      }
    }


    const getAppointmentsForDay = (date) => {
      return appointments.value.filter(a =>
        format(parseISO(a.scheduled_at), 'yyyy-MM-dd') === format(new Date(date), 'yyyy-MM-dd')
      )
    }

    const getAppointmentsForTimeSlot = (hour) => {
      return appointments.value.filter(a => {
        const appointmentDate = parseISO(a.scheduled_at)
        return format(appointmentDate, 'yyyy-MM-dd') === format(selectedDate.value, 'yyyy-MM-dd') &&
          appointmentDate.getHours() === hour
      })
    }

    const getAppointmentsForDayAndTime = (date, hour) => {
      return appointments.value.filter(a => {
        const appointmentDate = parseISO(a.scheduled_at)
        return format(appointmentDate, 'yyyy-MM-dd') === date &&
          appointmentDate.getHours() === hour
      })
    }

    const getAppointmentsCountForDay = (date) => {
      return getAppointmentsForDay(date).length
    }

    const getDayCapacityColor = (count) => {
      if (count >= MAX_DAILY_APPOINTMENTS) return colors.error
      if (count >= MAX_DAILY_APPOINTMENTS * 0.8) return colors.warning
      return colors.success
    }

    const goToToday = () => {
      selectedDate.value = new Date()
      fetchAppointments()
    }

    const previousPeriod = () => {
      if (calendarView.value === 'day') {
        selectedDate.value = subDays(selectedDate.value, 1)
      } else if (calendarView.value === 'week') {
        selectedDate.value = subWeeks(selectedDate.value, 1)
      } else {
        selectedDate.value = subMonths(selectedDate.value, 1)
      }
      fetchAppointments()
    }

    const nextPeriod = () => {
      if (calendarView.value === 'day') {
        selectedDate.value = addDays(selectedDate.value, 1)
      } else if (calendarView.value === 'week') {
        selectedDate.value = addWeeks(selectedDate.value, 1)
      } else {
        selectedDate.value = addMonths(selectedDate.value, 1)
      }
      fetchAppointments()
    }

    const selectDate = (date) => {
      selectedDate.value = new Date(date)
    }

    const showDayDetails = (date) => {
      selectedDate.value = new Date(date)
      calendarView.value = 'day'
    }

    const openAppointmentDetails = (appointment) => {
      selectedAppointment.value = appointment
      detailsDialog.value = true
    }

    const openCreateDialog = () => {
  editingAppointment.value = false
  formData.patient = null
  formData.patient_id = null
  formData.appointment_type_id = null
  formData.scheduled_date = format(selectedDate.value, 'yyyy-MM-dd')
  formData.scheduled_time = ''
  formData.duration = 30
  formData.notes = ''
  patientSearch.value = ''
  patients.value = []
  availableTimeSlots.value = []
  appointmentDialog.value = true
}

    const createAppointmentAtTime = (date, hour) => {
  const count = getAppointmentsCountForDay(date)
  if (count >= MAX_DAILY_APPOINTMENTS) {
    toast.warning('This date has reached maximum capacity')
    return
  }

  editingAppointment.value = false
  formData.patient = null
  formData.patient_id = null
  formData.appointment_type_id = null
  formData.scheduled_date = date
  formData.scheduled_time = `${hour.toString().padStart(2, '0')}:00`
  formData.duration = 30
  formData.notes = ''
  patientSearch.value = ''
  patients.value = []
  availableTimeSlots.value = []
  appointmentDialog.value = true
}

    const editAppointment = () => {
      if (!selectedAppointment.value) return

      editingAppointment.value = true
      const appointment = selectedAppointment.value
      const scheduledDate = parseISO(appointment.scheduled_at)

      formData.patient_id = appointment.patient_id
      formData.appointment_type_id = appointment.appointment_type_id
      formData.scheduled_date = format(scheduledDate, 'yyyy-MM-dd')
      formData.scheduled_time = format(scheduledDate, 'HH:mm')
      formData.duration = appointment.duration_minutes || 30
      formData.notes = appointment.notes || ''

      // Load the patient info
      if (appointment.patient_id) {
        patients.value = [{
          id: appointment.patient_id,
          first_name: appointment.patient_first_name,
          last_name: appointment.patient_last_name,
          patient_facility_code: appointment.patient_facility_code,
          contact_number: appointment.patient_contact,
          hiv_status: appointment.hiv_status
        }]
      }

      detailsDialog.value = false
      appointmentDialog.value = true
      checkAvailability()
    }

    const closeAppointmentDialog = () => {
      appointmentDialog.value = false
      if (appointmentForm.value) {
        appointmentForm.value.reset()
      }
    }

    const saveAppointment = async () => {
  if (!appointmentForm.value?.validate()) return
  
  saving.value = true
  try {
    // Debug: log the current form data
    console.log('Current formData:', formData)
    console.log('Patient object:', formData.patient)
    console.log('Patient ID:', formData.patient_id)
    
    // Check if we have a patient selected
    if (!formData.patient) {
      toast.error('Please select a patient')
      return
    }

    // Ensure patient_id is a number
    const patientId = parseInt(formData.patient_id)
    if (isNaN(patientId)) {
      toast.error('Invalid patient selected')
      return
    }

    // Create datetime string and ensure it's in the future
    const dateTimeStr = `${formData.scheduled_date}T${formData.scheduled_time}:00`
    const scheduledDateTime = new Date(dateTimeStr)
    const now = new Date()
    
    // Check if the date is in the past (ignore time for date comparison)
    const scheduledDate = new Date(formData.scheduled_date)
    const today = new Date(now.setHours(0, 0, 0, 0))
    
    if (scheduledDate < today) {
      toast.error('Appointment date cannot be in the past')
      return
    }
    
    // If it's today, check if time is in the past
    if (scheduledDate.getTime() === today.getTime()) {
      const [hours, minutes] = formData.scheduled_time.split(':').map(Number)
      const nowHours = now.getHours()
      const nowMinutes = now.getMinutes()
      
      if (hours < nowHours || (hours === nowHours && minutes <= nowMinutes)) {
        toast.error('Appointment time must be in the future')
        return
      }
    }

    // Format the datetime properly
    const scheduledAt = `${formData.scheduled_date}T${formData.scheduled_time}:00`
    
    const appointmentData = {
      patient_id: patientId, // This is now a number
      appointment_type_id: parseInt(formData.appointment_type_id),
      scheduled_at: scheduledAt,
      notes: formData.notes || null
    }

    console.log('Saving appointment with data:', appointmentData)

    let response
    if (editingAppointment.value && selectedAppointment.value) {
      response = await appointmentStore.updateAppointment(selectedAppointment.value.id, appointmentData)
      toast.success('Appointment updated successfully')
    } else {
      response = await appointmentStore.createAppointment(appointmentData)
      toast.success('Appointment created successfully')
    }

    if (response) {
      closeAppointmentDialog()
      fetchAppointments()
    }
  } catch (error) {
    console.error('Error saving appointment:', error)
    // Show more detailed error message
    const errorMessage = error.response?.data?.error || 
                        error.response?.data?.message || 
                        'Failed to save appointment'
    
    if (error.response?.data?.validation_errors) {
      const validationErrors = error.response.data.validation_errors
      validationErrors.forEach(err => {
        toast.error(`${err.field}: ${err.message}`)
      })
    } else {
      toast.error(errorMessage)
    }
  } finally {
    saving.value = false
  }
}

    const openStatusDialog = () => {
      newStatus.value = ''
      statusDialog.value = true
    }

    const updateAppointmentStatus = async () => {
      if (!newStatus.value || !selectedAppointment.value) return

      updatingStatus.value = true
      try {
        await appointmentStore.updateAppointmentStatus(
          selectedAppointment.value.id,
          newStatus.value
        )

        toast.success('Appointment status updated successfully')
        statusDialog.value = false
        detailsDialog.value = false
        fetchAppointments()
      } catch (error) {
        console.error('Error updating status:', error)
        toast.error(error.response?.data?.error || 'Failed to update status')
      } finally {
        updatingStatus.value = false
      }
    }

    const switchToListView = () => {
      router.push('/appointments')
    }

    const updateDuration = () => {
      const type = appointmentTypes.value.find(t => t.id === formData.appointment_type_id)
      if (type) {
        formData.duration = type.duration_minutes || 30
      }
    }

    // Utility functions
    const formatHour = (hour) => {
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const hour12 = hour % 12 || 12
      return `${hour12}:00 ${ampm}`
    }

    const formatTime = (datetime) => {
      return format(parseISO(datetime), 'h:mm a')
    }

    const formatShortTime = (datetime) => {
      return format(parseISO(datetime), 'h:mm a')
    }

    const formatFullDate = (datetime) => {
      return format(parseISO(datetime), 'EEEE, MMMM d, yyyy \'at\' h:mm a')
    }

    const getInitials = (first, last) => {
      return `${first?.charAt(0) || ''}${last?.charAt(0) || ''}`.toUpperCase()
    }

    const getTypeColor = (type) => {
      const colorMap = {
        'Consultation': colors.secondary,
        'Lab Test': colors.info,
        'Counseling': colors.accent,
        'Emergency': colors.error
      }
      return colorMap[type] || colors.primary
    }

    const getStatusColor = (status) => {
      const colorMap = {
        'SCHEDULED': colors.warning,
        'CONFIRMED': colors.info,
        'IN_PROGRESS': colors.accent,
        'COMPLETED': colors.success,
        'CANCELLED': colors.error,
        'NO_SHOW': colors.errorDark
      }
      return colorMap[status] || colors.primary
    }

    const getQueueStatusColor = (status) => {
      const colorMap = {
        'WAITING': colors.warning,
        'CALLED': colors.info,
        'SERVING': colors.accent,
        'COMPLETED': colors.success,
        'SKIPPED': colors.error
      }
      return colorMap[status] || colors.primary
    }

    const getStatusIcon = (status) => {
      const icons = {
        'SCHEDULED': 'mdi-calendar-clock',
        'CONFIRMED': 'mdi-check-circle',
        'IN_PROGRESS': 'mdi-progress-clock',
        'COMPLETED': 'mdi-check-circle-outline',
        'CANCELLED': 'mdi-cancel',
        'NO_SHOW': 'mdi-close-circle'
      }
      return icons[status] || 'mdi-calendar'
    }

    const getAppointmentStyle = (appointment) => {
      return {
        backgroundColor: getStatusColor(appointment.status) + '15',
        borderLeft: `4px solid ${getStatusColor(appointment.status)}`
      }
    }

    const debouncedSearch = debounce(() => {
      fetchAppointments()
    }, 500)

    // Watchers
    watch([() => formData.scheduled_date, () => formData.appointment_type_id], () => {
      checkAvailability()
    })

    watch([selectedDate, filters], () => {
      fetchAppointments()
    })

    watch(() => formData.patient, (newPatient) => {
  if (newPatient) {
    formData.patient_id = newPatient.id
    console.log('Patient selected:', newPatient, 'Patient ID set to:', newPatient.id)
  } else {
    formData.patient_id = null
  }
}, { deep: true })

    // Lifecycle
    onMounted(() => {
      fetchAppointmentTypes()
      fetchAppointments()
    })

    return {
      // State
      loading,
      saving,
      updatingStatus,
      checkingAvailability,
      searchingPatients,
      appointments,
      appointmentTypes,
      patients,
      selectedDate,
      calendarView,
      detailsDialog,
      appointmentDialog,
      statusDialog,
      editingAppointment,
      selectedAppointment,
      appointmentForm,
      formValid,
      newStatus,
      patientSearch,
      availableTimeSlots,
      filters,
      formData,

      // Constants
      workingHours,
      dayNames,
      statusOptions,
      rules,
      minDate,
      colors,
      MAX_DAILY_APPOINTMENTS,

      // Computed
      calendarTitle,
      dailyAppointmentCount,
      dailyCapacityPercentage,
      dailyCapacityColor,
      isSelectedDateAtCapacity,
      weekDays,
      calendarDays,
      statistics,
      validStatusTransitions,
      canUpdateStatus,

      // Methods
      fetchAppointments,
      searchPatients,
      checkAvailability,
      getAppointmentsForDay,
      getAppointmentsForTimeSlot,
      getAppointmentsForDayAndTime,
      getAppointmentsCountForDay,
      getDayCapacityColor,
      goToToday,
      previousPeriod,
      nextPeriod,
      selectDate,
      showDayDetails,
      openAppointmentDetails,
      openCreateDialog,
      createAppointmentAtTime,
      editAppointment,
      closeAppointmentDialog,
      saveAppointment,
      openStatusDialog,
      updateAppointmentStatus,
      switchToListView,
      updateDuration,

      // Utilities
      formatHour,
      formatTime,
      formatShortTime,
      formatFullDate,
      getInitials,
      getTypeColor,
      getStatusColor,
      getQueueStatusColor,
      getStatusIcon,
      getAppointmentStyle,
      debouncedSearch
    }
  }
}
</script>

<style scoped>
.appointments-calendar {
  max-width: 1600px;
  margin: 0 auto;
}

.calendar-card {
  overflow: hidden;
  background-color: v-bind('colors.surface');
}

.calendar-toolbar {
  background-color: v-bind('colors.surface') !important;
}

/* Day View Styles */
.day-view {
  min-height: 600px;
}

.time-slots {
  display: flex;
  flex-direction: column;
}

.time-slot {
  display: flex;
  min-height: 80px;
  transition: background-color 0.2s;
}

.time-slot:hover {
  background-color: v-bind('colors.surfaceDark');
}

.time-label {
  width: 100px;
  padding: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  border-right: 1px solid v-bind('colors.border');
  background-color: v-bind('colors.surface');
}

.slot-appointments {
  flex: 1;
  padding: 4px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

/* Week View Styles */
.week-view {
  display: flex;
  flex-direction: column;
}

.week-header {
  display: flex;
  background-color: v-bind('colors.surfaceDark');
  border-bottom: 2px solid v-bind('colors.primary');
}

.week-header .time-column {
  width: 100px;
  flex-shrink: 0;
}

.week-header .day-column {
  flex: 1;
  padding: 12px;
  text-align: center;
  cursor: pointer;
  transition: background-color 0.2s;
  position: relative;
}

.week-header .day-column:hover {
  background-color: v-bind('colors.primaryLight + ' 20'');
}

.week-header .day-column.is-today {
  background-color: v-bind('colors.primary + ' 10'');
}

.week-header .day-column.at-capacity {
  background-color: v-bind('colors.error + ' 10'');
}

.week-header .day-name {
  font-weight: 600;
  color: v-bind('colors.textPrimary');
}

.week-header .day-number {
  font-size: 1.2rem;
  font-weight: 700;
  color: v-bind('colors.primary');
}

.week-header .day-count {
  font-size: 0.9rem;
  font-weight: 500;
}

.week-body {
  display: flex;
  min-height: 600px;
}

.week-body .time-column {
  width: 100px;
  flex-shrink: 0;
}

.week-body .day-column {
  flex: 1;
  border-right: 1px solid v-bind('colors.border');
}

.week-body .day-column:last-child {
  border-right: none;
}

.week-body .day-column.is-today {
  background-color: v-bind('colors.primary + ' 05'');
}

.hour-marker {
  height: 80px;
  padding: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  border-bottom: 1px solid v-bind('colors.border');
  background-color: v-bind('colors.surface');
}

.hour-slot {
  height: 80px;
  padding: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
  position: relative;
  border-bottom: 1px solid v-bind('colors.border');
}

.hour-slot:hover {
  background-color: v-bind('colors.surfaceDark');
}

/* Month View Styles */
.month-view {
  min-height: 600px;
}

.month-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background-color: v-bind('colors.surfaceDark');
  border-bottom: 2px solid v-bind('colors.primary');
}

.header-day {
  padding: 12px;
  text-align: center;
  font-weight: 600;
  color: v-bind('colors.textPrimary');
}

.month-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  min-height: 500px;
}

.month-day {
  min-height: 120px;
  padding: 8px;
  border-right: 1px solid v-bind('colors.border');
  border-bottom: 1px solid v-bind('colors.border');
  cursor: pointer;
  transition: background-color 0.2s;
  position: relative;
}

.month-day:hover {
  background-color: v-bind('colors.surfaceDark');
}

.month-day.other-month {
  background-color: v-bind('colors.surfaceDark + ' 40'');
  color: v-bind('colors.textDisabled');
}

.month-day.is-today {
  background-color: v-bind('colors.primary + ' 10'');
  border: 2px solid v-bind('colors.primary');
}

.month-day.has-appointments {
  font-weight: 600;
}

.month-day.at-capacity {
  border-right: 3px solid v-bind('colors.error');
}

.day-number {
  font-size: 1rem;
  font-weight: 500;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.day-count-badge {
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 12px;
  color: white;
}

.day-appointments {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* Appointment Card Styles */
.appointment-card {
  padding: 8px;
  margin-bottom: 4px;
  border-radius: v-bind('colors.radiusSm');
  cursor: pointer;
  transition: all 0.2s;
  width: calc(33.333% - 4px);
  min-width: 150px;
}

.appointment-card.compact {
  width: 100%;
  min-width: auto;
  padding: 4px;
  margin-bottom: 2px;
}

.appointment-card.hover {
  transform: translateY(-1px);
  box-shadow: v-bind('colors.shadowMd');
}

.appointment-card.scheduled {
  border-left-color: v-bind('colors.warning') !important;
}

.appointment-card.confirmed {
  border-left-color: v-bind('colors.info') !important;
}

.appointment-card.in_progress {
  border-left-color: v-bind('colors.accent') !important;
}

.appointment-card.completed {
  border-left-color: v-bind('colors.success') !important;
}

.appointment-card.cancelled {
  border-left-color: v-bind('colors.error') !important;
  opacity: 0.7;
}

.appointment-card.no_show {
  border-left-color: v-bind('colors.errorDark') !important;
  opacity: 0.7;
}

.appointment-time {
  font-size: 0.8rem;
  font-weight: 600;
  color: v-bind('colors.textSecondary');
}

.appointment-patient {
  font-size: 0.9rem;
  font-weight: 500;
  color: v-bind('colors.textPrimary');
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.appointment-type {
  margin-top: 4px;
}

.queue-number {
  position: absolute;
  top: 4px;
  right: 4px;
}

/* Appointment Indicator Styles */
.appointment-indicator {
  padding: 2px 4px;
  border-radius: v-bind('colors.radiusSm');
  font-size: 0.7rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 1px;
}

.appointment-indicator.hover {
  transform: translateX(2px);
}

.appointment-indicator.scheduled {
  background-color: v-bind('colors.warning + ' 20'');
  border-left: 2px solid v-bind('colors.warning');
}

.appointment-indicator.confirmed {
  background-color: v-bind('colors.info + ' 20'');
  border-left: 2px solid v-bind('colors.info');
}

.appointment-indicator.in_progress {
  background-color: v-bind('colors.accent + ' 20'');
  border-left: 2px solid v-bind('colors.accent');
}

.appointment-indicator.completed {
  background-color: v-bind('colors.success + ' 20'');
  border-left: 2px solid v-bind('colors.success');
}

.appointment-indicator.cancelled {
  background-color: v-bind('colors.error + ' 10'');
  border-left: 2px solid v-bind('colors.error');
  text-decoration: line-through;
}

.appointment-indicator.no_show {
  background-color: v-bind('colors.errorDark + ' 10'');
  border-left: 2px solid v-bind('colors.errorDark');
}

.appointment-time {
  font-weight: 600;
  margin-right: 4px;
}

.more-appointments {
  font-size: 0.7rem;
  color: v-bind('colors.primary');
  padding: 2px 4px;
  cursor: pointer;
  text-align: center;
}

.more-appointments:hover {
  text-decoration: underline;
}

/* Stat Cards */
.stat-card {
  transition: transform 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: v-bind('colors.shadowLg') !important;
}

/* Responsive Adjustments */
@media (max-width: 960px) {
  .appointment-card {
    width: 100%;
    min-width: auto;
  }

  .time-label {
    width: 80px;
    font-size: 0.8rem;
  }

  .week-body .time-column {
    width: 80px;
  }

  .hour-marker {
    font-size: 0.8rem;
  }
}

@media (max-width: 600px) {
  .month-day {
    min-height: 80px;
    padding: 4px;
  }

  .day-number {
    font-size: 0.9rem;
  }

  .appointment-indicator {
    font-size: 0.6rem;
    padding: 1px 2px;
  }
}
</style>