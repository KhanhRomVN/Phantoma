import { createLogger } from '../utils/logger';

const logger = createLogger('IpLookupService');

export interface IpInfoExtra {
  type: string;
  continent: string;
  continentCode: string;
  callingCode: string;
  capital: string;
  borders: string;
  domain: string;
  registry: string;
  route: string;
  registryCountry: string;
  currencyName: string;
  currencyCode: string;
  currencySymbol: string;
  tzAbbr: string;
  tzUtc: string;
  isEu: boolean | null;
  isDst: boolean | null;
  vpn: boolean | null;
  tor: boolean | null;
  anonymous: boolean | null;
}

export interface IpInfo extends IpInfoExtra {
  ip: string;
  country: string;
  countryCode: string;
  region: string;
  city: string;
  zip: string;
  lat: number;
  lon: number;
  timezone: string;
  isp: string;
  org: string;
  asn: string;
  asName: string;
  proxy: boolean | null;
  hosting: boolean | null;
  mobile: boolean | null;
  sources: string[];
}

type Targets = 'any' | 'ip' | 'none';

interface IpProvider {
  id: string;
  targets: Targets;
  fetch: (query: string) => Promise<IpInfo>;
}

const TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 10 * 60 * 1000; // ASSUMED: ip-api free tier is 45 req/min, so results are cached per target — upgrade path: persist the cache in sqlite
const IP_RE = /^(\d{1,3}\.){3}\d{1,3}$/;

const BLANK_EXTRA: IpInfoExtra = {
  type: '',
  continent: '',
  continentCode: '',
  callingCode: '',
  capital: '',
  borders: '',
  domain: '',
  registry: '',
  route: '',
  registryCountry: '',
  currencyName: '',
  currencyCode: '',
  currencySymbol: '',
  tzAbbr: '',
  tzUtc: '',
  isEu: null,
  isDst: null,
  vpn: null,
  tor: null,
  anonymous: null,
};

const cache = new Map<string, { at: number; info: IpInfo }>();

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

const asnLabel = (n: number | string | null | undefined): string => {
  if (n === null || n === undefined || n === '') return '';
  return typeof n === 'number' ? `AS${n}` : n;
};

interface IpApiRaw {
  status: string;
  message?: string;
  query: string;
  country: string;
  countryCode: string;
  regionName: string;
  city: string;
  zip: string;
  lat: number;
  lon: number;
  timezone: string;
  isp: string;
  org: string;
  as: string;
  asname: string;
  mobile: boolean;
  proxy: boolean;
  hosting: boolean;
}

const IP_API_FIELDS =
  'status,message,country,countryCode,regionName,city,zip,lat,lon,timezone,isp,org,as,asname,mobile,proxy,hosting,query';

const ipApi: IpProvider = {
  id: 'ip-api.com',
  targets: 'any',
  fetch: async (query) => {
    const d = await getJson<IpApiRaw>(
      `http://ip-api.com/json/${encodeURIComponent(query)}?fields=${IP_API_FIELDS}`,
    );
    if (d.status !== 'success') throw new Error(d.message ?? 'lookup failed');
    return {
      ...BLANK_EXTRA,
      ip: d.query,
      country: d.country,
      countryCode: d.countryCode,
      region: d.regionName,
      city: d.city,
      zip: d.zip,
      lat: d.lat,
      lon: d.lon,
      timezone: d.timezone,
      isp: d.isp,
      org: d.org,
      asn: d.as.split(' ')[0] ?? '',
      asName: d.asname,
      proxy: d.proxy,
      hosting: d.hosting,
      mobile: d.mobile,
      sources: ['ip-api.com'],
    };
  },
};

interface IpWhoRaw {
  ip: string;
  success: boolean;
  message?: string;
  type?: string;
  continent?: string;
  continent_code?: string;
  country: string;
  country_code: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
  is_eu?: boolean;
  postal: string;
  calling_code?: string;
  capital?: string;
  borders?: string;
  connection: { asn: number; org: string; isp: string; domain?: string };
  timezone: { id: string; abbr?: string; is_dst?: boolean; utc?: string };
}

