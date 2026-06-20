/**
 * Font Registry - Centralized font management
 * All available fonts and their configurations
 */

// Import font files directly (Vite will handle the bundling)
import googleSansFont from './assets/GoogleSans-Regular.ttf?url';
import firaCodeFont from './assets/FiraCode-Regular.ttf?url';
import spaceGroteskFont from './assets/SpaceGrotesk-Regular.ttf?url';
import ibmPlexMonoFont from './assets/IBMPlexMono-Regular.ttf?url';
import dmSansFont from './assets/DMSans-Regular.ttf?url';
import geistFont from './assets/Geist-Regular.ttf?url';
import manropeFont from './assets/Manrope-Regular.ttf?url';
import outfitFont from './assets/Outfit-Regular.ttf?url';
import plusJakartaSansFont from './assets/PlusJakartaSans-Regular.ttf?url';
import soraFont from './assets/Sora-Regular.ttf?url';

export interface FontDefinition {
  id: string;
  label: string;
  fontFamily: string;
  fontUrl: string; // All fonts must have a local TTF file
  category: 'sans-serif' | 'serif' | 'monospace';
  description?: string;
}

export const FONTS: FontDefinition[] = [
  {
    id: 'google-sans',
    label: 'Google Sans',
    fontFamily: 'GoogleSans',
    fontUrl: googleSansFont,
    category: 'sans-serif',
    description: 'Clean and modern (default)',
  },
  {
    id: 'fira-code',
    label: 'Fira Code',
    fontFamily: 'Fira Code',
    fontUrl: firaCodeFont,
    category: 'monospace',
    description: 'Popular monospace with ligatures',
  },
  {
    id: 'space-grotesk',
    label: 'Space Grotesk',
    fontFamily: 'Space Grotesk',
    fontUrl: spaceGroteskFont,
    category: 'sans-serif',
    description: 'Tech/futuristic vibe',
  },
  {
    id: 'ibm-plex-mono',
    label: 'IBM Plex Mono',
    fontFamily: 'IBM Plex Mono',
    fontUrl: ibmPlexMonoFont,
    category: 'monospace',
    description: 'Professional and clean',
  },
  {
    id: 'dm-sans',
    label: 'DM Sans',
    fontFamily: 'DM Sans',
    fontUrl: dmSansFont,
    category: 'sans-serif',
    description: 'Modern and geometric',
  },
  {
    id: 'geist',
    label: 'Geist',
    fontFamily: 'Geist',
    fontUrl: geistFont,
    category: 'sans-serif',
    description: 'Vercel modern UI font',
  },
  {
    id: 'manrope',
    label: 'Manrope',
    fontFamily: 'Manrope',
    fontUrl: manropeFont,
    category: 'sans-serif',
    description: 'Modern and versatile',
  },
  {
    id: 'outfit',
    label: 'Outfit',
    fontFamily: 'Outfit',
    fontUrl: outfitFont,
    category: 'sans-serif',
    description: 'Clean and geometric',
  },
  {
    id: 'plus-jakarta-sans',
    label: 'Plus Jakarta Sans',
    fontFamily: 'Plus Jakarta Sans',
    fontUrl: plusJakartaSansFont,
    category: 'sans-serif',
    description: 'Modern and elegant',
  },
  {
    id: 'sora',
    label: 'Sora',
    fontFamily: 'Sora',
    fontUrl: soraFont,
    category: 'sans-serif',
    description: 'Minimal and clean',
  },
];

/**
 * Inject @font-face rules dynamically
 */
const injectFontFace = (font: FontDefinition): void => {
  // Check if font already injected
  const existingStyle = document.getElementById(`font-${font.id}`);
  if (existingStyle) {
    return;
  }

  const style = document.createElement('style');
  style.id = `font-${font.id}`;
  style.textContent = `
    @font-face {
      font-family: '${font.fontFamily}';
      src: url('${font.fontUrl}') format('truetype');
      font-weight: 400;
      font-style: normal;
      font-display: swap;
    }
  `;
  document.head.appendChild(style);
};

/**
 * Initialize all fonts
 */
export const initFonts = (): void => {
  FONTS.forEach((font) => {
    injectFontFace(font);
  });
};

/**
 * Get font by ID
 */
export const getFontById = (id: string): FontDefinition | undefined => {
  return FONTS.find((font) => font.id === id);
};

/**
 * Get font by fontFamily string
 */
export const getFontByFamily = (fontFamily: string): FontDefinition | undefined => {
  return FONTS.find((font) => font.fontFamily === fontFamily);
};

/**
 * Apply font to root element
 */
export const applyFont = (fontFamily: string): void => {
  const root = document.documentElement;
  root.style.fontFamily = fontFamily;
  root.style.setProperty('--font-family', fontFamily);
};

/**
 * Get current applied font from localStorage
 */
export const getStoredFont = (): string | null => {
  return localStorage.getItem('font-family');
};

/**
 * Save font preference to localStorage and apply
 */
export const setStoredFont = (fontFamily: string): void => {
  localStorage.setItem('font-family', fontFamily);
  applyFont(fontFamily);
};

/**
 * Initialize font system on app start
 * - Load stored font preference or fallback to default
 */
export const initFontSystem = (): void => {
  // First, inject all font faces
  initFonts();
  
  const stored = getStoredFont();
  if (stored) {
    applyFont(stored);
  } else {
    // Set default font (GoogleSans)
    const defaultFont = FONTS[0];
    if (defaultFont) {
      applyFont(defaultFont.fontFamily);
      localStorage.setItem('font-family', defaultFont.fontFamily);
    }
  }
};

// Re-export FontProvider and useFont
export { FontProvider, useFont } from './FontProvider';

// Default export for convenient import
export default FONTS;