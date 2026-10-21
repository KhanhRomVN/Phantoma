/**
 * ------------------------------------------------------------------
 * AgentNavBadge
 * ------------------------------------------------------------------
 * Hàng badge (pill) điều hướng nhanh tới Account / History / Marketplace /
 * Setting, cùng kiểu với status badge ở Account. Mục hiện tại được highlight
 * và không bấm được.
 * Cố tình không có Chat/Home: Chat chỉ vào được qua Home (gửi message hoặc
 * chọn conversation từ History).
 *
 * Main features:
 * - NAV_ITEMS: danh sách mục điều hướng dùng chung (Chat dropdown cũng dùng)
 * - AgentNavBadge: hàng pill dùng ở Home và header các panel
 * ------------------------------------------------------------------
 */

import React, { useState } from 'react';
import { Clock, Settings, Store, User } from 'lucide-react';
import { $ } from '@renderer/utils/color';
import { cn } from '@renderer/shared/utils/cn';

export type NavTarget = 'account' | 'history' | 'marketplace' | 'setting';

export const NAV_ITEMS: { id: NavTarget; label: string; icon: typeof User; color: string }[] = [
  { id: 'account', label: 'Account', icon: User, color: 'text-blue-400' },
  { id: 'history', label: 'History', icon: Clock, color: 'text-amber-400' },
  { id: 'marketplace', label: 'Marketplace', icon: Store, color: 'text-pink-400' },
  { id: 'setting', label: 'Setting', icon: Settings, color: 'text-emerald-400' },
];

interface NavPillProps {
  item: (typeof NAV_ITEMS)[number];
  isCurrent: boolean;
  onSelect: (target: NavTarget) => void;
}

const NavPill: React.FC<NavPillProps> = ({ item, isCurrent, onSelect }) => {
  const [hovered, setHovered] = useState(false);
  const Icon = item.icon;
  const highlighted = isCurrent || hovered;
  const accent = $('--text-secondary');
  return (
    <button
      type="button"
      onClick={() => !isCurrent && onSelect(item.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border-none transition-colors"
      style={{
        backgroundColor: highlighted
          ? `color-mix(in srgb, ${accent} 20%, transparent)`
          : $('--input-background'),
        color: accent,
        cursor: isCurrent ? 'default' : 'pointer',
      }}
    >
      <Icon size={12} className={item.color} />
      {item.label}
    </button>
  );
};

interface AgentNavBadgeProps {
  onSelect: (target: NavTarget) => void;
  current?: NavTarget;
  className?: string;
}

const AgentNavBadge: React.FC<AgentNavBadgeProps> = ({ onSelect, current, className }) => (
  <div className={cn('flex items-center gap-1.5 flex-wrap', className)}>
    {NAV_ITEMS.map((item) => (
      <NavPill key={item.id} item={item} isCurrent={item.id === current} onSelect={onSelect} />
    ))}
  </div>
);

export default AgentNavBadge;