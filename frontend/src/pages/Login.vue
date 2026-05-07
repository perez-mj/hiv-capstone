<template>
  <div class="login-page">
    <v-container fluid class="pa-0 ma-0 fill-height">
      <v-row no-gutters class="fill-height">
        <v-col cols="12" md="6" class="brand-section d-none d-md-flex">
          <div class="brand-mesh"></div>
          <div class="brand-content-wrapper d-flex align-center justify-center fill-height">
            <div class="brand-content-group text-center">
              
              <div class="brand-logo-container mb-10 d-flex flex-column align-center">
                <img src="@/assets/images/logo.png" alt="OMPH HIV CARE Logo" class="logo-img mb-6" />
                
                <div class="d-flex align-center mb-2 justify-center">
                  <h1 class="text-h3 font-weight-black text-white ls-tight">
                    OMPH <span class="text-green-accent">HIV</span>
                  </h1>
                  <v-chip color="green-darken-2" variant="flat" density="comfortable" class="ml-3 font-weight-black px-4">CARE</v-chip>
                </div>
                
                <div class="brand-identity-line mb-6 flex-column align-center">
                  <div class="text-center">
                    <p class="text-h6 font-weight-medium text-grey-lighten-2 mb-0">Secure Appointment & Queue Management</p>
                    <p class="text-caption font-weight-bold text-green-accent-2 text-uppercase ls-2">Advanced HIV Patient Enrollment Platform</p>
                  </div>
                </div>
              </div>

              <div class="brand-subtitle mb-10 text-center">
                <p class="text-body-1 text-grey-lighten-1">
                  <v-icon color="green-accent-2" class="mr-2">mdi-shield-check</v-icon>
                  Blockchain-integrated system for comprehensive patient management with enhanced security and data integrity.
                </p>
              </div>

              <h3 class="text-overline font-weight-bold text-white mb-4 ls-2 opacity-70 text-center">Platform Features</h3>

              <v-card class="features-glass-card mb-10" rounded="xl">
                <v-card-text class="pa-8">
                  <div class="feature-grid">
                    <div v-for="(f, i) in features" :key="i" class="feature-item">
                      <v-avatar color="rgba(76, 175, 80, 0.1)" size="48" rounded="lg" class="mr-4">
                        <v-icon color="green-accent-2" size="24">{{ f.icon }}</v-icon>
                      </v-avatar>
                      <div class="feature-text text-left">
                        <div class="text-subtitle-2 font-weight-bold text-white">{{ f.title }}</div>
                        <div class="text-caption text-grey-lighten-1">{{ f.desc }}</div>
                      </div>
                    </div>
                  </div>
                </v-card-text>
              </v-card>

              <div class="brand-footer opacity-60 d-flex flex-column align-center">
                <v-divider color="white" class="mb-4 w-100"></v-divider>
                <div class="d-flex align-center text-caption text-grey-lighten-1 font-weight-medium">
                  <v-icon size="16" class="mr-2" color="green-accent-2">mdi-shield-account-variant</v-icon>
                   Blockchain-Secured Health Information System © 2026
                </div>
              </div>
            </div>
          </div>
        </v-col>

        <v-col cols="12" md="6" class="login-column d-flex align-center justify-center">
          <div class="login-form-container">
            <div class="text-center mb-12">
              <v-avatar size="84" color="green-lighten-5" class="mb-4">
                <v-icon size="48" color="green-darken-3">mdi-account-circle-outline</v-icon>
              </v-avatar>
              <h2 class="text-h4 font-weight-black text-grey-darken-4 mb-2">Welcome Back</h2>
              <p class="text-body-2 text-grey-darken-1 px-8">Enter your credentials to manage appointments and records.</p>
            </div>

            <v-form @submit.prevent="handleLogin" class="login-form">
              <div class="input-field-group mb-5">
                <label class="custom-input-label">Username</label>
                <v-text-field 
                  v-model="credentials.username" 
                  variant="outlined" 
                  density="comfortable"
                  placeholder="e.g. jdoe_omph"
                  prepend-inner-icon="mdi-account-outline" 
                  :rules="[requiredRule]" 
                  :disabled="loading" 
                  color="green-darken-3"
                  class="modern-input" 
                />
              </div>

              <div class="input-field-group mb-8">
                <label class="custom-input-label">Password</label>
                <v-text-field 
                  v-model="credentials.password" 
                  variant="outlined" 
                  density="comfortable"
                  placeholder="••••••••"
                  prepend-inner-icon="mdi-lock-outline" 
                  :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                  :type="showPassword ? 'text' : 'password'" 
                  :rules="[requiredRule]" 
                  :disabled="loading"
                  @click:append-inner="showPassword = !showPassword" 
                  color="green-darken-3"
                  class="modern-input" 
                />
              </div>

              <v-btn 
                type="submit" 
                color="green-darken-4" 
                size="x-large" 
                :loading="loading" 
                block
                flat
                class="login-btn-action text-none py-4"
              >
                Sign In 
                <v-icon end size="20" class="ml-2">mdi-chevron-right</v-icon>
              </v-btn>

              <v-expand-transition>
                <v-alert v-if="error" type="error" variant="tonal" class="mt-6 rounded-lg" border="start">
                  <div class="text-caption font-weight-bold">{{ error }}</div>
                </v-alert>
              </v-expand-transition>
            </v-form>

            <div class="mt-12 pt-6 border-top text-center">
              <p class="text-caption font-weight-bold text-red-darken-2">
                <v-icon size="14" color="red-darken-2" class="mr-1">mdi-alert-octagon</v-icon>
                Protected by role-based access control (RBAC). 
                Unauthorized access is strictly prohibited.
              </p>
            </div>
          </div>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const credentials = ref({ username: '', password: '' })
