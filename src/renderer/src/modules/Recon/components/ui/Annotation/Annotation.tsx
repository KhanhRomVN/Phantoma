import { useState } from 'react';
import type { AnnotationItem } from '../types';
import { withAlpha } from '../../targetType';
import { resolveColor } from '../../../constants/colors';

interface Props {
  items: AnnotationItem[];
  /** Số AnnotationCard trên mỗi hàng của box (từ `cols=N` trong @box). Mặc định 1. */
  cols?: number;
}

/**
 * Một ghi chú: hàng đầu gồm avatar + tác giả/thời gian + mô tả 1 dòng;
 * nội dung nằm riêng bên dưới, tối đa 3 dòng (thừa thì hiện '...'), bấm vào để mở rộng tối đa 10 dòng.
 */
function AnnotationRow({ item }: { item: AnnotationItem }) {
  const hex = resolveColor(item.color) ?? resolveColor('blue')!;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-md border border-border/50 bg-background/40 px-3 py-2.5 text-left space-y-2">
      <div className="flex gap-3 items-center">
        <div
          className="w-8 h-8 rounded-md shrink-0 flex items-center justify-center text-xs font-semibold"
          style={{ backgroundColor: withAlpha(hex, 0.15), color: hex }}
        >
          {item.author.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="font-semibold text-text-primary truncate">{item.author}</span>
            <span className="shrink-0 text-[11px] tabular-nums text-text-secondary">
              {item.time}
            </span>
          </div>
          {item.desc && (
            <div className="text-[11px] leading-tight text-text-secondary truncate">
              {item.desc}
            </div>
          )}
        </div>
      </div>
      {item.content && (
        <div
          onClick={() => setExpanded((v) => !v)}
          className="text-xs leading-relaxed text-text-primary/90 break-words cursor-pointer"
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
    </div>
  );
}

/** Annotation: danh sách ghi chú kèm tác giả, mô tả và thời gian. */
export default function Annotation({ items, cols = 1 }: Props) {
  if (items.length === 0)
    return <div className="text-text-secondary italic p-2">Không có ghi chú.</div>;

  const columns = Number.isFinite(cols) && cols >= 1 ? Math.floor(cols) : 1;

  return (
    <div
      className="h-full overflow-auto p-3 grid gap-2.5 content-start items-start"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {items.map((item, idx) => (
        <AnnotationRow key={idx} item={item} />
      ))}
    </div>
  );
}
