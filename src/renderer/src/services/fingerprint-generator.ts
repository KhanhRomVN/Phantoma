import type { Tone } from '@renderer/modules/Profile/types/ui.types';

// ============================================================================
// SECTION 1 — TYPES
// ============================================================================

export type OsFamily = 'windows' | 'macos' | 'linux' | 'android' | 'ios';
export type BrowserName = 'Chrome' | 'Edge' | 'Firefox' | 'Safari' | 'Opera' | 'Brave';
export type DeviceClass = 'desktop' | 'laptop' | 'tablet' | 'mobile';
export type IpType = 'residential' | 'mobile' | 'hosting' | 'proxy' | 'vpn' | 'tor' | 'unknown';

export interface IpInfo {
  ip: string;
  countryCode?: string;
  region?: string;
  city?: string;
  timezone?: string;
  lat?: number;
  lon?: number;
  mobile?: boolean;
  hosting?: boolean;
  proxy?: boolean;
  vpn?: boolean;
  tor?: boolean;
  asn?: number;
  isp?: string;
}

export interface TrustFactors {
  ipType: number;
  geoConsistency: number;
  hardwareCoherence: number;
  languageConsistency: number;
  timezoneConsistency: number;
  browserPopularity: number;
  entropy: number;
  /** 0 = extremely common, 1 = extremely rare (distinctive). */
  rarity: number;
  anomalyPenalty: number;
}

export interface Anomaly {
  code: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  field?: string;
  delta?: number;
}

export interface FootprintPreset {
  id: string;
  name: string;
  family: OsFamily;
  deviceClass: DeviceClass;
  os: string;
  browser: string;
  browserMajor: number;
  screen: string;
  dpr?: number;
  gpu: string;
  cores: number;
  memory: number;
  lang: string;
  tz: string;
  cc: string;
  usage: number;
  tag: string;
  tone: Tone;
  trust?: number;
  reasons?: string[];
  geo?: [number, number];
  anomalies?: Anomaly[];
  entropy?: number;
  uniqueness?: string;
  fingerprintHash?: string;
}

export interface DetailField {
  label: string;
  value: string;
  rare?: boolean;
}

export interface FingerprintSection {
  id: string;
  title: string;
  tone: Tone;
  fields: DetailField[];
}

export interface FingerprintReport {
  sections: FingerprintSection[];
  trust: number;
  entropy: number;
  uniqueness: string;
  botProbability: number;
  anomalies: Anomaly[];
  factors: TrustFactors;
  hash: string;
}

// ============================================================================
// SECTION 2 — HASH / PRNG UTILITIES
// ============================================================================

/** FNV-1a 32-bit — dùng cho seeding ổn định. */
export function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** MurmurHash3 32-bit — phân bố tốt hơn cho entropy. */
export function murmur3(str: string, seed = 0x9747b28c): number {
  let h = seed >>> 0;
  const c1 = 0xcc9e2d51;
  const c2 = 0x1b873593;
  const len = str.length;
  let i = 0;
  for (; i + 4 <= len; i += 4) {
    let k =
      (str.charCodeAt(i) & 0xff) |
      ((str.charCodeAt(i + 1) & 0xff) << 8) |
      ((str.charCodeAt(i + 2) & 0xff) << 16) |
      ((str.charCodeAt(i + 3) & 0xff) << 24);
    k = Math.imul(k, c1);
    k = (k << 15) | (k >>> 17);
    k = Math.imul(k, c2);
    h ^= k;
    h = (h << 13) | (h >>> 19);
    h = (Math.imul(h, 5) + 0xe6546b64) | 0;
  }
  let k = 0;
  switch (len & 3) {
    case 3:
      k ^= (str.charCodeAt(i + 2) & 0xff) << 16;
    // falls through
    case 2:
      k ^= (str.charCodeAt(i + 1) & 0xff) << 8;
    // falls through
    case 1:
      k ^= str.charCodeAt(i) & 0xff;
      k = Math.imul(k, c1);
      k = (k << 15) | (k >>> 17);
      k = Math.imul(k, c2);
      h ^= k;
  }
  h ^= len;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** xorshift32 PRNG — sinh số giả ngẫu nhiên xác định từ seed. */
export class SeededRandom {
  private state: number;
  constructor(seed: number) {
    this.state = seed === 0 ? 0xdeadbeef : seed >>> 0;
  }
  next(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return this.state;
  }
  nextFloat(): number {
    return this.next() / 0x100000000;
  }
  nextInt(max: number): number {
    return this.next() % max;
  }
  nextRange(min: number, max: number): number {
    return min + this.nextInt(max - min + 1);
  }
  /** Số thực trong khoảng [min, max). */
  nextFloatRange(min: number, max: number): number {
    return min + this.nextFloat() * (max - min);
  }
  pick<T>(arr: readonly T[]): T {
    return arr[this.nextInt(arr.length)];
  }
  weighted<T>(arr: readonly [T, number][]): T {
    if (arr.length === 0) throw new Error('SeededRandom.weighted: empty array');
    const total = arr.reduce((s, [, w]) => s + w, 0);
    let r = this.nextFloat() * total;
    for (const [v, w] of arr) {
      r -= w;
      if (r <= 0) return v;
    }
    return arr[arr.length - 1][0];
  }
}

export const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));
export const yn = (v: boolean): string => (v ? 'Yes' : 'No');
export const hex = (n: number, pad = 8): string => (n >>> 0).toString(16).padStart(pad, '0');

/**
 * Haversine — khoảng cách (km) giữa 2 toạ độ.
 * Dùng cho geo consistency (#9) thay vì `hypot` trên độ.
 */
export const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const rad = (d: number): number => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
};

// ============================================================================
// SECTION 3 — GEO / TIMEZONE DATABASE
// ============================================================================

export const TZ_OFFSET: Record<string, number> = {
  'America/New_York': 300,
  'America/Chicago': 360,
  'America/Denver': 420,
  'America/Los_Angeles': 480,
  'America/Phoenix': 420,
  'America/Anchorage': 540,
  'Pacific/Honolulu': 600,
  'America/Toronto': 300,
  'America/Vancouver': 480,
  'America/Mexico_City': 360,
  'America/Bogota': 300,
  'America/Lima': 300,
  'America/Caracas': 240,
  'America/Sao_Paulo': 180,
  'America/Argentina/Buenos_Aires': 180,
  'America/Santiago': 240,
  'Europe/London': 0,
  'Europe/Dublin': 0,
  'Europe/Lisbon': 0,
  'Europe/Berlin': -60,
  'Europe/Paris': -60,
  'Europe/Madrid': -60,
  'Europe/Rome': -60,
  'Europe/Amsterdam': -60,
  'Europe/Brussels': -60,
  'Europe/Vienna': -60,
  'Europe/Stockholm': -60,
  'Europe/Oslo': -60,
  'Europe/Copenhagen': -60,
  'Europe/Warsaw': -60,
  'Europe/Prague': -60,
  'Europe/Budapest': -60,
  'Europe/Zurich': -60,
  'Europe/Athens': -120,
  'Europe/Helsinki': -120,
  'Europe/Bucharest': -120,
  'Europe/Kiev': -120,
  'Europe/Kyiv': -120,
  'Europe/Moscow': -180,
  'Europe/Istanbul': -180,
  'Asia/Jerusalem': -120,
  'Asia/Riyadh': -180,
  'Asia/Dubai': -240,
  'Asia/Karachi': -300,
  'Asia/Kolkata': -330,
  'Asia/Dhaka': -360,
  'Asia/Bangkok': -420,
  'Asia/Ho_Chi_Minh': -420,
  'Asia/Jakarta': -420,
  'Asia/Kuala_Lumpur': -480,
  'Asia/Singapore': -480,
  'Asia/Manila': -480,
  'Asia/Hong_Kong': -480,
  'Asia/Shanghai': -480,
  'Asia/Taipei': -480,
  'Asia/Seoul': -540,
  'Asia/Tokyo': -540,
  'Australia/Perth': -480,
  'Australia/Brisbane': -600,
  'Australia/Sydney': -660,
  'Australia/Melbourne': -660,
  'Pacific/Auckland': -720,
  'Africa/Cairo': -120,
  'Africa/Johannesburg': -120,
  'Africa/Lagos': -60,
  'Africa/Nairobi': -180,
};

/**
 * Offset (phút, quy ước getTimezoneOffset) tại thời điểm `at`, tự xử lý DST.
 * Fallback về `TZ_OFFSET[tz] ?? 0` khi runtime không hỗ trợ Intl timezone.
 */
export function tzOffsetMinutes(tz: string, at: Date = new Date()): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    }).formatToParts(at);
    const v: Record<string, number> = {};
    for (const x of parts) if (x.type !== 'literal') v[x.type] = Number(x.value);
    const asUtc = Date.UTC(v.year, v.month - 1, v.day, v.hour, v.minute, v.second);
    const t = Math.floor(at.getTime() / 1000) * 1000;
    return Math.round((t - asUtc) / 60000);
  } catch {
    return TZ_OFFSET[tz] ?? 0;
  }
}

/** Region (phần đầu của IANA TZ) tương ứng với mỗi country code — dùng cho consistency check. */
export const CC_TO_TZ_REGION: Record<string, string> = {
  US: 'America',
  CA: 'America',
  MX: 'America',
  BR: 'America',
  AR: 'America',
  CL: 'America',
  CO: 'America',
  PE: 'America',
  VE: 'America',
  GB: 'Europe',
  IE: 'Europe',
  DE: 'Europe',
  FR: 'Europe',
  ES: 'Europe',
  IT: 'Europe',
  NL: 'Europe',
  BE: 'Europe',
  SE: 'Europe',
  NO: 'Europe',
  DK: 'Europe',
  FI: 'Europe',
  PL: 'Europe',
  CZ: 'Europe',
  AT: 'Europe',
  CH: 'Europe',
  PT: 'Europe',
  GR: 'Europe',
  RU: 'Europe',
  TR: 'Europe',
  UA: 'Europe',
  RO: 'Europe',
  HU: 'Europe',
  VN: 'Asia',
  TH: 'Asia',
  ID: 'Asia',
  MY: 'Asia',
  SG: 'Asia',
  PH: 'Asia',
  JP: 'Asia',
  KR: 'Asia',
  CN: 'Asia',
  TW: 'Asia',
  HK: 'Asia',
  IN: 'Asia',
  PK: 'Asia',
  BD: 'Asia',
  AE: 'Asia',
  SA: 'Asia',
  IL: 'Asia',
  EG: 'Africa',
  ZA: 'Africa',
  NG: 'Africa',
  KE: 'Africa',
  AU: 'Australia',
  NZ: 'Pacific',
};

export const GEO: Record<string, [number, number]> = {
  US: [40.7128, -74.006],
  GB: [51.5074, -0.1278],
  IE: [53.3498, -6.2603],
  DE: [52.52, 13.405],
  FR: [48.8566, 2.3522],
  ES: [40.4168, -3.7038],
  IT: [41.9028, 12.4964],
  NL: [52.3676, 4.9041],
  BE: [50.8503, 4.3517],
  SE: [59.3293, 18.0686],
  NO: [59.9139, 10.7522],
  DK: [55.6761, 12.5683],
  FI: [60.1699, 24.9384],
  PL: [52.2297, 21.0122],
  CZ: [50.0755, 14.4378],
  AT: [48.2082, 16.3738],
  CH: [46.948, 7.4474],
  PT: [38.7223, -9.1393],
  GR: [37.9838, 23.7275],
  HU: [47.4979, 19.0402],
  RU: [55.7558, 37.6173],
  TR: [41.0082, 28.9784],
  UA: [50.4501, 30.5234],
  RO: [44.4268, 26.1025],
  CA: [43.6532, -79.3832],
  MX: [19.4326, -99.1332],
  BR: [-23.5505, -46.6333],
  AR: [-34.6037, -58.3816],
  CL: [-33.4489, -70.6693],
  CO: [4.711, -74.0721],
  PE: [-12.0464, -77.0428],
  VE: [10.4806, -66.9036],
  VN: [10.8231, 106.6297],
  TH: [13.7563, 100.5018],
  ID: [-6.2088, 106.8456],
  MY: [3.139, 101.6869],
  SG: [1.3521, 103.8198],
  PH: [14.5995, 120.9842],
  JP: [35.6762, 139.6503],
  KR: [37.5665, 126.978],
  CN: [39.9042, 116.4074],
  TW: [25.033, 121.5654],
  HK: [22.3193, 114.1694],
  IN: [19.076, 72.8777],
  PK: [24.8607, 67.0011],
  BD: [23.8103, 90.4125],
  AE: [25.2048, 55.2708],
  SA: [24.7136, 46.6753],
  IL: [32.0853, 34.7818],
  EG: [30.0444, 31.2357],
  ZA: [-26.2041, 28.0473],
  NG: [6.5244, 3.3792],
  KE: [-1.2921, 36.8219],
  AU: [-33.8688, 151.2093],
  NZ: [-36.8485, 174.7633],
};

// ============================================================================
// SECTION 4 — LANGUAGE / REGION DATABASE
// ============================================================================

export interface LocaleProfile {
  primary: string;
  secondary: string[];
  /** Cùng độ dài với `secondary`. */
  weights: number[];
}

