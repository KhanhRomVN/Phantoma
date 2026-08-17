/**
 * FeatureCard - card tính năng cho trang chủ
 */

import { ReactNode } from 'react';
import { PropertyChip } from '../components/PropertyChip';

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  tag: string;
  tone?: 'cyan' | 'violet';
}

export function FeatureCard({ icon, title, description, tag, tone = 'cyan' }: FeatureCardProps) {
  const iconWrap =
    tone === 'cyan'
      ? 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10'
      : 'text-violet-600 dark:text-violet-400 bg-violet-500/10';

  return (
    <div className="group relative rounded-2xl border border-black/5 dark:border-white/5 bg-white dark:bg-zinc-900/60 p-7 hover:border-cyan-500/30 dark:hover:border-cyan-500/30 transition-colors duration-200">
      <div className={`inline-flex p-3 rounded-xl mb-5 ${iconWrap}`}>{icon}</div>
      <h3 className="font-[Space_Grotesk] text-xl font-bold mb-2 text-zinc-900 dark:text-white">
        {title}
      </h3>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
        {description}
      </p>
      <PropertyChip label="module" value={tag} tone={tone} />
    </div>
  );
}
