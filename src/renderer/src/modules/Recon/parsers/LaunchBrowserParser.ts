export interface LaunchBrowserParams {
  /** Thư mục user-data của Chromium; bỏ trống = profile mặc định. */
  profileUserDataDir?: string;
  /** Tên thư mục profile con (vd. "Default", "Profile 1"). */
  profileDirectory?: string;
  /** URL mở ngay sau khi launch. */
  url?: string;
}

export function parseLaunchBrowserParams(raw: Record<string, any> = {}): LaunchBrowserParams {
  return {
    profileUserDataDir:
      typeof raw.profileUserDataDir === 'string' && raw.profileUserDataDir.trim()
        ? raw.profileUserDataDir.trim()
        : undefined,
    profileDirectory:
      typeof raw.profileDirectory === 'string' && raw.profileDirectory.trim()
        ? raw.profileDirectory.trim()
        : undefined,
    url: typeof raw.url === 'string' && raw.url.trim() ? raw.url.trim() : undefined,
  };
}