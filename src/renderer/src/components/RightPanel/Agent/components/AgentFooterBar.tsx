/**
 * ------------------------------------------------------------------
 * AgentFooterBar
 * ------------------------------------------------------------------
 * Spacer bar cố định ở cuối Agent panel, dành cho UI mở rộng sau này.
 *
 * Main features:
 * - Không có feature cụ thể — chỉ là placeholder cho UI tương lai
 * ------------------------------------------------------------------
 */

import React from 'react';

interface AgentFooterBarProps {
  className?: string;
}

export const AgentFooterBar: React.FC<AgentFooterBarProps> = ({ className = '' }) => {
  return (
    <div 
      className={`w-full h-8 shrink-0 min-h-8 ${className}`}
    />
  );
};

export default AgentFooterBar;