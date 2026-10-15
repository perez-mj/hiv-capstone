<!-- frontend/src/views/staff/ChangePasswordView.vue -->
<template>
  <div class="change-password-view">
    <!-- Page Header -->
    <div class="d-flex align-center mb-6">
      <v-btn icon variant="text" class="mr-2" @click="$router.back()">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
      <div>
        <h1 class="text-h5 font-weight-bold">Change Password</h1>
      </div>
    </div>

    <v-row justify="center">
      <v-col cols="12" md="8" lg="6">
        <v-card elevation="2">
          <v-card-title class="d-flex align-center pa-4">
            <v-icon class="mr-2" color="primary">mdi-lock-reset</v-icon>
            <span class="text-h6 font-weight-bold">Password Settings</span>
          </v-card-title>
          <v-divider />

          <v-card-text class="pa-6">
            <!-- Info Alert -->
            <v-alert
              type="info"
              variant="tonal"
              density="compact"
              class="mb-6"
              icon="mdi-information"
            >
              <div class="text-body-2">
                Your password must be at least <strong>8 characters</strong> long and
                contain a mix of letters, numbers, and special characters.
              </div>
            </v-alert>

            <v-form ref="formRef" v-model="isFormValid" @submit.prevent="handleSubmit">
              <!-- Current Password -->
              <v-text-field
                v-model="form.current_password"
                :type="showCurrentPassword ? 'text' : 'password'"
                label="Current Password"
                prepend-inner-icon="mdi-lock"
                :append-inner-icon="showCurrentPassword ? 'mdi-eye-off' : 'mdi-eye'"
                :rules="currentPasswordRules"
                variant="outlined"
                class="mb-2"
                :disabled="loading"
                @click:append-inner="showCurrentPassword = !showCurrentPassword"
              />

              <v-divider class="my-4" />

              <!-- New Password -->
              <v-text-field
                v-model="form.new_password"
                :type="showNewPassword ? 'text' : 'password'"
                label="New Password"
                prepend-inner-icon="mdi-lock-plus"
                :append-inner-icon="showNewPassword ? 'mdi-eye-off' : 'mdi-eye'"
                :rules="newPasswordRules"
                variant="outlined"
                class="mb-2"
                :disabled="loading"
                @click:append-inner="showNewPassword = !showNewPassword"
              />

              <!-- Password Strength Indicator -->
              <div v-if="form.new_password" class="mb-4">
                <div class="d-flex align-center justify-space-between mb-2">
                  <span class="text-caption text-medium-emphasis">Password Strength</span>
                  <span
                    class="text-caption font-weight-bold"
                    :class="`text-${passwordStrength.color}`"
                  >
                    {{ passwordStrength.label }}
                  </span>
                </div>
                <v-progress-linear
                  :model-value="passwordStrength.percentage"
                  :color="passwordStrength.color"
                  height="6"
                  rounded
                />
                <div class="d-flex flex-wrap ga-1 mt-2">
                  <v-chip
                    v-for="req in passwordRequirements"
                    :key="req.label"
                    :color="req.met ? 'success' : 'grey'"
                    size="x-small"
                    variant="tonal"
                  >
                    <v-icon start size="x-small">
                      {{ req.met ? 'mdi-check' : 'mdi-close' }}
                    </v-icon>
                    {{ req.label }}
                  </v-chip>
                </div>
              </div>

              <!-- Confirm New Password -->
              <v-text-field
                v-model="form.confirm_password"
                :type="showConfirmPassword ? 'text' : 'password'"
                label="Confirm New Password"
                prepend-inner-icon="mdi-lock-check"
                :append-inner-icon="showConfirmPassword ? 'mdi-eye-off' : 'mdi-eye'"
                :rules="confirmPasswordRules"
                variant="outlined"
                class="mb-4"
                :disabled="loading"
                @click:append-inner="showConfirmPassword = !showConfirmPassword"
              />

              <!-- Action Buttons -->
              <div class="d-flex ga-3">
                <v-btn
                  variant="outlined"
                  size="large"
                  :disabled="loading"
                  @click="handleReset"
                >
                  Reset
                </v-btn>
                <v-btn
                  type="submit"
                  color="primary"
                  size="large"
                  :loading="loading"
                  :disabled="!isFormValid || !isPasswordValid"
                  block
                >
                  Change Password
                </v-btn>
              </div>
            </v-form>
          </v-card-text>
        </v-card>

        <!-- Security Tips -->
        <v-card class="mt-4" elevation="1" variant="tonal">
          <v-card-text class="pa-4">
            <div class="d-flex align-start">
              <v-icon color="info" class="mr-3 mt-1">mdi-lightbulb-on-outline</v-icon>
              <div>
                <p class="text-body-2 font-weight-bold mb-2">Password Security Tips</p>
                <ul class="text-body-2 text-medium-emphasis pl-4">
                  <li>Use a unique password not used on other sites</li>
                  <li>Avoid personal information like names or birthdays</li>
                  <li>Consider using a password manager</li>
                  <li>Change your password regularly</li>
                </ul>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Success Dialog -->
    <v-dialog v-model="showSuccessDialog" max-width="400" persistent>
      <v-card class="text-center pa-6">
        <v-avatar color="success" size="64" class="mb-4">
          <v-icon size="36" color="white">mdi-check</v-icon>
        </v-avatar>
        <h2 class="text-h6 font-weight-bold mb-2">Password Changed!</h2>
        <p class="text-body-2 text-medium-emphasis mb-4">
          Your password has been successfully updated. You will be redirected to login.
        </p>
        <v-btn color="primary" block @click="redirectToLogin">
          Continue to Login
        </v-btn>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useSnackbar } from '@/plugins/snackbar'

