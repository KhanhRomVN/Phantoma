import { useState, useMemo, useRef, useLayoutEffect, useCallback } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import type { TableData } from '../types';
import { cn } from '@renderer/shared/utils/cn';
import { withAlpha } from '../../targetType';
import { resolveColor } from '../../../constants/colors';

interface Props {
  data: TableData;
  /** Từ khoá lọc; ô tìm kiếm nằm ở header của SectionBox. */
  filterText?: string;
}

const MIN_COL_WIDTH = 64; // px — sàn cho cột bị thiếu width
const SORT_ARROW_WIDTH = 16; // px — chừa chỗ mũi tên sort ở header của cột sort được
const NUMERIC_RE = /^-?\d+(\.\d+)?$/;

/**
 * Phân chia width cột thông minh.
 * - Tổng width tự nhiên <= width khả dụng: mọi cột vừa khít, phần dư dồn vào cột rộng nhất.
 * - Ngược lại: cột nào có width tự nhiên <= phần chia đều thì thu hẹp đúng bằng nội dung;
 *   phần còn lại chia đều cho các cột thiếu width (lặp đến khi ổn định).
 */
function distributeWidths(natural: number[], available: number): number[] {
  const count = natural.length;
  if (count === 0 || available <= 0) return natural;

  const total = natural.reduce((a, b) => a + b, 0);
  if (total <= available) {
    const widest = natural.indexOf(Math.max(...natural));
    return natural.map((w, i) => (i === widest ? w + (available - total) : w));
  }

  const result = [...natural];
  let flex = natural.map((_, i) => i);
  let remaining = available;

  while (flex.length > 0) {
    const share = remaining / flex.length;
    const fit = flex.filter((i) => natural[i] <= share);
    if (fit.length === 0) {
      for (const i of flex) result[i] = Math.max(MIN_COL_WIDTH, Math.floor(share));
      break;
    }
    for (const i of fit) {
      result[i] = natural[i];
      remaining -= natural[i];
    }
    flex = flex.filter((i) => !fit.includes(i));
  }
  return result;
}

