import { Fragment } from 'react';
import type { KvItem } from '../types';
import { cn } from '@renderer/shared/utils/cn';

interface Props {
  items: KvItem[];
  cols?: number; // 1 or 2
}

export default function Kv({ items, cols = 1 }: Props) {
  if (items.length === 0) return <div className="text-text-secondary italic p-2">Chưa có dữ liệu.</div>;

  const columns = Array.from({ length: cols === 2 ? 2 : 1 }, () => 'max-content minmax(0, 1fr)').join(' ');

  return (
    <div
      className="h-full overflow-auto px-3 py-2 grid content-start"
      style={{ gridTemplateColumns: columns }}
    >
      {items.map((item, idx) => {
        const isLastRow = idx >= items.length - (cols === 2 ? 2 : 1);
        const border = cn('py-1', !isLastRow && 'border-b border-border/30');
        return (
          <Fragment key={idx}>
            <span className={cn(border, 'pr-6 text-xs font-medium text-text-secondary whitespace-nowrap')}>
              {item.key}
            </span>
            <div className={cn(border, cols === 2 && 'pr-4')}>
              <ValueRenderer value={item.value} meta={item.meta} />
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

function ValueRenderer({ value, meta }: { value: string; meta: any }) {
  const type = meta?.type;
  
  // Handle Array-like strings (e.g. ["a", "b"])
  let displayValue = value;
  if (value.startsWith('[') && value.endsWith(']')) {
    try {
      const arr = JSON.parse(value);
      if (Array.isArray(arr)) {
        return (
          <div className="flex flex-wrap gap-1 justify-end md:justify-start">
            {arr.map((v, i) => (
              <span key={i} className="inline-block px-1.5 py-0.5 bg-muted rounded text-xs font-mono text-text-primary">
                {String(v)}
              </span>
            ))}
          </div>
        );
      }
    } catch { /* ignore */ }
  }

  switch (type) {
    case 'email':
      return <a href={`mailto:${displayValue}`} className="text-blue-400 hover:underline break-all">{displayValue}</a>;
    case 'url':
    case 'domain':
      return <a href={displayValue.startsWith('http') ? displayValue : `https://${displayValue}`} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline break-all">{displayValue}</a>;
    case 'phone':
      return <span className="font-mono select-all">{displayValue}</span>;
    case 'ip':
    case 'hash':
    case 'mono':
      return <code className="bg-black/20 px-1 py-0.5 rounded text-xs font-mono text-yellow-200 select-all cursor-pointer" title="Click to copy">{displayValue}</code>;
    case 'date':
    case 'period':
      return <span className="text-gray-300">{displayValue}</span>;
    case 'enum':
      return <span className="px-2 py-0.5 bg-purple-900/30 text-purple-300 rounded-full text-xs border border-purple-500/30 capitalize">{displayValue}</span>;
    default:
      return <span className="text-text-primary break-words">{displayValue}</span>;
  }
}