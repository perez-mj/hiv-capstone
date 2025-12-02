<template>
  <div>
    <h2 class="text-h5 mb-4">Notification Preferences</h2>

    <v-form>
      <v-switch label="Email Alerts" v-model="prefs.email" />
      <v-switch label="SMS Notifications" v-model="prefs.sms" />
      <v-switch label="System Alerts" v-model="prefs.system" />
      <v-btn color="primary" class="mt-2" @click="save">Save Preferences</v-btn>
    </v-form>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const prefs = ref({
  email: true,
  sms: false,
  system: true,
})

function save() {
  console.log('Saving Notifications', prefs.value)
}
</script>