export const LOCALE_DATABASE: Record<string, LocaleProfile> = {
  US: { primary: 'en-US', secondary: ['en', 'es-MX'], weights: [0.1, 0.05] },
  GB: { primary: 'en-GB', secondary: ['en', 'fr-FR'], weights: [0.1, 0.02] },
  CA: { primary: 'en-CA', secondary: ['fr-CA', 'en'], weights: [0.22, 0.03] },
  AU: { primary: 'en-AU', secondary: ['en', 'zh-CN'], weights: [0.12, 0.03] },
  NZ: { primary: 'en-NZ', secondary: ['en', 'mi'], weights: [0.1, 0.02] },
  IE: { primary: 'en-IE', secondary: ['en', 'ga'], weights: [0.13, 0.02] },
  DE: { primary: 'de-DE', secondary: ['en', 'tr-TR'], weights: [0.14, 0.04] },
  AT: { primary: 'de-AT', secondary: ['de-DE', 'en'], weights: [0.12, 0.08] },
  CH: { primary: 'de-CH', secondary: ['fr-CH', 'en'], weights: [0.22, 0.13] },
  FR: { primary: 'fr-FR', secondary: ['en', 'ar'], weights: [0.11, 0.04] },
  BE: { primary: 'nl-BE', secondary: ['fr-BE', 'en'], weights: [0.4, 0.05] },
  NL: { primary: 'nl-NL', secondary: ['en', 'de-DE'], weights: [0.14, 0.04] },
  ES: { primary: 'es-ES', secondary: ['ca', 'en'], weights: [0.14, 0.08] },
  PT: { primary: 'pt-PT', secondary: ['en', 'es-ES'], weights: [0.1, 0.05] },
  IT: { primary: 'it-IT', secondary: ['en', 'de-DE'], weights: [0.1, 0.04] },
  SE: { primary: 'sv-SE', secondary: ['en', 'fi-FI'], weights: [0.14, 0.04] },
  NO: { primary: 'nb-NO', secondary: ['en', 'nn-NO'], weights: [0.16, 0.04] },
  DK: { primary: 'da-DK', secondary: ['en', 'de-DE'], weights: [0.14, 0.04] },
  FI: { primary: 'fi-FI', secondary: ['sv-SE', 'en'], weights: [0.1, 0.08] },
  PL: { primary: 'pl-PL', secondary: ['en', 'de-DE'], weights: [0.11, 0.04] },
  CZ: { primary: 'cs-CZ', secondary: ['en', 'sk-SK'], weights: [0.12, 0.05] },
  HU: { primary: 'hu-HU', secondary: ['en', 'de-DE'], weights: [0.11, 0.04] },
  RO: { primary: 'ro-RO', secondary: ['en', 'hu-HU'], weights: [0.11, 0.04] },
  GR: { primary: 'el-GR', secondary: ['en', 'de-DE'], weights: [0.14, 0.04] },
  RU: { primary: 'ru-RU', secondary: ['en', 'uk-UA'], weights: [0.1, 0.04] },
  UA: { primary: 'uk-UA', secondary: ['ru-RU', 'en'], weights: [0.18, 0.07] },
  TR: { primary: 'tr-TR', secondary: ['en', 'ku'], weights: [0.1, 0.04] },
  IL: { primary: 'he-IL', secondary: ['en', 'ar'], weights: [0.14, 0.08] },
  AE: { primary: 'ar-AE', secondary: ['en', 'hi-IN'], weights: [0.32, 0.08] },
  SA: { primary: 'ar-SA', secondary: ['en', 'ur-PK'], weights: [0.14, 0.06] },
  EG: { primary: 'ar-EG', secondary: ['en', 'fr-FR'], weights: [0.12, 0.06] },
  MX: { primary: 'es-MX', secondary: ['en', 'es-ES'], weights: [0.1, 0.05] },
  BR: { primary: 'pt-BR', secondary: ['en', 'es-ES'], weights: [0.1, 0.04] },
  AR: { primary: 'es-AR', secondary: ['en', 'pt-BR'], weights: [0.1, 0.04] },
  CL: { primary: 'es-CL', secondary: ['en', 'es-ES'], weights: [0.1, 0.05] },
  CO: { primary: 'es-CO', secondary: ['en', 'es-ES'], weights: [0.1, 0.04] },
  PE: { primary: 'es-PE', secondary: ['en', 'es-ES'], weights: [0.1, 0.05] },
  VE: { primary: 'es-VE', secondary: ['en'], weights: [0.08] },
  VN: { primary: 'vi-VN', secondary: ['en', 'zh-CN'], weights: [0.11, 0.04] },
  TH: { primary: 'th-TH', secondary: ['en', 'zh-CN'], weights: [0.13, 0.05] },
  ID: { primary: 'id-ID', secondary: ['en', 'jv-ID'], weights: [0.13, 0.05] },
  MY: { primary: 'ms-MY', secondary: ['en', 'zh-CN'], weights: [0.3, 0.15] },
  SG: { primary: 'en-SG', secondary: ['zh-CN', 'ms-MY'], weights: [0.3, 0.1] },
  PH: { primary: 'en-PH', secondary: ['tl-PH', 'es-ES'], weights: [0.4, 0.05] },
  JP: { primary: 'ja-JP', secondary: ['en', 'zh-CN'], weights: [0.1, 0.02] },
  KR: { primary: 'ko-KR', secondary: ['en', 'ja-JP'], weights: [0.12, 0.02] },
  CN: { primary: 'zh-CN', secondary: ['en', 'zh-TW'], weights: [0.1, 0.02] },
  TW: { primary: 'zh-TW', secondary: ['zh-CN', 'en'], weights: [0.13, 0.05] },
  HK: { primary: 'zh-HK', secondary: ['en', 'zh-CN'], weights: [0.25, 0.1] },
  IN: { primary: 'en-IN', secondary: ['hi-IN', 'en'], weights: [0.42, 0.08] },
  PK: { primary: 'en-PK', secondary: ['ur-PK'], weights: [0.45] },
  BD: { primary: 'bn-BD', secondary: ['en', 'hi-IN'], weights: [0.15, 0.07] },
  ZA: { primary: 'en-ZA', secondary: ['af-ZA', 'zu-ZA'], weights: [0.2, 0.15] },
  NG: { primary: 'en-NG', secondary: ['yo-NG', 'ha-NG'], weights: [0.2, 0.18] },
  KE: { primary: 'en-KE', secondary: ['sw-KE'], weights: [0.45] },
};

// ============================================================================
// SECTION 5 — GPU DATABASE
// ============================================================================

export interface GpuProfile {
  vendor: 'nvidia' | 'amd' | 'intel' | 'apple' | 'qualcomm' | 'arm' | 'imagination';
  family: string;
  name: string;
  webglVendor: string;
  webglRendererChrome: string;
  webglRendererSafari?: string;
  /** Firefox không dùng ANGLE trên Linux/macOS — string renderer trực tiếp. */
  webglRendererFirefox?: string;
  /** Renderer khi Chrome/Firefox chạy trên Linux (Mesa). */
  webglRendererLinux?: string;
  /** Renderer cho Android Chrome (thường là ANGLE + GLES). */
  webglRendererAndroid?: string;
  integrated: boolean;
  perfTier: 1 | 2 | 3 | 4 | 5;
  platforms: OsFamily[];
  yearsInUse: [number, number];
}

