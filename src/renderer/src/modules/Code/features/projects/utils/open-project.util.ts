import { getFaviconUrl } from '@renderer/utils/favicon';
import { TECH_DOMAIN_MAP, Tone, TONES } from '../constants/open-project.constants';

export const hashTone = (seed: string): Tone => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
};

export const shortenPath = (path: string): string => {
  if (!path) return '';
  const parts = path.split('/').filter(Boolean);
  if (parts.length <= 3) return path;
  const start = parts[0] === 'home' || parts[0] === 'Users' ? '~/' : '';
  return `${start}.../${parts.slice(-2).join('/')}`;
};

export const formatBytes = (bytes?: number): string => {
  if (!bytes) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const timeAgo = (timestamp?: number): string => {
  if (!timestamp) return '';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${Math.max(seconds, 0)}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

export const formatRepoUrl = (url: string): string =>
  url
    .replace(/^https?:\/\//, '')
    .replace(/^git@/, '')
    .replace(/\.git$/, '')
    .replace(/^[^:/]+[:/]/, '');

export const getTechIconUrl = (id: string): string => {
  const domain = TECH_DOMAIN_MAP[id.toLowerCase()];
  return domain ? getFaviconUrl(domain) : '';
};

export const GIT_URL_REGEX = /^(https?:\/\/|git@)\S+/i;

export const deriveFolderName = (url: string): string =>
  url.trim().match(/[/:]([^/:]+?)(?:\.git)?\/?$/)?.[1] ?? '';
