import React from 'react';

interface AgentFooterBarProps {
  className?: string;
}

export const AgentFooterBar: React.FC<AgentFooterBarProps> = ({ className = '' }) => {
  return (
    <div 
      className={`w-full h-8 shrink-0 ${className}`}
      style={{ minHeight: '32px' }}
    />
  );
};

export default AgentFooterBar;