const loading = ref(false)
const error = ref('')
const showPassword = ref(false)

const requiredRule = v => !!v || 'Field is required'

const features = [
  { icon: 'mdi-calendar-clock', title: 'Smart Appointments', desc: 'Automated scheduling' },
  { icon: 'mdi-shield-lock', title: 'Blockchain Security', desc: 'Verified data integrity' },
  { icon: 'mdi-bell-badge', title: 'Smart Alerts', desc: 'Real-time notifications' },
  { icon: 'mdi-tablet-cellphone', title: 'Self-Service Kiosk', desc: 'Patient check-in' },
  { icon: 'mdi-chart-box', title: 'Live Analytics', desc: 'Insight dashboard' },
  { icon: 'mdi-database-check', title: 'Secure Records', desc: 'Encrypted patient data' }
]

const handleLogin = async () => {
  error.value = ''
  if (!credentials.value.username || !credentials.value.password) return
  loading.value = true
  try {
    await authStore.login(credentials.value)
  } catch (err) {
    error.value = err.message || 'Access Denied: Please check your credentials.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  --primary-green: #2E7D32;
  --dark-green: #1B5E20;
  --deep-black: #0F1110;
  --bg-light: #F8FAF9;
  height: 100vh;
  overflow: hidden;
  font-family: 'Inter', sans-serif;
}

/* BRAND SECTION */
.brand-section {
  background: var(--deep-black);
  position: relative;
  overflow: hidden;
}

.brand-mesh {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  background-image: 
    radial-gradient(at 50% 50%, rgba(46, 125, 50, 0.2) 0, transparent 70%),
    radial-gradient(at 100% 100%, rgba(0, 0, 0, 0.8) 0, transparent 50%);
  z-index: 1;
}

.brand-content-wrapper {
  position: relative;
  z-index: 2;
  width: 100%;
}

.brand-content-group {
  max-width: 680px;
  width: 100%;
  padding: 0 50px;
  color: white;
}

/* LOGO STYLING */
.logo-img {
  width: 100px;
  height: auto;
  filter: drop-shadow(0 0 15px rgba(76, 175, 80, 0.5));
  display: block;
}

.text-green-accent { color: #4CAF50; }
.ls-tight { letter-spacing: -1.5px !important; }
.ls-2 { letter-spacing: 2px !important; }

/* FEATURE GRID */
.feature-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.features-glass-card {
  background: rgba(255, 255, 255, 0.04) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  backdrop-filter: blur(12px);
}

.feature-item {
  display: flex;
  align-items: center;
  transition: transform 0.2s ease;
}

.feature-item:hover {
  transform: translateX(5px);
}

/* LOGIN COLUMN */
.login-column {
  background: var(--bg-light);
}

.login-form-container {
  width: 100%;
  max-width: 440px;
  padding: 20px;
}

.custom-input-label {
  font-size: 0.75rem;
  font-weight: 800;
  color: #333;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
  display: block;
}

.modern-input :deep(.v-field) {
  border-radius: 12px !important;
  background: white !important;
}

.login-btn-action {
  height: 58px !important;
  font-weight: 700 !important;
  border-radius: 12px !important;
  background: var(--deep-black) !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.login-btn-action:hover {
  background: var(--dark-green) !important;
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(27, 94, 32, 0.3);
}

.border-top { border-top: 1px solid #E0E6E3; }

@media (max-width: 960px) {
  .feature-grid { grid-template-columns: 1fr; gap: 16px; }
}
</style>