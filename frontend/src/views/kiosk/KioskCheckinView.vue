<!-- frontend/src/views/kiosk/KioskCheckinView.vue -->
<template>
  <div class="kiosk-checkin">
    <!-- Welcome Message -->
    <v-card class="mb-6" elevation="2" border="primary">
      <v-card-text class="text-center pa-8">
        <div class="text-h3 font-weight-bold" style="color: rgb(var(--v-theme-primary));">
          Welcome
        </div>
        <div class="text-subtitle-1 text-medium-emphasis mt-2">
          Please select your queue option
        </div>
      </v-card-text>
    </v-card>

    <!-- Queue Options -->
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
            <div class="text-subtitle-1 text-medium-emphasis mt-2">
              Join the queue with your scheduled appointment
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
            <div class="text-subtitle-1 text-medium-emphasis mt-2">
              No appointment? Join the queue and we'll help you
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Appointment Queue Dialog -->
    <v-dialog v-model="showAppointmentCheckin" max-width="500" persistent>
      <v-card>
        <v-card-title class="text-h5 pa-4" style="background-color: rgb(var(--v-theme-primary)); color: white;">
          <v-icon color="white" class="mr-2">mdi-calendar-check</v-icon>
          Appointment Queue
        </v-card-title>
        
        <v-card-text class="pa-6">
          <v-form ref="appointmentForm" @submit.prevent="checkInWithAppointment">
            <div class="text-subtitle-2 font-weight-bold mb-2" style="color: rgb(var(--v-theme-primary));">
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
                Get Queue No.
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
      Walk-in Queue
    </v-card-title>
    
    <v-card-text class="pa-6">
      <v-form ref="walkinForm" @submit.prevent="processWalkin">
        <div class="text-subtitle-2 font-weight-bold mb-2" style="color: rgb(var(--v-theme-primary));">
          Enter your Phone Number
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

        <!-- Loading indicator for patient check -->
        <div v-if="checkingReturning" class="d-flex justify-center my-4">
          <v-progress-circular indeterminate color="primary" size="32"></v-progress-circular>
          <span class="ml-2 text-caption">Checking for existing patient...</span>
        </div>

        <!-- Returning patient info -->
        <v-alert
          v-if="isReturningPatient && !checkingReturning"
          type="info"
          variant="tonal"
          class="mt-2"
        >
          <div class="font-weight-bold">Welcome back!</div>
          <div class="text-caption">
            Patient Code: <strong>{{ storedFacilityCode }}</strong>
          </div>
        </v-alert>

        <!-- Show transaction type selection ONLY for returning patients -->
        <v-expand-transition>
          <div v-if="isReturningPatient && !checkingReturning && walkinData.phoneNumber && walkinData.phoneNumber.length >= 10">
            <v-divider class="my-4">
              <v-chip color="surface-variant" variant="text" size="small">
                Service Selection
              </v-chip>
            </v-divider>

            <div class="text-caption text-medium-emphasis mb-2">
              Please select the type of service you need.
            </div>

            <v-row>
              <v-col cols="12">
                <v-select
                  v-model="walkinData.transactionType"
                  :items="transactionTypes"
                  item-title="name"
                  item-value="id"
                  label="Service Type"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-clipboard-text"
                  :rules="[v => !!v || 'Service type is required']"
                  color="primary"
                  hint="Select the type of service you need"
                  persistent-hint
                  :loading="loadingTransactionTypes"
                  :disabled="loadingTransactionTypes"
                >
                  <template #item="{ item, props }">
                    <v-list-item v-bind="props">
                      <template #prepend>
                        <v-icon :color="item.raw.color_code || 'primary'" class="mr-2">
                          mdi-circle
                        </v-icon>
                      </template>
                      <v-list-item-subtitle v-if="item.raw.estimated_duration_minutes">
                        (~{{ item.raw.estimated_duration_minutes }} mins)
                      </v-list-item-subtitle>
                    </v-list-item>
                  </template>
                  <template #selection="{ item }">
                    <div class="d-flex align-center">
                      <v-icon :color="item.raw.color_code || 'primary'" size="16" class="mr-2">
                        mdi-circle
                      </v-icon>
                      <span>{{ item.raw.name }}</span>
                    </div>
                  </template>
                </v-select>
              </v-col>
            </v-row>
          </div>
        </v-expand-transition>

        <!-- STAFF NOTICE for new patients - NO input fields -->
        <v-expand-transition>
          <div v-if="!isReturningPatient && !checkingReturning && walkinData.phoneNumber && walkinData.phoneNumber.length >= 10">
            <v-divider class="my-4">
              <v-chip color="warning" variant="text" size="small">
                <v-icon size="16" class="mr-1">mdi-alert</v-icon>
                New Patient Registration
              </v-chip>
            </v-divider>

            <v-alert
              icon="mdi-account-plus"
              type="info"
              variant="tonal"
              class="mb-2"
              border="start"
              border-color="info"
            >
              <div class="d-flex align-center">
                <div>
                  <div class="font-weight-bold">Staff will collect your full details</div>
                  <div class="text-caption text-medium-emphasis">
                    You only need to provide your phone number to get a queue number.
                    Staff will register your name and other information during consultation.
                  </div>
                </div>
              </div>
            </v-alert>
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
            :disabled="!walkinData.phoneNumber || walkinData.phoneNumber.length < 10 || checkingReturning || (isReturningPatient && !walkinData.transactionType)"
          >
            Get Queue No.
          </v-btn>
        </div>
      </v-form>
    </v-card-text>
  </v-card>