export const GPU_DATABASE: GpuProfile[] = [
  // ---- NVIDIA discrete ----
  {
    vendor: 'nvidia',
    family: 'RTX 40',
    name: 'NVIDIA GeForce RTX 4090',
    webglVendor: 'Google Inc. (NVIDIA)',
    webglRendererChrome: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4090 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    webglRendererFirefox: 'NVIDIA GeForce RTX 4090/PCIe/SSE2',
    integrated: false,
    perfTier: 5,
    platforms: ['windows'],
    yearsInUse: [2022, 2026],
  },
  {
    vendor: 'nvidia',
    family: 'RTX 40',
    name: 'NVIDIA GeForce RTX 4080',
    webglVendor: 'Google Inc. (NVIDIA)',
    webglRendererChrome: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4080 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    webglRendererFirefox: 'NVIDIA GeForce RTX 4080/PCIe/SSE2',
    integrated: false,
    perfTier: 5,
    platforms: ['windows'],
    yearsInUse: [2022, 2026],
  },
  {
    vendor: 'nvidia',
    family: 'RTX 40',
    name: 'NVIDIA GeForce RTX 4070',
    webglVendor: 'Google Inc. (NVIDIA)',
    webglRendererChrome: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    webglRendererFirefox: 'NVIDIA GeForce RTX 4070/PCIe/SSE2',
    integrated: false,
    perfTier: 4,
    platforms: ['windows'],
    yearsInUse: [2023, 2026],
  },
  {
    vendor: 'nvidia',
    family: 'RTX 40',
    name: 'NVIDIA GeForce RTX 4060',
    webglVendor: 'Google Inc. (NVIDIA)',
    webglRendererChrome: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    webglRendererFirefox: 'NVIDIA GeForce RTX 4060/PCIe/SSE2',
    integrated: false,
    perfTier: 4,
    platforms: ['windows'],
    yearsInUse: [2023, 2026],
  },
  {
    vendor: 'nvidia',
    family: 'RTX 30',
    name: 'NVIDIA GeForce RTX 3080',
    webglVendor: 'Google Inc. (NVIDIA)',
    webglRendererChrome: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    webglRendererFirefox: 'NVIDIA GeForce RTX 3080/PCIe/SSE2',
    integrated: false,
    perfTier: 5,
    platforms: ['windows'],
    yearsInUse: [2020, 2026],
  },
  {
    vendor: 'nvidia',
    family: 'RTX 30',
    name: 'NVIDIA GeForce RTX 3070',
    webglVendor: 'Google Inc. (NVIDIA)',
    webglRendererChrome: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    webglRendererFirefox: 'NVIDIA GeForce RTX 3070/PCIe/SSE2',
    integrated: false,
    perfTier: 4,
    platforms: ['windows'],
    yearsInUse: [2020, 2026],
  },
  {
    vendor: 'nvidia',
    family: 'RTX 30',
    name: 'NVIDIA GeForce RTX 3060',
    webglVendor: 'Google Inc. (NVIDIA)',
    webglRendererChrome: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    webglRendererFirefox: 'NVIDIA GeForce RTX 3060/PCIe/SSE2',
    integrated: false,
    perfTier: 3,
    platforms: ['windows'],
    yearsInUse: [2021, 2026],
  },
  {
    vendor: 'nvidia',
    family: 'RTX 30',
    name: 'NVIDIA GeForce RTX 3050',
    webglVendor: 'Google Inc. (NVIDIA)',
    webglRendererChrome: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3050 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    webglRendererFirefox: 'NVIDIA GeForce RTX 3050/PCIe/SSE2',
    integrated: false,
    perfTier: 3,
    platforms: ['windows'],
    yearsInUse: [2022, 2026],
  },
  {
    vendor: 'nvidia',
    family: 'RTX 20',
    name: 'NVIDIA GeForce RTX 2080',
    webglVendor: 'Google Inc. (NVIDIA)',
    webglRendererChrome: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 2080 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    webglRendererFirefox: 'NVIDIA GeForce RTX 2080/PCIe/SSE2',
    integrated: false,
    perfTier: 4,
    platforms: ['windows'],
    yearsInUse: [2018, 2025],
  },
  {
    vendor: 'nvidia',
    family: 'RTX 20',
    name: 'NVIDIA GeForce RTX 2060',
    webglVendor: 'Google Inc. (NVIDIA)',
    webglRendererChrome: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 2060 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    webglRendererFirefox: 'NVIDIA GeForce RTX 2060/PCIe/SSE2',
    integrated: false,
    perfTier: 3,
    platforms: ['windows'],
    yearsInUse: [2019, 2025],
  },
  {
    vendor: 'nvidia',
    family: 'GTX 16',
    name: 'NVIDIA GeForce GTX 1660',
    webglVendor: 'Google Inc. (NVIDIA)',
    webglRendererChrome: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    webglRendererFirefox: 'NVIDIA GeForce GTX 1660/PCIe/SSE2',
    integrated: false,
    perfTier: 3,
    platforms: ['windows'],
    yearsInUse: [2019, 2026],
  },
  {
    vendor: 'nvidia',
    family: 'GTX 16',
    name: 'NVIDIA GeForce GTX 1650',
    webglVendor: 'Google Inc. (NVIDIA)',
    webglRendererChrome: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    webglRendererFirefox: 'NVIDIA GeForce GTX 1650/PCIe/SSE2',
    integrated: false,
    perfTier: 2,
    platforms: ['windows'],
    yearsInUse: [2019, 2026],
  },
  {
    vendor: 'nvidia',
    family: 'GTX 10',
    name: 'NVIDIA GeForce GTX 1080',
    webglVendor: 'Google Inc. (NVIDIA)',
    webglRendererChrome: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1080 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    webglRendererFirefox: 'NVIDIA GeForce GTX 1080/PCIe/SSE2',
    integrated: false,
    perfTier: 3,
    platforms: ['windows'],
    yearsInUse: [2016, 2024],
  },
  {
    vendor: 'nvidia',
    family: 'GTX 10',
    name: 'NVIDIA GeForce GTX 1060',
    webglVendor: 'Google Inc. (NVIDIA)',
    webglRendererChrome:
      'ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 6GB Direct3D11 vs_5_0 ps_5_0, D3D11)',
    webglRendererFirefox: 'NVIDIA GeForce GTX 1060 6GB/PCIe/SSE2',
    integrated: false,
    perfTier: 2,
    platforms: ['windows'],
    yearsInUse: [2016, 2024],
  },

  // ---- AMD discrete ----
  {
    vendor: 'amd',
    family: 'RX 7000',
    name: 'AMD Radeon RX 7900 XTX',
    webglVendor: 'Google Inc. (AMD)',
    webglRendererChrome: 'ANGLE (AMD, AMD Radeon RX 7900 XTX Direct3D11 vs_5_0 ps_5_0, D3D11)',
    webglRendererFirefox: 'AMD Radeon RX 7900 XTX (radeonsi, navi31, LLVM)',
    webglRendererLinux:
      'ANGLE (AMD, AMD Radeon RX 7900 XTX (radeonsi, navi31, LLVM 17.0.6), OpenGL 4.6)',
    integrated: false,
    perfTier: 5,
    platforms: ['windows', 'linux'],
    yearsInUse: [2022, 2026],
  },
  {
    vendor: 'amd',
    family: 'RX 7000',
    name: 'AMD Radeon RX 7800 XT',
    webglVendor: 'Google Inc. (AMD)',
    webglRendererChrome: 'ANGLE (AMD, AMD Radeon RX 7800 XT Direct3D11 vs_5_0 ps_5_0, D3D11)',
    webglRendererFirefox: 'AMD Radeon RX 7800 XT (radeonsi, navi32, LLVM)',
    webglRendererLinux:
      'ANGLE (AMD, AMD Radeon RX 7800 XT (radeonsi, navi32, LLVM 17.0.6), OpenGL 4.6)',
    integrated: false,
    perfTier: 4,
    platforms: ['windows', 'linux'],
    yearsInUse: [2023, 2026],
  },
  {
    vendor: 'amd',
    family: 'RX 7000',
    name: 'AMD Radeon RX 7600',
    webglVendor: 'Google Inc. (AMD)',
    webglRendererChrome: 'ANGLE (AMD, AMD Radeon RX 7600 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    webglRendererFirefox: 'AMD Radeon RX 7600 (radeonsi, navi33, LLVM)',
    webglRendererLinux:
      'ANGLE (AMD, AMD Radeon RX 7600 (radeonsi, navi33, LLVM 17.0.6), OpenGL 4.6)',
    integrated: false,
    perfTier: 3,
    platforms: ['windows', 'linux'],
    yearsInUse: [2023, 2026],
  },
  {
    vendor: 'amd',
    family: 'RX 6000',
    name: 'AMD Radeon RX 6900 XT',
    webglVendor: 'Google Inc. (AMD)',
    webglRendererChrome: 'ANGLE (AMD, AMD Radeon RX 6900 XT Direct3D11 vs_5_0 ps_5_0, D3D11)',
    webglRendererFirefox: 'AMD Radeon RX 6900 XT (radeonsi, navi21, LLVM)',
    webglRendererLinux:
      'ANGLE (AMD, AMD Radeon RX 6900 XT (radeonsi, navi21, LLVM 17.0.6), OpenGL 4.6)',
    integrated: false,
    perfTier: 5,
    platforms: ['windows', 'linux'],
    yearsInUse: [2020, 2025],
  },
  {
    vendor: 'amd',
    family: 'RX 6000',
    name: 'AMD Radeon RX 6800 XT',
    webglVendor: 'Google Inc. (AMD)',
    webglRendererChrome: 'ANGLE (AMD, AMD Radeon RX 6800 XT Direct3D11 vs_5_0 ps_5_0, D3D11)',
    webglRendererFirefox: 'AMD Radeon RX 6800 XT (radeonsi, navi21, LLVM)',
    webglRendererLinux:
      'ANGLE (AMD, AMD Radeon RX 6800 XT (radeonsi, navi21, LLVM 17.0.6), OpenGL 4.6)',
    integrated: false,
    perfTier: 4,
    platforms: ['windows', 'linux'],
    yearsInUse: [2020, 2025],
  },
  {
    vendor: 'amd',
    family: 'RX 6000',
    name: 'AMD Radeon RX 6700 XT',
    webglVendor: 'Google Inc. (AMD)',
    webglRendererChrome: 'ANGLE (AMD, AMD Radeon RX 6700 XT Direct3D11 vs_5_0 ps_5_0, D3D11)',
    webglRendererFirefox: 'AMD Radeon RX 6700 XT (radeonsi, navi22, LLVM)',
    webglRendererLinux:
      'ANGLE (AMD, AMD Radeon RX 6700 XT (radeonsi, navi22, LLVM 17.0.6), OpenGL 4.6)',
    integrated: false,
    perfTier: 3,
    platforms: ['windows', 'linux'],
    yearsInUse: [2021, 2026],
  },
  {
    vendor: 'amd',
    family: 'RX 6000',
    name: 'AMD Radeon RX 6600',
    webglVendor: 'Google Inc. (AMD)',
    webglRendererChrome: 'ANGLE (AMD, AMD Radeon RX 6600 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    webglRendererFirefox: 'AMD Radeon RX 6600 (radeonsi, navi23, LLVM)',
    webglRendererLinux:
      'ANGLE (AMD, AMD Radeon RX 6600 (radeonsi, navi23, LLVM 17.0.6), OpenGL 4.6)',
    integrated: false,
    perfTier: 3,
    platforms: ['windows', 'linux'],
    yearsInUse: [2021, 2026],
  },
  {
    vendor: 'amd',
    family: 'RX 5000',
    name: 'AMD Radeon RX 5700 XT',
    webglVendor: 'Google Inc. (AMD)',
    webglRendererChrome: 'ANGLE (AMD, AMD Radeon RX 5700 XT Direct3D11 vs_5_0 ps_5_0, D3D11)',
    webglRendererFirefox: 'AMD Radeon RX 5700 XT (radeonsi, navi10, LLVM)',
    webglRendererLinux:
      'ANGLE (AMD, AMD Radeon RX 5700 XT (radeonsi, navi10, LLVM 17.0.6), OpenGL 4.6)',
    integrated: false,
    perfTier: 3,
    platforms: ['windows', 'linux'],
    yearsInUse: [2019, 2024],
  },
  {
    vendor: 'amd',
    family: 'RX 500',
    name: 'AMD Radeon RX 580',
    webglVendor: 'Google Inc. (AMD)',
    webglRendererChrome: 'ANGLE (AMD, AMD Radeon RX 580 Series Direct3D11 vs_5_0 ps_5_0, D3D11)',
    webglRendererFirefox: 'AMD Radeon RX 580 Series (radeonsi, polaris10, LLVM)',
    webglRendererLinux:
      'ANGLE (AMD, AMD Radeon RX 580 Series (radeonsi, polaris10, LLVM 17.0.6), OpenGL 4.6)',
    integrated: false,
    perfTier: 2,
    platforms: ['windows', 'linux'],
    yearsInUse: [2017, 2024],
  },

  // ---- Intel ----
  {
    vendor: 'intel',
    family: 'Arc',
    name: 'Intel Arc A770',
    webglVendor: 'Google Inc. (Intel)',
    webglRendererChrome:
      'ANGLE (Intel, Intel(R) Arc(TM) A770 Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)',
    integrated: false,
    perfTier: 3,
    platforms: ['windows'],
    yearsInUse: [2022, 2026],
  },
  {
    vendor: 'intel',
    family: 'Arc',
    name: 'Intel Arc A750',
    webglVendor: 'Google Inc. (Intel)',
    webglRendererChrome:
      'ANGLE (Intel, Intel(R) Arc(TM) A750 Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)',
    integrated: false,
    perfTier: 3,
    platforms: ['windows'],
    yearsInUse: [2022, 2026],
  },
  {
    vendor: 'intel',
    family: 'Iris Xe',
    name: 'Intel Iris Xe Graphics',
    webglVendor: 'Google Inc. (Intel)',
    webglRendererChrome:
      'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)',
    integrated: true,
    perfTier: 2,
    platforms: ['windows'],
    yearsInUse: [2020, 2026],
  },
  {
    vendor: 'intel',
    family: 'UHD',
    name: 'Intel UHD Graphics 770',
    webglVendor: 'Google Inc. (Intel)',
    webglRendererChrome: 'ANGLE (Intel, Intel(R) UHD Graphics 770 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    integrated: true,
    perfTier: 2,
    platforms: ['windows'],
    yearsInUse: [2021, 2026],
  },
  {
    vendor: 'intel',
    family: 'UHD',
    name: 'Intel UHD Graphics 630',
    webglVendor: 'Google Inc. (Intel)',
    webglRendererChrome: 'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    integrated: true,
    perfTier: 1,
    platforms: ['windows'],
    yearsInUse: [2017, 2024],
  },
  {
    vendor: 'intel',
    family: 'UHD',
    name: 'Intel UHD Graphics 620',
    webglVendor: 'Google Inc. (Intel)',
    webglRendererChrome: 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    integrated: true,
    perfTier: 1,
    platforms: ['windows'],
    yearsInUse: [2017, 2024],
  },
  {
    vendor: 'intel',
    family: 'HD',
    name: 'Intel HD Graphics 530',
    webglVendor: 'Google Inc. (Intel)',
    webglRendererChrome: 'ANGLE (Intel, Intel(R) HD Graphics 530 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    integrated: true,
    perfTier: 1,
    platforms: ['windows'],
    yearsInUse: [2015, 2022],
  },
  // Mesa (Linux) — Chromium wraps via ANGLE, Firefox dùng string native
  {
    vendor: 'intel',
    family: 'Mesa',
    name: 'Mesa Intel UHD 630',
    webglVendor: 'Google Inc. (Intel)',
    webglRendererChrome: 'ANGLE (Intel, Mesa Intel(R) UHD Graphics 630 (CFL GT2), OpenGL 4.6)',
    webglRendererFirefox: 'Mesa Intel(R) UHD Graphics 630 (CFL GT2)',
    integrated: true,
    perfTier: 1,
    platforms: ['linux'],
    yearsInUse: [2017, 2024],
  },
  {
    vendor: 'intel',
    family: 'Mesa',
    name: 'Mesa Intel Iris Xe',
    webglVendor: 'Google Inc. (Intel)',
    webglRendererChrome: 'ANGLE (Intel, Mesa Intel(R) Iris(R) Xe Graphics (TGL GT2), OpenGL 4.6)',
    webglRendererFirefox: 'Mesa Intel(R) Iris(R) Xe Graphics (TGL GT2)',
    integrated: true,
    perfTier: 2,
    platforms: ['linux'],
    yearsInUse: [2020, 2026],
  },

  // ---- Apple Silicon (Mac / iPad — M1/M2 dùng trên iPad Pro) ----
  {
    vendor: 'apple',
    family: 'M1',
    name: 'Apple M1',
    webglVendor: 'Google Inc. (Apple)',
    webglRendererChrome: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version)',
    webglRendererSafari: 'Apple GPU',
    webglRendererFirefox: 'Apple M1',
    integrated: true,
    perfTier: 3,
    platforms: ['macos', 'ios'],
    yearsInUse: [2020, 2026],
  },
  {
    vendor: 'apple',
    family: 'M1',
    name: 'Apple M1 Pro',
    webglVendor: 'Google Inc. (Apple)',
    webglRendererChrome: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version)',
    webglRendererSafari: 'Apple GPU',
    webglRendererFirefox: 'Apple M1 Pro',
    integrated: true,
    perfTier: 4,
    platforms: ['macos'],
    yearsInUse: [2021, 2026],
  },
  {
    vendor: 'apple',
    family: 'M1',
    name: 'Apple M1 Max',
    webglVendor: 'Google Inc. (Apple)',
    webglRendererChrome: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Max, Unspecified Version)',
    webglRendererSafari: 'Apple GPU',
    webglRendererFirefox: 'Apple M1 Max',
    integrated: true,
    perfTier: 5,
    platforms: ['macos'],
    yearsInUse: [2021, 2026],
  },
  {
    vendor: 'apple',
    family: 'M2',
    name: 'Apple M2',
    webglVendor: 'Google Inc. (Apple)',
    webglRendererChrome: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)',
    webglRendererSafari: 'Apple GPU',
    webglRendererFirefox: 'Apple M2',
    integrated: true,
    perfTier: 3,
    platforms: ['macos', 'ios'],
    yearsInUse: [2022, 2026],
  },
  {
    vendor: 'apple',
    family: 'M2',
    name: 'Apple M2 Pro',
    webglVendor: 'Google Inc. (Apple)',
    webglRendererChrome: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M2 Pro, Unspecified Version)',
    webglRendererSafari: 'Apple GPU',
    webglRendererFirefox: 'Apple M2 Pro',
    integrated: true,
    perfTier: 4,
    platforms: ['macos'],
    yearsInUse: [2023, 2026],
  },
  {
    vendor: 'apple',
    family: 'M2',
    name: 'Apple M2 Max',
    webglVendor: 'Google Inc. (Apple)',
    webglRendererChrome: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M2 Max, Unspecified Version)',
    webglRendererSafari: 'Apple GPU',
    webglRendererFirefox: 'Apple M2 Max',
    integrated: true,
    perfTier: 5,
    platforms: ['macos'],
    yearsInUse: [2023, 2026],
  },
  {
    vendor: 'apple',
    family: 'M3',
    name: 'Apple M3',
    webglVendor: 'Google Inc. (Apple)',
    webglRendererChrome: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M3, Unspecified Version)',
    webglRendererSafari: 'Apple GPU',
    webglRendererFirefox: 'Apple M3',
    integrated: true,
    perfTier: 4,
    platforms: ['macos'],
    yearsInUse: [2023, 2026],
  },
  {
    vendor: 'apple',
    family: 'M3',
    name: 'Apple M3 Pro',
    webglVendor: 'Google Inc. (Apple)',
    webglRendererChrome: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M3 Pro, Unspecified Version)',
    webglRendererSafari: 'Apple GPU',
    webglRendererFirefox: 'Apple M3 Pro',
    integrated: true,
    perfTier: 5,
    platforms: ['macos'],
    yearsInUse: [2023, 2026],
  },
  {
    vendor: 'apple',
    family: 'M3',
    name: 'Apple M3 Max',
    webglVendor: 'Google Inc. (Apple)',
    webglRendererChrome: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M3 Max, Unspecified Version)',
    webglRendererSafari: 'Apple GPU',
    webglRendererFirefox: 'Apple M3 Max',
    integrated: true,
    perfTier: 5,
    platforms: ['macos'],
    yearsInUse: [2023, 2026],
  },
  {
    vendor: 'apple',
    family: 'M4',
    name: 'Apple M4',
    webglVendor: 'Google Inc. (Apple)',
    webglRendererChrome: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M4, Unspecified Version)',
    webglRendererSafari: 'Apple GPU',
    webglRendererFirefox: 'Apple M4',
    integrated: true,
    perfTier: 4,
    platforms: ['macos', 'ios'],
    yearsInUse: [2024, 2027],
  },

  // ---- Apple A-series (iPhone) ----
  {
    vendor: 'apple',
    family: 'A15',
    name: 'Apple A15 Bionic GPU',
    webglVendor: 'Apple Inc.',
    webglRendererChrome: 'ANGLE (Apple, ANGLE Metal Renderer: Apple A15 GPU, Unspecified Version)',
    webglRendererSafari: 'Apple GPU',
    integrated: true,
    perfTier: 2,
    platforms: ['ios'],
    yearsInUse: [2021, 2024],
  },
  {
    vendor: 'apple',
    family: 'A16',
    name: 'Apple A16 Bionic GPU',
    webglVendor: 'Apple Inc.',
    webglRendererChrome: 'ANGLE (Apple, ANGLE Metal Renderer: Apple A16 GPU, Unspecified Version)',
    webglRendererSafari: 'Apple GPU',
    integrated: true,
    perfTier: 3,
    platforms: ['ios'],
    yearsInUse: [2022, 2026],
  },
  {
    vendor: 'apple',
    family: 'A17',
    name: 'Apple A17 Pro GPU',
    webglVendor: 'Apple Inc.',
    webglRendererChrome:
      'ANGLE (Apple, ANGLE Metal Renderer: Apple A17 Pro GPU, Unspecified Version)',
    webglRendererSafari: 'Apple GPU',
    integrated: true,
    perfTier: 4,
    platforms: ['ios'],
    yearsInUse: [2023, 2026],
  },
  {
    vendor: 'apple',
    family: 'A18',
    name: 'Apple A18 Pro GPU',
    webglVendor: 'Apple Inc.',
    webglRendererChrome:
      'ANGLE (Apple, ANGLE Metal Renderer: Apple A18 Pro GPU, Unspecified Version)',
    webglRendererSafari: 'Apple GPU',
    integrated: true,
    perfTier: 4,
    platforms: ['ios'],
    yearsInUse: [2024, 2026],
  },
  {
    vendor: 'apple',
    family: 'A19',
    name: 'Apple A19 Pro GPU',
    webglVendor: 'Apple Inc.',
    webglRendererChrome:
      'ANGLE (Apple, ANGLE Metal Renderer: Apple A19 Pro GPU, Unspecified Version)',
    webglRendererSafari: 'Apple GPU',
    integrated: true,
    perfTier: 5,
    platforms: ['ios'],
    yearsInUse: [2025, 2028],
  },

  // ---- Qualcomm (Android) ----
  {
    vendor: 'qualcomm',
    family: 'Adreno 800',
    name: 'Adreno 830',
    webglVendor: 'Qualcomm',
    webglRendererChrome: 'Adreno (TM) 830',
    webglRendererAndroid: 'ANGLE (Qualcomm, Adreno (TM) 830, OpenGL ES 3.2)',
    integrated: true,
    perfTier: 5,
    platforms: ['android'],
    yearsInUse: [2024, 2027],
  },
  {
    vendor: 'qualcomm',
    family: 'Adreno 700',
    name: 'Adreno 750',
    webglVendor: 'Qualcomm',
    webglRendererChrome: 'Adreno (TM) 750',
    webglRendererAndroid: 'ANGLE (Qualcomm, Adreno (TM) 750, OpenGL ES 3.2)',
    integrated: true,
    perfTier: 5,
    platforms: ['android'],
    yearsInUse: [2023, 2026],
  },
  {
    vendor: 'qualcomm',
    family: 'Adreno 700',
    name: 'Adreno 740',
    webglVendor: 'Qualcomm',
    webglRendererChrome: 'Adreno (TM) 740',
    webglRendererAndroid: 'ANGLE (Qualcomm, Adreno (TM) 740, OpenGL ES 3.2)',
    integrated: true,
    perfTier: 4,
    platforms: ['android'],
    yearsInUse: [2022, 2026],
  },
  {
    vendor: 'qualcomm',
    family: 'Adreno 700',
    name: 'Adreno 730',
    webglVendor: 'Qualcomm',
    webglRendererChrome: 'Adreno (TM) 730',
    webglRendererAndroid: 'ANGLE (Qualcomm, Adreno (TM) 730, OpenGL ES 3.2)',
    integrated: true,
    perfTier: 3,
    platforms: ['android'],
    yearsInUse: [2022, 2025],
  },
  {
    vendor: 'qualcomm',
    family: 'Adreno 600',
    name: 'Adreno 660',
    webglVendor: 'Qualcomm',
    webglRendererChrome: 'Adreno (TM) 660',
    webglRendererAndroid: 'ANGLE (Qualcomm, Adreno (TM) 660, OpenGL ES 3.2)',
    integrated: true,
    perfTier: 3,
    platforms: ['android'],
    yearsInUse: [2021, 2025],
  },
  {
    vendor: 'qualcomm',
    family: 'Adreno 600',
    name: 'Adreno 650',
    webglVendor: 'Qualcomm',
    webglRendererChrome: 'Adreno (TM) 650',
    webglRendererAndroid: 'ANGLE (Qualcomm, Adreno (TM) 650, OpenGL ES 3.2)',
    integrated: true,
    perfTier: 2,
    platforms: ['android'],
    yearsInUse: [2020, 2024],
  },
  {
    vendor: 'qualcomm',
    family: 'Adreno 600',
    name: 'Adreno 642L',
    webglVendor: 'Qualcomm',
    webglRendererChrome: 'Adreno (TM) 642L',
    webglRendererAndroid: 'ANGLE (Qualcomm, Adreno (TM) 642L, OpenGL ES 3.2)',
    integrated: true,
    perfTier: 1,
    platforms: ['android'],
    yearsInUse: [2021, 2025],
  },
  {
    vendor: 'qualcomm',
    family: 'Adreno 600',
    name: 'Adreno 620',
    webglVendor: 'Qualcomm',
    webglRendererChrome: 'Adreno (TM) 620',
    webglRendererAndroid: 'ANGLE (Qualcomm, Adreno (TM) 620, OpenGL ES 3.2)',
    integrated: true,
    perfTier: 1,
    platforms: ['android'],
    yearsInUse: [2019, 2023],
  },

  // ---- ARM Mali (Android) ----
  {
    vendor: 'arm',
    family: 'Mali G7xx',
    name: 'Mali-G715',
    webglVendor: 'ARM',
    webglRendererChrome: 'Mali-G715',
    webglRendererAndroid: 'ANGLE (ARM, Mali-G715, OpenGL ES 3.2)',
    integrated: true,
    perfTier: 4,
    platforms: ['android'],
    yearsInUse: [2022, 2026],
  },
  {
    vendor: 'arm',
    family: 'Mali G7xx',
    name: 'Mali-G710',
    webglVendor: 'ARM',
    webglRendererChrome: 'Mali-G710',
    webglRendererAndroid: 'ANGLE (ARM, Mali-G710, OpenGL ES 3.2)',
    integrated: true,
    perfTier: 3,
    platforms: ['android'],
    yearsInUse: [2021, 2025],
  },
  {
    vendor: 'arm',
    family: 'Mali G7xx',
    name: 'Mali-G78',
    webglVendor: 'ARM',
    webglRendererChrome: 'Mali-G78 MP14',
    webglRendererAndroid: 'ANGLE (ARM, Mali-G78 MP14, OpenGL ES 3.2)',
    integrated: true,
    perfTier: 2,
    platforms: ['android'],
    yearsInUse: [2020, 2024],
  },
];

