<!-- frontend/src/pages/Login.vue -->
<template>
  <div class="login-container">
    <v-container fluid class="pa-0 ma-0 fill-height">
      <v-row no-gutters class="fill-height">
        <!-- Left Side - Brand/Info Section -->
        <v-col cols="12" md="6" class="brand-section d-none d-md-flex">
          <div class="brand-content-wrapper d-flex align-center justify-center fill-height">
            <div class="brand-content text-center">
              <div class="brand-logo mb-8">
                <img src="@/assets/images/logo.png" alt="OMPH HIV AQMS Logo" class="logo mb-6" />
                <div class="d-flex align-center justify-center mb-4">
                  <h1 class="text-h2 font-weight-bold mr-3">OMPH HIV</h1>
                  <div class="accent-pill">
                    <span class="text-subtitle-1 font-weight-bold">AQMS</span>
                  </div>
                </div>
                <p class="text-h5 font-weight-medium mb-2">Secure Appoinment & Queueu Management System</p>
              </div>

              <div class="brand-subtitle mb-10">
                <p class="text-body-1 mb-4">
                  <v-icon color="white" class="mr-2">mdi-heart-pulse</v-icon>
                  <strong>Advanced HIV Patient Enrollment Platform</strong>
                </p>
                <p class="text-body-2">
                  Blockchain-integrated system for comprehensive patient management with enhanced security and data
                  integrity.
                </p>
              </div>

              <!-- Key Features -->
              <v-card class="features-card" elevation="0" color="rgba(255, 255, 255, 0.1)" rounded="lg">
                <v-card-text class="pa-6">
                  <h3 class="text-h6 font-weight-bold mb-4 text-center">
                    <v-icon color="white" class="mr-2">mdi-feature-search-outline</v-icon>
                    Platform Features
                  </h3>
                  <div class="feature-list">
                    <div class="feature-item">
                      <v-icon color="white" class="me-3" size="20">mdi-calendar-clock</v-icon>
                      <div class="feature-text">
                        <div class="text-subtitle-2 font-weight-bold">Smart Appointments</div>
                        <div class="text-caption opacity-75">Automated scheduling system</div>
                      </div>
                    </div>

                    <div class="feature-item">
                      <v-icon color="white" class="me-3" size="20">mdi-shield-check</v-icon>
                      <div class="feature-text">
                        <div class="text-subtitle-2 font-weight-bold">Blockchain Security</div>
                        <div class="text-caption opacity-75">Verified data integrity</div>
                      </div>
                    </div>

                    <div class="feature-item">
                      <v-icon color="white" class="me-3" size="20">mdi-bell-badge</v-icon>
                      <div class="feature-text">
                        <div class="text-subtitle-2 font-weight-bold">Smart Alerts</div>
                        <div class="text-caption opacity-75">Real-time notifications</div>
                      </div>
                    </div>

                    <div class="feature-item">
                      <v-icon color="white" class="me-3" size="20">mdi-tablet-cellphone</v-icon>
                      <div class="feature-text">
                        <div class="text-subtitle-2 font-weight-bold">Self-Service Kiosk</div>
                        <div class="text-caption opacity-75">Patient check-in system</div>
                      </div>
                    </div>

                    <div class="feature-item">
                      <v-icon color="white" class="me-3" size="20">mdi-chart-box</v-icon>
                      <div class="feature-text">
                        <div class="text-subtitle-2 font-weight-bold">Live Analytics</div>
                        <div class="text-caption opacity-75">Real-time insights dashboard</div>
                      </div>
                    </div>

                    <div class="feature-item">
                      <v-icon color="white" class="me-3" size="20">mdi-database-check</v-icon>
                      <div class="feature-text">
                        <div class="text-subtitle-2 font-weight-bold">Secure Records</div>
                        <div class="text-caption opacity-75">Encrypted patient data</div>
                      </div>
                    </div>
                  </div>
                </v-card-text>
              </v-card>
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
                  Welcome
                </h1>
                <p class="text-body-1 text-medium-emphasis">
                  Sign in to manage appointments, records, and facility services.
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
                  <div v-if="debugError" class="text-caption mt-1">
                    <small>{{ debugError }}</small>
                  </div>
                </v-alert>
              </v-form>

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
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const credentials = ref({
  username: '',
  password: ''
})

