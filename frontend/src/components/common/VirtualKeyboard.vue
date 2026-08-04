<!-- frontend/src/components/common/VirtualKeyboard.vue -->
<template>
  <v-dialog
    v-model="dialogVisible"
    max-width="800"
    fullscreen
    hide-overlay
    persistent
    @click:outside="handleClose"
  >
    <v-card class="keyboard-container" color="surface" elevation="24">
      <v-card-text class="pa-4">
        <!-- Display current input -->
        <div class="input-display mb-4 pa-4 rounded-lg" :style="{ background: `rgba(var(--v-theme-surface-variant), 0.5)` }">
          <div class="text-h4 font-weight-bold text-center" style="word-break: break-all; min-height: 48px;">
            {{ displayValue }}
            <span class="cursor-blink"></span>
          </div>
          <div class="text-caption text-medium-emphasis text-center mt-1">
            {{ label }}
          </div>
        </div>

        <!-- Keyboard layout -->
        <div class="keyboard-grid">
          <!-- Row 1: Numbers -->
          <div class="keyboard-row">
            <v-btn
              v-for="key in numbers"
              :key="key"
              class="key-btn"
              variant="flat"
              color="surface-variant"
              @click="addCharacter(key)"
              @touchstart="touchStart"
              :ripple="false"
            >
              {{ key }}
            </v-btn>
            <v-btn
              class="key-btn key-backspace"
              variant="flat"
              color="error"
              @click="backspace"
              @touchstart="touchStart"
              :ripple="false"
            >
              <v-icon size="28">mdi-backspace</v-icon>
            </v-btn>
          </div>

          <!-- Row 2: Letters row 1 -->
          <div class="keyboard-row">
            <v-btn
              v-for="key in lettersRow1"
              :key="key"
              class="key-btn"
              variant="flat"
              color="surface-variant"
              @click="addCharacter(key)"
              @touchstart="touchStart"
              :ripple="false"
            >
              {{ key }}
            </v-btn>
          </div>

          <!-- Row 3: Letters row 2 -->
          <div class="keyboard-row">
            <v-btn
              v-for="key in lettersRow2"
              :key="key"
              class="key-btn"
              variant="flat"
              color="surface-variant"
              @click="addCharacter(key)"
              @touchstart="touchStart"
              :ripple="false"
            >
              {{ key }}
            </v-btn>
          </div>

          <!-- Row 4: Letters row 3 -->
          <div class="keyboard-row">
            <v-btn
              v-for="key in lettersRow3"
              :key="key"
              class="key-btn"
              variant="flat"
              color="surface-variant"
              @click="addCharacter(key)"
              @touchstart="touchStart"
              :ripple="false"
            >
              {{ key }}
            </v-btn>
          </div>

          <!-- Row 5: Special characters and space -->
          <div class="keyboard-row">
            <v-btn
              v-for="key in specialChars"
              :key="key"
              class="key-btn key-special"
              variant="flat"
              color="surface-variant"
              @click="addCharacter(key)"
              @touchstart="touchStart"
              :ripple="false"
            >
              {{ key }}
            </v-btn>
            <v-btn
              class="key-btn key-space"
              variant="flat"
              color="surface-variant"
              @click="addCharacter(' ')"
              @touchstart="touchStart"
              :ripple="false"
            >
              <v-icon size="20" class="mr-1">mdi-keyboard-space</v-icon>
              Space
            </v-btn>
          </div>

          <!-- Row 6: Control buttons - Improved Design -->
          <div class="keyboard-row control-row mt-3">
            <v-btn
              class="key-btn key-clear"
              variant="outlined"
              color="error"
              @click="clearInput"
              @touchstart="touchStart"
              :ripple="false"
              size="large"
            >
              <v-icon class="mr-2" size="24">mdi-close-circle</v-icon>
              Clear All
            </v-btn>
            
            <v-btn
              class="key-btn key-done"
              variant="flat"
              color="primary"
              @click="done"
              @touchstart="touchStart"
              :ripple="false"
              size="large"
              elevation="2"
            >
              <v-icon class="mr-2" size="24">mdi-check-circle</v-icon>
              Done
            </v-btn>
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
const isTouch = ref(false)

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

// Methods
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

const handleClose = () => {
  // Don't close on outside click for kiosk mode
}

const touchStart = (event) => {
  // Prevent double-tap zoom on mobile
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
    // Allow only alphanumeric and special chars
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
  box-shadow: 0 -8px 40px rgba(0, 0, 0, 0.15) !important;
}

.keyboard-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 900px;
  margin: 0 auto;
  padding: 4px;
}

