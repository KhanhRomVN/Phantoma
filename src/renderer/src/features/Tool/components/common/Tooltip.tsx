import React from 'react';

export interface TooltipState {
  text: string;
  x: number;
  y: number;
}

interface TooltipProps {
  tooltip: TooltipState | null;
  accentColor: string;
}

const Tooltip: React.FC<TooltipProps> = ({ tooltip }) => {
  if (!tooltip) return null;

  return (
    <div
      className="fixed z-[1000] max-w-[280px] pointer-events-none whitespace-normal font-inherit bg-tooltip-background text-text-primary text-[11px] px-3 py-1.5 rounded shadow-lg border border-border"
      style={{
        top: tooltip.y,
        left: tooltip.x,
      }}
    >
      {tooltip.text}
    </div>
  );
};

export default Tooltip;
