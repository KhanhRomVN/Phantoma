import React, { useEffect, useMemo, useState } from 'react';
import { Moon, Palette, Search, Sun, Type } from 'lucide-react';
import { useTheme } from '../../../../theme/ThemeProvider';
import { PRESET_THEMES, ThemeConfig } from '../../../../theme/theme-loader';
import { FONTS, applyFont, getStoredFont, setStoredFont, getFontByFamily } from '../../../../fonts';
import ThemeCard from './ThemeCard';
import FontPicker from './FontPicker';
import { FAKE_THEMES } from './fakeThemes';
import { toRgb } from './themeColor';
import { Badge, INPUT_CLASS, PageHeader, Section, Segmented } from '../shared';

type Filter = 'all' | 'dark' | 'light';

const ALL_THEMES: { theme: ThemeConfig; preview: boolean }[] = [
  ...PRESET_THEMES.map((theme) => ({ theme, preview: false })),
  ...FAKE_THEMES.map((theme) => ({ theme, preview: true })),
];

const Interface: React.FC = () => {
  const { applyPresetTheme, currentPreset } = useTheme();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [selectedFont, setSelectedFont] = useState<string>(() => {
    const stored = getStoredFont();
    return stored || FONTS[0]?.fontFamily || '';
  });

  useEffect(() => {
    const savedFont = getStoredFont();
    if (savedFont) applyFont(savedFont);
  }, []);

  const counts = useMemo(
    () => ({
      all: ALL_THEMES.length,
      dark: ALL_THEMES.filter((t) => t.theme.type === 'dark').length,
      light: ALL_THEMES.filter((t) => t.theme.type === 'light').length,
    }),
    [],
  );

  const visibleThemes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL_THEMES.filter(
      (t) =>
        (filter === 'all' || t.theme.type === filter) &&
        (!q || t.theme.name.toLowerCase().includes(q)),
    );
  }, [filter, query]);

  const handleFontChange = (fontValue: string) => {
    setSelectedFont(fontValue);
    setStoredFont(fontValue);
  };

  const isSelected = (theme: ThemeConfig) =>
    currentPreset?.id === theme.id || currentPreset?.name === theme.name;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Interface"
        description="Pick the look that fits your focus. Changes apply instantly."
        actions={
          currentPreset && (
            <div className="flex items-center gap-2 rounded-lg bg-purple/10 px-2.5 py-1">
              <div className="flex -space-x-1">
                {[toRgb(currentPreset.tailwind.primary), ...(currentPreset.accentColors || []).slice(0, 3)].map(
                  (color, i) => (
                    <span
                      key={`${color}-${i}`}
                      className="h-3.5 w-3.5 rounded-full border-2 border-card-background"
                      style={{ background: color }}
                    />
                  ),
                )}
              </div>
              <span className="text-[12px] font-medium text-purple">{currentPreset.name}</span>
            </div>
          )
        }
      />

      <Section
        title="Theme"
        description={`${visibleThemes.length} of ${counts.all} themes`}
        icon={<Palette className="h-3.5 w-3.5" />}
        action={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search themes"
                className={`${INPUT_CLASS} h-7 w-40 pl-8`}
              />
            </div>
            <Segmented<Filter>
              value={filter}
              onChange={setFilter}
              options={[
                { id: 'all', label: 'All', count: counts.all },
                { id: 'dark', label: 'Dark', icon: <Moon className="h-3 w-3" />, count: counts.dark },
                { id: 'light', label: 'Light', icon: <Sun className="h-3 w-3" />, count: counts.light },
              ]}
            />
          </div>
        }
        bodyClassName="divide-y-0"
      >
        {visibleThemes.length === 0 ? (
          <div className="py-10 text-center text-[12.5px] text-text-secondary">No themes match.</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 p-4 xl:grid-cols-3">
            {visibleThemes.map(({ theme, preview }) => (
              <ThemeCard
                key={theme.id || theme.name}
                theme={theme}
                preview={preview}
                selected={isSelected(theme)}
                onSelect={applyPresetTheme}
              />
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Typography"
        description={getFontByFamily(selectedFont)?.label ?? 'Select a font'}
        icon={<Type className="h-3.5 w-3.5" />}
        tone="pink"
        action={<Badge tone="pink">{FONTS.length} fonts</Badge>}
        bodyClassName="divide-y-0"
      >
        <FontPicker value={selectedFont} onChange={handleFontChange} />
      </Section>
    </div>
  );
};

export default Interface;