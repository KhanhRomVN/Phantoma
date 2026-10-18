import React, { useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import {
  GROUP_ICONS,
  GROUP_ICON_NAMES,
  getGroupIcon,
} from "./iconLibrary";
import { $ } from '@renderer/utils/color';

interface IconPickerProps {
  value?: string;
  /** Màu accent đang chọn — icon dùng tông tối hơn của màu này. */
  color?: string;
  onChange: (iconName: string) => void;
}

/**
 * Nút chọn icon — chỉ hiển thị icon hiện tại (không text). Khi mở,
 * dropdown có searchbar lọc và grid ~8 cột, mỗi icon hover hiện tooltip
 * tên icon ngay lập tức.
 */
export function IconPicker({ value, color, onChange }: IconPickerProps) {
  const tone = color
    ? `color-mix(in srgb, ${color} 65%, black)`
    : $('--text-primary');
  
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hoveredIcon, setHoveredIcon] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const gridRef = useRef<HTMLDivElement>(null);

  const CurrentIcon = getGroupIcon(value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return GROUP_ICON_NAMES;
    return GROUP_ICON_NAMES.filter((n) => n.toLowerCase().includes(q));
  }, [query]);

  const handleIconEnter = (
    e: React.MouseEvent<HTMLButtonElement>,
    name: string,
  ) => {
    const btnRect = e.currentTarget.getBoundingClientRect();
    const gridRect = gridRef.current?.getBoundingClientRect();
    if (!gridRect) return;
    setTooltipPos({
      x: btnRect.left + btnRect.width / 2 - gridRect.left,
      y: btnRect.top - gridRect.top - 6,
    });
    setHoveredIcon(name);
  };

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Choose icon"
        className="flex items-center justify-center p-2 rounded-lg border-none cursor-pointer h-[34px] transition-colors duration-130"
        style={{
          backgroundColor: color
            ? `color-mix(in srgb, ${color} 16%, transparent)`
            : $('--input-background'),
          color: tone,
        }}
      >
        <CurrentIcon size={16} />
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[10002]"
          />
          <div
            className="absolute top-full left-0 w-[260px] z-[10003] mt-1 rounded-lg shadow-lg flex flex-col overflow-hidden"
            style={{
              backgroundColor: $('--dropdown-background'),
              border: `1px solid ${$('--border')}`,
            }}
          >
            {/* Search */}
            <div
              className="relative p-2 border-b flex-shrink-0"
              style={{ borderColor: $('--border') }}
            >
              <Search
                size={13}
                className="absolute left-[18px] top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: $('--text-secondary') }}
              />
              <input
                autoFocus
                type="text"
                placeholder="Search icons..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full px-2 py-1.5 pl-7 text-xs rounded-md outline-none box-border"
                style={{
                  backgroundColor: $('--input-background'),
                  color: $('--text-primary'),
                  border: 'none'
                }}
              />
            </div>

            {/* Grid + fast tooltip */}
            <div className="relative">
              <div
                ref={gridRef}
                className="relative grid grid-cols-8 gap-0.5 p-2 max-h-[200px] overflow-y-auto"
              >
                {filtered.map((name) => {
                  const Icon = GROUP_ICONS[name];
                  const selected = name === value;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        onChange(name);
                        setOpen(false);
                      }}
                      onMouseEnter={(e) => handleIconEnter(e, name)}
                      onMouseLeave={() => setHoveredIcon(null)}
                      className="flex items-center justify-center p-1.5 rounded-md border-none cursor-pointer transition-colors"
                      style={{
                        backgroundColor: selected
                          ? `color-mix(in srgb, ${color ?? $('--primary')} 25%, transparent)`
                          : 'transparent',
                        color: selected ? tone : $('--text-primary'),
                      }}
                    >
                      <Icon size={16} />
                    </button>
                  );
                })}
                {filtered.length === 0 && (
                  <div
                    className="col-span-8 text-center py-3 text-[11px]"
                    style={{ color: $('--text-secondary') }}
                  >
                    No icons found
                  </div>
                )}
              </div>

              {/* Fast tooltip */}
              {hoveredIcon && (
                <div
                  className="absolute px-2 py-1 rounded text-[11px] whitespace-nowrap pointer-events-none z-10 shadow-md"
                  style={{
                    left: tooltipPos.x,
                    top: tooltipPos.y,
                    transform: 'translate(-50%, -100%)',
                    backgroundColor: $('--tooltip-background'),
                    border: `1px solid ${$('--border')}`,
                    color: $('--text-primary'),
                  }}
                >
                  {hoveredIcon}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}