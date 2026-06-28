import { Globe, Monitor, Smartphone, Terminal, Code } from 'lucide-react';
import { TargetTab } from '../../types/target.types';
import { getFaviconUrl } from '../../../../shared/utils/faviconUtils';

export type AppPlatform = 'web' | 'pc' | 'android' | 'cli';

export function getTargetPlatform(tab: TargetTab): AppPlatform {
  if (tab.platform) {
    const p = tab.platform.toLowerCase();
    if (p === 'web' || p === 'pc' || p === 'android' || p === 'cli') {
      return p as AppPlatform;
    }
  }
  if (tab.url) {
    try {
      const url = new URL(tab.url);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        return 'web';
      }
    } catch {
      // Invalid URL
    }
  }
  return 'web';
}

export function getPlatformIcon(platform: AppPlatform) {
  switch (platform) {
    case 'web':
      return <Globe className="w-3 h-3" />;
    case 'pc':
      return <Monitor className="w-3 h-3" />;
    case 'android':
      return <Smartphone className="w-3 h-3" />;
    case 'cli':
      return <Terminal className="w-3 h-3" />;
    default:
      return <Code className="w-3 h-3" />;
  }
}

export function getPlatformColor(platform: AppPlatform) {
  switch (platform) {
    case 'web':
      return 'text-sky-400';
    case 'pc':
      return 'text-violet-400';
    case 'android':
      return 'text-emerald-400';
    case 'cli':
      return 'text-amber-400';
    default:
      return 'text-text-secondary';
  }
}

export function getPlatformLabel(platform: AppPlatform) {
  switch (platform) {
    case 'web':
      return 'Website';
    case 'pc':
      return 'App';
    case 'android':
      return 'Mobile';
    case 'cli':
      return 'CLI';
    default:
      return '';
  }
}

export function getTargetFavicon(tab: TargetTab): string | null {
  if (tab.favicon) return tab.favicon;
  if (tab.url) return getFaviconUrl(tab.url, 32);
  return null;
}