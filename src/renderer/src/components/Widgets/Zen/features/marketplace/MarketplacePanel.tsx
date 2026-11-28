/**
 * ------------------------------------------------------------------
 * MarketplacePanel
 * ------------------------------------------------------------------
 * Shell của Marketplace: overlay, header, tab SKILL / MCP.
 * Không gọi IPC và không điều phối workflow (xem components/SkillPanel).
 * ------------------------------------------------------------------
 */

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { SkillPanel } from './components/SkillPanel';
import { MCPPanel } from './components/MCPPanel';
import { $ } from '@renderer/utils/color';
import AgentNavBadge, { NavTarget } from '../../shared/components/AgentNavBadge';

interface MarketplacePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (target: NavTarget) => void;
}

const TABS = ['SKILL', 'MCP'] as const;
type MarketplaceTab = (typeof TABS)[number];

const MarketplacePanel: React.FC<MarketplacePanelProps> = ({ isOpen, onClose, onNavigate }) => {
  const [closeHover, setCloseHover] = useState(false);
  const [activeTab, setActiveTab] = useState<MarketplaceTab>('SKILL');

  if (!isOpen) return null;

  const borderColor = $('--border');
  const secondaryBg = $('--background'); // Using main background as surface for full-screen overlay

  const textPrimary = $('--text-primary');
  const textSecondary = $('--text-secondary');
  const primaryColor = $('--primary');
  const errorColor = $('--error');

  return (
    <div
      className="absolute inset-0 w-full h-full z-[1000] flex flex-col"
      style={{
        borderTop: `1px solid ${borderColor}`,
        backgroundColor: secondaryBg,
      }}
    >
      {/* Header */}
      <div className="w-full max-w-[680px] mx-auto box-border px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <div className="mb-1">
                <span className="font-bold text-base tracking-wide" style={{ color: textPrimary }}>
                  Marketplace
                </span>
              </div>
              <p className="m-0 text-sm opacity-70 leading-snug" style={{ color: textSecondary }}>
                Install skills and MCP servers
              </p>
              <AgentNavBadge className="mt-2" current="marketplace" onSelect={onNavigate} />
            </div>
          </div>
          <button
            onClick={onClose}
            onMouseEnter={() => setCloseHover(true)}
            onMouseLeave={() => setCloseHover(false)}
            className="p-1.5 rounded-md shrink-0 border-none cursor-pointer transition-all duration-150 flex items-center justify-center"
            style={{
              backgroundColor: closeHover
                ? `color-mix(in srgb, ${errorColor} 12%, transparent)`
                : `color-mix(in srgb, ${textSecondary} 10%, transparent)`,
              color: closeHover ? errorColor : textSecondary,
            }}
            title="Close Marketplace"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Tabbar */}
      <div
        role="tablist"
        className="flex items-center gap-1 px-[max(16px,calc((100%-680px)/2+16px))] border-b shrink-0"
        style={{ borderBottomColor: borderColor }}
      >
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className="px-3 py-2.5 text-sm cursor-pointer select-none transition-all duration-150 bg-transparent border-none"
            style={{
              fontWeight: activeTab === tab ? 600 : 400,
              color: activeTab === tab ? textPrimary : textSecondary,
              borderBottom:
                activeTab === tab ? `2px solid ${primaryColor}` : '2px solid transparent',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 w-full max-w-[680px] mx-auto overflow-hidden flex flex-col">
        {activeTab === 'SKILL' && <SkillPanel />}
        {activeTab === 'MCP' && <MCPPanel />}
      </div>
    </div>
  );
};

export default MarketplacePanel;
