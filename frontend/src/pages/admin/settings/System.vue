<template>
  <div>
    <h2 class="text-h5 mb-4">System Settings</h2>

    <v-card class="mb-4 pa-4">
      <h3 class="text-subtitle-1 mb-3">System Information</h3>
      <v-list density="compact">
        <v-list-item>
          <v-list-item-title>App Version</v-list-item-title>
          <v-list-item-subtitle>v1.0.0</v-list-item-subtitle>
        </v-list-item>
        <v-list-item>
          <v-list-item-title>API Status</v-list-item-title>
          <v-list-item-subtitle class="text-success">Online</v-list-item-subtitle>
        </v-list-item>
        <v-list-item>
          <v-list-item-title>Server Uptime</v-list-item-title>
          <v-list-item-subtitle>99.9%</v-list-item-subtitle>
        </v-list-item>
      </v-list>
    </v-card>

    <v-card class="pa-4">
      <h3 class="text-subtitle-1 mb-3">Maintenance Mode</h3>
      <v-switch label="Enable Maintenance Mode" v-model="maintenance" />
    </v-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const maintenance = ref(false)
</script>
