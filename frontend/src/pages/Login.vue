<!-- frontend/src/pages/Login.vue -->
<template>
  <div class="login-container">
    <v-container fluid class="pa-0 ma-0 fill-height">
      <v-row no-gutters class="fill-height">
        <!-- Left Side - Brand/Info Section -->
        <v-col cols="12" md="6" class="brand-section d-none d-md-flex">
          <div class="brand-content">
            <div class="brand-logo">
              <img src="@/assets/images/logo.png" alt="OMPH HIV Care Logo" class="logo mb-6" />
              <h1 class="text-h3 font-weight-bold mt-4"> OMPH HIV Care</h1>
            </div>
            <div class="brand-subtitle">
              <p class="text-h6 font-weight-regular">Secure Patient Management System</p>
              <p class="text-body-1 mt-4">
                Advanced HIV patient enrollment with blockchain integrity verification
                and biometric security.
              </p>
            </div>
            <div class="feature-list mt-8">
              <div class="feature-item">
                <v-icon color="white" class="me-3">mdi-shield-check</v-icon>
                <span>DLT Data Integrity</span>
              </div>
              <div class="feature-item">
                <v-icon color="white" class="me-3">mdi-fingerprint</v-icon>
                <span>Biometric Security</span>
              </div>
              <div class="feature-item">
                <v-icon color="white" class="me-3">mdi-chart-timeline</v-icon>
                <span>Real-time Analytics</span>
              </div>
            </div>
          </div>
        </v-col>

        <!-- Right Side - Login Form -->
        <v-col cols="12" md="6" class="login-section d-flex align-center justify-center">
          <v-card elevation="8" class="login-card" rounded="xl" max-width="450">
            <v-card-text class="pa-6">
              <!-- Header -->
              <div class="text-center mb-6">
                <v-avatar size="64" color="primary" class="mb-4">
                  <v-icon size="32" color="white">mdi-shield-account</v-icon>
                </v-avatar>
                <h1 class="text-h4 font-weight-bold text-primary mb-2">
                  Welcome Back
                </h1>
                <p class="text-body-1 text-medium-emphasis">
                  Sign in to your HIV Enrollment System
                </p>
              </div>

              <!-- Login Form -->
              <v-form @submit.prevent="handleLogin" class="login-form">
                <v-text-field v-model="credentials.username" label="Username" variant="outlined" density="comfortable"
                  prepend-inner-icon="mdi-account" :rules="[requiredRule]" :disabled="loading" class="mb-4" />

                <v-text-field v-model="credentials.password" label="Password" variant="outlined" density="comfortable"
                  prepend-inner-icon="mdi-lock" :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                  :type="showPassword ? 'text' : 'password'" :rules="[requiredRule]" :disabled="loading"
                  @click:append-inner="showPassword = !showPassword" class="mb-2" />

                <v-btn type="submit" color="primary" size="large" :loading="loading" :disabled="loading" block
                  class="mt-2 login-btn">
                  <template v-slot:loader>
                    <v-progress-circular indeterminate size="24" color="white" />
                  </template>
                  <v-icon start>mdi-login</v-icon>
                  Sign In
                </v-btn>

                <!-- Error Message -->
                <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mt-4">
                  {{ error }}
                </v-alert>
              </v-form>

              <!-- Demo Credentials -->
              <v-expansion-panels variant="accordion" class="mt-6">
                <v-expansion-panel elevation="0">
                  <v-expansion-panel-title class="text-caption">
                    <v-icon start size="small">mdi-information</v-icon>
                    Demo Credentials
                  </v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <v-list density="compact" class="pa-0">
                      <v-list-item class="px-0">
                        <template v-slot:prepend>
                          <v-icon color="primary" size="small">mdi-account</v-icon>
                        </template>
                        <v-list-item-title class="text-caption">
                          <strong>Username:</strong> admin
                        </v-list-item-title>
                      </v-list-item>
                      <v-list-item class="px-0">
                        <template v-slot:prepend>
                          <v-icon color="primary" size="small">mdi-key</v-icon>
                        </template>
                        <v-list-item-title class="text-caption">
                          <strong>Password:</strong> admin
                        </v-list-item-title>
                      </v-list-item>
                    </v-list>
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>

              <div class="text-center mt-4">
                <v-divider class="my-4" />
                <p class="text-body-2 text-medium-emphasis mb-2">
                  Are you a patient?
                </p>
                <v-btn variant="text" color="primary" size="small" @click="$router.push('/patient/login')">
                  <v-icon start>mdi-account</v-icon>
                  Access Patient Portal
                </v-btn>
              </div>

              <!-- Security Notice -->
              <v-alert type="info" variant="tonal" density="compact" class="mt-4">
                <div class="text-caption">
                  Secure access with role-based permissions
                </div>
              </v-alert>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const credentials = ref({
  username: '',
  password: ''
})

const loading = ref(false)
const error = ref('')
const showPassword = ref(false)

// Validation rule
const requiredRule = value => !!value || 'This field is required'

const handleLogin = async () => {
  if (!credentials.value.username || !credentials.value.password) {
    error.value = 'Please enter both username and password'
    return
  }

  loading.value = true
  error.value = ''

  try {
    await authStore.login(credentials.value)
    console.log('\u2705 Login successful, navigation handled by auth store')
  } catch (err) {
    error.value = err.response?.data?.error || err.message || 'Login failed. Please check your credentials.'
    console.error('\u274c Login error details:', err)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
@import '@/styles/variables.scss';

.login-container {
  height: 100vh;
  background: linear-gradient(135deg, $primary 0%, $secondary 100%);
}

.brand-section {
  background: linear-gradient(135deg, $primary 0%, $secondary 100%);
  position: relative;
  overflow: hidden;
}

.brand-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
}

.brand-content {
  position: relative;
  z-index: 2;
  padding: 60px;
  color: white;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.brand-logo {
  text-align: center;
  margin-bottom: 40px;
}

.brand-subtitle {
  text-align: center;
  opacity: 0.9;
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.feature-item {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  opacity: 0.9;
}

.login-section {
  background: #f8f9fa;
  position: relative;
}

.login-card {
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.95);
}

.login-btn {
  height: 48px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.logo {
  width: 90px;
  height: 90px;
  object-fit: contain;
}

/* Responsive adjustments */
@media (max-width: 960px) {
  .brand-content {
    padding: 40px 20px;
    text-align: center;
  }

  .brand-logo h1 {
    font-size: 2rem;
  }

  .feature-item {
    justify-content: center;
  }
}

/* Animation for login card */
.login-card {
  animation: slideUp 0.6s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Enhanced focus states */
:deep(.v-field--focused) {
  box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.1);
}

/* Custom scrollbar for expansion panel */
:deep(.v-expansion-panel-text__wrapper) {
  padding: 8px 16px !important;
}
</style>