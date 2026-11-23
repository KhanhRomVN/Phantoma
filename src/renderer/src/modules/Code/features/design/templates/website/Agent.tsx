import { useState } from 'react';
import { SiteLayout } from './Layout';
import { MODES, PROVIDERS } from './site';

export default function Agent() {
  const [mode, setMode] = useState<'full' | 'ask'>('full');

  return (
    <SiteLayout current="/agent">
      <section id="agent">
        <div className="w two">
          <div className="rv">
            <h2>An agent that works inside the module you're in</h2>
            <p className="sub">
              One side panel for Code, Emulate, Recon and Design. Each target keeps its own
              conversation, so switching never loses context.
            </p>
            <div className="sw" role="group" aria-label="Permission mode">
              <button aria-pressed={mode === 'full'} onClick={() => setMode('full')}>
                Full Access
              </button>
              <button aria-pressed={mode === 'ask'} onClick={() => setMode('ask')}>
                Approval Required
              </button>
            </div>
            <p className="sub" style={{ margin: 0 }}>
              {MODES[mode][0]}
            </p>
            <div className="facts">
              {PROVIDERS.map((p) => (
                <span key={p}>{p}</span>
              ))}
            </div>
          </div>
          <div className="term mono rv">
            <div className="bb">Fuzz the login with my payload list and tell me what changes.</div>
            <div className="tc">
              <b>run_repeater</b> login · payload list "usernames"
              <div
                className="ok"
                style={{ marginTop: 6 }}
                dangerouslySetInnerHTML={{ __html: MODES[mode][1] }}
              />
            </div>
            <div className="bb">
              Done. 2 of 40 runs returned a different status. Writing them to the report.
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}