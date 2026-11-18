import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface SectionProps {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  right?: ReactNode;
}

export function Section({ title, icon: Icon, children, right }: SectionProps) {
  return (
    <div className="rounded-lg p-3 bg-card-background border border-border">
      <div className="flex items-center gap-1.5 mb-2.5 text-[12px] font-semibold text-text-primary">
        <Icon size={13} className="text-primary" />
        {title}
        <span className="ml-auto">{right}</span>
      </div>
      {children}
    </div>
  );
}