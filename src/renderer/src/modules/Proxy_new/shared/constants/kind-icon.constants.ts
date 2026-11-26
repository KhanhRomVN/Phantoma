import { Home, Network, Server, Smartphone } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ProxyKind } from '../types/proxy-domain.types';

export const KIND_ICON: Record<ProxyKind, LucideIcon> = {
  datacenter: Server,
  residential: Home,
  mobile: Smartphone,
  isp: Network,
};
