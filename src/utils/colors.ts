/**
 * Design System - Color Tokens
 * Green & White palette (Nextdoor-inspired)
 * Export for use in JavaScript/TypeScript applications
 */

export const colors = {
  // Primary Green
  primary: {
    50: '#f0f9f5',
    100: '#d0f0e0',
    200: '#a8e5c6',
    300: '#7ed5aa',
    400: '#4fc183',
    500: '#2da965',   // Main brand color
    600: '#248a54',
    700: '#1a6b42',
    800: '#134c31',
    900: '#0d2e1e',
  },

  // Secondary Green
  secondary: {
    50: '#f5fef8',
    100: '#d5f0e0',
    200: '#b0e5c6',
    300: '#80d5a8',
    400: '#55c285',
    500: '#2dad6f',
    600: '#24915c',
    700: '#1a7048',
    800: '#125035',
    900: '#0a3222',
  },

  // Neutral - White & Gray scale
  neutral: {
    0: '#ffffff',
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },

  // Status Colors
  status: {
    success: '#10b981',
    success_light: '#d1fae5',
    success_dark: '#059669',

    warning: '#f59e0b',
    warning_light: '#fef3c7',
    warning_dark: '#d97706',

    error: '#ef4444',
    error_light: '#fee2e2',
    error_dark: '#dc2626',

    info: '#3b82f6',
    info_light: '#dbeafe',
    info_dark: '#1d4ed8',
  },

  // Semantic Color Names
  semantic: {
    // Backgrounds
    background: '#ffffff',
    backgroundSecondary: '#f9fafb',
    backgroundTertiary: '#f3f4f6',

    // Text
    textPrimary: '#111827',
    textSecondary: '#4b5563',
    textTertiary: '#6b7280',
    textDisabled: '#9ca3af',
    textInverse: '#ffffff',

    // Borders
    border: '#e5e7eb',
    borderLight: '#f3f4f6',
    borderStrong: '#d1d5db',

    // Buttons
    buttonPrimary: '#2da965',
    buttonPrimaryHover: '#248a54',
    buttonPrimaryActive: '#1a6b42',
    buttonPrimaryDisabled: '#d1d5db',

    buttonSecondary: '#f3f4f6',
    buttonSecondaryHover: '#e5e7eb',
    buttonSecondaryActive: '#d1d5db',

    buttonTertiary: 'transparent',
    buttonTertiaryText: '#248a54',

    // Interactive
    focusRing: '#2da965',
    shadow: 'rgba(0, 0, 0, 0.1)',
    shadowLarge: 'rgba(0, 0, 0, 0.15)',
  },
};

// Tailwind config compatible export
export const tailwindColors = {
  primary: colors.primary,
  secondary: colors.secondary,
  neutral: colors.neutral,
  success: colors.status.success,
  warning: colors.status.warning,
  error: colors.status.error,
  info: colors.status.info,
};

// CSS variable names for fallback
export const cssVariables = {
  primary: (shade: keyof typeof colors.primary) => `var(--color-primary-${shade})`,
  secondary: (shade: keyof typeof colors.secondary) => `var(--color-secondary-${shade})`,
  neutral: (shade: keyof typeof colors.neutral) => `var(--color-neutral-${shade})`,
  status: (type: keyof typeof colors.status) => `var(--color-${type})`,
  semantic: (name: keyof typeof colors.semantic) => `var(--color-${name})`,
};

export default colors;
