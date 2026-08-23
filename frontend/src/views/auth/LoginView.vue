<!-- frontend/src/views/auth/LoginView.vue -->
<template>
  <div class="login-page">
    <v-container fluid class="pa-0 ma-0 fill-height">
      <v-row no-gutters class="fill-height">
        <v-col cols="12" md="6" class="brand-section d-none d-md-flex">
          <div class="brand-mesh"></div>
          <div class="brand-content-wrapper d-flex align-center justify-center fill-height">
            <div class="brand-content-group text-center">
              <div class="brand-logo-container mb-10 d-flex flex-column align-center">
                <img src="@/assets/logo.svg" alt="OMPH HIV CARE Logo" class="logo-img mb-6" />
                
                <div class="d-flex align-center mb-2 justify-center">
                  <h1 class="text-h3 font-weight-black ls-tight">
                    OMPH <span class="text-primary">HIV</span>
                  </h1>
                  <v-chip color="primary" variant="flat" density="comfortable" class="ml-3 font-weight-black px-4">CARE</v-chip>
                </div>
                
                <div class="brand-identity-line mb-6 flex-column align-center">
                  <p class="text-h6 font-weight-medium text-medium-emphasis mb-0">Testing & Treatment Management</p>
                </div>
              </div>

              <v-card class="features-glass-card mb-10" rounded="xl">
                <v-card-text class="pa-8">
                  <div class="feature-grid">
                    <div v-for="(f, i) in features" :key="i" class="feature-item">
                      <v-avatar :color="`${getThemeColor()}20`" size="48" rounded="lg" class="mr-4">
                        <v-icon color="primary" size="24">{{ f.icon }}</v-icon>
                      </v-avatar>
                      <div class="feature-text text-left">
                        <div class="text-subtitle-2 font-weight-bold">{{ f.title }}</div>
                        <div class="text-caption text-medium-emphasis">{{ f.desc }}</div>
                      </div>
                    </div>
                  </div>
                </v-card-text>
              </v-card>

              <div class="brand-footer d-flex flex-column align-center">
                <v-divider class="mb-4 w-100"></v-divider>
                <div class="d-flex align-center text-caption font-weight-medium">
                  <v-icon size="16" class="mr-2" color="primary">mdi-shield-account-variant</v-icon>
                  Secure Health Information System © 2026
                </div>
              </div>
            </div>
          </div>
        </v-col>

        <v-col cols="12" md="6" class="login-column d-flex align-center justify-center">
          <div class="login-form-container">
            <div class="text-center mb-12">
              <v-avatar size="84" color="primary-lighten-5" class="mb-4">
                <v-icon size="48" color="primary-darken-3">mdi-account-circle-outline</v-icon>
              </v-avatar>
              <h2 class="text-h4 font-weight-black text-high-emphasis mb-2">Welcome Back</h2>
              <p class="text-body-2 text-medium-emphasis px-8">Enter your credentials to continue</p>
            </div>

            <v-form ref="form" v-model="valid" @submit.prevent="login" class="login-form">
              <div class="input-field-group mb-5">
                <label class="custom-input-label">Username</label>
                <v-text-field 
                  v-model="username" 
                  variant="outlined" 
                  density="comfortable"
                  placeholder="Enter your username"
                  prepend-inner-icon="mdi-account-outline" 
                  :rules="[requiredRule]" 
                  :disabled="loading" 
                  color="primary"
                  class="modern-input" 
                />
              </div>

              <div class="input-field-group mb-8">
                <label class="custom-input-label">Password</label>
                <v-text-field 
                  v-model="password" 
                  variant="outlined" 
                  density="comfortable"
                  placeholder="Enter your password"
                  prepend-inner-icon="mdi-lock-outline" 
                  :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                  :type="showPassword ? 'text' : 'password'" 
                  :rules="[requiredRule]" 
                  :disabled="loading"
                  @click:append-inner="showPassword = !showPassword" 
                  color="primary"
                  class="modern-input" 
                  @keyup.enter="login"
                />
              </div>

              <v-btn 
                type="submit" 
                color="primary" 
                size="x-large" 
                :loading="loading" 
                block
                flat
                class="login-btn-action text-none py-4"
                :disabled="!valid"
              >
                Sign In 
                <v-icon end size="20" class="ml-2">mdi-chevron-right</v-icon>
              </v-btn>

              <v-expand-transition>
                <v-alert v-if="snackbar.show && snackbar.color === 'error'" type="error" variant="tonal" class="mt-6 rounded-lg" border="start">
                  <div class="text-caption font-weight-bold">{{ snackbar.message }}</div>
                </v-alert>
              </v-expand-transition>
            </v-form>

            <div class="mt-12 pt-6 border-top text-center">
              <p class="text-caption font-weight-bold">
                <v-icon size="14" class="mr-1">mdi-alert-octagon</v-icon>
                Role-based access control. Unauthorized access prohibited.
              </p>
            </div>
          </div>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from 'vuetify';

