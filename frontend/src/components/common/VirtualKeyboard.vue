<!-- frontend/src/components/common/VirtualKeyboard.vue -->
<template>
  <v-dialog
    v-model="dialogVisible"
    max-width="800"
    fullscreen
    hide-overlay
    :persistent="true"
  >
    <v-card class="keyboard-container" color="surface" elevation="24">
      <v-card-text class="pa-3 pa-sm-4">
        <!-- Display current input -->
        <div class="input-display mb-3 pa-3 rounded-lg">
          <div class="text-h5 text-sm-h4 font-weight-bold text-center" style="word-break: break-all; min-height: 40px;">
            {{ displayValue }}
            <span class="cursor-blink"></span>
          </div>
          <div class="text-caption text-medium-emphasis text-center mt-1">
            {{ label }}
          </div>
        </div>

        <!-- Keyboard layout - SIMPLIFIED -->
        <div class="keyboard-grid">
          <!-- Row 1: Numbers -->
          <div class="keyboard-row">
            <button
              v-for="key in numbers"
              :key="key"
              class="key-btn"
              type="button"
              @click="addCharacter(key)"
              @touchstart="preventZoom"
            >
              {{ key }}
            </button>
            <button
              class="key-btn key-backspace"
              type="button"
              @click="backspace"
              @touchstart="preventZoom"
            >
              ⌫
            </button>
          </div>

          <!-- Row 2: Letters row 1 -->
          <div class="keyboard-row">
            <button
              v-for="key in lettersRow1"
              :key="key"
              class="key-btn"
              type="button"
              @click="addCharacter(key)"
              @touchstart="preventZoom"
            >
              {{ key }}
            </button>
          </div>

          <!-- Row 3: Letters row 2 -->
          <div class="keyboard-row">
            <button
              v-for="key in lettersRow2"
              :key="key"
              class="key-btn"
              type="button"
              @click="addCharacter(key)"
              @touchstart="preventZoom"
            >
              {{ key }}
            </button>
          </div>

          <!-- Row 4: Letters row 3 -->
          <div class="keyboard-row">
            <button
              v-for="key in lettersRow3"
              :key="key"
              class="key-btn"
              type="button"
              @click="addCharacter(key)"
              @touchstart="preventZoom"
            >
              {{ key }}
            </button>
          </div>

          <!-- Row 5: Special characters and space -->
          <div class="keyboard-row">
            <button
              v-for="key in specialChars"
              :key="key"
              class="key-btn key-special"
              type="button"
              @click="addCharacter(key)"
              @touchstart="preventZoom"
            >
              {{ key }}
            </button>
            <button
              class="key-btn key-space"
              type="button"
              @click="addCharacter(' ')"
              @touchstart="preventZoom"
            >
              Space
            </button>
          </div>

          <!-- Row 6: Control buttons -->
          <div class="keyboard-row control-row">
            <button
              class="key-btn key-clear"
              type="button"
              @click="clearInput"
              @touchstart="preventZoom"
            >
              ✕ Clear
            </button>
            <button
              class="key-btn key-done"
              type="button"
              @click="done"
              @touchstart="preventZoom"
            >
              ✓ Done
            </button>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  value: {
    type: String,
    default: ''
  },
  label: {
    type: String,
    default: 'Enter text'
  },
  field: {
    type: String,
    default: ''
  },
  maxLength: {
    type: Number,
    default: 50
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'input', 'done'])

// Keyboard layout
const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']
const lettersRow1 = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P']
const lettersRow2 = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L']
const lettersRow3 = ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
const specialChars = ['-', '.', '_', '@', '+', '(', ')']

// State
const dialogVisible = ref(false)
const inputValue = ref('')

// Computed
const displayValue = computed(() => {
  return inputValue.value || ' '
})

// Watch for model changes
watch(() => props.modelValue, (newVal) => {
  dialogVisible.value = newVal
  if (newVal) {
    inputValue.value = props.value || ''
  }
})

watch(dialogVisible, (newVal) => {
  emit('update:modelValue', newVal)
})

// Methods - SIMPLIFIED
const addCharacter = (char) => {
  if (inputValue.value.length >= props.maxLength) return
  inputValue.value += char
  emit('input', inputValue.value)
}

const backspace = () => {
  inputValue.value = inputValue.value.slice(0, -1)
  emit('input', inputValue.value)
}

const clearInput = () => {
  inputValue.value = ''
  emit('input', inputValue.value)
}

const done = () => {
  emit('done', inputValue.value)
  dialogVisible.value = false
}

// Prevent zoom on double-tap
const preventZoom = (event) => {
  // Prevent default behavior that causes double-tap issues
  event.preventDefault()
}

// Keyboard shortcuts
const handleKeyPress = (event) => {
  if (!dialogVisible.value) return
  
  const key = event.key
  
  if (key === 'Enter') {
    done()
    event.preventDefault()
  } else if (key === 'Backspace') {
    backspace()
    event.preventDefault()
  } else if (key === 'Escape') {
    dialogVisible.value = false
    event.preventDefault()
  } else if (key.length === 1) {
    if (/[a-zA-Z0-9\-\_\.\@\+\()]/.test(key)) {
      addCharacter(key.toUpperCase())
      event.preventDefault()
    }
  }
}

