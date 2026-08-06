<!-- frontend/src/views/kiosk/KioskCheckinView.vue -->
<template>
  <div class="kiosk-checkin">
    <!-- Welcome Message -->
    <v-card class="mb-6" elevation="2" border="primary">
      <v-card-text class="text-center pa-8">
        <v-icon 
          size="72" 
          color="primary" 
          class="mb-4"
          :style="{ opacity: 0.9 }"
        >
          mdi-hand-wave
        </v-icon>
        <div class="text-h3 font-weight-bold" style="color: rgb(var(--v-theme-primary));">
          Welcome to HIV Clinic
        </div>
        <div class="text-subtitle-1 text-medium-emphasis mt-2">
          Please select your check-in option below
        </div>
      </v-card-text>
    </v-card>

    <!-- Check-in Options -->
    <v-row>
      <v-col cols="12" md="6">
        <v-card 
          class="checkin-card"
          elevation="4"
          @click="showAppointmentCheckin = true"
          hover
          :ripple="true"
          border="primary"
        >
          <v-card-text class="text-center pa-8">
            <v-icon 
              size="72" 
              color="primary" 
              class="mb-4"
              :style="{ opacity: 0.85 }"
            >
              mdi-calendar-check
            </v-icon>
            <div class="text-h5 font-weight-bold" style="color: rgb(var(--v-theme-primary));">
              I Have an Appointment
            </div>
            <div class="text-subtitle-1 text-medium-emphasis">
              Check-in with your appointment
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card 
          class="checkin-card"
          elevation="4"
          @click="showWalkinDialog = true"
          hover
          :ripple="true"
          border="warning"
        >
          <v-card-text class="text-center pa-8">
            <v-icon 
              size="72" 
              color="warning" 
              class="mb-4"
              :style="{ opacity: 0.85 }"
            >
              mdi-walk
            </v-icon>
            <div class="text-h5 font-weight-bold" style="color: rgb(var(--v-theme-warning));">
              Walk-in
            </div>
            <div class="text-subtitle-1 text-medium-emphasis">
              No appointment? We'll help you
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Appointment Check-in Dialog -->
    <v-dialog v-model="showAppointmentCheckin" max-width="500" persistent>
      <v-card>
        <v-card-title class="text-h5 pa-4" style="background-color: rgb(var(--v-theme-primary)); color: white;">
          <v-icon color="white" class="mr-2">mdi-calendar-check</v-icon>
          Appointment Check-in
        </v-card-title>
        
        <v-card-text class="pa-6">
          <v-form ref="appointmentForm" @submit.prevent="checkInWithAppointment">
            <div class="text-subtitle-2 text-medium-emphasis mb-2">
              Enter your Phone Number
            </div>
            
            <div class="d-flex align-center">
              <v-text-field
                v-model="appointmentPhone"
                label="Phone Number"
                placeholder="Tap to enter"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-phone"
                clearable
                :rules="[v => !!v || 'Phone number is required', v => v.length >= 10 || 'Phone number must be at least 10 digits']"
                color="primary"
                readonly
                hide-details="auto"
                class="flex-grow-1"
                @click="openKeyboard('appointment')"
              ></v-text-field>
              <v-btn
                icon="mdi-keyboard"
                variant="text"
                color="primary"
                class="ml-2"
                size="large"
                @click="openKeyboard('appointment')"
              ></v-btn>
            </div>

            <v-alert
              v-if="appointmentError"
              type="error"
              variant="tonal"
              class="mt-2"
              closable
              @click:close="appointmentError = ''"
            >
              {{ appointmentError }}
            </v-alert>

            <div class="d-flex justify-space-between mt-4">
              <v-btn
                variant="text"
                size="large"
                @click="closeAppointmentCheckin"
                prepend-icon="mdi-close"
                color="surface-variant"
              >
                Cancel
              </v-btn>
              <v-btn
                color="primary"
                type="submit"
                size="large"
                :loading="kioskStore.isCheckingIn"
                prepend-icon="mdi-check"
                :disabled="!appointmentPhone || appointmentPhone.length < 10"
              >
                Check In
              </v-btn>
            </div>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Walk-in Dialog -->
    <v-dialog v-model="showWalkinDialog" max-width="500" persistent>
      <v-card>
        <v-card-title class="text-h5 pa-4" style="background-color: rgb(var(--v-theme-warning)); color: white;">
          <v-icon color="white" class="mr-2">mdi-walk</v-icon>
          Walk-in Check-in
        </v-card-title>
        
        <v-card-text class="pa-6">
          <v-form ref="walkinForm" @submit.prevent="processWalkin">
            <div class="text-subtitle-2 font-weight-bold mb-2" style="color: rgb(var(--v-theme-primary));">
              Enter your Phone Number
            </div>
            <div class="text-caption text-medium-emphasis mb-3">
              If you're a returning patient, enter your phone number to check in.
              New patients will be registered with minimal information.
            </div>
            
            <div class="d-flex align-center">
              <v-text-field
                v-model="walkinData.phoneNumber"
                label="Phone Number"
                placeholder="Tap to enter"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-phone"
                clearable
                :rules="[v => !!v || 'Phone number is required', v => v.length >= 10 || 'Phone number must be at least 10 digits']"
                color="primary"
                readonly
                hide-details="auto"
                class="flex-grow-1"
                @click="openKeyboard('walkin')"
              ></v-text-field>
              <v-btn
                icon="mdi-keyboard"
                variant="text"
                color="primary"
                class="ml-2"
                size="large"
                @click="openKeyboard('walkin')"
              ></v-btn>
            </div>

            <!-- Minimal patient info - only for new patients -->
            <v-expand-transition>
              <div v-if="!isReturningPatient && walkinData.phoneNumber && walkinData.phoneNumber.length >= 10">
                <v-divider class="my-4">
                  <v-chip color="surface-variant" variant="text" size="small">
                    New Patient (minimal info)
                  </v-chip>
                </v-divider>

                <div class="text-caption text-medium-emphasis mb-2">
                  Please provide minimal information to create your record.
                  Staff will collect full details during consultation.
                </div>

                <v-row>
                  <v-col cols="6">
                    <div class="d-flex align-center">
                      <v-text-field
                        v-model="walkinData.firstName"
                        label="First Name"
                        placeholder="Tap to enter"
                        variant="outlined"
                        density="comfortable"
                        prepend-inner-icon="mdi-account"
                        :rules="[v => !!v || 'First name is required']"
                        color="primary"
                        readonly
                        hide-details="auto"
                        class="flex-grow-1"
                        @click="openKeyboard('firstName')"
                      ></v-text-field>
                      <v-btn
                        icon="mdi-keyboard"
                        variant="text"
                        color="primary"
                        class="ml-2"
                        size="large"
                        @click="openKeyboard('firstName')"
                      ></v-btn>
                    </div>
                  </v-col>
                  <v-col cols="6">
                    <div class="d-flex align-center">
                      <v-text-field
                        v-model="walkinData.lastName"
                        label="Last Name"
                        placeholder="Tap to enter"
                        variant="outlined"
                        density="comfortable"
                        prepend-inner-icon="mdi-account"
                        :rules="[v => !!v || 'Last name is required']"
                        color="primary"
                        readonly
                        hide-details="auto"
                        class="flex-grow-1"
                        @click="openKeyboard('lastName')"
                      ></v-text-field>
                      <v-btn
                        icon="mdi-keyboard"
                        variant="text"
                        color="primary"
                        class="ml-2"
                        size="large"
                        @click="openKeyboard('lastName')"
                      ></v-btn>
                    </div>
                  </v-col>
                </v-row>

                <div class="d-flex align-center mt-2">
                  <v-select
                    v-model="walkinData.gender"
                    :items="['male', 'female', 'other']"
                    label="Gender"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-gender-male-female"
                    :rules="[v => !!v || 'Gender is required']"
                    color="primary"
                    hide-details="auto"
                    class="flex-grow-1"
                  ></v-select>
                </div>
              </div>
            </v-expand-transition>

            <v-alert
              v-if="walkinError"
              type="error"
              variant="tonal"
              class="mt-2"
              closable
              @click:close="walkinError = ''"
            >
              {{ walkinError }}
            </v-alert>

            <div class="d-flex justify-space-between mt-4">
              <v-btn
                variant="text"
                size="large"
                @click="closeWalkin"
                prepend-icon="mdi-close"
                color="surface-variant"
              >
                Cancel
              </v-btn>
              <v-btn
                color="success"
                type="submit"
                size="large"
                :loading="kioskStore.isWalkingIn"
                prepend-icon="mdi-check"
                :disabled="!walkinData.phoneNumber || walkinData.phoneNumber.length < 10 || (!isReturningPatient && (!walkinData.firstName || !walkinData.lastName || !walkinData.gender))"
              >
                Check In
              </v-btn>
            </div>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Success Dialog -->
    <v-dialog v-model="showSuccess" max-width="500" persistent>
      <v-card style="background: linear-gradient(135deg, rgb(var(--v-theme-success)), rgb(var(--v-theme-primary)));">
        <v-card-text class="text-center pa-8">
          <v-icon size="80" color="white" class="mb-4" :style="{ opacity: 0.95 }">
            mdi-printer-check
          </v-icon>
          <div class="text-h4 text-white font-weight-bold">Check-in Successful!</div>
          <div class="text-h1 text-white font-weight-bold my-4">
            {{ kioskStore.ticketNumber || '---' }}
          </div>
          <div class="text-subtitle-1 text-white" :style="{ opacity: 0.9 }">
            Your queue number for {{ kioskStore.ticketOffice || 'Testing' }}
          </div>
          <div class="text-body-2 text-white mt-2" :style="{ opacity: 0.75 }">
            Position in queue: {{ kioskStore.ticketPosition || '1' }}
          </div>
          <div class="text-body-2 text-white mt-1" :style="{ opacity: 0.9 }">
            Printing your queue slip... Please take your ticket!
          </div>
          
          <v-btn
            color="white"
            variant="text"
            size="large"
            class="mt-6"
            @click="resetAll"
            prepend-icon="mdi-home"
            :style="{ color: 'white', opacity: 0.9 }"
          >
            Back to Home
          </v-btn>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Loading Overlay -->
    <v-overlay :model-value="kioskStore.loading" class="align-center justify-center" scrim-color="background" scrim-opacity="0.7">
      <v-progress-circular
        color="primary"
        indeterminate
        size="64"
        width="6"
      ></v-progress-circular>
    </v-overlay>

    <!-- Virtual Keyboard Component -->
    <VirtualKeyboard
      v-model="keyboardVisible"
      :value="keyboardValue"
      :label="keyboardLabel"
      :field="keyboardField"
      @input="handleKeyboardInput"
      @done="handleKeyboardDone"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import VirtualKeyboard from '@/components/common/VirtualKeyboard.vue'
