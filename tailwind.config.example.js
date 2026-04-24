/**
 * Tailwind CSS Color Configuration
 * Add this to your tailwind.config.js or tailwind.config.ts
 */

const colorPalette = {
  primary: {
    50: '#f0f9f5',
    100: '#d0f0e0',
    200: '#a8e5c6',
    300: '#7ed5aa',
    400: '#4fc183',
    500: '#2da965',
    600: '#248a54',
    700: '#1a6b42',
    800: '#134c31',
    900: '#0d2e1e',
  },
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
};

module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ...colorPalette,
      },
    },
  },
  plugins: [],
};

// Usage in Tailwind classes:
// bg-primary-500    → Primary green background
// text-primary-900  → Dark text
// border-primary-200 → Light green border
// hover:bg-primary-600 → Hover states