</v-dialog>

    <!-- Success Dialog - With Print Options -->
    <v-dialog v-model="showSuccess" max-width="500" persistent>
      <v-card style="background: linear-gradient(135deg, rgb(var(--v-theme-success)), rgb(var(--v-theme-primary)));">
        <v-card-text class="text-center pa-8">
          <v-icon size="80" color="white" class="mb-4" :style="{ opacity: 0.95 }">
            mdi-printer-check
          </v-icon>
          <div class="text-h4 text-white font-weight-bold">Successfully added to queue!</div>
          
          <!-- Queue Number - Direct from store -->
          <div class="text-h1 text-white font-weight-bold my-4">
            {{ kioskStore.ticketNumber || '---' }}
          </div>
          
          <div class="text-subtitle-1 text-white" :style="{ opacity: 0.9 }">
            Your queue number for {{ kioskStore.ticketOffice || 'Testing' }}
          </div>
          
          <!-- Position - Direct from store -->
          <div class="text-body-2 text-white mt-2" :style="{ opacity: 0.75 }">
            Position in queue: {{ kioskStore.ticketPosition || '---' }}
          </div>
          
          <div class="text-body-2 text-white mt-1" :style="{ opacity: 0.9 }">
            {{ printStatus }}
          </div>
          
          <!-- Print Options -->
          <div class="mt-4 d-flex justify-center gap-4 flex-wrap">
            <v-btn
              color="white"
              variant="outlined"
              size="large"
              @click="printTicket"
              prepend-icon="mdi-printer"
              :loading="isPrinting"
              :disabled="isPrinting || printSkipped"
              class="print-btn"
              style="border-color: rgba(255,255,255,0.5); color: white;"
            >
              {{ isPrinting ? 'Printing...' : 'Print Ticket' }}
            </v-btn>
            
            <v-btn
              color="white"
              variant="text"
              size="large"
              @click="skipPrintAndDone"
              prepend-icon="mdi-check"
              :disabled="isPrinting"
              class="skip-btn"
              style="color: rgba(255,255,255,0.8);"
            >
              {{ printSkipped ? 'Done' : 'Skip Print & Done' }}
            </v-btn>
          </div>
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

    <!-- Power Off Button -->
    <div class="power-control mt-8 pt-4 text-center">
      <v-btn
        color="error"
        variant="text"
        size="small"
        prepend-icon="mdi-power-standby"
        @click="showPowerOffDialog = true"
        class="power-btn"
      >
        Power Off System
      </v-btn>
    </div>

    <!-- Power Off Confirmation Dialog -->
    <v-dialog v-model="showPowerOffDialog" max-width="400" persistent>
      <v-card>
        <v-card-title class="text-h5 pa-4" style="background-color: rgb(var(--v-theme-error)); color: white;">
          <v-icon color="white" class="mr-2">mdi-power-standby</v-icon>
          Shutdown System
        </v-card-title>
        
        <v-card-text class="pa-6">
          <div class="text-body-1 mb-4">
            Are you sure you want to shut down the kiosk system?
            This will turn off the Orange Pi.
          </div>
          
          <v-alert
            v-if="shutdownError"
            type="error"
            variant="tonal"
            class="mb-4"
            closable
            @click:close="shutdownError = ''"
          >
            {{ shutdownError }}
          </v-alert>

          <v-alert
            v-if="shutdownSuccess"
            type="success"
            variant="tonal"
            class="mb-4"
          >
            {{ shutdownSuccess }}
          </v-alert>
          
          <div class="d-flex justify-space-between">
            <v-btn
              variant="text"
              size="large"
              @click="closePowerOffDialog"
              prepend-icon="mdi-cancel"
              :disabled="isShuttingDown"
            >
              Cancel
            </v-btn>
            <v-btn
              color="error"
              size="large"
              :loading="isShuttingDown"
              @click="shutdownSystem"
              prepend-icon="mdi-power"
              :disabled="isShuttingDown"
            >
              {{ isShuttingDown ? 'Shutting Down...' : 'Shut Down' }}
            </v-btn>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Shutdown in progress overlay -->
    <v-overlay 
      v-model="isShuttingDown" 
      class="align-center justify-center" 
      scrim-color="background" 
      scrim-opacity="0.8"
      persistent
    >
      <div class="text-center">
        <v-progress-circular
          color="error"
          indeterminate
          size="64"
          width="6"
          class="mb-4"
        ></v-progress-circular>
        <div class="text-h5 font-weight-bold">Shutting Down System...</div>
        <div class="text-subtitle-1 text-medium-emphasis mt-2">Please wait for the system to power off</div>
      </div>
    </v-overlay>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, watch, nextTick } from 'vue'
