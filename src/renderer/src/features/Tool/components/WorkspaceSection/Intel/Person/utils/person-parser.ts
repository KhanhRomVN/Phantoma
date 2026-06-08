/**
 * Person RECON Parser — transforms raw JSON output from Person/Email RECON tools into structured ReconResult.
 */
import type { ReconResult } from '../types/recon-result';
import type { DataPoint } from '../types/data-point';
import type { DataSource } from '../types/data-point';
import { disambiguateEntities } from './entity-disambiguator';
import { scoreDataPoint, calculateRiskScore } from './confidence-scorer';
import {
  normalizeIdentityField,
  normalizeEmail,
  normalizePhone,
  normalizeAddress,
  normalizeMessenger,
  normalizeSocialProfile,
  normalizePublicKey,
  normalizeDomain,
  normalizeIpAddress,
  normalizeTechnology,
  normalizeRepoContribution,
  normalizeToolPublished,
  normalizeConference,
  normalizeCtfResult,
  normalizePasswordLeak,
  normalizeCredentialLeak,
  normalizeDarkwebMention,
  normalizePastebinLeak,
  normalizeService,
  normalizeNoiseResult,
} from './person-normalizer';
import { PERSON_CATEGORY_GROUPS } from '../types/person-categories';
import type { SmartCategoryGroup } from '../types/smart-category';

function classifyPersonDataPoints(dataPoints: DataPoint[]): ReconResult['activeCategoryGroups'] {
  const categoryCounts = new Map<string, number>();
  for (const dp of dataPoints) {
    const count = categoryCounts.get(dp.category) || 0;
    categoryCounts.set(dp.category, count + 1);
  }

  return PERSON_CATEGORY_GROUPS.map((g): SmartCategoryGroup & { isActive: boolean; count: number } => ({
    id: g.id,
    label: g.label,
    icon: g.icon,
    accent: g.accent,
    priority: g.priority,
    description: g.description,
    categories: g.categories as string[],
    isActive: ['overview', 'raw', 'sources'].includes(g.id) || g.categories.some((c: string) => (categoryCounts.get(c) || 0) > 0),
    count: g.id === 'overview'
      ? dataPoints.length
      : g.id === 'sources'
        ? new Set(dataPoints.map(dp => dp.source.id)).size
        : g.id === 'timeline'
          ? dataPoints.filter(dp => dp.discoveredAt).length
          : g.categories.reduce((sum: number, c: string) => sum + (categoryCounts.get(c) || 0), 0),
  })).sort((a, b) => a.priority - b.priority);
}

