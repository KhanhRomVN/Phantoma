/**
 * FeatureBlock - block trình bày chi tiết một tính năng, layout xen kẽ trái/phải
 */

import { ReactNode } from 'react';
import { PropertyChip } from '../components/PropertyChip';

interface FeatureBlockProps {
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  icon: ReactNode;
  reversed?: boolean;
  tone?: 'cyan' | 'violet';
}

export function FeatureBlock({
  eyebrow,
  title,
  description,
  bullets,
  icon,
  reversed = false,
  tone = 'cyan',
}: FeatureBlockProps) {
  const accent =
    tone === 'cyan' ? 'text-cyan-600 dark:text-cyan-400' : 'text-violet-600 dark:text-violet-400';

  return (
    <div
      className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-16 border-b border-black/5 dark:border-white/5 last:border-0 ${
        reversed ? 'lg:[&>*:first-child]:order-2' : ''
      }`}
    >
      <div>
        <span
          className={`font-mono text-xs tracking-[0.2em] uppercase ${accent}`}
        >{`// ${eyebrow}`}</span>
        <h3 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white mt-3 mb-4">
          {title}
        </h3>
        <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6">{description}</p>
        <ul className="flex flex-col gap-3">
          {bullets.map((bullet) => (
            <li
              key={bullet}
              className="flex items-start gap-2.5 text-sm text-zinc-700 dark:text-zinc-300"
            >
              <span
                className={`mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0 ${tone === 'cyan' ? 'bg-cyan-500' : 'bg-violet-500'}`}
              />
              {bullet}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative rounded-2xl border border-black/5 dark:border-white/5 bg-zinc-50 dark:bg-zinc-900/60 p-10 flex flex-col items-center justify-center gap-6 min-h-[280px]">
        <div
          className={`flex h-16 w-16 items-center justify-center rounded-2xl ${
            tone === 'cyan'
              ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
              : 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
          }`}
        >
          {icon}
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <PropertyChip label="status" value="active" tone={tone} />
          <PropertyChip label="latency" value="~40ms" tone={tone} />
        </div>
      </div>
    </div>
  );
}
