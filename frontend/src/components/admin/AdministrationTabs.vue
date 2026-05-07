<!-- frontend/src/components/admin/AdministrationTabs.vue -->
<template>
  <v-tabs 
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    color="primary" 
    align-tabs="start" 
    class="mb-4" 
    show-arrows
  >
    <v-tab value="users">
      <v-icon start>mdi-account-group</v-icon>
      Users
      <v-chip size="x-small" class="ml-2" color="primary">{{ usersCount }}</v-chip>
    </v-tab>
    <v-tab value="staff">
      <v-icon start>mdi-doctor</v-icon>
      Staff
      <v-chip size="x-small" class="ml-2" color="primary">{{ staffCount }}</v-chip>
    </v-tab>
    <v-tab value="kiosk_devices">
      <v-icon start>mdi-devices</v-icon>
      Kiosk Devices
      <v-chip size="x-small" class="ml-2" color="primary">{{ kioskDevicesCount }}</v-chip>
    </v-tab>
    <v-tab value="appointment_types">
      <v-icon start>mdi-calendar-clock</v-icon>
      Appointment Types
      <v-chip size="x-small" class="ml-2" color="primary">{{ appointmentTypesCount }}</v-chip>
    </v-tab>
  </v-tabs>
</template>

<script setup>
defineProps({
  modelValue: {
    type: String,
    required: true
  },
  usersCount: {
    type: Number,
    default: 0
  },
  staffCount: {
    type: Number,
    default: 0
  },
  kioskDevicesCount: {
    type: Number,
    default: 0
  },
  appointmentTypesCount: {
    type: Number,
    default: 0
  }
})

defineEmits(['update:modelValue'])
</script>