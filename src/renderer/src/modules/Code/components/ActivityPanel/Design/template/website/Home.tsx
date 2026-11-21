import { useEffect, useRef, useState } from 'react';
import { RouteLink, SiteLayout } from './Layout';
import { AGENTS, MODULES, SITE, STEPS, VERBS } from './site';
import { Icon } from './theme';

function Ghost() {
  const ref = useRef<HTMLDivElement>(null);
  const eyes = useRef<SVGGElement>(null);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!ref.current || !eyes.current) return;
      const r = ref.current.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width * 0.6);
      const dy = e.clientY - (r.top + r.height * 0.33);
      const d = Math.hypot(dx, dy) || 1;
      const k = Math.min(9, d / 40);
      eyes.current.style.transform = `translate(${(dx / d) * k}px,${(dy / d) * k}px)`;
    };
    window.addEventListener('pointermove', move);
    return () => window.removeEventListener('pointermove', move);
  }, []);

  return (
    <div className="gh" ref={ref}>
      <svg viewBox="0 0 420 380" aria-label="Phantoma ghost, eyes follow your cursor">
        <defs>
          <linearGradient id="gp" x1="0" x2="1">
            <stop offset="0" stopColor="#7c4dff" />
            <stop offset="1" stopColor="#3b82f6" />
          </linearGradient>
          <linearGradient id="gc" x1="0" x2="1">
            <stop offset="0" stopColor="#22d3ee" />
            <stop offset="1" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
        <path
          fill="var(--gh)"
          d="M60 255C95 220 105 165 135 105C155 55 205 28 255 38C315 52 340 130 340 190C340 232 362 248 380 258C300 238 190 218 60 255Z"
        />
        <g ref={eyes} fill="var(--ey)">
          <ellipse cx="250" cy="128" rx="13" ry="19" />
          <ellipse cx="296" cy="128" rx="13" ry="19" />
        </g>
        <path
          fill="url(#gp)"
          d="M50 278C125 244 190 228 248 254C292 274 345 274 395 252C358 300 292 306 246 289C192 268 140 268 50 278Z"
        />
        <path
          fill="url(#gc)"
          d="M112 312C158 290 200 300 240 322C282 344 336 338 380 312C346 360 282 370 234 346C196 326 156 322 112 312Z"
        />
      </svg>
      <div className="chip mono" style={{ left: '-2%', top: '22%', animationDelay: '-1s' }}>
        <em>MITM</em> · 128 HTTPS
      </div>
      <div className="chip mono" style={{ right: '-2%', top: '46%', animationDelay: '-3s' }}>
        <em>Frida</em> hooked
      </div>
      <div className="chip mono" style={{ left: '8%', bottom: '6%', animationDelay: '-2s' }}>
        <em>repeater</em> run #14
      </div>
    </div>
  );
}

function AppMock() {
  return (
    <div className="app rv" aria-hidden="true">
      <div className="bar">
        <i />
        <i />
        <i />
        <span className="mono" style={{ marginLeft: 10 }}>
          Phantoma — Emulate / example.com
        </span>
      </div>
      <div className="am">
        <div className="sd">
          <span>Recon</span>
          <span className="on">Emulate</span>
          <span>Code</span>
          <span>Design</span>
          <span style={{ marginTop: 'auto' }}>Report</span>
        </div>
        <div className="mono">
          <div className="tr">
            <span>Method</span>
            <span>URL</span>
            <span>Code</span>
            <span>Time</span>
          </div>
          <div className="tr">
            <span className="m g">GET</span>
            <span>/api/session</span>
            <span>200</span>
            <span>84ms</span>
          </div>
          <div className="tr hl">
            <span className="m po">POST</span>
            <span>/api/login · intercepted</span>
            <span>—</span>
            <span>…</span>
          </div>
          <div className="tr">
            <span className="m g">GET</span>
            <span>/static/app.wasm</span>
            <span>200</span>
            <span>212ms</span>
          </div>
          <div className="tr">
            <span className="m r">GET</span>
            <span>/admin/export</span>
            <span>403</span>
            <span>41ms</span>
          </div>
          <div className="tr">
            <span className="m g">WS</span>
            <span>/socket · 14 frames</span>
            <span>101</span>
            <span>live</span>
          </div>
        </div>
        <div className="ag">
          <div className="bb">Which endpoints reject an unauthenticated request?</div>
          <div className="tc mono">
            <b>list_https</b> status:403
            <br />
            <span style={{ color: 'var(--mu)' }}>1 match → /admin/export</span>
          </div>
          <div className="bb">Replaying with a modified header via the Repeater…</div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [vi, setVi] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setVi((v) => (v + 1) % VERBS.length), 2400);
    return () => clearInterval(t);
  }, []);

  return (
    <SiteLayout current="/">
      {(stars) => (
        <>
          <div className="hero">
            <div className="aur" />
            <div className="w">
              <div className="hg">
                <div>
                  <span className="pill">
                    <i />
                    Open-source desktop app
                  </span>
                  <h1>
                    See everything.
                    <br />
                    <span className="gr">Leave nothing behind.</span>
                  </h1>
                  <p className="lead">
                    Recon, traffic interception, an AI agent and a code workspace in one desktop
                    platform for security and network analysis. Everything stays on your machine.
                  </p>
                  <p className="verbs mono">
                    <b>{VERBS[vi][0]}</b> the target, then <span>{VERBS[vi][1]}</span>
                  </p>
                  <div className="cta">
                    <RouteLink route="/download" className="btn pr">
                      <Icon n="down" />
                      <span>Download Phantoma</span>
                    </RouteLink>
                    <a className="btn star" href={SITE.repo} target="_blank" rel="noreferrer">
                      <Icon n="git" f />
                      View on GitHub<b>{stars}</b>
                    </a>
                  </div>
                  <p className="note">
                    Windows, macOS and Linux builds are published on GitHub Releases.
                  </p>
                </div>
                <Ghost />
              </div>
              <AppMock />
            </div>
          </div>

          <div className="w">
            <div className="mq">
              <p>Detects about 40 AI coding agents running in your terminals</p>
              <div className="mt">
                {[...AGENTS, ...AGENTS].map((a, i) => (
                  <span key={i}>{a}</span>
                ))}
              </div>
            </div>
          </div>

          <section id="modules">
            <div className="w">
              <h2 className="rv">Six tools. One workspace.</h2>
              <p className="sub rv">
                Stop juggling a browser, a proxy, a terminal, an editor and an AI chat. Phantoma keeps
                them side by side.
              </p>
              <div className="bento">
                {MODULES.map((m) => (
                  <div key={m.id} className={`cd rv${m.wide ? ' wd' : ''}`}>
                    <div className="ico">
                      <Icon n={m.icon} />
                    </div>
                    <h3>{m.title}</h3>
                    <p>{m.description}</p>
                    {m.bullets.length > 0 && (
                      <ul>
                        {m.bullets.map((b) => (
                          <li key={b}>{b}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="workflow" style={{ paddingTop: 20 }}>
            <div className="w">
              <h2 className="rv">From first request to final report</h2>
              <div className="flow">
                {STEPS.map((s, i) => (
                  <div key={s.title} className="st rv">
                    <div className="n">{i + 1}</div>
                    <h3>{s.title}</h3>
                    <p>{s.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </SiteLayout>
  );
}