import { ThemeConfig } from '../types/theme.types';

/**
 * EmberSunset theme configuration
 * Warm light theme inspired by golden hour — cream background with
 * ember orange, plum, and muted teal accents for high readability
 */
export const EmberSunset: ThemeConfig = {
  id: 'ember_sunset',
  name: 'EmberSunset',
  monaco: {
    base: 'vs',
    inherit: true,
    rules: [
      {
        foreground: '9a8a7a',
        token: 'comment',
      },
      {
        foreground: '8a4a9a',
        token: 'constant',
      },
      {
        foreground: '8a4a9a',
        token: 'entity',
      },
      {
        foreground: 'b8541f',
        token: 'keyword',
      },
      {
        foreground: 'b8541f',
        token: 'storage',
      },
      {
        foreground: '2d7a6a',
        token: 'string',
      },
      {
        foreground: '2d7a6a',
        token: 'meta.verbatim',
      },
      {
        foreground: '8a4a9a',
        token: 'support',
      },
      {
        foreground: 'c4282d',
        fontStyle: 'italic',
        token: 'invalid.deprecated',
      },
      {
        foreground: 'fff8f0',
        background: 'c4282d',
        token: 'invalid.illegal',
      },
      {
        foreground: '8a4a9a',
        fontStyle: 'italic',
        token: 'entity.other.inherited-class',
      },
      {
        foreground: '8a4a9a',
        token: 'string constant.other.placeholder',
      },
      {
        foreground: '9a8a7a',
        token: 'meta.tag',
      },
      {
        foreground: '9a8a7a',
        token: 'meta.tag entity',
      },
      {
        foreground: '3a2e26',
        token: 'entity.name.section',
      },
      {
        foreground: '3a2e26',
        token: 'variable',
      },
      {
        foreground: '3a2e26',
        token: 'variable.parameter',
      },
      {
        foreground: '3a2e26',
        token: 'variable.name',
      },
      {
        foreground: 'd2691e',
        token: 'entity.name.function',
      },
      {
        foreground: 'd2691e',
        token: 'meta.function-call',
      },
      {
        foreground: '2d7a6a',
        token: 'entity.name.type',
      },
      {
        foreground: '2d7a6a',
        token: 'entity.name.class',
      },
      {
        foreground: '2d7a6a',
        token: 'support.type',
      },
      {
        foreground: '2d7a6a',
        token: 'support.class',
      },
      {
        foreground: 'c46a1f',
        token: 'string.escape',
      },
      {
        foreground: '3a2e26',
        token: 'identifier',
      },
      {
        foreground: 'b8541f',
        token: 'number',
      },
      {
        foreground: 'c46a1f',
        token: 'character',
      },
      {
        foreground: '8a4a9a',
        token: 'meta.preprocessor',
      },
      {
        foreground: '8a4a9a',
        token: 'keyword.control',
      },
      {
        foreground: '2d7a6a',
        token: 'keyword.operator',
      },
      {
        foreground: '8a4a9a',
        token: 'storage.type',
      },
    ],
    colors: {
      'editor.foreground': '#3a2e26',
      'editor.background': '#fff8f0',
      'editor.selectionBackground': '#f0ddc8',
      'editor.lineHighlightBackground': '#f7eee2',
      'editorCursor.foreground': '#b8541f',
      'editorWhitespace.foreground': '#dcc8b0',
    },
  },
  tailwind: {
    //
    primary: 'rgb(184, 84, 31)',
    //
    success: 'rgb(45, 122, 106)',
    error: 'rgb(196, 40, 45)',
    warn: 'rgb(196, 138, 31)',
    info: 'rgb(138, 74, 154)',
    //
    blue: 'rgb(70, 110, 160)',
    green: 'rgb(45, 122, 106)',
    red: 'rgb(196, 40, 45)',
    yellow: 'rgb(212, 160, 50)',
    purple: 'rgb(138, 74, 154)',
    pink: 'rgb(210, 110, 130)',
    navy: 'rgb(60, 70, 100)',
    teal: 'rgb(45, 140, 130)',
    violet: 'rgb(120, 90, 170)',
    //
    background: 'rgb(255, 248, 240)',
    //
    textPrimary: 'rgb(58, 46, 38)',
    textSecondary: 'rgb(154, 138, 122)',
    textForeground: 'rgb(255, 248, 240)',
    //
    buttonSolidBackground: 'rgb(184, 84, 31)',
    buttonSolidText: 'rgb(255, 248, 240)',
    buttonSoftBackground: 'rgb(240, 221, 200)',
    //
    border: 'rgb(228, 210, 190)',
    divider: 'rgb(228, 210, 190)',
    //
    cardBackground: 'rgb(250, 240, 228)',
    cardBackgroundHover: 'rgb(247, 238, 226)',
    //
    inputBackground: 'rgb(248, 236, 222)',
    //
    modalBackground: 'rgb(255, 250, 244)',
    //
    dropdownBackground: 'rgb(255, 250, 244)',
    dropdownItemHover: 'rgb(247, 238, 226)',
    //
    tooltipBackground: 'rgb(247, 238, 226)',
    //
    sidebarBackground: 'rgb(248, 238, 224)',
    sidebarItemHover: 'rgb(255, 248, 240)',
    //
    tableHeaderBackground: 'rgb(250, 241, 230)',
    tableFooterBackground: 'rgb(250, 241, 230)',
    tableRowHover: 'rgb(247, 238, 226)',
  },
  accentColors: [
    'rgb(184, 84, 31)', // Ember orange - primary
    'rgb(45, 122, 106)', // Teal - cooling contrast
    'rgb(138, 74, 154)', // Plum - rich
    'rgb(196, 40, 45)', // Brick red - bold
    'rgb(212, 160, 50)', // Amber gold - warm highlight
    'rgb(70, 110, 160)', // Dusty blue - grounding
    'rgb(210, 110, 130)', // Dusty rose - soft
    'rgb(120, 90, 170)', // Violet - deep
    'rgb(196, 138, 31)', // Honey - earthy
    'rgb(180, 100, 60)', // Terracotta - warm neutral
  ],
  typography: {
    fontFamily: '"Inter", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif',
  },
};
