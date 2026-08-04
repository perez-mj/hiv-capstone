// frontend/src/plugins/snackbar.js
import { ref } from 'vue';

// Create reactive snackbar state
const snackbarState = ref({
  show: false,
  message: '',
  color: 'success',
  timeout: 3000,
  position: 'bottom-right',
});

// Snackbar composable
export function useSnackbar() {
  const showSnackbar = (
    message,
    color = 'success',
    timeout = 3000,
    position = 'bottom-right'
  ) => {
    snackbarState.value = {
      show: true,
      message,
      color,
      timeout,
      position,
    };
  };

  const hideSnackbar = () => {
    snackbarState.value.show = false;
  };

  return {
    snackbarState,
    show: showSnackbar,
    hide: hideSnackbar,
    success: (message, timeout = 3000) => 
      showSnackbar(message, 'success', timeout),
    error: (message, timeout = 5000) => 
      showSnackbar(message, 'error', timeout),
    warning: (message, timeout = 4000) => 
      showSnackbar(message, 'warning', timeout),
    info: (message, timeout = 3000) => 
      showSnackbar(message, 'info', timeout),
  };
}