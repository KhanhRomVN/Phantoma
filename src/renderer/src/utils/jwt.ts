/**
 * ------------------------------------------------------------------
 * JWT Utilities
 * ------------------------------------------------------------------
 * Tiện ích parse JWT phía client để hiển thị thông tin hết hạn.
 * ------------------------------------------------------------------
 */

/**
 * Lấy timestamp hết hạn của JWT.
 * @param jwt - Chuỗi JWT
 * @returns Timestamp (ms kể từ epoch) hoặc null nếu không hợp lệ
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

/**
 * Kiểm tra JWT đã hết hạn chưa.
 * @param jwt - Chuỗi JWT
 * @returns true nếu token đã hết hạn
 */
export function isJwtExpired(jwt: string): boolean {
  const exp = getJwtExpiry(jwt);
  if (exp === null) return false;
  return Date.now() >= exp;
}

/**
 * Thời gian còn lại tới khi JWT hết hạn.
 * @param jwt - Chuỗi JWT
 * @returns Số ms còn lại, hoặc null nếu token không hợp lệ
 */
export function getJwtTimeToExpiry(jwt: string): number | null {
  const exp = getJwtExpiry(jwt);
  if (exp === null) return null;
  return Math.max(0, exp - Date.now());
}

/**
 * Format thời gian hết hạn dạng countdown (ngày và giờ còn lại).
 * @param jwt - Chuỗi JWT
 * @returns Chuỗi countdown hoặc null nếu không hợp lệ. Ví dụ: "3d 5h", "12h", "45m", "Expired"
 */
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

/**
 * Trích xuất access token từ credential (hỗ trợ cả JWT thô và JSON).
 * @param credential - Chuỗi credential (JWT hoặc JSON)
 * @returns JWT token hoặc null
 */
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