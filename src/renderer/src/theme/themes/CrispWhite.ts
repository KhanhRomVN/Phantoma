import { ThemeConfig } from '../types/theme.types';

/**
 * CrispWhite theme configuration
 * Clean high-contrast light theme with pure white background and vibrant accents
 */
export const CrispWhite: ThemeConfig = {
  id: 'crisp_white',
  name: 'CrispWhite',
  monaco: {
    base: 'vs',
    inherit: true,
    rules: [
      {
        foreground: '7a8a9a',
        token: 'comment',
      },
      {
        foreground: '0066cc',
        token: 'constant',
      },
      {
        foreground: '0066cc',
        token: 'entity',
      },
      {
        foreground: '008844',
        token: 'keyword',
      },
      {
        foreground: '008844',
        token: 'storage',
      },
      {
        foreground: 'cc5500',
        token: 'string',
      },
      {
        foreground: 'cc5500',
        token: 'meta.verbatim',
      },
      {
        foreground: '0066cc',
        token: 'support',
      },
      {
        foreground: 'dd2222',
        fontStyle: 'italic',
        token: 'invalid.deprecated',
      },
      {
        foreground: 'ffffff',
        background: 'dd2222',
        token: 'invalid.illegal',
      },
      {
        foreground: '0066cc',
        fontStyle: 'italic',
        token: 'entity.other.inherited-class',
      },
      {
        foreground: '0066cc',
        token: 'string constant.other.placeholder',
      },
      {
        foreground: '7a8a9a',
        token: 'meta.tag',
      },
      {
        foreground: '7a8a9a',
        token: 'meta.tag entity',
      },
      {
        foreground: '222222',
        token: 'entity.name.section',
      },
      {
        foreground: '222222',
        token: 'variable',
      },
      {
        foreground: '222222',
        token: 'variable.parameter',
      },
      {
        foreground: '222222',
        token: 'variable.name',
      },
      {
        foreground: 'cc6600',
        token: 'entity.name.function',
      },
      {
        foreground: 'cc6600',
        token: 'meta.function-call',
      },
      {
        foreground: '008844',
        token: 'entity.name.type',
      },
      {
        foreground: '008844',
        token: 'entity.name.class',
      },
      {
        foreground: '008844',
        token: 'support.type',
      },
      {
        foreground: '008844',
        token: 'support.class',
      },
      {
        foreground: 'cc8800',
        token: 'string.escape',
      },
      {
        foreground: '222222',
        token: 'identifier',
      },
      {
        foreground: 'cc5500',
        token: 'number',
      },
      {
        foreground: 'cc8800',
        token: 'character',
      },
      {
        foreground: '9900cc',
        token: 'meta.preprocessor',
      },
      {
        foreground: '9900cc',
        token: 'keyword.control',
      },
      {
        foreground: '008844',
        token: 'keyword.operator',
      },
      {
        foreground: '0066cc',
        token: 'storage.type',
      },
    ],
    colors: {
      'editor.foreground': '#222222',
      'editor.background': '#ffffff',
      'editor.selectionBackground': '#d0d8e0',
      'editor.lineHighlightBackground': '#f0f2f4',
      'editorCursor.foreground': '#0066cc',
      'editorWhitespace.foreground': '#b0b8c0',
    },
  },
  tailwind: {
    //
    primary: 'rgb(0, 102, 204)',
    //
    success: 'rgb(0, 136, 68)',
    error: 'rgb(221, 34, 34)',
    warn: 'rgb(204, 102, 0)',
    info: 'rgb(0, 102, 204)',
    //
    blue: 'rgb(0, 102, 204)',
    green: 'rgb(0, 136, 68)',
    red: 'rgb(221, 34, 34)',
    yellow: 'rgb(255, 187, 0)',
    purple: 'rgb(153, 0, 204)',
    pink: 'rgb(230, 100, 160)',
    navy: 'rgb(26, 37, 74)',
    teal: 'rgb(0, 180, 220)',
    violet: 'rgb(130, 80, 200)',
    //
    background: 'rgb(255, 255, 255)',
    foreground: 'rgb(34, 34, 34)',
    //
    textPrimary: 'rgb(34, 34, 34)',
    textSecondary: 'rgb(122, 138, 154)',
    textForeground: 'rgb(255, 255, 255)',
    //
    border: 'rgb(208, 216, 224)',
    divider: 'rgb(208, 216, 224)',
    //
    cardBackground: 'rgb(235, 238, 242)',
    cardBackgroundHover: 'rgb(240, 242, 244)',
    //
    inputBackground: 'rgb(235, 238, 242)',
    //
    modalBackground: 'rgb(255, 255, 255)',
    //
    dropdownBackground: 'rgb(255, 255, 255)',
    dropdownItemHover: 'rgb(240, 242, 244)',
    //
    tooltipBackground: 'rgb(240, 242, 244)',
    //
    sidebarBackground: 'rgb(245, 246, 248)',
    sidebarItemHover: 'rgb(255, 255, 255)',
    sidebarItemFocus: 'rgb(230, 234, 238)',
    //
    tableHeaderBackground: 'rgb(248, 249, 250)',
    tableFooterBackground: 'rgb(248, 249, 250)',
    tableRowHover: 'rgb(240, 242, 244)',
  },
  accentColors: [
    'rgb(0, 102, 204)', // Blue - primary accent
    'rgb(0, 136, 68)', // Green - vibrant
    'rgb(204, 102, 0)', // Orange - warm
    'rgb(153, 0, 204)', // Purple - bold
    'rgb(221, 34, 34)', // Red - strong
    'rgb(230, 100, 160)', // Pink - soft
    'rgb(0, 180, 220)', // Aqua - cool
    'rgb(255, 170, 0)', // Gold - bright (replaced similar teal)
    'rgb(200, 180, 40)', // Mustard - earthy
    'rgb(130, 80, 200)', // Violet - deep
    'rgb(255, 120, 80)', // Coral - warm vibrant (replaced peach)
  ],
  typography: {
    fontFamily: '"Inter", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif',
  },
};
