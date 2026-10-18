import { ThemeConfig } from '../types/theme.types';

/**
 * PhantomNight theme configuration
 * Dark theme lấy từ landing page Phantoma — nền void gần đen,
 * tím (violet) làm accent chính, cyan làm accent phụ.
 */
export const PhantomNight: ThemeConfig = {
  id: 'violet_abyss',
  name: 'VioletAbyss',
  type: 'dark',
  monaco: {
    base: 'vs-dark',
    inherit: true,
    rules: [
      {
        foreground: '6b6b8c',
        token: 'comment',
      },
      {
        foreground: '22d3ee',
        token: 'constant',
      },
      {
        foreground: '22d3ee',
        token: 'entity',
      },
      {
        foreground: 'a78bfa',
        token: 'keyword',
      },
      {
        foreground: 'a78bfa',
        token: 'storage',
      },
      {
        foreground: '34d399',
        token: 'string',
      },
      {
        foreground: '34d399',
        token: 'meta.verbatim',
      },
      {
        foreground: '22d3ee',
        token: 'support',
      },
      {
        foreground: 'f43f5e',
        fontStyle: 'italic',
        token: 'invalid.deprecated',
      },
      {
        foreground: 'f4f4fb',
        background: 'f43f5e',
        token: 'invalid.illegal',
      },
      {
        foreground: '22d3ee',
        fontStyle: 'italic',
        token: 'entity.other.inherited-class',
      },
      {
        foreground: '22d3ee',
        token: 'string constant.other.placeholder',
      },
      {
        foreground: '6b6b8c',
        token: 'meta.tag',
      },
      {
        foreground: '6b6b8c',
        token: 'meta.tag entity',
      },
      {
        foreground: 'f4f4fb',
        token: 'entity.name.section',
      },
      {
        foreground: 'f4f4fb',
        token: 'variable',
      },
      {
        foreground: 'f4f4fb',
        token: 'variable.parameter',
      },
      {
        foreground: 'f4f4fb',
        token: 'variable.name',
      },
      {
        foreground: '60a5fa',
        token: 'entity.name.function',
      },
      {
        foreground: '60a5fa',
        token: 'meta.function-call',
      },
      {
        foreground: 'f472b6',
        token: 'entity.name.type',
      },
      {
        foreground: 'f472b6',
        token: 'entity.name.class',
      },
      {
        foreground: 'f472b6',
        token: 'support.type',
      },
      {
        foreground: 'f472b6',
        token: 'support.class',
      },
      {
        foreground: 'fbbf24',
        token: 'string.escape',
      },
      {
        foreground: 'f4f4fb',
        token: 'identifier',
      },
      {
        foreground: 'fb923c',
        token: 'number',
      },
      {
        foreground: 'fb923c',
        token: 'character',
      },
      {
        foreground: 'a78bfa',
        token: 'meta.preprocessor',
      },
      {
        foreground: '8b6dff',
        token: 'keyword.control',
      },
      {
        foreground: '22d3ee',
        token: 'keyword.operator',
      },
      {
        foreground: '8b6dff',
        token: 'storage.type',
      },
    ],
    colors: {
      'editor.foreground': '#f4f4fb',
      'editor.background': '#07070d',
      'editor.selectionBackground': '#2a2452',
      'editor.lineHighlightBackground': '#0f0f1a',
      'editorCursor.foreground': '#8b6dff',
      'editorWhitespace.foreground': '#26263a',
    },
  },
  tailwind: {
    //
    primary: 'rgb(139, 109, 255)',
    //
    success: 'rgb(52, 211, 153)',
    error: 'rgb(244, 63, 94)',
    warn: 'rgb(251, 191, 36)',
    info: 'rgb(34, 211, 238)',
    //
    blue: 'rgb(96, 165, 250)',
    green: 'rgb(52, 211, 153)',
    red: 'rgb(244, 63, 94)',
    yellow: 'rgb(251, 191, 36)',
    purple: 'rgb(139, 109, 255)',
    pink: 'rgb(244, 114, 182)',
    navy: 'rgb(23, 23, 40)',
    teal: 'rgb(34, 211, 238)',
    violet: 'rgb(167, 139, 250)',
    //
    background: 'rgb(7, 7, 13)',
    //
    textPrimary: 'rgb(244, 244, 251)',
    textSecondary: 'rgb(154, 154, 184)',
    textForeground: 'rgb(255, 255, 255)',
    //
    buttonSolidBackground: 'rgb(139, 109, 255)',
    buttonSolidText: 'rgb(255, 255, 255)',
    buttonSoftBackground: 'rgb(36, 30, 72)',
    //
    border: 'rgb(38, 38, 58)',
    divider: 'rgb(29, 29, 45)',
    //
    cardBackground: 'rgb(15, 15, 26)',
    cardBackgroundHover: 'rgb(23, 23, 40)',
    //
    inputBackground: 'rgb(15, 15, 26)',
    //
    modalBackground: 'rgb(15, 15, 26)',
    //
    dropdownBackground: 'rgb(15, 15, 26)',
    dropdownItemHover: 'rgb(23, 23, 40)',
    //
    tooltipBackground: 'rgb(23, 23, 40)',
    //
    sidebarBackground: 'rgb(7, 7, 13)',
    sidebarItemHover: 'rgb(15, 15, 26)',
    //
    tableHeaderBackground: 'rgb(15, 15, 26)',
    tableFooterBackground: 'rgb(15, 15, 26)',
    tableRowHover: 'rgb(23, 23, 40)',
  },
  accentColors: [
    'rgb(139, 109, 255)', // Violet - primary accent
    'rgb(34, 211, 238)', // Cyan - secondary
    'rgb(244, 114, 182)', // Pink - tertiary
    'rgb(52, 211, 153)', // Green - success
    'rgb(251, 191, 36)', // Amber - warning
    'rgb(244, 63, 94)', // Rose - error
    'rgb(96, 165, 250)', // Blue - info
    'rgb(251, 146, 60)', // Orange - warm
    'rgb(167, 139, 250)', // Violet light - soft primary
    'rgb(14, 165, 198)', // Cyan dim - muted secondary
    'rgb(106, 106, 140)', // Neutral gray - inactive
  ],
  typography: {
    fontFamily: '"Inter", "IBM Plex Mono", system-ui, sans-serif',
  },
};
