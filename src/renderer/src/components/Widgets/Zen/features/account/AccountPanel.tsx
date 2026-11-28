/**
 * ------------------------------------------------------------------
 * AccountPanel
 * ------------------------------------------------------------------
 * Panel quản lý tài khoản API (thêm, xóa, tìm kiếm, filter, import).
 * Hiển thị danh sách accounts với phân trang.
 *
 * Main features:
 * - Tìm kiếm (email + provider_id + provider_name) và filter theo provider/status
 * - Thêm / sửa / xóa account (đơn lẻ hoặc hàng loạt)
 * - Import / export accounts JSON
 * - Switch account đang active, refresh token
 * - Period tabs (day/week/month) cho thống kê
 * ------------------------------------------------------------------
 */

import React, { useCallback, useState } from 'react';
import {
  Plus,
  Search,
  Upload,
  Download,
  Filter,
  Trash2,
  Users,
  Copy,
  RefreshCw,
  Loader2,
  CheckSquare,
  Square,
} from 'lucide-react';
import AccountCard from './components/account_list/AccountCard';
import AddAccountModal from './components/account_creation/AddAccountModal';
import {
  ApiAccountFormButton,
  ApiAccountFormModal,
} from './components/api_accounts/ApiAccountFormModal';
import EditAccountModal from './components/account_management/EditAccountModal';
import ConfirmDeleteAccountModal from './components/account_management/ConfirmDeleteAccountModal';
import ImportDuplicatesModal from './components/account_import/AccountImportReviewModal';
import { AccountListSkeleton } from './components/account_list/AccountListSkeleton';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from '@renderer/components/ui/Dropdown';
import { useAccounts } from './hooks/useAccounts';
import { useAccountImport } from './hooks/useAccountImport';
import { useSettings } from '../../context/SettingsContext';

import { Drawer, DrawerBody } from '@renderer/components/ui/Drawer';

import { $ } from '@renderer/utils/color';
import { getFaviconUrl } from '@renderer/utils/favicon';
import type { FlatAccount } from './types/account.types';

import NavPanelHeader from '../../shared/components/NavPanelHeader';
import { NavTarget } from '../../shared/components/AgentNavBadge';

interface AccountPanelProps {
  isOpen: boolean;
  onClose?: () => void;
  onNavigate?: (target: NavTarget) => void;
  /** Render inline (no Drawer, no nav header) — dùng trong ActivityPanel */
  embedded?: boolean;
}

const EmbeddedShell: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <div className="flex flex-col flex-1 min-h-0 h-full bg-background">{children}</div>
);

const noop = () => {};

// ─── SelectionOverlayBar Sub-components ─────────────────────────────────
const OverlayBarButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
  title?: string;
}> = ({ icon, label, onClick, variant = 'default', title }) => {
  const [hovered, setHovered] = useState(false);
  const isDanger = variant === 'danger';
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={title ?? label}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: hovered ? '6px' : '0',
        padding: hovered ? '6px 10px' : '6px 8px',
        borderRadius: '8px',
        border: 'none',
        backgroundColor: isDanger
          ? hovered
            ? `color-mix(in srgb, ${$('--error')} 18%, transparent)`
            : `color-mix(in srgb, ${$('--error')} 8%, transparent)`
          : hovered
            ? `color-mix(in srgb, ${$('--text-secondary')} 10%, transparent)`
            : 'transparent',
        color: isDanger ? $('--error') : $('--text-primary'),
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: 500,
        transition: 'all 0.15s ease',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        maxWidth: hovered ? '140px' : '32px',
        flexShrink: 0,
      }}
    >
      <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{icon}</span>
      <span
        style={{
          overflow: 'hidden',
          maxWidth: hovered ? '100px' : '0',
          opacity: hovered ? 1 : 0,
          transition: 'max-width 0.15s ease, opacity 0.1s ease',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
    </button>
  );
};

const CountBadge: React.FC<{ count: number }> = ({ count }) => (
  <span className="min-w-[20px] h-[18px] px-1.5 rounded-[5px] bg-[rgba(128,128,128,0.18)] text-text-secondary text-[10px] font-semibold inline-flex items-center justify-center box-border">
    {count}
  </span>
);

