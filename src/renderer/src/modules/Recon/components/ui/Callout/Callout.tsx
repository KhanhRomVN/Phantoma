import { useState } from 'react';
import type { CalloutItem } from '../types';
import { withAlpha } from '../../targetType';
import { resolveColor } from '../../../constants/colors';

interface Props {
  items: CalloutItem[];
  /** Số CalloutItem trên mỗi hàng của box (từ `cols=N` trong @box). Mặc định 1. */
  cols?: number;
}

/** Màu mặc định của border-left theo tone; `{color=...}` trong .recon sẽ ghi đè. */
const TONE_COLOR: Record<string, string> = {
  ok: 'green',
  warn: 'yellow',
  danger: 'red',
  info: 'blue',
  neutral: 'gray',
};

/**
 * Một callout: border-left đậm (chỉ bo góc phải để vạch trái thẳng),
 * tiêu đề + nội dung tối đa 3 dòng (bấm để mở rộng tối đa 10 dòng) + nguồn.
 */
function CalloutRow({ item }: { item: CalloutItem }) {
  const hex =
    resolveColor(item.color) ?? resolveColor(TONE_COLOR[item.tone]) ?? resolveColor('gray')!;
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-l-none rounded-r-md border-l-4 px-3 py-2 text-left"
      style={{ borderLeftColor: hex, backgroundColor: withAlpha(hex, 0.1) }}
    >
      <div className="text-sm font-semibold" style={{ color: hex }}>
        {item.title}
      </div>
      {item.content && (
        <div
          onClick={() => setExpanded((v) => !v)}
          className="text-xs leading-relaxed text-text-primary/90 break-words cursor-pointer mt-1"
          style={{
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: expanded ? 10 : 3,
            overflow: 'hidden',
          }}
        >
          {item.content}
        </div>
      )}
      {item.src && item.src.length > 0 && (
        <div className="text-[10px] text-text-secondary mt-1">Nguồn: {item.src.join(', ')}</div>
      )}
    </div>
  );
}

/** Callout: khối ghi chú nổi bật theo tone/màu, có tiêu đề và nguồn, xếp theo lưới `cols`. */
export default function Callout({ items, cols = 1 }: Props) {
  if (items.length === 0)
    return <div className="text-text-secondary italic p-2">Không có ghi chú.</div>;

  const columns = Number.isFinite(cols) && cols >= 1 ? Math.floor(cols) : 1;

  return (
    <div
      className="h-full overflow-auto p-3 grid gap-2.5 content-start items-start"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {items.map((item, idx) => (
        <CalloutRow key={idx} item={item} />
      ))}
    </div>
  );
}
