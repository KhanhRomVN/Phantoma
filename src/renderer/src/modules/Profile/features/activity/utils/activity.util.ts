import type { Profile } from '../../../shared/types';

export type ActivityKind = 'script' | 'browse' | 'device';

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  text: string;
  at: string;
  title?: string;
  url?: string;
}

export function getActivities(p: Profile): ActivityItem[] {
  const items: ActivityItem[] = [
    ...p.scripts.map(
      (s): ActivityItem => ({ id: s.id, kind: 'script', text: `Ran ${s.scriptName} (${s.status})`, at: s.at }),
    ),
    ...p.browsing.map(
      (b): ActivityItem => ({
        id: b.id,
        kind: 'browse',
        text: `Browsed ${b.title}`,
        at: b.at,
        title: b.title,
        url: b.url,
      }),
    ),
    ...p.devices.map(
      (d): ActivityItem => ({ id: d.id, kind: 'device', text: `${d.action} on ${d.device}`, at: d.at }),
    ),
  ];
  return items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}