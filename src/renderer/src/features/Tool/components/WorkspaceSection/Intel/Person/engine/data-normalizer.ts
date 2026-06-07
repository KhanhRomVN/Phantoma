/**
 * Data Normalizer — transforms raw, messy RECON output into structured DataPoints.
 * Handles inconsistent formats, missing fields, nested objects, etc.
 */
import type { DataPoint, DataCategory } from '../types/data-point';
import type { DataSource } from '../types/source';

let _dpCounter = 0;
function nextId(): string {
  return `dp-${Date.now()}-${++_dpCounter}`;
}

/**
 * Normalize a raw data item into a DataPoint.
 * Attempts to extract meaningful structure from arbitrary input.
 */
export function normalizeDataItem(
  raw: unknown,
  source: DataSource,
  categoryHint?: DataCategory,
): DataPoint | null {
  if (raw === null || raw === undefined) return null;

  const dp: DataPoint = {
    id: nextId(),
    category: 'unclassified',
    label: '',
    value: raw,
    confidence: 0.5,
    source,
    relevance: 0.5,
    isNoise: false,
    verificationStatus: 'unverified',
    discoveredAt: new Date().toISOString(),
  };

  if (typeof raw === 'string') {
    return normalizeStringItem(raw, source, dp, categoryHint);
  }

  if (Array.isArray(raw)) {
    return normalizeArrayItem(raw, source, dp, categoryHint);
  }

  if (typeof raw === 'object') {
    return normalizeObjectItem(raw as Record<string, unknown>, source, dp, categoryHint);
  }

  return dp;
}

function normalizeStringItem(
  value: string,
  source: DataSource,
  dp: DataPoint,
  categoryHint?: DataCategory,
): DataPoint {
  const trimmed = value.trim();
  if (!trimmed) return dp;

  dp.displayValue = trimmed.length > 200 ? trimmed.substring(0, 200) + '…' : trimmed;

  // Email pattern
  if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmed)) {
    dp.category = 'email';
    dp.label = 'Email';
    dp.confidence = 0.9;
    dp.relevance = 0.9;
    return dp;
  }

  // Phone pattern (international)
  if (/^\+?[\d\s\-().]{7,20}$/.test(trimmed) && trimmed.replace(/[\s\-().]/g, '').length >= 7) {
    dp.category = 'phone';
    dp.label = 'Phone';
    dp.confidence = 0.7;
    dp.relevance = 0.8;
    return dp;
  }

  // IP address
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(trimmed)) {
    dp.category = 'ip_address';
    dp.label = 'IP Address';
    dp.confidence = 0.85;
    dp.relevance = 0.6;
    return dp;
  }

  // URL
  if (/^https?:\/\//.test(trimmed) || /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\//.test(trimmed)) {
    const urlLower = trimmed.toLowerCase();
    if (/github\.com|gitlab\.com|bitbucket\.org/.test(urlLower)) {
      dp.category = 'repository';
      dp.label = 'Repository';
    } else if (/twitter\.com|x\.com|facebook\.com|instagram\.com|linkedin\.com|tiktok\.com|reddit\.com|discord\./.test(urlLower)) {
      dp.category = 'social_profile';
      dp.label = 'Social Profile';
    } else if (/pastebin\.com|rentry\.org|justpaste\.it/.test(urlLower)) {
      dp.category = 'pastebin_entry';
      dp.label = 'Pastebin';
    } else {
      dp.category = 'url';
      dp.label = 'URL';
    }
    dp.confidence = 0.7;
    dp.relevance = 0.6;
    return dp;
  }

  // SSH/PGP key patterns
  if (/^ssh-(rsa|ed25519|dss|ecdsa)\s+/.test(trimmed)) {
    dp.category = 'ssh_key';
    dp.label = 'SSH Key';
    dp.confidence = 0.9;
    dp.relevance = 0.8;
    return dp;
  }
  if (/^-----BEGIN (PGP|RSA|DSA|EC) (PUBLIC|PRIVATE) KEY-----/.test(trimmed)) {
    dp.category = 'pgp_key';
    dp.label = 'PGP Key';
    dp.confidence = 0.9;
    dp.relevance = 0.8;
    return dp;
  }

  // Crypto address patterns (BTC, ETH)
  if (/^(1|3|bc1)[a-zA-Z0-9]{25,39}$/.test(trimmed)) {
    dp.category = 'crypto_address';
    dp.label = 'Bitcoin Address';
    dp.confidence = 0.8;
    dp.relevance = 0.7;
    return dp;
  }
  if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
    dp.category = 'crypto_address';
    dp.label = 'Ethereum Address';
    dp.confidence = 0.8;
    dp.relevance = 0.7;
    return dp;
  }

  // Hash patterns
  if (/^[a-f0-9]{32}$/i.test(trimmed)) {
    dp.category = 'credential_leak';
    dp.label = 'MD5 Hash';
    dp.confidence = 0.5;
    dp.relevance = 0.4;
    return dp;
  }
  if (/^[a-f0-9]{40}$/i.test(trimmed)) {
    dp.category = 'credential_leak';
    dp.label = 'SHA1 Hash';
    dp.confidence = 0.5;
    dp.relevance = 0.4;
    return dp;
  }

  // Likely a username/handle if short alphanumeric
  if (/^@?[a-zA-Z0-9_.-]{3,30}$/.test(trimmed)) {
    dp.category = categoryHint || 'username';
    dp.label = 'Username';
    dp.confidence = 0.4;
    dp.relevance = 0.5;
    return dp;
  }

  // Default: treat as unclassified text
  dp.category = categoryHint || 'unclassified';
  dp.label = 'Text';
  dp.confidence = 0.3;
  dp.relevance = 0.3;
  dp.isNoise = true;
  return dp;
}