import VirtualKeyboard from '@/components/common/VirtualKeyboard.vue'
import { useKioskStore } from '@/stores/kioskStore'
import { storeToRefs } from 'pinia'
import printerService from '@/services/printerService'
import kioskService from '@/services/kioskService'
import transactionTypeService from '@/services/transactionTypeService'

// Store
const kioskStore = useKioskStore()
const { 
  isCheckingIn, 
  isWalkingIn, 
  loading,
  currentTicket,
  ticketNumber,
  ticketOffice,
  ticketPosition,
  ticketPatientName,
  patientFacilityCode
} = storeToRefs(kioskStore)

// Configuration
const API_BASE_URL = import.meta.env.VITE_KIOSK_API_URL || 'http://localhost:5000'
const SHUTDOWN_TOKEN = import.meta.env.VITE_SHUTDOWN_TOKEN || 'your_secure_token_here'

// ============== LOCAL STATE ==============
const showAppointmentCheckin = ref(false)
const showWalkinDialog = ref(false)
const showSuccess = ref(false)
const appointmentPhone = ref('')
const appointmentError = ref('')
const walkinError = ref('')
const isReturningPatient = ref(false)
const checkingReturning = ref(false)
const storedFacilityCode = ref(null)
const testingTransactionTypeId = ref(null)

// Print state
const isPrinting = ref(false)
const printSkipped = ref(false)
const printStatus = ref('Printing your queue slip... Please take your ticket!')
const printAttempted = ref(false)

// Transaction types
const transactionTypes = ref([])
const loadingTransactionTypes = ref(false)

// Power off state
const showPowerOffDialog = ref(false)
const isShuttingDown = ref(false)
const shutdownError = ref('')
const shutdownSuccess = ref('')

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
  transactionType: null
})

// Watch for phone number changes
watch(() => walkinData.phoneNumber, (newPhone) => {
  if (newPhone && newPhone.length >= 10) {
    checkReturningPatient(newPhone)
  } else {
    isReturningPatient.value = false
    storedFacilityCode.value = null
  }
})

// ============== METHODS ==============

