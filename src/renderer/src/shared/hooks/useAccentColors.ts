import { useMemo } from 'react';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * Get primary color from CSS variable (--primary)
 * Falls back to '54 134 255' if variable is not set
 */
const getPrimaryColor = (): string => {
  if (typeof document === 'undefined') return '54 134 255';
  const primaryValue = getComputedStyle(document.documentElement)
    .getPropertyValue('--primary')
    .trim();
  return primaryValue || '54 134 255';
};

/**
 * Custom hook for accessing accent colors from theme
 * Provides consistent color access for components like ToolManager and ModuleBar
 */
export const useAccentColors = () => {
  const { currentPreset } = useTheme();

  // Unified accent color from CSS variable (primary color)
  const UNIFIED_ACCENT = useMemo(() => {
    const rgb = getPrimaryColor();
    return `rgb(${rgb})`;
  }, []);

  // Raw RGB values for alpha usage
  const PRIMARY_RGB = useMemo(() => {
    return getPrimaryColor();
  }, []);

  // Get accent colors array from theme or fallback to primary
  const accentColors = useMemo(() => {
    return currentPreset?.accentColors || [UNIFIED_ACCENT];
  }, [currentPreset, UNIFIED_ACCENT]);

  /**
   * Get a color from accentColors by index, with fallback to UNIFIED_ACCENT
   */
  const getColorByIndex = (index: number): string => {
    const colors = currentPreset?.accentColors || [UNIFIED_ACCENT];
    return colors[index % colors.length] || UNIFIED_ACCENT;
  };

  /**
   * Parse RGB values from a color string (e.g., 'rgb(54, 134, 255)')
   * Returns { r, g, b } or null if parsing fails
   */
  const parseRgb = (color: string): { r: number; g: number; b: number } | null => {
    const rgbMatch = color.match(/\d+/g);
    if (rgbMatch && rgbMatch.length >= 3) {
      return {
        r: parseInt(rgbMatch[0]),
        g: parseInt(rgbMatch[1]),
        b: parseInt(rgbMatch[2]),
      };
    }
    return null;
  };

  /**
   * Create rgba string from a color string
   */
  const toRgba = (color: string, alpha: number): string => {
    const parsed = parseRgb(color);
    if (parsed) {
      return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${alpha})`;
    }
    return color;
  };

  return {
    /** Array of accent colors from theme, or fallback to primary */
    accentColors,
    /** Primary color as RGB string (e.g., 'rgb(54, 134, 255)') */
    UNIFIED_ACCENT,
    /** Raw RGB values as space-separated string (e.g., '54 134 255') */
    PRIMARY_RGB,
    /** Get a color from accentColors by index */
    getColorByIndex,
    /** Parse RGB values from a color string */
    parseRgb,
    /** Convert a color string to rgba with specified alpha */
    toRgba,
  };
};