const router = useRouter();
const authStore = useAuthStore();
const theme = useTheme();

const username = ref('');
const password = ref('');
const showPassword = ref(false);
const valid = ref(false);
const loading = ref(false);
const form = ref(null);

const snackbar = ref({
  show: false,
  message: '',
  color: 'success'
});

const requiredRule = v => !!v || 'Field is required';

const features = [
  { icon: 'mdi-calendar-check', title: 'Appointment Management', desc: 'Scheduling & queue tracking' },
  { icon: 'mdi-clipboard-pulse', title: 'Testing Workflow', desc: 'Pre/post-test counseling & results' },
  { icon: 'mdi-pill', title: 'Treatment Management', desc: 'ART prescription & follow-up care' },
  { icon: 'mdi-cellphone-check', title: 'Self-Service Kiosk', desc: 'Check-in & queue slip printing' },
  { icon: 'mdi-clock-outline', title: 'Real-Time Queue', desc: 'Live updates & status tracking' },
  { icon: 'mdi-shield-lock', title: 'Blockchain Audit', desc: 'Tamper-proof record verification' }
];

const getThemeColor = () => {
  return theme.current.value.colors.primary || 'primary';
};

const login = async () => {
  if (!form.value?.validate()) return;
  
  loading.value = true;
  const result = await authStore.login(username.value, password.value);
  
  if (result.success) {
    if (result.user.role === 'admin') {
      router.push('/admin');
    } else {
      router.push('/dashboard');
    }
  } else {
    snackbar.value = {
      show: true,
      message: result.error || 'Access Denied: Please check your credentials.',
      color: 'error'
    };
  }
  loading.value = false;
};
</script>

<style scoped>
.login-page {
  height: 100vh;
  overflow: hidden;
}

/* BRAND SECTION */
.brand-section {
  position: relative;
  overflow: hidden;
  background-color: rgb(var(--v-theme-surface));
}

.brand-mesh {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  background-image: radial-gradient(at 50% 50%, rgba(var(--v-theme-primary), 0.1) 0, transparent 70%);
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
}

/* LOGO STYLING */
.logo-img {
  width: 100px;
  height: auto;
  display: block;
}

.ls-tight { letter-spacing: -1.5px !important; }

/* FEATURE GRID */
.feature-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.features-glass-card {
  background: rgba(var(--v-theme-surface), 0.04) !important;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1) !important;
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
  background: rgb(var(--v-theme-surface));
}

.login-form-container {
  width: 100%;
  max-width: 440px;
  padding: 20px;
}

.custom-input-label {
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
  display: block;
  color: rgb(var(--v-theme-on-surface-variant));
}

.modern-input :deep(.v-field) {
  border-radius: 12px !important;
  background: rgb(var(--v-theme-surface)) !important;
}

.login-btn-action {
  height: 58px !important;
  font-weight: 700 !important;
  border-radius: 12px !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.login-btn-action:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(var(--v-theme-primary), 0.3);
}

.border-top { 
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.12); 
}

@media (max-width: 960px) {
  .feature-grid { grid-template-columns: 1fr; gap: 16px; }
}
</style>