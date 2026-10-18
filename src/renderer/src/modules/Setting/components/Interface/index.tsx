import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Moon, Palette, Sun, Type } from 'lucide-react';
import { useTheme } from '../../../../theme/ThemeProvider';
import { PRESET_THEMES, ThemeConfig } from '../../../../theme/theme-loader';
import { FONTS, applyFont, getStoredFont, setStoredFont, getFontByFamily } from '../../../../fonts';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from '@renderer/components/ui/Dropdown';
import { Button } from '@renderer/components/ui/Button';
import ThemeCard from './ThemeCard';
import { toRgb } from './themeColor';

type Filter = 'all' | 'dark' | 'light';

const FILTERS: { id: Filter; label: string; icon?: typeof Sun }[] = [
  { id: 'all', label: 'All' },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'light', label: 'Light', icon: Sun },
];

const Interface: React.FC = () => {
  const { applyPresetTheme, currentPreset } = useTheme();
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedFont, setSelectedFont] = useState<string>(() => {
    const stored = getStoredFont();
    return stored || FONTS[0]?.fontFamily || '';
  });

  useEffect(() => {
    const savedFont = getStoredFont();
    if (savedFont) {
      applyFont(savedFont);
    }
  }, []);

  const counts = useMemo(
    () => ({
      all: PRESET_THEMES.length,
      dark: PRESET_THEMES.filter((t) => t.type === 'dark').length,
      light: PRESET_THEMES.filter((t) => t.type === 'light').length,
    }),
    [],
  );

  const visibleThemes = useMemo(
    () => PRESET_THEMES.filter((t) => filter === 'all' || t.type === filter),
    [filter],
  );

  const handleFontChange = (fontValue: string) => {
    setSelectedFont(fontValue);
    setStoredFont(fontValue);
  };

  const getFontLabel = (value: string) => getFontByFamily(value)?.label ?? 'Select font';

  const isSelected = (theme: ThemeConfig) =>
    currentPreset?.id === theme.id || currentPreset?.name === theme.name;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-card-background p-6">
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full opacity-30 blur-3xl transition-colors duration-500"
          style={{ background: toRgb(currentPreset?.tailwind.primary) }}
        />
        <div
          className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full opacity-20 blur-3xl transition-colors duration-500"
          style={{ background: toRgb(currentPreset?.tailwind.info) }}
        />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <Palette className="h-6 w-6" />
            </div>
            <div>
              <h3 className="m-0 text-lg font-semibold tracking-tight text-text-primary">
                Appearance
              </h3>
              <p className="m-0 mt-0.5 text-sm text-text-secondary">
                Pick the look that fits your focus. Changes apply instantly.
              </p>
            </div>
          </div>
          {currentPreset && (
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-background/60 px-4 py-2.5 backdrop-blur">
              <div className="flex -space-x-1.5">
                {[toRgb(currentPreset.tailwind.primary), ...(currentPreset.accentColors || []).slice(0, 3)].map(
                  (color, i) => (
                    <span
                      key={`${color}-${i}`}
                      className="h-5 w-5 rounded-full border-2 border-card-background"
                      style={{ background: color }}
                    />
                  ),
                )}
              </div>
              <div className="leading-tight">
                <div className="text-[10px] uppercase tracking-widest text-text-secondary">Active</div>
                <div className="text-sm font-semibold text-text-primary">{currentPreset.name}</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Theme gallery */}
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h4 className="m-0 text-sm font-semibold tracking-wide text-text-primary">Themes</h4>
          <div className="inline-flex rounded-xl border border-border bg-card-background p-1">
            {FILTERS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  filter === id
                    ? 'bg-primary text-white shadow'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {label}
                <span className={filter === id ? 'opacity-80' : 'opacity-50'}>{counts[id]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 2xl:grid-cols-3">
          {visibleThemes.map((theme) => (
            <ThemeCard
              key={theme.id || theme.name}
              theme={theme}
              selected={isSelected(theme)}
              onSelect={applyPresetTheme}
            />
          ))}
        </div>
      </section>

      {/* Typography */}
      <section className="rounded-3xl border border-border bg-card-background p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Type className="h-4.5 w-4.5" />
          </div>
          <h4 className="m-0 text-sm font-semibold tracking-wide text-text-primary">Typography</h4>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-[minmax(0,260px)_1fr]">
          <Dropdown>
            <DropdownTrigger asChild>
              <Button
                variant="outline"
                className="flex h-fit w-full justify-between px-3 py-2.5 text-sm"
                style={{ fontFamily: selectedFont }}
              >
                <span className="truncate">{getFontLabel(selectedFont)}</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-text-secondary" />
              </Button>
            </DropdownTrigger>
            <DropdownContent className="max-h-[300px] w-full min-w-[200px] overflow-y-auto">
              {FONTS.map((font) => (
                <DropdownItem
                  key={font.fontFamily}
                  onClick={() => handleFontChange(font.fontFamily)}
                  className="flex items-center gap-2 px-3 py-2"
                  style={{ fontFamily: font.fontFamily }}
                >
                  <span className="text-sm">{font.label}</span>
                  {selectedFont === font.fontFamily && (
                    <span className="ml-auto text-xs text-primary">✓</span>
                  )}
                </DropdownItem>
              ))}
            </DropdownContent>
          </Dropdown>

          <div
            className="flex items-center gap-5 rounded-2xl border border-border bg-background/50 px-5 py-4"
            style={{ fontFamily: selectedFont }}
          >
            <span className="text-5xl font-semibold leading-none text-primary">Aa</span>
            <div className="min-w-0">
              <p className="m-0 text-base text-text-primary">The quick brown fox jumps over the lazy dog</p>
              <p className="m-0 mt-1 text-xs tracking-widest text-text-secondary">
                ABCDEFGHIJKLM 0123456789
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Interface;