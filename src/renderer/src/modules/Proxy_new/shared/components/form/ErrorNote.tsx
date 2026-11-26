import type { ReactNode } from 'react';

export function ErrorNote({ children }: { children: ReactNode }) {
  return <p className='rounded-md bg-error/10 px-3 py-2 text-[11px] leading-relaxed text-error'>{children}</p>;
}