.keyboard-row {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.key-btn {
  min-width: 48px;
  height: 56px;
  font-size: 1.2rem;
  font-weight: 600;
  flex: 1;
  max-width: 64px;
  border-radius: 12px !important;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  text-transform: none;
  letter-spacing: 0.5px;
}

.key-btn:active {
  transform: scale(0.92);
  opacity: 0.8;
}

/* Number and letter keys hover state
.key-btn:not(.key-backspace):not(.key-clear):not(.key-done):not(.key-space):not(.key-special):hover {
  background-color: rgba(var(--v-theme-primary), 0.08) !important;
} */

/* Backspace button */
.key-backspace {
  flex: 1.5;
  max-width: 80px;
  min-height: 56px;
  background: rgba(var(--v-theme-error), 0.1) !important;
  color: rgb(var(--v-theme-error)) !important;
  font-weight: 700;
}

.key-backspace:active {
  background: rgba(var(--v-theme-error), 0.25) !important;
}

/* Special characters */
.key-special {
  flex: 0.8;
  max-width: 52px;
  font-weight: 500;
  font-size: 1rem;
}

/* Space button */
.key-space {
  flex: 2.5;
  max-width: 160px;
  background-color: rgba(var(--v-theme-surface-variant), 0.5) !important;
  font-weight: 500;
  letter-spacing: 1px;
}

.key-space:active {
  background-color: rgba(var(--v-theme-surface-variant), 0.8) !important;
}

/* Control row - improved design */
.control-row {
  gap: 16px;
  margin-top: 8px;
  padding: 0 4px;
}

.key-clear {
  flex: 1;
  max-width: 200px;
  min-height: 60px;
  border-width: 2px !important;
  font-weight: 600;
  font-size: 1.1rem;
  letter-spacing: 0.5px;
  color: rgb(var(--v-theme-error)) !important;
  border-color: rgba(var(--v-theme-error), 0.3) !important;
  background: transparent !important;
  transition: all 0.2s ease;
}

.key-clear:hover {
  background: rgba(var(--v-theme-error), 0.05) !important;
  border-color: rgb(var(--v-theme-error)) !important;
  transform: translateY(-2px);
}

.key-clear:active {
  transform: scale(0.95);
  background: rgba(var(--v-theme-error), 0.15) !important;
}

.key-done {
  flex: 1.5;
  max-width: 250px;
  min-height: 60px;
  font-weight: 700;
  font-size: 1.2rem;
  letter-spacing: 0.5px;
  background: linear-gradient(135deg, rgb(var(--v-theme-primary)), rgb(var(--v-theme-primary-darken-2))) !important;
  color: white !important;
  box-shadow: 0 4px 16px rgba(var(--v-theme-primary), 0.3) !important;
  transition: all 0.2s ease;
}

.key-done:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(var(--v-theme-primary), 0.4) !important;
}

.key-done:active {
  transform: scale(0.95);
  box-shadow: 0 2px 8px rgba(var(--v-theme-primary), 0.2) !important;
}

/* Input display */
.input-display {
  min-height: 80px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border: 2px solid rgba(var(--v-theme-surface-variant), 0.3);
  border-radius: 16px !important;
  transition: all 0.2s ease;
}

.input-display:focus-within {
  border-color: rgba(var(--v-theme-primary), 0.5);
}

.cursor-blink {
  display: inline-block;
  width: 3px;
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
    height: 48px;
    font-size: 0.95rem;
    min-width: 36px;
    max-width: 48px;
    border-radius: 10px !important;
  }
  
  .key-backspace {
    max-width: 64px;
    min-height: 48px;
  }
  
  .key-space {
    max-width: 100px;
    font-size: 0.85rem;
  }

  .key-special {
    max-width: 42px;
    font-size: 0.85rem;
  }

  .key-clear {
    max-width: 140px;
    min-height: 50px;
    font-size: 0.95rem;
  }

  .key-done {
    max-width: 180px;
    min-height: 50px;
    font-size: 1rem;
  }

  .control-row {
    gap: 12px;
  }

  .input-display {
    min-height: 64px;
    padding: 12px !important;
  }

  .input-display .text-h4 {
    font-size: 1.5rem !important;
  }
}

@media (min-width: 768px) {
  .key-btn {
    height: 64px;
    font-size: 1.3rem;
    min-width: 56px;
    max-width: 72px;
    border-radius: 14px !important;
  }
  
  .key-backspace {
    max-width: 100px;
    min-height: 64px;
  }
  
  .key-space {
    max-width: 180px;
    font-size: 1.1rem;
  }

  .key-special {
    max-width: 56px;
    font-size: 1.1rem;
  }

  .key-clear {
    max-width: 220px;
    min-height: 64px;
    font-size: 1.15rem;
  }

  .key-done {
    max-width: 280px;
    min-height: 64px;
    font-size: 1.25rem;
  }

  .control-row {
    gap: 20px;
  }

  .input-display {
    min-height: 96px;
    padding: 20px !important;
  }

  .input-display .text-h4 {
    font-size: 2rem !important;
  }
}

/* Prevent text selection */
.key-btn::selection {
  background: transparent;
}

/* Touch feedback for all buttons */
.key-btn {
  -webkit-tap-highlight-color: transparent;
}
</style>