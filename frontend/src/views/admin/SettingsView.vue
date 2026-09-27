<!-- frontend/src/views/admin/SettingsView.vue -->
<template>
  <v-container fluid class="settings-container">
    <!-- Header -->
    <v-row>
      <v-col cols="12">
        <v-card class="settings-header-card" elevation="0">
          <v-card-title class="pa-4">
            <div class="d-flex align-center w-100 flex-wrap">
              <span class="text-h5 font-weight-bold">System Settings</span>
            </div>
          </v-card-title>
        </v-card>
      </v-col>
    </v-row>

    <!-- Tabs -->
    <v-row class="mt-2">
      <v-col cols="12">
        <v-card elevation="2">
          <v-tabs v-model="activeTab" bg-color="surface" color="primary" density="comfortable" show-arrows>
            <v-tab value="general" prepend-icon="mdi-tune">
              General
            </v-tab>
            <v-tab value="appointments" prepend-icon="mdi-calendar-clock">
              Appointments
            </v-tab>
            <v-tab value="transaction-types" prepend-icon="mdi-tag-multiple">
              Transaction Types
            </v-tab>
          </v-tabs>

          <v-divider />

          <v-card-text class="pa-0">
            <v-window v-model="activeTab">
              <v-window-item value="general">
                <GeneralSettingsTab />
              </v-window-item>

              <v-window-item value="appointments">
                <AppointmentSettingsTab />
              </v-window-item>

              <v-window-item value="transaction-types">
                <TransactionTypesTab />
              </v-window-item>
            </v-window>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import GeneralSettingsTab from '@/components/settings/GeneralSettingsTab.vue';
import AppointmentSettingsTab from '@/components/settings/AppointmentSettingsTab.vue';
import TransactionTypesTab from '@/components/settings/TransactionTypesTab.vue';

const route = useRoute();
const router = useRouter();

// Sync tab with query param so tabs are bookmarkable
const validTabs = ['general', 'appointments', 'transaction-types'];
const initialTab = validTabs.includes(route.query.tab) ? route.query.tab : 'general';
const activeTab = ref(initialTab);

watch(activeTab, (tab) => {
  if (route.query.tab !== tab) {
    router.replace({ query: { ...route.query, tab } });
  }
});

watch(
  () => route.query.tab,
  (tab) => {
    if (tab && validTabs.includes(tab) && tab !== activeTab.value) {
      activeTab.value = tab;
    }
  }
);
</script>

<style scoped>
.settings-container {
  min-height: 100vh;
  padding: 16px;
}

.settings-header-card {
  border-radius: 12px;
}
</style>