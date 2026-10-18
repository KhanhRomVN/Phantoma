import { ThemeConfig } from '../types/theme.types';

/**
 * PhantomDay theme configuration
 * Light theme lấy từ landing page Phantoma — nền trắng ngả tím nhạt,
 * tím đậm làm accent chính, cyan đậm làm accent phụ.
 */
export const PhantomDay: ThemeConfig = {
  id: 'lavender_mist',
  name: 'LavenderMist',
  type: 'light',
  monaco: {
    base: 'vs',
    inherit: true,
    rules: [
      {
        foreground: '8a8aa8',
        token: 'comment',
      },
      {
        foreground: '0891b2',
        token: 'constant',
      },
      {
        foreground: '0891b2',
        token: 'entity',
      },
      {
        foreground: '6a45f5',
        token: 'keyword',
      },
      {
        foreground: '6a45f5',
        token: 'storage',
      },
      {
        foreground: '15803d',
        token: 'string',
      },
      {
        foreground: '15803d',
        token: 'meta.verbatim',
      },
      {
        foreground: '0891b2',
        token: 'support',
      },
      {
        foreground: 'dc2626',
        fontStyle: 'italic',
        token: 'invalid.deprecated',
      },
      {
        foreground: 'ffffff',
        background: 'e11d48',
        token: 'invalid.illegal',
      },
      {
        foreground: '0891b2',
        fontStyle: 'italic',
        token: 'entity.other.inherited-class',
      },
      {
        foreground: '0891b2',
        token: 'string constant.other.placeholder',
      },
      {
        foreground: '8a8aa8',
        token: 'meta.tag',
      },
      {
        foreground: '8a8aa8',
        token: 'meta.tag entity',
      },
      {
        foreground: '14142b',
        token: 'entity.name.section',
      },
      {
        foreground: '14142b',
        token: 'variable',
      },
      {
        foreground: '14142b',
        token: 'variable.parameter',
      },
      {
        foreground: '14142b',
        token: 'variable.name',
      },
      {
        foreground: '2563eb',
        token: 'entity.name.function',
      },
      {
        foreground: '2563eb',
        token: 'meta.function-call',
      },
      {
        foreground: 'be185d',
        token: 'entity.name.type',
      },
      {
        foreground: 'be185d',
        token: 'entity.name.class',
      },
      {
        foreground: 'be185d',
        token: 'support.type',
      },
      {
        foreground: 'be185d',
        token: 'support.class',
      },
      {
        foreground: 'b45309',
        token: 'string.escape',
      },
      {
        foreground: '14142b',
        token: 'identifier',
      },
      {
        foreground: 'c2410c',
        token: 'number',
      },
      {
        foreground: 'c2410c',
        token: 'character',
      },
      {
        foreground: '7c3aed',
        token: 'meta.preprocessor',
      },
      {
        foreground: '5b34e0',
        token: 'keyword.control',
      },
      {
        foreground: '0891b2',
        token: 'keyword.operator',
      },
      {
        foreground: '5b34e0',
        token: 'storage.type',
      },
    ],
    colors: {
      'editor.foreground': '#14142b',
      'editor.background': '#ffffff',
      'editor.selectionBackground': '#ddd6fe',
      'editor.lineHighlightBackground': '#f6f6fc',
      'editorCursor.foreground': '#6a45f5',
      'editorWhitespace.foreground': '#d0d0e6',
    },
  },
  tailwind: {
    //
    primary: 'rgb(106, 69, 245)',
    //
    success: 'rgb(22, 163, 74)',
    error: 'rgb(225, 29, 72)',
    warn: 'rgb(217, 119, 6)',
    info: 'rgb(8, 145, 178)',
    //
    blue: 'rgb(37, 99, 235)',
    green: 'rgb(22, 163, 74)',
    red: 'rgb(225, 29, 72)',
    yellow: 'rgb(234, 179, 8)',
    purple: 'rgb(106, 69, 245)',
    pink: 'rgb(219, 39, 119)',
    navy: 'rgb(20, 20, 43)',
    teal: 'rgb(8, 145, 178)',
    violet: 'rgb(124, 58, 237)',
    //
    background: 'rgb(246, 246, 252)',
    //
    textPrimary: 'rgb(20, 20, 43)',
    textSecondary: 'rgb(95, 95, 126)',
    textForeground: 'rgb(255, 255, 255)',
    //
    buttonSolidBackground: 'rgb(106, 69, 245)',
    buttonSolidText: 'rgb(255, 255, 255)',
    buttonSoftBackground: 'rgb(226, 219, 252)',
    //
    border: 'rgb(224, 224, 240)',
    divider: 'rgb(232, 232, 244)',
    //
    cardBackground: 'rgb(255, 255, 255)',
    cardBackgroundHover: 'rgb(238, 238, 250)',
    //
    inputBackground: 'rgb(255, 255, 255)',
    //
    modalBackground: 'rgb(255, 255, 255)',
    //
    dropdownBackground: 'rgb(255, 255, 255)',
    dropdownItemHover: 'rgb(238, 238, 250)',
    //
    tooltipBackground: 'rgb(238, 238, 250)',
    //
    sidebarBackground: 'rgb(246, 246, 252)',
    sidebarItemHover: 'rgb(238, 238, 250)',
    //
    tableHeaderBackground: 'rgb(238, 238, 250)',
    tableFooterBackground: 'rgb(238, 238, 250)',
    tableRowHover: 'rgb(246, 246, 252)',
  },
  accentColors: [
    'rgb(106, 69, 245)', // Violet - primary accent
    'rgb(8, 145, 178)', // Cyan - secondary
    'rgb(219, 39, 119)', // Pink - tertiary
    'rgb(22, 163, 74)', // Green - success
    'rgb(217, 119, 6)', // Amber - warning
    'rgb(225, 29, 72)', // Rose - error
    'rgb(37, 99, 235)', // Blue - info
    'rgb(234, 88, 12)', // Orange - warm
    'rgb(124, 58, 237)', // Violet deep - rich primary
    'rgb(14, 165, 198)', // Cyan bright - electric
    'rgb(95, 95, 126)', // Neutral gray - inactive
  ],
  typography: {
    fontFamily: '"Inter", "IBM Plex Mono", system-ui, sans-serif',
  },
};
