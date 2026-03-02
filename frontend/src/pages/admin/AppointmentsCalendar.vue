<!-- frontend/src/pages/admin/AppointmentsCalendar.vue -->
<template>
  <v-container fluid class="pa-4 pa-md-6 appointments-calendar">
    <!-- Header Section -->
    <v-row class="mb-4 align-center">
      <v-col cols="12" md="6">
        <div class="d-flex align-center">
          <v-btn icon variant="text" @click="goToToday" class="mr-2" color="primary">
            <v-icon>mdi-calendar-today</v-icon>
          </v-btn>
          <h1 class="text-h4 font-weight-medium text-primary">
            Appointments Calendar
          </h1>
        </div>
      </v-col>

      <v-col cols="12" md="6" class="text-md-right">
        <v-btn color="secondary" prepend-icon="mdi-plus" @click="openCreateDialog" class="mr-2">
          New Appointment
        </v-btn>
        <v-btn color="primary" variant="outlined" prepend-icon="mdi-format-list-numbered" @click="goToQueue">
          Queue Management
        </v-btn>
      </v-col>
    </v-row>

    <!-- Filter Section -->
    <v-row class="mb-4">
      <v-col cols="12" md="4">
        <v-select v-model="filters.appointmentType" :items="appointmentTypes" item-title="type_name" item-value="id"
          label="Filter by Type" clearable color="primary" @update:model-value="fetchAppointments" />
      </v-col>
      <v-col cols="12" md="4">
        <v-select v-model="filters.status" :items="statusOptions" label="Filter by Status" clearable color="primary"
          @update:model-value="fetchAppointments" />
      </v-col>
      <v-col cols="12" md="4">
        <v-text-field v-model="filters.search" label="Search Patient" prepend-inner-icon="mdi-magnify" clearable
          color="primary" @update:model-value="debouncedSearch" />
      </v-col>
    </v-row>

    <!-- Quick Stats -->
    <v-row class="mb-4">
      <v-col cols="12" sm="6" md="3">
        <v-card class="stat-card" elevation="2" :style="{ borderLeft: '4px solid #1976D2' }">
          <v-card-text class="text-center">
            <div class="text-subtitle-2 text-medium-emphasis">Today's Appointments</div>
            <div class="text-h4 font-weight-bold text-primary">{{ stats.today.total || 0 }}/16</div>
            <v-progress-linear :model-value="(stats.today.total / 16) * 100" color="primary" height="6" rounded
              class="mt-2"></v-progress-linear>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="stat-card" elevation="2" :style="{ borderLeft: '4px solid #4CAF50' }">
          <v-card-text class="text-center">
            <div class="text-subtitle-2 text-medium-emphasis">Completed</div>
            <div class="text-h4 font-weight-bold text-success">{{ stats.today.completed || 0 }}</div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="stat-card" elevation="2" :style="{ borderLeft: '4px solid #FFC107' }">
          <v-card-text class="text-center">
            <div class="text-subtitle-2 text-medium-emphasis">Waiting for Queue</div>
            <div class="text-h4 font-weight-bold text-warning">{{ getWaitingCount }}</div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="stat-card" elevation="2" :style="{ borderLeft: '4px solid #9C27B0' }">
          <v-card-text class="text-center">
            <div class="text-subtitle-2 text-medium-emphasis">In Queue Today</div>
            <div class="text-h4 font-weight-bold text-purple">{{ getTotalInQueue }}</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Calendar View Toggle -->
    <v-row class="mb-4">
      <v-col cols="12">
        <v-btn-toggle v-model="calendarView" mandatory border divided color="primary">
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
    <v-card elevation="4" class="calendar-card">
      <!-- Calendar Toolbar -->
      <v-toolbar color="background" flat class="calendar-toolbar">
        <v-btn icon @click="previousPeriod" color="primary">
          <v-icon>mdi-chevron-left</v-icon>
        </v-btn>

        <v-toolbar-title class="text-h6 font-weight-medium">
          {{ calendarTitle }}
        </v-toolbar-title>

        <v-btn icon @click="nextPeriod" color="primary">
          <v-icon>mdi-chevron-right</v-icon>
        </v-btn>

        <v-spacer />

        <v-btn color="primary" variant="text" @click="goToToday">
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
              <div v-for="hour in workingHours" :key="hour" class="time-slot">
                <div class="time-label text-medium-emphasis">
                  {{ formatHour(hour) }}
                </div>
                <div class="slot-appointments">
                  <template v-for="appointment in getAppointmentsForTimeSlot(hour)" :key="appointment.id">
                    <v-hover v-slot="{ isHovering, props }">
                      <v-card v-bind="props" class="appointment-card" :class="{
                        'hover': isHovering,
                        [appointment.status.toLowerCase()]: true,
                        'in-queue': appointment.in_queue
                      }" @click="openAppointmentDetails(appointment)">
                        <div class="d-flex justify-space-between align-start">
                          <div>
                            <div class="appointment-time">
                              {{ formatTime(appointment.scheduled_at) }}
                            </div>
                            <div class="appointment-patient font-weight-medium">
                              {{ appointment.patient_first_name }} {{ appointment.patient_last_name }}
                            </div>
                          </div>
                          <v-chip v-if="appointment.in_queue" size="x-small" color="success" class="queue-badge">
                            Q{{ appointment.queue_number }}
                          </v-chip>
                        </div>
                        <div class="appointment-type mt-1">
                          <v-chip size="x-small" :color="getTypeColor(appointment.type_name)" text-color="white">
                            {{ appointment.type_name }}
                          </v-chip>
                        </div>
                        <div class="appointment-actions mt-2" v-if="canConfirm(appointment)">
                          <v-btn size="x-small" color="success" block @click.stop="confirmAndAddToQueue(appointment)"
                            :loading="confirmingId === appointment.id">
                            <v-icon left size="16">mdi-check</v-icon>
                            Confirm & Add to Queue
                          </v-btn>
                        </div>
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
              <div v-for="day in weekDays" :key="day.date" class="day-column">
                <div class="day-name">{{ day.name }}</div>
                <div class="day-number text-h6">{{ day.number }}</div>
                <div class="day-count text-caption">{{ day.appointmentCount }}/16</div>
              </div>
            </div>
            <div class="week-body">
              <div class="time-column">
                <div v-for="hour in workingHours" :key="hour" class="hour-marker text-medium-emphasis">
                  {{ formatHour(hour) }}
                </div>
              </div>
              <div v-for="day in weekDays" :key="day.date" class="day-column">
                <div v-for="hour in workingHours" :key="hour" class="hour-slot">
                  <template v-for="appointment in getAppointmentsForDayAndTime(day.date, hour)" :key="appointment.id">
                    <v-tooltip location="top">
                      <template v-slot:activator="{ props }">
                        <div v-bind="props" class="appointment-indicator" :class="{
                          [appointment.status.toLowerCase()]: true,
                          'in-queue': appointment.in_queue
                        }" @click="openAppointmentDetails(appointment)">
                          <span class="indicator-name">
                            {{ getInitials(appointment.patient_first_name, appointment.patient_last_name) }}
                          </span>
                          <span v-if="appointment.in_queue" class="indicator-queue">#{{ appointment.queue_number
                          }}</span>
                        </div>
                      </template>
                      <span>
                        {{ appointment.patient_first_name }} {{ appointment.patient_last_name }} - {{
                          appointment.type_name }}
                        <span v-if="appointment.in_queue"> (In Queue: #{{ appointment.queue_number }})</span>
                      </span>
                    </v-tooltip>
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
                'has-appointments': day.hasAppointments
              }" @click="selectDate(day.date)">
                <div class="day-number">
                  {{ day.number }}
                  <span class="day-count-badge" :class="getDayCapacityClass(day.appointmentCount)">
                    {{ day.appointmentCount }}
                  </span>
                </div>
                <div class="day-appointments">
                  <div v-for="appointment in getAppointmentsForDay(day.date).slice(0, 3)" :key="appointment.id"
                    class="appointment-indicator mini" :class="{
                      [appointment.status.toLowerCase()]: true,
                      'in-queue': appointment.in_queue
                    }" @click.stop="openAppointmentDetails(appointment)">
                    <span class="indicator-time">{{ formatShortTime(appointment.scheduled_at) }}</span>
                    <span class="indicator-name">{{ appointment.patient_last_name }}</span>
                    <span v-if="appointment.in_queue" class="indicator-queue-mini">#{{ appointment.queue_number
                    }}</span>
                  </div>
                  <div v-if="getAppointmentsForDay(day.date).length > 3"
                    class="more-appointments text-caption text-primary" @click.stop="showDayDetails(day.date)">
                    +{{ getAppointmentsForDay(day.date).length - 3 }} more
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </v-card>

    <!-- Appointment Details Dialog -->
    <v-dialog v-model="detailsDialog" max-width="600px">
      <v-card v-if="selectedAppointment">
        <v-card-title class="d-flex align-center pa-4">
          <v-icon color="primary" size="24" class="mr-2">
            mdi-calendar-check
          </v-icon>
          <span class="text-h6">Appointment Details</span>
          <v-spacer />
          <v-chip :color="getStatusColor(selectedAppointment.status)" text-color="white" size="small">
            {{ selectedAppointment.status }}
          </v-chip>
          <v-chip v-if="selectedAppointment.in_queue" color="success" text-color="white" size="small" class="ml-2">
            In Queue: #{{ selectedAppointment.queue_number }}
          </v-chip>
          <v-btn icon variant="text" @click="detailsDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <v-divider />

        <v-card-text class="pa-4">
          <v-row>
            <v-col cols="12" class="pb-0">
              <div class="text-subtitle-2 font-weight-bold text-medium-emphasis">
                Appointment Number
              </div>
              <div class="text-body-1 mb-3">
                {{ selectedAppointment.appointment_number }}
              </div>
            </v-col>

            <v-col cols="6">
              <div class="text-subtitle-2 font-weight-bold text-medium-emphasis">
                Patient
              </div>
              <div class="text-body-1">
                {{ selectedAppointment.patient_first_name }} {{ selectedAppointment.patient_last_name }}
              </div>
              <div class="text-caption text-medium-emphasis">
                {{ selectedAppointment.patient_facility_code }}
              </div>
            </v-col>

            <v-col cols="6">
              <div class="text-subtitle-2 font-weight-bold text-medium-emphasis">
                Contact
              </div>
              <div class="text-body-1">
                {{ selectedAppointment.patient_contact || 'N/A' }}
              </div>
            </v-col>

            <v-col cols="6">
              <div class="text-subtitle-2 font-weight-bold text-medium-emphasis">
                Date & Time
              </div>
              <div class="text-body-1">
                {{ formatFullDate(selectedAppointment.scheduled_at) }}
              </div>
            </v-col>

            <v-col cols="6">
              <div class="text-subtitle-2 font-weight-bold text-medium-emphasis">
                Type
              </div>
              <v-chip :color="getTypeColor(selectedAppointment.type_name)" text-color="white" size="small">
                {{ selectedAppointment.type_name }}
              </v-chip>
              <div class="text-caption">
                {{ selectedAppointment.duration_minutes }} minutes
              </div>
            </v-col>

            <v-col cols="12" v-if="selectedAppointment.notes">
              <div class="text-subtitle-2 font-weight-bold text-medium-emphasis">
                Notes
              </div>
              <div class="text-body-2 pa-2 rounded bg-grey-lighten-3">
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
          <v-btn color="primary" variant="flat" @click="editAppointment">
            Edit
          </v-btn>
          <v-btn v-if="canConfirm(selectedAppointment)" color="success" variant="flat"
            @click="confirmAndAddToQueue(selectedAppointment)" :loading="confirmingId === selectedAppointment.id">
            <v-icon left>mdi-check</v-icon>
            Confirm & Add to Queue
          </v-btn>
          <v-btn v-if="selectedAppointment.in_queue" color="info" variant="flat" @click="goToQueue">
            <v-icon left>mdi-format-list-numbered</v-icon>
            View in Queue
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Create/Edit Appointment Dialog -->
    <v-dialog v-model="appointmentDialog" max-width="600px">
      <v-card>
        <v-card-title class="pa-4">
          <v-icon color="primary" size="24" class="mr-2">
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
                <v-autocomplete v-model="formData.patient" :items="patients"
                  :item-title="(item) => `${item.last_name}, ${item.first_name} (${item.patient_facility_code})`"
                  :item-value="(item) => item" label="Select Patient" color="primary"
                  :rules="[v => !!v || 'Patient is required']" prepend-inner-icon="mdi-account"
                  :loading="searchingPatients" @update:search="searchPatients" return-object required clearable>
                  <template v-slot:item="{ props, item }">
                    <v-list-item v-bind="props" :title="`${item.raw.last_name}, ${item.raw.first_name}`"
                      :subtitle="`${item.raw.patient_facility_code} | ${item.raw.hiv_status}`" />
                  </template>
                </v-autocomplete>
              </v-col>

              <v-col cols="12" md="6">
                <v-select v-model="formData.appointment_type_id" :items="appointmentTypes" item-title="type_name"
                  item-value="id" label="Appointment Type" color="primary"
                  :rules="[v => !!v || 'Appointment type is required']" prepend-inner-icon="mdi-clipboard-text" required
                  @update:model-value="updateDuration" />
              </v-col>

              <v-col cols="12" md="6">
                <v-text-field v-model="formData.duration" label="Duration (minutes)" type="number" color="primary"
                  readonly disabled prepend-inner-icon="mdi-clock-outline" />
              </v-col>

              <v-col cols="12" md="6">
                <v-text-field v-model="formData.scheduled_date" label="Date" type="date" color="primary"
                  :rules="[v => !!v || 'Date is required']" :min="minDate" prepend-inner-icon="mdi-calendar" required
                  @update:model-value="checkAvailability" />
              </v-col>

              <v-col cols="12" md="6">
                <v-select v-model="formData.scheduled_time" :items="availableTimeSlots" item-title="display"
                  item-value="time" label="Time" color="primary" :rules="[v => !!v || 'Time is required']"
                  :disabled="!formData.scheduled_date || checkingAvailability || isSelectedDateAtCapacity"
                  :loading="checkingAvailability" prepend-inner-icon="mdi-clock" required />
              </v-col>

              <v-col cols="12">
                <v-textarea v-model="formData.notes" label="Notes" color="primary" prepend-inner-icon="mdi-note-text"
                  rows="3" />
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
          <v-btn color="primary" variant="flat" :loading="saving"
            :disabled="isSelectedDateAtCapacity && !editingAppointment" @click="saveAppointment">
            {{ editingAppointment ? 'Update' : 'Create' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar for notifications -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000" location="top">
      {{ snackbar.text }}
      <template v-slot:actions>
        <v-btn color="white" variant="text" @click="snackbar.show = false">
          Close
        </v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameMonth, parseISO } from 'date-fns'
import debounce from 'lodash/debounce'
import { appointmentsApi, patientsApi, queueApi } from '@/api'

export default {
  name: 'AppointmentsCalendar',

  setup() {
    const router = useRouter()

    // State
    const loading = ref(false)
    const saving = ref(false)
    const checkingAvailability = ref(false)
    const searchingPatients = ref(false)
    const confirmingId = ref(null)
    const appointments = ref([])
    const appointmentTypes = ref([])
    const patients = ref([])
    const selectedDate = ref(new Date())
    const calendarView = ref('month')
    const detailsDialog = ref(false)
    const appointmentDialog = ref(false)
    const editingAppointment = ref(false)
    const selectedAppointment = ref(null)
    const appointmentForm = ref(null)
    const formValid = ref(false)
    const patientSearch = ref('')
    const availableTimeSlots = ref([])
    const currentQueue = ref({
      waiting: [],
      called: [],
      serving: []
    })

    const filters = reactive({
      appointmentType: null,
      status: null,
      search: ''
    })

    const formData = reactive({
      patient: null,
      patient_id: null,
      appointment_type_id: null,
      scheduled_date: '',
      scheduled_time: '',
      duration: 30,
      notes: ''
    })

    const snackbar = ref({
      show: false,
      text: '',
      color: 'info'
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

    const stats = computed(() => {
      const today = format(new Date(), 'yyyy-MM-dd')
      const todayApps = appointments.value.filter(a =>
        format(parseISO(a.scheduled_at), 'yyyy-MM-dd') === today
      )

      return {
        today: {
          total: todayApps.length,
          scheduled: todayApps.filter(a => a.status === 'SCHEDULED').length,
          confirmed: todayApps.filter(a => a.status === 'CONFIRMED').length,
          in_progress: todayApps.filter(a => a.status === 'IN_PROGRESS').length,
          completed: todayApps.filter(a => a.status === 'COMPLETED').length,
          cancelled: todayApps.filter(a => a.status === 'CANCELLED').length,
          no_show: todayApps.filter(a => a.status === 'NO_SHOW').length
        }
      }
    })

    const getWaitingCount = computed(() => {
      return currentQueue.value.waiting?.length || 0
    })

    const getTotalInQueue = computed(() => {
      return (currentQueue.value.waiting?.length || 0) +
        (currentQueue.value.called?.length || 0) +
        (currentQueue.value.serving?.length || 0)
    })

    const isSelectedDateAtCapacity = computed(() => {
      if (!formData.scheduled_date) return false
      const count = getAppointmentsCountForDay(formData.scheduled_date)
      return count >= MAX_DAILY_APPOINTMENTS
    })

    const weekDays = computed(() => {
      const start = startOfWeek(selectedDate.value, { weekStartsOn: 0 })
      const end = endOfWeek(selectedDate.value, { weekStartsOn: 0 })
      return eachDayOfInterval({ start, end }).map(date => ({
        date: format(date, 'yyyy-MM-dd'),
        name: format(date, 'EEE'),
        number: format(date, 'd'),
        isToday: isToday(date),
        appointmentCount: getAppointmentsCountForDay(date)
      }))
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

    // Methods
    const fetchAppointmentTypes = async () => {
      try {
        const response = await appointmentsApi.getTypes()
        if (response.data?.success) {
          appointmentTypes.value = response.data.data
        } else {
          appointmentTypes.value = response.data || []
        }
      } catch (error) {
        console.error('Error fetching appointment types:', error)
        showSnackbar('Failed to load appointment types', 'error')
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

        const response = await appointmentsApi.getAll(params)

        let appointmentsData = []
        if (response.data?.success) {
          appointmentsData = response.data.data || []
        } else {
          appointmentsData = response.data || []
        }

        // Check queue status for each appointment
        appointments.value = await Promise.all(
          appointmentsData.map(async (app) => {
            try {
              const queueCheck = await queueApi.checkAppointmentInQueue(app.id)
              const inQueue = queueCheck.data?.in_queue || false
              const queueData = queueCheck.data?.data

              return {
                ...app,
                in_queue: inQueue,
                queue_number: queueData?.queue_number,
                queue_status: queueData?.status
              }
            } catch (error) {
              return {
                ...app,
                in_queue: false
              }
            }
          })
        )
      } catch (error) {
        console.error('Error fetching appointments:', error)
        showSnackbar('Failed to load appointments', 'error')
        appointments.value = []
      } finally {
        loading.value = false
      }
    }

    const fetchQueueData = async () => {
      try {
        const response = await queueApi.getCurrent()
        if (response.data?.success) {
          currentQueue.value = response.data.data || {
            waiting: [],
            called: [],
            serving: []
          }
        } else {
          currentQueue.value = {
            waiting: response.data?.waiting || [],
            called: response.data?.called || [],
            serving: response.data?.serving || []
          }
        }
      } catch (error) {
        console.error('Error fetching queue:', error)
        currentQueue.value = {
          waiting: [],
          called: [],
          serving: []
        }
      }
    }

    const checkIfInQueue = (appointmentId) => {
      const allQueueItems = [
        ...(currentQueue.value.waiting || []),
        ...(currentQueue.value.called || []),
        ...(currentQueue.value.serving || [])
      ]
      return allQueueItems.some(item => item.appointment_id === appointmentId)
    }

    const searchPatients = debounce(async (search) => {
      if (!search || search.length < 3) {
        patients.value = []
        return
      }

      searchingPatients.value = true
      try {
        const response = await patientsApi.search(search, 10)
        patients.value = response.data || []
      } catch (error) {
        console.error('Error searching patients:', error)
        showSnackbar('Failed to search patients', 'error')
        patients.value = []
      } finally {
        searchingPatients.value = false
      }
    }, 500)

    const checkAvailability = async () => {
      if (!formData.scheduled_date || !formData.appointment_type_id) return

      checkingAvailability.value = true
      try {
        const response = await appointmentsApi.checkAvailability({
          date: formData.scheduled_date,
          type_id: parseInt(formData.appointment_type_id)
        })

        let slots = []
        if (response.data?.success) {
          slots = response.data.data?.slots || []
        } else {
          slots = response.data?.slots || []
        }

        const now = new Date()
        const today = new Date().toISOString().split('T')[0]
        const isToday = formData.scheduled_date === today

        availableTimeSlots.value = slots
          .filter(slot => {
            if (!slot.available) return false
            if (isToday) {
              const [hours, minutes] = slot.time.split(':').map(Number)
              const slotTime = new Date()
              slotTime.setHours(hours, minutes, 0, 0)
              return slotTime > now
            }
            return true
          })
          .map(slot => ({
            time: slot.time,
            display: slot.display || `${slot.time} (Available)`
          }))
      } catch (error) {
        console.error('Error checking availability:', error)
        showSnackbar('Failed to check availability', 'error')
        availableTimeSlots.value = []
      } finally {
        checkingAvailability.value = false
      }
    }

    const getAppointmentsForDay = (date) => {
      return appointments.value.filter(a =>
        format(parseISO(a.scheduled_at), 'yyyy-MM-dd') === date
      )
    }

    const getAppointmentsForTimeSlot = (hour) => {
      return appointments.value.filter(a => {
        const appDate = parseISO(a.scheduled_at)
        return format(appDate, 'yyyy-MM-dd') === format(selectedDate.value, 'yyyy-MM-dd') &&
          appDate.getHours() === hour
      })
    }

    const getAppointmentsForDayAndTime = (date, hour) => {
      return appointments.value.filter(a => {
        const appDate = parseISO(a.scheduled_at)
        return format(appDate, 'yyyy-MM-dd') === date && appDate.getHours() === hour
      })
    }

    const getAppointmentsCountForDay = (date) => {
      return getAppointmentsForDay(date).length
    }

    const canConfirm = (appointment) => {
      return appointment?.status === 'SCHEDULED' && !appointment.in_queue
    }

    const confirmAndAddToQueue = async (appointment) => {
      confirmingId.value = appointment.id
      try {
        const response = await queueApi.confirmAppointment(appointment.id)

        if (response.data?.success) {
          // Fix: Access queue_number from the correct path
          const queueNumber = response.data.data?.queue?.queue_number
          showSnackbar(
            `Appointment confirmed and added to queue as #${queueNumber || 'N/A'}`,
            'success'
          )
          await fetchQueueData()
          await fetchAppointments()
          detailsDialog.value = false
        }
      } catch (error) {
        console.error('Error confirming appointment:', error)
        showSnackbar(error.response?.data?.error || 'Failed to confirm appointment', 'error')
      } finally {
        confirmingId.value = null
      }
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
      calendarView.value = 'day'
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
      resetForm()
      formData.scheduled_date = format(selectedDate.value, 'yyyy-MM-dd')
      appointmentDialog.value = true
    }

    const resetForm = () => {
      formData.patient = null
      formData.patient_id = null
      formData.appointment_type_id = null
      formData.scheduled_date = ''
      formData.scheduled_time = ''
      formData.duration = 30
      formData.notes = ''
      patientSearch.value = ''
      patients.value = []
      availableTimeSlots.value = []
    }

    const editAppointment = () => {
      if (!selectedAppointment.value) return

      editingAppointment.value = true
      const appointment = selectedAppointment.value
      const scheduledDate = parseISO(appointment.scheduled_at)

      formData.patient = {
        id: appointment.patient_id,
        first_name: appointment.patient_first_name,
        last_name: appointment.patient_last_name,
        patient_facility_code: appointment.patient_facility_code
      }
      formData.patient_id = appointment.patient_id
      formData.appointment_type_id = appointment.appointment_type_id
      formData.scheduled_date = format(scheduledDate, 'yyyy-MM-dd')
      formData.scheduled_time = format(scheduledDate, 'HH:mm')
      formData.duration = appointment.duration_minutes || 30
      formData.notes = appointment.notes || ''

      patients.value = [formData.patient]
      detailsDialog.value = false
      appointmentDialog.value = true
      checkAvailability()
    }

    const closeAppointmentDialog = () => {
      appointmentDialog.value = false
      resetForm()
      if (appointmentForm.value) {
        appointmentForm.value.reset()
      }
    }

    const saveAppointment = async () => {
      if (!appointmentForm.value?.validate()) return
      if (!formData.patient) {
        showSnackbar('Please select a patient', 'error')
        return
      }

      saving.value = true
      try {
        const scheduledAt = `${formData.scheduled_date}T${formData.scheduled_time}:00`

        const appointmentData = {
          patient_id: formData.patient.id,
          appointment_type_id: parseInt(formData.appointment_type_id),
          scheduled_at: scheduledAt,
          notes: formData.notes || null
        }

        let response
        if (editingAppointment.value && selectedAppointment.value) {
          response = await appointmentsApi.update(selectedAppointment.value.id, appointmentData)
          showSnackbar('Appointment updated successfully', 'success')
        } else {
          response = await appointmentsApi.create(appointmentData)
          showSnackbar('Appointment created successfully', 'success')
        }

        if (response.data?.success || response.status === 201) {
          closeAppointmentDialog()
          await fetchAppointments()
        }
      } catch (error) {
        console.error('Error saving appointment:', error)
        showSnackbar(error.response?.data?.error || 'Failed to save appointment', 'error')
      } finally {
        saving.value = false
      }
    }

    const goToQueue = () => {
      router.push('/admin/queue')
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
      const colors = {
        'Consultation': 'secondary',
        'Testing': 'info',
        'Refill': 'accent',
        'Others': 'primary'
      }
      return colors[type] || 'primary'
    }

    const getStatusColor = (status) => {
      const colors = {
        'SCHEDULED': 'warning',
        'CONFIRMED': 'info',
        'IN_PROGRESS': 'accent',
        'COMPLETED': 'success',
        'CANCELLED': 'error',
        'NO_SHOW': 'error-dark'
      }
      return colors[status] || 'primary'
    }

    const getDayCapacityClass = (count) => {
      if (count >= MAX_DAILY_APPOINTMENTS) return 'bg-error'
      if (count >= MAX_DAILY_APPOINTMENTS * 0.8) return 'bg-warning'
      return 'bg-success'
    }

    const showSnackbar = (text, color = 'info') => {
      snackbar.value = {
        show: true,
        text,
        color
      }
    }

    const debouncedSearch = debounce(() => {
      fetchAppointments()
    }, 500)

    // Watchers
    watch([selectedDate, filters], () => {
      fetchAppointments()
    })

    watch(() => [formData.scheduled_date, formData.appointment_type_id], () => {
      checkAvailability()
    })

    watch(() => formData.patient, (newPatient) => {
      if (newPatient?.id) {
        formData.patient_id = newPatient.id
      } else {
        formData.patient_id = null
      }
    })

    // Lifecycle
    onMounted(async () => {
      await fetchAppointmentTypes()
      await fetchQueueData()
      await fetchAppointments()
    })

    return {
      // State
      loading,
      saving,
      checkingAvailability,
      searchingPatients,
      confirmingId,
      appointments,
      appointmentTypes,
      patients,
      selectedDate,
      calendarView,
      detailsDialog,
      appointmentDialog,
      editingAppointment,
      selectedAppointment,
      appointmentForm,
      formValid,
      patientSearch,
      availableTimeSlots,
      filters,
      formData,
      snackbar,

      // Constants
      workingHours,
      dayNames,
      statusOptions,
      minDate,
      MAX_DAILY_APPOINTMENTS,

      // Computed
      calendarTitle,
      stats,
      getWaitingCount,
      getTotalInQueue,
      isSelectedDateAtCapacity,
      weekDays,
      calendarDays,

      // Methods
      fetchAppointments,
      searchPatients,
      checkAvailability,
      getAppointmentsForDay,
      getAppointmentsForTimeSlot,
      getAppointmentsForDayAndTime,
      getAppointmentsCountForDay,
      canConfirm,
      confirmAndAddToQueue,
      goToToday,
      previousPeriod,
      nextPeriod,
      selectDate,
      showDayDetails,
      openAppointmentDetails,
      openCreateDialog,
      editAppointment,
      closeAppointmentDialog,
      saveAppointment,
      goToQueue,
      updateDuration,

      // Utilities
      formatHour,
      formatTime,
      formatShortTime,
      formatFullDate,
      getInitials,
      getTypeColor,
      getStatusColor,
      getDayCapacityClass,
      debouncedSearch
    }
  }
}
</script>

<style scoped>
/* Theme Main Color: #1A4D3A (Dark Forest Green)
  Secondary/Highlight: #FFD700 (Gold) or #2D5A27 (Lighter Forest)
*/

/* 1. GENERAL & STATS */
.stat-card {
  transition: transform 0.2s;
  background-color: #FFFFFF;
  height: 100%; 
  display: flex;
  flex-direction: column;
  justify-content: center;
  border: 1px solid #1A4D3A !important;
}

/* Custom Forest Green Button Overrides */
:deep(.v-btn.bg-primary), 
:deep(.v-btn.color-primary) {
  background-color: #1A4D3A !important;
  color: white !important;
}

:deep(.v-btn.bg-secondary) {
  background-color: #2D5A27 !important; /* Darker green variant for secondary */
  color: white !important;
}

.calendar-card { 
  overflow: hidden; 
  border: 1px solid #1A4D3A; 
  border-radius: 8px; 
}

/* 2. TOOLBAR & HEADER */
.calendar-toolbar {
  background-color: #F8FAF9 !important;
  border-bottom: 1px solid #1A4D3A;
}

/* 3. MONTH VIEW */
.month-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border-top: 1px solid #1A4D3A;
  border-left: 1px solid #1A4D3A;
  background-color: #FFFFFF;
}

.month-day {
  min-height: 120px;
  padding: 8px;
  cursor: pointer;
  border-right: 1px solid #1A4D3A;
  border-bottom: 1px solid #1A4D3A;
  transition: all 0.2s ease;
}

/* TODAY HIGHLIGHT - MONTH VIEW */
.month-day.is-today {
  background-color: rgba(26, 77, 58, 0.05);
  box-shadow: inset 0 0 0 2px #1A4D3A; 
  position: relative;
}

.month-day.is-today .day-number {
  color: #1A4D3A !important;
  font-weight: 900;
}

.month-day.is-today .day-number::after {
  content: 'TODAY';
  font-size: 0.6rem;
  background: #1A4D3A;
  color: #FFFFFF;
  padding: 2px 4px;
  border-radius: 2px;
  margin-left: 6px;
}

.month-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background-color: #1A4D3A; 
  color: #FFFFFF;
}

.header-day {
  padding: 10px;
  text-align: center;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.8rem;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
}

/* 4. DAY VIEW */
.day-view {
  border-top: 1px solid #1A4D3A;
  background-color: #FFFFFF;
}

.day-view .time-slot {
  display: flex;
  min-height: 100px;
  border-bottom: 1px solid #1A4D3A;
}

.time-label {
  width: 100px;
  padding: 10px;
  background-color: #F0F4F2;
  border-right: 1px solid #1A4D3A;
  font-weight: 700;
  color: #1A4D3A;
}

/* 5. WEEK VIEW */
.week-view {
  display: flex;
  flex-direction: column;
  background-color: #FFFFFF;
  border-top: 1px solid #1A4D3A;
}

.week-header {
  display: grid;
  grid-template-columns: 100px repeat(7, 1fr);
  background-color: #1A4D3A;
  color: #FFFFFF;
  border-left: 1px solid #1A4D3A;
}

.week-header .day-column.is-today {
  background-color: #2D5A27; 
  box-shadow: inset 0 -5px 0px #FFD700; 
}

.week-body {
  display: grid;
  grid-template-columns: 100px repeat(7, 1fr);
  border-left: 1px solid #1A4D3A;
}

.week-body .time-column {
  background-color: #F0F4F2;
  border-right: 1px solid #1A4D3A;
}

.hour-marker, .hour-slot {
  height: 95px;
  border-bottom: 1px solid rgba(26, 77, 58, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.hour-marker {
  font-size: 0.75rem;
  font-weight: 800;
  color: #1A4D3A;
}

.week-body .day-column {
  border-right: 1px solid #1A4D3A;
}

/* 6. APPOINTMENTS & INDICATORS */
.appointment-indicator {
  font-size: 10px;
  padding: 4px 6px;
  border-radius: 4px;
  color: white;
  margin-bottom: 2px;
  background-color: #2D5A27; /* Forest green indicator */
}

.appointment-indicator.in-queue { 
  border: 2px solid #FFD700 !important;
  font-weight: bold;
}

.appointment-card {
  border-left: 4px solid #1A4D3A !important;
}

/* 7. TEXT & BADGES */
.text-primary { color: #1A4D3A !important; }

.day-count-badge {
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 4px;
  color: #FFFFFF;
  background-color: #1A4D3A !important;
  margin-left: auto;
}

/* Capacity Classes */
.bg-success { background-color: #2D5A27 !important; }
.bg-warning { background-color: #8B7355 !important; } /* Muted earthy gold */
.bg-error { background-color: #7A2626 !important; } /* Deep red */

/* Hover Effects */
.month-day:hover, .hour-slot:hover {
  background-color: rgba(26, 77, 58, 0.08);
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-thumb {
  background: #1A4D3A;
  border-radius: 10px;
}

@media (max-width: 960px) {
  .week-header, .week-body {
    grid-template-columns: 60px repeat(7, 1fr);
  }
}
</style>