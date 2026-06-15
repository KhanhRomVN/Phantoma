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
    //
    inputBackground: 'rgb(15, 15, 15)',
    //
    modalBackground: 'rgb(12, 12, 12)',
    //
    dropdownContentBackground: 'rgb(12, 12, 12)',
    dropdownItemHover: 'rgb(25, 25, 25)',
    //
    tooltipBackground: 'rgb(25, 25, 25)',
    //
    sidebarBackground: 'rgb(5, 5, 5)',
    sidebarItemHover: 'rgb(20, 20, 20)',
    sidebarItemFocus: 'rgb(25, 25, 25)',
  },
};