/** Map vendor → nhãn hiển thị hoa chuẩn. */
const GPU_VENDOR_LABEL: Record<GpuProfile['vendor'], string> = {
  nvidia: 'NVIDIA',
  amd: 'AMD',
  intel: 'Intel',
  apple: 'Apple',
  qualcomm: 'Qualcomm',
  arm: 'ARM',
  imagination: 'Imagination',
};

/** Tra cứu GPU theo tên — O(1). */
const GPU_INDEX: Map<string, GpuProfile> = new Map(GPU_DATABASE.map((g) => [g.name, g]));

export function findGpu(name: string): GpuProfile | undefined {
  return GPU_INDEX.get(name);
}

export function gpuVendorLabel(g: GpuProfile | undefined): string {
  return g ? GPU_VENDOR_LABEL[g.vendor] : 'Unknown';
}

// ============================================================================
// SECTION 6 — SCREEN DATABASE (tất cả giá trị là CSS pixel, không phải vật lý)
// ============================================================================

export interface ScreenProfile {
  resolution: string;
  width: number;
  height: number;
  dpr: number;
  aspect: string;
  deviceClass: DeviceClass;
  family: OsFamily[];
  common: boolean;
  typicalScale?: number;
}

export const SCREEN_DATABASE: ScreenProfile[] = [
  // ---- Desktop / laptop (Windows / Linux) — CSS px ----
  {
    resolution: '1920×1080',
    width: 1920,
    height: 1080,
    dpr: 1,
    aspect: '16:9',
    deviceClass: 'desktop',
    family: ['windows', 'linux'],
    common: true,
  },
  {
    resolution: '1536×864',
    width: 1536,
    height: 864,
    dpr: 1.25,
    aspect: '16:9',
    deviceClass: 'laptop',
    family: ['windows'],
    common: true,
    typicalScale: 125,
  },
  {
    resolution: '1280×720',
    width: 1280,
    height: 720,
    dpr: 1.5,
    aspect: '16:9',
    deviceClass: 'laptop',
    family: ['windows'],
    common: true,
    typicalScale: 150,
  },
  {
    resolution: '2560×1440',
    width: 2560,
    height: 1440,
    dpr: 1,
    aspect: '16:9',
    deviceClass: 'desktop',
    family: ['windows'],
    common: true,
  },
  {
    resolution: '2048×1152',
    width: 2048,
    height: 1152,
    dpr: 1.25,
    aspect: '16:9',
    deviceClass: 'desktop',
    family: ['windows'],
    common: true,
  },
  {
    resolution: '2560×1440',
    width: 2560,
    height: 1440,
    dpr: 1.5,
    aspect: '16:9',
    deviceClass: 'desktop',
    family: ['windows'],
    common: false,
  },
  {
    resolution: '1920×1080',
    width: 1920,
    height: 1080,
    dpr: 2,
    aspect: '16:9',
    deviceClass: 'desktop',
    family: ['windows'],
    common: false,
  },
  {
    resolution: '3440×1440',
    width: 3440,
    height: 1440,
    dpr: 1,
    aspect: '21:9',
    deviceClass: 'desktop',
    family: ['windows'],
    common: false,
  },
  {
    resolution: '1366×768',
    width: 1366,
    height: 768,
    dpr: 1,
    aspect: '16:9',
    deviceClass: 'laptop',
    family: ['windows', 'linux'],
    common: true,
  },
  {
    resolution: '1440×900',
    width: 1440,
    height: 900,
    dpr: 1,
    aspect: '16:10',
    deviceClass: 'laptop',
    family: ['windows', 'linux'],
    common: true,
  },
  {
    resolution: '1600×900',
    width: 1600,
    height: 900,
    dpr: 1,
    aspect: '16:9',
    deviceClass: 'laptop',
    family: ['windows'],
    common: true,
  },
  {
    resolution: '1680×1050',
    width: 1680,
    height: 1050,
    dpr: 1,
    aspect: '16:10',
    deviceClass: 'laptop',
    family: ['windows'],
    common: false,
  },
  {
    resolution: '1920×1200',
    width: 1920,
    height: 1200,
    dpr: 1,
    aspect: '16:10',
    deviceClass: 'laptop',
    family: ['windows', 'linux'],
    common: true,
  },
  {
    resolution: '1280×800',
    width: 1280,
    height: 800,
    dpr: 2,
    aspect: '16:10',
    deviceClass: 'laptop',
    family: ['windows'],
    common: false,
  },
  {
    resolution: '1280×720',
    width: 1280,
    height: 720,
    dpr: 1,
    aspect: '16:9',
    deviceClass: 'desktop',
    family: ['linux'],
    common: true,
  },
  {
    resolution: '1280×1024',
    width: 1280,
    height: 1024,
    dpr: 1,
    aspect: '5:4',
    deviceClass: 'desktop',
    family: ['windows', 'linux'],
    common: true,
  },

  // ---- macOS — CSS px ----
  {
    resolution: '1440×900',
    width: 1440,
    height: 900,
    dpr: 2,
    aspect: '16:10',
    deviceClass: 'laptop',
    family: ['macos'],
    common: true,
  },
  {
    resolution: '1512×982',
    width: 1512,
    height: 982,
    dpr: 2,
    aspect: '16:10',
    deviceClass: 'laptop',
    family: ['macos'],
    common: true,
  },
  {
    resolution: '1680×1050',
    width: 1680,
    height: 1050,
    dpr: 2,
    aspect: '16:10',
    deviceClass: 'laptop',
    family: ['macos'],
    common: true,
  },
  {
    resolution: '1728×1117',
    width: 1728,
    height: 1117,
    dpr: 2,
    aspect: '16:10',
    deviceClass: 'laptop',
    family: ['macos'],
    common: true,
  },
  {
    resolution: '1280×720',
    width: 1280,
    height: 720,
    dpr: 2,
    aspect: '16:9',
    deviceClass: 'desktop',
    family: ['macos'],
    common: false,
  },

  // ---- Android mobile (CSS px) ----
  {
    resolution: '412×915',
    width: 412,
    height: 915,
    dpr: 2.625,
    aspect: '9:20',
    deviceClass: 'mobile',
    family: ['android'],
    common: true,
  },
  {
    resolution: '393×873',
    width: 393,
    height: 873,
    dpr: 2.625,
    aspect: '9:20',
    deviceClass: 'mobile',
    family: ['android'],
    common: true,
  },
  {
    resolution: '360×800',
    width: 360,
    height: 800,
    dpr: 3,
    aspect: '9:20',
    deviceClass: 'mobile',
    family: ['android'],
    common: true,
  },
  {
    resolution: '384×854',
    width: 384,
    height: 854,
    dpr: 2.625,
    aspect: '9:20',
    deviceClass: 'mobile',
    family: ['android'],
    common: true,
  },
  {
    resolution: '360×780',
    width: 360,
    height: 780,
    dpr: 2,
    aspect: '9:19.5',
    deviceClass: 'mobile',
    family: ['android'],
    common: true,
  },
  {
    resolution: '411×914',
    width: 411,
    height: 914,
    dpr: 2.625,
    aspect: '9:20',
    deviceClass: 'mobile',
    family: ['android'],
    common: true,
  },
  {
    resolution: '360×740',
    width: 360,
    height: 740,
    dpr: 3,
    aspect: '9:18.5',
    deviceClass: 'mobile',
    family: ['android'],
    common: true,
  },
  {
    resolution: '412×846',
    width: 412,
    height: 846,
    dpr: 2.625,
    aspect: '9:18.5',
    deviceClass: 'mobile',
    family: ['android'],
    common: true,
  },

  // ---- Android tablet ----
  {
    resolution: '800×1280',
    width: 800,
    height: 1280,
    dpr: 1.5,
    aspect: '16:10',
    deviceClass: 'tablet',
    family: ['android'],
    common: true,
  },
  {
    resolution: '1280×800',
    width: 1280,
    height: 800,
    dpr: 1.5,
    aspect: '16:10',
    deviceClass: 'tablet',
    family: ['android'],
    common: true,
  },

  // ---- iOS mobile ----
  {
    resolution: '390×844',
    width: 390,
    height: 844,
    dpr: 3,
    aspect: '9:19.5',
    deviceClass: 'mobile',
    family: ['ios'],
    common: true,
  },
  {
    resolution: '393×852',
    width: 393,
    height: 852,
    dpr: 3,
    aspect: '9:19.5',
    deviceClass: 'mobile',
    family: ['ios'],
    common: true,
  },
  {
    resolution: '402×874',
    width: 402,
    height: 874,
    dpr: 3,
    aspect: '9:19.5',
    deviceClass: 'mobile',
    family: ['ios'],
    common: true,
  },
  {
    resolution: '430×932',
    width: 430,
    height: 932,
    dpr: 3,
    aspect: '9:19.5',
    deviceClass: 'mobile',
    family: ['ios'],
    common: true,
  },
  {
    resolution: '375×812',
    width: 375,
    height: 812,
    dpr: 3,
    aspect: '9:19.5',
    deviceClass: 'mobile',
    family: ['ios'],
    common: false,
  },

  // ---- iOS tablet ----
  {
    resolution: '820×1180',
    width: 820,
    height: 1180,
    dpr: 2,
    aspect: '4:3',
    deviceClass: 'tablet',
    family: ['ios'],
    common: true,
  },
  {
    resolution: '834×1194',
    width: 834,
    height: 1194,
    dpr: 2,
    aspect: '4:3',
    deviceClass: 'tablet',
    family: ['ios'],
    common: true,
  },
  {
    resolution: '1024×1366',
    width: 1024,
    height: 1366,
    dpr: 2,
    aspect: '4:3',
    deviceClass: 'tablet',
    family: ['ios'],
    common: true,
  },
];

