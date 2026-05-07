<!-- frontend/src/components/admin/dialogs/PasswordDisplayDialog.vue -->
<template>
  <v-dialog v-model="dialogVisible" max-width="450" persistent>
    <v-card>
      <v-card-title class="bg-success text-white">
        <v-icon start color="white">mdi-key</v-icon>
        Account Created Successfully
      </v-card-title>

      <v-card-text class="pa-4">
        <div class="text-center">
          <v-icon size="64" color="success" class="mb-3">mdi-check-circle</v-icon>
          <div class="text-subtitle-1 font-weight-medium mb-2">
            Staff account created for {{ staffName }}
          </div>
          
          <v-alert type="warning" variant="tonal" class="mb-4">
            <div class="text-caption font-weight-medium mb-2">
              Please save these credentials now. This password will not be shown again.
            </div>
          </v-alert>

          <v-card variant="outlined" class="mb-3">
            <v-card-text class="pa-3">
              <div class="d-flex justify-space-between align-center mb-2">
                <span class="text-caption font-weight-medium">Username:</span>
                <span class="text-body-2 font-mono">{{ username }}</span>
              </div>
              <div class="d-flex justify-space-between align-center">
                <span class="text-caption font-weight-medium">Password:</span>
                <div class="d-flex align-center">
                  <span class="text-body-2 font-mono mr-2">
                    {{ showPassword ? password : '••••••••••' }}
                  </span>
                  <v-btn
                    size="x-small"
                    variant="text"
                    :icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                    @click="showPassword = !showPassword"
                  />
                </div>
              </div>
            </v-card-text>
          </v-card>

          <v-btn
            color="primary"
            variant="outlined"
            size="small"
            prepend-icon="mdi-content-copy"
            @click="copyCredentials"
            class="mb-2"
          >
            Copy Credentials
          </v-btn>
        </div>
      </v-card-text>

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn color="primary" @click="close">
          I have saved these credentials
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  staffName: {
    type: String,
    default: ''
  },
  username: {
    type: String,
    default: ''
  },
  password: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:show'])

const showPassword = ref(false)

const dialogVisible = computed({
  get: () => props.show,
  set: (val) => emit('update:show', val)
})

const copyCredentials = () => {
  const credentials = `Username: ${props.username}\nPassword: ${props.password}`
  navigator.clipboard.writeText(credentials)
}

const close = () => {
  showPassword.value = false
  emit('update:show', false)
}
</script>

<style scoped>
.font-mono {
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
}
</style>