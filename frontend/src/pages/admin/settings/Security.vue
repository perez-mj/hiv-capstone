<template>
  <div>
    <h2 class="text-h5 mb-4">Security Settings</h2>

    <v-card class="mb-4 pa-4">
      <h3 class="text-subtitle-1 mb-3">Change Password</h3>
      <v-form>
        <v-text-field label="Current Password" type="password" />
        <v-text-field label="New Password" type="password" />
        <v-text-field label="Confirm New Password" type="password" />
        <v-btn color="primary" class="mt-2">Update Password</v-btn>
      </v-form>
    </v-card>

    <v-card class="pa-4">
      <h3 class="text-subtitle-1 mb-3">Two-Factor Authentication</h3>
      <v-switch label="Enable 2FA" v-model="twoFA" />
    </v-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const twoFA = ref(false)
</script>
