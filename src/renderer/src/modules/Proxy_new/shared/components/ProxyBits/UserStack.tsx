import { hueOf } from '../../utils/color';

export function UserStack({ names, max = 3 }: { names: string[]; max?: number }) {
  if (names.length === 0) return <span className='text-text-secondary/60'>—</span>;
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  return (
    <div className='flex items-center'>
      {shown.map((n, i) => {
        const hue = hueOf(n);
        return (
          <span
            key={n}
            title={n}
            style={{
              marginLeft: i === 0 ? 0 : -6,
              background: `linear-gradient(135deg, hsl(${hue} 65% 52%), hsl(${(hue + 40) % 360} 60% 40%))`,
            }}
            className='flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-semibold text-white ring-2 ring-card-background'
          >
            {n.charAt(0).toUpperCase()}
          </span>
        );
      })}
      {rest > 0 && <span className='ml-1.5 text-[10px] text-text-secondary'>+{rest}</span>}
    </div>
  );
}
