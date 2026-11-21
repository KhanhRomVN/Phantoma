import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { MOCK_ACCOUNT, MOCK_LANGUAGES, MOCK_TIMEZONES } from '../../mock/mockData';
import { Badge, INPUT_CLASS, PageHeader, Row, Section, Select, SoftButton } from '../shared';

const Account: React.FC = () => {
  const [name, setName] = useState(MOCK_ACCOUNT.name);
  const [handle, setHandle] = useState(MOCK_ACCOUNT.handle);
  const [timezone, setTimezone] = useState(MOCK_ACCOUNT.timezone);
  const [language, setLanguage] = useState(MOCK_ACCOUNT.language);
  const [saved, setSaved] = useState(false);

  const dirty =
    name !== MOCK_ACCOUNT.name ||
    handle !== MOCK_ACCOUNT.handle ||
    timezone !== MOCK_ACCOUNT.timezone ||
    language !== MOCK_ACCOUNT.language;

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Account"
        description="Your profile and workspace identity."
        actions={
          <SoftButton onClick={save} disabled={!dirty && !saved}>
            <Save className="h-3.5 w-3.5" />
            {saved ? 'Saved' : 'Save changes'}
          </SoftButton>
        }
      />

      <div className="relative mb-4 overflow-hidden rounded-xl border border-border bg-card-background p-4">
        <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-lg font-semibold text-primary">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-[14px] font-semibold text-text-primary">{name}</span>
              <Badge tone="primary">{MOCK_ACCOUNT.plan}</Badge>
            </div>
            <div className="mt-0.5 text-[12px] text-text-secondary">{MOCK_ACCOUNT.email}</div>
            <div className="mt-0.5 text-[11px] text-text-secondary">
              {MOCK_ACCOUNT.workspace} · Joined {MOCK_ACCOUNT.joined}
            </div>
          </div>
        </div>
      </div>

      <Section title="Profile">
        <Row label="Display name" description="Shown across the workspace.">
          <input value={name} onChange={(e) => setName(e.target.value)} className={`${INPUT_CLASS} w-56`} />
        </Row>
        <Row label="Handle" description="Unique username.">
          <input value={handle} onChange={(e) => setHandle(e.target.value)} className={`${INPUT_CLASS} w-56 font-mono`} />
        </Row>
        <Row label="Email" description="Used for sign-in and alerts.">
          <input readOnly value={MOCK_ACCOUNT.email} className={`${INPUT_CLASS} w-56 opacity-70`} />
        </Row>
      </Section>

      <Section title="Regional">
        <Row label="Language" description="Interface language.">
          <Select value={language} options={MOCK_LANGUAGES} onChange={setLanguage} />
        </Row>
        <Row label="Time zone" description="Used for timestamps and schedules.">
          <Select value={timezone} options={MOCK_TIMEZONES} onChange={setTimezone} className="min-w-[200px]" />
        </Row>
      </Section>
    </div>
  );
};

export default Account;