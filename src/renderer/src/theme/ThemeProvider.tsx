import { createContext, useContext, useEffect, useState } from 'react';
import { PRESET_THEMES, ThemeConfig } from './theme-loader';

type Theme = 'dark' | 'light' | 'system';

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  applyPresetTheme: (preset: ThemeConfig) => void;
  currentPreset: ThemeConfig | null;
};

const initialState: ThemeProviderState = {
  theme: 'dark',
  setTheme: () => null,
  applyPresetTheme: () => null,
  currentPreset: null,
};

export const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'vite-ui-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem(storageKey) as Theme) || defaultTheme;
  });
  const [currentPreset, setCurrentPreset] = useState<ThemeConfig | null>(null);

  const applyCSSVariables = (preset: ThemeConfig) => {
    const root = window.document.documentElement;
    const cssVarMap: Record<string, string> = {
      primary: '--primary',
      success: '--success',
      error: '--error',
      warn: '--warn',
      info: '--info',
      blue: '--blue',
      green: '--green',
      red: '--red',
      yellow: '--yellow',
      purple: '--purple',
      pink: '--pink',
      navy: '--navy',
      teal: '--teal',
      violet: '--violet',
      background: '--background',
      textPrimary: '--text-primary',
      textSecondary: '--text-secondary',
      textForeground: '--text-foreground',
      border: '--border',
      divider: '--divider',
      cardBackground: '--card-background',
      cardBackgroundHover: '--card-background-hover',
      inputBackground: '--input-background',
      modalBackground: '--modal-background',
      dropdownBackground: '--dropdown-background',
      dropdownItemHover: '--dropdown-item-hover',
      tooltipBackground: '--tooltip-background',
      sidebarBackground: '--sidebar-background',
      sidebarItemHover: '--sidebar-item-hover',
      tableHeaderBackground: '--table-header-background',
      tableFooterBackground: '--table-footer-background',
      tableRowHover: '--table-row-hover',
      buttonSolidBackground: '--button-solid-background',
      buttonSolidText: '--button-solid-text',
      buttonSoftBackground: '--button-soft-background',
    };

    const themeData = preset.tailwind;
    Object.entries(themeData).forEach(([key, value]) => {
      const cssVar = cssVarMap[key];
      if (cssVar && value) {
        let r = '',
          g = '',
          b = '';
        // Check if value is already in rgb(r, g, b) format (for VSCode extension highlight)
        const rgbStringMatch = (value as string).match(
          /^rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)$/,
        );
        if (rgbStringMatch) {
          // Store as space-separated triplet for Tailwind opacity modifiers to work
          const triplet = `${rgbStringMatch[1]} ${rgbStringMatch[2]} ${rgbStringMatch[3]}`;
          root.style.setProperty(cssVar, triplet);
          r = rgbStringMatch[1];
          g = rgbStringMatch[2];
          b = rgbStringMatch[3];
        } else {
          // Check if value is an RGB triplet (e.g., "20 28 40")
          const tripletMatch = (value as string).match(/^(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})$/);
          if (tripletMatch) {
            // Store as-is (already space-separated)
            root.style.setProperty(cssVar, value as string);
            r = tripletMatch[1];
            g = tripletMatch[2];
            b = tripletMatch[3];
          } else {
            // Fallback: set as raw value
            root.style.setProperty(cssVar, value as string);
          }
        }
        // Set RGB format variable for inline style usage (e.g., var(--blue-rgb))
        if (r && g && b) {
          const rgbVar = `${cssVar}-rgb`;
          root.style.setProperty(rgbVar, `rgb(${r}, ${g}, ${b})`);
        }
      }
    });
  };

  const applyPresetTheme = (preset: ThemeConfig) => {
    applyCSSVariables(preset);
    setCurrentPreset(preset);
    localStorage.setItem(`${storageKey}-preset-name`, preset.name);
  };

  // Load saved preset on init, fallback to first available
  const loadSavedPreset = () => {
    const savedName = localStorage.getItem(`${storageKey}-preset-name`);
    if (savedName) {
      const found = PRESET_THEMES.find((p) => p.name === savedName);
      if (found) {
        applyCSSVariables(found);
        setCurrentPreset(found);
        return;
      }
    }
    // Fallback: first theme
    const fallback = PRESET_THEMES[0];
    if (fallback) {
      applyCSSVariables(fallback);
      setCurrentPreset(fallback);
    }
  };

  // Init
  useEffect(() => {
    loadSavedPreset();
  }, []);

  // Sync dark/light class on root
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    let effectiveMode: 'light' | 'dark' = 'dark';

    if (theme === 'system') {
      effectiveMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      effectiveMode = theme;
    }

    root.classList.add(effectiveMode);
  }, [theme]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
    applyPresetTheme,
    currentPreset,
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined) throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};
