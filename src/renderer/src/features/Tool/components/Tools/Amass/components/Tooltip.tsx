import React from 'react';
import { TooltipState } from '../types';

interface TooltipProps {
  tooltip: TooltipState | null;
  accentColor: string;
}

const Tooltip: React.FC<TooltipProps> = ({ tooltip, accentColor }) => {
  if (!tooltip) return null;

  return (
    <div
      className="fixed z-[1000] max-w-[280px] pointer-events-none whitespace-normal font-inherit"
      style={{
        top: tooltip.y,
        left: tooltip.x,
        background: 'rgb(var(--card-background))',
        color: 'rgb(var(--text-primary))',
        fontSize: 11,
        padding: '6px 12px',
        borderRadius: 4,
        border: `1px solid ${accentColor}50`,
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
      }}
    >
      {tooltip.text}
    </div>
  );
};

export default Tooltip;