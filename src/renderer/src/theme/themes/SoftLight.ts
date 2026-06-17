import { ThemeConfig } from '../types/theme.types';

/**
 * SoftLight theme configuration
 * Warm light theme with soft colors and gentle accents
 */
export const SoftLight: ThemeConfig = {
  id: 'soft_light',
  name: 'SoftLight',
  monaco: {
    base: 'vs',
    inherit: true,
    rules: [
      {
        foreground: '8a8a8a',
        token: 'comment',
      },
      {
        foreground: '5a6c8a',
        token: 'constant',
      },
      {
        foreground: '5a6c8a',
        token: 'entity',
      },
      {
        foreground: '2d7a4a',
        token: 'keyword',
      },
      {
        foreground: '2d7a4a',
        token: 'storage',
      },
      {
        foreground: 'b8663a',
        token: 'string',
      },
      {
        foreground: 'b8663a',
        token: 'meta.verbatim',
      },
      {
        foreground: '5a6c8a',
        token: 'support',
      },
      {
        foreground: 'c0392b',
        fontStyle: 'italic',
        token: 'invalid.deprecated',
      },
      {
        foreground: 'f5f0eb',
        background: 'c0392b',
        token: 'invalid.illegal',
      },
      {
        foreground: '5a6c8a',
        fontStyle: 'italic',
        token: 'entity.other.inherited-class',
      },
      {
        foreground: '5a6c8a',
        token: 'string constant.other.placeholder',
      },
      {
        foreground: '8a8a8a',
        token: 'meta.tag',
      },
      {
        foreground: '8a8a8a',
        token: 'meta.tag entity',
      },
      {
        foreground: '3d3d3d',
        token: 'entity.name.section',
      },
      {
        foreground: '3d3d3d',
        token: 'variable',
      },
      {
        foreground: '3d3d3d',
        token: 'variable.parameter',
      },
      {
        foreground: '3d3d3d',
        token: 'variable.name',
      },
      {
        foreground: 'b87a3a',
        token: 'entity.name.function',
      },
      {
        foreground: 'b87a3a',
        token: 'meta.function-call',
      },
      {
        foreground: '2d7a4a',
        token: 'entity.name.type',
      },
      {
        foreground: '2d7a4a',
        token: 'entity.name.class',
      },
      {
        foreground: '2d7a4a',
        token: 'support.type',
      },
      {
        foreground: '2d7a4a',
        token: 'support.class',
      },
      {
        foreground: 'c07a3a',
        token: 'string.escape',
      },
      {
        foreground: '3d3d3d',
        token: 'identifier',
      },
      {
        foreground: 'b8663a',
        token: 'number',
      },
      {
        foreground: 'c07a3a',
        token: 'character',
      },
      {
        foreground: '8a5a9a',
        token: 'meta.preprocessor',
      },
      {
        foreground: '8a5a9a',
        token: 'keyword.control',
      },
      {
        foreground: '2d7a4a',
        token: 'keyword.operator',
      },
      {
        foreground: '5a6c8a',
        token: 'storage.type',
      },
    ],
    colors: {
      'editor.foreground': '#3d3d3d',
      'editor.background': '#f5f0eb',
      'editor.selectionBackground': '#d8d0c8',
      'editor.lineHighlightBackground': '#ede8e3',
      'editorCursor.foreground': '#5a6c8a',
      'editorWhitespace.foreground': '#c8c0b8',
    },
  },
  tailwind: {
    //
    primary: 'rgb(90, 108, 138)',
    //
    success: 'rgb(45, 122, 74)',
    error: 'rgb(192, 57, 43)',
    warn: 'rgb(210, 140, 60)',
    info: 'rgb(90, 108, 138)',
    //
    background: 'rgb(245, 240, 235)',
    foreground: 'rgb(61, 61, 61)',
    //
    textPrimary: 'rgb(61, 61, 61)',
    textSecondary: 'rgb(138, 138, 138)',
    textForeground: 'rgb(245, 240, 235)',
    //
    border: 'rgb(216, 208, 200)',
    divider: 'rgb(216, 208, 200)',
    //
    cardBackground: 'rgb(255, 252, 248)',
    cardBackgroundHover: 'rgb(237, 232, 227)',
    //
    inputBackground: 'rgb(235, 228, 220)',
    //
    modalBackground: 'rgb(255, 252, 248)',
    //
    dropdownBackground: 'rgb(255, 252, 248)',
    dropdownItemHover: 'rgb(237, 232, 227)',
    //
    tooltipBackground: 'rgb(237, 232, 227)',
    //
    sidebarBackground: 'rgb(235, 228, 220)',
    sidebarItemHover: 'rgb(245, 240, 235)',
    sidebarItemFocus: 'rgb(220, 212, 202)',
    //
    tableHeaderBackground: 'rgb(240, 234, 228)',
    tableFooterBackground: 'rgb(240, 234, 228)',
    tableRowHover: 'rgb(237, 232, 227)',
  },
  accentColors: [
    'rgb(90, 108, 138)', // Blue - primary
    'rgb(45, 122, 74)', // Green - earthy
    'rgb(210, 140, 60)', // Orange - warm
    'rgb(138, 90, 154)', // Purple - soft
    'rgb(192, 57, 43)', // Red - deep
    'rgb(220, 130, 170)', // Pink - gentle
    'rgb(80, 200, 220)', // Aqua - fresh
    'rgb(210, 185, 80)', // Gold - warm (replaced similar mustard)
    'rgb(230, 150, 100)', // Coral - warm (replaced peach)
    'rgb(60, 140, 140)', // Teal - deep (added for contrast)
  ],
  typography: {
    fontFamily: '"System UI", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif',
  },
};