// Lifecycle
onMounted(() => {
  document.addEventListener('keydown', handleKeyPress)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyPress)
})
</script>

<style scoped>
.keyboard-container {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 75vh;
  z-index: 1000;
  border-radius: 24px 24px 0 0 !important;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.12) !important;
}

.keyboard-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 900px;
  margin: 0 auto;
  padding: 2px;
}

.keyboard-row {
  display: flex;
  gap: 6px;
  justify-content: center;
}

/* SIMPLIFIED button styles - native feel */
.key-btn {
  min-width: 44px;
  height: 48px;
  font-size: 1.1rem;
  font-weight: 600;
  flex: 1;
  max-width: 60px;
  border: none;
  border-radius: 10px;
  background: rgba(var(--v-theme-surface-variant), 0.4);
  color: rgb(var(--v-theme-on-surface));
  cursor: pointer;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  padding: 0 4px;
  transition: background 0.08s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.key-btn:active {
  background: rgba(var(--v-theme-primary), 0.15);
  transform: scale(0.95);
}

/* Backspace button */
.key-backspace {
  flex: 1.3;
  max-width: 72px;
  font-size: 1.2rem;
  background: rgba(var(--v-theme-error), 0.08) !important;
  color: rgb(var(--v-theme-error)) !important;
}

.key-backspace:active {
  background: rgba(var(--v-theme-error), 0.2) !important;
}

/* Special characters */
.key-special {
  flex: 0.7;
  max-width: 44px;
  font-weight: 500;
  font-size: 0.95rem;
}

/* Space button */
.key-space {
  flex: 2.5;
  max-width: 140px;
  font-size: 0.85rem;
  font-weight: 500;
  background: rgba(var(--v-theme-surface-variant), 0.3) !important;
  letter-spacing: 0.5px;
}

.key-space:active {
  background: rgba(var(--v-theme-surface-variant), 0.6) !important;
}

/* Control row */
.control-row {
  gap: 12px;
  margin-top: 4px;
}

.key-clear {
  flex: 1;
  max-width: 160px;
  height: 52px;
  font-size: 0.95rem;
  font-weight: 600;
  background: rgba(var(--v-theme-error), 0.04) !important;
  color: rgb(var(--v-theme-error)) !important;
  border: 2px solid rgba(var(--v-theme-error), 0.15) !important;
}

.key-clear:active {
  background: rgba(var(--v-theme-error), 0.12) !important;
}

.key-done {
  flex: 1.5;
  max-width: 200px;
  height: 52px;
  font-size: 1rem;
  font-weight: 700;
  background: rgb(var(--v-theme-primary)) !important;
  color: white !important;
  box-shadow: 0 2px 8px rgba(var(--v-theme-primary), 0.25) !important;
}

.key-done:active {
  transform: scale(0.96);
  box-shadow: 0 1px 4px rgba(var(--v-theme-primary), 0.15) !important;
}

/* Input display */
.input-display {
  min-height: 64px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border: 2px solid rgba(var(--v-theme-surface-variant), 0.2);
  border-radius: 12px !important;
}

.cursor-blink {
  display: inline-block;
  width: 2px;
  height: 1.2em;
  background-color: rgb(var(--v-theme-primary));
  margin-left: 2px;
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* Responsive */
@media (max-width: 600px) {
  .keyboard-container {
    max-height: 85vh;
    border-radius: 16px 16px 0 0 !important;
  }

  .key-btn {
    height: 42px;
    font-size: 0.9rem;
    min-width: 32px;
    max-width: 44px;
    border-radius: 8px;
  }
  
  .key-backspace {
    max-width: 56px;
    font-size: 1rem;
  }
  
  .key-space {
    max-width: 80px;
    font-size: 0.75rem;
  }

  .key-special {
    max-width: 36px;
    font-size: 0.8rem;
  }

  .key-clear {
    max-width: 120px;
    height: 44px;
    font-size: 0.85rem;
  }

  .key-done {
    max-width: 140px;
    height: 44px;
    font-size: 0.9rem;
  }

  .control-row {
    gap: 8px;
  }

  .input-display {
    min-height: 52px;
    padding: 8px !important;
  }

  .input-display .text-h5 {
    font-size: 1.2rem !important;
  }
}

@media (min-width: 768px) {
  .key-btn {
    height: 56px;
    font-size: 1.2rem;
    min-width: 52px;
    max-width: 68px;
    border-radius: 12px;
  }
  
  .key-backspace {
    max-width: 88px;
  }
  
  .key-space {
    max-width: 160px;
    font-size: 0.95rem;
  }

  .key-special {
    max-width: 48px;
    font-size: 1rem;
  }

  .key-clear {
    max-width: 180px;
    height: 56px;
    font-size: 1rem;
  }

  .key-done {
    max-width: 220px;
    height: 56px;
    font-size: 1.1rem;
  }

  .input-display {
    min-height: 76px;
    padding: 16px !important;
  }
}

/* Prevent text selection and improve touch */
.key-btn::selection {
  background: transparent;
}

.key-btn {
  -webkit-touch-callout: none;
  -webkit-user-select: none;
}
</style>