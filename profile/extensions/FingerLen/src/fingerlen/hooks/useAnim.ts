import { useEffect, useState } from 'react';

/** Trả về giá trị 0→1 (easeOutCubic, 900ms) khi `on` = true; về 0 khi false. */
export function useAnim(on: boolean): number {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!on) {
      setT(0);
      return;
    }
    let raf = 0;
    let t0: number | undefined;
    const f = (ts: number) => {
      t0 = t0 ?? ts;
      const p = Math.min(1, (ts - t0) / 900);
      setT(1 - Math.pow(1 - p, 3));
      if (p < 1) raf = requestAnimationFrame(f);
    };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [on]);
  return t;
}
