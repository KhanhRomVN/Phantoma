/**
 * ------------------------------------------------------------------
 * AgentNavBadge
 * ------------------------------------------------------------------
 * Cụm icon điều hướng nhanh tới Account / History / Marketplace / Setting.
 * Thay cho topBar (PageHeader) khi AgentPanel KHÔNG nằm trong CodeAgent.tsx.
 * Cố tình không có icon Chat/Home: Chat chỉ vào được qua Home (gửi message
 * hoặc chọn conversation từ History).
 *
 * Main features:
 * - variant "overlay": badge nổi cố định góc phải trên cùng (dùng ở Home)
 * - variant "inline" : hàng icon nằm trong header (dùng ở Chat)
 * ------------------------------------------------------------------
 */

import React from 'react';
import { Clock, Settings, Store, User } from 'lucide-react';
import { cn } from '@renderer/shared/utils/cn';

export type NavTarget = 'account' | 'history' | 'marketplace' | 'setting';

const NAV_ITEMS: { id: NavTarget; label: string; icon: typeof User; color: string }[] = [
  { id: 'account', label: 'Account', icon: User, color: 'text-blue-400' },
  { id: 'history', label: 'History', icon: Clock, color: 'text-amber-400' },
  { id: 'marketplace', label: 'Marketplace', icon: Store, color: 'text-pink-400' },
  { id: 'setting', label: 'Setting', icon: Settings, color: 'text-emerald-400' },
];

interface AgentNavBadgeProps {
  onSelect: (target: NavTarget) => void;
  variant?: 'overlay' | 'inline';
}

const AgentNavBadge: React.FC<AgentNavBadgeProps> = ({ onSelect, variant = 'inline' }) => (
  <div
    className={cn(
      'flex items-center gap-0.5 shrink-0',
      variant === 'overlay' &&
        'absolute top-2 right-2 z-20 px-1 py-0.5 rounded-lg border border-border bg-background/80 backdrop-blur-sm',
    )}
  >
    {NAV_ITEMS.map(({ id, label, icon: Icon, color }) => (
      <button
        key={id}
        title={label}
        onClick={() => onSelect(id)}
        className="w-6 h-6 p-0 flex items-center justify-center rounded cursor-pointer bg-transparent border-none outline-none opacity-70 hover:opacity-100 hover:bg-sidebar-item-hover transition-opacity"
      >
        <Icon className={cn('w-3.5 h-3.5', color)} />
      </button>
    ))}
  </div>
);

export default AgentNavBadge;