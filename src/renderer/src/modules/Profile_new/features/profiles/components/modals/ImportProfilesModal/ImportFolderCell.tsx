import { ArrowRight } from 'lucide-react';
import { PreviewRow } from './import-profiles.types';

export function FolderCell({ row }: { row: PreviewRow }) {
  const old = row.folder ?? '-';
  if (!row.nextFolder || row.nextFolder === old) {
    return <span className='block truncate font-mono text-[11px] text-text-secondary'>{old}</span>;
  }
  return (
    <span className='flex items-center gap-1.5 font-mono text-[11px]' title={`${old} -> ${row.nextFolder}`}>
      <span className='truncate text-text-secondary line-through'>{old}</span>
      <ArrowRight className='h-3 w-3 shrink-0 text-text-secondary' />
      <span className='truncate text-text-primary'>{row.nextFolder}</span>
    </span>
  );
}
