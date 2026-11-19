import { useState } from 'react';
import { Pause, Play, Plus, RefreshCw, Trash2 } from 'lucide-react';
import type { MonitorItem } from '../../../types/monitor.types';
import { MON_STATUS } from '../../../constants/meta';
import { c, hueOf } from '../../../utils/color';
import { sparkSeries } from '../../../utils/random';
import { Empty, StatusPill } from '../../common/Primitives';
import { HealthRing, Ring, Sparkline } from '../../common/Charts';
import { TD, THead, ViewShell } from '../../common/ViewShell';
import { PlatformBadge } from '../Feed/FeedBits';

const nextRunOf = (m: MonitorItem): string => {
  if (m.status !== 'running') return m.status === 'paused' ? 'Paused' : 'Waiting to recover';
  const s = m.schedule;
  const mins = /m$/.test(s) ? parseInt(s, 10) : /h$/.test(s) ? parseInt(s, 10) * 60 : 120;
  return `in ${(hueOf(m.id) % mins) + 1} min`;
};

const healthOf = (m: MonitorItem) => {
  const h = hueOf(m.id);
  return {
    uptime: m.status === 'error' ? 72 : m.status === 'paused' ? 91 : 99 - (h % 3),
    latency: 120 + (h % 380) + (m.status === 'error' ? 900 : 0),
    err: m.status === 'error' ? 18 : h % 3,
  };
};

interface MonitorsViewProps {
  monitors: MonitorItem[];
  setMonitors: (fn: (m: MonitorItem[]) => MonitorItem[]) => void;
  say: (m: string) => void;
  onCreate: () => void;
}

export function MonitorsView({ monitors, setMonitors, say, onCreate }: MonitorsViewProps) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const setStatus = (ids: string[], status: MonitorItem['status']) => {
    setMonitors((ms) => ms.map((m) => (ids.includes(m.id) ? { ...m, status } : m)));
    say(status === 'running' ? 'Monitor resumed' : 'Monitor paused');
  };
  const ids = Array.from(sel);
  const run = monitors.filter((m) => m.status === 'running').length;
  const drift = monitors.filter((m) => m.status === 'error');
  return (
    <ViewShell
      title="Monitors"
      subtitle={`${run}/${monitors.length} sources running · ${monitors.reduce((a, m) => a + m.hits24h, 0)} hits in 24h`}
      accent="info"
      actions={
        <>
          <Ring value={monitors.length ? Math.round((run / monitors.length) * 100) : 0} size={46} stroke={4} tone="success" label={`${run}/${monitors.length}`} />
          <button className="prim" onClick={onCreate}><Plus size={14} />Create monitor</button>
        </>
      }
    >
      {drift.length > 0 && (
        <div className="card" style={{ padding: '10px 14px', marginBottom: 12, borderRadius: 10, border: `1px solid ${c('error', 0.3)}`, background: `linear-gradient(90deg, ${c('error', 0.12)}, transparent)` }}>
          ⚠️ <b>Source drift:</b> {drift.map((d) => d.name).join(', ')} keep failing to crawl — the source structure may have changed.
        </div>
      )}
      {ids.length > 0 && (
        <div className="card card-pop" style={{ display: 'flex', gap: 6, alignItems: 'center', padding: 8, marginBottom: 10, border: `1px dashed ${c('primary')}`, flexWrap: 'wrap' }}>
          <b>{ids.length} selected</b>
          <button className="soft" onClick={() => setStatus(ids, 'running')}><Play size={13} />Resume</button>
          <button className="soft" onClick={() => setStatus(ids, 'paused')}><Pause size={13} />Pause</button>
          <button className="soft" onClick={() => say('Running now…')}><RefreshCw size={13} />Run now</button>
          <button className="soft" onClick={() => say('Tag added')}>Tag</button>
          <button className="dng" onClick={() => { setMonitors((ms) => ms.filter((m) => !ids.includes(m.id))); setSel(new Set()); say('Monitors deleted'); }}>
            <Trash2 size={13} />Delete
          </button>
        </div>
      )}
      <div className="card" style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <THead cols={['', 'Name', 'Platform', 'Interval', 'Next run', 'Hits 24h', 'Sparkline 24h', 'Health', 'Status', 'Actions']} />
          <tbody>
            {monitors.length === 0 && (
              <tr><td colSpan={10}><Empty text="No monitors yet — create the first one to start listening." /></td></tr>
            )}
            {monitors.map((m) => {
              const hl = healthOf(m);
              return (
                <tr key={m.id} style={{ borderBottom: `1px solid ${c('border')}`, background: m.status === 'error' ? c('error', 0.06) : undefined, animation: m.status === 'error' ? 'mnpulseRed 2.4s ease-in-out infinite' : undefined }}>
                  <td style={TD}><input type="checkbox" aria-label={`Select ${m.name}`} checked={sel.has(m.id)} onChange={() => toggle(m.id)} /></td>
                  <td style={{ ...TD, fontWeight: 500 }}>{m.name}<div className="sub">{m.group}</div></td>
                  <td style={TD}><PlatformBadge type={m.sourceType} /></td>
                  <td style={TD} className="mono">{m.schedule}</td>
                  <td style={TD} className="sub">{nextRunOf(m)}</td>
                  <td style={{ ...TD, fontWeight: 700 }} className="mono">{m.hits24h}</td>
                  <td style={TD}><Sparkline data={sparkSeries(m.id, m.hits24h + 3)} tone={m.hits24h > 40 ? 'success' : m.status === 'error' ? 'error' : 'info'} /></td>
                  <td style={TD}>
                    <span title={`Uptime ${hl.uptime}% · ${hl.latency}ms · errors ${hl.err}%`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <HealthRing uptime={hl.uptime} latency={hl.latency} err={hl.err} />
                      <span className="sub mono">{hl.latency}ms</span>
                    </span>
                  </td>
                  <td style={TD}><StatusPill map={MON_STATUS} k={m.status} /></td>
                  <td style={TD}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {m.status === 'running' ? (
                        <button className="ico" aria-label="Pause" onClick={() => setStatus([m.id], 'paused')}><Pause size={14} /></button>
                      ) : (
                        <button className="ico" aria-label="Resume" onClick={() => setStatus([m.id], 'running')}><Play size={14} /></button>
                      )}
                      <button className="ico" aria-label="Run now" onClick={() => say(`Run now ${m.name}`)}><RefreshCw size={14} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ViewShell>
  );
}

export default MonitorsView;