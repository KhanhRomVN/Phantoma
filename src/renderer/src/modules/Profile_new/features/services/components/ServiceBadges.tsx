import { Globe } from 'lucide-react';
import { Favicon, getFaviconUrl } from '@renderer/utils/favicon';
import { Pill } from '../../../shared/components/Pill';
import type { ServiceStatus } from '../../../shared/types';
import { SERVICE_URL } from '../constants/service.constants';
import { SERVICE_STATUS } from '../constants/service-status.constants';

export function serviceUrl(name: string): string | undefined {
  return SERVICE_URL[name];
}

export function ServiceIcon({ name, size = 14, url: customUrl }: { name: string; size?: number; url?: string }) {
  const url = customUrl || serviceUrl(name);
  const fallback = <Globe className="shrink-0 text-text-secondary" style={{ width: size, height: size }} />;
  if (!url) return fallback;
  return (
    <Favicon
      url={getFaviconUrl(url, 32)}
      size={size}
      className="shrink-0 rounded-sm"
      fallbackIcon={fallback}
    />
  );
}

export function ServiceStatusBadge({ status }: { status: ServiceStatus }) {
  const s = SERVICE_STATUS[status];
  return <Pill tone={s.tone}>{s.label}</Pill>;
}
