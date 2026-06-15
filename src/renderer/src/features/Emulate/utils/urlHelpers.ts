export function normalizeUrl(urlString?: string): string {
  if (!urlString) return '';
  try {
    const url = new URL(urlString);
    let normalized = url.hostname + url.pathname;
    if (normalized.endsWith('/')) normalized = normalized.slice(0, -1);
    return normalized.toLowerCase();
  } catch {
    return urlString.toLowerCase().replace(/\/$/, '');
  }
}

export function extractDomain(urlString: string): string {
  try {
    const url = new URL(urlString);
    return url.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return urlString.toLowerCase();
  }
}

export function extractSearchKeywords(input: string): string {
  try {
    const url = new URL(input);
    return url.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return input.toLowerCase();
  }
}

export function isValidUrl(urlString: string): boolean {
  try {
    new URL(urlString);
    return true;
  } catch {
    return false;
  }
}

export function getFaviconUrl(domain: string, size: number = 32): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
}