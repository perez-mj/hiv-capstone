// plugins/vuetify.js
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import 'vuetify/styles'
import colors from '@/config/colors'

export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        dark: false,
        colors: {
          primary: colors.primary,
          'primary-darken-1': colors.primaryDark,
          'primary-lighten-1': colors.primaryLight,
          
          secondary: colors.secondary,
          'secondary-darken-1': colors.secondaryDark,
          'secondary-lighten-1': colors.secondaryLight,
          
          accent: colors.accent,
          'accent-darken-1': colors.accentDark,
          'accent-lighten-1': colors.accentLight,
          
          success: colors.success,
          'success-darken-1': colors.successDark,
          'success-lighten-1': colors.successLight,
          
          warning: colors.warning,
          'warning-darken-1': colors.warningDark,
          'warning-lighten-1': colors.warningLight,
          
          error: colors.error,
          'error-darken-1': colors.errorDark,
          'error-lighten-1': colors.errorLight,
          
          info: colors.info,
          'info-darken-1': colors.infoDark,
          'info-lighten-1': colors.infoLight,
          
          background: colors.background,
          surface: colors.surface,
          'surface-dark': colors.surfaceDark,
          'surface-light': colors.surfaceLight
        }
      },
      dark: {
        dark: true,
        colors: {
          primary: colors.primaryLight,
          'primary-darken-1': colors.primary,
          'primary-lighten-1': '#63ccff',
          
          secondary: colors.secondaryLight,
          'secondary-darken-1': colors.secondary,
          'secondary-lighten-1': '#ffabdb',
          
          accent: colors.accentLight,
          'accent-darken-1': colors.accent,
          'accent-lighten-1': '#b2fab4',
          
          success: colors.successLight,
          'success-darken-1': colors.success,
          'success-lighten-1': '#b2fab4',
          
          warning: colors.warningLight,
          'warning-darken-1': colors.warning,
          'warning-lighten-1': '#ffcc80',
          
          error: colors.errorLight,
          'error-darken-1': colors.error,
          'error-lighten-1': '#ffb0a8',
          
          info: colors.infoLight,
          'info-darken-1': colors.info,
          'info-lighten-1': '#a7d8ff',
          
          background: colors.darkBackground,
          surface: colors.darkSurface,
          'surface-dark': colors.darkSurfaceDark,
          'surface-light': '#252525'
        }
      }
    }
  },
  defaults: {
    VBtn: {
      color: 'primary',
      variant: 'flat',
      rounded: 'md',
      class: 'text-none'
    },
    VCard: {
      rounded: 'lg',
      variant: 'flat'
    },
    VTextField: {
      color: 'primary',
      variant: 'outlined',
      density: 'comfortable'
    },
    VSelect: {
      color: 'primary',
      variant: 'outlined',
      density: 'comfortable'
    },
    VTextarea: {
      color: 'primary',
      variant: 'outlined',
      density: 'comfortable'
    },
    VAlert: {
      variant: 'tonal',
      density: 'compact'
    }
  }
})