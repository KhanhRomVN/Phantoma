import React, { useMemo, useState } from 'react';
import { BellOff } from 'lucide-react';
import { MOCK_NOTIFICATIONS } from '../../mock/mockData';
import type { NotificationGroup } from '../../types';
import { Badge, PageHeader, Row, Section, SoftButton, Toggle } from '../shared';

const Notifications: React.FC = () => {
  const [groups, setGroups] = useState<NotificationGroup[]>(MOCK_NOTIFICATIONS);

  const enabledCount = useMemo(
    () => groups.reduce((n, g) => n + g.items.filter((i) => i.enabled).length, 0),
    [groups],
  );
  const total = useMemo(() => groups.reduce((n, g) => n + g.items.length, 0), [groups]);

  const toggle = (groupId: string, itemId: string, value: boolean) =>
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, items: g.items.map((i) => (i.id === itemId ? { ...i, enabled: value } : i)) }
          : g,
      ),
    );

  const muteAll = () =>
    setGroups((prev) => prev.map((g) => ({ ...g, items: g.items.map((i) => ({ ...i, enabled: false })) })));

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Notifications"
        description="Choose what Phantoma tells you and how."
        actions={
          <>
            <Badge tone="primary">
              {enabledCount}/{total} on
            </Badge>
            <SoftButton tone="muted" onClick={muteAll} disabled={enabledCount === 0}>
              <BellOff className="h-3.5 w-3.5" />
              Mute all
            </SoftButton>
          </>
        }
      />

      {groups.map((g) => (
        <Section key={g.id} title={g.title}>
          {g.items.map((i) => (
            <Row key={i.id} label={i.label} description={i.description}>
              <Toggle checked={i.enabled} onChange={(v) => toggle(g.id, i.id, v)} />
            </Row>
          ))}
        </Section>
      ))}
    </div>
  );
};

export default Notifications;