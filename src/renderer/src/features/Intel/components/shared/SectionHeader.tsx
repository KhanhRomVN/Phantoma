import React from 'react';

interface SectionHeaderProps {
  accent?: string;
  children: React.ReactNode;
}

export function SectionHeader({ accent = 'var(--primary)', children }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="w-1 h-4 rounded-full" style={{ backgroundColor: accent }} />
      <h3 className="text-[12px] font-bold uppercase tracking-[0.1em] text-text-primary font-mono">
        {children}
      </h3>
    </div>
  );
}