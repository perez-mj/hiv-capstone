// src/plugins/vuetify.js
import "@mdi/font/css/materialdesignicons.css";
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

const myCustomLightTheme = {
  dark: false,
  colors: {
    background: '#FFFFFF',
    surface: '#FFFFFF',
    'surface-bright': '#FFFFFF',
    'surface-light': '#EEEEEE',
    'surface-variant': '#424242',
    'on-surface-variant': '#EEEEEE',
    primary: '#2d8a08',
    secondary: '#e783ad',
    error: '#B00020',
    info: '#2196F3',
    success: '#4CAF50',
    warning: '#FB8C00',
  },
  variables: {
    'border-color': '#000000',
    'border-opacity': 0.12,
    'high-emphasis-opacity': 0.87,
    'medium-emphasis-opacity': 0.60,
    'disabled-opacity': 0.38,
    'idle-opacity': 0.04,
    'hover-opacity': 0.04,
    'focus-opacity': 0.12,
    'selected-opacity': 0.08,
    'activated-opacity': 0.12,
    'pressed-opacity': 0.12,
    'dragged-opacity': 0.08,
    'theme-kbd': '#212529',
    'theme-on-kbd': '#FFFFFF',
    'theme-code': '#F5F5F5',
    'theme-on-code': '#000000',
  }
}

const myCustomDarkTheme = {
  dark: true,
  colors: {
    background: '#121212',
    surface: '#1E1E1E',
    'surface-bright': '#2C2C2C',
    'surface-light': '#2C2C2C',
    'surface-variant': '#424242',
    'on-surface-variant': '#E0E0E0',
    primary: '#c74bcc',
    secondary: '#5cbeb9',
    error: '#CF6679',
    info: '#64B5F6',
    success: '#81C784',
    warning: '#FFB74D',
  },
  variables: {
    'border-color': '#FFFFFF',
    'border-opacity': 0.12,
    'high-emphasis-opacity': 0.87,
    'medium-emphasis-opacity': 0.60,
    'disabled-opacity': 0.38,
    'idle-opacity': 0.10,
    'hover-opacity': 0.08,
    'focus-opacity': 0.12,
    'selected-opacity': 0.08,
    'activated-opacity': 0.12,
    'pressed-opacity': 0.16,
    'dragged-opacity': 0.08,
    'theme-kbd': '#2C2C2C',
    'theme-on-kbd': '#FFFFFF',
    'theme-code': '#2D2D2D',
    'theme-on-code': '#E0E0E0',
  }
}

export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'myCustomLightTheme',
    variations: {
      colors: ['primary', 'secondary'],
      lighten: 7,
      darken: 7,
    },
    themes: {
      myCustomLightTheme,
      myCustomDarkTheme,
    },
  },
})