import { Fragment } from 'react';
import {
  Fingerprint,
  LayoutDashboard,
  Globe,
  Compass,
  Monitor,
  Box,
  Clock,
  ShieldCheck,
  Mic,
  Play,
  RotateCw,
  Sun,
  Moon,
  Square,
  FileJson,
  type LucideIcon,
} from 'lucide-react';
import type { ScanPhase, ThemeMode } from '../../types';

const TAB_ICONS: Record<string, LucideIcon> = {
  overview: LayoutDashboard,
  fingerprint: Fingerprint,
  network: Globe,
  navigator: Compass,
  screen: Monitor,
  webgl: Box,
  timezone: Clock,
  detection: ShieldCheck,
  media: Mic,
  rawdata: FileJson,
};

interface Props {
  groups: string[];
  firstMod?: string;
  phase: ScanPhase;
  progress: number;
  active: string;
  score?: number;
  scoreColor: string;
  verdict?: string;
  theme: ThemeMode;
  title: (k: string) => string;
  flagCount: (k: string) => number;
  onRun: () => void;
  onStop: () => void;
  onSelect: (k: string) => void;
  onTheme: (t: ThemeMode) => void;
}

export function Sidebar(p: Props) {
  const done = p.phase === 'done',
    running = p.phase === 'running';
  const live = p.score !== undefined;
  return (
    <aside className="side">
      <div className="brand">
        <div className="logo">
          <Fingerprint size={20} />
        </div>
        <div>
          <h1>FingerLen</h1>
          <p>Audit browser exposure and trust signals</p>
        </div>
      </div>
      {running ? (
        <button type="button" className="run stop" onClick={p.onStop}>
          <Square size={13} fill="currentColor" />
          Stop Scan
        </button>
      ) : (
        <button type="button" className="run" onClick={p.onRun}>
          {done ? <RotateCw size={15} /> : <Play size={14} fill="currentColor" />}
          {done ? 'Re-check' : 'Run Check'}
        </button>
      )}
      <nav className="nav" role="tablist" aria-orientation="vertical">
        {p.groups.map((k) => {
          const Icon = TAB_ICONS[k] || Box;
          const nf = k !== 'overview' ? p.flagCount(k) : 0;
          return (
            <Fragment key={k}>
              {k === p.firstMod && <span className="nl">Modules</span>}
              <button
                type="button"
                role="tab"
                className="tab"
                aria-selected={p.active === k}
                onClick={() => p.onSelect(k)}
              >
                <span className="ti">
                  <Icon size={16} />
                </span>
                <span className="tt">{p.title(k)}</span>
                {nf > 0 ? (
                  <span className="tn" title={`${nf} flagged`}>
                    {nf}
                  </span>
                ) : null}
              </button>
            </Fragment>
          );
        })}
      </nav>

      <div className="sfoot">
        <span className="src">Source: live scan</span>
        <div className="seg" role="group" aria-label="Theme">
          <button
            type="button"
            aria-label="Dark theme"
            aria-pressed={p.theme === 'dark'}
            onClick={() => p.onTheme('dark')}
          >
            <Moon size={14} />
          </button>
          <button
            type="button"
            aria-label="Light theme"
            aria-pressed={p.theme === 'light'}
            onClick={() => p.onTheme('light')}
          >
            <Sun size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