const router = useRouter()
const authStore = useAuthStore()
const snackbar = useSnackbar()

// Form state
const formRef = ref(null)
const isFormValid = ref(false)
const loading = ref(false)
const showSuccessDialog = ref(false)

const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)

const form = reactive({
  current_password: '',
  new_password: '',
  confirm_password: ''
})

// Password requirements
const passwordRequirements = computed(() => [
  { label: '8+ chars', met: form.new_password.length >= 8 },
  { label: 'Uppercase', met: /[A-Z]/.test(form.new_password) },
  { label: 'Lowercase', met: /[a-z]/.test(form.new_password) },
  { label: 'Number', met: /\d/.test(form.new_password) },
  { label: 'Special', met: /[!@#$%^&*(),.?":{}|<>]/.test(form.new_password) }
])

const isPasswordValid = computed(() =>
  passwordRequirements.value.every(req => req.met)
)

// Password strength calculation
const passwordStrength = computed(() => {
  const password = form.new_password
  if (!password) return { percentage: 0, label: '', color: 'grey' }

  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[a-z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++

  const percentage = Math.min((score / 6) * 100, 100)

  if (percentage < 40) return { percentage, label: 'Weak', color: 'error' }
  if (percentage < 70) return { percentage, label: 'Fair', color: 'warning' }
  if (percentage < 90) return { percentage, label: 'Good', color: 'info' }
  return { percentage, label: 'Strong', color: 'success' }
})

// Validation rules
const currentPasswordRules = [
  v => !!v || 'Current password is required'
]

const newPasswordRules = [
  v => !!v || 'New password is required',
  v => v.length >= 8 || 'Password must be at least 8 characters',
  v => /[A-Z]/.test(v) || 'Must contain an uppercase letter',
  v => /[a-z]/.test(v) || 'Must contain a lowercase letter',
  v => /\d/.test(v) || 'Must contain a number',
  v => /[!@#$%^&*(),.?":{}|<>]/.test(v) || 'Must contain a special character',
  v => v !== form.current_password || 'New password must be different from current password'
]

const confirmPasswordRules = [
  v => !!v || 'Please confirm your new password',
  v => v === form.new_password || 'Passwords do not match'
]

// Methods
const handleSubmit = async () => {
  const { valid } = await formRef.value.validate()
  if (!valid) return

  loading.value = true
  try {
    await authStore.changePassword({
      current_password: form.current_password,
      new_password: form.new_password
    })

    showSuccessDialog.value = true
  } catch (error) {
    const message = error.response?.data?.error || error.message || 'Failed to change password'
    snackbar.error(message)

    // Clear current password field on auth error
    if (error.response?.status === 400) {
      form.current_password = ''
    }
  } finally {
    loading.value = false
  }
}

const handleReset = () => {
  form.current_password = ''
  form.new_password = ''
  form.confirm_password = ''
  formRef.value?.resetValidation()
}

const redirectToLogin = async () => {
  await authStore.logout()
  showSuccessDialog.value = false
  router.push('/login')
}
</script>

<style scoped>
.change-password-view {
  max-width: 1200px;
  margin: 0 auto;
}

ul {
  list-style-type: disc;
}

ul li {
  margin-bottom: 4px;
}
</style>