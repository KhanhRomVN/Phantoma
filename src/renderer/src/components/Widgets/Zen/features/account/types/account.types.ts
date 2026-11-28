export interface Account {
  id: string;
  provider_id: string;
  email: string;
  credential: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface AccountStats {
  id: string;
  email: string;
  provider_id: string;
  total_requests: number;
  successful_requests: number;
  total_tokens: number;
}

export interface FlatAccount extends Account {
  total_requests?: number;
  successful_requests?: number;
  total_tokens?: number;
  period_requests?: number;
  period_tokens?: number;
  max_req_conversation?: number;
  max_token_conversation?: number;
  isActive?: boolean;
  usage?: number;
  reset_usage_at?: string;
  is_active_cli?: boolean;
  user_data_dir?: string;
  auth_method?: string | null;
  is_api_account?: boolean;
  base_url?: string;
  api_type?: string;
  label?: string;
  website?: string;
  config?: Record<string, any> | null;
  expires_at?: string | null;
}

/** Trạng thái tài khoản dùng cho status badges ở AccountPanel. */
export type AccountStatus = 'active' | 'expired' | 'error' | 'inactive';
