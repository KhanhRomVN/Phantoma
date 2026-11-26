import { useMemo } from 'react';
import {
  Globe, Fingerprint, Box, Clock, ShieldCheck, Cpu, Languages, Puzzle, ShieldAlert, Layers, Link2, Link2Off, ChevronRight,
} from 'lucide-react';
import { COUNTRY, HINTS } from '../data/constants';
import { hue, label, parseBrowser, plain, utcOffset } from '../utils/format';
import { useAnim } from '../hooks/useAnim';
import type { ScanData } from '../../types';

interface Props {
  src: ScanData;
  groups: string[];
  done: boolean;
  running: boolean;
  title: (k: string) => string;
  go: (k: string) => void;
}

interface Check { name: string; a: string; b: string; ok: boolean; note: string }

const col = (l: number) => ['var(--ok)', 'var(--warn)', 'var(--bad)'][l];
const cssVars = (v: Record<string, string>) => v as React.CSSProperties;

export function Dashboard({ src, groups, done, running, title, go }: Props) {
  const o = src.overview || {};
  const net = src.network || {}, fp = src.fingerprint || {};
  const inverse = (k: string) => (src.inverseScores || []).includes(k);
  const scoreKeys = Object.keys(o).filter((k) => typeof o[k] === 'number' && /(Score|Risk)$/.test(k) && k !== 'overallTrustScore');
  const level = (k: string, v: number) => (inverse(k) ? (v < 20 ? 0 : v < 40 ? 1 : 2) : v >= 70 ? 0 : v >= 45 ? 1 : 2);
  const t = useAnim(done);

  const alerts = useMemo(() => {
    if (!done) return [];
    const list: { sev: number; name: string; val: string; tab: string; key: string }[] = [];
    scoreKeys.forEach((k) => { const l = level(k, o[k]); if (l > 0) list.push({ sev: l, name: label(k), val: `${Math.round(o[k])} / 100`, tab: 'overview', key: k }); });
    groups.filter((g) => g !== 'overview').forEach((g) =>
      (src.warnings?.[g] || []).filter((f) => f in (src[g] || {})).forEach((f) =>
        list.push({ sev: 1, name: label(f), val: plain(src[g][f]), tab: g, key: f })));
    return list.sort((a, b) => b.sev - a.sev);
  }, [done, src]); // eslint-disable-line

  /* radar: ngoài rìa = tốt (điểm "lower is better" được đảo) */
  const n = scoreKeys.length, cx = 205, cy = 142, R = 86;
  const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const poly = (f: (k: string) => number) => scoreKeys.map((k, i) => `${(cx + R * f(k) * Math.cos(ang(i))).toFixed(1)},${(cy + R * f(k) * Math.sin(ang(i))).toFixed(1)}`).join(' ');
  const safe = (k: string) => (inverse(k) ? 100 - o[k] : o[k]) / 100;

  const overall = o.overallTrustScore, oc = col(level('overallTrustScore', overall ?? 0));
  const fpId: string = fp.fpId || '';
  const chunks = fpId.match(/.{1,8}/g) || [];
  const nHigh = alerts.filter((a) => a.sev === 2).length, nMed = alerts.length - nHigh;
  const flagged = (f: string) => (src.warnings?.network || []).includes(f) && net[f];

  const nav = src.navigator || {}, scr = src.screen || {}, wgl = src.webgl || {}, tz = src.timezone || {};
  const br = parseBrowser(nav.userAgent || '');
  const off = utcOffset(tz.timezoneOffset);
  const SW = scr.screenWidth || 1920, SH = scr.screenHeight || 1080, K = 300 / SW;
  const AW = scr.availWidth || SW, AH = scr.availHeight || SH, OW = scr.outerWidth || AW, OH = scr.outerHeight || AH;
  const IW = scr.innerWidth || OW, IH = scr.innerHeight || OH;
  const flagScr = (src.warnings?.screen || []).includes('devicePixelRatio');
  const flagExt = (src.warnings?.fingerprint || []).includes('extensionsDetected');

  const checks = useMemo(() => {
    const out: Check[] = [], cc = COUNTRY[net.country], p: string = nav.platform || '', ua: string = nav.userAgent || '';
    if (cc && tz.timezone) out.push({ name: 'IP location ↔ Timezone', a: net.country, b: tz.timezone, ok: cc.tz.some((z) => tz.timezone.startsWith(z)), note: `${net.country} normally uses ${cc.tz[0].replace(/\/$/, '')}` });
    if (cc && nav.languages) out.push({ name: 'IP location ↔ Languages', a: net.country, b: nav.languages.slice(0, 3).join(', '), ok: nav.languages.some((l: string) => cc.lang.includes(l.toLowerCase().split('-')[0])), note: `No "${cc.lang[0]}" language in the browser list` });
    if (cc && tz.intlCurrency) out.push({ name: 'IP location ↔ Currency', a: net.country, b: tz.intlCurrency, ok: tz.intlCurrency === cc.cur, note: `${net.country} normally uses ${cc.cur}` });
    const m = (tz.dateStringSample || '').match(/GMT([+-])(\d{2})(\d{2})/);
    if (m && tz.timezoneOffset != null) out.push({ name: 'Timezone ↔ Date string', a: `${tz.timezoneOffset} min`, b: `GMT${m[1]}${m[2]}${m[3]}`, ok: -(m[1] === '-' ? -1 : 1) * (+m[2] * 60 + +m[3]) === tz.timezoneOffset, note: 'Offset and date string disagree' });
    if (p && ua) {
      const key = /^Win/.test(p) ? 'Windows' : /^Mac/.test(p) ? 'Macintosh' : /Linux|X11/.test(p) ? 'Linux' : p;
      out.push({ name: 'Platform ↔ User-Agent', a: p, b: (ua.match(/\(([^;)]+)/) || [])[1] || '—', ok: ua.includes(key) || (key === 'Linux' && /X11|Android/.test(ua)), note: 'Platform does not match the UA string' });
    }
    if (p && wgl.webglRenderer) {
      const r: string = wgl.webglRenderer, win = /^Win/.test(p), mac = /^Mac/.test(p);
      out.push({ name: 'Platform ↔ GPU stack', a: p, b: /Mesa/.test(r) ? 'Mesa' : /Direct3D|D3D/.test(r) ? 'Direct3D' : 'Other', ok: !((!win && /Direct3D|D3D/.test(r)) || ((win || mac) && /Mesa/.test(r))), note: 'GPU driver stack is unusual for this OS' });
    }
    if (scr.screenWidth) out.push({ name: 'Viewport ↔ Screen', a: `${IW}×${IH}`, b: `${SW}×${SH}`, ok: IW <= OW && OW <= SW && IH <= OH && OH <= SH, note: 'Window is larger than the screen' });
    return out;
  }, [src]); // eslint-disable-line
  const nOkChk = checks.filter((c) => c.ok).length;
  const cGroups = useMemo(() => {
    const m = new Map<string, { h: string; a: string; items: (Check & { k: string })[] }>();
    checks.forEach((c) => {
      const [h, k] = c.name.split(' ↔ ');
      if (!m.has(h)) m.set(h, { h, a: c.a, items: [] });
      m.get(h)!.items.push({ ...c, k });
    });
    return [...m.values()];
  }, [checks]);
  const expo = [['Proxy', 'proxy'], ['VPN', 'vpn'], ['Tor', 'tor'], ['Hosting', 'hosting'], ['WebRTC leak', 'webrtcLeak'], ['DNS leak', 'dnsLeak']].filter(([, k]) => k in net);
  const anon = [['Proxy', 'proxy'], ['VPN', 'vpn'], ['Tor', 'tor'], ['Hosting', 'hosting']];
  const nAnon = anon.filter(([, k]) => net[k]).length;
  const anyLeak = !!(net.webrtcLeak || net.dnsLeak);
  const nExp = expo.filter(([, k]) => net[k]).length;
  const gl = groups.filter((g) => g !== 'overview');
  const fl = (g: string) => (src.warnings?.[g] || []).filter((f) => f in (src[g] || {})).length;
  const nFlagGroups = gl.filter((g) => fl(g) > 0).length;

  return (
    <div className="stack">
      <section className="hero">
        <div className="id">
          <div>
            <div className="lbl"><Globe size={13} />Public IP{done && net.ipVersion ? ` · ${net.ipVersion}` : ''}</div>
            <div className={'ip' + (done ? '' : ' off')}>{done ? net.ip : '000.000.000.000'}</div>
            {done && (
              <div className="meta">
                <span className="tg">Location <b>{[net.city, net.country].filter(Boolean).join(', ')}</b></span>
                <span className="tg">ISP <b>{net.isp}</b></span>
                <span className="tg">ASN <b>{net.asn}</b></span>
                <span className={'tg' + (flagged('dnsLeak') ? ' flag' : '')}>DNS leak <b>{plain(net.dnsLeak)}</b></span>
              </div>
            )}
          </div>
          <div>
            <div className="lbl"><Fingerprint size={13} />Fingerprint ID</div>
            <div className="fpgrid">
              {(done ? chunks : Array.from({ length: 8 }, () => '········')).map((c, i) => (
                <span key={i} className={'fpb' + (done ? '' : ' off')} style={done ? cssVars({ '--h': hue(c) }) : undefined}>{c}</span>
              ))}
            </div>
            <div className="hs">
              {['canvasHash', 'webglHash', 'audioHash', 'fontsHash'].filter((f) => f in fp).map((f) => (
                <span key={f}><i style={done ? cssVars({ '--h': hue(fp[f]) }) : undefined} />{label(f).replace(/ hash$/i, '')}<code>{done ? fp[f] : '········'}</code></span>
              ))}
            </div>
          </div>
        </div>

        <div className="radar">
          <div className="rh">
            <div className="big" style={{ color: done ? oc : 'var(--gray)' }}>{done ? Math.round(overall * t) : '--'}<small>/100</small></div>
            <div><b style={{ color: done ? oc : 'var(--ink)' }}>{done ? o.verdictLabel : running ? 'Scanning…' : 'Not scanned'}</b>
              <span>{done ? `${o.checksPassed}/${o.checksTotal} checks passed` : 'Run the check to score'}</span></div>
          </div>
          <svg viewBox="0 0 410 290" role="img" aria-label="Score radar">
            {[0.25, 0.5, 0.75, 1].map((l) => <polygon key={l} className="gr" points={poly(() => l)} />)}
            {scoreKeys.map((k, i) => <line key={k} className="ax" x1={cx} y1={cy} x2={cx + R * Math.cos(ang(i))} y2={cy + R * Math.sin(ang(i))} />)}
            {done && <polygon className="area" points={poly((k) => safe(k) * t)} />}
            {done && scoreKeys.map((k, i) => (
              <circle key={k} cx={cx + R * safe(k) * t * Math.cos(ang(i))} cy={cy + R * safe(k) * t * Math.sin(ang(i))} r="3.5"
                fill={col(level(k, o[k]))} stroke="var(--panel)" strokeWidth="1.5" />
            ))}
            {scoreKeys.map((k, i) => {
              const c = Math.cos(ang(i)), s = Math.sin(ang(i)), x = cx + (R + 14) * c, y = cy + (R + 14) * s;
              const y0 = s < -0.5 ? y - 14 : s > 0.5 ? y + 6 : y - 6;
              return (
                <text key={k} x={x} y={y0} textAnchor={c > 0.3 ? 'start' : c < -0.3 ? 'end' : 'middle'}>
                  <tspan x={x}>{label(k).replace(/ score$/i, '')}</tspan>
                  <tspan className="v" x={x} dy="13" style={{ fill: done ? col(level(k, o[k])) : 'var(--gray)' }}>{done ? Math.round(o[k]) : '–'}</tspan>
                </text>
              );
            })}
          </svg>
        </div>
      </section>

      <section className="stats">
        <div className="stat" style={cssVars({ '--c': 'var(--ok)' })}>
          <span className="si"><ShieldCheck size={20} /></span><span className="l">Checks passed</span>
          <span className="n">{done ? o.checksPassed : '--'}{done && <small>/ {o.checksTotal}</small>}</span>
          <div className="viz"><div className="bar"><i style={{ width: done ? `${(o.checksPassed / o.checksTotal) * 100}%` : 0 }} /></div></div>
        </div>
        <div className="stat" style={cssVars({ '--c': 'var(--bad)' })}>
          <span className="si"><ShieldAlert size={20} /></span><span className="l">To review</span>
          <span className="n">{done ? o.checksTotal - o.checksPassed : '--'}{done && <small>checks</small>}</span>
          <div className="viz"><div className="bar"><i style={{ width: done ? `${((o.checksTotal - o.checksPassed) / o.checksTotal) * 100}%` : 0 }} /></div></div>
        </div>
        <div className="stat" style={cssVars({ '--c': 'var(--warn)' })}>
          <span className="si"><Layers size={20} /></span><span className="l">Groups flagged</span>
          <span className="n">{done ? nFlagGroups : '--'}{done && <small>/ {gl.length}</small>}</span>
          <div className="viz"><div className="pips">{gl.map((g, q) => <i key={g} className={done && q < nFlagGroups ? 'on' : ''} />)}</div></div>
        </div>
        <div className="stat" style={cssVars({ '--c': 'var(--info)' })}>
          <span className="si"><Clock size={20} /></span><span className="l">Last check</span>
          <span className="n">{done && o.lastCheckAt ? new Date(o.lastCheckAt).toLocaleTimeString(undefined, { timeStyle: 'short' }) : '--'}</span>
          <div className="viz">{done && o.lastCheckAt ? `${new Date(o.lastCheckAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}${off ? ` · ${off}` : ''}` : '\u00A0'}</div>
        </div>
      </section>

      <div className="wh">
        <h3>Needs attention</h3>
        {done && <>
          <span className="cnt" style={cssVars({ '--c': 'var(--bad)' })}><i /><b>{nHigh}</b> High</span>
          <span className="cnt" style={cssVars({ '--c': 'var(--warn)' })}><i /><b>{nMed}</b> Medium</span>
        </>}
      </div>
      {!done || !alerts.length ? (
        <div className="empty">{running ? 'Scanning…' : done ? 'Nothing to review.' : 'Warnings appear here after the check.'}</div>
      ) : (
        <ul className="wg">
          {alerts.map((a, i) => (
            <li key={a.tab + a.name + i} style={{ listStyle: 'none' }}>
              <button type="button" className="wr" style={cssVars({ '--c': col(a.sev) })} onClick={() => go(a.tab)}>
                <span className="wt"><span className="ft">{a.name}</span><span className="chip">{title(a.tab)}</span><ChevronRight size={14} /></span>
                <span className="fv">{a.val}</span>
                {HINTS[a.key] && <span className="hn">{HINTS[a.key]}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="card">
        <div className="ch"><h3>Consistency</h3>{done && checks.length > 0 && <span className={'chip ' + (nOkChk === checks.length ? 'ok' : 'warn')}>{nOkChk} of {checks.length} consistent</span>}</div>
        {!done ? <div className="empty" style={{ background: 'none' }}>Signals are compared after the check.</div> : (
          <div className="cx">
            <div className="cm">
              <div className="cbar">
                {checks.map((c, i) => <i key={c.name} className={c.ok ? 'ok' : 'bad'} title={c.name} style={{ opacity: t >= (i + 1) / checks.length ? 1 : 0.18 }} />)}
              </div>
              <span className={'cv' + (nOkChk === checks.length ? '' : ' bad')}>
                {nOkChk === checks.length ? 'Profile looks coherent' : `${checks.length - nOkChk} mismatch · may trigger anti-bot checks`}
              </span>
            </div>
            <div className="cgs">
              {cGroups.map((g) => {
                const nb = g.items.filter((x) => !x.ok).length;
                return (
                  <div key={g.h} className={'cg' + (nb ? ' bad' : '')}>
                    <div className="gh">
                      <i className="gd" /><span className="gl">{g.h}</span><b className="gv" title={g.a}>{g.a}</b>
                      <span className="gc">{g.items.length - nb}/{g.items.length}</span>
                    </div>
                    <ul className="gt">
                      {g.items.map((c) => (
                        <li key={c.name} className={'gi' + (c.ok ? '' : ' bad')}>
                          <div className="gm">
                            {c.ok ? <Link2 size={12} /> : <Link2Off size={12} />}
                            <span className="gk">{c.k}</span><span className="gx" title={c.b}>{c.b}</span>
                          </div>
                          {!c.ok && <p className="gn">{c.note}</p>}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="ch"><h3>Network exposure</h3>{done && <span className={'chip ' + (nExp ? 'warn' : 'ok')}>{nExp ? `${nExp} of ${expo.length} exposed` : 'All clear'}</span>}</div>
        <div className="npw">
          <svg className="np" viewBox="0 0 980 212" role="img" aria-label="Traffic path and leak channels">
            <line className="ln" x1="146" y1="64" x2="250" y2="64" />
            <line className="ln" x1="560" y1="64" x2="640" y2="64" />
            <line className="ln" x1="840" y1="64" x2="880" y2="64" />
            <path d="M80 94V150Q80 160 90 160H912Q922 160 922 150V98" fill="none" strokeWidth="1.5" strokeDasharray="5 5"
              style={{ stroke: anyLeak ? 'var(--warn)' : 'var(--line)', opacity: anyLeak ? 0.75 : 1 }} />

            <rect className="nb" x="16" y="34" width="130" height="60" rx="10" />
            <text x="30" y="54">Your browser</text>
            <text className="nv" x="30" y="76">{done && br ? br : '--'}</text>

            <rect className="nb" x="250" y="18" width="310" height="92" rx="12" />
            <text x="266" y="40">Anonymizers</text>
            <text x="544" y="40" textAnchor="end" style={{ fill: nAnon ? 'var(--warn)' : 'var(--gray)' }}>{done ? (nAnon ? `${nAnon} detected` : 'None detected') : '--'}</text>
            {anon.map(([l, k], q) => {
              const x = 258 + q * 76, on = done && net[k], c = !done ? 'var(--gray)' : on ? 'var(--warn)' : 'var(--ok)';
              return (
                <g key={k}>
                  <rect x={x} y="52" width="68" height="48" rx="8" style={{ fill: 'var(--card)' }} />
                  <circle cx={x + 11} cy="65" r="3.5" style={{ fill: c }} />
                  <text x={x + 19} y="69" style={{ fill: c, fontSize: 10 }}>{done ? (on ? 'Yes' : 'No') : '--'}</text>
                  <text className="nv" x={x + 10} y="89" style={{ fontSize: 12 }}>{l}</text>
                </g>
              );
            })}

            <rect className="nb" x="640" y="34" width="200" height="60" rx="10" />
            <text x="656" y="52">Public IP{done && net.ipVersion ? ` · ${net.ipVersion}` : ''}</text>
            <text className="nv mono" x="656" y="74" style={{ fontSize: 16 }}>{done ? net.ip : '--'}</text>
            <text className="cap" x="656" y="88">{done ? [net.country, net.asn].filter(Boolean).join(' · ') : ''}</text>

            <rect className="nb" x="880" y="34" width="84" height="60" rx="10" />
            <text className="nv" x="922" y="69" textAnchor="middle">Website</text>

            <text className="cap" x="100" y="150">Side channels that skip the tunnel</text>
            {([['WebRTC', 'webrtcLeak', 300, 190, 'Local IP exposed', 'No local IP exposed'], ['DNS', 'dnsLeak', 560, 210, 'Resolver visible outside tunnel', 'Resolver stays inside tunnel']] as [string, string, number, number, string, string][]).map(([l, k, x, w, bad, good]) => {
              const on = done && net[k], c = !done ? 'var(--gray)' : on ? 'var(--warn)' : 'var(--ok)';
              return (
                <g key={k}>
                  <rect x={x} y="145" width={w} height="30" rx="15" style={{ fill: 'var(--card)', stroke: on ? 'var(--warn)' : 'var(--line)', strokeWidth: 1.5 }} />
                  <circle cx={x + 16} cy="160" r="4" style={{ fill: c }} />
                  <text className="nv" x={x + 28} y="164" style={{ fontSize: 12 }}>{l}{done ? (on ? ' · Leak' : ' · Clear') : ''}</text>
                  <text className="cap" x={x + 8} y="196" style={{ fill: on ? 'var(--warn)' : 'var(--gray)' }}>{done ? (on ? bad : good) : ''}</text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <div className="card ov">
        <div className="ch"><h3>Environment</h3></div>
        <div className="envc">
          <div className="ev">
            <div className="bn">{done && br ? br : '--'}</div>
            <div className="bs">{done ? [nav.platform, scr.orientation].filter(Boolean).join(' · ') : 'Not scanned'}</div>
            <svg viewBox="0 0 320 186" role="img" aria-label="Screen, window and viewport">
              <rect className="scr" x="10" y="6" width={SW * K} height={SH * K} rx="6" />
              <rect className="av" x="10" y="6" width={AW * K} height={AH * K} />
              {done && <>
                <rect className="win" x={10 + (SW - OW) * K / 2} y="6" width={OW * K} height={OH * K} rx="2" />
                <rect className="vp" x={10 + (SW - IW) * K / 2} y={6 + (OH - IH) * K} width={IW * K} height={IH * K} />
                <text x={10 + SW * K / 2} y={6 + (OH - IH / 2) * K + 3} textAnchor="middle">{IW}×{IH}</text>
                <text x="16" y="17">{SW}×{SH}</text>
              </>}
            </svg>
            <div className="lg">
              <span><i style={{ background: 'var(--gray)' }} />Screen</span><span><i />Window / viewport</span>
              {done && scr.devicePixelRatio != null && <span><i className={flagScr ? 'w' : ''} style={flagScr ? undefined : { background: 'var(--sub)' }} />Pixel ratio {scr.devicePixelRatio}x</span>}
            </div>
          </div>
          <div className="sp">
            <div className="sr"><span className="k"><Cpu size={14} />CPU</span><span className="v">{done ? `${nav.hardwareConcurrency} cores · ${nav.deviceMemory} GB` : '--'}{done && <span className="cores">{Array.from({ length: nav.hardwareConcurrency || 0 }, (_, q) => <i key={q} />)}</span>}</span></div>
            <div className="sr"><span className="k"><Box size={14} />GPU</span><span className="v">{done ? wgl.gpuModel : '--'}</span></div>
            <div className="sr"><span className="k"><Clock size={14} />Timezone</span><span className="v">{done ? `${tz.timezone} (${off})` : '--'}</span></div>
            <div className="sr"><span className="k"><Languages size={14} />Languages</span><span className="v">{done ? <span className="chips">{(nav.languages || []).map((c: string) => <span key={c}>{c}</span>)}</span> : '--'}</span></div>
            <div className="sr"><span className="k"><Puzzle size={14} />Extensions{done && flagExt && <i className="wd" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--warn)' }} />}</span><span className="v">{done ? <span className="chips">{(fp.extensionsDetected || []).map((c: string) => <span key={c}>{c}</span>)}</span> : '--'}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}