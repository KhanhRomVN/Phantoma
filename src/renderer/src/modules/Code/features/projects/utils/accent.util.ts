import { useMemo } from 'react';

export const ACCENT_PALETTE = [
  '#ff6a1f',
  '#a078ff',
  '#3ddc84',
  '#4fa8e0',
  '#ffb020',
  '#ff78aa',
  '#32c8be',
];

export function useAccentColors() {
  return useMemo(() => ({ accentColors: ACCENT_PALETTE }), []);
}