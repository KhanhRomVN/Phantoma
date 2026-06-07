/**
 * Website Favicon URL resolver.
 * Maps hostnames to favicon URLs for display next to website titles in UI components.
 */

const FAVICON_BASE = 'https://www.google.com/s2/favicons';
const FAVICON_SIZE = 16;

/** Custom favicon overrides for known services (higher quality or specific icons) */
const CUSTOM_FAVICONS: Record<string, string> = {
  'github.com': 'https://github.githubassets.com/favicons/favicon.svg',
  'linkedin.com': 'https://static.licdn.com/aero-v1/sc/h/3loy3t8e7z7xq2qjohqj7j0gx',
  'reddit.com': 'https://www.redditstatic.com/desktop2x/img/favicon/favicon-32x32.png',
  'x.com': 'https://abs.twimg.com/favicons/twitter.3.ico',
  'twitter.com': 'https://abs.twimg.com/favicons/twitter.3.ico',
  'youtube.com': 'https://www.youtube.com/s/desktop/12ecf11d/img/favicon_32x32.png',
  'medium.com': 'https://miro.medium.com/v2/1*m-R_BkNf1Qjr1YbyOIJY2w.png',
  'stackoverflow.com': 'https://cdn.sstatic.net/Sites/stackoverflow/Img/favicon.ico',
  'hackernews.com': 'https://news.ycombinator.com/favicon.ico',
  'news.ycombinator.com': 'https://news.ycombinator.com/favicon.ico',
  'google.com': 'https://www.google.com/favicon.ico',
  'facebook.com': 'https://static.xx.fbcdn.net/rsrc.php/yx/r/e9sqr8WnkCf.ico',
  'instagram.com': 'https://static.cdninstagram.com/rsrc.php/v4/yI/r/VsNE-OHk_8a.ico',
  'discord.com': 'https://discord.com/assets/ec2c34cadd4b5f459441512738835d6a.ico',
  'pastebin.com': 'https://pastebin.com/favicon.ico',
  'shodan.io': 'https://www.shodan.io/wp-content/uploads/2020/08/favicon.png',
  'amazonaws.com': 'https://a0.awsstatic.com/libra-css/images/site/fav/favicon.ico',
  'cloudflare.com': 'https://www.cloudflare.com/favicon.ico',
  'namecheap.com': 'https://www.namecheap.com/assets/img/nc-icon/favicon.ico',
};

/**
 * Extract a clean hostname from a URL or domain string.
 */
export function extractHostname(value: string): string | null {
  if (!value || typeof value !== 'string') return null;

  let cleaned = value.trim().toLowerCase();

  // Remove protocol
  cleaned = cleaned.replace(/^https?:\/\//, '');
  // Remove path, query, hash
  cleaned = cleaned.replace(/[\/\?#].*$/, '');
  // Remove port
  cleaned = cleaned.replace(/:\d+$/, '');
  // Remove leading www
  cleaned = cleaned.replace(/^www\./, '');
  // Remove trailing dot
  cleaned = cleaned.replace(/\.$/, '');

  // Validate it looks like a hostname
  if (!cleaned.includes('.') || cleaned.length < 4) return null;

  return cleaned;
}

/**
 * Get favicon URL for a given hostname.
 * Falls back to Google's favicon service.
 */
export function getFaviconUrl(hostname: string): string {
  // Check custom overrides first
  if (CUSTOM_FAVICONS[hostname]) {
    return CUSTOM_FAVICONS[hostname];
  }

  // Check if parent domain has a custom override
  const parts = hostname.split('.');
  if (parts.length >= 2) {
    const parentDomain = parts.slice(-2).join('.');
    if (CUSTOM_FAVICONS[parentDomain]) {
      return CUSTOM_FAVICONS[parentDomain];
    }
  }

  return `${FAVICON_BASE}?domain=${encodeURIComponent(hostname)}&sz=${FAVICON_SIZE}`;
}

/**
 * Extract hostname from a string and return its favicon URL.
 * Returns null if the string doesn't look like a URL/domain.
 */
export function resolveFaviconFromValue(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const hostname = extractHostname(value);
  if (!hostname) return null;
  return getFaviconUrl(hostname);
}

/**
 * Check if a DataPoint category is website/domain-related.
 */
const WEBSITE_CATEGORIES = new Set([
  'domain',
  'url',
  'subdomain',
  'subdomain_wildcard',
  'subdomain_internal',
  'subdomain_cname',
  'subdomain_takeover',
  'social_mention',
  'news_mention',
  'forum_mention',
  'internet_mention',
  'wayback_snapshot',
  'cert_domains',
  'related_domain',
  'sibling_domain',
  'parked_domain',
  'reverse_ip',
  'hosting_provider',
  'cloud_provider',
  'public_s3_bucket',
  'env_exposure',
  'git_exposure',
  'backup_file',
  'config_file',
  'exposed_api_key',
  'exposed_secret_token',
  'database_dump',
  'log_file',
  'source_code_exposure',
  'debug_endpoint',
  'admin_panel',
  'phpinfo_exposure',
  'social_profile',
  'repository',
  'open_port',
  'service_banner',
]);

export function isWebsiteCategory(category: string): boolean {
  return WEBSITE_CATEGORIES.has(category);
}