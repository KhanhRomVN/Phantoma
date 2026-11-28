import type {
  BrowserSession,
  BrowsingEntry,
  IpType,
  NetworkFootprint,
  SessionSite,
} from '../../../shared/types';

export function sessionToFootprint(s: BrowserSession): NetworkFootprint {
  const ip = s.ip;
  const fp = s.footprint;
  const endAt = s.endedAt ?? new Date().toISOString();
  const ipType: IpType = ip?.vpn || ip?.proxy ? 'vpn' : ip?.hosting ? 'datacenter' : ip?.mobile ? 'mobile' : 'residential';
  return {
    id: s.id,
    ip: ip?.ip ?? '',
    country: ip?.country ?? '',
    city: ip?.city ?? '',
    isp: ip?.isp ?? '',
    ipType,
    at: s.startedAt,
    lastSeenAt: endAt,
    sessions: 1,
    durationMin: Math.max(0, Math.round((Date.parse(endAt) - Date.parse(s.startedAt)) / 60000)),
    changed: false,
    device: fp?.name ?? '',
    platform: fp?.os ?? '',
    browser: fp?.browser ?? s.browser,
    screen: fp?.screen ?? '',
    language: fp?.lang ?? '',
    timezone: ip?.timezone ?? fp?.tz ?? '',
    userAgent: fp?.userAgent ?? '',
  };
}

// Same URL seen in several sessions of one footprint: visits and time add up, first/last visit keep the widest range
export function mergeSessionSites(lists: SessionSite[][]): SessionSite[] {
  const map = new Map<string, SessionSite>();
  for (const s of lists.flat()) {
    const g = map.get(s.url);
    if (!g) {
      map.set(s.url, { ...s });
      continue;
    }
    g.visits += s.visits;
    g.durationSec += s.durationSec;
    if (Date.parse(s.firstAt) < Date.parse(g.firstAt)) g.firstAt = s.firstAt;
    if (Date.parse(s.lastAt) > Date.parse(g.lastAt)) {
      g.lastAt = s.lastAt;
      g.title = s.title;
    }
  }
  return [...map.values()].sort((a, b) => Date.parse(b.lastAt) - Date.parse(a.lastAt));
}

export function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const min = Math.round(sec / 60);
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)}h ${pad(min % 60)}m`;
}

export function getHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

const pad = (n: number): string => String(n).padStart(2, '0');

export function toDayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function footprintLabel(f: NetworkFootprint): string {
  return `${f.ip} · ${f.device}`;
}

export interface SiteFootprintGroup {
  host: string;
  title: string;
  url: string;
  totalVisits: number;
  lastAt: string;
  footprintIds: string[];
  mixed: boolean;
}

export function groupSitesByFootprint(browsing: BrowsingEntry[]): SiteFootprintGroup[] {
  const sorted = [...browsing].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const map = new Map<string, SiteFootprintGroup>();
  for (const b of sorted) {
    const host = getHost(b.url);
    const g = map.get(host);
    if (!g) {
      map.set(host, {
        host,
        title: b.title,
        url: b.url,
        totalVisits: b.visits,
        lastAt: b.at,
        footprintIds: [b.footprintId],
        mixed: false,
      });
      continue;
    }
    g.totalVisits += b.visits;
    g.lastAt = b.at;
    g.title = b.title;
    g.url = b.url;
    if (!g.footprintIds.includes(b.footprintId)) g.footprintIds.push(b.footprintId);
    g.mixed = g.footprintIds.length > 1;
  }
  return [...map.values()].sort((a, b) => {
    if (a.mixed !== b.mixed) return a.mixed ? -1 : 1;
    return Date.parse(b.lastAt) - Date.parse(a.lastAt);
  });
}