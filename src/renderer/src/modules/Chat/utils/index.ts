export const favicon = (d: string): string =>
  `https://www.google.com/s2/favicons?domain=${d}&sz=64`;

export const fmtCd = (s: number): string =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;