import {
  Globe, Box, Mic, Bot, ShieldCheck, Battery, BatteryCharging, Video, Volume2, Gamepad2, Check, Copy,
} from 'lucide-react';
import { HINTS, RISKY as RISKY_KEYS } from '../data/constants';
import { Note } from './Val';
import { parseBrowser } from '../utils/format';
import type { GroupData } from '../../types';
import type { CopyFn } from '../hooks/useCopy';

export interface HeroProps {
  d: GroupData;
  warn: string[];
  copy: CopyFn;
  copied: string | null;
}

export function NetHero({ d, warn }: HeroProps) {
  const tiles = [['Proxy', 'proxy'], ['VPN', 'vpn'], ['Tor', 'tor'], ['Hosting', 'hosting'], ['WebRTC leak', 'webrtcLeak'], ['DNS leak', 'dnsLeak']].filter(([, k]) => k in d);
  const n = tiles.filter(([, k]) => d[k]).length;
  return (
    <>
      <div className="card nh">
        <div>
          <div className="lbl"><Globe size={13} />Public IP{d.ipVersion ? ` · ${d.ipVersion}` : ''}</div>
          <div className="ip">{d.ip || 'n/a'}</div>
        </div>
        {tiles.length > 0 && (
          <div>
            <div className="sech" style={{ padding: '0 0 8px' }}>
              <h3>Exposure</h3><span className={'chip ' + (n ? 'warn' : 'ok')}>{n ? `${n} of ${tiles.length} exposed` : 'All clear'}</span>
            </div>
            <div className="xg">
              {tiles.map(([l, k]) => <div key={k} className={'xt' + (d[k] ? ' bad' : '')}><i /><b>{l}</b><span>{d[k] ? 'Yes' : 'No'}</span></div>)}
            </div>
          </div>
        )}
      </div>
      {tiles.filter(([, k]) => d[k] && warn.includes(k) && HINTS[k]).map(([, k]) => <Note key={k} text={HINTS[k]} />)}
    </>
  );
}

export function UaHero({ d, copy, copied }: HeroProps) {
  const ua: string = d.userAgent || '';
  const br = parseBrowser(ua);
  return (
    <div className="card">
      <div className="ch">
        <h3>User-Agent</h3>
        <span className="hl">
          {br && <span className="chip">{br}</span>}
          <button type="button" className={'cpb' + (copied === 'ua' ? ' ok' : '')} onClick={() => copy('ua', ua)}>
            {copied === 'ua' ? <Check size={13} /> : <Copy size={13} />}{copied === 'ua' ? 'Copied' : 'Copy'}
          </button>
        </span>
      </div>
      <div className="uab">{ua || 'n/a'}</div>
    </div>
  );
}

export function ScreenHero({ d }: HeroProps) {
  const SW = d.screenWidth || 1920, SH = d.screenHeight || 1080, K = 300 / SW;
  const AW = d.availWidth || SW, AH = d.availHeight || SH, OW = d.outerWidth || AW, OH = d.outerHeight || AH;
  const IW = d.innerWidth || OW, IH = d.innerHeight || OH;
  const L: [string, string, React.CSSProperties][] = [
    ['Screen', `${SW} × ${SH}`, { background: 'var(--gray)' }],
    ['Available', `${AW} × ${AH}`, { border: '1px dashed var(--gray)' }],
    ['Window', `${OW} × ${OH}`, { background: 'color-mix(in srgb,var(--pri) 30%,transparent)', border: '1px solid var(--pri)' }],
    ['Viewport', `${IW} × ${IH}`, { background: 'var(--pri)' }],
  ];
  return (
    <div className="card ov">
      <div className="ch"><h3>Screen, window and viewport</h3></div>
      <div className="shw">
        <div className="ev">
          <svg viewBox={`0 0 320 ${Math.ceil(SH * K) + 12}`} role="img" aria-label="Screen, window and viewport">
            <rect className="scr" x="10" y="6" width={SW * K} height={SH * K} rx="6" />
            <rect className="av" x="10" y="6" width={AW * K} height={AH * K} />
            <rect className="win" x={10 + (SW - OW) * K / 2} y="6" width={OW * K} height={OH * K} rx="2" />
            <rect className="vp" x={10 + (SW - IW) * K / 2} y={6 + (OH - IH) * K} width={IW * K} height={IH * K} />
          </svg>
        </div>
        <div className="szl">
          {L.map(([n, v, st]) => <div key={n} className="sz"><i style={st} /><span>{n}</span><b>{v}</b></div>)}
        </div>
      </div>
    </div>
  );
}

