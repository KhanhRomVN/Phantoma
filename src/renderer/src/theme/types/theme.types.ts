export interface ThemeColors {
  primary: string;
  background: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  [key: string]: string;
}

export interface MonacoTheme {
  base: 'vs' | 'vs-dark' | 'hc-black';
  inherit: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rules: any[];
  colors: Record<string, string>;
}

export interface ThemeConfig {
  id: string;
  name: string;
  monaco: MonacoTheme;
  tailwind: ThemeColors;
}

export interface ThemePreset {
  name: string;
  modes: {
    light: ThemeConfig;
    dark: ThemeConfig;
  };
}

export type ThemeMode = 'light' | 'dark' | 'system';
