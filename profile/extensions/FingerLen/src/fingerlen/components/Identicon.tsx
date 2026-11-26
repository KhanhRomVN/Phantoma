import { hue } from '../utils/format';

/** Identicon 5x5 đối xứng, sinh từ 8 ký tự hex đầu của hash hoặc seed. */
export function Identicon({ hash, seed, size = 32 }: { hash?: string; seed?: string; size?: number }) {
  const h = hash || seed || '';
  const bits = parseInt(h.slice(0, 8).padEnd(8, '0'), 16) || 0;
  const g = Math.round(size * 0.62), c = g / 5;
  const cells: JSX.Element[] = [];
  for (let r = 0; r < 5; r++) for (let q = 0; q < 3; q++) if ((bits >>> (r * 3 + q)) & 1) {
    cells.push(<rect key={`${r}-${q}`} x={q * c} y={r * c} width={c} height={c} rx={c * 0.18} />);
    if (q < 2) cells.push(<rect key={`${r}-${4 - q}`} x={(4 - q) * c} y={r * c} width={c} height={c} rx={c * 0.18} />);
  }
  return (
    <span className="idi" style={{ '--h': hue(h), '--s': `${size}px` } as React.CSSProperties}>
      <svg width={g} height={g} viewBox={`0 0 ${g} ${g}`} style={{ fill: 'var(--h)' }} aria-hidden="true">{cells}</svg>
    </span>
  );
}