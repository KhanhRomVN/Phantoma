/**
 * ------------------------------------------------------------------
 * NavPanelHeader
 * ------------------------------------------------------------------
 * Header tùy biến dùng chung cho các panel Account / History / Setting
 * (thay cho DrawerHeader): tiêu đề, mô tả, nút đóng và hàng badge điều hướng.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { X } from 'lucide-react';
import AgentNavBadge, { type NavTarget } from './AgentNavBadge';

interface NavPanelHeaderProps {
  title: string;
  description: string;
  current: NavTarget;
  onNavigate: (target: NavTarget) => void;
  onClose: () => void;
  maxWidth?: number;
}

const NavPanelHeader: React.FC<NavPanelHeaderProps> = ({
  title,
  description,
  current,
  onNavigate,
  onClose,
  maxWidth,
}) => (
  <div
    className="px-4 pt-3 pb-2.5 shrink-0 flex flex-col gap-2"
    style={maxWidth ? { width: '100%', maxWidth, marginInline: 'auto', boxSizing: 'border-box' } : undefined}
  >
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h3 className="m-0 text-base font-bold tracking-wide text-text-primary">{title}</h3>
        <p className="m-0 mt-0.5 text-xs text-text-secondary opacity-70 truncate">{description}</p>
      </div>
      <button
        onClick={onClose}
        className="p-1.5 rounded-lg border-none bg-text-primary/10 cursor-pointer text-text-secondary hover:bg-error/15 hover:text-error transition-all shrink-0"
        title={`Close ${title}`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
    <AgentNavBadge current={current} onSelect={onNavigate} />
  </div>
);

export default NavPanelHeader;