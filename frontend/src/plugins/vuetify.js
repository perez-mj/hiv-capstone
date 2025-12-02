// src/plugins/vuetify.js
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

const lightColors = {
  primary: '#206455',
  secondary: '#9bb69d',
  accent: '#388e3c',
  error: '#d32f2f',
  info: '#0288d1',
  success: '#4CAF50',
  warning: '#FFC107',
}

const darkColors = {
  primary: '#2196F3',
  secondary: '#424242',
}

export default createVuetify({
  theme: {
    defaultTheme: 'light',
    themes: {
      light: { dark: false, colors: lightColors },
      dark: { dark: true, colors: darkColors },
    },
  },
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi },
  },
})
