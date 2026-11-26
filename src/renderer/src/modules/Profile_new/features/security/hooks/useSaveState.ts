import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@renderer/utils/cn';

export type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

export function saveOutlineClass(status: SaveStatus): string {
  return cn(
    'outline outline-1 -outline-offset-1 outline-dashed transition-[outline-color]',
    status === 'success' && 'outline-success',
    status === 'error' && 'outline-error',
    status !== 'success' && status !== 'error' && 'outline-transparent',
  );
}

export function useSaveState(successMs = 1800) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(timer.current);
    };
  }, []);

  const reset = useCallback((): void => {
    clearTimeout(timer.current);
    setStatus('idle');
    setError(null);
  }, []);

  const run = useCallback(
    async (task: () => Promise<void>): Promise<boolean> => {
      clearTimeout(timer.current);
      setStatus('saving');
      setError(null);
      try {
        await task();
        if (mounted.current) {
          setStatus('success');
          timer.current = setTimeout(() => setStatus('idle'), successMs);
        }
        return true;
      } catch (e) {
        if (mounted.current) {
          setStatus('error');
          setError(e instanceof Error ? e.message : String(e));
        }
        return false;
      }
    },
    [successMs],
  );

  return { status, error, saving: status === 'saving', run, reset };
}