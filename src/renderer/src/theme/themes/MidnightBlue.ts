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
    background: 'rgb(15, 19, 25)',
    foreground: 'rgb(200, 214, 240)',
    //
    textPrimary: 'rgb(200, 214, 240)',
    textSecondary: 'rgb(106, 122, 154)',
    textForeground: 'rgb(15, 19, 25)',
    //
    border: 'rgb(28, 35, 51)',
    divider: 'rgb(28, 35, 51)',
    //
    cardBackground: 'rgb(13, 16, 23)',
    //
    inputBackground: 'rgb(10, 14, 20)',
    //
    modalBackground: 'rgb(10, 14, 20)',
    //
    dropdownContentBackground: 'rgb(10, 14, 20)',
    dropdownItemHover: 'rgb(13, 16, 23)',
    //
    tooltipBackground: 'rgb(20, 25, 35)',
    //
    sidebarBackground: 'rgb(8, 10, 14)',
    sidebarItemHover: 'rgb(13, 16, 23)',
    sidebarItemFocus: 'rgb(17, 24, 39)',
  },
};