import { useKioskStore } from '@/stores/kioskStore'
import { storeToRefs } from 'pinia'
import printerService from '@/services/printerService'

// Store
const kioskStore = useKioskStore()
const { 
  isCheckingIn, 
  isWalkingIn, 
  loading,
  checkInError: storeCheckInError,
  walkInError: storeWalkInError,
  currentTicket
} = storeToRefs(kioskStore)

// Local state
const showAppointmentCheckin = ref(false)
const showWalkinDialog = ref(false)
const showSuccess = ref(false)
const appointmentPhone = ref('')
const appointmentError = ref('')
const walkinError = ref('')
const isReturningPatient = ref(false)
const checkingReturning = ref(false)

const appointmentForm = ref(null)
const walkinForm = ref(null)

// Virtual Keyboard State
const keyboardVisible = ref(false)
const keyboardValue = ref('')
const keyboardField = ref('')
const keyboardLabel = ref('')
const tempInput = ref('')

const walkinData = reactive({
  phoneNumber: '',
  firstName: '',
  lastName: '',
  gender: '',
  birthDate: '',
  address: ''
})

// Dispatch Print Job
const issuePrintTicket = async () => {
  const payload = {
    office: kioskStore.ticketOffice || 'Testing',
    queue_number: kioskStore.ticketNumber || 'T-000',
    patient_name: walkinData.firstName ? `${walkinData.firstName} ${walkinData.lastName}` : 'Patient',
    date: new Date().toLocaleDateString(),
    time: new Date().toLocaleTimeString(),
    wait_time: `${(kioskStore.ticketPosition || 1) * 5} mins`
  }
  await printerService.printTicket(payload)
}

