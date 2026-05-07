<!-- frontend/src/components/admin/dialogs/StaffDialog.vue -->
<template>
  <v-dialog v-model="dialogVisible" max-width="600" persistent>
    <v-card class="edit-dialog">
      <v-card-title :style="{ backgroundColor: 'var(--color-primary)', color: 'white' }" class="pa-4">
        {{ title }}
      </v-card-title>

      <v-card-text class="pa-4">
        <v-form ref="form" v-model="valid">
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.first_name"
                label="First Name"
                :rules="[rules.required]"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.last_name"
                label="Last Name"
                :rules="[rules.required]"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
          </v-row>

          <v-text-field
            v-model="formData.middle_name"
            label="Middle Name"
            variant="outlined"
            density="comfortable"
            class="mb-3"
          />

          <v-text-field
            v-model="formData.position"
            label="Position"
            :rules="[rules.required]"
            variant="outlined"
            density="comfortable"
            class="mb-3"
          />

          <v-text-field
            v-model="formData.contact_number"
            label="Contact Number"
            variant="outlined"
            density="comfortable"
            class="mb-3"
          />

          <v-divider class="my-4" />

          <div v-if="mode === 'create'">
            <div class="text-subtitle-2 mb-2 text-medium-emphasis">Account Information</div>
            <v-text-field
              v-model="formData.username"
              label="Username (optional)"
              variant="outlined"
              density="comfortable"
              class="mb-3"
              hint="Leave empty to auto-generate"
              persistent-hint
            />

            <v-text-field
              v-model="formData.password"
              label="Password (optional)"
              type="password"
              variant="outlined"
              density="comfortable"
              class="mb-3"
              hint="Leave empty to auto-generate"
              persistent-hint
            />

            <v-select
              v-model="formData.role"
              label="Role"
              :items="roleOptions"
              variant="outlined"
              density="comfortable"
              class="mb-3"
            />
          </div>
        </v-form>
      </v-card-text>

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="close" :disabled="saving">Cancel</v-btn>
        <v-btn 
          color="primary" 
          @click="save" 
          :loading="saving"
          :disabled="!valid"
          :style="{ backgroundColor: 'var(--color-primary)', color: 'white' }"
        >
          Save
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  mode: {
    type: String,
    default: 'create'
  },
  title: {
    type: String,
    default: ''
  },
  data: {
    type: Object,
    default: () => ({})
  },
  saving: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:show', 'save'])

const form = ref(null)
const valid = ref(false)
const formData = reactive({
  user_id: null,
  first_name: '',
  last_name: '',
  middle_name: '',
  position: '',
  contact_number: '',
  username: '',
  password: '',
  role: 'NURSE'
})

const roleOptions = [
  { title: 'Nurse', value: 'NURSE' },
  { title: 'Admin', value: 'ADMIN' }
]

const rules = {
  required: v => !!v || 'This field is required'
}

const dialogVisible = computed({
  get: () => props.show,
  set: (val) => emit('update:show', val)
})

const resetForm = () => {
  formData.user_id = null
  formData.first_name = ''
  formData.last_name = ''
  formData.middle_name = ''
  formData.position = ''
  formData.contact_number = ''
  formData.username = ''
  formData.password = ''
  formData.role = 'NURSE'
  if (form.value) form.value.resetValidation()
}

const loadData = () => {
  if (props.data) {
    formData.user_id = props.data.user_id || null
    formData.first_name = props.data.first_name || ''
    formData.last_name = props.data.last_name || ''
    formData.middle_name = props.data.middle_name || ''
    formData.position = props.data.position || ''
    formData.contact_number = props.data.contact_number || ''
    formData.username = props.data.username || ''
    formData.password = props.data.password || ''
    formData.role = props.data.role || 'NURSE'
  }
}

const close = () => {
  emit('update:show', false)
  resetForm()
}

const save = async () => {
  const isValid = await form.value?.validate()
  if (isValid?.valid) {
    emit('save', { ...formData })
  }
}

watch(() => props.show, (newVal) => {
  if (newVal) {
    loadData()
  }
})
</script>