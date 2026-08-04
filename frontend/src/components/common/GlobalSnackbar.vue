<!-- frontend/src/components/common/GlobalSnackbar.vue -->
<template>
  <v-snackbar
    v-model="snackbarState.show"
    :color="snackbarState.color"
    :timeout="snackbarState.timeout"
    :location="snackbarState.position"
    elevation="8"
    rounded="lg"
    variant="flat"
    class="global-snackbar"
  >
    <div class="d-flex align-center">
      <v-icon 
        class="mr-3" 
        :color="iconColor"
        size="24"
      >
        {{ iconName }}
      </v-icon>
      <span class="font-weight-medium">{{ snackbarState.message }}</span>
    </div>
    
    <template v-slot:actions>
      <v-btn
        variant="text"
        icon="mdi-close"
        @click="snackbarState.show = false"
        :color="iconColor"
        size="small"
      >
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </template>
  </v-snackbar>
</template>

<script setup>
import { computed } from 'vue';
import { useSnackbar } from '@/plugins/snackbar';

const { snackbarState } = useSnackbar();

const iconColor = computed(() => {
  const colorMap = {
    success: 'white',
    error: 'white',
    warning: 'white',
    info: 'white',
  };
  return colorMap[snackbarState.value.color] || 'white';
});

const iconName = computed(() => {
  const iconMap = {
    success: 'mdi-check-circle',
    error: 'mdi-alert-circle',
    warning: 'mdi-alert',
    info: 'mdi-information',
  };
  return iconMap[snackbarState.value.color] || 'mdi-information';
});
</script>

<style scoped>
.global-snackbar {
  max-width: 500px;
  min-width: 300px;
}

.global-snackbar :deep(.v-snackbar__wrapper) {
  padding: 12px 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.global-snackbar :deep(.v-snackbar__content) {
  padding: 8px 0;
}

@media (max-width: 600px) {
  .global-snackbar {
    max-width: 100%;
    min-width: auto;
    margin: 8px;
  }
}
</style>