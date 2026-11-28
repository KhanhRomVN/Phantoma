import type { CSSProperties } from 'react';
import type { ProxyStatus } from '../../../../shared/types/proxy-domain.types';

export const TH = 'whitespace-nowrap px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-text-secondary';
export const TD = 'px-3 py-2.5 align-middle text-text-primary';
export const COLS = 11;

export const ROW_TEXTURE: Partial<Record<ProxyStatus, CSSProperties>> = {
  degraded: {
    backgroundImage: 'repeating-linear-gradient(45deg, transparent 0 7px, rgba(250,204,21,0.09) 7px 8px)',
  },
  dead: {
    backgroundImage: 'repeating-linear-gradient(135deg, transparent 0 7px, rgba(248,113,113,0.1) 7px 8px)',
  },
  testing: {
    backgroundImage: 'repeating-linear-gradient(45deg, transparent 0 7px, rgba(96,165,250,0.09) 7px 8px)',
  },
  unchecked: {
    backgroundImage: 'radial-gradient(rgba(148,163,184,0.22) 1px, transparent 1.2px)',
    backgroundSize: '9px 9px',
  },
};
