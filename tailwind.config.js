/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./src/renderer/index.html', './src/**/*.{ts,tsx}'],
  safelist: [
    'bg-card-background',
    'bg-input-background',
    'bg-modal-background',
    'bg-dropdown-content-background',
    'bg-sidebar-background',
  ],
  theme: {
    extend: {
      colors: {
        // Core theme variables based on IntelBlack.ts pattern
        primary: {
          DEFAULT: 'rgb(var(--primary) / <alpha-value>)',
        },
        background: 'rgb(var(--background) / <alpha-value>)',
        foreground: 'rgb(var(--foreground) / <alpha-value>)',
        text: {
          primary: 'rgb(var(--text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
          foreground: 'rgb(var(--text-foreground) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'rgb(var(--border) / <alpha-value>)',
        },
        divider: 'rgb(var(--divider) / <alpha-value>)',
        card: {
          background: 'rgb(var(--card-background) / <alpha-value>)',
        },
        input: {
          background: 'rgb(var(--input-background) / <alpha-value>)',
        },
        modal: {
          background: 'rgb(var(--modal-background) / <alpha-value>)',
        },
        dropdown: {
          content: {
            background: 'rgb(var(--dropdown-content-background) / <alpha-value>)',
          },
          item: {
            hover: 'rgb(var(--dropdown-item-hover) / <alpha-value>)',
          },
        },
        tooltip: {
          background: 'rgb(var(--tooltip-background) / <alpha-value>)',
        },
        sidebar: {
          background: 'rgb(var(--sidebar-background) / <alpha-value>)',
          item: {
            hover: 'rgb(var(--sidebar-item-hover) / <alpha-value>)',
            focus: 'rgb(var(--sidebar-item-focus) / <alpha-value>)',
          },
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};