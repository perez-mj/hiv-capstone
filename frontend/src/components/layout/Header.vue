<!-- frontend/src/components/layout/Header.vue -->
<template>
  <v-app-bar 
    app 
    dark
    elevation="2"
    class="app-header"
  >
    <v-app-bar-nav-icon @click="$emit('toggle-drawer')" />
    <v-toolbar-title class="mx-auto">
      OMPH Test And Treat Enrollment System
    </v-toolbar-title>
  </v-app-bar>
</template>

<script setup>

</script>

<style scoped>
.app-header {
  background: linear-gradient(135deg, var(--color-secondary) 0%, var(--color-primary) 100%);
  position: relative;
  overflow: hidden;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.app-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  z-index: 0;
}

/* Ensure the content stays above the pattern */
::v-deep(.v-toolbar__content) {
  position: relative;
  z-index: 1;
  background: transparent !important;
}

/* Add some responsive styling */
@media (max-width: 960px) {
  ::v-deep(.v-toolbar__title) {
    font-size: 0.9rem;
    text-align: center;
    margin-left: var(--spacing-sm);
    margin-right: var(--spacing-sm);
  }
}

@media (max-width: 600px) {
  ::v-deep(.v-toolbar__title) {
    font-size: 0.8rem;
    max-width: 200px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

/* Add a subtle shadow to the text for better readability */
::v-deep(.v-toolbar__title) {
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  font-weight: 600;
  letter-spacing: 0.5px;
}

/* Style the nav icon */
::v-deep(.v-app-bar-nav-icon) {
  transition: transform var(--transition-fast);
}

::v-deep(.v-app-bar-nav-icon:hover) {
  transform: scale(1.1);
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-sm);
}

/* Add a slight animation on load */
.app-header {
  animation: slideDown var(--transition-normal) ease-out;
}

@keyframes slideDown {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Add a hover effect to the entire header */
.app-header:hover::before {
  opacity: 0.15;
  transition: opacity var(--transition-normal);
}
</style>