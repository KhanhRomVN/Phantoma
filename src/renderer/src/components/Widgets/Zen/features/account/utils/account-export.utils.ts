import type { FlatAccount } from '../types/account.types';

/** Shape export/copy giữ nguyên: mảng FlatAccount đầy đủ (kể cả credential) — chỉ gọi từ hành động của user. */
export const serializeAccounts = (accounts: FlatAccount[]): string =>
  JSON.stringify(accounts, null, 2);

export const allAccountsFileName = (now: number = Date.now()): string =>
  `phantoma-all-${now}.json`;

export const selectedAccountsFileName = (count: number, now: number = Date.now()): string =>
  `phantoma-selected-${count}-${now}.json`;
