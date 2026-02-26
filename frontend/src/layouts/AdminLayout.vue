<!-- frontend/src/layouts/AdminLayout.vue -->
<template>
  <v-app>
    <!-- Sidebar -->
    <Sidebar v-model="drawer" app />

    <!-- Header -->
    <Header app @toggle-drawer="drawer = !drawer" />

    <!-- Main content -->
    <v-main>
      <v-container fluid class="pa-4">
        <router-view />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref } from 'vue'
import Sidebar from '@/components/layout/Sidebar.vue'
import Header from '@/components/layout/Header.vue'

const drawer = ref(false)
</script>