const loading = ref(false)
const error = ref('')
const debugError = ref('')
const showPassword = ref(false)

// Check if we're in development mode
const isDevelopment = computed(() => import.meta.env.DEV || import.meta.env.MODE === 'development')

// Validation rule
const requiredRule = value => !!value || 'This field is required'

const handleLogin = async () => {
  // Reset errors
  error.value = ''
  debugError.value = ''

  // Validate inputs
  if (!credentials.value.username || !credentials.value.password) {
    error.value = 'Please enter both username and password'
    return
  }

  loading.value = true

  try {
    console.log('🔄 Starting login process...')
    await authStore.login(credentials.value)
    console.log('✅ Login completed successfully - navigation handled by auth store')
  } catch (err) {
    console.error('❌ Login error:', err)

    // User-friendly error messages
    if (err.message.includes('Network Error') || err.message.includes('Failed to fetch')) {
      error.value = 'Cannot connect to the server. Please check:'
      debugError.value = '1. Is the backend running? (npm run dev in backend folder)\n2. Check http://localhost:5000/api/auth/login'
    } else if (err.message.includes('Invalid credentials') || err.message.includes('401')) {
      error.value = 'Invalid username or password. Please try again.'
      debugError.value = 'Default credentials: username: admin, password: admin123'
    } else if (err.message.includes('Timeout')) {
      error.value = 'Connection timeout. Server might be busy or offline.'
    } else {
      error.value = err.message || 'Login failed. Please try again.'
      debugError.value = err.toString()
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* Base styles using your color variables */
.login-container {
  height: 100vh;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
}

/* Brand Section with original background pattern */
.brand-section {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
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
  opacity: 0.5;
}

.brand-content-wrapper {
  position: relative;
  z-index: 2;
  width: 100%;
}

.brand-content {
  max-width: 650px;
  width: 100%;
  padding: var(--spacing-xxl);
  color: var(--color-text-on-primary);
  text-align: center;
}

/* Logo Styling using your colors */
.brand-logo {
  animation: fadeInDown 0.8s ease-out;
}

.logo {
  width: 120px;
  height: 120px;
  object-fit: contain;
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.3));
  animation: float 6s ease-in-out infinite;
}

.accent-pill {
  background: linear-gradient(135deg, var(--color-secondary-light) 0%, var(--color-secondary) 100%);
  padding: 4px 16px;
  border-radius: 20px;
  display: inline-flex;
  align-items: center;
  box-shadow: var(--shadow-md);
}

/* Enhanced Feature List */
.features-card {
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: transform var(--transition-normal), box-shadow var(--transition-normal);
}

.features-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-xl) !important;
  border-color: rgba(255, 255, 255, 0.2);
}

.feature-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
}

.feature-item {
  display: flex;
  align-items: flex-start;
  padding: var(--spacing-sm);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.05);
  transition: all var(--transition-normal);
}

.feature-item:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateX(var(--spacing-xs));
}

.feature-text {
  text-align: left;
}

/* Stats Banner */
.stats-banner {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  border: 1px solid rgba(255, 255, 255, 0.1);
  animation: slideUp 0.6s ease-out 0.3s both;
}

.stat-item {
  padding: 0 var(--spacing-md);
}

/* Enhanced Animations */
@keyframes float {

  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-10px);
  }
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Feature Items Stagger Animation */
.feature-item {
  animation: fadeInUp 0.6s ease-out forwards;
  opacity: 0;
}

.feature-item:nth-child(1) {
  animation-delay: 0.1s;
}

.feature-item:nth-child(2) {
  animation-delay: 0.2s;
}

.feature-item:nth-child(3) {
  animation-delay: 0.3s;
}

.feature-item:nth-child(4) {
  animation-delay: 0.4s;
}

.feature-item:nth-child(5) {
  animation-delay: 0.5s;
}

