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
          'on-primary': colors.onPrimary,
          
          secondary: colors.secondary,
          'secondary-darken-1': colors.secondaryDark,
          'secondary-lighten-1': colors.secondaryLight,
          'on-secondary': colors.onSecondary,
          
          accent: colors.accent,
          'accent-darken-1': colors.accentDark,
          'accent-lighten-1': colors.accentLight,
          
          success: colors.success,
          warning: colors.warning,
          error: colors.error,
          info: colors.info,
          
          background: colors.background,
          surface: colors.surface,
          'surface-variant': colors.surfaceDark,
          'on-surface': colors.textPrimary,
          'on-surface-variant': colors.textSecondary,
          outline: colors.border,
        }
      },
      dark: {
        dark: true,
        colors: {
          // Inverting for Dark Mode (using Light variants as base)
          primary: colors.primaryLight,
          'primary-darken-1': colors.primary,
          'primary-lighten-1': colors.primaryLight, 
          
          secondary: colors.secondaryLight,
          'secondary-darken-1': colors.secondary,
          
          accent: colors.accentLight,
          
          success: colors.successLight,
          warning: colors.warningLight,
          error: colors.errorLight,
          info: colors.infoLight,
          
          background: colors.darkBackground,
          surface: colors.darkSurface,
          'surface-variant': colors.darkSurfaceDark,
          'surface-light': colors.darkSurfaceLight,
          'on-surface': colors.darkTextPrimary,
          'on-surface-variant': colors.darkTextSecondary,
          outline: colors.darkBorder,
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
      variant: 'flat',
      color: 'surface' // Explicitly link to variable
    },
    VTextField: {
      color: 'primary',
      variant: 'outlined',
      density: 'comfortable',
      bgColor: 'transparent'
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