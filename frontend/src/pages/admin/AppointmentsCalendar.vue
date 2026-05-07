<!-- frontend/src/pages/admin/AppointmentsCalendar.vue -->
<template>
  <div>
    <!-- Header Section -->
    <v-container fluid class="pa-3 pa-md-6">
      <v-row class="mb-4 align-center">
        <v-col cols="12" md="6" class="text-center text-md-left">
          <div>
        <h1 class="text-h5 text-md-h4 font-weight-bold text-primary">
          Appointments Calendar
        </h1>
        <p class="text-body-2 text-medium-emphasis mt-1">
          View and manage all appointments
        </p>
      </div>
        </v-col>

        <v-col cols="12" md="6" class="text-center text-md-right mt-3 mt-md-0">
          <v-btn 
            color="secondary" 
            size="small" 
            prepend-icon="mdi-plus" 
            @click="openCreateDialog" 
            class="mr-2"
          >
            New
          </v-btn>
          <v-btn 
            color="primary" 
            variant="outlined" 
            size="small" 
            prepend-icon="mdi-format-list-numbered" 
            @click="goToQueue"
          >
            Queue
          </v-btn>
        </v-col>
      </v-row>

      <!-- Quick Stats Row -->
      <v-row class="mb-4">
        <v-col cols="6" sm="3" v-for="stat in quickStats" :key="stat.title">
          <v-card class="stat-card" elevation="1" @click="stat.clickable ? stat.onClick() : null">
            <v-card-text class="pa-3 pa-sm-4 text-center">
              <v-icon :color="stat.color" size="24" class="mb-1">{{ stat.icon }}</v-icon>
              <div class="text-h5 text-md-h4 font-weight-bold" :class="`text-${stat.color}`">
                {{ stat.value }}
              </div>
              <div class="text-caption text-medium-emphasis">{{ stat.title }}</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Filter Section -->
      <v-row class="mb-4">
        <v-col cols="12">
          <v-card class="filter-card" elevation="1">
            <v-card-text class="pa-3">
              <v-row dense>
                <v-col cols="12" sm="4">
                  <v-select 
                    v-model="filters.appointmentType" 
                    :items="appointmentTypes" 
                    item-title="type_name" 
                    item-value="id"
                    label="Appointment Type" 
                    clearable 
                    density="compact"
                    variant="outlined"
                    hide-details
                    @update:model-value="fetchAppointments"
                  />
                </v-col>
                <v-col cols="12" sm="4">
                  <v-select 
                    v-model="filters.status" 
                    :items="statusOptions" 
                    label="Status" 
                    clearable 
                    density="compact"
                    variant="outlined"
                    hide-details
                    @update:model-value="fetchAppointments"
                  />
                </v-col>
                <v-col cols="12" sm="4">
                  <v-text-field 
                    v-model="filters.search" 
                    label="Search Patient" 
                    prepend-inner-icon="mdi-magnify" 
                    clearable 
                    density="compact"
                    variant="outlined"
                    hide-details
                    @update:model-value="debouncedSearch"
                  />
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Calendar Toolbar -->
      <v-card class="calendar-toolbar-card mb-4" elevation="1">
        <v-card-text class="pa-2 pa-sm-3">
          <div class="d-flex flex-wrap align-center justify-space-between">
            <div class="d-flex align-center">
              <v-btn icon size="small" variant="text" @click="previousPeriod" color="primary">
                <v-icon>mdi-chevron-left</v-icon>
              </v-btn>
              <v-btn size="small" variant="text" @click="goToToday" color="primary" class="mx-1">
                Today
              </v-btn>
              <v-btn icon size="small" variant="text" @click="nextPeriod" color="primary">
                <v-icon>mdi-chevron-right</v-icon>
              </v-btn>
              <span class="ml-3 text-subtitle-2 font-weight-medium">{{ calendarTitle }}</span>
            </div>

            <div class="d-flex mt-2 mt-sm-0">
              <v-btn-toggle v-model="calendarView" mandatory density="compact" color="primary" divided>
                <v-btn value="day" size="small">Day</v-btn>
                <v-btn value="week" size="small">Week</v-btn>
                <v-btn value="month" size="small">Month</v-btn>
              </v-btn-toggle>
            </div>
          </div>
        </v-card-text>
      </v-card>

      <!-- Calendar -->
      <v-card class="calendar-card" elevation="2">
        <v-skeleton-loader v-if="loading" type="table" class="pa-4" />
        <v-sheet v-else class="calendar-sheet">
          <!-- Day View -->
          <div v-if="calendarView === 'day'" class="day-view">
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
                            Confirm & Queue
                          </v-btn>
                        </div>
                      </v-card>
                    </v-hover>
                  </template>
                </div>
              </div>
            </div>
          </div>

          <!-- Week View -->
          <div v-else-if="calendarView === 'week'" class="week-view">
            <div class="week-header">
              <div class="time-column"></div>
              <div v-for="day in weekDays" :key="day.date" class="day-column" :class="{ 'is-today': day.isToday }">
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
                          <span v-if="appointment.in_queue" class="indicator-queue">#{{ appointment.queue_number }}</span>
                        </div>
                      </template>
                      <span>
                        {{ appointment.patient_first_name }} {{ appointment.patient_last_name }} - {{ appointment.type_name }}
                        <span v-if="appointment.in_queue"> (Queue: #{{ appointment.queue_number }})</span>
                      </span>
                    </v-tooltip>
                  </template>
                </div>
              </div>
            </div>
          </div>

          <!-- Month View -->
          <div v-else class="month-view">
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
                </div>
                <div class="day-appointments">
                  <div v-for="appointment in getAppointmentsForDay(day.date).slice(0, 3)" :key="appointment.id"
                    class="appointment-indicator mini" :class="{
                      [appointment.status.toLowerCase()]: true,
                      'in-queue': appointment.in_queue
                    }" @click.stop="openAppointmentDetails(appointment)">
                    <span class="indicator-time">{{ formatShortTime(appointment.scheduled_at) }}</span>
                    <span class="indicator-name">{{ appointment.patient_last_name }}</span>
                    <span v-if="appointment.in_queue" class="indicator-queue-mini">#{{ appointment.queue_number }}</span>
                  </div>
                  <div v-if="getAppointmentsForDay(day.date).length > 3"
                    class="more-appointments text-caption text-primary" @click.stop="showDayDetails(day.date)">
                    +{{ getAppointmentsForDay(day.date).length - 3 }} more
                  </div>
                </div>
              </div>
            </div>
          </div>
        </v-sheet>
      </v-card>
    </v-container>

    <!-- Appointment Details Dialog -->
    <v-dialog v-model="detailsDialog" max-width="500px" :fullscreen="$vuetify.display.smAndDown">
      <v-card v-if="selectedAppointment">
        <v-toolbar color="primary">
          <v-toolbar-title class="text-subtitle-1">
            Appointment Details
          </v-toolbar-title>
          <v-spacer />
          <v-btn icon @click="detailsDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-toolbar>

        <v-card-text class="pa-4">
          <div class="d-flex justify-space-between align-center mb-4 flex-wrap gap-2">
            <v-chip :color="getStatusColor(selectedAppointment.status)" text-color="white" size="small">
              {{ selectedAppointment.status }}
            </v-chip>
            <v-chip v-if="selectedAppointment.in_queue" color="success" text-color="white" size="small">
              <v-icon left size="14">mdi-format-list-numbered</v-icon>
              Queue #{{ selectedAppointment.queue_number }}
            </v-chip>
          </div>

          <v-divider class="mb-4" />

          <v-list density="compact" class="bg-transparent">
            <v-list-item>
              <template v-slot:prepend>
                <v-icon color="primary">mdi-calendar-text</v-icon>
              </template>
              <v-list-item-title class="text-caption text-medium-emphasis">Appointment Number</v-list-item-title>
              <v-list-item-subtitle class="text-body-2 font-weight-medium">
                {{ selectedAppointment.appointment_number }}
              </v-list-item-subtitle>
            </v-list-item>

            <v-list-item @click="goToPatientProfile">
              <template v-slot:prepend>
                <v-icon color="primary">mdi-account</v-icon>
              </template>
              <v-list-item-title class="text-caption text-medium-emphasis">Patient</v-list-item-title>
              <v-list-item-subtitle class="text-body-2 font-weight-medium">
                {{ selectedAppointment.patient_first_name }} {{ selectedAppointment.patient_last_name }}
                <span class="text-caption d-block">{{ selectedAppointment.patient_facility_code }}</span>
              </v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <template v-slot:prepend>
                <v-icon color="primary">mdi-calendar-clock</v-icon>
              </template>
              <v-list-item-title class="text-caption text-medium-emphasis">Date & Time</v-list-item-title>
              <v-list-item-subtitle class="text-body-2 font-weight-medium">
                {{ formatFullDate(selectedAppointment.scheduled_at) }}
              </v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <template v-slot:prepend>
                <v-icon color="primary">mdi-clipboard-text</v-icon>
              </template>
              <v-list-item-title class="text-caption text-medium-emphasis">Type</v-list-item-title>
              <v-list-item-subtitle>
                <v-chip :color="getTypeColor(selectedAppointment.type_name)" text-color="white" size="x-small">
                  {{ selectedAppointment.type_name }}
                </v-chip>
              </v-list-item-subtitle>
            </v-list-item>

            <v-list-item v-if="selectedAppointment.notes">
              <template v-slot:prepend>
                <v-icon color="primary">mdi-note-text</v-icon>
              </template>
              <v-list-item-title class="text-caption text-medium-emphasis">Notes</v-list-item-title>
              <v-list-item-subtitle class="text-body-2">
                {{ selectedAppointment.notes }}
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-3 flex-wrap gap-2">
          <v-btn variant="text" size="small" @click="detailsDialog = false">
            Close
          </v-btn>
          <v-btn color="primary" variant="flat" size="small" @click="editAppointment">
            <v-icon left size="16">mdi-pencil</v-icon>
            Edit
          </v-btn>
          <v-btn 
            v-if="canConfirm(selectedAppointment)" 
            color="success" 
            variant="flat" 
            size="small"
            @click="confirmAndAddToQueue(selectedAppointment)" 
            :loading="confirmingId === selectedAppointment.id"
          >
            <v-icon left size="16">mdi-check</v-icon>
            Confirm & Queue
          </v-btn>
          <v-btn 
            v-if="selectedAppointment.in_queue" 
            color="info" 
            variant="flat" 
            size="small"
            @click="goToQueue"
          >
            <v-icon left size="16">mdi-format-list-numbered</v-icon>
            View Queue
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Create/Edit Appointment Dialog -->
    <v-dialog v-model="appointmentDialog" max-width="500px" :fullscreen="$vuetify.display.smAndDown">
      <v-card>
        <v-toolbar :color="editingAppointment ? 'primary' : 'secondary'">
          <v-toolbar-title class="text-subtitle-1">
            <v-icon left size="20">{{ editingAppointment ? 'mdi-pencil' : 'mdi-plus-circle' }}</v-icon>
            {{ editingAppointment ? 'Edit Appointment' : 'New Appointment' }}
          </v-toolbar-title>
          <v-spacer />
          <v-btn icon @click="closeAppointmentDialog">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-toolbar>

        <v-card-text class="pa-4">
          <v-alert v-if="isSelectedDateAtCapacity && !editingAppointment" type="error" variant="tonal" class="mb-4" density="compact">
            <div class="d-flex align-center">
              <v-icon class="mr-2" size="18">mdi-alert-circle</v-icon>
              <span class="text-caption">This date has reached maximum capacity (16/16 appointments)</span>
            </div>
          </v-alert>

          <v-form ref="appointmentForm" v-model="formValid">
            <v-autocomplete 
              v-model="formData.patient" 
              :items="patients"
              :item-title="(item) => `${item.last_name}, ${item.first_name} (${item.patient_facility_code})`"
              :item-value="(item) => item" 
              label="Select Patient" 
              density="comfortable"
              :rules="[v => !!v || 'Patient is required']" 
              :loading="searchingPatients" 
              @update:search="searchPatients" 
              return-object 
              clearable
              variant="outlined"
            >
              <template v-slot:item="{ props, item }">
                <v-list-item v-bind="props">
                  <v-list-item-title class="text-body-2">
                    {{ item.raw.last_name }}, {{ item.raw.first_name }}
                  </v-list-item-title>
                  <v-list-item-subtitle class="text-caption">
                    {{ item.raw.patient_facility_code }} | {{ item.raw.hiv_status }}
                  </v-list-item-subtitle>
                </v-list-item>
              </template>
            </v-autocomplete>

            <v-select 
              v-model="formData.appointment_type_id" 
              :items="appointmentTypes" 
              item-title="type_name"
              item-value="id" 
              label="Appointment Type" 
              density="comfortable"
              :rules="[v => !!v || 'Appointment type is required']" 
              variant="outlined"
              class="mt-3"
              @update:model-value="updateDuration" 
            />

            <v-text-field 
              v-model="formData.duration" 
              label="Duration (minutes)" 
              type="number" 
              density="comfortable"
              readonly 
              disabled 
              variant="outlined"
              class="mt-3"
            />

            <v-row dense class="mt-3">
              <v-col cols="12" sm="6">
                <v-text-field 
                  v-model="formData.scheduled_date" 
                  label="Date" 
                  type="date" 
                  density="comfortable"
                  :rules="[v => !!v || 'Date is required']" 
                  :min="minDate" 
                  variant="outlined"
                  @update:model-value="checkAvailability" 
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-select 
                  v-model="formData.scheduled_time" 
                  :items="availableTimeSlots" 
                  item-title="display"
                  item-value="time" 
                  label="Time" 
                  density="comfortable"
                  :rules="[v => !!v || 'Time is required']"
                  :disabled="!formData.scheduled_date || checkingAvailability || isSelectedDateAtCapacity"
                  :loading="checkingAvailability" 
                  variant="outlined"
                />
              </v-col>
            </v-row>

            <v-textarea 
              v-model="formData.notes" 
              label="Notes" 
              density="comfortable"
              rows="2" 
              variant="outlined"
              class="mt-3"
            />
          </v-form>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-3">
          <v-spacer />
          <v-btn variant="text" size="small" @click="closeAppointmentDialog">
            Cancel
          </v-btn>
          <v-btn 
            color="primary" 
            variant="flat" 
            size="small"
            :loading="saving"
            :disabled="isSelectedDateAtCapacity && !editingAppointment" 
            @click="saveAppointment"
          >
            {{ editingAppointment ? 'Update' : 'Create' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000" location="top">
      <div class="d-flex align-center">
        <v-icon left size="20" class="mr-2">{{ getSnackbarIcon(snackbar.color) }}</v-icon>
        {{ snackbar.text }}
      </div>
      <template v-slot:actions>
        <v-btn color="white" variant="text" size="small" @click="snackbar.show = false">
          Close
        </v-btn>
      </template>
    </v-snackbar>
  </div>
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

    const MAX_DAILY_APPOINTMENTS = 16
    const workingHours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17]
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    const statusOptions = [
      { title: 'All Statuses', value: null },
      { title: 'Scheduled', value: 'SCHEDULED' },
      { title: 'Confirmed', value: 'CONFIRMED' },
      { title: 'In Progress', value: 'IN_PROGRESS' },
      { title: 'Completed', value: 'COMPLETED' },
      { title: 'Cancelled', value: 'CANCELLED' },
      { title: 'No Show', value: 'NO_SHOW' }
    ]

    const minDate = computed(() => format(new Date(), 'yyyy-MM-dd'))

    // Quick Stats
    const quickStats = computed(() => {
      const today = format(new Date(), 'yyyy-MM-dd')
      const todayApps = appointments.value.filter(a =>
        format(parseISO(a.scheduled_at), 'yyyy-MM-dd') === today
      )

      return [
        { 
          title: 'Today\'s Appointments', 
          value: `${todayApps.length}/${MAX_DAILY_APPOINTMENTS}`, 
          icon: 'mdi-calendar-today', 
          color: 'primary',
          clickable: false
        },
        { 
          title: 'Waiting in Queue', 
          value: currentQueue.value.waiting?.length || 0, 
          icon: 'mdi-account-clock', 
          color: 'warning',
          clickable: true,
          onClick: () => goToQueue()
        },
        { 
          title: 'Confirmed Today', 
          value: todayApps.filter(a => a.status === 'CONFIRMED').length, 
          icon: 'mdi-check-circle', 
          color: 'info',
          clickable: false
        },
        { 
          title: 'Completed Today', 
          value: todayApps.filter(a => a.status === 'COMPLETED').length, 
          icon: 'mdi-check-all', 
          color: 'success',
          clickable: false
        }
      ]
    })

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

    const isSelectedDateAtCapacity = computed(() => {
      if (!formData.scheduled_date) return false
      return getAppointmentsCountForDay(formData.scheduled_date) >= MAX_DAILY_APPOINTMENTS
    })

    // Helper Functions
    const getAppointmentsForDay = (date) => {
      const dateStr = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd')
      return appointments.value.filter(a =>
        format(parseISO(a.scheduled_at), 'yyyy-MM-dd') === dateStr
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

    const getSnackbarIcon = (color) => {
      const icons = {
        success: 'mdi-check-circle',
        error: 'mdi-alert-circle',
        warning: 'mdi-alert',
        info: 'mdi-information'
      }
      return icons[color] || 'mdi-information'
    }

    // API Calls
    const fetchAppointmentTypes = async () => {
      try {
        const response = await appointmentsApi.getTypes()
        appointmentTypes.value = Array.isArray(response) ? response : 
                                  (response?.data ? (Array.isArray(response.data) ? response.data : []) : [])
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
        if (Array.isArray(response)) {
          appointmentsData = response
        } else if (response?.data && Array.isArray(response.data)) {
          appointmentsData = response.data
        } else if (response?.items && Array.isArray(response.items)) {
          appointmentsData = response.items
        }
        
        appointments.value = await Promise.all(
          appointmentsData.map(async (app) => {
            try {
              const queueCheck = await queueApi.checkAppointmentInQueue(app.id)
              return {
                ...app,
                in_queue: queueCheck?.in_queue || false,
                queue_number: queueCheck?.queue_number
              }
            } catch (error) {
              return { ...app, in_queue: false }
            }
          })
        )
      } catch (error) {
        console.error('Error fetching appointments:', error)
        showSnackbar('Failed to load appointments', 'error')
      } finally {
        loading.value = false
      }
    }

    const fetchQueueData = async () => {
      try {
        const response = await queueApi.getCurrent()
        currentQueue.value = {
          waiting: response?.waiting || [],
          called: response?.called || [],
          serving: response?.serving || []
        }
      } catch (error) {
        console.error('Error fetching queue:', error)
      }
    }

    const checkAvailability = async () => {
      if (!formData.scheduled_date || !formData.appointment_type_id) return

      checkingAvailability.value = true
      try {
        const response = await appointmentsApi.checkAvailability({
          date: formData.scheduled_date,
          type_id: parseInt(formData.appointment_type_id)
        })

        let slots = []
        if (response?.slots && Array.isArray(response.slots)) {
          slots = response.slots
        } else if (response?.data?.slots && Array.isArray(response.data.slots)) {
          slots = response.data.slots
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
            display: slot.display || `${slot.time}`
          }))
      } catch (error) {
        console.error('Error checking availability:', error)
        availableTimeSlots.value = []
      } finally {
        checkingAvailability.value = false
      }
    }

    const searchPatients = debounce(async (search) => {
      if (!search || search.length < 3) {
        patients.value = []
        return
      }

      searchingPatients.value = true
      try {
        const response = await patientsApi.search(search, 10)
        patients.value = Array.isArray(response) ? response : 
                        (response?.data ? (Array.isArray(response.data) ? response.data : []) : [])
      } catch (error) {
        console.error('Error searching patients:', error)
      } finally {
        searchingPatients.value = false
      }
    }, 500)

    // Navigation
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

    const goToToday = () => {
      selectedDate.value = new Date()
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

    // Appointment Actions
    const openAppointmentDetails = (appointment) => {
      selectedAppointment.value = appointment
      detailsDialog.value = true
    }

    const confirmAndAddToQueue = async (appointment) => {
      confirmingId.value = appointment.id
      try {
        const response = await queueApi.confirmAppointment(appointment.id)
        if (response?.data?.success !== false) {
          showSnackbar(`Appointment #${appointment.appointment_number} confirmed and added to queue`, 'success')
          await Promise.all([
            fetchQueueData(),
            fetchAppointments()
          ])
          detailsDialog.value = false
        } else {
          showSnackbar(response?.data?.message || 'Failed to confirm appointment', 'error')
        }
      } catch (error) {
        console.error('Error confirming appointment:', error)
        const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to confirm appointment'
        showSnackbar(errorMessage, 'error')
      } finally {
        confirmingId.value = null
      }
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
      
      setTimeout(() => {
        checkAvailability()
      }, 100)
    }

    const closeAppointmentDialog = () => {
      appointmentDialog.value = false
      setTimeout(() => {
        resetForm()
        if (appointmentForm.value) {
          appointmentForm.value.reset()
        }
      }, 200)
    }

    const saveAppointment = async () => {
      if (!appointmentForm.value?.validate()) return
      if (!formData.patient) {
        showSnackbar('Please select a patient', 'error')
        return
      }

      saving.value = true
      try {
        const scheduledDateTime = `${formData.scheduled_date}T${formData.scheduled_time}:00`
        
        const appointmentData = {
          patient_id: parseInt(formData.patient.id),
          appointment_type_id: parseInt(formData.appointment_type_id),
          scheduled_at: scheduledDateTime,
          notes: formData.notes || null
        }

        if (editingAppointment.value && selectedAppointment.value) {
          await appointmentsApi.update(selectedAppointment.value.id, appointmentData)
          showSnackbar('Appointment updated successfully', 'success')
        } else {
          await appointmentsApi.create(appointmentData)
          showSnackbar('Appointment created successfully', 'success')
        }

        closeAppointmentDialog()
        await fetchAppointments()
      } catch (error) {
        console.error('Error saving appointment:', error)
        showSnackbar(error.response?.data?.message || 'Failed to save appointment', 'error')
      } finally {
        saving.value = false
      }
    }

    const goToQueue = () => {
      router.push('/admin/queue')
    }

    const goToPatientProfile = () => {
      if (selectedAppointment.value) {
        router.push(`/admin/patients/${selectedAppointment.value.patient_id}`)
      }
    }

    const updateDuration = () => {
      const type = appointmentTypes.value.find(t => t.id === formData.appointment_type_id)
      if (type) {
        formData.duration = type.duration_minutes || 30
      }
    }

    // Formatting Utilities
    const formatHour = (hour) => {
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const hour12 = hour % 12 || 12
      return `${hour12}:00 ${ampm}`
    }

    const formatTime = (datetime) => format(parseISO(datetime), 'h:mm a')
    const formatShortTime = (datetime) => format(parseISO(datetime), 'h:mm a')
    const formatFullDate = (datetime) => format(parseISO(datetime), 'MMM d, yyyy h:mm a')

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
      snackbar.value = { show: true, text, color }
    }

    const debouncedSearch = debounce(() => {
      fetchAppointments()
    }, 500)

    // Watchers
    watch([selectedDate, () => calendarView.value], () => {
      fetchAppointments()
    })

    watch(() => filters.appointmentType, () => {
      fetchAppointments()
    })

    watch(() => filters.status, () => {
      fetchAppointments()
    })

    watch(() => [formData.scheduled_date, formData.appointment_type_id], () => {
      if (formData.scheduled_date && formData.appointment_type_id) {
        checkAvailability()
      }
    })

    watch(() => formData.patient, (newPatient) => {
      formData.patient_id = newPatient?.id || null
    })

    // Lifecycle
    onMounted(async () => {
      await fetchAppointmentTypes()
      await fetchQueueData()
      await fetchAppointments()
    })

    return {
      loading, saving, checkingAvailability, searchingPatients, confirmingId,
      appointments, appointmentTypes, patients, selectedDate, calendarView,
      detailsDialog, appointmentDialog, editingAppointment, selectedAppointment,
      appointmentForm, formValid, availableTimeSlots, filters, formData, snackbar,
      workingHours, dayNames, statusOptions, minDate, MAX_DAILY_APPOINTMENTS,
      calendarTitle, quickStats, weekDays, calendarDays, isSelectedDateAtCapacity,
      previousPeriod, nextPeriod, goToToday, selectDate, showDayDetails,
      getAppointmentsForDay, getAppointmentsForTimeSlot, getAppointmentsForDayAndTime,
      getAppointmentsCountForDay, canConfirm, confirmAndAddToQueue,
      openAppointmentDetails, openCreateDialog, editAppointment, closeAppointmentDialog,
      saveAppointment, goToQueue, goToPatientProfile, updateDuration,
      formatHour, formatTime, formatShortTime, formatFullDate,
      getInitials, getTypeColor, getStatusColor, getDayCapacityClass,
      getSnackbarIcon, debouncedSearch, fetchAppointments, searchPatients, checkAvailability
    }
  }
}
</script>

