import { useMemo, useState } from 'react';
import { EMPTY_DATA, META } from './data/constants';
import { TAB_SPEC } from './tabSpec';
import { label } from './utils/format';
import { useScan } from './hooks/useScan';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { FingerprintTab } from './components/FingerprintTab';
import { DetailTab } from './components/DetailTab';
import { RawDataTab } from './components/RawDataTab';
import type { ScanData, ScanPhase, ThemeMode } from '../types';

const PHASE_CHIP: Record<ScanPhase, [string, string]> = {
  idle: ['', 'Ready'], running: ['scanning', 'Scanning…'], done: ['done', 'Scan complete'], error: ['error', 'Scan failed'],
};

/** Dữ liệu thật do background quét từ DOM các website (key top-level = group, meta = titles/warnings/inverseScores/snapshot). */
export default function App() {
  const scan = useScan();
  const phase: ScanPhase = scan.phase;
  const src: ScanData = scan.data || EMPTY_DATA;
  const [active, setActive] = useState('overview');
  const [theme, setTheme] = useState<ThemeMode>(() =>
    window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark');

  const groups = useMemo(() => {
    const dataGroups = Object.keys(src).filter((k) => !META.includes(k));
    // Thêm tab rawdata vào cuối danh sách
    return [...dataGroups, 'rawdata'];
  }, [src]);
  const title = (k: string) => {
    if (k === 'overview') return 'Dashboard';
    if (k === 'rawdata') return 'Raw Data';
    return (src.titles && src.titles[k]) || label(k);
  };
  const flagCount = (k: string) => (src.warnings?.[k] || []).filter((f: string) => f in (src[k] || {})).length;
  const done = phase === 'done' || (phase === 'running' && !!scan.data);
  const score: number | undefined = src.overview?.overallTrustScore;
  const scoreColor = (score ?? 0) >= 70 ? 'var(--ok)' : (score ?? 0) >= 45 ? 'var(--warn)' : 'var(--bad)';
  const firstMod = groups.find((k) => k !== 'overview');
  const failed = Object.entries(scan.pages).filter(([, p]) => p.status === 'error');

  const runScan = () => {
    if (phase === 'running') return;
    setActive('overview');
    scan.run();
  };

  const chip = PHASE_CHIP[phase];

  return (
    <div className="ftc" data-theme={theme}>
      <Sidebar groups={groups} firstMod={firstMod} phase={phase} progress={scan.progress} active={active}
        score={score} scoreColor={scoreColor} verdict={src.overview?.verdictLabel} theme={theme}
        title={title} flagCount={flagCount} onRun={runScan} onStop={scan.stop} onSelect={setActive} onTheme={setTheme} />
      <main className="main">
        <div className="wrap">
          <header className="head">
            <div>
              <h2>{title(active)}</h2>
              {TAB_SPEC[active]?.desc && <p className="desc">{TAB_SPEC[active].desc}</p>}
            </div>
            {active !== 'rawdata' && <span className={`pill ${chip[0]}`}><i />{chip[1]}</span>}
          </header>
          {phase === 'error' && <p className="xh">{scan.error || 'Could not read data from any page.'}</p>}
          {done && failed.length > 0 && (
            <p className="xh">Some pages failed and were skipped: {failed.map(([id, p]) => `${id} (${p.error})`).join('; ')}</p>
          )}
          {active === 'overview'
            ? <Dashboard src={src} groups={groups} done={done} running={phase === 'running'} title={title} go={setActive} />
            : active === 'fingerprint'
              ? <FingerprintTab src={src} />
              : active === 'rawdata'
                ? <RawDataTab raw={src.snapshot as any || {}} scanState={{ phase: scan.phase, progress: scan.progress, pages: scan.pages }} />
                : TAB_SPEC[active]
                  ? <DetailTab key={active} tab={active} src={src} />
                  : <div className="blank" />}
        </div>
      </main>
    </div>
  );
}
