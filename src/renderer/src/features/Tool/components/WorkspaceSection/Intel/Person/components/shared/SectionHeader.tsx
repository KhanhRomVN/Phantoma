import React from 'react';

interface SectionHeaderProps {
  accent?: string;
  children: React.ReactNode;
  subtitle?: string;
}

export function SectionHeader({ accent = '#0af', children, subtitle }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="w-1 h-4 rounded-full shrink-0" style={{ backgroundColor: accent }} />
      <div className="flex flex-col">
        <h3 className="text-[12px] font-bold uppercase tracking-[0.1em] text-[#c8d6f0] font-mono">
          {children}
        </h3>
        {subtitle && (
          <span className="text-[10px] font-mono text-[#6a7a9a]">{subtitle}</span>
        )}
      </div>
    </div>
  );
}