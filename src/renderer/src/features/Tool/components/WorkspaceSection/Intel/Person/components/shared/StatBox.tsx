import React from 'react';

interface StatBoxProps {
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
  onClick?: () => void;
}

export function StatBox({ label, value, sub, accent, onClick }: StatBoxProps) {
  return (
    <div
      className="bg-[#0d1017] border border-[#1c2333] rounded p-2.5 flex flex-col gap-0.5"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <span className="text-[10px] uppercase tracking-widest font-mono text-[#6a7a9a]">{label}</span>
      <span className="text-[16px] font-bold font-mono leading-none" style={{ color: accent }}>
        {value}
      </span>
      {sub && <span className="text-[9px] font-mono text-[#6a7a9a]">{sub}</span>}
    </div>
  );
}