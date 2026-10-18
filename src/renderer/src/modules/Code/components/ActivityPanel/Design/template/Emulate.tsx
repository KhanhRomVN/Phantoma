import { useState } from 'react';
import { SiteLayout } from './Layout';
import { TABS } from './site';

export default function Emulate() {
  const [active, setActive] = useState(0);
  const [title, desc, tags] = TABS[active];

  return (
    <SiteLayout current="/emulate">
      <section id="emulate">
        <div className="w">
          <h2 className="rv">Inside Emulate</h2>
          <p className="sub rv">Seven tools around one intercepted target. Pick one.</p>
          <div className="sp">
            <div className="tabs" role="tablist">
              {TABS.map((t, i) => (
                <button
                  key={t[0]}
                  className="tab"
                  role="tab"
                  aria-selected={i === active}
                  onClick={() => setActive(i)}
                >
                  {t[0]}
                </button>
              ))}
            </div>
            <div>
              <div className="pn" key={active}>
                <h3>{title}</h3>
                <p>{desc}</p>
                <div className="tg">
                  {tags.map((x) => (
                    <span key={x}>{x}</span>
                  ))}
                </div>
                {active === 0 && (
                  <p style={{ marginTop: 18, marginBottom: 0 }}>
                    Targets: website, PC app, Android app, CLI. Capture with MITM, CDP or Frida.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}