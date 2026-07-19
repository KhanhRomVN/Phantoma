import { ThemeConfig } from '../types/theme.types';

/**
 * MidnightBlue theme configuration
 * Dark theme with blue accents
 */
export const MidnightBlue: ThemeConfig = {
  id: 'midnight_blue',
  name: 'MidnightBlue',
  monaco: {
    base: 'vs-dark',
    inherit: true,
    rules: [
      {
        foreground: '6a7a9a',
        token: 'comment',
      },
      {
        foreground: '0a84ff',
        token: 'constant',
      },
      {
        foreground: '0a84ff',
        token: 'entity',
      },
      {
        foreground: '30d158',
        token: 'keyword',
      },
      {
        foreground: '30d158',
        token: 'storage',
      },
      {
        foreground: '64d2ff',
        token: 'string',
      },
      {
        foreground: '64d2ff',
        token: 'meta.verbatim',
      },
      {
        foreground: '0a84ff',
        token: 'support',
      },
      {
        foreground: 'ff2d55',
        fontStyle: 'italic',
        token: 'invalid.deprecated',
      },
      {
        foreground: 'c8d6f0',
        background: 'ff2d55',
        token: 'invalid.illegal',
      },
      {
        foreground: '0a84ff',
        fontStyle: 'italic',
        token: 'entity.other.inherited-class',
      },
      {
        foreground: '0a84ff',
        token: 'string constant.other.placeholder',
      },
      {
        foreground: '6a7a9a',
        token: 'meta.tag',
      },
      {
        foreground: '6a7a9a',
        token: 'meta.tag entity',
      },
      {
        foreground: 'c8d6f0',
        token: 'entity.name.section',
      },
      {
        foreground: 'c8d6f0',
        token: 'variable',
      },
      {
        foreground: 'c8d6f0',
        token: 'variable.parameter',
      },
      {
        foreground: 'c8d6f0',
        token: 'variable.name',
      },
      {
        foreground: 'f5a623',
        token: 'entity.name.function',
      },
      {
        foreground: 'f5a623',
        token: 'meta.function-call',
      },
      {
        foreground: '30d158',
        token: 'entity.name.type',
      },
      {
        foreground: '30d158',
        token: 'entity.name.class',
      },
      {
        foreground: '30d158',
        token: 'support.type',
      },
      {
        foreground: '30d158',
        token: 'support.class',
      },
      {
        foreground: 'ff9f0a',
        token: 'string.escape',
      },
      {
        foreground: 'c8d6f0',
        token: 'identifier',
      },
      {
        foreground: '64d2ff',
        token: 'number',
      },
      {
        foreground: 'ff9f0a',
        token: 'character',
      },
      {
        foreground: 'af52de',
        token: 'meta.preprocessor',
      },
      {
        foreground: 'af52de',
        token: 'keyword.control',
      },
      {
        foreground: '30d158',
        token: 'keyword.operator',
      },
      {
        foreground: '0a84ff',
        token: 'storage.type',
      },
    ],
    colors: {
      'editor.foreground': '#c8d6f0',
      'editor.background': '#0a0e14',
      'editor.selectionBackground': '#1c2333',
      'editor.lineHighlightBackground': '#0d1017',
      'editorCursor.foreground': '#0a84ff',
      'editorWhitespace.foreground': '#3a4558',
    },
  },
  tailwind: {
    //
    primary: 'rgb(10, 132, 255)',
    //
    success: 'rgb(48, 209, 88)',
    error: 'rgb(255, 45, 85)',
    warn: 'rgb(255, 159, 10)',
    info: 'rgb(10, 132, 255)',
    //
    blue: 'rgb(10, 132, 255)',
    green: 'rgb(48, 209, 88)',
    red: 'rgb(255, 45, 85)',
    yellow: 'rgb(255, 200, 50)',
    purple: 'rgb(175, 82, 222)',
    pink: 'rgb(255, 105, 180)',
    navy: 'rgb(30, 50, 80)',
    teal: 'rgb(0, 210, 255)',
    violet: 'rgb(138, 90, 255)',
    //
    background: 'rgb(15, 19, 25)',
    //
    textPrimary: 'rgb(200, 214, 240)',
    textSecondary: 'rgb(106, 122, 154)',
    textForeground: 'rgb(15, 19, 25)',
    //
    buttonSolidBackground: 'rgb(10, 132, 255)',
    buttonSolidText: 'rgb(255, 255, 255)',
    buttonSoftBackground: 'rgb(20, 40, 80)',
    //
    border: 'rgb(28, 35, 51)',
    divider: 'rgb(28, 35, 51)',
    //
    cardBackground: 'rgb(13, 16, 23)',
    cardBackgroundHover: 'rgb(20, 25, 35)',
    //
    inputBackground: 'rgb(10, 14, 20)',
    //
    dropdownBackground: 'rgb(10, 15, 25)',
    dropdownItemHover: 'rgb(15, 25, 40)',
    //
    tooltipBackground: 'rgb(20, 25, 35)',
    //
    sidebarBackground: 'rgb(15, 19, 25)',
    sidebarItemHover: 'rgb(13, 16, 23)',
    //
    tableHeaderBackground: 'rgb(12, 16, 22)',
    tableFooterBackground: 'rgb(12, 16, 22)',
    tableRowHover: 'rgb(20, 25, 35)',
  },
  accentColors: [
    'rgb(10, 132, 255)', // Blue - primary
    'rgb(48, 209, 88)', // Green - vibrant
    'rgb(255, 159, 10)', // Orange - warm
    'rgb(175, 82, 222)', // Purple - rich
    'rgb(255, 45, 85)', // Red - bold
    'rgb(255, 105, 180)', // Pink - bright
    'rgb(0, 210, 255)', // Aqua - electric
    'rgb(255, 200, 50)', // Gold - bright (replaced similar mustard)
    'rgb(230, 190, 60)', // Mustard - warm
    'rgb(138, 90, 255)', // Violet - luminous
    'rgb(255, 150, 100)', // Coral - warm (replaced peach)
  ],
  typography: {
    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
  },
};
