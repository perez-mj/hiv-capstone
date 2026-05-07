<!-- frontend/src/components/admin/dialogs/AppointmentTypeDialog.vue -->
<template>
  <v-dialog v-model="dialogVisible" max-width="500" persistent>
    <v-card class="edit-dialog">
      <v-card-title :style="{ backgroundColor: 'var(--color-primary)', color: 'white' }" class="pa-4">
        {{ title }}
      </v-card-title>

      <v-card-text class="pa-4">
        <v-form ref="form" v-model="valid">
          <v-text-field
            v-model="formData.type_name"
            label="Type Name"
            :rules="[rules.required]"
            variant="outlined"
            density="comfortable"
            class="mb-3"
          />

          <v-textarea
            v-model="formData.description"
            label="Description"
            variant="outlined"
            density="comfortable"
            rows="3"
            class="mb-3"
          />

          <v-text-field
            v-model="formData.duration_minutes"
            label="Duration (minutes)"
            type="number"
            :rules="[rules.required, rules.positive]"
            variant="outlined"
            density="comfortable"
            class="mb-3"
          />

          <v-switch
            v-model="formData.is_active"
            label="Active"
            color="primary"
            hide-details
          />
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
  type_name: '',
  description: '',
  duration_minutes: 30,
  is_active: true
})

const rules = {
  required: v => !!v || 'This field is required',
  positive: v => v > 0 || 'Must be greater than 0'
}

const dialogVisible = computed({
  get: () => props.show,
  set: (val) => emit('update:show', val)
})

const resetForm = () => {
  formData.type_name = ''
  formData.description = ''
  formData.duration_minutes = 30
  formData.is_active = true
  if (form.value) form.value.resetValidation()
}

const loadData = () => {
  if (props.data) {
    formData.type_name = props.data.type_name || ''
    formData.description = props.data.description || ''
    formData.duration_minutes = props.data.duration_minutes || 30
    formData.is_active = props.data.is_active !== undefined ? props.data.is_active : true
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