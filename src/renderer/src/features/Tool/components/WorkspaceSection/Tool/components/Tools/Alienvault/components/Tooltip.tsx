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
      style={{
        position: 'fixed',
        top: tooltip.y,
        left: tooltip.x,
        background: '#1a2236',
        color: '#cbd5e1',
        fontSize: 11,
        padding: '6px 12px',
        borderRadius: 4,
        border: `1px solid ${accentColor}50`,
        boxShadow: `0 4px 12px rgba(0,0,0,0.4)`,
        zIndex: 1000,
        maxWidth: 280,
        pointerEvents: 'none',
        whiteSpace: 'normal',
        fontFamily: 'inherit',
      }}
    >
      {tooltip.text}
    </div>
  );
};

export default Tooltip;