export interface ThemeConfig {
  id: string;
  name: string;
  monaco: {
    base: string;
    inherit: boolean;
    rules: Array<{
      foreground?: string;
      background?: string;
      fontStyle?: string;
      token: string;
    }>;
    colors: {
      [key: string]: string;
    };
  };
  tailwind: {
    primary: string;
    success: string;
    error: string;
    warn: string;
    info: string;
    background: string;
    foreground: string;
    textPrimary: string;
    textSecondary: string;
    border: string;
    divider: string;
    cardBackground: string;
    inputBackground: string;
    modalBackground: string;
    dropdownContentBackground: string;
    dropdownItemHover: string;
    sidebarBackground: string;
    sidebarItemHover: string;
    sidebarItemFocus: string;
    tableHeaderBackground: string;
    tableFooterBackground: string;
    tableRowHover: string;
  };
  accentColors: string[];
  typography?: {
    fontFamily: string;
  };
}

// Auto-load all theme files from ./themes/ folder (both .ts and .json)
const themeModulesTs = import.meta.glob<{ [key: string]: ThemeConfig }>('./themes/*.ts', {
  eager: true,
});
const themeModulesJson = import.meta.glob<{ default: ThemeConfig }>('./themes/*.json', {
  eager: true,
});

// Helper to extract named export from .ts files
function extractThemeFromTsModule(module: any): ThemeConfig | null {
  // Check for named export 'MidnightBlue' or any other named export that is a ThemeConfig
  for (const key of Object.keys(module)) {
    if (
      module[key] &&
      typeof module[key] === 'object' &&
      module[key].monaco &&
      module[key].tailwind
    ) {
      return module[key] as ThemeConfig;
    }
  }
  return null;
}

// Load .ts themes
const tsThemes: ThemeConfig[] = [];
for (const path in themeModulesTs) {
  const module = themeModulesTs[path];
  const theme = extractThemeFromTsModule(module);
  if (theme) {
    tsThemes.push(theme);
  }
}

// Load .json themes
const jsonThemes: ThemeConfig[] = Object.values(themeModulesJson).map((mod) => mod.default);

// All themes in a single flat array
export const PRESET_THEMES: ThemeConfig[] = [...tsThemes, ...jsonThemes];

export type PresetThemeType = ThemeConfig;
