import { extractAccessToken, isJwtExpired } from '@renderer/utils/jwt';
import type { AccountStatus, FlatAccount } from '../types/account.types';

/**
 * Suy ra trạng thái của một tài khoản từ dữ liệu hiện có.
 * - active   : is_active_cli === true
 * - expired  : JWT token (accessToken) đã hết hạn
 * - inactive : is_active_cli === false (không phải active/expired)
 * - error    : chưa có nguồn dữ liệu → luôn 0 (chỗ giữ cho tương lai)
 */
export const getAccountStatus = (account: FlatAccount): AccountStatus => {
  if (account.is_active_cli === true) {
    const token = extractAccessToken(account.credential || '');
    if (token && isJwtExpired(token)) return 'expired';
    return 'active';
  }
  const token = extractAccessToken(account.credential || '');
  if (token && isJwtExpired(token)) return 'expired';
  if (account.is_active_cli === false) return 'inactive';
  return 'inactive';
};
