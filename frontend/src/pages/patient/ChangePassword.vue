<!-- frontend/src/pages/patient/ChangePassword.vue -->
<template>
  <div class="change-password">
    <v-card max-width="500" class="mx-auto">
      <v-card-title>
        Change Password
      </v-card-title>

      <v-card-text>
        <v-form ref="form" v-model="formValid" @submit.prevent="submitChange">
          <v-text-field v-model="currentPassword" label="Current Password" type="password"
            :rules="[v => !!v || 'Current password is required']" variant="outlined" density="comfortable"
            prepend-inner-icon="mdi-lock"></v-text-field>

          <v-text-field v-model="newPassword" label="New Password" type="password"
            :rules="passwordRules" variant="outlined" density="comfortable"
            prepend-inner-icon="mdi-lock-plus"></v-text-field>

          <v-text-field v-model="confirmPassword" label="Confirm New Password" type="password"
            :rules="[v => !!v || 'Please confirm your password', v => v === newPassword || 'Passwords do not match']"
            variant="outlined" density="comfortable" prepend-inner-icon="mdi-lock-check"></v-text-field>

          <!-- Password Requirements -->
          <v-alert type="info" variant="tonal" dense class="mt-3">
            <div class="text-caption font-weight-bold mb-1">Password Requirements:</div>
            <ul class="text-caption pl-3 ma-0">
              <li :class="{ 'text-success': newPassword.length >= 6 }">
                <v-icon :icon="newPassword.length >= 6 ? 'mdi-check-circle' : 'mdi-circle-outline'" size="14" class="mr-1"></v-icon>
                At least 6 characters
              </li>
              <li :class="{ 'text-success': /[A-Z]/.test(newPassword) }">
                <v-icon :icon="/[A-Z]/.test(newPassword) ? 'mdi-check-circle' : 'mdi-circle-outline'" size="14" class="mr-1"></v-icon>
                At least one uppercase letter
              </li>
              <li :class="{ 'text-success': /[0-9]/.test(newPassword) }">
                <v-icon :icon="/[0-9]/.test(newPassword) ? 'mdi-check-circle' : 'mdi-circle-outline'" size="14" class="mr-1"></v-icon>
                At least one number
              </li>
            </ul>
          </v-alert>
        </v-form>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="cancel">Cancel</v-btn>
        <v-btn color="primary" :loading="loading" :disabled="!formValid" @click="submitChange">
          Change Password
        </v-btn>
      </v-card-actions>
    </v-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSnackbarStore } from '@/stores/snackbar'
import http from '@/api/http'

const router = useRouter()
const snackbarStore = useSnackbarStore()

// Form state
const form = ref(null)
const formValid = ref(false)
const loading = ref(false)
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

// Password validation rules
const passwordRules = [
  v => !!v || 'New password is required',
  v => v.length >= 6 || 'Password must be at least 6 characters',
  v => /[A-Z]/.test(v) || 'Password must contain at least one uppercase letter',
  v => /[0-9]/.test(v) || 'Password must contain at least one number'
]

const submitChange = async () => {
  if (!formValid.value) return
  
  loading.value = true
  try {
    await http.post('/auth/change-password', {
      current_password: currentPassword.value,
      new_password: newPassword.value,
      confirm_password: confirmPassword.value
    })
    
    snackbarStore.showSuccess('Password changed successfully')
    
    // Optionally redirect to profile
    setTimeout(() => {
      router.push('/patient/profile')
    }, 1500)
    
  } catch (error) {
    snackbarStore.showError(error.response?.data?.error || 'Failed to change password')
  } finally {
    loading.value = false
  }
}

const cancel = () => {
  router.push('/patient/profile')
}
</script>