/**
 * Tra cứu screen theo (resolution, dpr) — O(1).
 * Key `"<resolution>|<dpr>"` cho exact match, key `"<resolution>|*"` cho fallback.
 */
const SCREEN_INDEX: Map<string, ScreenProfile> = (() => {
  const m = new Map<string, ScreenProfile>();
  for (const s of SCREEN_DATABASE) {
    m.set(`${s.resolution}|${s.dpr}`, s);
    const fallbackKey = `${s.resolution}|*`;
    if (!m.has(fallbackKey)) m.set(fallbackKey, s);
  }
  return m;
})();

export function findScreen(resolution: string, dpr?: number): ScreenProfile | undefined {
  if (dpr != null) {
    const exact = SCREEN_INDEX.get(`${resolution}|${dpr}`);
    if (exact) return exact;
  }
  return SCREEN_INDEX.get(`${resolution}|*`);
}

// DEV guard (#1) — phát hiện entry có physical px không nguyên
if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
  for (const s of SCREEN_DATABASE) {
    const physW = s.width * s.dpr;
    if (!Number.isInteger(physW)) {
      // eslint-disable-next-line no-console
      console.warn(`[SCREEN] ${s.resolution}@${s.dpr} → physical ${physW} không nguyên`);
    }
  }
}

// ============================================================================
// SECTION 7 — FONT DATABASE
// ============================================================================

export const FONT_DATABASE: Record<OsFamily, { base: number; fonts: string[] }> = {
  windows: {
    base: 214,
    fonts: [
      'Arial',
      'Arial Black',
      'Bahnschrift',
      'Calibri',
      'Cambria',
      'Cambria Math',
      'Candara',
      'Comic Sans MS',
      'Consolas',
      'Constantia',
      'Corbel',
      'Courier New',
      'Ebrima',
      'Franklin Gothic Medium',
      'Gabriola',
      'Gadugi',
      'Georgia',
      'HoloLens MDL2 Assets',
      'Impact',
      'Ink Free',
      'Javanese Text',
      'Leelawadee UI',
      'Lucida Console',
      'Lucida Sans Unicode',
      'Malgun Gothic',
      'Marlett',
      'Microsoft Himalaya',
      'Microsoft JhengHei',
      'Microsoft New Tai Lue',
      'Microsoft PhagsPa',
      'Microsoft Sans Serif',
      'Microsoft Tai Le',
      'Microsoft YaHei',
      'Microsoft Yi Baiti',
      'MingLiU-ExtB',
      'Mongolian Baiti',
      'MS Gothic',
      'MV Boli',
      'Myanmar Text',
      'Nirmala UI',
      'Palatino Linotype',
      'Segoe MDL2 Assets',
      'Segoe Print',
      'Segoe Script',
      'Segoe UI',
      'Segoe UI Emoji',
      'Segoe UI Historic',
      'Segoe UI Symbol',
      'SimSun',
      'Sitka',
      'Sylfaen',
      'Symbol',
      'Tahoma',
      'Times New Roman',
      'Trebuchet MS',
      'Verdana',
      'Webdings',
      'Wingdings',
      'Yu Gothic',
    ],
  },
  macos: {
    base: 182,
    fonts: [
      'American Typewriter',
      'Andale Mono',
      'Apple Chancery',
      'Apple Color Emoji',
      'Apple SD Gothic Neo',
      'Arial',
      'Arial Black',
      'Arial Hebrew',
      'Arial Narrow',
      'Arial Rounded MT Bold',
      'Arial Unicode MS',
      'Avenir',
      'Avenir Next',
      'Avenir Next Condensed',
      'Baskerville',
      'Big Caslon',
      'Bodoni 72',
      'Bradley Hand',
      'Brush Script MT',
      'Chalkboard',
      'Chalkduster',
      'Charter',
      'Cochin',
      'Comic Sans MS',
      'Copperplate',
      'Courier',
      'Courier New',
      'Didot',
      'DIN Alternate',
      'DIN Condensed',
      'Futura',
      'Geneva',
      'Georgia',
      'Gill Sans',
      'Helvetica',
      'Helvetica Neue',
      'Herculanum',
      'Hoefler Text',
      'Impact',
      'Lucida Grande',
      'Luminari',
      'Marker Felt',
      'Menlo',
      'Microsoft Sans Serif',
      'Monaco',
      'Noteworthy',
      'Optima',
      'Palatino',
      'Papyrus',
      'Party LET',
      'Phosphate',
      'Rage Italic',
      'Rockwell',
      'Savoye LET',
      'SignPainter',
      'Skia',
      'Snell Roundhand',
      'Tahoma',
      'Times',
      'Times New Roman',
      'Trattatello',
      'Trebuchet MS',
      'Verdana',
      'Zapf Dingbats',
      'Zapfino',
    ],
  },
  linux: {
    base: 96,
    fonts: [
      'Arial',
      'Bitstream Charter',
      'Bitstream Vera Sans',
      'Bitstream Vera Sans Mono',
      'Bitstream Vera Serif',
      'Cantarell',
      'Century Schoolbook L',
      'Comic Sans MS',
      'Courier 10 Pitch',
      'Courier New',
      'DejaVu Sans',
      'DejaVu Sans Mono',
      'DejaVu Serif',
      'Droid Sans',
      'Droid Sans Mono',
      'FreeMono',
      'FreeSans',
      'FreeSerif',
      'Georgia',
      'Liberation Mono',
      'Liberation Sans',
      'Liberation Serif',
      'Linux Biolinum',
      'Linux Libertine',
      'Luxi Mono',
      'Luxi Sans',
      'Luxi Serif',
      'Nimbus Mono L',
      'Nimbus Roman No9 L',
      'Nimbus Sans L',
      'Noto Color Emoji',
      'Noto Sans',
      'Noto Serif',
      'P052',
      'Standard Symbols L',
      'Tahoma',
      'Times New Roman',
      'Trebuchet MS',
      'Ubuntu',
      'Ubuntu Condensed',
      'Ubuntu Mono',
      'URW Bookman L',
      'URW Gothic L',
      'URW Palladio L',
      'Verdana',
      'Z003',
    ],
  },
  android: {
    base: 74,
    fonts: [
      'AndroidClock',
      'Carrois Gothic SC',
      'Cutive Mono',
      'Dancing Script',
      'Coming Soon',
      'Droid Sans',
      'Droid Sans Fallback',
      'Droid Sans Mono',
      'Droid Serif',
      'Noto Color Emoji',
      'Noto Sans',
      'Noto Sans Arabic',
      'Noto Sans Bengali',
      'Noto Sans Devanagari',
      'Noto Sans Hebrew',
      'Noto Sans JP',
      'Noto Sans KR',
      'Noto Sans SC',
      'Noto Sans TC',
      'Noto Sans Thai',
      'Roboto',
      'Roboto Condensed',
      'Roboto Mono',
      'Roboto Slab',
      'Roboto Thin',
      'Roboto Light',
      'Roboto Medium',
      'Roboto Black',
      'Roboto Bold Italic',
    ],
  },
  ios: {
    base: 84,
    fonts: [
      'American Typewriter',
      'Apple Color Emoji',
      'Apple SD Gothic Neo',
      'Arial',
      'Arial Hebrew',
      'Arial Rounded MT Bold',
      'Avenir',
      'Avenir Next',
      'Avenir Next Condensed',
      'Baskerville',
      'Bodoni 72',
      'Chalkboard SE',
      'Cochin',
      'Copperplate',
      'Courier',
      'Courier New',
      'Damascus',
      'Devanagari Sangam MN',
      'Didot',
      'Euphemia UCAS',
      'Futura',
      'Galvji',
      'Geeza Pro',
      'Georgia',
      'Gill Sans',
      'Helvetica',
      'Helvetica Neue',
      'Hiragino Maru Gothic ProN',
      'Hiragino Mincho ProN',
      'Hiragino Sans',
      'Hoefler Text',
      'Kailasa',
      'Kefa',
      'Khmer Sangam MN',
      'Kohinoor Bangla',
      'Kohinoor Devanagari',
      'Kohinoor Telugu',
      'Lao Sangam MN',
      'Malayalam Sangam MN',
      'Marker Felt',
      'Menlo',
      'Microsoft Sans Serif',
      'Mishafi',
      'Mukta Mahee',
      'Myanmar Sangam MN',
      'Noteworthy',
      'Noto Nastaliq Urdu',
      'Optima',
      'Palatino',
      'Papyrus',
      'Party LET',
      'PingFang HK',
      'PingFang SC',
      'PingFang TC',
      'Rockwell',
      'Savoye LET',
      'Sinhala Sangam MN',
      'Snell Roundhand',
      'Symbol',
      'Tamil Sangam MN',
      'Telugu Sangam MN',
      'Thonburi',
      'Times New Roman',
      'Trebuchet MS',
      'Verdana',
      'Zapf Dingbats',
      'Zapfino',
    ],
  },
};

// ============================================================================
// SECTION 8 — WEBGL EXTENSIONS DATABASE
// ============================================================================

const COMMON_GL_EXTENSIONS = [
  'ANGLE_instanced_arrays',
  'EXT_blend_minmax',
  'EXT_clip_control',
  'EXT_color_buffer_float',
  'EXT_color_buffer_half_float',
  'EXT_depth_clamp',
  'EXT_disjoint_timer_query',
  'EXT_float_blend',
  'EXT_frag_depth',
  'EXT_polygon_offset_clamp',
  'EXT_render_snorm',
  'EXT_sRGB',
  'EXT_shader_texture_lod',
  'EXT_texture_compression_bptc',
  'EXT_texture_compression_rgtc',
  'EXT_texture_filter_anisotropic',
  'EXT_texture_norm16',
  'KHR_parallel_shader_compile',
  'OES_draw_buffers_indexed',
  'OES_element_index_uint',
  'OES_fbo_render_mipmap',
  'OES_standard_derivatives',
  'OES_texture_float',
  'OES_texture_float_linear',
  'OES_texture_half_float',
  'OES_texture_half_float_linear',
  'OES_vertex_array_object',
  'WEBGL_blend_func_extended',
  'WEBGL_color_buffer_float',
  'WEBGL_debug_renderer_info',
  'WEBGL_debug_shaders',
  'WEBGL_depth_texture',
  'WEBGL_draw_buffers',
  'WEBGL_lose_context',
  'WEBGL_multi_draw',
];

export const WEBGL_EXTENSIONS: Record<OsFamily, string[]> = {
  windows: [
    ...COMMON_GL_EXTENSIONS,
    'EXT_conservative_depth',
    'WEBGL_compressed_texture_s3tc',
    'WEBGL_compressed_texture_s3tc_srgb',
    'WEBGL_polygon_mode',
  ],
  macos: [
    ...COMMON_GL_EXTENSIONS,
    'EXT_conservative_depth',
    'WEBGL_compressed_texture_etc',
    'WEBGL_compressed_texture_etc1',
    'WEBGL_compressed_texture_pvrtc',
    'WEBGL_compressed_texture_s3tc',
    'WEBGL_compressed_texture_s3tc_srgb',
    'WEBGL_polygon_mode',
  ],
  linux: [
    ...COMMON_GL_EXTENSIONS,
    'WEBGL_compressed_texture_astc',
    'WEBGL_compressed_texture_etc',
    'WEBGL_compressed_texture_etc1',
    'WEBGL_compressed_texture_s3tc',
  ],
  android: [
    ...COMMON_GL_EXTENSIONS,
    'WEBGL_compressed_texture_astc',
    'WEBGL_compressed_texture_etc',
    'WEBGL_compressed_texture_etc1',
  ],
  ios: [
    ...COMMON_GL_EXTENSIONS,
    'EXT_conservative_depth',
    'WEBGL_compressed_texture_astc',
    'WEBGL_compressed_texture_etc',
    'WEBGL_compressed_texture_etc1',
    'WEBGL_compressed_texture_pvrtc',
  ],
};

// ============================================================================
// SECTION 9 — DEVICE TEMPLATES
// ============================================================================

interface Tier {
  screen: string;
  dpr: number;
  gpu: string;
  cores: number;
  memory: number;
  weight: number;
  /** #16 — device class được khai báo ở tier, không lấy từ template. */
  deviceClass?: DeviceClass;
}

interface DeviceTemplate {
  key: string;
  family: OsFamily;
  deviceClass: DeviceClass;
  os: string;
  browser: BrowserName;
  browserMajor: number;
  share: number;
  tiers: Tier[];
}

