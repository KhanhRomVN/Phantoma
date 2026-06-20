import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { FONTS, applyFont, getStoredFont, setStoredFont, FontDefinition, getFontById, initFontSystem } from './index';

interface FontProviderState {
  currentFont: FontDefinition | null;
  availableFonts: FontDefinition[];
  setFont: (fontId: string) => void;
  isLoading: boolean;
}

const FontProviderContext = createContext<FontProviderState | undefined>(undefined);

interface FontProviderProps {
  children: ReactNode;
  defaultFontId?: string;
}

export const FontProvider: React.FC<FontProviderProps> = ({
  children,
  defaultFontId = 'google-sans',
}) => {
  const [currentFont, setCurrentFont] = useState<FontDefinition | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize font on mount
  useEffect(() => {
    const initFont = () => {
      // Initialize font system (injects @font-face and loads stored/default font)
      initFontSystem();
      
      // Get the current font after initialization
      const storedFontFamily = getStoredFont();
      let font: FontDefinition | undefined;

      if (storedFontFamily) {
        // Find font by stored fontFamily string
        font = FONTS.find((f) => f.fontFamily === storedFontFamily);
        if (!font) {
          console.warn('🔤 [FontProvider] No font found for stored family:', storedFontFamily);
        }
      }

      if (!font) {
        // Fallback to default
        font = getFontById(defaultFontId) || FONTS[0];
        if (font) {
          setStoredFont(font.fontFamily);
        }
      }

      if (font) {
        setCurrentFont(font);
        applyFont(font.fontFamily);
      } else {
        console.error('🔤 [FontProvider] No font available!');
      }

      setIsLoading(false);
    };

    initFont();
  }, [defaultFontId]);

  const setFont = (fontId: string) => {
    const font = getFontById(fontId);
    if (font) {
      setCurrentFont(font);
      setStoredFont(font.fontFamily);
    } else {
      console.error('🔤 [FontProvider] Font not found for ID:', fontId);
    }
  };

  const value: FontProviderState = {
    currentFont,
    availableFonts: FONTS,
    setFont,
    isLoading,
  };

  return (
    <FontProviderContext.Provider value={value}>
      {children}
    </FontProviderContext.Provider>
  );
};

export const useFont = (): FontProviderState => {
  const context = useContext(FontProviderContext);
  if (context === undefined) {
    throw new Error('useFont must be used within a FontProvider');
  }
  return context;
};

export default FontProvider;