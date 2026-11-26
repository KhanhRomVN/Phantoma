import { ShieldCheck, Store } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { TONE_CLASS } from '../../../shared/constants/tone.constants';
import type { Tone } from '../../../shared/types/proxy-domain.types';
import type { ProxySourceType } from '../../../shared/types/source-domain.types';

export const ALL_SOURCES_ID = 'all';

export const SOURCE_TYPE: Record<ProxySourceType, { label: string; icon: LucideIcon; tone: Tone; dot: string }> = {
  vendor: { label: 'Vendor', icon: Store, tone: 'primary', dot: TONE_CLASS.warn.dot },
  vpn: { label: 'VPN to Proxy', icon: ShieldCheck, tone: 'info', dot: TONE_CLASS.info.dot },
};
