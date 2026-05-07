<!-- frontend/src/components/admin/dialogs/CreateUserDialog.vue -->
<template>
  <v-dialog v-model="dialogVisible" max-width="500" persistent>
    <v-card>
      <v-card-title class="bg-success text-white">
        <v-icon start color="white">mdi-account-plus</v-icon>
        Create User Account
      </v-card-title>

      <v-card-text class="pa-4">
        <div class="text-center mb-4">
          <v-avatar size="60" color="success-lighten-5" class="mb-3">
            <v-icon size="32" color="success">mdi-doctor</v-icon>
          </v-avatar>
          <div class="text-subtitle-1 font-weight-medium">Creating account for {{ staffName }}</div>
          <div class="text-caption text-medium-emphasis mt-1">
            This will create a user account for this staff member
          </div>
        </div>

        <v-form ref="form" v-model="valid">
          <v-text-field
            v-model="formUsername"
            label="Username"
            :rules="[rules.required]"
            variant="outlined"
            density="comfortable"
            class="mb-3"
          />

          <v-text-field
            v-model="formPassword"
            label="Password"
            type="password"
            :rules="[rules.required, rules.passwordMinLength]"
            variant="outlined"
            density="comfortable"
            class="mb-3"
          />

          <v-select
            v-model="formRole"
            label="Role"
            :items="roleOptions"
            variant="outlined"
            density="comfortable"
            class="mb-3"
          />

          <v-alert type="info" variant="tonal" density="compact" class="mt-2">
            The staff member can change their password after first login
          </v-alert>
        </v-form>
      </v-card-text>

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="close" :disabled="loading">Cancel</v-btn>
        <v-btn color="success" @click="create" :loading="loading" :disabled="!valid">
          Create Account
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
  staffId: {
    type: Number,
    default: null
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
  },
  role: {
    type: String,
    default: 'NURSE'
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:show', 'create'])

const form = ref(null)
const valid = ref(false)
const formUsername = ref('')
const formPassword = ref('')
const formRole = ref('NURSE')

const roleOptions = [
  { title: 'Nurse', value: 'NURSE' },
  { title: 'Admin', value: 'ADMIN' }
]

const rules = {
  required: v => !!v || 'This field is required',
  passwordMinLength: v => v.length >= 6 || 'Minimum 6 characters'
}

const dialogVisible = computed({
  get: () => props.show,
  set: (val) => emit('update:show', val)
})

const resetForm = () => {
  formUsername.value = props.username
  formPassword.value = ''
  formRole.value = props.role
  if (form.value) form.value.resetValidation()
}

const close = () => {
  emit('update:show', false)
}

const create = async () => {
  const isValid = await form.value?.validate()
  if (isValid?.valid) {
    emit('create', {
      username: formUsername.value,
      password: formPassword.value,
      role: formRole.value
    })
  }
}

watch(() => props.show, (newVal) => {
  if (newVal) {
    resetForm()
  }
})

watch(() => props.username, (newVal) => {
  formUsername.value = newVal
})

watch(() => props.role, (newVal) => {
  formRole.value = newVal
})
</script>