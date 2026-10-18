import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import './WelcomeScreen.css';

const STEPS: [number, string][] = [
  [0, 'Starting workspace'],
  [16, 'Loading Recon'],
  [34, 'Loading Emulate'],
  [52, 'Loading Code workspace'],
  [70, 'Loading Design'],
  [86, 'Waking AI Agent'],
  [100, 'Ready'],
];

const DELAY = 1500;
const DURATION = 6800;
const HOLD = 800;
const FADE = 900;

const delay = (value: string) => ({ '--d': value }) as CSSProperties;

interface WelcomeScreenProps {
  onDone: () => void;
}

const WelcomeScreen = ({ onDone }: WelcomeScreenProps) => {
  const [percent, setPercent] = useState(0);
  const [exiting, setExiting] = useState(false);
  const barRef = useRef<HTMLElement>(null);
  const leavingRef = useRef(false);
  const timersRef = useRef<number[]>([]);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const leave = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    setExiting(true);
    timersRef.current.push(window.setTimeout(() => onDoneRef.current(), FADE));
  }, []);

  const skip = useCallback(() => {
    if (leavingRef.current) return;
    if (barRef.current) barRef.current.style.width = '100%';
    setPercent(100);
    leave();
  }, [leave]);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const wait = reduced ? 0 : DELAY;
    const duration = reduced ? 500 : DURATION;
    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      if (leavingRef.current) return;
      const t = (now - start - wait) / duration;
      if (t > 0) {
        const value = t >= 1 ? 100 : t * t * (3 - 2 * t) * 100;
        if (barRef.current) barRef.current.style.width = `${value}%`;
        setPercent(Math.floor(value));
        if (value >= 100) {
          timersRef.current.push(window.setTimeout(leave, reduced ? 200 : HOLD));
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      timersRef.current.forEach(window.clearTimeout);
      timersRef.current = [];
    };
  }, [leave]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (['Escape', ' ', 'Enter'].includes(e.key)) skip();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [skip]);

  const label = [...STEPS].reverse().find(([threshold]) => percent >= threshold)?.[1] ?? STEPS[0][1];

  return (
    <div
      className={`pw${exiting ? ' pw--exit' : ''}`}
      role="status"
      aria-label="Starting Phantoma"
      onClick={skip}
    >
      <div className="pw-stage">
        <div className="pw-glyph pw-fi" style={delay('.2s')}>
          <svg viewBox="0 0 420 380" aria-hidden="true">
            <defs>
              <linearGradient id="pw-gp" x1="0" x2="1">
                <stop offset="0" className="pw-stop-a" />
                <stop offset="1" className="pw-stop-b" />
              </linearGradient>
              <linearGradient id="pw-gc" x1="0" x2="1">
                <stop offset="0" className="pw-stop-b" />
                <stop offset="1" className="pw-stop-a" />
              </linearGradient>
            </defs>
            <path
              fill="var(--pw-gh)"
              d="M60 255C95 220 105 165 135 105C155 55 205 28 255 38C315 52 340 130 340 190C340 232 362 248 380 258C300 238 190 218 60 255Z"
            />
            <g fill="var(--pw-ey)">
              <ellipse cx="250" cy="128" rx="13" ry="19" />
              <ellipse cx="296" cy="128" rx="13" ry="19" />
            </g>
            <path
              fill="url(#pw-gp)"
              d="M50 278C125 244 190 228 248 254C292 274 345 274 395 252C358 300 292 306 246 289C192 268 140 268 50 278Z"
            />
            <path
              fill="url(#pw-gc)"
              d="M112 312C158 290 200 300 240 322C282 344 336 338 380 312C346 360 282 370 234 346C196 326 156 322 112 312Z"
            />
          </svg>
        </div>
        <div className="pw-wordmark pw-fi" style={delay('.6s')}>
          Phantoma
        </div>
        <div className="pw-tagline pw-fi" style={delay('1s')}>
          See everything. Leave nothing behind.
        </div>
        <p className="pw-slogan pw-fi" style={delay('1.6s')}>
          A lifetime only has so many years. Why not use Phantoma to save your time many times
          over?
        </p>
        <div className="pw-progress pw-fi" style={delay('1.4s')}>
          <div className="pw-track">
            <i ref={barRef} />
          </div>
          <div className="pw-legend">
            <span>{label}</span>
            <b>{percent}%</b>
          </div>
        </div>
      </div>
      <div className="pw-skip pw-fi" style={delay('2s')}>
        Click or press Esc to skip
      </div>
    </div>
  );
};

export default WelcomeScreen;