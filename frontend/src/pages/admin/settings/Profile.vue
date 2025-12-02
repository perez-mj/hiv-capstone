<template>
  <div>
    <h2 class="text-h5 mb-4">Profile Settings</h2>

    <v-form>
      <v-text-field label="Full Name" v-model="form.name" />
      <v-text-field label="Email Address" v-model="form.email" />
      <v-text-field label="Organization" v-model="form.organization" />
      <v-btn color="primary" class="mt-2" @click="save">Save Changes</v-btn>
    </v-form>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const form = ref({
  name: 'Dr. John Doe',
  email: 'admin@health.org',
  organization: 'My Health Network',
})

function save() {
  console.log('Saving Profile', form.value)
}
</script>
