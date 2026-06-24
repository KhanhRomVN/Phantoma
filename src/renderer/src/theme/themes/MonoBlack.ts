import { ThemeConfig } from '../types/theme.types';

/**
 * MonoBlack theme configuration
 * Pure black background with pure white text - high contrast monochrome theme
 */
export const MonoBlack: ThemeConfig = {
  id: 'mono_black',
  name: 'MonoBlack',
  monaco: {
    base: 'vs-dark',
    inherit: true,
    rules: [
      {
        foreground: '888888',
        token: 'comment',
      },
      {
        foreground: 'ffffff',
        token: 'constant',
      },
      {
        foreground: 'ffffff',
        token: 'entity',
      },
      {
        foreground: 'ffffff',
        token: 'keyword',
      },
      {
        foreground: 'ffffff',
        token: 'storage',
      },
      {
        foreground: 'ffffff',
        token: 'string',
      },
      {
        foreground: 'ffffff',
        token: 'meta.verbatim',
      },
      {
        foreground: 'ffffff',
        token: 'support',
      },
      {
        foreground: 'ff4444',
        fontStyle: 'italic',
        token: 'invalid.deprecated',
      },
      {
        foreground: 'ffffff',
        background: 'ff4444',
        token: 'invalid.illegal',
      },
      {
        foreground: 'ffffff',
        fontStyle: 'italic',
        token: 'entity.other.inherited-class',
      },
      {
        foreground: 'ffffff',
        token: 'string constant.other.placeholder',
      },
      {
        foreground: '888888',
        token: 'meta.tag',
      },
      {
        foreground: '888888',
        token: 'meta.tag entity',
      },
      {
        foreground: 'ffffff',
        token: 'entity.name.section',
      },
      {
        foreground: 'ffffff',
        token: 'variable',
      },
      {
        foreground: 'ffffff',
        token: 'variable.parameter',
      },
      {
        foreground: 'ffffff',
        token: 'variable.name',
      },
      {
        foreground: 'ffffff',
        token: 'entity.name.function',
      },
      {
        foreground: 'ffffff',
        token: 'meta.function-call',
      },
      {
        foreground: 'ffffff',
        token: 'entity.name.type',
      },
      {
        foreground: 'ffffff',
        token: 'entity.name.class',
      },
      {
        foreground: 'ffffff',
        token: 'support.type',
      },
      {
        foreground: 'ffffff',
        token: 'support.class',
      },
      {
        foreground: 'ffffff',
        token: 'string.escape',
      },
      {
        foreground: 'ffffff',
        token: 'identifier',
      },
      {
        foreground: 'ffffff',
        token: 'number',
      },
      {
        foreground: 'ffffff',
        token: 'character',
      },
      {
        foreground: 'ffffff',
        token: 'meta.preprocessor',
      },
      {
        foreground: 'ffffff',
        token: 'keyword.control',
      },
      {
        foreground: 'ffffff',
        token: 'keyword.operator',
      },
      {
        foreground: 'ffffff',
        token: 'storage.type',
      },
    ],
    colors: {
      'editor.foreground': '#ffffff',
      'editor.background': '#000000',
      'editor.selectionBackground': '#333333',
      'editor.lineHighlightBackground': '#111111',
      'editorCursor.foreground': '#ffffff',
      'editorWhitespace.foreground': '#444444',
    },
  },
  tailwind: {
    //
    primary: 'rgb(255, 255, 255)',
    //
    success: 'rgb(100, 255, 100)',
    error: 'rgb(255, 68, 68)',
    warn: 'rgb(255, 200, 100)',
    info: 'rgb(100, 150, 255)',
    //
    blue: 'rgb(100, 150, 255)',
    green: 'rgb(100, 255, 100)',
    red: 'rgb(255, 68, 68)',
    yellow: 'rgb(255, 200, 100)',
    purple: 'rgb(180, 120, 255)',
    pink: 'rgb(255, 120, 200)',
    navy: 'rgb(60, 80, 120)',
    teal: 'rgb(80, 220, 255)',
    violet: 'rgb(180, 120, 255)',
    //
    background: 'rgb(0, 0, 0)',
    foreground: 'rgb(255, 255, 255)',
    //
    textPrimary: 'rgb(255, 255, 255)',
    textSecondary: 'rgb(200, 200, 200)',
    textForeground: 'rgb(0, 0, 0)',
    //
    border: 'rgb(40, 40, 40)',
    divider: 'rgb(40, 40, 40)',
    //
    cardBackground: 'rgb(10, 10, 10)',
    cardBackgroundHover: 'rgb(18, 18, 18)',
    //
    inputBackground: 'rgb(15, 15, 15)',
    //
    modalBackground: 'rgb(12, 12, 12)',
    //
    dropdownBackground: 'rgb(12, 12, 12)',
    dropdownItemHover: 'rgb(25, 25, 25)',
    //
    tooltipBackground: 'rgb(25, 25, 25)',
    //
    sidebarBackground: 'rgb(5, 5, 5)',
    sidebarItemHover: 'rgb(20, 20, 20)',
    sidebarItemFocus: 'rgb(25, 25, 25)',
    //
    tableHeaderBackground: 'rgb(15, 15, 15)',
    tableFooterBackground: 'rgb(15, 15, 15)',
    tableRowHover: 'rgb(25, 25, 25)',
  },
  accentColors: [
    'rgb(255, 255, 255)', // White - primary
    'rgb(100, 150, 255)', // Blue - cool
    'rgb(255, 200, 100)', // Yellow - warm
    'rgb(100, 255, 100)', // Green - vibrant
    'rgb(255, 68, 68)', // Red - bold
    'rgb(255, 120, 200)', // Pink - soft
    'rgb(80, 220, 255)', // Aqua - electric
    'rgb(255, 200, 80)', // Gold - warm (replaced similar mustard)
    'rgb(180, 120, 255)', // Violet - luminous
  ],
  typography: {
    fontFamily: '"SF Mono", "Menlo", monospace',
  },
};
