export type ProxyType = 'Residential' | '4G/5G' | 'VPN' | 'Datacenter';
export type ProxyStatus = 'ok' | 'slow' | 'down';

export interface Proxy {
  id: string;
  name: string;
  type: ProxyType;
  host: string;
  country: string;
  ping: number;
  status: ProxyStatus;
  usedBy: number;
}