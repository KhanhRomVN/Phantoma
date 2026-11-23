const toParts = (v: string): number[] => v.split(/[.-]/).map(Number);

export function compareVersions(a: string, b: string): number {
  const pa = toParts(a);
  const pb = toParts(b);
  const len = pa.length === pb.length ? pa.length : Math.min(pa.length, pb.length, 4);
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
