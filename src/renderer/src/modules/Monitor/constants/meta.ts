import type { MediaKind, MonitorItem, Priority, SourceType } from '../types/monitor.types';

export const SRC: SourceType[] = ['reddit', 'hackernews', 'lobsters', 'devto', 'medium', 'stackoverflow'];

export const SRC_META: Record<SourceType, { label: string; short: string; domain: string; url: string }> = {
  reddit: { label: 'Reddit', short: 'Reddit', domain: 'reddit.com/r/netsec', url: 'https://www.reddit.com' },
  hackernews: { label: 'Hacker News', short: 'HN', domain: 'news.ycombinator.com', url: 'https://news.ycombinator.com' },
  lobsters: { label: 'Lobsters', short: 'Lobsters', domain: 'lobste.rs', url: 'https://lobste.rs' },
  devto: { label: 'DEV Community', short: 'DEV', domain: 'dev.to', url: 'https://dev.to' },
  medium: { label: 'Medium', short: 'Medium', domain: 'medium.com', url: 'https://medium.com' },
  stackoverflow: { label: 'Stack Overflow', short: 'SO', domain: 'stackoverflow.com', url: 'https://stackoverflow.com' },
};

export const MEDIA_KINDS: MediaKind[] = ['text', 'image', 'gallery', 'audio', 'video', 'diff', 'link'];

export const MEDIA_LABEL: Record<MediaKind, string> = {
  text: 'Text',
  image: 'Image',
  gallery: 'Album',
  audio: 'Audio',
  video: 'Video',
  diff: 'Diff snapshot',
  link: 'Link preview',
};

export const PRI_LABEL: Record<Priority, string> = { high: 'High', medium: 'Medium', low: 'Low' };

export const PRI_TONE: Record<Priority, string> = { high: 'error', medium: 'warn', low: 'info' };

export const MON_STATUS: Record<MonitorItem['status'], [string, string, string]> = {
  running: ['Running', 'success', '🟢'],
  paused: ['Paused', 'warn', '🟡'],
  error: ['Error', 'error', '🔴'],
};

export const TAG_NAMES = ['leak', '0day', 'research', 'waf-bypass', 'ssrf', 'mobile'];