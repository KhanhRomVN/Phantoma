/**
 * PricingCard - card hiển thị một gói giá
 */

import { Check } from 'lucide-react';
import { Button } from '../components/Button';

interface PricingCardProps {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  ctaLabel: string;
  onClick: () => void;
}

export function PricingCard({
  name,
  price,
  period = '/ tháng',
  description,
  features,
  highlighted = false,
  ctaLabel,
  onClick,
}: PricingCardProps) {
  return (
    <div
      className={`relative rounded-2xl p-8 flex flex-col ${
        highlighted
          ? 'border-2 border-cyan-500/60 bg-white dark:bg-zinc-900 shadow-2xl shadow-cyan-500/10 lg:-translate-y-3'
          : 'border border-black/10 dark:border-white/10 bg-white/60 dark:bg-zinc-900/40'
      }`}
    >
      {highlighted && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-white">
          Phổ biến nhất
        </span>
      )}

      <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">{name}</h3>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">{description}</p>

      <div className="mb-6">
        <span className="text-4xl font-bold text-zinc-900 dark:text-white">{price}</span>
        {price !== 'Liên hệ' && (
          <span className="text-sm text-zinc-500 dark:text-zinc-400"> {period}</span>
        )}
      </div>

      <ul className="flex flex-col gap-3 mb-8 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-zinc-700 dark:text-zinc-300">
            <Check className="h-4 w-4 text-cyan-500 flex-shrink-0 mt-0.5" />
            {f}
          </li>
        ))}
      </ul>

      <Button
        variant={highlighted ? 'primary' : 'secondary'}
        size="md"
        className="w-full"
        onClick={onClick}
      >
        {ctaLabel}
      </Button>
    </div>
  );
}
