/**
 * Person Data Normalizer — normalizes person/email reconnaissance data into DataPoints.
 */
import type { DataPoint } from '../types/data-point';
import type { DataSource } from '../types/data-point';
import type { PersonDataCategory } from '../types/person-data-point';

let _dpCounter = 0;
function nextId(): string {
  return `dp-person-${Date.now()}-${++_dpCounter}`;
}

function createDataPoint(
  category: PersonDataCategory,
  label: string,
  value: unknown,
  source: DataSource,
  overrides: Partial<DataPoint> = {},
): DataPoint {
  return {
    id: nextId(),
    category,
    label,
    value,
    displayValue: typeof value === 'string' ? value.substring(0, 200) : String(value).substring(0, 200),
    confidence: 0.5,
    source,
    relevance: 0.5,
    isNoise: false,
    verificationStatus: 'unverified',
    discoveredAt: new Date().toISOString(),
    ...overrides,
  };
}

// ── Identity ──

export function normalizeIdentityField(
  field: string,
  value: unknown,
  source: DataSource,
): DataPoint[] {
  const dps: DataPoint[] = [];
  if (value === null || value === undefined) return dps;

  const fieldMap: Record<string, PersonDataCategory> = {
    fullName: 'identity_full_name',
    alias: 'identity_alias',
    username: 'identity_username',
    nickname: 'identity_nickname',
    avatar: 'identity_avatar',
    possibleRealNames: 'identity_real_name',
    estimatedAge: 'identity_age',
    gender: 'identity_gender',
    nationality: 'identity_nationality',
    language: 'identity_language',
    location: 'identity_location',
    timezone: 'identity_timezone',
    bio: 'identity_bio',
  };

  const category = fieldMap[field] || 'other';

  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string') {
        dps.push(createDataPoint(category, field, item, source, {
          confidence: 0.85,
          relevance: 0.7,
          tags: ['confirmed', 'primary-identity'],
        }));
      }
    }
  } else if (typeof value === 'string' || typeof value === 'number') {
    dps.push(createDataPoint(category, field, value, source, {
      confidence: 0.9,
      relevance: 0.8,
      tags: ['confirmed', 'primary-identity'],
    }));
  }

  return dps;
}

// ── Contact ──

export function normalizeEmail(email: string, source: DataSource, isPrimary = false): DataPoint {
  return createDataPoint('contact_email', 'Email', email, source, {
    confidence: isPrimary ? 0.95 : 0.7,
    relevance: isPrimary ? 0.9 : 0.5,
    tags: isPrimary ? ['confirmed', 'primary-identity'] : ['confirmed'],
  });
}

export function normalizePhone(phone: string, source: DataSource): DataPoint {
  return createDataPoint('contact_phone', 'Phone', phone, source, {
    confidence: 0.8,
    relevance: 0.7,
    tags: ['confirmed'],
  });
}

export function normalizeAddress(address: string, source: DataSource): DataPoint {
  return createDataPoint('contact_address', 'Address', address, source, {
    confidence: 0.75,
    relevance: 0.7,
    tags: ['confirmed'],
  });
}

export function normalizeMessenger(
  platform: string,
  username: string,
  source: DataSource,
): DataPoint {
  return createDataPoint('contact_messenger', `Messenger: ${platform}`, username, source, {
    confidence: 0.8,
    relevance: 0.6,
    metadata: { platform },
  });
}

// ── Social Media ──

