<!-- frontend/src/components/admin/dialogs/PasswordResetDialog.vue -->
<template>
  <v-dialog v-model="dialogVisible" max-width="450" persistent>
    <v-card>
      <v-card-title class="bg-warning text-white">
        <v-icon start color="white">mdi-lock-reset</v-icon>
        Reset Password
      </v-card-title>

      <v-card-text class="pa-4">
        <div class="text-center mb-4">
          <v-avatar size="60" color="warning-lighten-5" class="mb-3">
            <v-icon size="32" color="warning">mdi-account-key</v-icon>
          </v-avatar>
          <div class="text-subtitle-1 font-weight-medium">Reset password for {{ username }}</div>
          <div class="text-caption text-medium-emphasis mt-1">
            Enter a new password below
          </div>
        </div>

        <v-form ref="form" v-model="valid">
          <v-text-field
            v-model="newPassword"
            label="New Password"
            type="password"
            :rules="[rules.passwordMinLength]"
            variant="outlined"
            density="comfortable"
            class="mb-3"
          />

          <v-text-field
            v-model="confirmPassword"
            label="Confirm Password"
            type="password"
            :rules="[rules.passwordMinLength, rules.passwordMatch]"
            variant="outlined"
            density="comfortable"
          />
        </v-form>
      </v-card-text>

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="close" :disabled="loading">Cancel</v-btn>
        <v-btn color="warning" @click="reset" :loading="loading" :disabled="!valid">
          Reset Password
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  userId: {
    type: Number,
    default: null
  },
  username: {
    type: String,
    default: ''
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:show', 'reset'])

const form = ref(null)
const valid = ref(false)
const newPassword = ref('')
const confirmPassword = ref('')

const rules = {
  passwordMinLength: v => !v || v.length >= 6 || 'Minimum 6 characters',
  passwordMatch: v => v === newPassword.value || 'Passwords do not match'
}

const dialogVisible = computed({
  get: () => props.show,
  set: (val) => emit('update:show', val)
})

const resetForm = () => {
  newPassword.value = ''
  confirmPassword.value = ''
  if (form.value) form.value.resetValidation()
}

const close = () => {
  emit('update:show', false)
  resetForm()
}

const reset = async () => {
  const isValid = await form.value?.validate()
  if (isValid?.valid && newPassword.value) {
    emit('reset', newPassword.value)
  }
}

watch(() => props.show, (newVal) => {
  if (!newVal) {
    resetForm()
  }
})
</script>