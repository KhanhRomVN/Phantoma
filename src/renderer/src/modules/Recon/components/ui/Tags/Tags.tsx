import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import type { TagGroup } from '../types';
import { resolveColor } from '../../../constants/colors';

interface Props {
  groups: TagGroup[];
}

const DEFAULT_COLOR = '#3686ff';

export default function Tags({ groups }: Props) {
  const [copied, setCopied] = useState<string | null>(null);

  if (groups.length === 0 || groups.every((g) => g.items.length === 0))
    return <div className="text-text-secondary italic p-2">Chưa có dữ liệu.</div>;

  const copy = (value: string) => {
    navigator.clipboard?.writeText(value);
    setCopied(value);
    setTimeout(() => setCopied((c) => (c === value ? null : c)), 1200);
  };

  return (
    <div className="h-full overflow-auto p-3 flex flex-col gap-4">
      {groups.map((g, gi) => (
        <div key={gi}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
              {g.title || 'Khác'}
            </span>
            <span className="text-[10px] px-1.5 rounded-full bg-sidebar-item-hover text-text-secondary">
              {g.items.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {g.items.map((it, i) => {
              const color = resolveColor(it.color) ?? DEFAULT_COLOR;
              const done = copied === it.value;
              return (
                <span
                  key={i}
                  className="inline-flex items-center h-[26px] rounded-md border border-border bg-input-background overflow-hidden text-xs transition-colors hover:border-primary/60"
                >
                  <span
                    className="h-full px-2 flex items-center gap-1.5 font-mono text-text-primary border-l-2"
                    style={{ borderLeftColor: color }}
                  >
                    {it.value}
                    {it.type && (
                      <span
                        className="px-1.5 rounded-full text-[10px] font-sans"
                        style={{ color, backgroundColor: `${color}1a` }}
                      >
                        {it.type}
                      </span>
                    )}
                    {it.src?.map((s) => (
                      <span key={s} className="text-[10px] font-sans text-text-secondary">
                        {s}
                      </span>
                    ))}
                  </span>
                  <button
                    type="button"
                    title="Copy"
                    onClick={() => copy(it.value)}
                    className="h-full w-6 border-l border-border flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-sidebar-item-hover transition-colors"
                  >
                    {done ? (
                      <Check className="w-3 h-3 text-green-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}