export function normalizeSocialProfile(
  platform: string,
  profile: Record<string, unknown>,
  source: DataSource,
): DataPoint[] {
  const dps: DataPoint[] = [];

  const platformCategoryMap: Record<string, PersonDataCategory> = {
    twitter: 'social_twitter',
    linkedin: 'social_linkedin',
    github: 'social_github',
    facebook: 'social_facebook',
    instagram: 'social_instagram',
    reddit: 'social_reddit',
    hackerone: 'social_hackerone',
    bugcrowd: 'social_bugcrowd',
    stackoverflow: 'social_stackoverflow',
    medium: 'social_medium',
    youtube: 'social_youtube',
    patreon: 'social_patreon',
    devto: 'social_devto',
    keybase: 'social_keybase',
    mastodon: 'social_mastodon',
    flickr: 'social_flickr',
    tiktok: 'social_tiktok',
    pinterest: 'social_pinterest',
    goodreads: 'social_goodreads',
    letterboxd: 'social_letterboxd',
    myanimelist: 'social_myanimelist',
    anilist: 'social_anilist',
    trakt: 'social_trakt',
    vimeo: 'social_vimeo',
    dribbble: 'social_dribbble',
    behance: 'social_behance',
    steam: 'social_steam',
    twitch: 'social_twitch',
    couchsurfing: 'social_couchsurfing',
    meetup: 'social_meetup',
  };

  const category = platformCategoryMap[platform] || 'social_other';
  const url = profile.url as string | undefined;
  const username = profile.username as string | undefined;
  const isNoise = !!profile.note;

  if (url) {
    dps.push(createDataPoint(category, `${platform} profile`, url, source, {
      displayValue: `${username || platform}: ${url}`,
      confidence: isNoise ? 0.35 : 0.85,
      relevance: isNoise ? 0.15 : 0.7,
      isNoise,
      tags: isNoise ? ['collision'] : ['confirmed'],
      metadata: profile,
    }));
  } else if (username) {
    dps.push(createDataPoint(category, `${platform} username`, username, source, {
      confidence: isNoise ? 0.3 : 0.7,
      relevance: isNoise ? 0.15 : 0.5,
      isNoise,
      tags: isNoise ? ['collision'] : [],
      metadata: profile,
    }));
  }

  return dps;
}

// ── Technical Footprint ──

export function normalizePublicKey(
  key: { type: string; keyId?: string; fingerprint?: string; created?: string; source?: string },
  source: DataSource,
): DataPoint {
  return createDataPoint('tech_public_key', `${key.type} Key`, key.fingerprint || key.keyId || key.type, source, {
    confidence: 0.9,
    relevance: 0.7,
    metadata: key as unknown as Record<string, unknown>,
  });
}

export function normalizeDomain(domain: string, source: DataSource, metadata?: Record<string, unknown>): DataPoint {
  return createDataPoint('tech_domain', 'Domain', domain, source, {
    confidence: 0.85,
    relevance: 0.7,
    metadata,
  });
}

export function normalizeIpAddress(
  ip: string,
  ipType: string | undefined,
  source: DataSource,
  metadata?: Record<string, unknown>,
): DataPoint {
  return createDataPoint('tech_ip_address', `IP (${ipType || 'unknown'})`, ip, source, {
    confidence: 0.7,
    relevance: 0.5,
    metadata,
  });
}

export function normalizeTechnology(tech: string, source: DataSource): DataPoint {
  return createDataPoint('tech_technology', 'Technology', tech, source, {
    confidence: 0.6,
    relevance: 0.3,
  });
}

export function normalizeRepoContribution(
  repo: string,
  contributions: number,
  language: string | undefined,
  stars: number | undefined,
  source: DataSource,
): DataPoint {
  return createDataPoint('tech_repo_contribution', 'Repo Contribution', repo, source, {
    displayValue: `${repo} — ${contributions} commits${stars ? `, ${stars}★` : ''}`,
    confidence: 0.9,
    relevance: 0.6,
    metadata: { contributions, language, stars },
  });
}

export function normalizeToolPublished(
  name: string,
  url: string,
  description: string,
  language: string | undefined,
  stars: number | undefined,
  source: DataSource,
): DataPoint {
  return createDataPoint('tech_tool_published', 'Tool', name, source, {
    displayValue: `${name}${stars ? ` (${stars}★)` : ''} — ${description}`,
    confidence: 0.9,
    relevance: 0.7,
    metadata: { url, description, language, stars },
  });
}

export function normalizeConference(
  name: string,
  role: string,
  topic: string | undefined,
  source: DataSource,
): DataPoint {
  return createDataPoint('tech_conference', 'Conference', name, source, {
    displayValue: `${role}: ${name}${topic ? ` — ${topic}` : ''}`,
    confidence: 0.85,
    relevance: 0.5,
    metadata: { role, topic },
  });
}

