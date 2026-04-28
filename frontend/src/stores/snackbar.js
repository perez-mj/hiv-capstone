// frontend/src/stores/snackbar.js
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSnackbarStore = defineStore('snackbar', () => {
  const snackbar = ref({
    show: false,
    text: '',
    color: 'success'
  })

  const show = (text, color = 'success') => {
    snackbar.value = {
      show: true,
      text,
      color
    }
    // Auto-hide after 3 seconds
    setTimeout(() => {
      hide()
    }, 3000)
  }

  const hide = () => {
    snackbar.value.show = false
  }

  const showSuccess = (text) => show(text, 'success')
  const showError = (text) => show(text, 'error')
  const showWarning = (text) => show(text, 'warning')
  const showInfo = (text) => show(text, 'info')

  return {
    snackbar,
    show,
    hide,
    showSuccess,
    showError,
    showWarning,
    showInfo
  }
})