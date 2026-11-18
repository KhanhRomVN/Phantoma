import type { Device } from '../../../types';

interface ProxyTabProps {
  device: Device;
}

export function ProxyTab({ device }: ProxyTabProps) {
  return (
    <div className="rounded-xl bg-card-background p-4">
      <div className="text-xs text-text-secondary">Proxy: {device.proxyId || 'Direct'}</div>
    </div>
  );
}