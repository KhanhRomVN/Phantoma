export type ProxySourceType = 'vendor' | 'vpn';

export interface VpnField {
  key: string;
  label: string;
  secret?: boolean;
  required?: boolean;
  placeholder?: string;
}

export interface VpnProviderInfo {
  id: string;
  label: string;
  description: string;
  url: string;
  activation: string;
  fields: VpnField[];
}

export interface VpnAccount {
  id: string;
  provider: string;
  label: string;
  name: string;
  url: string;
  activated: boolean;
  running: boolean;
  port: number | null;
  proxyId: string | null;
  startedAt: string | null;
  logs: string[];
  config: Record<string, string>;
  secretsSet: string[];
  accounts: {
    id: string;
    uid: string;
    email: string;
    profileId: string;
    profileDirectory: string;
    createdAt: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface ProxySource {
  id: string;
  name: string;
  provider: string;
  type: ProxySourceType;
  url: string;
  description: string;
  count: number;
  lastSync: string;
  online: boolean;
  vpn: VpnAccount | null;
}
