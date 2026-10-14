import type { QuoteItem } from '../types';
import { COLOR_MAP, resolveColor } from '../../../constants/colors';

const AUTO_COLORS = Object.values(COLOR_MAP).filter((c) => c !== COLOR_MAP.gray);

function autoColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AUTO_COLORS[hash % AUTO_COLORS.length];
}

interface Props {
  items: QuoteItem[];
}

/** Quote: trích dẫn kèm tác giả và nguồn. */
export default function Quote({ items }: Props) {
  if (items.length === 0) return <div className="text-text-secondary italic p-2">Không có trích dẫn.</div>;

  return (
    <div className="h-full overflow-auto p-2 flex flex-col gap-2">
      {items.map((item, idx) => (
        <blockquote
          key={idx}
          className="border-l-2 pl-3 py-1 text-left"
          style={{
            borderLeftColor: resolveColor(item.color) ?? autoColor(item.author ?? item.text),
          }}
        >
          <p className="text-sm italic text-text-primary whitespace-pre-wrap">“{item.text}”</p>
          {(item.author || (item.src && item.src.length > 0)) && (
            <footer className="text-[11px] text-text-secondary mt-1">
              {item.author && <span>— {item.author}</span>}
              {item.src && item.src.length > 0 && <span className="ml-2">[{item.src.join(', ')}]</span>}
            </footer>
          )}
        </blockquote>
      ))}
    </div>
  );
}