export const normalize = (p: string): string => p.trim().replace(/[\\/]+$/, '');

export const baseName = (p: string): string => normalize(p).split(/[\\/]/).pop() ?? '';
