import React, { useMemo, useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { FONTS, getFontByFamily } from '../../../../fonts';
import type { FontDefinition } from '../../../../fonts';
import { Segmented, TONE } from '../shared';
import type { Tone } from '../shared';

type Category = 'all' | FontDefinition['category'];

const DEFAULT_SAMPLE = 'The quick brown fox jumps over the lazy dog';

const CATEGORY_TONE: Record<FontDefinition['category'], Tone> = {
  'sans-serif': 'blue',
  serif: 'pink',
  monospace: 'teal',
};

interface FontPickerProps {
  value: string;
  onChange: (fontFamily: string) => void;
}

const FontPicker: React.FC<FontPickerProps> = ({ value, onChange }) => {
  const [category, setCategory] = useState<Category>('all');
  const [sample, setSample] = useState(DEFAULT_SAMPLE);

  const active = getFontByFamily(value);

  const options = useMemo(() => {
    const count = (c: FontDefinition['category']) => FONTS.filter((f) => f.category === c).length;
    return (
      [
        { id: 'all', label: 'All', count: FONTS.length },
        { id: 'sans-serif', label: 'Sans', count: count('sans-serif') },
        { id: 'serif', label: 'Serif', count: count('serif') },
        { id: 'monospace', label: 'Mono', count: count('monospace') },
      ] as { id: Category; label: string; count: number }[]
    ).filter((o) => o.id === 'all' || o.count > 0);
  }, []);

  const visible = useMemo(
    () => FONTS.filter((f) => category === 'all' || f.category === category),
    [category],
  );

  return (
    <div className="flex flex-col">
      <div className="border-b border-border p-4">
        <div className="mb-2 flex items-center justify-between gap-2 text-[11px] text-text-secondary">
          <span className="truncate">Preview{active ? ` · ${active.label}` : ''}</span>
          <button
            type="button"
            onClick={() => setSample(DEFAULT_SAMPLE)}
            className="inline-flex items-center gap-1 outline-none transition-colors hover:text-text-primary"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
        </div>
        <textarea
          value={sample}
          onChange={(e) => setSample(e.target.value)}
          rows={3}
          spellCheck={false}
          placeholder={DEFAULT_SAMPLE}
          style={{ fontFamily: value }}
          className="block w-full resize-none rounded-lg border border-border bg-background p-3 text-[22px] leading-snug text-text-primary outline-none transition-colors placeholder:text-text-secondary/50 focus:border-pink/60"
        />
      </div>

      <div className="flex items-center justify-between gap-3 px-4 pt-3">
        <Segmented<Category> tone="pink" value={category} onChange={setCategory} options={options} />
        <span className="text-[11px] text-text-secondary">{visible.length} fonts</span>
      </div>

      <div className="grid grid-cols-1 gap-2 p-4 md:grid-cols-2">
        {visible.map((font) => {
          const tone = CATEGORY_TONE[font.category];
          const selected = value === font.fontFamily;
          return (
            <button
              key={font.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(font.fontFamily)}
              className={cn(
                'flex min-w-0 items-center gap-3 rounded-lg border px-3 py-2 text-left outline-none transition-colors',
                selected
                  ? cn('border-transparent', TONE[tone])
                  : 'border-border bg-background hover:border-text-secondary/40',
              )}
            >
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[15px] font-semibold',
                  TONE[tone],
                )}
                style={{ fontFamily: font.fontFamily }}
              >
                Aa
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className="block truncate text-[13px] font-medium text-text-primary"
                  style={{ fontFamily: font.fontFamily }}
                >
                  {font.label}
                </span>
                {font.description && (
                  <span className="block truncate text-[11px] text-text-secondary">{font.description}</span>
                )}
              </span>
              {selected && <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FontPicker;