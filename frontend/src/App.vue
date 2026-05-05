<!-- frontend/src/App.vue -->
<template>
  <div id="app">
    <!-- TODO: Add transition effects -->
    <router-view />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

onMounted(() => {
  // Check if user is already authenticated on app load
  authStore.checkAuth()
})
</script>