export function parsePersonReconResult(rawData: Record<string, unknown>): ReconResult {
  const allDataPoints: DataPoint[] = [];
  const allSources: DataSource[] = [];
  const sourceMap = new Map<string, DataSource>();

  const query = { value: String(rawData.target || 'Unknown'), type: 'email' as const };
  const targetName = rawData.identityInfo
    ? (rawData.identityInfo as Record<string, unknown>).fullName as string | undefined
    : undefined;

  const scan = {
    startedAt: String(rawData.scanTime || new Date().toISOString()),
    completedAt: String(rawData.scanTime || new Date().toISOString()),
    duration: Number(rawData.scanDuration || 0),
    totalRawHits: Number(rawData.totalHits || 0),
    totalProcessedHits: 0,
  };

  function getSource(name: string, type: string): DataSource {
    const key = name;
    if (sourceMap.has(key)) return sourceMap.get(key)!;
    const credibilityMap: Record<string, number> = {
      'Identity Aggregator': 0.85,
      'Email Verifier': 0.9,
      'Phone Lookup': 0.8,
      'Social Media Scanner': 0.75,
      'GitHub API': 0.9,
      'Keybase': 0.85,
      'Breach Database': 0.8,
      'Pastebin Scanner': 0.55,
      'Dark Web Monitor': 0.6,
      'Domain WHOIS': 0.85,
      'IP Geolocation': 0.7,
      'OSINT Framework': 0.7,
      'People Search': 0.65,
      'Username Search': 0.6,
      'HackerOne API': 0.9,
      'Bugcrowd API': 0.85,
      'Twitter API': 0.8,
      'LinkedIn Scraper': 0.7,
    };
    const source: DataSource = {
      id: `src-person-${name.toLowerCase().replace(/[\s/()]+/g, '-')}`,
      name,
      type: type as DataSource['type'],
      credibility: credibilityMap[name] || 0.5,
    };
    sourceMap.set(key, source);
    allSources.push(source);
    return source;
  }

  // ── Identity ──
  const identityInfo = rawData.identityInfo as Record<string, unknown> | undefined;
  if (identityInfo) {
    const identitySource = getSource('Identity Aggregator', 'osint_framework');
    for (const [key, value] of Object.entries(identityInfo)) {
      if (key === 'notes') continue;
      const dps = normalizeIdentityField(key, value, identitySource);
      for (const dp of dps) {
        scoreDataPoint(dp);
        allDataPoints.push(dp);
      }
    }
  }

  // ── Contact ──
  const contactInfo = rawData.contactInfo as Record<string, unknown> | undefined;
  if (contactInfo) {
    const contactSource = getSource('Email Verifier', 'email_verifier');
    const emails = contactInfo.email as string[] | undefined;
    if (emails) {
      for (let i = 0; i < emails.length; i++) {
        const dp = normalizeEmail(emails[i], contactSource, i === 0);
        scoreDataPoint(dp);
        allDataPoints.push(dp);
      }
    }

    const phones = contactInfo.phoneNumber as string[] | undefined;
    if (phones) {
      const phoneSource = getSource('Phone Lookup', 'contact_scraper');
      for (const phone of phones) {
        const dp = normalizePhone(phone, phoneSource);
        scoreDataPoint(dp);
        allDataPoints.push(dp);
      }
    }

    const addresses = contactInfo.address as string[] | undefined;
    if (addresses) {
      const addrSource = getSource('People Search', 'people_search');
      for (const addr of addresses) {
        const dp = normalizeAddress(addr, addrSource);
        scoreDataPoint(dp);
        allDataPoints.push(dp);
      }
    }

    const messengers = contactInfo.messengerAccounts as Array<{ platform: string; username: string }> | undefined;
    if (messengers) {
      const msgSource = getSource('Social Media Scanner', 'social_media');
      for (const m of messengers) {
        const dp = normalizeMessenger(m.platform, m.username, msgSource);
        scoreDataPoint(dp);
        allDataPoints.push(dp);
      }
    }
  }

  // ── Social Media ──
  const socialMedia = rawData.socialMedia as Record<string, unknown> | undefined;
  if (socialMedia) {
    const socialSource = getSource('Social Media Scanner', 'social_media');
    for (const [platform, profile] of Object.entries(socialMedia)) {
      if (platform === 'other') {
        const otherProfiles = profile as Array<Record<string, unknown>> | undefined;
        if (otherProfiles) {
          for (const op of otherProfiles) {
            const dps = normalizeSocialProfile(op.platform as string || 'other', op, socialSource);
            for (const dp of dps) { scoreDataPoint(dp); allDataPoints.push(dp); }
          }
        }
      } else if (profile && typeof profile === 'object') {
        const dps = normalizeSocialProfile(platform, profile as Record<string, unknown>, socialSource);
        for (const dp of dps) { scoreDataPoint(dp); allDataPoints.push(dp); }
      }
    }
  }

  // ── Technical Footprint ──
  const tech = rawData.technicalFootprint as Record<string, unknown> | undefined;
  if (tech) {
    const techSource = getSource('GitHub API', 'github_api');
    const gitSource = getSource('GitHub API', 'github_api');
    const domainSource = getSource('Domain WHOIS', 'domain_whois');
    const ipSource = getSource('IP Geolocation', 'osint_framework');

    const publicKeys = tech.publicKeys as Array<Record<string, unknown>> | undefined;
    if (publicKeys) {
      for (const key of publicKeys) {
        const dp = normalizePublicKey(
          { type: String(key.type || ''), keyId: key.keyId as string, fingerprint: key.fingerprint as string, created: key.created as string, source: key.source as string },
          getSource('Keybase', 'keybase'),
        );
        scoreDataPoint(dp); allDataPoints.push(dp);
      }
    }

    const domains = tech.domainOwnership as Array<Record<string, unknown>> | undefined;
    if (domains) {
      for (const d of domains) {
        const dp = normalizeDomain(String(d.domain || ''), domainSource, d as Record<string, unknown>);
        scoreDataPoint(dp); allDataPoints.push(dp);
      }
    }

    const ips = tech.ipAddresses as Array<Record<string, unknown>> | undefined;
    if (ips) {
      for (const ip of ips) {
        const dp = normalizeIpAddress(String(ip.ip || ''), ip.type as string, ipSource, ip as Record<string, unknown>);
        scoreDataPoint(dp); allDataPoints.push(dp);
      }
    }

    const technologies = tech.technologies as string[] | undefined;
    if (technologies) {
      for (const t of technologies) {
        const dp = normalizeTechnology(t, techSource);
        scoreDataPoint(dp); allDataPoints.push(dp);
      }
    }

    const repos = tech.repositoryContributions as Array<Record<string, unknown>> | undefined;
    if (repos) {
      for (const r of repos) {
        const dp = normalizeRepoContribution(
          String(r.repo || ''), Number(r.contributions || 0),
          r.language as string, r.stars as number, gitSource,
        );
        scoreDataPoint(dp); allDataPoints.push(dp);
      }
    }

    const tools = tech.toolsPublished as Array<Record<string, unknown>> | undefined;
    if (tools) {
      for (const t of tools) {
        const dp = normalizeToolPublished(
          String(t.name || ''), String(t.url || ''), String(t.description || ''),
          t.language as string, t.stars as number, gitSource,
        );
        scoreDataPoint(dp); allDataPoints.push(dp);
      }
    }

    const conferences = tech.conferences as Array<Record<string, unknown>> | undefined;
    if (conferences) {
      for (const c of conferences) {
        const dp = normalizeConference(
          String(c.name || ''), String(c.role || ''), c.topic as string, techSource,
        );
        scoreDataPoint(dp); allDataPoints.push(dp);
      }
    }

    const ctfs = tech.ctfResults as Array<Record<string, unknown>> | undefined;
    if (ctfs) {
      for (const c of ctfs) {
        const dp = normalizeCtfResult(
          String(c.ctf || ''), Number(c.rank || 0), String(c.team || ''), techSource,
        );
        scoreDataPoint(dp); allDataPoints.push(dp);
      }
    }
  }

  // ── Leak Exposure ──
  const leaks = rawData.leakExposure as Record<string, unknown> | undefined;
  if (leaks) {
    const breachSource = getSource('Breach Database', 'breach_db');
    const pastebinSource = getSource('Pastebin Scanner', 'pastebin');
    const darkwebSource = getSource('Dark Web Monitor', 'darkweb');

    const passwordLeaks = leaks.passwordLeaks as Array<Record<string, unknown>> | undefined;
    if (passwordLeaks) {
      for (const pl of passwordLeaks) {
        const dp = normalizePasswordLeak(
          String(pl.source || ''), String(pl.date || ''), String(pl.email || ''),
          String(pl.severity || 'LOW'), breachSource, pl as Record<string, unknown>,
        );
        scoreDataPoint(dp); allDataPoints.push(dp);
      }
    }

    const credentialLeaks = leaks.credentialLeaks as Array<Record<string, unknown>> | undefined;
    if (credentialLeaks) {
      for (const cl of credentialLeaks) {
        const dp = normalizeCredentialLeak(
          String(cl.source || ''), String(cl.date || ''), String(cl.url || ''),
          String(cl.content || ''), Boolean(cl.validated), pastebinSource,
        );
        scoreDataPoint(dp); allDataPoints.push(dp);
      }
    }

    const darkwebMentions = leaks.darkwebMentions as Array<Record<string, unknown>> | undefined;
    if (darkwebMentions) {
      for (const dm of darkwebMentions) {
        const dp = normalizeDarkwebMention(
          String(dm.marketplace || ''), String(dm.date || ''),
          String(dm.threadTitle || ''), String(dm.detail || ''), darkwebSource,
        );
        scoreDataPoint(dp); allDataPoints.push(dp);
      }
    }

    const pastebinLeaks = leaks.pastebinLeaks as Array<Record<string, unknown>> | undefined;
    if (pastebinLeaks) {
      for (const pl of pastebinLeaks) {
        const dp = normalizePastebinLeak(
          String(pl.url || ''), String(pl.date || ''), String(pl.title || ''),
          String(pl.content || ''), pastebinSource,
        );
        scoreDataPoint(dp); allDataPoints.push(dp);
      }
    }
  }

  // ── Registered Services ──
  const services = rawData.registeredServices as Array<Record<string, unknown>> | undefined;
  if (services) {
    const serviceSource = getSource('OSINT Framework', 'osint_framework');
    for (const svc of services) {
      const dp = normalizeService(
        String(svc.service || ''), Boolean(svc.confirmed),
        svc.url as string | null | undefined, serviceSource,
        svc.note as string | undefined,
      );
      scoreDataPoint(dp); allDataPoints.push(dp);
    }
  }

  // ── Noise ──
  const noiseResults = rawData.noiseResults as Array<Record<string, unknown>> | undefined;
  if (noiseResults) {
    const noiseSource = getSource('Username Search', 'username_search');
    for (const nr of noiseResults) {
      const dp = normalizeNoiseResult(
        String(nr.type || 'collision'), String(nr.platform || ''),
        String(nr.note || ''), noiseSource, nr as Record<string, unknown>,
      );
      scoreDataPoint(dp); allDataPoints.push(dp);
    }
  }

  scan.totalProcessedHits = allDataPoints.length;

  const { entities, unassigned } = disambiguateEntities(allDataPoints, allSources);

  for (const entity of entities) {
    entity.riskScore = calculateRiskScore(entity);
  }

  const activeCategoryGroups = classifyPersonDataPoints(allDataPoints);

  const overallConfidence = entities.length > 0
    ? entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length
    : allDataPoints.length > 0
      ? allDataPoints.reduce((sum, dp) => sum + dp.confidence, 0) / allDataPoints.length
      : 0;

  const warnings = (rawData.warnings as string[]) || [];

  return {
    query: { value: query.value, type: 'email' as const },
    targetName,
    scan,
    entities,
    allDataPoints,
    unassignedDataPoints: unassigned,
    sources: allSources,
    activeCategoryGroups,
    overallConfidence,
    warnings,
  };
}