/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./src/renderer/index.html', './src/**/*.{ts,tsx}'],
  safelist: [
    'bg-card-background',
    'bg-input-background',
    'bg-modal-background',
    'bg-dropdown-background',
    'bg-dropdown-item-hover',
    'bg-sidebar-background',
    'bg-table-header-background',
    'bg-table-footer-background',
    'bg-table-row-hover',
    'bg-tooltip-background',
  ],
  theme: {
    extend: {
      colors: {
        // Core theme variables based on IntelBlack.ts pattern
        primary: {
          DEFAULT: 'rgb(var(--primary) / <alpha-value>)',
        },
        success: 'rgb(var(--success) / <alpha-value>)',
        error: 'rgb(var(--error) / <alpha-value>)',
        warn: 'rgb(var(--warn) / <alpha-value>)',
        info: 'rgb(var(--info) / <alpha-value>)',
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
        'card-background': 'rgb(var(--card-background) / <alpha-value>)',
        'input-background': 'rgb(var(--input-background) / <alpha-value>)',
        'modal-background': 'rgb(var(--modal-background) / <alpha-value>)',
        'dropdown-background': 'rgb(var(--dropdown-background) / <alpha-value>)',
        'tooltip-background': 'rgb(var(--tooltip-background) / <alpha-value>)',
        'sidebar-background': 'rgb(var(--sidebar-background) / <alpha-value>)',
        'table-header-background': 'rgb(var(--table-header-background) / <alpha-value>)',
        'table-footer-background': 'rgb(var(--table-footer-background) / <alpha-value>)',
        'table-row-hover': 'rgb(var(--table-row-hover) / <alpha-value>)',
        card: {
          background: 'rgb(var(--card-background) / <alpha-value>)',
          hover: 'rgb(var(--card-background-hover) / <alpha-value>)',
        },
        input: {
          background: 'rgb(var(--input-background) / <alpha-value>)',
        },
        modal: {
          background: 'rgb(var(--modal-background) / <alpha-value>)',
        },
        dropdown: {
          background: 'rgb(var(--dropdown-background) / <alpha-value>)',
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
        table: {
          header: {
            background: 'rgb(var(--table-header-background) / <alpha-value>)',
          },
          footer: {
            background: 'rgb(var(--table-footer-background) / <alpha-value>)',
          },
          row: {
            hover: 'rgb(var(--table-row-hover) / <alpha-value>)',
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