// #1 — WIN_NEW: CSS px (1536×864 thay cho 1920×1080 @1.25)
const WIN_NEW: Tier[] = [
  {
    screen: '1920×1080',
    dpr: 1,
    gpu: 'NVIDIA GeForce RTX 3060',
    cores: 12,
    memory: 16,
    weight: 3,
    deviceClass: 'desktop',
  },
  {
    screen: '1536×864',
    dpr: 1.25,
    gpu: 'NVIDIA GeForce GTX 1660',
    cores: 6,
    memory: 16,
    weight: 2,
    deviceClass: 'laptop',
  },
  {
    screen: '2560×1440',
    dpr: 1,
    gpu: 'AMD Radeon RX 6700 XT',
    cores: 8,
    memory: 16,
    weight: 1,
    deviceClass: 'desktop',
  },
  {
    screen: '1536×864',
    dpr: 1.25,
    gpu: 'Intel UHD Graphics 620',
    cores: 8,
    memory: 8,
    weight: 3,
    deviceClass: 'laptop',
  },
  {
    screen: '1920×1080',
    dpr: 1,
    gpu: 'NVIDIA GeForce RTX 4070',
    cores: 12,
    memory: 32,
    weight: 1,
    deviceClass: 'desktop',
  },
];
const WIN_OLD: Tier[] = [
  {
    screen: '1920×1080',
    dpr: 1,
    gpu: 'NVIDIA GeForce GTX 1650',
    cores: 6,
    memory: 8,
    weight: 3,
    deviceClass: 'desktop',
  },
  {
    screen: '1366×768',
    dpr: 1,
    gpu: 'Intel UHD Graphics 620',
    cores: 4,
    memory: 8,
    weight: 3,
    deviceClass: 'laptop',
  },
  {
    screen: '1920×1080',
    dpr: 1,
    gpu: 'Intel UHD Graphics 630',
    cores: 4,
    memory: 8,
    weight: 2,
    deviceClass: 'desktop',
  },
];
const MAC: Tier[] = [
  {
    screen: '1512×982',
    dpr: 2,
    gpu: 'Apple M2',
    cores: 8,
    memory: 16,
    weight: 3,
    deviceClass: 'laptop',
  },
  {
    screen: '1440×900',
    dpr: 2,
    gpu: 'Apple M1',
    cores: 8,
    memory: 8,
    weight: 3,
    deviceClass: 'laptop',
  },
  {
    screen: '1728×1117',
    dpr: 2,
    gpu: 'Apple M3 Pro',
    cores: 12,
    memory: 18,
    weight: 1,
    deviceClass: 'laptop',
  },
  {
    screen: '1280×720',
    dpr: 2,
    gpu: 'Apple M2 Pro',
    cores: 10,
    memory: 16,
    weight: 1,
    deviceClass: 'desktop',
  },
];
const LINUX: Tier[] = [
  {
    screen: '1920×1080',
    dpr: 1,
    gpu: 'Mesa Intel UHD 630',
    cores: 4,
    memory: 8,
    weight: 3,
    deviceClass: 'desktop',
  },
  {
    screen: '2560×1440',
    dpr: 1,
    gpu: 'AMD Radeon RX 580',
    cores: 8,
    memory: 16,
    weight: 2,
    deviceClass: 'desktop',
  },
  {
    screen: '1366×768',
    dpr: 1,
    gpu: 'Mesa Intel Iris Xe',
    cores: 8,
    memory: 8,
    weight: 2,
    deviceClass: 'laptop',
  },
];
const ANDROID: Tier[] = [
  {
    screen: '412×915',
    dpr: 2.625,
    gpu: 'Adreno 730',
    cores: 8,
    memory: 8,
    weight: 3,
    deviceClass: 'mobile',
  },
  {
    screen: '393×873',
    dpr: 2.625,
    gpu: 'Mali-G715',
    cores: 9,
    memory: 8,
    weight: 2,
    deviceClass: 'mobile',
  },
  {
    screen: '384×854',
    dpr: 2.625,
    gpu: 'Adreno 740',
    cores: 8,
    memory: 12,
    weight: 1,
    deviceClass: 'mobile',
  },
  {
    screen: '360×800',
    dpr: 3,
    gpu: 'Adreno 650',
    cores: 8,
    memory: 6,
    weight: 2,
    deviceClass: 'mobile',
  },
  {
    screen: '412×846',
    dpr: 2.625,
    gpu: 'Mali-G78',
    cores: 8,
    memory: 6,
    weight: 1,
    deviceClass: 'mobile',
  },
];
const ANDROID_TABLET: Tier[] = [
  {
    screen: '800×1280',
    dpr: 1.5,
    gpu: 'Mali-G710',
    cores: 8,
    memory: 6,
    weight: 2,
    deviceClass: 'tablet',
  },
  {
    screen: '1280×800',
    dpr: 1.5,
    gpu: 'Adreno 660',
    cores: 8,
    memory: 8,
    weight: 2,
    deviceClass: 'tablet',
  },
];
const IOS: Tier[] = [
  {
    screen: '390×844',
    dpr: 3,
    gpu: 'Apple A16 Bionic GPU',
    cores: 6,
    memory: 6,
    weight: 3,
    deviceClass: 'mobile',
  },
  {
    screen: '393×852',
    dpr: 3,
    gpu: 'Apple A17 Pro GPU',
    cores: 6,
    memory: 8,
    weight: 2,
    deviceClass: 'mobile',
  },
  {
    screen: '402×874',
    dpr: 3,
    gpu: 'Apple A18 Pro GPU',
    cores: 6,
    memory: 8,
    weight: 2,
    deviceClass: 'mobile',
  },
  {
    screen: '430×932',
    dpr: 3,
    gpu: 'Apple A16 Bionic GPU',
    cores: 6,
    memory: 6,
    weight: 2,
    deviceClass: 'mobile',
  },
];
const IOS_TABLET: Tier[] = [
  {
    screen: '820×1180',
    dpr: 2,
    gpu: 'Apple M1',
    cores: 8,
    memory: 8,
    weight: 2,
    deviceClass: 'tablet',
  },
  {
    screen: '834×1194',
    dpr: 2,
    gpu: 'Apple M2',
    cores: 8,
    memory: 8,
    weight: 2,
    deviceClass: 'tablet',
  },
  {
    screen: '1024×1366',
    dpr: 2,
    gpu: 'Apple M2',
    cores: 8,
    memory: 16,
    weight: 1,
    deviceClass: 'tablet',
  },
];

const DEVICE_TEMPLATES: DeviceTemplate[] = [
  {
    key: 'win11-chrome',
    family: 'windows',
    deviceClass: 'laptop',
    os: 'Windows 11',
    browser: 'Chrome',
    browserMajor: 157,
    share: 30,
    tiers: WIN_NEW,
  },
  {
    key: 'win10-chrome',
    family: 'windows',
    deviceClass: 'desktop',
    os: 'Windows 10',
    browser: 'Chrome',
    browserMajor: 157,
    share: 18,
    tiers: WIN_OLD,
  },
  {
    key: 'win11-edge',
    family: 'windows',
    deviceClass: 'laptop',
    os: 'Windows 11',
    browser: 'Edge',
    browserMajor: 157,
    share: 7,
    tiers: WIN_NEW,
  },
  {
    key: 'win11-firefox',
    family: 'windows',
    deviceClass: 'laptop',
    os: 'Windows 11',
    browser: 'Firefox',
    browserMajor: 149,
    share: 3,
    tiers: WIN_NEW,
  },
  {
    key: 'win10-firefox',
    family: 'windows',
    deviceClass: 'desktop',
    os: 'Windows 10',
    browser: 'Firefox',
    browserMajor: 149,
    share: 2,
    tiers: WIN_OLD,
  },
  {
    key: 'mac-chrome',
    family: 'macos',
    deviceClass: 'laptop',
    os: 'macOS 26',
    browser: 'Chrome',
    browserMajor: 157,
    share: 6,
    tiers: MAC,
  },
  {
    key: 'mac-safari',
    family: 'macos',
    deviceClass: 'laptop',
    os: 'macOS 26',
    browser: 'Safari',
    browserMajor: 26,
    share: 5,
    tiers: MAC,
  },
  {
    key: 'mac-firefox',
    family: 'macos',
    deviceClass: 'laptop',
    os: 'macOS 26',
    browser: 'Firefox',
    browserMajor: 149,
    share: 1.5,
    tiers: MAC,
  },
  {
    key: 'linux-chrome',
    family: 'linux',
    deviceClass: 'desktop',
    os: 'Linux',
    browser: 'Chrome',
    browserMajor: 157,
    share: 2,
    tiers: LINUX,
  },
  {
    key: 'linux-firefox',
    family: 'linux',
    deviceClass: 'desktop',
    os: 'Linux',
    browser: 'Firefox',
    browserMajor: 149,
    share: 1.5,
    tiers: LINUX,
  },
  // Chrome Android tự cập nhật → dùng chung major với Chrome
  {
    key: 'android-15',
    family: 'android',
    deviceClass: 'mobile',
    os: 'Android 15',
    browser: 'Chrome',
    browserMajor: 157,
    share: 18,
    tiers: ANDROID,
  },
  {
    key: 'android-14',
    family: 'android',
    deviceClass: 'mobile',
    os: 'Android 14',
    browser: 'Chrome',
    browserMajor: 157,
    share: 10,
    tiers: ANDROID,
  },
  {
    key: 'android-tablet',
    family: 'android',
    deviceClass: 'tablet',
    os: 'Android 14',
    browser: 'Chrome',
    browserMajor: 157,
    share: 2,
    tiers: ANDROID_TABLET,
  },
  {
    key: 'ios-18',
    family: 'ios',
    deviceClass: 'mobile',
    os: 'iOS 18.6',
    browser: 'Safari',
    browserMajor: 26,
    share: 12,
    tiers: IOS,
  },
  {
    key: 'ios-26',
    family: 'ios',
    deviceClass: 'mobile',
    os: 'iOS 26',
    browser: 'Safari',
    browserMajor: 26,
    share: 8,
    tiers: IOS,
  },
  {
    key: 'ios-26-chrome',
    family: 'ios',
    deviceClass: 'mobile',
    os: 'iOS 26',
    browser: 'Chrome',
    browserMajor: 157,
    share: 3,
    tiers: IOS,
  },
  {
    key: 'ios-tablet',
    family: 'ios',
    deviceClass: 'tablet',
    os: 'iOS 26',
    browser: 'Safari',
    browserMajor: 26,
    share: 3,
    tiers: IOS_TABLET,
  },
];

const MAC_HEAVY = new Set(['US', 'GB', 'CA', 'AU', 'JP', 'DE', 'NL', 'SE', 'NO', 'DK', 'CH', 'SG']);
const ANDROID_HEAVY = new Set(['VN', 'IN', 'ID', 'PH', 'BR', 'TH', 'MY', 'TR', 'MX', 'AR']);
const IOS_HEAVY = new Set(['US', 'JP', 'GB', 'AU', 'CA', 'DE', 'FR', 'KR']);
const LINUX_HEAVY = new Set(['DE', 'US', 'FR', 'IN', 'BR', 'RU', 'NL', 'GB']);

const MAX_RESULTS = 24;
const MAX_PER_DEVICE = 4;

// ============================================================================
// SECTION 10 — TAG / TRUST CLASSIFIER
// ============================================================================

export function tagOf(trust: number): { tag: string; tone: Tone } {
  if (trust >= 92) return { tag: 'Very high trust', tone: 'success' };
  if (trust >= 82) return { tag: 'High trust', tone: 'info' };
  if (trust >= 70) return { tag: 'Medium trust', tone: 'primary' };
  if (trust >= 55) return { tag: 'Low trust', tone: 'warn' };
  return { tag: 'Uncommon', tone: 'error' };
}

// ============================================================================
// SECTION 11 — IP TYPE DETECTION
// ============================================================================

export function classifyIp(info: IpInfo): IpType {
  if (info.tor) return 'tor';
  if (info.proxy) return 'proxy';
  if (info.vpn) return 'vpn';
  if (info.mobile) return 'mobile';
  if (info.hosting) return 'hosting';
  if (info.ip) return 'residential';
  return 'unknown';
}

const IP_TYPE_TRUST: Record<IpType, number> = {
  residential: 1.0,
  mobile: 0.92,
  hosting: 0.55,
  vpn: 0.4,
  proxy: 0.3,
  tor: 0.15,
  unknown: 0.65,
};

export function detectHostFamily(): OsFamily | undefined {
  if (typeof navigator === 'undefined') return undefined;
  const platform = navigator.platform || '';
  if (/^win/i.test(platform)) return 'windows';
  if (/^mac/i.test(platform)) return 'macos';
  if (/linux|x11/i.test(`${platform} ${navigator.userAgent}`)) return 'linux';
  return undefined;
}

// ============================================================================
// SECTION 12 — CANDIDATE GENERATION
// ============================================================================

interface Candidate {
  device: DeviceTemplate;
  tier: Tier;
  tierIndex: number;
  lang: string;
  /** #15 — flag rõ ràng thay cho string-match `reasons`. */
  primaryLang: boolean;
  langReason: string;
  biasReasons: string[];
  weight: number;
  penalty: number;
}

function localeCandidates(
  cc: string,
  seed: number,
): { lang: string; primary: boolean; weight: number }[] {
  const prof = LOCALE_DATABASE[cc];
  if (!prof) {
    return [
      { lang: 'en-US', primary: true, weight: 1 },
      { lang: 'en', primary: false, weight: 0.2 },
    ];
  }
  const rng = new SeededRandom(seed);
  const out: { lang: string; primary: boolean; weight: number }[] = [];
  out.push({ lang: prof.primary, primary: true, weight: 1 });
  prof.secondary.forEach((lang, i) => {
    const w = prof.weights[i] ?? 0;
    if (rng.nextFloat() < w + 0.15) {
      out.push({ lang, primary: false, weight: w });
    }
  });
  return out;
}

