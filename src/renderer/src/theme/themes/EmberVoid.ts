import { ThemeConfig } from '../types/theme.types';

/**
 * EmberVoid theme configuration
 * Dark theme inspired by the Device Fleet Console — near-black void
 * background with ember orange as the primary accent, cool blue and
 * violet as secondary accents.
 */
export const EmberVoid: ThemeConfig = {
  id: 'ember_void',
  name: 'EmberVoid',
  monaco: {
    base: 'vs-dark',
    inherit: true,
    rules: [
      {
        foreground: '6a6d75',
        token: 'comment',
      },
      {
        foreground: '4fa8e0',
        token: 'constant',
      },
      {
        foreground: '4fa8e0',
        token: 'entity',
      },
      {
        foreground: 'a078ff',
        token: 'keyword',
      },
      {
        foreground: 'a078ff',
        token: 'storage',
      },
      {
        foreground: '3ddc84',
        token: 'string',
      },
      {
        foreground: '3ddc84',
        token: 'meta.verbatim',
      },
      {
        foreground: '4fa8e0',
        token: 'support',
      },
      {
        foreground: 'ff4757',
        fontStyle: 'italic',
        token: 'invalid.deprecated',
      },
      {
        foreground: 'e8e9ed',
        background: 'ff4757',
        token: 'invalid.illegal',
      },
      {
        foreground: '4fa8e0',
        fontStyle: 'italic',
        token: 'entity.other.inherited-class',
      },
      {
        foreground: '4fa8e0',
        token: 'string constant.other.placeholder',
      },
      {
        foreground: '6a6d75',
        token: 'meta.tag',
      },
      {
        foreground: '6a6d75',
        token: 'meta.tag entity',
      },
      {
        foreground: 'e8e9ed',
        token: 'entity.name.section',
      },
      {
        foreground: 'e8e9ed',
        token: 'variable',
      },
      {
        foreground: 'e8e9ed',
        token: 'variable.parameter',
      },
      {
        foreground: 'e8e9ed',
        token: 'variable.name',
      },
      {
        foreground: 'ff6a1f',
        token: 'entity.name.function',
      },
      {
        foreground: 'ff6a1f',
        token: 'meta.function-call',
      },
      {
        foreground: '3ddc84',
        token: 'entity.name.type',
      },
      {
        foreground: '3ddc84',
        token: 'entity.name.class',
      },
      {
        foreground: '3ddc84',
        token: 'support.type',
      },
      {
        foreground: '3ddc84',
        token: 'support.class',
      },
      {
        foreground: 'ffb020',
        token: 'string.escape',
      },
      {
        foreground: 'e8e9ed',
        token: 'identifier',
      },
      {
        foreground: '3ddc84',
        token: 'number',
      },
      {
        foreground: 'ffb020',
        token: 'character',
      },
      {
        foreground: 'a078ff',
        token: 'meta.preprocessor',
      },
      {
        foreground: 'a078ff',
        token: 'keyword.control',
      },
      {
        foreground: '3ddc84',
        token: 'keyword.operator',
      },
      {
        foreground: '4fa8e0',
        token: 'storage.type',
      },
    ],
    colors: {
      'editor.foreground': '#e8e9ed',
      'editor.background': '#0a0a0c',
      'editor.selectionBackground': '#1b1d22',
      'editor.lineHighlightBackground': '#131417',
      'editorCursor.foreground': '#ff6a1f',
      'editorWhitespace.foreground': '#26282f',
    },
  },
  tailwind: {
    //
    primary: 'rgb(255, 106, 31)',
    //
    success: 'rgb(61, 220, 132)',
    error: 'rgb(255, 71, 87)',
    warn: 'rgb(255, 176, 32)',
    info: 'rgb(79, 168, 224)',
    //
    blue: 'rgb(79, 168, 224)',
    green: 'rgb(61, 220, 132)',
    red: 'rgb(255, 71, 87)',
    yellow: 'rgb(255, 176, 32)',
    purple: 'rgb(160, 120, 255)',
    pink: 'rgb(255, 120, 170)',
    navy: 'rgb(30, 35, 45)',
    teal: 'rgb(50, 200, 190)',
    violet: 'rgb(160, 120, 255)',
    //
    background: 'rgb(10, 10, 12)',
    //
    textPrimary: 'rgb(232, 233, 237)',
    textSecondary: 'rgb(139, 141, 150)',
    textForeground: 'rgb(255, 255, 255)',
    //
    buttonSolidBackground: 'rgb(255, 106, 31)',
    buttonSolidText: 'rgb(255, 255, 255)',
    buttonSoftBackground: 'rgb(27, 29, 34)',
    //
    border: 'rgb(38, 40, 47)',
    divider: 'rgb(29, 31, 37)',
    //
    cardBackground: 'rgb(19, 20, 23)',
    cardBackgroundHover: 'rgb(27, 29, 34)',
    //
    inputBackground: 'rgb(19, 20, 23)',
    //
    modalBackground: 'rgb(19, 20, 23)',
    //
    dropdownBackground: 'rgb(19, 20, 23)',
    dropdownItemHover: 'rgb(32, 35, 41)',
    //
    tooltipBackground: 'rgb(32, 35, 41)',
    //
    sidebarBackground: 'rgb(10, 10, 12)',
    sidebarItemHover: 'rgb(19, 20, 23)',
    //
    tableHeaderBackground: 'rgb(19, 20, 23)',
    tableFooterBackground: 'rgb(19, 20, 23)',
    tableRowHover: 'rgb(27, 29, 34)',
  },
  accentColors: [
    'rgb(255, 106, 31)', // Ember - primary accent
    'rgb(79, 168, 224)', // Cool blue - secondary
    'rgb(160, 120, 255)', // Violet - tertiary
    'rgb(61, 220, 132)', // Green - success
    'rgb(255, 176, 32)', // Amber - warning
    'rgb(255, 71, 87)', // Red - error
    'rgb(184, 72, 26)', // Ember dim - muted primary
    'rgb(109, 79, 196)', // Violet dim - muted tertiary
    'rgb(47, 109, 148)', // Cool dim - muted secondary
    'rgb(74, 77, 87)', // Neutral gray - inactive
  ],
  typography: {
    fontFamily: '"JetBrains Mono", "Space Grotesk", "Inter", sans-serif',
  },
};