function normalizeArrayItem(
  arr: unknown[],
  source: DataSource,
  dp: DataPoint,
  categoryHint?: DataCategory,
): DataPoint {
  dp.category = 'unclassified';
  dp.label = `List (${arr.length} items)`;
  dp.displayValue = JSON.stringify(arr.slice(0, 5));
  dp.value = arr;
  dp.confidence = 0.5;
  dp.relevance = 0.4;
  return dp;
}

function normalizeObjectItem(
  obj: Record<string, unknown>,
  source: DataSource,
  dp: DataPoint,
  categoryHint?: DataCategory,
): DataPoint {
  const keys = Object.keys(obj);

  // Check for known structures
  if ('email' in obj && typeof obj.email === 'string') {
    dp.category = 'email';
    dp.label = 'Email';
    dp.value = obj.email;
    dp.displayValue = obj.email;
    dp.confidence = 0.8;
    dp.relevance = 0.8;
    return dp;
  }

  if ('username' in obj && typeof obj.username === 'string') {
    dp.category = 'username';
    dp.label = 'Username';
    dp.value = obj.username;
    dp.displayValue = obj.username;
    dp.confidence = 0.6;
    dp.relevance = 0.7;
    return dp;
  }

  if ('fullName' in obj || 'full_name' in obj || 'name' in obj) {
    dp.category = 'full_name';
    dp.label = 'Full Name';
    dp.value = obj.fullName || obj.full_name || obj.name;
    dp.displayValue = String(dp.value);
    dp.confidence = 0.5;
    dp.relevance = 0.7;
    return dp;
  }

  if ('platform' in obj && 'handle' in obj) {
    dp.category = 'social_profile';
    dp.label = `${obj.platform}`;
    dp.value = obj;
    dp.displayValue = `${obj.platform}: ${obj.handle}`;
    dp.confidence = 0.6;
    dp.relevance = 0.6;
    return dp;
  }

  if ('domain' in obj) {
    dp.category = 'domain';
    dp.label = 'Domain';
    dp.value = obj.domain;
    dp.displayValue = String(obj.domain);
    dp.confidence = 0.7;
    dp.relevance = 0.6;
    return dp;
  }

  if ('forum' in obj && 'context' in obj) {
    dp.category = 'darkweb_mention';
    dp.label = `Darkweb: ${obj.forum}`;
    dp.value = obj;
    dp.displayValue = String(obj.context).substring(0, 200);
    dp.confidence = 0.4;
    dp.relevance = 0.5;
    return dp;
  }

  // Generic object
  dp.category = categoryHint || 'unclassified';
  dp.label = keys.length > 0 ? `Object (${keys.slice(0, 3).join(', ')})` : 'Object';
  dp.value = obj;
  dp.confidence = 0.3;
  dp.relevance = 0.3;
  dp.isNoise = true;
  return dp;
}