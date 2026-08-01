/**
 * AgentFooterBar — spacer bar cố định ở cuối Agent panel, dành cho UI mở rộng sau này.
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