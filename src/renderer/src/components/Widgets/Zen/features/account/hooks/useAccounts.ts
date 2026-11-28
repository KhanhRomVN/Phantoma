import { useState, useEffect, useCallback, useRef } from 'react';

import type { AccountStatus, FlatAccount, Pagination } from '../types/account.types';
import type { ProviderConfig } from '../types/provider.types';
import { getAccountStatus } from '../utils/account-status.utils';
import {
  attachAccountStats,
  deleteAccount,
  fetchAccountList,
  fetchApiAccountsAsFlat,
  fetchProviderConfigs,
  refreshAccountTokenRequest,
  switchAccount,
  type MutationResult,
} from '../services/account-api.service';
import {
  purgeLegacyAccountCache,
  readProvidersCache,
  writeProvidersCache,
} from '../services/account-cache.service';
import { useDbFetch } from '../../../shared/services/useDbFetch';
import { compareAccountsByUsage } from '../../../shared/utils/accountSort';

export type { AccountStatus };

/**
 * @param isOpen     panel đang mở
 * @param cacheScope định danh API/database context để cô lập provider cache
 */
export const useAccounts = (isOpen: boolean, cacheScope: string = 'default') => {
  // Account KHÔNG được cache persistent (chứa credential/API key) — chỉ giữ trong memory.
  const [allAccounts, setAllAccounts] = useState<FlatAccount[]>([]);
  const [providerConfigs, setProviderConfigs] = useState<ProviderConfig[]>(() => {
    purgeLegacyAccountCache();
    return readProvidersCache(cacheScope);
  });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<AccountStatus | ''>('');
  const [statsPeriod, setStatsPeriod] = useState<'day' | 'week' | 'month' | 'year' | 'all'>('day');
  const [emailFilter, setEmailFilter] = useState<string[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 10000,
    total_pages: 1,
  });
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<{
    id: string;
    email?: string;
    provider_name?: string;
    website_url?: string;
  } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const dbFetch = useDbFetch();

  const fetchAccounts = useCallback(
    async (page = 1, limit = 20, silent = false, forceProviders = false) => {
      if (!isOpen) return;
      if (!silent) setLoading(true);
      try {
        if (providerConfigs.length === 0 || forceProviders) {
          try {
            const providers = await fetchProviderConfigs(dbFetch);
            if (providers) {
              setProviderConfigs(providers);
              writeProvidersCache(cacheScope, providers);
            }
          } catch (err) {
            console.error('Failed to fetch providers:', err);
          }
        }

        // searchQuery không gửi lên backend — search đa trường được thực hiện client-side.
        const list = await fetchAccountList(dbFetch, {
          page,
          limit,
          period: statsPeriod,
          email: emailFilter.length === 1 ? emailFilter[0] : undefined,
        });
        if (!list) return;

        const accountsWithStats = await attachAccountStats(dbFetch, list.accounts, statsPeriod);

        let apiAccounts: FlatAccount[] = [];
        try {
          apiAccounts = await fetchApiAccountsAsFlat(dbFetch);
        } catch (err) {
          console.error('Failed to fetch API accounts:', err);
        }

        setAllAccounts([...accountsWithStats, ...apiAccounts]);
        setPagination(list.pagination);
      } catch (err) {
        console.error('Failed to fetch accounts:', err);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [isOpen, emailFilter, providerConfigs.length, dbFetch, statsPeriod, cacheScope],
  );

  // ── Effects ──
  useEffect(() => {
    if (isOpen) {
      // Reset về trang 1 + ép refetch providers mỗi khi panel mở hoặc đổi scope (database).
      setPagination((prev) => ({ ...prev, page: 1 }));
      fetchAccounts(1, pagination.limit, allAccounts.length > 0, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Đổi scope (database/API): bỏ dữ liệu của scope cũ trước khi nạp lại.
  const scopeRef = useRef(cacheScope);
  useEffect(() => {
    if (scopeRef.current === cacheScope) return;
    scopeRef.current = cacheScope;
    setAllAccounts([]);
    setProviderConfigs(readProvidersCache(cacheScope));
    if (isOpen) fetchAccounts(1, pagination.limit, false, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheScope]);

  // searchQuery được filter client-side → không cần re-fetch khi gõ
  useEffect(() => {
    if (isOpen) {
      fetchAccounts(1, pagination.limit);
    }
  }, [emailFilter, statsPeriod]);

  // ── Handlers ──
  const executeDelete = async () => {
    setDeleteLoading(true);
    setDeleteError('');
    try {
      const isApi = (id: string) => allAccounts.find((a) => a.id === id)?.is_api_account;
      if (deleteItem) {
        const r = await deleteAccount(dbFetch, deleteItem.id, isApi(deleteItem.id));
        if (!r.success) {
          setDeleteError(r.error || 'Delete failed');
          return;
        }
      } else if (selectedAccounts.size > 0) {
        const ids = Array.from(selectedAccounts);
        const results = await Promise.all(ids.map((id) => deleteAccount(dbFetch, id, isApi(id))));
        const failedIds = ids.filter((_, i) => !results[i].success);
        // Chỉ bỏ chọn những item đã xóa thành công
        setSelectedAccounts(new Set(failedIds));
        if (failedIds.length > 0) {
          console.error('Failed to delete accounts:', failedIds);
          setDeleteError(`Failed to delete ${failedIds.length}/${ids.length} account(s)`);
          fetchAccounts(pagination.page, pagination.limit, true);
          return;
        }
      }
      setConfirmOpen(false);
      setDeleteItem(null);
      fetchAccounts(pagination.page, pagination.limit, true);
    } catch (err) {
      console.error('Failed to delete accounts:', err);
      setDeleteError('Failed to delete accounts');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDelete = (
    id: string,
    email?: string,
    provider_name?: string,
    website_url?: string,
  ) => {
    setDeleteError('');
    setDeleteItem({ id, email, provider_name, website_url });
    setConfirmOpen(true);
  };

  const handleBulkDelete = () => {
    setDeleteError('');
    setDeleteItem(null);
    setConfirmOpen(true);
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedAccounts);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedAccounts(newSelected);
  };

  const toggleAll = (newSelected: Set<string>) => {
    setSelectedAccounts(newSelected);
  };

  const switchKiroAccount = async (id: string) => {
    try {
      const result = await switchAccount(dbFetch, id);
      if (result.success) {
        fetchAccounts(pagination.page, pagination.limit, true);
      }
    } catch (err) {
      console.error('Failed to switch account:', err);
    }
  };

  /** Mutation thuần: KHÔNG refetch danh sách. Caller quyết định khi nào refetch. */
  const refreshTokenOnly = (id: string, providerId: string): Promise<MutationResult> =>
    refreshAccountTokenRequest(dbFetch, id, providerId);

  /** Refresh một account và refetch danh sách đúng một lần. */
  const refreshAccountToken = async (id: string, providerId: string): Promise<MutationResult> => {
    const result = await refreshTokenOnly(id, providerId);
    if (result.success) fetchAccounts(pagination.page, pagination.limit, true);
    return result;
  };

  /** Refresh nhiều account, tổng hợp kết quả theo account, refetch danh sách một lần ở cuối. */
  const refreshAccountsBatch = async (
    items: { id: string; providerId: string }[],
  ): Promise<Record<string, MutationResult>> => {
    const results: Record<string, MutationResult> = {};
    await Promise.all(
      items.map(async ({ id, providerId }) => {
        try {
          results[id] = await refreshTokenOnly(id, providerId);
        } catch (err: any) {
          results[id] = { success: false, error: err?.message };
        }
      }),
    );
    await fetchAccounts(pagination.page, pagination.limit, true);
    return results;
  };

  // ── Derived ──
  const providerNameById = new Map<string, string>(
    providerConfigs.map((p) => [p.provider_id, p.provider_name || '']),
  );

  // Đếm status trên TOÀN BỘ tài khoản đã fetch (không filter bởi statusFilter)
  const statusCounts: Record<AccountStatus, number> = {
    active: 0,
    expired: 0,
    error: 0,
    inactive: 0,
  };
  for (const acc of allAccounts) {
    statusCounts[getAccountStatus(acc)] += 1;
  }

  // Áp dụng filter client-side: search mở rộng + status.
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const providerScopedAccounts = [...allAccounts].sort(compareAccountsByUsage).filter((acc) => {
    if (statusFilter && getAccountStatus(acc) !== statusFilter) return false;
    if (!normalizedQuery) return true;
    const providerName = providerNameById.get(acc.provider_id) || '';
    return (
      (acc.email || '').toLowerCase().includes(normalizedQuery) ||
      (acc.provider_id || '').toLowerCase().includes(normalizedQuery) ||
      providerName.toLowerCase().includes(normalizedQuery)
    );
  });
  const accounts = providerFilter
    ? providerScopedAccounts.filter((acc) => acc.provider_id === providerFilter)
    : providerScopedAccounts;

  return {
    accounts,
    providerScopedAccounts,
    allAccounts,
    statusCounts,
    statusFilter,
    setStatusFilter,
    loading,
    providerConfigs,
    searchQuery,
    setSearchQuery,
    pagination,
    selectedAccounts,
    confirmOpen,
    setConfirmOpen,
    deleteItem,
    deleteLoading,
    deleteError,
    executeDelete,
    fetchAccounts,
    handleDelete,
    handleBulkDelete,
    toggleSelection,
    toggleAll,
    providerFilter,
    setProviderFilter,
    emailFilter,
    setEmailFilter,
    statsPeriod,
    setStatsPeriod,
    switchKiroAccount,
    refreshAccountToken,
    refreshAccountsBatch,
  };
};