const ipWho: IpProvider = {
  id: 'ipwho.is',
  targets: 'ip',
  fetch: async (query) => {
    const d = await getJson<IpWhoRaw>(`https://ipwho.is/${encodeURIComponent(query)}`);
    if (!d.success) throw new Error(d.message ?? 'lookup failed');
    return {
      ...BLANK_EXTRA,
      ip: d.ip,
      type: d.type ?? '',
      continent: d.continent ?? '',
      continentCode: d.continent_code ?? '',
      country: d.country,
      countryCode: d.country_code,
      region: d.region,
      city: d.city,
      zip: d.postal,
      lat: d.latitude,
      lon: d.longitude,
      isEu: d.is_eu ?? null,
      callingCode: d.calling_code ?? '',
      capital: d.capital ?? '',
      borders: d.borders ?? '',
      domain: d.connection?.domain ?? '',
      timezone: d.timezone?.id ?? '',
      tzAbbr: d.timezone?.abbr ?? '',
      tzUtc: d.timezone?.utc ?? '',
      isDst: d.timezone?.is_dst ?? null,
      isp: d.connection?.isp ?? '',
      org: d.connection?.org ?? '',
      asn: asnLabel(d.connection?.asn),
      asName: d.connection?.org ?? '',
      proxy: null,
      hosting: null,
      mobile: null,
      sources: ['ipwho.is'],
    };
  },
};

interface IpDataRaw {
  ip: string;
  success: boolean;
  message?: string;
  type?: string;
  continent?: string;
  continent_code?: string;
  country: string;
  country_code: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
  is_eu?: boolean;
  timezone: string;
  zip?: string;
  postal?: string;
  calling_code?: string;
  capital?: string;
  borders?: string;
  asn: number;
  asn_org: string;
  isp: string;
  registry?: string;
  network?: { as_name?: string; route?: string; registry_country?: string };
  time_zone?: { abbr?: string; is_dst?: boolean; utc?: string };
  currency?: { name?: string; code?: string; symbol?: string };
  security?: { anonymous: boolean; proxy: boolean; vpn: boolean; tor: boolean; hosting: boolean };
}

// ASSUMED: ipdata.info only resolves the caller's own IP (same as the renderer service)
const ipData: IpProvider = {
  id: 'ipdata.info',
  targets: 'none',
  fetch: async () => {
    const d = await getJson<IpDataRaw>('https://ipdata.info/json');
    if (d.success === false) throw new Error(d.message ?? 'lookup failed');
    const s = d.security;
    return {
      ip: d.ip,
      type: d.type ?? '',
      continent: d.continent ?? '',
      continentCode: d.continent_code ?? '',
      country: d.country,
      countryCode: d.country_code,
      region: d.region,
      city: d.city,
      zip: d.zip || d.postal || '',
      lat: d.latitude,
      lon: d.longitude,
      isEu: d.is_eu ?? null,
      callingCode: d.calling_code ?? '',
      capital: d.capital ?? '',
      borders: d.borders ?? '',
      domain: '',
      registry: d.registry ?? '',
      route: d.network?.route ?? '',
      registryCountry: d.network?.registry_country ?? '',
      currencyName: d.currency?.name ?? '',
      currencyCode: d.currency?.code ?? '',
      currencySymbol: d.currency?.symbol ?? '',
      timezone: d.timezone,
      tzAbbr: d.time_zone?.abbr ?? '',
      tzUtc: d.time_zone?.utc ?? '',
      isDst: d.time_zone?.is_dst ?? null,
      isp: d.isp,
      org: d.asn_org,
      asn: asnLabel(d.asn),
      asName: d.network?.as_name ?? d.asn_org,
      proxy: s ? s.proxy : null,
      vpn: s ? s.vpn : null,
      tor: s ? s.tor : null,
      anonymous: s ? s.anonymous : null,
      hosting: s ? s.hosting : null,
      mobile: null,
      sources: ['ipdata.info'],
    };
  },
};

interface GetMyIpRaw {
  ip: string;
  ip_version?: number;
  country: string;
  country_code: string;
  region: string;
  city: string;
  postal: string;
  latitude: number;
  longitude: number;
  timezone: string;
  asn: number;
  org: string;
}

// ASSUMED: getmyip.pro only resolves the caller's own IP (same as the renderer service)
const getMyIp: IpProvider = {
  id: 'getmyip.pro',
  targets: 'none',
  fetch: async () => {
    const d = await getJson<GetMyIpRaw>('https://api.getmyip.pro/v1/json');
    if (!d.ip) throw new Error('lookup failed');
    return {
      ...BLANK_EXTRA,
      ip: d.ip,
      type: d.ip_version ? `IPv${d.ip_version}` : '',
      country: d.country,
      countryCode: d.country_code,
      region: d.region,
      city: d.city,
      zip: d.postal,
      lat: d.latitude,
      lon: d.longitude,
      timezone: d.timezone,
      isp: d.org,
      org: d.org,
      asn: asnLabel(d.asn),
      asName: d.org,
      proxy: null,
      hosting: null,
      mobile: null,
      sources: ['getmyip.pro'],
    };
  },
};

