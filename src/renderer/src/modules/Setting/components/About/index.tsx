import React, { useState } from 'react';
import { Check, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { MOCK_APP, MOCK_CHANGELOG } from '../../mock/mockData';
import type { ChangelogEntry } from '../../types';
import { Badge, PageHeader, Row, Section, SoftButton, Tone } from '../shared';

const TAG_TONE: Record<ChangelogEntry['tag'], Tone> = {
  feature: 'primary',
  improve: 'info',
  fix: 'success',
};

const About: React.FC = () => {
  const [checking, setChecking] = useState(false);
  const [upToDate, setUpToDate] = useState(false);

  const check = () => {
    setChecking(true);
    setUpToDate(false);
    setTimeout(() => {
      setChecking(false);
      setUpToDate(true);
    }, 1200);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="About" description="Version, updates and release notes." />

      <div className="relative mb-4 overflow-hidden rounded-xl border border-border bg-card-background p-5">
        <div className="pointer-events-none absolute -left-10 -top-14 h-44 w-44 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 right-10 h-40 w-40 rounded-full bg-info/15 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <Sparkles className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-semibold text-text-primary">{MOCK_APP.name}</span>
                <Badge tone="primary">v{MOCK_APP.version}</Badge>
                <Badge tone="muted">{MOCK_APP.channel}</Badge>
              </div>
              <div className="mt-1 text-[12px] text-text-secondary">
                {upToDate ? (
                  <span className="inline-flex items-center gap-1 text-success">
                    <Check className="h-3 w-3" /> You are up to date
                  </span>
                ) : (
                  `Built ${MOCK_APP.build}`
                )}
              </div>
            </div>
          </div>
          <SoftButton onClick={check} disabled={checking}>
            {checking ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Check for updates
          </SoftButton>
        </div>
      </div>

      <Section title="Runtime">
        <Row label="Electron">
          <span className="font-mono text-[12px] text-text-secondary">{MOCK_APP.electron}</span>
        </Row>
        <Row label="Node.js">
          <span className="font-mono text-[12px] text-text-secondary">{MOCK_APP.node}</span>
        </Row>
      </Section>

      <Section title="What's new">
        {MOCK_CHANGELOG.map((c) => (
          <Row key={c.version} label={c.title} description={`v${c.version} · ${c.date}`}>
            <Badge tone={TAG_TONE[c.tag]}>{c.tag}</Badge>
          </Row>
        ))}
      </Section>
    </div>
  );
};

export default About;