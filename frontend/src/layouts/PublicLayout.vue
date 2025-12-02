<!-- src/layouts/PublicLayout.vue -->
<template>
  <v-app>
    <v-main class="d-flex align-center justify-center public-layout">
      <v-container class="fill-height d-flex align-center justify-center">
        <v-row justify="center">
          <v-col>
            <!-- 🔹 Slot where Login or Register page renders -->
            <router-view />
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
</script>

<style scoped>
.public-layout {
  min-height: 100vh;
}
</style>