.feature-item:nth-child(6) {
  animation-delay: 0.6s;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(15px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Login Section */
.login-section {
  background: var(--color-background);
  position: relative;
}

.login-card {
  backdrop-filter: blur(10px);
  background: rgba(var(--color-surface-rgb, 255, 255, 255), 0.95);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  border: 1px solid var(--color-border-light);
}

.login-card:hover {
  box-shadow: var(--shadow-xxl);
  transition: box-shadow var(--transition-normal);
}

.login-btn {
  height: 48px;
  font-weight: 600;
  letter-spacing: 0.5px;
  border-radius: var(--radius-md);
  transition: all var(--transition-normal);
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

/* Using your color variables for form elements */
:deep(.v-field--outlined) {
  --v-field-border-opacity: 0.2;
  border-color: rgba(var(--color-primary-rgb), 0.2);
}

:deep(.v-field--focused) {
  box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.1);
}

/* Alert styling with your colors */
:deep(.v-alert--error) {
  border-left: 4px solid var(--color-error);
  background-color: rgba(var(--color-error-rgb, 244, 67, 54), 0.05);
}

:deep(.v-alert--info) {
  border-left: 4px solid var(--color-info);
  background-color: rgba(var(--color-info-rgb, 33, 150, 243), 0.05);
}

/* Demo credentials styling */
:deep(.v-list-item) {
  min-height: 36px;
  color: var(--color-text-secondary);
}

:deep(.v-list-item__prepend) {
  margin-right: var(--spacing-sm);
}

/* Patient portal button */
:deep(.v-btn--variant-text) {
  color: var(--color-primary);
}

:deep(.v-btn--variant-text):hover {
  background: rgba(var(--color-primary-rgb), 0.08);
}

/* Divider styling */
:deep(.v-divider) {
  border-color: var(--color-border);
}

/* Responsive Design */
@media (max-width: 960px) {
  .brand-content {
    padding: var(--spacing-xl);
  }

  .logo {
    width: 90px;
    height: 90px;
  }

  .brand-logo h1 {
    font-size: 2.5rem;
  }

  .feature-list {
    grid-template-columns: 1fr;
  }

  .brand-content-wrapper {
    padding: var(--spacing-lg);
  }
}

@media (max-width: 600px) {
  .brand-content {
    padding: var(--spacing-md);
  }

  .brand-logo h1 {
    font-size: 2rem;
  }

  .text-h5 {
    font-size: 1.25rem !important;
  }

  .stats-banner .d-flex {
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .stats-banner .v-divider {
    display: none;
  }
}

/* Smooth scrolling for mobile */
@media (max-height: 700px) {
  .brand-content-wrapper {
    overflow-y: auto;
    padding: var(--spacing-md) 0;
  }

  .brand-content {
    padding: var(--spacing-lg) var(--spacing-md);
  }
}

/* Text shadow for better readability */
.brand-content h1,
.brand-content h2,
.brand-content h3,
.brand-content h4,
.brand-content h5,
.brand-content h6 {
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.brand-content p {
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

/* Enhanced gradient overlay */
.brand-section::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.1), transparent);
  pointer-events: none;
}

/* Focus states for accessibility */
:deep(.v-text-field input:focus),
:deep(.v-text-field textarea:focus) {
  outline: 2px solid rgba(var(--color-primary-rgb), 0.3);
  outline-offset: 2px;
}

/* Custom scrollbar for the entire login page */
.login-section::-webkit-scrollbar {
  width: 6px;
}

.login-section::-webkit-scrollbar-track {
  background: var(--color-surface-dark);
}

.login-section::-webkit-scrollbar-thumb {
  background: var(--color-primary);
  border-radius: var(--radius-full);
}

.login-section::-webkit-scrollbar-thumb:hover {
  background: var(--color-primary-dark);
}

/* Loading state */
.login-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Animation for login card */
.login-card {
  animation: slideUp var(--transition-slow) ease-out;
}

/* Test connection component styling */
:deep(.test-connection) {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-sm);
  background: var(--color-surface);
}
</style>