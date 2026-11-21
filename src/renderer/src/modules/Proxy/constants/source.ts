import { ShieldCheck, Store } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ProxySourceType, Tone } from '../types';
import { TONE_CLASS } from './proxy';

export const ALL_SOURCES_ID = 'all';

export const SOURCE_TYPE: Record<ProxySourceType, { label: string; icon: LucideIcon; tone: Tone; dot: string }> = {
  vendor: { label: 'Vendor', icon: Store, tone: 'primary', dot: TONE_CLASS.warn.dot },
  vpn: { label: 'VPN to Proxy', icon: ShieldCheck, tone: 'info', dot: TONE_CLASS.info.dot },
};