// order = priority on a tie; ip-api goes first because it carries proxy/hosting/mobile
const PROVIDERS: IpProvider[] = [ipApi, ipWho, ipData, getMyIp];

function canQuery(provider: IpProvider, target: string | null): boolean {
  if (target === null) return true;
  if (provider.targets === 'any') return true;
  return provider.targets === 'ip' && (IP_RE.test(target) || target.includes(':'));
}

function vote<T>(values: T[], norm: (v: T) => string): T | null {
  const groups = new Map<string, { first: T; count: number }>();
  for (const v of values) {
    const k = norm(v);
    if (!k) continue;
    const g = groups.get(k);
    if (g) g.count++;
    else groups.set(k, { first: v, count: 1 });
  }
  let best: { first: T; count: number } | null = null;
  for (const g of groups.values()) if (!best || g.count > best.count) best = g;
  return best ? best.first : null;
}

function mergeInfos(list: IpInfo[]): IpInfo {
  const str = (pick: (i: IpInfo) => string): string =>
    vote(list.map(pick), (v) => (v ?? '').trim().toLowerCase()) ?? '';
  const flag = (pick: (i: IpInfo) => boolean | null): boolean | null =>
    vote(
      list.map(pick).filter((v): v is boolean => v !== null),
      String,
    );
  const coords =
    vote(
      list.filter((i) => Number.isFinite(i.lat) && Number.isFinite(i.lon)),
      (i) => `${i.lat.toFixed(1)},${i.lon.toFixed(1)}`,
    ) ?? list[0];

  return {
    ip: str((i) => i.ip),
    type: str((i) => i.type),
    continent: str((i) => i.continent),
    continentCode: str((i) => i.continentCode),
    country: str((i) => i.country),
    countryCode: str((i) => i.countryCode),
    region: str((i) => i.region),
    city: str((i) => i.city),
    zip: str((i) => i.zip),
    lat: coords.lat,
    lon: coords.lon,
    isEu: flag((i) => i.isEu),
    callingCode: str((i) => i.callingCode),
    capital: str((i) => i.capital),
    borders: str((i) => i.borders),
    timezone: str((i) => i.timezone),
    tzAbbr: str((i) => i.tzAbbr),
    tzUtc: str((i) => i.tzUtc),
    isDst: flag((i) => i.isDst),
    currencyName: str((i) => i.currencyName),
    currencyCode: str((i) => i.currencyCode),
    currencySymbol: str((i) => i.currencySymbol),
    isp: str((i) => i.isp),
    org: str((i) => i.org),
    domain: str((i) => i.domain),
    asn: str((i) => i.asn),
    asName: str((i) => i.asName),
    registry: str((i) => i.registry),
    route: str((i) => i.route),
    registryCountry: str((i) => i.registryCountry),
    proxy: flag((i) => i.proxy),
    vpn: flag((i) => i.vpn),
    tor: flag((i) => i.tor),
    anonymous: flag((i) => i.anonymous),
    hosting: flag((i) => i.hosting),
    mobile: flag((i) => i.mobile),
    sources: list.flatMap((i) => i.sources),
  };
}

// Queries every suitable service in parallel and merges the answers by vote; rejects only when all of them fail.
// target = null looks up the public IP of this server.
export async function lookupIp(target: string | null, force = false): Promise<IpInfo> {
  const key = target ?? 'self';
  const hit = cache.get(key);
  if (hit && !force && Date.now() - hit.at < CACHE_TTL_MS) return hit.info;

  const providers = PROVIDERS.filter((p) => canQuery(p, target));
  const results: (IpInfo | null)[] = providers.map(() => null);
  const errors: string[] = [];

  await Promise.all(
    providers.map(async (provider, i) => {
      try {
        results[i] = await provider.fetch(target ?? '');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'failed';
        errors.push(`${provider.id}: ${msg}`);
        logger.warn(`[DEBUG] lookup ${key} failed on ${provider.id}: ${msg}`);
      }
    }),
  );

  const ok = results.filter((r): r is IpInfo => r !== null);
  if (ok.length === 0) throw new Error(`All IP services failed (${errors.join('; ')})`);
  const info = mergeInfos(ok);
  cache.set(key, { at: Date.now(), info });
  return info;
}

export const ipLookupService = { lookup: lookupIp };
