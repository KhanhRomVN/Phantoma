import { ThemeConfig } from '../types/theme.types';

/**
 * DeepForest theme configuration
 * Dark theme inspired by old-growth forest at dusk — deep green-black
 * background with jade, amber-bronze, and muted gold accents
 */
export const DeepForest: ThemeConfig = {
  id: 'deep_forest',
  name: 'DeepForest',
  monaco: {
    base: 'vs-dark',
    inherit: true,
    rules: [
      {
        foreground: '6a8a78',
        token: 'comment',
      },
      {
        foreground: '4fd1a5',
        token: 'constant',
      },
      {
        foreground: '4fd1a5',
        token: 'entity',
      },
      {
        foreground: 'd4a24c',
        token: 'keyword',
      },
      {
        foreground: 'd4a24c',
        token: 'storage',
      },
      {
        foreground: 'e8c468',
        token: 'string',
      },
      {
        foreground: 'e8c468',
        token: 'meta.verbatim',
      },
      {
        foreground: '4fd1a5',
        token: 'support',
      },
      {
        foreground: 'e0584a',
        fontStyle: 'italic',
        token: 'invalid.deprecated',
      },
      {
        foreground: 'e6f2e8',
        background: 'e0584a',
        token: 'invalid.illegal',
      },
      {
        foreground: '4fd1a5',
        fontStyle: 'italic',
        token: 'entity.other.inherited-class',
      },
      {
        foreground: '4fd1a5',
        token: 'string constant.other.placeholder',
      },
      {
        foreground: '6a8a78',
        token: 'meta.tag',
      },
      {
        foreground: '6a8a78',
        token: 'meta.tag entity',
      },
      {
        foreground: 'e6f2e8',
        token: 'entity.name.section',
      },
      {
        foreground: 'e6f2e8',
        token: 'variable',
      },
      {
        foreground: 'e6f2e8',
        token: 'variable.parameter',
      },
      {
        foreground: 'e6f2e8',
        token: 'variable.name',
      },
      {
        foreground: 'd4915a',
        token: 'entity.name.function',
      },
      {
        foreground: 'd4915a',
        token: 'meta.function-call',
      },
      {
        foreground: '4fd1a5',
        token: 'entity.name.type',
      },
      {
        foreground: '4fd1a5',
        token: 'entity.name.class',
      },
      {
        foreground: '4fd1a5',
        token: 'support.type',
      },
      {
        foreground: '4fd1a5',
        token: 'support.class',
      },
      {
        foreground: 'e8a14c',
        token: 'string.escape',
      },
      {
        foreground: 'e6f2e8',
        token: 'identifier',
      },
      {
        foreground: 'e8c468',
        token: 'number',
      },
      {
        foreground: 'e8a14c',
        token: 'character',
      },
      {
        foreground: '9a7fd1',
        token: 'meta.preprocessor',
      },
      {
        foreground: '9a7fd1',
        token: 'keyword.control',
      },
      {
        foreground: '4fd1a5',
        token: 'keyword.operator',
      },
      {
        foreground: '4fd1a5',
        token: 'storage.type',
      },
    ],
    colors: {
      'editor.foreground': '#e6f2e8',
      'editor.background': '#0d1410',
      'editor.selectionBackground': '#1f3329',
      'editor.lineHighlightBackground': '#111c15',
      'editorCursor.foreground': '#4fd1a5',
      'editorWhitespace.foreground': '#3a5048',
    },
  },
  tailwind: {
    //
    primary: 'rgb(79, 209, 165)',
    //
    success: 'rgb(79, 209, 165)',
    error: 'rgb(224, 88, 74)',
    warn: 'rgb(212, 162, 76)',
    info: 'rgb(106, 170, 200)',
    //
    blue: 'rgb(106, 170, 200)',
    green: 'rgb(79, 209, 165)',
    red: 'rgb(224, 88, 74)',
    yellow: 'rgb(232, 196, 104)',
    purple: 'rgb(154, 127, 209)',
    pink: 'rgb(212, 130, 150)',
    navy: 'rgb(40, 60, 70)',
    teal: 'rgb(60, 190, 175)',
    violet: 'rgb(140, 110, 200)',
    //
    background: 'rgb(13, 20, 16)',
    //
    textPrimary: 'rgb(230, 242, 232)',
    textSecondary: 'rgb(106, 138, 120)',
    textForeground: 'rgb(13, 20, 16)',
    //
    buttonSolidBackground: 'rgb(79, 209, 165)',
    buttonSolidText: 'rgb(13, 20, 16)',
    buttonSoftBackground: 'rgb(31, 51, 41)',
    //
    border: 'rgb(31, 48, 39)',
    divider: 'rgb(31, 48, 39)',
    //
    cardBackground: 'rgb(17, 26, 21)',
    cardBackgroundHover: 'rgb(22, 33, 27)',
    //
    inputBackground: 'rgb(15, 23, 18)',
    //
    modalBackground: 'rgb(14, 21, 17)',
    //
    dropdownBackground: 'rgb(14, 22, 17)',
    dropdownItemHover: 'rgb(20, 31, 25)',
    //
    tooltipBackground: 'rgb(22, 33, 27)',
    //
    sidebarBackground: 'rgb(9, 15, 12)',
    sidebarItemHover: 'rgb(17, 26, 21)',
    //
    tableHeaderBackground: 'rgb(16, 24, 19)',
    tableFooterBackground: 'rgb(16, 24, 19)',
    tableRowHover: 'rgb(22, 33, 27)',
  },
  accentColors: [
    'rgb(79, 209, 165)', // Jade - primary
    'rgb(212, 162, 76)', // Bronze gold - warm contrast
    'rgb(106, 170, 200)', // Slate blue - cool
    'rgb(154, 127, 209)', // Amethyst - rich
    'rgb(224, 88, 74)', // Rust red - bold
    'rgb(232, 196, 104)', // Pale gold - bright accent
    'rgb(60, 190, 175)', // Deep teal - cohesive
    'rgb(212, 130, 150)', // Dusty rose - soft
    'rgb(140, 110, 200)', // Violet - deep
    'rgb(180, 140, 90)', // Moss bronze - earthy
  ],
  typography: {
    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
  },
};