<style scoped>
/* ===== LAYOUT & VUETIFY OVERRIDES ===== */

/* Text color override for primary text elements */
.text-primary {
  color: #2d8a08 !important;
}

/* ===== STAT CARDS ===== */
.stat-card {
  transition: all 0.3s ease;
  cursor: pointer;
  border-radius: 12px;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(45, 138, 8, 0.1) !important;
}

/* ===== FILTER & TOOLBAR CARDS ===== */
.filter-card,
.calendar-toolbar-card,
.calendar-card {
  border-radius: 12px;
}

/* ===== DAY VIEW ===== */
.day-view {
  border-top: 1px solid rgba(0, 0, 0, 0.12);
}

.day-view .time-slot {
  display: flex;
  min-height: 100px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

.time-label {
  width: 100px;
  padding: 10px;
  background-color: #F8FAF9;
  border-right: 1px solid rgba(0, 0, 0, 0.12);
  font-weight: 700;
}

.slot-appointments {
  flex: 1;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.appointment-card {
  border-left: 4px solid #2d8a08 !important;
  cursor: pointer;
  transition: all 0.2s ease;
}

.appointment-card.hover {
  transform: translateX(4px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.appointment-card.in-queue {
  border-left: 4px solid #FFD700 !important;
  background-color: #FFF9E6;
}

.appointment-time {
  font-size: 0.75rem;
  color: #666;
}

.appointment-patient {
  font-size: 0.875rem;
}

/* ===== WEEK VIEW ===== */
.week-view {
  display: flex;
  flex-direction: column;
  border-top: 1px solid rgba(0, 0, 0, 0.12);
}

.week-header {
  display: grid;
  grid-template-columns: 100px repeat(7, 1fr);
  background-color: #2d8a08;
  border-left: 1px solid #2d8a08;
}

.week-header .day-column {
  padding: 12px;
  text-align: center;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
}

.week-header .day-column.is-today {
  background-color: rgba(0, 0, 0, 0.1);
}

.day-name {
  font-weight: 600;
  font-size: 0.875rem;
}

.day-number {
  font-size: 1.25rem;
  font-weight: bold;
}

.day-count {
  font-size: 0.7rem;
  opacity: 0.9;
}

.week-body {
  display: grid;
  grid-template-columns: 100px repeat(7, 1fr);
  border-left: 1px solid rgba(0, 0, 0, 0.12);
}

.week-body .time-column {
  background-color: #F8FAF9;
  border-right: 1px solid rgba(0, 0, 0, 0.12);
}

.hour-marker, .hour-slot {
  height: 95px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
}

.hour-marker {
  font-size: 0.75rem;
  font-weight: 800;
}

.week-body .day-column {
  border-right: 1px solid rgba(0, 0, 0, 0.12);
  position: relative;
}

.appointment-indicator {
  font-size: 10px;
  padding: 4px 6px;
  border-radius: 4px;
  color: white;
  margin-bottom: 2px;
  background-color: #2d8a08;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  text-align: center;
}

.appointment-indicator:hover {
  transform: scale(1.02);
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.appointment-indicator.in-queue {
  border: 2px solid #FFD700;
  font-weight: bold;
}

/* Status colors for indicators */
.appointment-indicator.scheduled {
  background-color: #FFC107;
  color: #000;
}
.appointment-indicator.confirmed {
  background-color: #2196F3;
}
.appointment-indicator.in_progress {
  background-color: #2d8a08;
}
.appointment-indicator.completed {
  background-color: #4CAF50;
}
.appointment-indicator.cancelled,
.appointment-indicator.no_show {
  background-color: #B00020;
}

.indicator-queue {
  margin-left: 4px;
  font-weight: bold;
}

/* ===== MONTH VIEW ===== */
.month-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background-color: #2d8a08;
  color: white;
}

.header-day {
  padding: 12px;
  text-align: center;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.8rem;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
}

.month-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border-top: 1px solid rgba(0, 0, 0, 0.12);
  border-left: 1px solid rgba(0, 0, 0, 0.12);
}

.month-day {
  min-height: 120px;
  padding: 8px;
  cursor: pointer;
  border-right: 1px solid rgba(0, 0, 0, 0.12);
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
  transition: all 0.2s ease;
}

.month-day:hover {
  background-color: rgba(45, 138, 8, 0.05);
}

.month-day.is-today {
  background-color: rgba(45, 138, 8, 0.08);
  box-shadow: inset 0 0 0 2px #2d8a08;
}

.month-day.is-today .day-number {
  color: #2d8a08;
  font-weight: 900;
}

.month-day.other-month {
  background-color: #F8FAF9;
  color: #999;
}

.day-number {
  font-weight: 500;
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.day-count-badge {
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 4px;
  color: white;
}

.bg-success { background-color: #4CAF50 !important; }
.bg-warning { background-color: #FFC107 !important; color: #000 !important; }
.bg-error { background-color: #B00020 !important; }

.day-appointments {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.appointment-indicator.mini {
  font-size: 9px;
  padding: 2px 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.indicator-time {
  font-size: 8px;
  opacity: 0.9;
}

.indicator-queue-mini {
  background-color: #FFD700;
  color: #000;
  border-radius: 10px;
  padding: 1px 4px;
  font-size: 8px;
  margin-left: 4px;
}

.more-appointments {
  font-size: 0.7rem;
  margin-top: 4px;
  cursor: pointer;
}

.more-appointments:hover {
  text-decoration: underline;
}

/* ===== UTILITY CLASSES ===== */
.gap-2 {
  gap: 8px;
}

/* ===== SCROLLBAR ===== */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: #E0E8E4;
  border-radius: 10px;
}

::-webkit-scrollbar-thumb {
  background: #2d8a08;
  border-radius: 10px;
}

::-webkit-scrollbar-thumb:hover {
  background: #1e5c06;
}

/* ===== MOBILE RESPONSIVE ===== */
@media (max-width: 600px) {
  .appointments-calendar {
    padding-bottom: 70px;
  }
  
  .time-label {
    width: 60px;
    font-size: 0.7rem;
  }
  
  .week-header,
  .week-body {
    grid-template-columns: 60px repeat(7, 1fr);
  }
  
  .month-day {
    min-height: 80px;
    padding: 4px;
  }
  
  .day-number {
    font-size: 0.8rem;
  }
  
  .appointment-indicator.mini {
    font-size: 7px;
  }
}
</style>