// Methods
const openKeyboard = (field) => {
  keyboardField.value = field
  
  switch(field) {
    case 'appointment':
      keyboardValue.value = appointmentPhone.value
      keyboardLabel.value = 'Enter Phone Number'
      break
    case 'walkin':
      keyboardValue.value = walkinData.phoneNumber
      keyboardLabel.value = 'Enter Phone Number'
      break
    case 'firstName':
      keyboardValue.value = walkinData.firstName
      keyboardLabel.value = 'Enter First Name'
      break
    case 'lastName':
      keyboardValue.value = walkinData.lastName
      keyboardLabel.value = 'Enter Last Name'
      break
  }
  
  tempInput.value = keyboardValue.value
  keyboardVisible.value = true
}

const handleKeyboardInput = (value) => {
  tempInput.value = value
}

const handleKeyboardDone = (value) => {
  switch(keyboardField.value) {
    case 'appointment':
      appointmentPhone.value = value
      break
    case 'walkin':
      walkinData.phoneNumber = value
      checkReturningPatient(value)
      break
    case 'firstName':
      walkinData.firstName = value
      break
    case 'lastName':
      walkinData.lastName = value
      break
  }
  
  keyboardVisible.value = false
}

const checkReturningPatient = async (phoneNumber) => {
  if (!phoneNumber || phoneNumber.length < 10) {
    isReturningPatient.value = false
    return
  }
  
  checkingReturning.value = true
  try {
    const result = await kioskService.checkIn(phoneNumber)
    isReturningPatient.value = true
  } catch (error) {
    isReturningPatient.value = false
  } finally {
    checkingReturning.value = false
  }
}

