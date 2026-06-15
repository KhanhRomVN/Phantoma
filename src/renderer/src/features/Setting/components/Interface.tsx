import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../theme/ThemeProvider';
import { PRESET_THEMES, ThemeConfig } from '../../../theme/theme-loader';

const Interface: React.FC = () => {
  const { applyPresetTheme, currentPreset } = useTheme();
  const [themes, setThemes] = useState<ThemeConfig[]>([]);

  useEffect(() => {
    setThemes(PRESET_THEMES);
  }, []);

  const handleThemeSelect = (theme: ThemeConfig) => {
    applyPresetTheme(theme);
  };

  return (
    <div>
      <h3 className="text-base text-primary m-0 mb-4">Interface Settings</h3>
      <div className="mb-4">
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
