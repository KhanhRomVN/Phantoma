export type VpnAccountInput = { name?: string; credentials?: Record<string, string> };

export interface VpnActivateOptions {
  userDataDir?: string;
  profileDirectory?: string;
  profileId?: string;
}

export interface VpnStartOptions {
  country?: string;
  accountId?: string;
}