// Fetch transaction types
const fetchTransactionTypes = async () => {
  loadingTransactionTypes.value = true
  try {
    const response = await transactionTypeService.getTransactionTypes()
    
    if (response.success && response.data) {
      transactionTypes.value = response.data
      const testingType = transactionTypes.value.find(t => 
        t.name.toLowerCase().includes('testing') || 
        t.office === 'testing'
      )
      if (testingType) {
        testingTransactionTypeId.value = testingType.id
      }
    } else if (response.data) {
      transactionTypes.value = response.data
      const testingType = transactionTypes.value.find(t => 
        t.name.toLowerCase().includes('testing') || 
        t.office === 'testing'
      )
      if (testingType) {
        testingTransactionTypeId.value = testingType.id
      }
    } else {
      console.error('Failed to fetch transaction types:', response)
      setDefaultTransactionTypes()
    }
  } catch (error) {
    console.error('Error fetching transaction types:', error)
    setDefaultTransactionTypes()
  } finally {
    loadingTransactionTypes.value = false
  }
}

// Fallback default transaction types
const setDefaultTransactionTypes = () => {
  transactionTypes.value = [
    { id: 1, name: 'Testing', office: 'testing', description: 'General testing', color_code: '#4CAF50', estimated_duration_minutes: 15 },
    { id: 2, name: 'Treatment', office: 'treatment', description: 'Treatment consultation', color_code: '#2196F3', estimated_duration_minutes: 30 },
  ]
  testingTransactionTypeId.value = 1
}

const checkReturningPatient = async (phoneNumber) => {
  if (!phoneNumber || phoneNumber.length < 10) {
    isReturningPatient.value = false
    return
  }
  
  checkingReturning.value = true
  try {
    const result = await kioskService.checkPatientExists(phoneNumber)
    
    if (result && result.exists) {
      isReturningPatient.value = true
      if (result.patient) {
        storedFacilityCode.value = result.patient.patient_facility_code || null
        walkinData.transactionType = null
      }
    } else {
      isReturningPatient.value = false
      storedFacilityCode.value = null
      walkinData.transactionType = testingTransactionTypeId.value
    }
  } catch (error) {
    console.error('Error checking patient existence:', error)
    isReturningPatient.value = false
    storedFacilityCode.value = null
  } finally {
    checkingReturning.value = false
  }
}

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
      break
  }
  
  keyboardVisible.value = false
}

const closeAppointmentCheckin = () => {
  showAppointmentCheckin.value = false
  appointmentPhone.value = ''
  appointmentError.value = ''
}

const closeWalkin = () => {
  showWalkinDialog.value = false
  walkinData.phoneNumber = ''
  walkinData.transactionType = null
  isReturningPatient.value = false
  storedFacilityCode.value = null
  walkinError.value = ''
}

const resetAll = () => {
  showSuccess.value = false
  storedFacilityCode.value = null
  printSkipped.value = false
  printAttempted.value = false
  printStatus.value = 'Printing your queue slip... Please take your ticket!'
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
    await nextTick()
    showSuccess.value = true
    
    // Auto-print after successful check-in
    await autoPrintTicket()

  } catch (error) {
    appointmentError.value = error.message || 'Failed to join the queue. Please try again.'
  }
}

const processWalkin = async () => {
  if (!walkinData.phoneNumber || walkinData.phoneNumber.length < 10) {
    walkinError.value = 'Please enter a valid phone number.'
    return
  }

  if (isReturningPatient.value) {
    if (!walkinData.transactionType) {
      walkinError.value = 'Please select a service type.'
      return
    }
  }

  walkinError.value = ''

  try {
    // For new patients: use placeholder values that staff will update later
    const patientData = {
      first_name: 'Walk-in',
      last_name: 'Patient',
      middle_name: '',
      gender: 'other',
      contact_number: walkinData.phoneNumber,
      address: 'To be updated by staff',
      transaction_type_id: walkinData.transactionType || testingTransactionTypeId.value,
      is_returning: isReturningPatient.value
    }

    await kioskStore.registerWalkIn(patientData)
    
    showWalkinDialog.value = false
    await nextTick()
    showSuccess.value = true
    
    // Auto-print after successful walk-in
    await autoPrintTicket()

  } catch (error) {
    walkinError.value = error.message || 'Failed to join the queue. Please try again.'
  }
}

// Auto-print function
const autoPrintTicket = async () => {
  printAttempted.value = true
  await printTicket()
}

