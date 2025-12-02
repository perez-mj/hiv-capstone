<template>
  <v-container fluid>
    <v-row>
      <!-- Settings Side Menu -->
      <v-col cols="12" md="3">
        <v-card elevation="2">
          <v-list nav density="compact">
            <v-list-item
              v-for="item in settingsMenu"
              :key="item.title"
              :to="item.to"
              exact
              link
            >
              <v-list-item-title>{{ item.title }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>

      <!-- Settings Content -->
      <v-col cols="12" md="9">
        <v-card elevation="2" class="pa-4">
          <router-view />
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
const settingsMenu = [
  { title: 'Profile', to: '/admin/settings/profile' },
  { title: 'Security', to: '/admin/settings/security' },
  { title: 'Notifications', to: '/admin/settings/notifications' },
  { title: 'System', to: '/admin/settings/system' },
]
</script>
