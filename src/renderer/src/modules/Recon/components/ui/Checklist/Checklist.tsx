import { useState } from 'react';
import { Check, Minus } from 'lucide-react';
import type { ChecklistItem } from '../types';
import { cn } from '@renderer/shared/utils/cn';

interface Props {
  items: ChecklistItem[];
}

type TickState = 'checked' | 'partial' | 'unchecked';

/** Ô tick tuỳ biến: vuông bo góc, xanh khi tick, dấu gạch khi tick một phần. */
function TickBox({ state, size = 'md', onClick }: { state: TickState; size?: 'md' | 'sm'; onClick: () => void }) {
  const active = state !== 'unchecked';
  return (
    <button
      type='button'
      role='checkbox'
      aria-checked={state === 'partial' ? 'mixed' : state === 'checked'}
      onClick={(e) => {
        e.stopPropagation(); // tránh nổi bọt lên hàng cha làm đổi trạng thái 2 lần
        onClick();
      }}
      className={cn(
        'shrink-0 flex items-center justify-center rounded-md border transition-all duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50',
        size === 'md' ? 'w-[18px] h-[18px]' : 'w-4 h-4',
        active
          ? 'bg-blue-500 border-blue-500 text-white'
          : 'bg-transparent border-text-secondary/40 hover:border-blue-400'
      )}
    >
      {state === 'checked' && <Check className={size === 'md' ? 'w-3 h-3' : 'w-2.5 h-2.5'} strokeWidth={3} />}
      {state === 'partial' && <Minus className={size === 'md' ? 'w-3 h-3' : 'w-2.5 h-2.5'} strokeWidth={3} />}
    </button>
  );
}

/** Trạng thái hiển thị của mục: mục cha suy ra từ các mục con. */
function stateOf(item: ChecklistItem): TickState {
  if (item.children && item.children.length > 0) {
    const done = item.children.filter((c) => c.checked).length;
    if (done === item.children.length) return 'checked';
    return done === 0 ? 'unchecked' : 'partial';
  }
  return item.checked ? 'checked' : 'unchecked';
}

/** Checklist: ô tick tuỳ biến, hỗ trợ sub-checklist (cha tự suy ra từ con, kèm bộ đếm). */
export default function Checklist({ items }: Props) {
  // Local state để bấm tick được mà không sửa dữ liệu gốc (v1 memory-only)
  const [localItems, setLocalItems] = useState(items);

  const toggleParent = (index: number) => {
    setLocalItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        if (!item.children || item.children.length === 0) return { ...item, checked: !item.checked };
        // Cha có con: tick/bỏ tick cả nhóm
        const next = stateOf(item) !== 'checked';
        return { ...item, checked: next, children: item.children.map((c) => ({ ...c, checked: next })) };
      })
    );
  };

  const toggleChild = (index: number, childIndex: number) => {
    setLocalItems((prev) =>
      prev.map((item, i) =>
        i !== index
          ? item
          : {
              ...item,
              children: item.children?.map((c, j) => (j === childIndex ? { ...c, checked: !c.checked } : c)),
            }
      )
    );
  };

  if (localItems.length === 0) return <div className='text-text-secondary italic p-2'>Danh sách trống.</div>;

  return (
    <div className='flex flex-col gap-0.5 p-2 h-full overflow-auto content-start'>
      {localItems.map((item, idx) => {
        const state = stateOf(item);
        const children = item.children ?? [];
        const doneCount = children.filter((c) => c.checked).length;
        return (
          <div key={idx}>
            <div
              onClick={() => toggleParent(idx)}
              className='flex items-center gap-2.5 px-1.5 py-1.5 rounded-md hover:bg-muted/30 cursor-pointer select-none'
            >
              <TickBox state={state} onClick={() => toggleParent(idx)} />
              <span
                className={cn(
                  'text-sm flex-1 min-w-0 break-words transition-colors',
                  state === 'checked' ? 'text-text-secondary line-through decoration-gray-500/50' : 'text-text-primary'
                )}
              >
                {item.text}
              </span>
              {children.length > 0 && (
                <span className='shrink-0 text-[11px] tabular-nums text-text-secondary'>
                  {doneCount}/{children.length}
                </span>
              )}
            </div>
            {children.length > 0 && (
              <div className='ml-[15px] pl-4 border-l border-border/60 flex flex-col gap-0.5'>
                {children.map((child, cIdx) => (
                  <div
                    key={cIdx}
                    onClick={() => toggleChild(idx, cIdx)}
                    className='flex items-center gap-2.5 px-1.5 py-1 rounded-md hover:bg-muted/30 cursor-pointer select-none'
                  >
                    <TickBox
                      size='sm'
                      state={child.checked ? 'checked' : 'unchecked'}
                      onClick={() => toggleChild(idx, cIdx)}
                    />
                    <span
                      className={cn(
                        'text-[13px] flex-1 min-w-0 break-words transition-colors',
                        child.checked ? 'text-text-secondary line-through decoration-gray-500/50' : 'text-text-primary'
                      )}
                    >
                      {child.text}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}