const closeAppointmentCheckin = () => {
  showAppointmentCheckin.value = false
  appointmentPhone.value = ''
  appointmentError.value = ''
}

const closeWalkin = () => {
  showWalkinDialog.value = false
  walkinData.phoneNumber = ''
  walkinData.firstName = ''
  walkinData.lastName = ''
  walkinData.gender = ''
  walkinData.birthDate = ''
  walkinData.address = ''
  isReturningPatient.value = false
  walkinError.value = ''
}

const resetAll = () => {
  showSuccess.value = false
  kioskStore.resetCheckIn()
  closeAppointmentCheckin()
  closeWalkin()
}

const checkInWithAppointment = async () => {
  if (!appointmentForm.value) return
  
  const { valid } = await appointmentForm.value.validate()
  if (!valid) return

  appointmentError.value = ''

  try {
    await kioskStore.checkInPatient(appointmentPhone.value)
    
    showAppointmentCheckin.value = false
    showSuccess.value = true

    // Trigger Print
    await issuePrintTicket()

  } catch (error) {
    appointmentError.value = error.message || 'Failed to check in. Please try again.'
  }
}

const processWalkin = async () => {
  if (!walkinData.phoneNumber || walkinData.phoneNumber.length < 10) {
    walkinError.value = 'Please enter a valid phone number.'
    return
  }

  if (!isReturningPatient.value) {
    if (!walkinData.firstName || !walkinData.lastName) {
      walkinError.value = 'Please enter your full name.'
      return
    }
    if (!walkinData.gender) {
      walkinError.value = 'Please select your gender.'
      return
    }
  }

  walkinError.value = ''

  try {
    const patientData = {
      first_name: walkinData.firstName || 'Walk-in',
      last_name: walkinData.lastName || 'Patient',
      birth_date: walkinData.birthDate || '1900-01-01',
      gender: walkinData.gender || 'other',
      contact_number: walkinData.phoneNumber,
      address: walkinData.address || 'To be updated'
    }

    await kioskStore.registerWalkIn(patientData)
    
    showWalkinDialog.value = false
    showSuccess.value = true

    // Trigger Print
    await issuePrintTicket()

  } catch (error) {
    walkinError.value = error.message || 'Failed to process walk-in. Please try again.'
  }
}

// Auto-reset after inactivity (5 minutes)
let inactivityTimer = null
const resetInactivityTimer = () => {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer)
  }
  inactivityTimer = setTimeout(() => {
    if (!showSuccess.value) {
      resetAll()
    }
  }, 300000)
}

const trackActivity = () => {
  resetInactivityTimer()
}

onMounted(() => {
  document.addEventListener('click', trackActivity)
  document.addEventListener('touchstart', trackActivity)
  document.addEventListener('keydown', trackActivity)
  resetInactivityTimer()
})

onUnmounted(() => {
  document.removeEventListener('click', trackActivity)
  document.removeEventListener('touchstart', trackActivity)
  document.removeEventListener('keydown', trackActivity)
  if (inactivityTimer) {
    clearTimeout(inactivityTimer)
  }
})
</script>

<style scoped>
.kiosk-checkin {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.checkin-card {
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 200px;
  position: relative;
  overflow: hidden;
}

.checkin-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: currentColor;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.checkin-card:hover::before {
  opacity: 0.04;
}

.checkin-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12) !important;
}

.checkin-card:active {
  transform: scale(0.97);
  transition-duration: 0.1s;
}

:deep(.v-btn) {
  min-height: 48px;
  font-weight: 500;
  letter-spacing: 0.5px;
}

:deep(.v-field) {
  font-size: 1.2rem;
}

:deep(.v-field--focused .v-field__outline) {
  border-width: 2px;
}

:deep(.v-dialog .v-card) {
  border-radius: 16px;
  overflow: hidden;
}

:deep(.v-card-title) {
  font-weight: 600;
  letter-spacing: 0.3px;
}

@media (max-width: 600px) {
  .kiosk-checkin {
    padding: 12px;
  }
  
  .checkin-card {
    min-height: 150px;
  }
  
  .checkin-card :deep(.v-card-text) {
    padding: 24px !important;
  }
}
</style>