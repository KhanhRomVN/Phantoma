import type { PlatformId, PlatformInfo } from '../types';

export const PLATFORMS: Record<PlatformId, PlatformInfo> = {
  slack: { label: 'Slack', domain: 'slack.com' },
  discord: { label: 'Discord', domain: 'discord.com' },
  telegram: { label: 'Telegram', domain: 'telegram.org' },
  whatsapp: { label: 'WhatsApp', domain: 'whatsapp.com' },
  messenger: { label: 'Messenger', domain: 'messenger.com' },
  signal: { label: 'Signal', domain: 'signal.org' },
  zalo: { label: 'Zalo', domain: 'zalo.me' },
  teams: { label: 'Teams', domain: 'teams.microsoft.com' },
  line: { label: 'LINE', domain: 'line.me' },
};