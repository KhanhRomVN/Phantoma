import { Plus, ServerOff } from 'lucide-react';
import { COLS } from './proxy-table.styles';

interface ProxyTableEmptyProps {
  filteredOut: boolean;
  onClearFilters?: () => void;
  onAdd?: () => void;
}

export function ProxyTableEmpty({ filteredOut, onClearFilters, onAdd }: ProxyTableEmptyProps) {
  return (
    <tr>
      <td colSpan={COLS} className='align-middle'>
        <div className='flex flex-col items-center gap-3 py-16 text-center'>
          <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-text-secondary/10 text-text-secondary'>
            <ServerOff className='h-5 w-5' />
          </div>
          <div>
            <div className='text-sm font-medium text-text-primary'>
              {filteredOut ? 'No proxies match your filters' : 'No proxies yet'}
            </div>
            <div className='mt-1 max-w-[420px] text-xs text-text-secondary'>
              {filteredOut
                ? 'Try loosening or clearing the filters.'
                : 'Add a proxy or import a list to get started.'}
            </div>
          </div>
          {filteredOut ? (
            <button
              type='button'
              onClick={onClearFilters}
              className='h-8 rounded-md bg-text-secondary/10 px-3 text-xs font-medium text-text-secondary hover:bg-text-secondary/15 hover:text-text-primary'
            >
              Clear filters
            </button>
          ) : (
            <button
              type='button'
              onClick={onAdd}
              className='flex h-8 items-center gap-1.5 rounded-md bg-primary/10 px-3 text-xs font-medium text-primary hover:bg-primary/20 active:bg-primary/30'
            >
              <Plus className='h-3.5 w-3.5' />
              Add proxy
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