export function generateFootprints(info: IpInfo, forceFamily?: OsFamily): FootprintPreset[] {
  const cc = (info.countryCode || 'US').toUpperCase();
  const ipType = classifyIp(info);
  const tz = info.timezone || 'UTC';
  const geo: [number, number] | undefined =
    Number.isFinite(info.lat) && Number.isFinite(info.lon)
      ? [info.lat as number, info.lon as number]
      : undefined;
  const seed = fnv1a(info.ip || 'unknown');

  const langs = localeCandidates(cc, seed);
  const host = detectHostFamily();
  const candidates: Candidate[] = [];

  for (const device of DEVICE_TEMPLATES) {
    // #14 — forceFamily thay cho fake IP
    if (forceFamily && device.family !== forceFamily) continue;

    let bias = 1;
    let penalty = 0;
    const why: string[] = [];

    if (ipType === 'mobile') {
      if (device.deviceClass === 'mobile') {
        bias *= 4;
        why.push('Mobile carrier IP matches a phone');
      } else {
        bias *= 0.35;
        why.push('Desktop on mobile carrier IP is uncommon');
      }
    } else if (ipType === 'hosting') {
      if (device.family === 'linux') {
        bias *= 2.5;
        why.push('Hosting IP fits a Linux server profile');
      } else if (device.deviceClass === 'mobile') {
        bias *= 0.1;
        penalty += 8;
        why.push('Phone on hosting IP is unlikely');
      } else if (device.family === 'macos') {
        bias *= 0.5;
        penalty += 6;
        why.push('macOS on hosting IP is uncommon');
      }
    } else if (ipType === 'tor' || ipType === 'proxy' || ipType === 'vpn') {
      penalty += ipType === 'tor' ? 25 : ipType === 'proxy' ? 15 : 10;
      why.push(`IP classified as ${ipType}`);
    } else if (ipType === 'residential') {
      why.push('Residential IP fits a regular user device');
    }

    if (host) {
      if (device.family === host) {
        bias *= 6;
        why.push(`Matches the host platform (${host}), real hardware stays coherent`);
      } else {
        bias *= 0.1;
        penalty += 12;
        why.push(`Differs from host platform (${host}), GPU and fonts can leak the real OS`);
      }
    }

    if (device.family === 'macos' && MAC_HEAVY.has(cc)) {
      bias *= 1.6;
      why.push(`macOS is over-represented in ${cc}`);
    }
    if (device.family === 'ios' && IOS_HEAVY.has(cc)) {
      bias *= 1.5;
      why.push(`iOS is over-represented in ${cc}`);
    }
    if (device.family === 'android' && ANDROID_HEAVY.has(cc)) {
      bias *= 1.5;
      why.push(`Android is over-represented in ${cc}`);
    }
    if (device.family === 'linux' && LINUX_HEAVY.has(cc)) {
      bias *= 1.3;
      why.push(`Linux is common in ${cc}`);
    }

    device.tiers.forEach((tier, tierIndex) => {
      const screenProf = findScreen(tier.screen, tier.dpr);
      let tierPenalty = penalty;
      if (screenProf && !screenProf.family.includes(device.family)) tierPenalty += 3;

      for (const lang of langs) {
        candidates.push({
          device,
          tier,
          tierIndex,
          lang: lang.lang,
          primaryLang: lang.primary,
          langReason: lang.primary
            ? `Language ${lang.lang} is the primary for ${cc}`
            : `Language ${lang.lang} is a secondary in ${cc}`,
          biasReasons: why,
          weight: device.share * bias * tier.weight * lang.weight,
          penalty: tierPenalty,
        });
      }
    });
  }

  // Tổng weight của TOÀN BỘ candidate — dùng cho surprisal entropy (#6)
  const allW = candidates.reduce((s, c) => s + c.weight, 0) || 1;

  // Jitter + sort
  const jittered = candidates
    .map((c) => ({
      c,
      score:
        c.weight *
        (1 +
          ((murmur3(`${info.ip}|${c.device.key}|${c.tierIndex}|${c.lang}`) % 1000) / 1000) * 0.4),
    }))
    .sort((a, b) => b.score - a.score);

  // Cap per-device
  const perDevice = new Map<string, number>();
  const picked = jittered
    .filter(({ c }) => {
      const n = perDevice.get(c.device.key) ?? 0;
      if (n >= MAX_PER_DEVICE) return false;
      perDevice.set(c.device.key, n + 1);
      return true;
    })
    .slice(0, MAX_RESULTS);

  const totalW = picked.reduce((s, p) => s + p.c.weight, 0) || 1;
  const ipFactor = IP_TYPE_TRUST[ipType];
  const absMaxW = candidates.reduce((m, c) => (c.weight > m ? c.weight : m), 1);

  const results: FootprintPreset[] = picked.map(({ c }) => {
    const { screen, dpr, gpu, cores, memory } = c.tier;
    const share = (c.weight / totalW) * 100;

    // #21 — browserPopularity dùng tỉ lệ trong candidates, không phải usage/20
    const popularity = Math.sqrt(c.weight / absMaxW);
    const rawTrust = 46 + 44 * popularity;
    const trust = clamp(Math.round(rawTrust * ipFactor) - c.penalty, 15, 99);
    const { tag, tone } = tagOf(trust);

    // #6 — surprisal thật trên phân bố candidate
    const entropy = Math.round(-Math.log2(Math.max(c.weight / allW, 1e-6)) * 10) / 10;

    const presetId = `${c.device.key}-${c.tierIndex}-${c.lang}`;
    const fpHash = hex(fnv1a(`${presetId}|${info.ip}|${gpu}|${screen}`));

    const reasons = [
      `Share among candidates ≈ ${share.toFixed(1)}%`,
      c.langReason,
      `Timezone ${tz} derived from IP`,
      `Hardware tier is coherent: ${gpu}, ${cores} cores / ${memory} GB`,
      ...c.biasReasons,
    ];

    return {
      id: presetId,
      name: `${c.device.os} · ${c.device.browser} ${c.device.browserMajor} · ${c.lang}`,
      family: c.device.family,
      // #16 — deviceClass lấy từ Tier
      deviceClass: c.tier.deviceClass ?? c.device.deviceClass,
      os: c.device.os,
      browser: c.device.browser,
      browserMajor: c.device.browserMajor,
      screen,
      dpr,
      gpu,
      cores,
      memory,
      lang: c.lang,
      tz,
      cc,
      usage: Math.max(1, Math.round(share * 10) / 10),
      tag,
      tone,
      trust,
      reasons,
      geo,
      entropy,
      uniqueness: uniquenessLabel(entropy),
      fingerprintHash: fpHash,
    };
  });

  // #8 — gán anomalies + trust thống nhất từ một nguồn duy nhất
  for (const p of results) {
    const anomalies = detectAnomalies(p, info);
    p.anomalies = anomalies;
    const factors = computeTrustFactors(p, info);
    p.trust = recombineTrust(factors);
    const t = tagOf(p.trust);
    p.tag = t.tag;
    p.tone = t.tone;
  }

  return results;
}

// ============================================================================
// SECTION 13 — ENTROPY & UNIQUENESS
// ============================================================================

export function estimateCandidateEntropy(c: {
  device: DeviceTemplate;
  tier: Tier;
  lang: string;
}): number {
  // Placeholder — generateFootprints đã dùng surprisal thật (#6).
  // Giữ hàm này cho backward-compat nếu nơi khác còn gọi.
  const screenBits = c.tier.screen.includes('×') ? 4.5 : 2;
  const gpuBits = c.tier.gpu ? 6.2 : 2;
  const coresBits = Math.log2(Math.max(1, c.tier.cores / 2));
  const memBits = Math.log2(Math.max(1, c.tier.memory / 2));
  const langBits = c.lang.includes('-') ? 3.4 : 2;
  const browserBits = 3.9;
  const osBits = 2.2;
  return (
    Math.round(
      (screenBits + gpuBits + coresBits + memBits + langBits + browserBits + osBits) * 10,
    ) / 10
  );
}

/** Thang surprisal mới (~4–12 bit) — #6. */
export function uniquenessLabel(bits: number): string {
  if (bits >= 12) return 'Extremely rare fingerprint';
  if (bits >= 10) return 'Very rare fingerprint';
  if (bits >= 8) return 'Rare fingerprint';
  if (bits >= 6) return 'Uncommon fingerprint';
  if (bits >= 4) return 'Common fingerprint';
  return 'Very common fingerprint';
}

// ============================================================================
// SECTION 14 — ANOMALY DETECTION
// ============================================================================

export const ANOMALY_CODES = {
  MEMORY_LOW: 'MEMORY_LOW',
  GPU_MISMATCH: 'GPU_MISMATCH',
  SCREEN_GPU_MISMATCH: 'SCREEN_GPU_MISMATCH',
  TZ_LANG_MISMATCH: 'TZ_LANG_MISMATCH',
  GEO_TZ_MISMATCH: 'GEO_TZ_MISMATCH',
  CORES_LOW_MOBILE: 'CORES_LOW_MOBILE',
  BROWSER_OS_MISMATCH: 'BROWSER_OS_MISMATCH',
  IP_TYPE_MISMATCH: 'IP_TYPE_MISMATCH',
  HOST_PLATFORM_MISMATCH: 'HOST_PLATFORM_MISMATCH',
} as const;

/** Bảng rule hợp nhất — #19 dùng chung cho detectAnomalies & crossValidate. */
interface AnomalyRule {
  code: string;
  severity: 'low' | 'medium' | 'high';
  field: string;
  delta: number;
  match: (p: FootprintPreset, info?: IpInfo) => string | null;
}

const ANOMALY_RULES: AnomalyRule[] = [
  {
    code: ANOMALY_CODES.MEMORY_LOW,
    severity: 'low',
    field: 'memory',
    delta: -3,
    match: (p) => (p.memory < 2 ? `RAM reported as ${p.memory} GB — below common minimum` : null),
  },
  {
    code: ANOMALY_CODES.GPU_MISMATCH,
    severity: 'high',
    field: 'gpu',
    delta: -15,
    match: (p) => {
      const g = findGpu(p.gpu);
      if (!g) return null; // xử lý riêng (medium)
      return g.platforms.includes(p.family) ? null : `GPU ${p.gpu} is not typical on ${p.family}`;
    },
  },
  {
    code: ANOMALY_CODES.SCREEN_GPU_MISMATCH,
    severity: 'medium',
    field: 'screen',
    delta: -6,
    match: (p) => {
      const g = findGpu(p.gpu);
      if (!g || !g.integrated || g.perfTier !== 1 || p.family !== 'windows') return null;
      const s = findScreen(p.screen, p.dpr);
      return s && s.width >= 3840 ? 'Low-tier integrated GPU with 4K resolution is rare' : null;
    },
  },
  {
    code: ANOMALY_CODES.BROWSER_OS_MISMATCH,
    severity: 'high',
    field: 'browser',
    delta: -20,
    match: (p) =>
      p.browser === 'Safari' && p.family !== 'macos' && p.family !== 'ios'
        ? `Safari is not available on ${p.os}`
        : null,
  },
  {
    code: ANOMALY_CODES.TZ_LANG_MISMATCH,
    severity: 'low',
    field: 'lang',
    delta: -3,
    match: (p) => {
      const tzRegion = p.tz.split('/')[0];
      const langRegion = p.lang.split('-')[1];
      return tzRegion === 'Europe' && langRegion === 'US'
        ? `Timezone ${p.tz} with language ${p.lang} is unusual`
        : null;
    },
  },
  {
    code: ANOMALY_CODES.CORES_LOW_MOBILE,
    severity: 'medium',
    field: 'cores',
    delta: -5,
    match: (p) =>
      p.family === 'android' && p.cores < 4 ? 'Android devices typically have ≥4 cores' : null,
  },
  {
    code: ANOMALY_CODES.IP_TYPE_MISMATCH,
    severity: 'medium',
    field: 'ip',
    delta: -8,
    match: (p, info) => {
      if (!info) return null;
      const t = classifyIp(info);
      return t === 'hosting' && (p.family === 'android' || p.family === 'ios')
        ? 'Mobile device behind a hosting IP is unusual'
        : null;
    },
  },
  {
    code: ANOMALY_CODES.IP_TYPE_MISMATCH,
    severity: 'high',
    field: 'ip',
    delta: -20,
    match: (p, info) => {
      if (!info) return null;
      return classifyIp(info) === 'tor' ? 'Tor exit node — high-risk IP' : null;
    },
  },
  {
    code: ANOMALY_CODES.HOST_PLATFORM_MISMATCH,
    severity: 'high',
    field: 'os',
    delta: -25,
    match: (p) => {
      const host = detectHostFamily();
      return host && p.family !== host
        ? `Preset OS ${p.family} differs from host ${host}: real GPU, fonts and canvas will contradict it`
        : null;
    },
  },
];

export function detectAnomalies(p: FootprintPreset, info?: IpInfo): Anomaly[] {
  const out: Anomaly[] = [];

  // GPU không có trong DB → medium
  if (!findGpu(p.gpu)) {
    out.push({
      code: ANOMALY_CODES.GPU_MISMATCH,
      severity: 'medium',
      message: `GPU "${p.gpu}" not found in known database`,
      field: 'gpu',
      delta: -8,
    });
  }

  for (const rule of ANOMALY_RULES) {
    const msg = rule.match(p, info);
    if (msg) {
      out.push({
        code: rule.code,
        severity: rule.severity,
        message: msg,
        field: rule.field,
        delta: rule.delta,
      });
    }
  }
  return out;
}

// ============================================================================
// SECTION 15 — TRUST FACTORS
// ============================================================================

export function computeTrustFactors(p: FootprintPreset, info?: IpInfo): TrustFactors {
  const ipType = info ? classifyIp(info) : 'unknown';
  const anomalies = detectAnomalies(p, info);
  const anomalyPenalty = anomalies.reduce((s, a) => s + (a.delta ?? 0), 0);

  // #9 — geo consistency dùng haversine (km), so với tâm quốc gia GEO[cc]
  // nếu có, để check không bị vô nghĩa khi p.geo = geo IP.
  let geoConsistency = 1;
  if (info?.lat != null && info.lon != null && p.geo) {
    const ref = GEO[p.cc] ?? p.geo;
    const km = haversineKm(info.lat, info.lon, ref[0], ref[1]);
    geoConsistency = clamp(1 - km / 3000, 0, 1);
  }

  const gpuProf = findGpu(p.gpu);
  const hardwareCoherence = gpuProf ? (gpuProf.platforms.includes(p.family) ? 1 : 0.3) : 0.5;

  const langRegion = (p.lang.split('-')[1] ?? '').toUpperCase();
  const languageConsistency = langRegion === p.cc ? 1 : 0.5;

  const tzRegion = p.tz.split('/')[0];
  const expectedRegion = CC_TO_TZ_REGION[p.cc];
  const timezoneConsistency = !expectedRegion ? 0.8 : tzRegion === expectedRegion ? 1 : 0.5;

  // #21 — browserPopularity từ usage (đã được tính theo share trong candidate)
  const browserPopularity = clamp(p.usage / 20, 0, 1);
  const entropy = p.entropy ?? 0;
  // #6 — thang rarity theo surprisal mới (~12 bit = cực hiếm)
  const rarity = clamp(entropy / 12, 0, 1);
  const ipTypeScore = IP_TYPE_TRUST[ipType];

  return {
    ipType: ipTypeScore,
    geoConsistency,
    hardwareCoherence,
    languageConsistency,
    timezoneConsistency,
    browserPopularity,
    entropy,
    rarity,
    anomalyPenalty,
  };
}

export function recombineTrust(f: TrustFactors): number {
  const base =
    0.3 * f.ipType +
    0.12 * f.geoConsistency +
    0.14 * f.hardwareCoherence +
    0.08 * f.languageConsistency +
    0.06 * f.timezoneConsistency +
    0.1 * f.browserPopularity +
    // #7 — hòa lẫn đám đông → fingerprint phổ biến = trust cao
    0.1 * (1 - f.rarity) +
    0.1 * (1 - clamp(Math.abs(f.anomalyPenalty) / 40, 0, 1));
  return clamp(Math.round(base * 100), 0, 100);
}

// ============================================================================
// SECTION 16 — FINGERPRINT BUILDER (per-section generators)
// ============================================================================

interface Ctx {
  p: FootprintPreset;
  seed: number;
  rng: SeededRandom;
  gpu?: GpuProfile;
  screen?: ScreenProfile;
}

interface UaResult {
  ua: string;
  platform: string;
  platformVersion: string;
  osToken: string;
  brand: string;
  vendor: string;
}