export function normalizeCtfResult(
  ctf: string,
  rank: number,
  team: string,
  source: DataSource,
): DataPoint {
  return createDataPoint('tech_ctf_result', 'CTF Result', ctf, source, {
    displayValue: `Rank #${rank} — ${ctf} (${team})`,
    confidence: 0.9,
    relevance: 0.5,
    metadata: { rank, team },
  });
}

// ── Leaks ──

export function normalizePasswordLeak(
  leakSource: string,
  date: string,
  email: string,
  severity: string,
  source: DataSource,
  metadata?: Record<string, unknown>,
): DataPoint {
  const isNoise = severity === 'LOW';
  return createDataPoint('leak_password', 'Password Leak', leakSource, source, {
    displayValue: `${leakSource} (${severity}) — ${date}`,
    confidence: 0.7,
    relevance: severity === 'HIGH' ? 0.9 : 0.6,
    isNoise,
    tags: ['high-risk', ...(isNoise ? ['false-positive'] : ['confirmed'])],
    metadata,
    discoveredAt: date,
    riskScore: severity === 'HIGH' ? 85 : severity === 'MEDIUM' ? 55 : 25,
  });
}

export function normalizeCredentialLeak(
  leakSource: string,
  date: string,
  url: string,
  content: string,
  validated: boolean,
  source: DataSource,
): DataPoint {
  return createDataPoint('leak_credential', 'Credential Leak', leakSource, source, {
    displayValue: content.substring(0, 150),
    confidence: validated ? 0.85 : 0.4,
    relevance: 0.9,
    tags: ['high-risk'],
    metadata: { url, date, validated },
    discoveredAt: date,
    riskScore: 90,
  });
}

export function normalizeDarkwebMention(
  marketplace: string,
  date: string,
  threadTitle: string,
  detail: string,
  source: DataSource,
): DataPoint {
  return createDataPoint('leak_darkweb_mention', 'Dark Web Mention', marketplace, source, {
    displayValue: `${threadTitle} — ${detail.substring(0, 100)}`,
    confidence: 0.6,
    relevance: 0.85,
    tags: ['high-risk', 'darkweb'],
    metadata: { marketplace, threadTitle, detail },
    discoveredAt: date,
    riskScore: 80,
  });
}

export function normalizePastebinLeak(
  url: string,
  date: string,
  title: string,
  content: string,
  source: DataSource,
): DataPoint {
  return createDataPoint('leak_pastebin', 'Pastebin Leak', title, source, {
    displayValue: content.substring(0, 150),
    confidence: 0.5,
    relevance: 0.7,
    metadata: { url, date, content },
    discoveredAt: date,
    riskScore: 65,
  });
}

// ── Services ──

export function normalizeService(
  service: string,
  confirmed: boolean,
  url: string | null | undefined,
  source: DataSource,
  note?: string,
): DataPoint {
  return createDataPoint(
    confirmed ? 'service_registered' : 'service_unconfirmed',
    'Service',
    service,
    source,
    {
      displayValue: `${service}${url ? ' — ' + url : ''}${note ? ' (' + note + ')' : ''}`,
      confidence: confirmed ? 0.8 : 0.3,
      relevance: confirmed ? 0.5 : 0.2,
      isNoise: !confirmed,
      tags: confirmed ? ['confirmed'] : ['false-positive'],
      metadata: { url, note },
    },
  );
}

// ── Noise ──

export function normalizeNoiseResult(
  noiseType: string,
  platform: string,
  note: string,
  source: DataSource,
  metadata?: Record<string, unknown>,
): DataPoint {
  const categoryMap: Record<string, PersonDataCategory> = {
    username_collision: 'noise_username_collision',
    email_similar: 'noise_email_similar',
    domain_mention: 'noise_domain_mention',
    breach_false_positive: 'noise_breach_false_positive',
    social_media_false_positive: 'noise_social_false_positive',
    ip_geolocation_conflict: 'noise_ip_conflict',
    collision: 'noise_collision',
  };

  const category = categoryMap[noiseType] || 'noise_collision';

  return createDataPoint(category, `Noise: ${platform}`, note, source, {
    confidence: 0.15,
    relevance: 0.05,
    isNoise: true,
    tags: ['false-positive', 'noise'],
    metadata,
  });
}