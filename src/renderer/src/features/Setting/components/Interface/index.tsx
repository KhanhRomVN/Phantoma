import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../../theme/ThemeProvider';
import { PRESET_THEMES, ThemeConfig } from '../../../../theme/theme-loader';
import { FONTS, applyFont, getStoredFont, setStoredFont, getFontByFamily } from '../../../../fonts';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from '../../../../components/ui/Dropdown';
import { Button } from '../../../../components/ui/Button';
import { ChevronDown } from 'lucide-react';

const Interface: React.FC = () => {
  const { applyPresetTheme, currentPreset } = useTheme();
  const [themes, setThemes] = useState<ThemeConfig[]>([]);
  const [selectedFont, setSelectedFont] = useState<string>(() => {
    const stored = getStoredFont();
    return stored || FONTS[0]?.fontFamily || '';
  });

  useEffect(() => {
    setThemes(PRESET_THEMES);

    // Apply saved font on mount using centralized function
    const savedFont = getStoredFont();
    if (savedFont) {
      applyFont(savedFont);
    }
  }, []);

  const handleThemeSelect = (theme: ThemeConfig) => {
    applyPresetTheme(theme);
  };

  const handleFontChange = (fontValue: string) => {
    setSelectedFont(fontValue);
    setStoredFont(fontValue);
  };

  // Get the current display label for the selected font
  const getFontLabel = (value: string) => {
    const found = getFontByFamily(value);
    return found ? found.label : 'Select font';
  };

  return (
    <div>
      <h3 className="text-base text-primary m-0 mb-4">Interface Settings</h3>

      {/* Font Family Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-text-primary tracking-wide mb-1.5">
          Font Family
        </label>
        <div className="max-w-full md:max-w-[calc(50%-0.5rem)]">
          <Dropdown>
            <DropdownTrigger asChild>
              <Button
                variant="outline"
                className="w-full flex justify-between px-3 py-2.5 text-sm font-mono"
                style={{ fontFamily: selectedFont }}
              >
                <span className="truncate">{getFontLabel(selectedFont)}</span>
                <ChevronDown className="w-4 h-4 text-text-secondary shrink-0" />
              </Button>
            </DropdownTrigger>
            <DropdownContent className="w-full min-w-[200px] max-h-[300px] overflow-y-auto">
              {FONTS.map((font) => (
                <DropdownItem
                  key={font.fontFamily}
                  onClick={() => handleFontChange(font.fontFamily)}
                  className="flex items-center gap-2 px-3 py-2"
                  style={{ fontFamily: font.fontFamily }}
                >
                  <span className="text-sm">{font.label}</span>
                  {selectedFont === font.fontFamily && (
                    <span className="ml-auto text-primary text-xs">✓</span>
                  )}
                </DropdownItem>
              ))}
            </DropdownContent>
          </Dropdown>
        </div>
        <p className="text-text-secondary text-xs mt-1.5 tracking-wide">
          Preview:{' '}
          <span className="italic" style={{ fontFamily: selectedFont }}>
            The quick brown fox jumps over the lazy dog
          </span>
        </p>
      </div>

      {/* Theme Selection */}
      <div>
        <label className="block text-sm font-medium text-text-primary tracking-wide mb-1.5">
          Theme Selection
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {themes.map((theme) => (
            <button
              key={theme.id || theme.name}
              onClick={() => handleThemeSelect(theme)}
              className={`text-left p-4 rounded-md border-2 transition-all ${
                currentPreset?.id === theme.id || currentPreset?.name === theme.name
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card-background hover:border-primary/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded"
                  style={{
                    background: `rgb(${theme.tailwind.primary.match(/\d+/g)?.[0] || '0'}, ${theme.tailwind.primary.match(/\d+/g)?.[1] || '0'}, ${theme.tailwind.primary.match(/\d+/g)?.[2] || '0'})`,
                  }}
                />
                <div>
                  <h4 className="text-text-primary font-medium m-0">{theme.name}</h4>
                  <p className="text-text-secondary text-xs m-0">
                    ID: {theme.id || theme.name.toLowerCase().replace(/\s/g, '_')}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Interface;