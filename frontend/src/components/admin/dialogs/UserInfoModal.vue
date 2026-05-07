<!-- frontend/src/components/admin/dialogs/UserInfoModal.vue -->
<template>
  <v-dialog v-model="dialogVisible" max-width="400" persistent>
    <v-card class="info-dialog">
      <v-card-title class="bg-info text-white">
        <v-icon start color="white">mdi-information</v-icon>
        User Management
      </v-card-title>

      <v-card-text class="pa-4 text-center">
        <v-icon size="64" color="info" class="mb-3">mdi-account-group</v-icon>
        <div class="text-subtitle-1 font-weight-medium mb-3">
          User accounts are managed through Patient and Staff records
        </div>

        <div class="text-body-2 text-medium-emphasis mb-4">
          Users are automatically created when you add Patients or Staff members. 
          Please use the respective management sections to create or edit user accounts.
        </div>

        <v-divider class="my-3" />

        <div class="d-flex flex-column gap-2">
          <v-btn 
            color="success" 
            block
            prepend-icon="mdi-account-heart"
            @click="$emit('go-to-patients')"
          >
            Manage Patients
          </v-btn>
          <v-btn 
            color="warning" 
            block
            prepend-icon="mdi-doctor"
            @click="$emit('go-to-staff')"
          >
            Manage Staff
          </v-btn>
        </div>
      </v-card-text>

      <v-card-actions class="pa-3">
        <v-spacer />
        <v-btn variant="text" @click="close">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:show', 'go-to-patients', 'go-to-staff'])

const dialogVisible = computed({
  get: () => props.show,
  set: (val) => emit('update:show', val)
})

const close = () => {
  emit('update:show', false)
}
</script>