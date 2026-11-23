import type { ReactNode } from 'react';
import { Check } from 'lucide-react';

// ─── Small UI helpers ───────────────────────────────────────────────────

export const MenuLabel = ({ children }: { children: ReactNode }) => (
  <div className="px-3 pt-1.5 pb-1 text-[10.5px] text-text-secondary/50">{children}</div>
);

/** Fixed-width check column (+ optional leading icon) used as DropdownItem icon */
export const ck = (checked: boolean, extra?: ReactNode) => (
  <span className="flex items-center gap-2">
    <span className="w-3.5 h-3.5 flex items-center justify-center text-[#ff6a1f]">
      {checked && <Check className="w-3.5 h-3.5" />}
    </span>
    {extra}
  </span>
);