function buildUserAgent(p: FootprintPreset): UaResult {
  const win = p.family === 'windows';
  const mac = p.family === 'macos';
  const ios = p.family === 'ios';
  const android = p.family === 'android';
  const ipad = ios && p.deviceClass === 'tablet';
  const mobile = android || ios;
  const osVer = p.os.split(' ')[1] ?? '';
  const osVerUnderscore = osVer.replace('.', '_');

  // navigator.platform
  const platform = win
    ? 'Win32'
    : mac || ipad
      ? 'MacIntel'
      : ios
        ? 'iPhone'
        : android
          ? 'Linux armv8l'
          : 'Linux x86_64';

  // platformVersion (NavigatorUAData)
  const platformVersion = win
    ? p.os === 'Windows 11'
      ? '15.0.0'
      : '10.0.0'
    : mac || ipad
      ? `${osVer}.0.0`
      : ios
        ? `${osVer}.0.0`
        : android
          ? `${osVer}.0.0`
          : '6.5.0';

  // OS tokens
  const macTokenChromium = 'Macintosh; Intel Mac OS X 10_15_7';
  const macTokenFirefox = 'Macintosh; Intel Mac OS X 10.15';
  const iosToken = `iPhone; CPU iPhone OS ${osVerUnderscore} like Mac OS X`;
  // #4 — Android UA frozen at "10; K" (Chrome UA reduction)
  const androidToken = 'Linux; Android 10; K';
  const linuxToken = 'X11; Linux x86_64';
  const winToken = 'Windows NT 10.0; Win64; x64';

  let osToken: string;
  if (win) osToken = winToken;
  else if (ipad) osToken = p.browser === 'Firefox' ? macTokenFirefox : macTokenChromium;
  else if (mac) osToken = p.browser === 'Firefox' ? macTokenFirefox : macTokenChromium;
  else if (ios) osToken = iosToken;
  else if (android) osToken = androidToken;
  else osToken = linuxToken;

  let ua: string;
  let brand = '';
  let vendor = '';

  if (p.browser === 'Firefox') {
    ua = `Mozilla/5.0 (${osToken}; rv:${p.browserMajor}.0) Gecko/20100101 Firefox/${p.browserMajor}.0`;
  } else if (p.browser === 'Safari') {
    if (ipad) {
      ua = `Mozilla/5.0 (${macTokenChromium}) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${p.browserMajor}.0 Safari/605.1.15`;
    } else if (ios) {
      ua = `Mozilla/5.0 (${iosToken}) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${p.browserMajor}.0 Mobile/15E148 Safari/604.1`;
    } else {
      ua = `Mozilla/5.0 (${macTokenChromium}) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${p.browserMajor}.0 Safari/605.1.15`;
    }
    vendor = 'Apple Computer, Inc.';
  } else if (ios) {
    // Mọi browser trên iOS = WebKit; vendor = Apple
    if (p.browser === 'Firefox') {
      ua = `Mozilla/5.0 (${iosToken}) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/${p.browserMajor}.0 Mobile/15E148 Safari/605.1.15`;
    } else {
      ua = `Mozilla/5.0 (${iosToken}) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/${p.browserMajor}.0.0.0 Mobile/15E148 Safari/604.1`;
    }
    vendor = 'Apple Computer, Inc.';
  } else {
    // Chromium-based trên desktop / Android
    const chromeVersion = `${p.browserMajor}.0.0.0`;
    if (android) {
      ua = `Mozilla/5.0 (${androidToken}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Mobile Safari/537.36`;
    } else {
      ua = `Mozilla/5.0 (${osToken}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
    }
    switch (p.browser) {
      case 'Edge':
        brand = 'Microsoft Edge';
        break;
      case 'Opera':
        brand = 'Opera';
        break;
      case 'Brave':
        brand = 'Brave';
        break;
      default:
        brand = 'Google Chrome';
        break;
    }
    vendor = 'Google Inc.';
  }

  return { ua, platform, platformVersion, osToken, brand, vendor };
}

// #3 — WebGL renderer lookup theo browser + OS
function getRendererString(gpu: GpuProfile | undefined, browser: string, family: OsFamily): string {
  if (!gpu) return 'Unknown Renderer';
  // Safari (mac + iOS) và MỌI browser trên iOS đều trả 'Apple GPU'
  if ((browser === 'Safari' || family === 'ios') && gpu.webglRendererSafari) {
    return gpu.webglRendererSafari;
  }
  // Firefox Windows dùng ANGLE như Chrome; Firefox Linux/macOS dùng string native
  if (browser === 'Firefox' && family !== 'windows' && gpu.webglRendererFirefox) {
    return gpu.webglRendererFirefox;
  }
  // Chrome/Firefox trên Linux → Mesa / ANGLE-Mesa
  if (family === 'linux') {
    if (browser === 'Firefox' && gpu.webglRendererFirefox) return gpu.webglRendererFirefox;
    if (gpu.webglRendererLinux) return gpu.webglRendererLinux;
  }
  // Android Chrome — thường là ANGLE + Adreno/Mali
  if (family === 'android' && gpu.webglRendererAndroid) return gpu.webglRendererAndroid;
  return gpu.webglRendererChrome;
}

function buildWebglSection(
  p: FootprintPreset,
  gpu: GpuProfile | undefined,
  screen: ScreenProfile | undefined,
): FingerprintSection {
  const renderer = getRendererString(gpu, p.browser, p.family);
  // #3 — vendor string chính xác theo browser + OS
  const vendorStr =
    p.browser === 'Safari' || p.family === 'ios'
      ? 'Apple Inc.'
      : (gpu?.webglVendor ?? 'Google Inc.');

  const extList = WEBGL_EXTENSIONS[p.family];
  const extCount = extList.length;

  // #18 — maxTextureSize theo perfTier
  const maxTex = [8192, 8192, 16384, 16384, 32768][(gpu?.perfTier ?? 1) - 1] ?? 16384;

  return {
    id: 'webgl',
    title: 'WebGL',
    tone: 'primary',
    fields: [
      { label: 'Vendor', value: vendorStr },
      { label: 'Renderer', value: renderer },
      { label: 'Unmasked vendor', value: gpu?.webglVendor ?? 'Unknown' },
      { label: 'Unmasked renderer', value: renderer },
      { label: 'WebGL version', value: p.family === 'ios' ? 'WebGL 2.0' : 'WebGL 2.0' },
      { label: 'Shading language', value: 'WebGL GLSL ES 3.00' },
      { label: 'Max texture size', value: String(maxTex) },
      { label: 'Max cube map size', value: String(maxTex) },
      { label: 'Extensions', value: String(extCount), rare: extCount > 38 },
      { label: 'Screen size', value: screen?.resolution ?? 'Unknown' },
    ],
  };
}

function buildUserAgentSection(p: FootprintPreset, ua: UaResult): FingerprintSection {
  const isChromium =
    p.browser === 'Chrome' ||
    p.browser === 'Edge' ||
    p.browser === 'Opera' ||
    p.browser === 'Brave';
  const hasUAData = isChromium && p.family !== 'ios';
  // #10 — Firefox appVersion khác Chrome
  const appVersion = p.browser === 'Firefox' ? `5.0 (${p.os})` : ua.ua.replace('Mozilla/', '');

  return {
    id: 'ua',
    title: 'User Agent',
    tone: 'info',
    fields: [
      { label: 'User agent', value: ua.ua },
      { label: 'Platform', value: ua.platform },
      { label: 'App version', value: appVersion },
      { label: 'Vendor', value: ua.vendor },
      { label: 'Brand', value: hasUAData ? ua.brand : 'undefined' },
      { label: 'Brand version', value: hasUAData ? `${p.browserMajor}.0.0.0` : 'undefined' },
      { label: 'Platform version', value: hasUAData ? ua.platformVersion : 'undefined' },
      { label: 'Mobile flag', value: yn(p.family === 'android' || p.family === 'ios') },
    ],
  };
}

function buildHardwareSection(
  p: FootprintPreset,
  gpu: GpuProfile | undefined,
  screen: ScreenProfile | undefined,
): FingerprintSection {
  const mobile = p.family === 'android' || p.family === 'ios';
  // #10 — Firefox/Safari/iOS không có deviceMemory
  const chromiumEngine = p.family !== 'ios' && p.browser !== 'Firefox' && p.browser !== 'Safari';

  return {
    id: 'hardware',
    title: 'Hardware',
    tone: 'primary',
    fields: [
      { label: 'GPU', value: p.gpu },
      { label: 'Vendor', value: gpuVendorLabel(gpu) },
      { label: 'GPU class', value: gpu?.integrated ? 'Integrated' : 'Discrete' },
      { label: 'Performance tier', value: String(gpu?.perfTier ?? 'Unknown') },
      { label: 'CPU cores', value: String(p.cores), rare: p.cores > 16 },
      // #11 — chỉ 1 field touch, value 5 cho mobile, 0 cho desktop
      { label: 'Max touch points', value: mobile ? '5' : '0' },
      {
        label: 'Device memory (GB)',
        value: chromiumEngine ? String(Math.min(8, p.memory)) : 'undefined',
        rare: p.memory > 8,
      },
      { label: 'Screen', value: screen?.resolution ?? p.screen },
      { label: 'Device pixel ratio', value: String(p.dpr ?? 1) },
      { label: 'Screen class', value: screen?.deviceClass ?? p.deviceClass },
    ],
  };
}

function buildLocaleSection(p: FootprintPreset, tzOffset: number): FingerprintSection {
  const langList = [...new Set([p.lang, p.lang.split('-')[0]])];
  return {
    id: 'locale',
    title: 'Locale & Time',
    tone: 'info',
    fields: [
      { label: 'Timezone', value: p.tz },
      { label: 'TZ offset (min)', value: String(tzOffset) },
      { label: 'Languages', value: langList.join(', ') },
      { label: 'Locale', value: p.lang },
      { label: 'Country', value: p.cc },
    ],
  };
}

function buildNetworkSection(p: FootprintPreset): FingerprintSection {
  // #10/#17 — connection chỉ có trên Chromium; type wifi/ethernet chỉ Android
  const isChromium = p.family !== 'ios' && p.browser !== 'Firefox' && p.browser !== 'Safari';
  const isAndroid = p.family === 'android';

  return {
    id: 'network',
    title: 'Network',
    tone: 'primary',
    fields: [
      { label: 'Effective type', value: isChromium ? (isAndroid ? '4g' : '4g') : 'undefined' },
      { label: 'Downlink', value: isChromium ? (isAndroid ? '10' : '10') : 'undefined' },
      { label: 'RTT', value: isChromium ? (isAndroid ? '50' : '0') : 'undefined' },
      { label: 'Save data', value: isChromium ? 'false' : 'undefined' },
      { label: 'Connection type', value: isChromium && isAndroid ? 'wifi' : 'undefined' },
      { label: 'Battery', value: isChromium ? 'API available' : 'undefined' },
    ],
  };
}

function buildSections(p: FootprintPreset): FingerprintSection[] {
  const gpu = findGpu(p.gpu);
  const screen = findScreen(p.screen, p.dpr);
  const ua = buildUserAgent(p);
  const tzOffset = tzOffsetMinutes(p.tz);

  return [
    buildUserAgentSection(p, ua),
    buildHardwareSection(p, gpu, screen),
    buildWebglSection(p, gpu, screen),
    buildLocaleSection(p, tzOffset),
    buildNetworkSection(p),
  ];
}

// ============================================================================
// SECTION 17 — BOT PROBABILITY (#19 — không double-count IP risk)
// ============================================================================

export function estimateBotProbability(p: FootprintPreset, info?: IpInfo): number {
  const anomalies = p.anomalies ?? detectAnomalies(p, info);
  let score = 0;
  const seen = new Set<string>();

  for (const a of anomalies) {
    // Dedup theo code + field để không đếm 2 lần cùng rule
    const k = `${a.code}:${a.field ?? ''}`;
    if (seen.has(k)) continue;
    seen.add(k);
    if (a.severity === 'high') score += 0.3;
    else if (a.severity === 'medium') score += 0.15;
    else score += 0.05;
  }

  // Info-level risk (chỉ tính 1 lần cho IP risk)
  if (info) {
    const t = classifyIp(info);
    if (t === 'tor') score += 0.25;
    else if (t === 'proxy') score += 0.15;
    else if (t === 'vpn') score += 0.1;
    else if (t === 'hosting') score += 0.05;
  }

  // Trust factor đóng góp nhẹ
  const trust = p.trust ?? 70;
  if (trust < 40) score += 0.1;
  if (trust < 25) score += 0.1;

  return Math.round(clamp(score, 0, 1) * 100) / 100;
}

// ============================================================================
// SECTION 18 — CROSS VALIDATION (#19 — dùng chung bảng rule)
// ============================================================================

export interface CrossIssue {
  code: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
}

export function crossValidate(p: FootprintPreset, info?: IpInfo): CrossIssue[] {
  return detectAnomalies(p, info).map((a) => ({
    code: a.code,
    severity: a.severity,
    message: a.message,
  }));
}

// ============================================================================
// SECTION 19 — FULL REPORT (#8 — 1 nguồn trust duy nhất)
// ============================================================================

export function buildFullReport(p: FootprintPreset, info?: IpInfo): FingerprintReport {
  const sections = buildSections(p);
  const factors = computeTrustFactors(p, info);
  const trust = recombineTrust(factors);
  const anomalies = detectAnomalies(p, info);
  const entropy = p.entropy ?? 0;
  const hash = p.fingerprintHash ?? hex(fnv1a(JSON.stringify(p)));

  return {
    sections,
    trust,
    entropy,
    uniqueness: p.uniqueness ?? uniquenessLabel(entropy),
    botProbability: estimateBotProbability(p, info),
    anomalies,
    factors,
    hash,
  };
}

// ============================================================================
// SECTION 20 — FILTERED GENERATION
// ============================================================================

export function generateFiltered(
  info: IpInfo,
  maxResults: number = MAX_RESULTS,
  ensureFamilies: OsFamily[] = [],
): FootprintPreset[] {
  let out = generateFootprints(info).slice(0, maxResults);

  for (const family of ensureFamilies) {
    if (out.some((p) => p.family === family)) continue;
    // #14 — dùng forceFamily thay vì fake IP
    const extra = generateFootprints(info, family).filter(
      (p) => !out.some((existing) => existing.id === p.id),
    );

    if (extra.length) {
      // Chỉ lấy 1 preset mỗi family, và đảm bảo không vượt maxResults
      const candidate = extra[0];
      if (out.length >= maxResults) {
        // Ưu tiên giữ preset family cần: bỏ preset cuối (thấp điểm nhất)
        out.pop();
      }
      out.push(candidate);
    }
  }

  return out;
}

// ============================================================================
// SECTION 21 — BACKWARD-COMPAT HELPERS
// ============================================================================

export function generatePresets(info: IpInfo): FootprintPreset[] {
  return generateFootprints(info);
}

export { MAX_RESULTS, MAX_PER_DEVICE };