/** So sánh hai giá trị ô: cột percent hoặc cả hai đều là số thì so số, còn lại so chuỗi kiểu số tự nhiên (S-2 trước S-10). */
function compareCells(a: string, b: string, type?: string): number {
  const numeric = type === 'percent' || (NUMERIC_RE.test(a.trim()) && NUMERIC_RE.test(b.trim()));
  if (numeric) {
    const na = parseFloat(a);
    const nb = parseFloat(b);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
  }
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

export default function Table({ data, filterText = '' }: Props) {
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [colWidths, setColWidths] = useState<number[] | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLTableElement>(null);
  const columnCount = data.headers.length;
  const canSort = (i: number): boolean => data.columnSortable?.[i] === true;

  const measure = useCallback(() => {
    const root = measureRef.current;
    const box = scrollRef.current;
    if (!root || !box) return;
    const natural: number[] = new Array(columnCount).fill(0);
    root.querySelectorAll('tr').forEach((tr) => {
      tr.querySelectorAll('th,td').forEach((cell, i) => {
        // +2px dư an toàn: tránh sai số làm tròn khiến ô rộng nhất bị cắt '...'
        if (i < columnCount) natural[i] = Math.max(natural[i], Math.ceil((cell as HTMLElement).getBoundingClientRect().width) + 2);
      });
    });
    const next = distributeWidths(natural, box.clientWidth);
    setColWidths((prev) => (prev && prev.length === next.length && prev.every((w, i) => w === next[i]) ? prev : next));
  }, [columnCount]);

  // Đo trên toàn bộ dữ liệu (không phụ thuộc filter) để width không nhảy khi gõ tìm kiếm.
  useLayoutEffect(() => {
    measure();
    const box = scrollRef.current;
    if (!box) return;
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [measure, data]);

  const processed = useMemo(() => {
    let items = data.rows.map((row, idx) => ({ row, idx }));

    const lower = filterText.trim().toLowerCase();
    if (lower) {
      items = items.filter(({ row }) => row.some((cell) => cell.toString().toLowerCase().includes(lower)));
    }

    if (sortCol !== null && data.columnSortable?.[sortCol]) {
      const type = data.columnTypes[sortCol];
      items.sort((a, b) => {
        const cmp = compareCells(a.row[sortCol]?.toString() ?? '', b.row[sortCol]?.toString() ?? '', type);
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }

    return items;
  }, [data.rows, data.columnSortable, data.columnTypes, sortCol, sortDir, filterText]);

  const handleHeaderClick = (colIdx: number) => {
    if (!canSort(colIdx)) return;
    // Vòng lặp: mặc định -> tăng dần (xanh) -> giảm dần (đỏ) -> mặc định
    if (sortCol !== colIdx) {
      setSortCol(colIdx);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else {
      setSortCol(null);
    }
  };

  return (
    <div className="relative h-full overflow-hidden">
      {/* Bảng đo ẩn: render nowrap để lấy width tự nhiên của từng cột (bị clip bởi overflow-hidden) */}
      <table
        ref={measureRef}
        aria-hidden
        className="absolute left-0 top-0 invisible pointer-events-none text-sm border-collapse"
        style={{ width: 'max-content' }}
      >
        <thead>
          <tr>
            {data.headers.map((header, idx) => (
              <th key={idx} className="px-3 py-2 font-semibold whitespace-nowrap text-left">
                {header}
                {canSort(idx) && <span className="inline-block" style={{ width: SORT_ARROW_WIDTH }} />}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, rIdx) => (
            <tr key={rIdx}>
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="px-3 py-2 text-left">
                  <CellRenderer value={cell} type={data.columnTypes[cIdx]} colorId={data.cellColors?.[rIdx]?.[cIdx]} expanded={false} measure />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div ref={scrollRef} className="h-full overflow-auto">
        <table className="w-full table-fixed text-sm border-collapse">
          {colWidths && (
            <colgroup>
              {colWidths.map((w, i) => (
                <col key={i} style={{ width: `${w}px` }} />
              ))}
            </colgroup>
          )}
          <thead className="sticky top-0 bg-background z-10 shadow-md">
            <tr>
              {data.headers.map((header, idx) => {
                const sortableCol = canSort(idx);
                const active = sortableCol && sortCol === idx;
                return (
                  <th
                    key={idx}
                    onClick={() => handleHeaderClick(idx)}
                    aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={cn(
                      'px-3 py-2 text-left font-semibold text-text-secondary border-b border-border whitespace-nowrap overflow-hidden text-ellipsis',
                      sortableCol && 'cursor-pointer select-none hover:bg-muted/50 transition-colors',
                      active && 'text-blue-400'
                    )}
                  >
                    {header}
                    {sortableCol && (
                      active ? (
                        sortDir === 'asc' ? (
                          <ArrowUp className="inline-block w-3 h-3 ml-1 align-middle" style={{ color: resolveColor('green') }} />
                        ) : (
                          <ArrowDown className="inline-block w-3 h-3 ml-1 align-middle" style={{ color: resolveColor('red') }} />
                        )
                      ) : (
                        <ArrowUpDown className="inline-block w-3 h-3 ml-1 align-middle opacity-40" />
                      )
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {processed.length === 0 ? (
              <tr>
                <td colSpan={data.headers.length} className="px-3 py-4 text-left text-text-secondary italic">
                  Không tìm thấy dữ liệu phù hợp.
                </td>
              </tr>
            ) : (
              processed.map(({ row, idx }) => {
                const expanded = expandedIdx === idx;
                return (
                  <tr
                    key={idx}
                    onClick={() => setExpandedIdx(expanded ? null : idx)}
                    className={cn(
                      'cursor-pointer hover:bg-muted/30 transition-colors border-b border-border/20 last:border-0',
                      expanded && 'bg-muted/20'
                    )}
                  >
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3 py-2 align-top text-left overflow-hidden">
                        <CellRenderer
                          value={cell}
                          type={data.columnTypes[cIdx]}
                          colorId={data.cellColors?.[idx]?.[cIdx]}
                          expanded={expanded}
                        />
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CellRenderer({
  value,
  type,
  colorId,
  expanded,
  measure = false,
}: {
  value: string;
  type?: string;
  colorId?: string;
  expanded: boolean;
  /** true: render nowrap, không cắt, để đo width tự nhiên. */
  measure?: boolean;
}) {
  // measure: không cắt; expanded: ngắt dòng; còn lại: cắt bằng '...'
  const textClass = measure ? 'whitespace-nowrap' : expanded ? 'whitespace-normal break-words' : 'block truncate';

  switch (type) {
    case 'badge': {
      const hex = resolveColor(colorId) ?? resolveColor('gray')!;
      return (
        <span
          className={cn(
            'inline-block max-w-full px-1.5 py-0.5 rounded text-xs font-medium',
            measure ? 'whitespace-nowrap' : expanded ? 'whitespace-normal break-words' : 'truncate align-top'
          )}
          style={{ backgroundColor: withAlpha(hex, 0.15), color: hex }}
        >
          {value}
        </span>
      );
    }
    case 'percent': {
      const pct = Math.round(parseFloat(value) * 100);
      if (isNaN(pct)) return <span className={textClass}>{value}</span>;
      const autoId = pct >= 75 ? 'green' : pct >= 50 ? 'yellow' : 'red';
      const hex = resolveColor(colorId) ?? resolveColor(autoId);
      return (
        <span className={cn('text-xs font-mono font-semibold', measure ? 'whitespace-nowrap' : 'block truncate')} style={{ color: hex }}>
          {pct}%
        </span>
      );
    }
    case 'mono':
      return <code className={cn('font-mono text-xs bg-black/20 px-1 rounded', textClass)}>{value}</code>;
    case 'date':
      return <span className={cn('text-gray-400', textClass)}>{value}</span>;
    default:
      return <span className={textClass}>{value}</span>;
  }
}