const AccountPanel: React.FC<AccountPanelProps> = ({
  isOpen,
  onClose = noop,
  onNavigate = noop,
  embedded = false,
}) => {
  const Shell: React.ElementType = embedded ? EmbeddedShell : Drawer;
  const shellProps = embedded
    ? {}
    : { isOpen, onClose, height: '100%', strategy: 'absolute' as const, showHandle: false };
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<FlatAccount | null>(null);
  const { apiUrl } = useSettings();

  const {
    accounts,
    providerScopedAccounts,
    allAccounts,
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
    executeDelete,
    fetchAccounts,
    handleDelete,
    handleBulkDelete,
    toggleSelection,
    toggleAll,
    setProviderFilter,
    switchKiroAccount,
    refreshAccountToken,
    statusFilter,
    deleteError,
    refreshAccountsBatch,
  } = useAccounts(isOpen, apiUrl);

  const refetchSilently = useCallback(
    () => fetchAccounts(pagination.page, pagination.limit, true),
    [fetchAccounts, pagination.page, pagination.limit],
  );

  const {
    previewOpen: importPreviewOpen,
    setPreviewOpen: setImportPreviewOpen,
    duplicates: importDuplicates,
    loading: importLoading,
    startImport: handleImport,
    confirmImport: handleConfirmImport,
    exportAll: handleExport,
    exportSelected: handleExportSelected,
    copySelected: handleCopySelected,
  } = useAccountImport({
    apiUrl,
    allAccounts,
    selectedAccounts,
    onAccountsChanged: refetchSilently,
  });

  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set());

  const handleRefreshSelected = async () => {
    const ids = Array.from(selectedAccounts);
    if (ids.length === 0) return;

    setRefreshingIds(new Set(ids));
    try {
      const items = ids
        .map((id) => allAccounts.find((a) => a.id === id))
        .filter((a): a is FlatAccount => !!a)
        .map((a) => ({ id: a.id, providerId: a.provider_id }));
      // Refresh từng account, refetch danh sách đúng một lần ở cuối batch
      await refreshAccountsBatch(items);
    } finally {
      setRefreshingIds(new Set());
    }
  };

  const [refreshingAll, setRefreshingAll] = useState(false);
  const [refreshResults, setRefreshResults] = useState<
    Record<string, { success: boolean; error?: string }>
  >({});

  const handleRefreshAll = async () => {
    if (refreshingAll) return;
    setRefreshingAll(true);
    try {
      const refreshable = accounts.filter(
        (a) => providerConfigs.find((p) => p.provider_id === a.provider_id)?.can_refresh_token,
      );
      setRefreshingIds(new Set(refreshable.map((a) => a.id)));
      const results = await refreshAccountsBatch(
        refreshable.map((a) => ({ id: a.id, providerId: a.provider_id })),
      );
      setRefreshResults(results);
      setTimeout(() => setRefreshResults({}), 3500);
    } finally {
      setRefreshingIds(new Set());
      setRefreshingAll(false);
    }
  };

  const allVisibleSelected =
    accounts.length > 0 && accounts.every((acc) => selectedAccounts.has(acc.id));

  const handleSelectAll = () => {
    if (allVisibleSelected) {
      const newSelected = new Set(selectedAccounts);
      accounts.forEach((acc) => newSelected.delete(acc.id));
      toggleAll(newSelected);
    } else {
      const newSelected = new Set(selectedAccounts);
      accounts.forEach((acc) => newSelected.add(acc.id));
      toggleAll(newSelected);
    }
  };

  const sortedProviderConfigs = [...providerConfigs].sort((a, b) => {
    if (a.is_enabled === b.is_enabled) return 0;
    return a.is_enabled ? -1 : 1;
  });

  return (
    <Shell {...shellProps}>
      {!embedded && (
        <NavPanelHeader
          title="Accounts"
          description="Manage your API accounts"
          maxWidth={680}
          current="account"
          onNavigate={onNavigate}
          onClose={onClose}
        />
      )}

      {/* Action Bar */}
      <div className="w-full max-w-[680px] mx-auto px-4 pt-3 pb-2 shrink-0 flex gap-2 items-center bg-background box-border">
        {/* Search Input */}
        <div className="flex-1 min-w-0">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search by email, provider ID or provider name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-[34px] pl-9 pr-3 text-[13px] rounded-lg border-none bg-input-background text-text-primary outline-none placeholder:text-text-secondary/60"
            />
          </div>
        </div>

        <Dropdown align="end" sideOffset={4}>
          <DropdownTrigger asChild>
            <button
              className="w-[34px] h-[34px] rounded-lg flex items-center justify-center shrink-0 cursor-pointer text-text-secondary"
              style={{ backgroundColor: $('--input-background'), border: 'none' }}
              title="Filter by provider"
            >
              <Filter size={16} />
            </button>
          </DropdownTrigger>
          <DropdownContent hideScrollbar>
            <DropdownItem
              icon={
                <div
                  className="w-4 h-4 rounded-[3px] flex items-center justify-center text-[9px] font-bold text-text-secondary"
                  style={{ backgroundColor: $('--text-secondary', 0.15) }}
                >
                  All
                </div>
              }
              onClick={() => setProviderFilter('')}
            >
              <span className="flex items-center gap-2">
                All Providers
                <CountBadge count={providerScopedAccounts.length} />
              </span>
            </DropdownItem>
            {sortedProviderConfigs.map((provider) => (
              <DropdownItem
                key={provider.provider_id}
                disabled={provider.is_enabled === false}
                icon={
                  <img
                    src={getFaviconUrl(provider.website)}
                    alt={provider.provider_name}
                    className="w-4 h-4 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                }
                onClick={() => setProviderFilter(provider.provider_id)}
              >
                <span className="flex items-center gap-2">
                  {provider.provider_name}
                  <CountBadge
                    count={
                      providerScopedAccounts.filter(
                        (acc) => acc.provider_id === provider.provider_id,
                      ).length
                    }
                  />
                </span>
              </DropdownItem>
            ))}
          </DropdownContent>
        </Dropdown>

        <button
          onClick={handleRefreshAll}
          disabled={refreshingAll}
          className="w-[34px] h-[34px] rounded-lg flex items-center justify-center shrink-0 text-text-secondary p-0"
          style={{
            backgroundColor: $('--input-background'),
            border: 'none',
            cursor: refreshingAll ? 'not-allowed' : 'pointer',
            opacity: refreshingAll ? 0.6 : 1,
          }}
          title="Refresh accounts"
        >
          <RefreshCw
            size={16}
            style={refreshingAll ? { animation: 'importSpin 1s linear infinite' } : undefined}
          />
        </button>

        <button
          onClick={() => setDialogOpen(true)}
          className="w-[34px] h-[34px] rounded-lg flex items-center justify-center shrink-0 cursor-pointer text-text-secondary"
          style={{ backgroundColor: $('--input-background'), border: 'none' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = $('--dropdown-item-hover');
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = $('--input-background');
          }}
          title="Add account"
        >
          <Plus size={16} />
        </button>

        <ApiAccountFormButton
          onSaved={() => fetchAccounts(pagination.page, pagination.limit, true)}
        />

        <Dropdown align="end" sideOffset={4}>
          <DropdownTrigger asChild>
            <button
              className="w-[34px] h-[34px] rounded-lg flex items-center justify-center shrink-0 cursor-pointer text-text-secondary"
              style={{ backgroundColor: $('--input-background'), border: 'none' }}
              title="More options"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="1" />
                <circle cx="12" cy="5" r="1" />
                <circle cx="12" cy="19" r="1" />
              </svg>
            </button>
          </DropdownTrigger>
          <DropdownContent>
            <DropdownItem icon={<Upload size={14} />} onClick={handleImport}>
              Import JSON
            </DropdownItem>
            <DropdownItem icon={<Download size={14} />} onClick={handleExport}>
              Export JSON
            </DropdownItem>
          </DropdownContent>
        </Dropdown>
      </div>

      {/* ── Selection Overlay Bar ─────────────────────────────────────── */}
      {selectedAccounts.size > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'min(90%, calc(100% - 32px))',
            backgroundColor: $('--dropdown-background'),
            border: `1.5px dashed color-mix(in srgb, ${$('--primary')} 50%, transparent)`,
            borderRadius: '14px',
            padding: '6px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            zIndex: 200,
            overflowX: 'auto',
            scrollbarWidth: 'none',
            boxSizing: 'border-box',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            animation: 'overlaySlideUp 0.2s ease',
            backdropFilter: 'blur(8px)',
          }}
        >
          {/* Count badge */}
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: $('--primary'),
              backgroundColor: `color-mix(in srgb, ${$('--primary')} 12%, transparent)`,
              padding: '3px 8px',
              borderRadius: '6px',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              marginRight: '4px',
            }}
          >
            {selectedAccounts.size} selected
          </div>

          {/* Divider */}
          <div
            style={{ width: '1px', height: '20px', backgroundColor: $('--border'), flexShrink: 0 }}
          />

          {/* Select All / Deselect All */}
          <OverlayBarButton
            icon={allVisibleSelected ? <CheckSquare size={14} /> : <Square size={14} />}
            label={allVisibleSelected ? 'Deselect All' : 'Select All'}
            onClick={handleSelectAll}
            title={allVisibleSelected ? 'Deselect all visible' : 'Select all visible'}
          />

          {/* Copy */}
          <OverlayBarButton
            icon={<Copy size={14} />}
            label="Copy JSON"
            onClick={handleCopySelected}
            title="Copy selected as JSON"
          />

          {/* Refresh Token */}
          <OverlayBarButton
            icon={
              refreshingIds.size > 0 ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RefreshCw size={14} />
              )
            }
            label="Refresh Tokens"
            onClick={handleRefreshSelected}
            title="Refresh tokens for selected"
          />

          {/* Export */}
          <OverlayBarButton
            icon={<Download size={14} />}
            label="Export"
            onClick={handleExportSelected}
            title="Export selected to JSON file"
          />

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Divider */}
          <div
            style={{ width: '1px', height: '20px', backgroundColor: $('--border'), flexShrink: 0 }}
          />

          {/* Delete */}
          <OverlayBarButton
            icon={<Trash2 size={14} />}
            label="Delete"
            onClick={handleBulkDelete}
            variant="danger"
            title="Delete selected accounts"
          />
        </div>
      )}

      {/* Header: label + period tab bar */}
      <div className="w-full max-w-[680px] mx-auto px-4 mt-2 shrink-0 flex items-center justify-between box-border">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-text-primary">List Account</span>
          <span
            className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md text-text-secondary"
            style={{
              backgroundColor: `color-mix(in srgb, ${$('--text-secondary')} 10%, transparent)`,
            }}
          >
            {accounts.length}
          </span>
        </div>
      </div>

      {/* Account List */}
      <DrawerBody className="py-3 px-[max(12px,calc((100%-680px)/2+16px))] flex flex-col gap-2.5">
        {loading && accounts.length === 0 ? (
          <AccountListSkeleton count={5} />
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[200px] gap-3 text-center text-text-secondary">
            <Users size={40} className="opacity-30" />
            <div>
              <p className="text-sm font-medium m-0 mb-1">
                {searchQuery || statusFilter ? 'No matching accounts' : 'No accounts yet'}
              </p>
              <p className="text-[11px] m-0 opacity-70">
                {searchQuery || statusFilter
                  ? 'Try a different search or filter'
                  : 'Click the + button to add one'}
              </p>
            </div>
          </div>
        ) : (
          accounts.map((account) => {
            const pc = providerConfigs.find((p) => p.provider_id === account.provider_id);
            return (
              <AccountCard
                key={account.id}
                account={account}
                isSelected={selectedAccounts.has(account.id)}
                anySelected={selectedAccounts.size > 0}
                onToggleSelect={() => toggleSelection(account.id)}
                onDelete={() =>
                  handleDelete(account.id, account.email, pc?.provider_name, pc?.website)
                }
                onSwitch={() => switchKiroAccount(account.id)}
                onRefreshToken={() => refreshAccountToken(account.id, account.provider_id)}
                onEdit={() => setEditAccount(account)}
                providerConfig={pc}
                externalRefreshing={refreshingIds.has(account.id)}
                externalRefreshResult={refreshResults[account.id] ?? null}
              />
            );
          })
        )}
      </DrawerBody>

      <AddAccountModal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => fetchAccounts(pagination.page, pagination.limit, true)}
      />

      {editAccount?.is_api_account && (
        <ApiAccountFormModal
          key={editAccount.id}
          open
          account={editAccount}
          onClose={() => setEditAccount(null)}
          onSaved={() => fetchAccounts(pagination.page, pagination.limit, true)}
        />
      )}

      <EditAccountModal
        open={!!editAccount && !editAccount.is_api_account}
        account={editAccount}
        onOpenChange={(o) => {
          if (!o) setEditAccount(null);
        }}
        onSuccess={() => fetchAccounts(pagination.page, pagination.limit, true)}
        providerConfig={
          editAccount
            ? (providerConfigs.find((p) => p.provider_id === editAccount.provider_id) ?? null)
            : null
        }
      />

      <ConfirmDeleteAccountModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={executeDelete}
        loading={deleteLoading}
        email={deleteItem?.email}
        providerName={deleteItem?.provider_name}
        websiteUrl={deleteItem?.website_url}
        count={deleteItem ? 1 : selectedAccounts.size}
        error={deleteError}
      />

      <ImportDuplicatesModal
        open={importPreviewOpen}
        onOpenChange={setImportPreviewOpen}
        duplicates={importDuplicates}
        providerConfigs={providerConfigs}
        onOverride={handleConfirmImport}
        onDone={() => {
          setImportPreviewOpen(false);
          fetchAccounts(pagination.page, pagination.limit, true);
        }}
      />

      {/* ── Import Loading Toast ── */}
      {importLoading && (
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 300,
            backgroundColor: $('--dropdown-background'),
            border: `1px solid ${$('--border')}`,
            borderRadius: '10px',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
            whiteSpace: 'nowrap',
            animation: 'importToastIn 0.2s ease',
            backdropFilter: 'blur(8px)',
          }}
        >
          <Loader2
            size={14}
            style={{
              animation: 'importSpin 1s linear infinite',
              color: $('--primary'),
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: '12px', fontWeight: 500, color: $('--text-primary') }}>
            Đang phân tích file import…
          </span>
        </div>
      )}

      <style>{`
        @keyframes overlaySlideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes importToastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes importSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .account-search-input::placeholder {
          color: var(--text-secondary);
          opacity: 0.7;
        }
      `}</style>
    </Shell>
  );
};

export default AccountPanel;
