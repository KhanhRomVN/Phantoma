import { flag } from '../../utils/format';

export function FlagBadge({ code, city }: { code: string; city?: string }) {
  return (
    <span className='inline-flex items-center gap-1.5'>
      <span className='flex h-5 w-5 items-center justify-center rounded-md bg-text-secondary/10 text-[13px] leading-none'>
        {flag(code)}
      </span>
      {city && <span className='truncate text-text-primary'>{city}</span>}
    </span>
  );
}
