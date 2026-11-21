/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./src/renderer/index.html', './src/**/*.{ts,tsx}'],
  safelist: [
    'bg-card-background',
    'bg-input-background',
    'bg-dropdown-background',
    'bg-dropdown-item-hover',
    'bg-panel-background',
    'bg-table-header-background',
    'bg-table-footer-background',
    'bg-table-row-hover',
    'bg-tooltip-background',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'rgb(var(--primary) / <alpha-value>)',
        success: 'rgb(var(--success) / <alpha-value>)',
        error: 'rgb(var(--error) / <alpha-value>)',
        warn: 'rgb(var(--warn) / <alpha-value>)',
        info: 'rgb(var(--info) / <alpha-value>)',
        blue: 'rgb(var(--blue) / <alpha-value>)',
        green: 'rgb(var(--green) / <alpha-value>)',
        red: 'rgb(var(--red) / <alpha-value>)',
        yellow: 'rgb(var(--yellow) / <alpha-value>)',
        purple: 'rgb(var(--purple) / <alpha-value>)',
        pink: 'rgb(var(--pink) / <alpha-value>)',
        navy: 'rgb(var(--navy) / <alpha-value>)',
        teal: 'rgb(var(--teal) / <alpha-value>)',
        violet: 'rgb(var(--violet) / <alpha-value>)',
        background: 'rgb(var(--background) / <alpha-value>)',
        text: {
          primary: 'rgb(var(--text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
          foreground: 'rgb(var(--text-foreground) / <alpha-value>)',
        },
        border: 'rgb(var(--border) / <alpha-value>)',
        card: {
          background: 'rgb(var(--card-background) / <alpha-value>)',
          hover: 'rgb(var(--card-background-hover) / <alpha-value>)',
        },
        input: {
          background: 'rgb(var(--input-background) / <alpha-value>)',
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
        // Used for modal, drawer, sidebar and medium-to-large sections; slightly different from `background` (not too far apart)
        panel: {
          background: 'rgb(var(--panel-background) / <alpha-value>)',
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

    },
  },
  plugins: [require('tailwindcss-animate')],
};