export function GlHero({ d }: HeroProps) {
  const soft = d.isSoftwareRenderer === true;
  return (
    <div className="card ghr">
      <span className="si" style={{ '--c': 'var(--pri)' } as React.CSSProperties}><Box size={22} /></span>
      <div className="gtx"><b>{d.gpuModel || 'Unknown GPU'}</b><span>{d.gpuArchitecture || 'Architecture unknown'}</span></div>
      {'isSoftwareRenderer' in d && <span className={'chip ' + (soft ? 'warn' : 'ok')}>{soft ? 'Software renderer' : 'Hardware renderer'}</span>}
    </div>
  );
}

export function TzHero({ d }: HeroProps) {
  const h = d.timezoneOffset != null ? -d.timezoneOffset / 60 : null;
  const off = h == null ? 'UTC' : `UTC${h >= 0 ? '+' : ''}${h}`;
  return (
    <div className="card">
      <div className="ghr">
        <div className="tzb">{off}</div>
        <div className="gtx"><b>{d.timezone || 'n/a'}</b><span>{d.timezoneName || ''}</span></div>
      </div>
      {d.dateStringSample && <div className="uab">{d.dateStringSample}</div>}
    </div>
  );
}

export function DetHero({ d, warn }: HeroProps) {
  const M = [['headlessScore', 'Headless score'], ['likeHeadlessScore', 'Headless-like'], ['stealthScore', 'Stealth score']].filter(([k]) => typeof d[k] === 'number');
  const lv = (v: number) => (v < 20 ? 'var(--ok)' : v < 40 ? 'var(--warn)' : 'var(--bad)');
  const sig = Object.keys(d).filter((k) => typeof d[k] === 'boolean' && RISKY_KEYS.has(k));
  const n = sig.filter((k) => d[k]).length;
  return (
    <>
      <div className="tiles">
        {M.map(([k, name]) => (
          <div key={k} className="stat" style={{ '--c': lv(d[k]) } as React.CSSProperties}>
            <span className="si"><Bot size={20} /></span><span className="l">{name}</span>
            <span className="n">{d[k]}<small>/ 100</small></span>
            <div className="viz"><div className="bar"><i style={{ width: `${Math.min(100, d[k])}%` }} /></div></div>
          </div>
        ))}
        {sig.length > 0 && (
          <div className="stat" style={{ '--c': n ? 'var(--warn)' : 'var(--ok)' } as React.CSSProperties}>
            <span className="si"><ShieldCheck size={20} /></span><span className="l">Signals triggered</span>
            <span className="n">{n}<small>/ {sig.length}</small></span>
            <div className="viz"><div className="bar"><i style={{ width: `${(n / sig.length) * 100}%` }} /></div></div>
          </div>
        )}
      </div>
      {M.filter(([k]) => warn.includes(k) && HINTS[k]).map(([k]) => <Note key={k} text={HINTS[k]} />)}
    </>
  );
}

export function MediaHero({ d }: HeroProps) {
  const C = ([['audioInputDevices', 'Audio input', Mic], ['audioOutputDevices', 'Audio output', Volume2], ['videoInputDevices', 'Video input', Video], ['gamepadsCount', 'Gamepads', Gamepad2]] as const).filter(([k]) => k in d);
  const pct = typeof d.batteryLevel === 'number' ? Math.round(d.batteryLevel * 100) : null;
  const BIcon = d.batteryCharging ? BatteryCharging : Battery;
  return (
    <div className="tiles">
      {C.map(([k, name, Icon]) => (
        <div key={k} className="stat" style={{ '--c': 'var(--pri)' } as React.CSSProperties}>
          <span className="si"><Icon size={20} /></span><span className="l">{name}</span><span className="n">{d[k]}</span>
        </div>
      ))}
      {pct != null && (
        <div className="stat" style={{ '--c': pct >= 20 ? 'var(--ok)' : 'var(--warn)' } as React.CSSProperties}>
          <span className="si"><BIcon size={20} /></span><span className="l">Battery{d.batteryCharging ? ' · charging' : ''}</span>
          <span className="n">{pct}<small>%</small></span>
          <div className="viz"><div className="bar"><i style={{ width: `${pct}%` }} /></div></div>
        </div>
      )}
    </div>
  );
}