// Manual print function
const printTicket = async () => {
  if (isPrinting.value) return
  
  isPrinting.value = true
  printStatus.value = 'Printing...'
  printSkipped.value = false
  
  try {
    const queueNumber = ticketNumber.value || 'T-001'
    const office = ticketOffice.value || 'Testing'
    const position = ticketPosition.value || 1
    
    const ticketDataPrint = {
      office: office,
      queue_number: queueNumber,
      date: new Date().toLocaleDateString('en-PH', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }),
      time: new Date().toLocaleTimeString('en-PH', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    }
    
    console.log('📨 Sending print request to kiosk microservice:', ticketDataPrint)
    const result = await printerService.printTicket(ticketDataPrint)
    
    if (result.success) {
      console.log('✅ Ticket printed successfully:', queueNumber)
      printStatus.value = '✅ Ticket printed successfully!'
    } else {
      console.warn('⚠️ Print failed but ticket was created:', result.error)
      printStatus.value = '⚠️ Print failed. Please see staff for assistance.'
    }
  } catch (error) {
    console.error('❌ Print error:', error)
    printStatus.value = '⚠️ Print failed. Please see staff for assistance.'
  } finally {
    isPrinting.value = false
  }
}

// Skip print and close
const skipPrintAndDone = () => {
  printSkipped.value = true
  printStatus.value = '📋 Ticket printing skipped. Please see staff for your queue number.'
  setTimeout(() => {
    resetAll()
  }, 1500)
}

const issuePrintTicket = async () => {
  // This function is kept for backward compatibility
  await printTicket()
}

// Power Off Methods
const closePowerOffDialog = () => {
  showPowerOffDialog.value = false
  shutdownError.value = ''
  shutdownSuccess.value = ''
}

const shutdownSystem = async () => {
  isShuttingDown.value = true
  shutdownError.value = ''
  shutdownSuccess.value = ''

  try {
    const response = await fetch(`${API_BASE_URL}/api/system/shutdown`, {
      method: 'POST',
      headers: {
        'Authorization': SHUTDOWN_TOKEN,
        'Content-Type': 'application/json'
      }
    })

    const data = await response.json()

    if (response.ok && data.success) {
      shutdownSuccess.value = data.message || 'Shutdown command sent successfully. System is powering off...'
      
      setTimeout(() => {
        showPowerOffDialog.value = false
      }, 2000)
    } else {
      throw new Error(data.message || 'Shutdown failed')
    }
  } catch (error) {
    console.error('Shutdown failed:', error)
    shutdownError.value = `Failed to shutdown: ${error.message || 'Unknown error'}`
  } finally {
    isShuttingDown.value = false
  }
}

const handleKeyPress = (event) => {
  if (event.ctrlKey && event.shiftKey && event.key === 'P') {
    event.preventDefault()
    if (!showPowerOffDialog.value && !isShuttingDown.value) {
      showPowerOffDialog.value = true
    }
  }
}

let inactivityTimer = null
const resetInactivityTimer = () => {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer)
  }
  inactivityTimer = setTimeout(() => {
    if (!showSuccess.value && !showPowerOffDialog.value && !isShuttingDown.value) {
      resetAll()
    }
  }, 300000)
}

const trackActivity = () => {
  resetInactivityTimer()
}

// ============== LIFECYCLE HOOKS ==============

onMounted(() => {
  fetchTransactionTypes()
  
  document.addEventListener('click', trackActivity)
  document.addEventListener('touchstart', trackActivity)
  document.addEventListener('keydown', handleKeyPress)
  document.addEventListener('keydown', trackActivity)
  resetInactivityTimer()
  
  console.log('Kiosk store initialized:', kioskStore.$state)
})

onUnmounted(() => {
  document.removeEventListener('click', trackActivity)
  document.removeEventListener('touchstart', trackActivity)
  document.removeEventListener('keydown', handleKeyPress)
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

.power-btn {
  opacity: 0.3;
  transition: all 0.3s ease;
  font-size: 0.75rem;
}

.power-btn:hover {
  opacity: 0.8 !important;
  transform: scale(1.05);
}

.power-btn:active {
  transform: scale(0.95);
}

.power-control {
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.06);
  padding-top: 16px !important;
}

/* Print button styles */
.print-btn {
  min-width: 160px;
}

.skip-btn {
  min-width: 140px;
}

.gap-4 {
  gap: 16px;
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

  .power-btn {
    font-size: 0.7rem;
  }
  
  .print-btn,
  .skip-btn {
    min-width: 120px;
    font-size: 0.85rem;
  }
}
</style>