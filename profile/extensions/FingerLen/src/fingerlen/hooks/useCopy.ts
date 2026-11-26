import { useEffect, useRef, useState } from 'react';

export type CopyFn = (key: string, value: unknown) => void;

export function useCopy() {
  const [key, setKey] = useState<string | null>(null);
  const tm = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(tm.current), []);
  const copy: CopyFn = (k, value) => {
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    try { navigator.clipboard?.writeText(text)?.catch(() => {}); } catch { /* bỏ qua */ }
    setKey(k);
    clearTimeout(tm.current);
    tm.current = setTimeout(() => setKey(null), 1400);
  };
  return { copied: key, copy };
}