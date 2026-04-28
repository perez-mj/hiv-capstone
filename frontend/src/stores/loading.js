// frontend/src/stores/loading.js
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useLoadingStore = defineStore('loading', () => {
  const loading = ref(false)
  const loadingCount = ref(0)

  const show = () => {
    loadingCount.value++
    loading.value = true
  }

  const hide = () => {
    loadingCount.value--
    if (loadingCount.value <= 0) {
      loadingCount.value = 0
      loading.value = false
    }
  }

  const reset = () => {
    loadingCount.value = 0
    loading.value = false
  }

  return {
    loading,
    loadingCount,
    show,
    hide,
    reset
  }
})