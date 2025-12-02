<!-- frontend/src/pages/admin/Enrollment.vue -->
<template>
  <div class="enrollment-container">
    <div class="enrollment-header">
      <h1>Patient Enrollment</h1>
      <p>Register new patients with DLT integrity verification</p>
    </div>

    <div class="enrollment-card">
      <form @submit.prevent="handleEnrollment" class="enrollment-form">
        <div class="form-row">
          <div class="form-group">
            <label for="name">Full Name *</label>
            <input
              id="name"
              v-model="patientData.name"
              type="text"
              required
              placeholder="Enter patient's full name"
              :disabled="loading"
            >
          </div>

          <div class="form-group">
            <label for="date_of_birth">Date of Birth *</label>
            <input
              id="date_of_birth"
              v-model="patientData.date_of_birth"
              type="date"
              required
              :disabled="loading"
            >
          </div>
        </div>

        <div class="form-group">
          <label for="contact">Contact Information</label>
          <input
            id="contact"
            v-model="patientData.contact"
            type="text"
            placeholder="Phone number or email"
            :disabled="loading"
          >
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="biometric_id">Biometric ID *</label>
            <input
              id="biometric_id"
              v-model="patientData.biometric_id"
              type="text"
              required
              placeholder="Enter biometric identifier"
              :disabled="loading"
            >
            <small class="help-text">Unique identifier for biometric verification</small>
          </div>

          <div class="form-group">
            <label>HIV Status *</label>
            <div class="radio-group">
              <label class="radio-option">
                <input
                  v-model="patientData.hiv_status"
                  type="radio"
                  value="Reactive"
                  required
                  :disabled="loading"
                >
                <span>Reactive</span>
              </label>
              <label class="radio-option">
                <input
                  v-model="patientData.hiv_status"
                  type="radio"
                  value="Non-Reactive"
                  required
                  :disabled="loading"
                >
                <span>Non-Reactive</span>
              </label>
            </div>
          </div>
        </div>

        <div class="form-group consent-group">
          <label class="checkbox-option">
            <input
              v-model="patientData.consent"
              type="checkbox"
              required
              :disabled="loading"
            >
            <span class="consent-text">
              I confirm that informed consent has been obtained from the patient for HIV testing and data storage *
            </span>
          </label>
        </div>

        <div class="form-actions">
          <button
            type="button"
            class="btn-secondary"
            @click="resetForm"
            :disabled="loading"
          >
            Clear Form
          </button>
          <button
            type="submit"
            class="btn-primary"
            :disabled="loading || !patientData.consent"
          >
            <span v-if="loading">Enrolling Patient...</span>
            <span v-else>Enroll Patient</span>
          </button>
        </div>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <div v-if="success" class="success-message">
          <h3>\u2705 Enrollment Successful!</h3>
          <p><strong>Patient ID:</strong> {{ enrollmentResult.patient_id }}</p>
          <p><strong>DLT Transaction:</strong> {{ enrollmentResult.dlt_transaction }}</p>
          <p><strong>Data Hash:</strong> <code class="hash-code">{{ enrollmentResult.hash }}</code></p>
          <button
            type="button"
            class="btn-outline"
            @click="resetForm"
          >
            Enroll Another Patient
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import http from '@/api/http'

const router = useRouter()

const patientData = reactive({
  name: '',
  date_of_birth: '',
  contact: '',
  biometric_id: '',
  hiv_status: '',
  consent: false
})

const loading = ref(false)
const error = ref('')
const success = ref(false)
const enrollmentResult = ref({})

const resetForm = () => {
  Object.assign(patientData, {
    name: '',
    date_of_birth: '',
    contact: '',
    biometric_id: '',
    hiv_status: '',
    consent: false
  })
  error.value = ''
  success.value = false
  enrollmentResult.value = {}
}

// In your handleEnrollment function:
const handleEnrollment = async () => {
  // Validate required fields
  if (!patientData.name || !patientData.date_of_birth || !patientData.biometric_id || !patientData.hiv_status) {
    error.value = 'Please fill in all required fields'
    return
  }

  if (!patientData.consent) {
    error.value = 'Patient consent is required for enrollment'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const enrollmentData = {
      name: patientData.name,
      date_of_birth: patientData.date_of_birth,
      contact: patientData.contact,
      biometric_id: patientData.biometric_id,
      hiv_status: patientData.hiv_status,
      consent: patientData.consent
    }

    const response = await http.post('/patients/enroll', enrollmentData)
    
    enrollmentResult.value = response.data
    success.value = true
    error.value = ''
    
    // Don't reset form immediately - let user see success message
    // resetForm() - remove this line
    
  } catch (err) {
    error.value = err.response?.data?.error || err.message || 'Enrollment failed. Please try again.'
    success.value = false
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.enrollment-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.enrollment-header {
  text-align: center;
  margin-bottom: 30px;
}

.enrollment-header h1 {
  color: #333;
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 600;
}

.enrollment-header p {
  color: #666;
  margin: 0;
  font-size: 16px;
}

.enrollment-card {
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.enrollment-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

label {
  margin-bottom: 6px;
  color: #333;
  font-weight: 500;
  font-size: 14px;
}

input[type="text"],
input[type="date"] {
  padding: 12px;
  border: 2px solid #e1e5e9;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.3s ease;
}

input:focus {
  outline: none;
  border-color: #667eea;
}

input:disabled {
  background-color: #f8f9fa;
  cursor: not-allowed;
}

.help-text {
  margin-top: 4px;
  color: #666;
  font-size: 12px;
}

.radio-group {
  display: flex;
  gap: 20px;
  margin-top: 8px;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.radio-option input[type="radio"] {
  margin: 0;
}

.consent-group {
  margin: 20px 0;
}

.checkbox-option {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
}

.consent-text {
  font-size: 14px;
  color: #333;
  line-height: 1.4;
}

.form-actions {
  display: flex;
  gap: 15px;
  justify-content: flex-end;
  margin-top: 30px;
}

.btn-primary,
.btn-secondary,
.btn-outline {
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #5a6268;
}

.btn-outline {
  background: transparent;
  border: 2px solid #667eea;
  color: #667eea;
}

.btn-outline:hover {
  background: #667eea;
  color: white;
}

.error-message {
  padding: 12px;
  background-color: #fee;
  border: 1px solid #fcc;
  border-radius: 6px;
  color: #c33;
  font-size: 14px;
  text-align: center;
}

.success-message {
  padding: 20px;
  background-color: #f0f9ff;
  border: 1px solid #b3e0ff;
  border-radius: 6px;
  text-align: center;
}

.success-message h3 {
  margin: 0 0 15px 0;
  color: #059669;
}

.success-message p {
  margin: 8px 0;
  color: #333;
}

.hash-code {
  background: #f1f5f9;
  padding: 4px 8px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  word-break: break-all;
}

/* Responsive design */
@media (max-width: 768px) {
  .enrollment-container {
    padding: 15px;
  }
  
  .enrollment-card {
    padding: 20px;
  }
  
  .form-row {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  
  .form-actions {
    flex-direction: column;
  }
}
</style>