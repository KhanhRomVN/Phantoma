import alienvaultDoc from '../../../docs/alienvault.md?raw';

export const ALIENVAULT_DOC = alienvaultDoc;

export const INDICATOR_TYPES = [
  { value: 'ip', label: 'IP Address', placeholder: '8.8.8.8, 1.1.1.1', note: 'IPv4 or IPv6 address' },
  { value: 'domain', label: 'Domain', placeholder: 'example.com, google.com', note: 'Fully qualified domain name' },
  { value: 'hash', label: 'File Hash', placeholder: 'md5, sha1, sha256', note: 'MD5, SHA-1, or SHA-256 hash' },
  { value: 'url', label: 'URL', placeholder: 'https://example.com/path', note: 'Full URL including protocol' },
];

export const REPUTATION_COLORS = {
  malicious: '#ef4444',
  suspicious: '#f97316',
  neutral: '#fbbf24',
  unknown: '#64748b',
};

export const REPUTATION_LABELS = {
  malicious: 'MALICIOUS',
  suspicious: 'SUSPICIOUS',
  neutral: 'NEUTRAL',
  unknown: 'UNKNOWN',
};