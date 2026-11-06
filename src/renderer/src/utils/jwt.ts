/**
 * ------------------------------------------------------------------
 * JWT Utilities
 * ------------------------------------------------------------------
 * Tiện ích parse JWT phía client để hiển thị thông tin hết hạn.
 * ------------------------------------------------------------------
 */

export function getJwtExpiry(jwt: string): number | null {
  try {
    const parts = jwt.split('.');
    if (parts.length < 2) {
      return null;
    }

    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));

    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch (e) {
    return null;
  }
}

export function isJwtExpired(jwt: string): boolean {
  const exp = getJwtExpiry(jwt);
  if (exp === null) return false;
  return Date.now() >= exp;
}

export function getJwtTimeToExpiry(jwt: string): number | null {
  const exp = getJwtExpiry(jwt);
  if (exp === null) return null;
  return Math.max(0, exp - Date.now());
}

export function formatJwtExpiry(jwt: string): string | null {
  const exp = getJwtExpiry(jwt);
  if (exp === null) return null;

  const now = Date.now();
  const diff = exp - now;

  if (diff <= 0) {
    return 'Expired';
  }

  const minutes = Math.floor(diff / (60 * 1000));
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (days === 0) {
    return `${hours}h`;
  }

  const remainingHours = hours % 24;
  if (remainingHours === 0) {
    return `${days}d`;
  }
  return `${days}d ${remainingHours}h`;
}

export function extractAccessToken(credential: string): string | null {
  if (!credential) return null;

  if (credential.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(credential);
      const token =
        parsed.accessToken ||
        parsed.access_token ||
        parsed.token ||
        parsed.secretKey ||
        parsed.secret_key ||
        null;
      return token;
    } catch {
      // Không phải JSON hợp lệ, tiếp tục
    }
  }

  if (credential.startsWith('eyJ')) {
    return credential;
  }

  return null;
}

export function extractCookieSessionExpiry(cookieString: string): number | null {
  if (!cookieString) return null;

  // Simple regex to find 'expires=' attribute in Set-Cookie style strings within credentials
  // Or look for specific known patterns if credentials store serialized cookies
  const match = cookieString.match(/expires=([^;]+)/i);
  if (match) {
    const expDate = new Date(match[1]);
    if (!isNaN(expDate.getTime())) {
      return expDate.getTime();
    }
  }

  // Fallback: Check for max-age relative expiration (less common in stored creds but possible)
  const maxAgeMatch = cookieString.match(/max-age=(\d+)/i);
  if (maxAgeMatch) {
    const seconds = parseInt(maxAgeMatch[1], 10);
    if (!isNaN(seconds)) {
      // Assuming the credential was saved recently enough that we can't know exact start time without metadata,
      // usually we'd need a 'saved_at' field. For UI display, returning null might be safer than guessing wrong.
      // However, Zen implementation often relies on absolute dates in stored creds.
      return null;
    }
  }

  return null;
}

export function formatExpiryMs(ts: number | null): string | null {
  if (ts === null) return null;

  const now = Date.now();
  const diff = ts - now;

  if (diff <= 0) {
    return 'Expired';
  }

  const minutes = Math.floor(diff / (60 * 1000));
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (days === 0) {
    return `${hours}h`;
  }

  const remainingHours = hours % 24;
  if (remainingHours === 0) {
    return `${days}d`;
  }
  return `${days}d ${remainingHours}h`;
}
