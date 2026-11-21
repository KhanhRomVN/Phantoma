import React, { useState } from 'react';
import { Laptop, LogOut, Monitor, Smartphone } from 'lucide-react';
import { MOCK_SESSIONS } from '../../mock/mockData';
import type { SessionItem } from '../../types';
import { Badge, PageHeader, Row, Section, Segmented, SoftButton, Toggle } from '../shared';

const KIND_ICON = {
  desktop: Monitor,
  laptop: Laptop,
  mobile: Smartphone,
} as const;

type LockDelay = '1' | '5' | '15' | 'never';

const Security: React.FC = () => {
  const [sessions, setSessions] = useState<SessionItem[]>(MOCK_SESSIONS);
  const [autoLock, setAutoLock] = useState(true);
  const [lockDelay, setLockDelay] = useState<LockDelay>('5');
  const [twoFactor, setTwoFactor] = useState(false);
  const [telemetry, setTelemetry] = useState(false);
  const [maskSecrets, setMaskSecrets] = useState(true);

  const revoke = (id: string) => setSessions((prev) => prev.filter((s) => s.id !== id));
  const revokeOthers = () => setSessions((prev) => prev.filter((s) => s.current));
  const hasOthers = sessions.some((s) => !s.current);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Security" description="Sessions, lock and privacy controls." />

      <Section title="Lock">
        <Row label="Auto-lock" description="Require unlock after the app is idle.">
          <Toggle checked={autoLock} onChange={setAutoLock} />
        </Row>
        <Row label="Lock delay" description="Minutes of inactivity before locking.">
          <Segmented<LockDelay>
            value={lockDelay}
            onChange={setLockDelay}
            options={[
              { id: '1', label: '1m' },
              { id: '5', label: '5m' },
              { id: '15', label: '15m' },
              { id: 'never', label: 'Never' },
            ]}
          />
        </Row>
        <Row label="Two-factor authentication" description="Add a second step when signing in.">
          <Toggle checked={twoFactor} onChange={setTwoFactor} />
        </Row>
      </Section>

      <Section title="Privacy">
        <Row label="Mask secrets" description="Hide passwords and tokens until revealed.">
          <Toggle checked={maskSecrets} onChange={setMaskSecrets} />
        </Row>
        <Row label="Usage analytics" description="Share anonymous usage data to improve Phantoma.">
          <Toggle checked={telemetry} onChange={setTelemetry} />
        </Row>
      </Section>

      <Section
        title="Active sessions"
        action={
          <SoftButton tone="error" disabled={!hasOthers} onClick={revokeOthers}>
            <LogOut className="h-3.5 w-3.5" />
            Sign out others
          </SoftButton>
        }
      >
        {sessions.map((s) => {
          const Icon = KIND_ICON[s.kind];
          return (
            <Row
              key={s.id}
              label={s.device}
              description={`${s.location} · ${s.lastActive}`}
            >
              <Icon className="h-4 w-4 text-text-secondary" />
              {s.current ? (
                <Badge tone="success">This device</Badge>
              ) : (
                <SoftButton tone="muted" onClick={() => revoke(s.id)}>
                  Revoke
                </SoftButton>
              )}
            </Row>
          );
        })}
      </Section>
    </div>
  );
};

export default Security;