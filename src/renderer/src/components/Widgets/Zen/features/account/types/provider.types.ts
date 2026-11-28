/** auth_method / auth_methods có thể là array, JSON string hoặc chuỗi phân tách bằng dấu phân cách. */
export type ProviderAuthMethods = string[] | string;

export interface Provider {
  provider_id: string;
  provider_name: string;
  description?: string;
  website: string;
  website_url?: string;
  is_enabled?: boolean;
  auth_methods?: ProviderAuthMethods;
  connection_type?: string;
  auth_method?: ProviderAuthMethods;
}

/** Cấu hình provider dùng chung cho AccountCard / AccountTooltip / import review. */
export interface ProviderConfig {
  provider_id: string;
  provider_name: string;
  website?: string;
  is_enabled?: boolean;
  connection_type?: string;
  can_refresh_token?: boolean;
  usagePolicy?: { requestLimit?: number; [key: string]: unknown };
  [key: string]: unknown;
}

export interface ProfileEntry {
  folder: string;
  label?: string;
  avatar?: string;
}

export interface DeviceCodeInfo {
  user_code: string;
  verification_url: string;
  pollContext: string;
  poll_interval: number;
  provider: Provider;
  profileUserDataDir?: string;
  profileDirectory?: string;
  profileLabel?: string;
}
