import React from 'react';

export interface ExportButtonConfig {
  label: string;
  onClick: () => void;
  title?: string;
  icon?: string;
}

interface ExportButtonsProps {
  buttons: ExportButtonConfig[];
  accentColor: string;
}

const ExportButtons: React.FC<ExportButtonsProps> = ({ buttons, accentColor }) => {
  const buttonStyle = {
    background: 'rgb(var(--card-background))',
    border: `1px solid ${accentColor}30`,
    color: accentColor,
  };

  return (
    <div className="flex gap-2">
      {buttons.map((btn, idx) => (
        <button
          key={idx}
          onClick={btn.onClick}
          className="px-3 py-1.5 rounded text-[11px] font-bold font-inherit cursor-pointer transition-all hover:opacity-80"
          style={buttonStyle}
          title={btn.title}
        >
          {btn.icon && <span className="mr-1">{btn.icon}</span>}
          {btn.label}
        </button>
      ))}
    </div>
  );
};

export default ExportButtons;