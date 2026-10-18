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

import React, { useState } from 'react';
import {
  Plus,
  Search,
  Upload,
  Download,
  Filter,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Users,
  Copy,
  RefreshCw,
  Loader2,
  CheckSquare,
  Square,
} from 'lucide-react';
import AccountCard from './components/AccountCard';
import AddAccountDrawer from './components/AddAccountDrawer';
import EditAccountDrawer from './components/EditAccountDrawer';
import ConfirmDeleteAccountDrawer from './components/ConfirmDeleteAccountDrawer';
import ImportDuplicatesDrawer, { DuplicateEntry } from './components/ImportDuplicatesDrawer';
import { AccountListSkeleton } from './components/AccountListSkeleton';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from '@renderer/components/ui/Dropdown';
import { useAccounts } from './hooks/useAccounts';
import { useSettings } from '../../context/SettingsContext';
import { useActiveDatabaseManagerName } from '../../hooks/useActiveDatabaseManagerName';

import { extensionService, messageDispatcher } from '../../services/ExtensionService';
import { Drawer, DrawerHeader, DrawerBody, DrawerFooter } from '@renderer/components/ui/Drawer';
import { Button } from '@renderer/components/ui/Button';
import { Input } from '@renderer/components/ui/Input';
import { $ } from '@renderer/utils/color';
import { getFaviconUrl } from '@renderer/shared/utils/faviconUtils';
import { FlatAccount } from './types';

interface AccountPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

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
          ? hovered ? `color-mix(in srgb, ${$('--error')} 18%, transparent)` : `color-mix(in srgb, ${$('--error')} 8%, transparent)`
          : hovered ? `color-mix(in srgb, ${$('--text-secondary')} 10%, transparent)` : 'transparent',
        color: isDanger
          ? $('--error')
          : $('--text-primary'),
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
      <span style={{
        overflow: 'hidden',
        maxWidth: hovered ? '100px' : '0',
        opacity: hovered ? 1 : 0,
        transition: 'max-width 0.15s ease, opacity 0.1s ease',
        whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
    </button>
  );
};

const AccountPanel: React.FC<AccountPanelProps> = ({ isOpen, onClose }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<FlatAccount | null>(null);
  const { apiUrl } = useSettings();
  const activeDbName = useActiveDatabaseManagerName();

  // Import preview state
  const [importPreviewOpen, setImportPreviewOpen] = useState(false);
  const [importDuplicates, setImportDuplicates] = useState<DuplicateEntry[]>([]);
  const [importLoading, setImportLoading] = useState(false);

  const {
    accounts,
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
    statusCounts,
    statusFilter,
    setStatusFilter,
    statsPeriod,
    setStatsPeriod,
  } = useAccounts(isOpen);

  const handleImport = () => {
    const requestId = `import-${Date.now()}`;

    // Lắng nghe preview response từ extension
    messageDispatcher.register(
      requestId,
      (msg) => {
        // Intermediate status: file đã chọn, đang gọi API
        if (msg.status === 'analyzing') {
          setImportLoading(true);
          return true; // Giữ handler — còn chờ preview result
        }

        setImportLoading(false);

        if (msg.error) {
          console.error('[Import] Error:', msg.error);
          return false; // Gỡ handler
        }

        // SQLite path: backend import thẳng, không qua preview
        if (msg.isSqlite) {
          fetchAccounts(pagination.page, pagination.limit, true);
          return false; // Gỡ handler
        }

        // JSON path: nhận preview data → mở drawer để user confirm
        const previewAccounts = msg.preview?.data?.accounts;
        if (!Array.isArray(previewAccounts) || previewAccounts.length === 0) {
          console.warn('[Import] Preview returned empty accounts');
          return false; // Gỡ handler
        }

        setImportDuplicates(previewAccounts);
        setImportPreviewOpen(true);
        return false; // Gỡ handler sau khi hoàn tất
      },
      60_000,
      () => {
        setImportLoading(false);
        console.warn('[Import] Timeout after 60s');
      },
    );

    extensionService.postMessage({
      command: 'importAccounts',
      apiUrl,
      requestId,
    });
  };

  /**
   * Gọi sau khi user confirm trong drawer.
   * selectedEntries là các preview entries được chọn.
   * - New      → insert qua /import
   * - Changed  → override qua /accounts/override
   * - Identical→ bỏ qua
   */
  const handleConfirmImport = async (selectedEntries: DuplicateEntry[]) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    
    // Lọc các entry mới (kind === 'new') để insert
    const toInsert = selectedEntries
      .filter((e) => e.kind === 'new')
      .map((e) => e.incoming);

    // Lọc các entry đã thay đổi (kind === 'changed') để override
    const toOverride = selectedEntries.filter((e) => e.kind === 'changed');

    try {
      await Promise.all([
        // Insert new accounts
        toInsert.length > 0
          ? fetch(`${apiUrl}/v1/accounts/import`, {
              method: 'POST',
              headers,
              body: JSON.stringify(toInsert),
            })
          : Promise.resolve(),

        // Override changed accounts
        ...toOverride.map((entry) =>
          fetch(`${apiUrl}/v1/accounts/override`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ 
              existingId: entry.existing?.id, 
              incoming: entry.incoming 
            }),
          }),
        ),
      ]);

      fetchAccounts(pagination.page, pagination.limit, true);
    } catch (err) {
      console.error('Failed to confirm import:', err);
    }
  };

  const handleExport = () => {
    const fileName = `phantoma-all-${Date.now()}.json`;
    extensionService.postMessage({
      command: 'exportAccounts',
      fileName,
      content: JSON.stringify(allAccounts, null, 2),
    });
  };

  const handleExportSelected = () => {
    const selectedData = allAccounts.filter((acc) => selectedAccounts.has(acc.id));
    const fileName = `phantoma-selected-${selectedData.length}-${Date.now()}.json`;
    extensionService.postMessage({
      command: 'exportAccounts',
      fileName,
      content: JSON.stringify(selectedData, null, 2),
    });
  };

  const handleCopySelected = async () => {
    const selectedData = allAccounts.filter((acc) => selectedAccounts.has(acc.id));
    try {
      await navigator.clipboard.writeText(JSON.stringify(selectedData, null, 2));
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set());

  const handleRefreshSelected = async () => {
    const ids = Array.from(selectedAccounts);
    if (ids.length === 0) return;
    
    setRefreshingIds(new Set(ids));
    try {
      // Gọi API refresh token cho từng account đã chọn
      await Promise.all(
        ids.map(async (id) => {
          const acc = allAccounts.find((a) => a.id === id);
          if (acc) {
            await refreshAccountToken(id, acc.provider_id);
          }
        })
      );
      fetchAccounts(pagination.page, pagination.limit, true);
    } finally {
      setRefreshingIds(new Set());
    }
  };

  const handlePrevPage = () => {
    if (pagination.page > 1) {
      fetchAccounts(pagination.page - 1, pagination.limit);
    }
  };

  const handleNextPage = () => {
    if (pagination.page < pagination.total_pages) {
      fetchAccounts(pagination.page + 1, pagination.limit);
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
    <Drawer isOpen={isOpen} onClose={onClose} height="100%" strategy="absolute">
      <DrawerHeader
        title={activeDbName ? `Accounts · ${activeDbName}` : 'Accounts'}
        description="Manage your API accounts"
        onClose={onClose}
      />

      {/* Action Bar */}
      <div className="px-4 pt-3 pb-2 shrink-0 flex gap-2 items-center bg-background">
        {/* Search Input */}
        <div className="flex-1">
            <Input
              type="text"
              placeholder="Search by email, provider ID or provider name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search size={14} className="text-text-secondary" />}
              containerClassName="gap-0 [&>div]:relative"
              inputClassName="h-[34px] text-[13px] rounded-lg"
              className="border-none"
              style={{ backgroundColor: $('--input-background') }}
            />
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
          <DropdownContent>
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
              All Providers [{accounts.length}]
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
                {provider.provider_name} [
                {accounts.filter((acc) => acc.provider_id === provider.provider_id).length}]
              </DropdownItem>
            ))}
          </DropdownContent>
        </Dropdown>

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

      {/* Status badges — click để filter */}
      <div className="px-4 pb-1 shrink-0 flex gap-1.5 flex-wrap">
        {(
          [
            { key: 'active', label: 'Active', count: statusCounts.active },
            { key: 'expired', label: 'Expired', count: statusCounts.expired },
            { key: 'error', label: 'Error', count: 0, disabled: true },
            { key: 'inactive', label: 'Inactive', count: statusCounts.inactive },
          ] as const
        ).map((b) => {
          const isOn = statusFilter === b.key;
          const disabled = 'disabled' in b && b.disabled;
          return (
            <button
              key={b.key}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && setStatusFilter(isOn ? '' : (b.key as any))}
              title={disabled ? 'No data source yet' : `Filter: ${b.label}`}
              className="text-[11px] px-2 py-[3px] rounded-full border-none"
              style={{
                backgroundColor: isOn ? `color-mix(in srgb, ${$('--primary')} 20%, transparent)` : $('--input-background'),
                color: isOn ? $('--primary') : $('--text-secondary'),
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
              }}
            >
              {b.label}[{b.count}]
            </button>
          );
        })}
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
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            animation: 'overlaySlideUp 0.2s ease',
            backdropFilter: 'blur(8px)',
          }}
        >
          {/* Count badge */}
          <div style={{
            fontSize: '11px',
            fontWeight: 600,
            color: $('--primary'),
            backgroundColor: `color-mix(in srgb, ${$('--primary')} 12%, transparent)`,
            padding: '3px 8px',
            borderRadius: '6px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            marginRight: '4px',
          }}>
            {selectedAccounts.size} selected
          </div>

          {/* Divider */}
          <div style={{ width: '1px', height: '20px', backgroundColor: $('--border'), flexShrink: 0 }} />

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
            icon={refreshingIds.size > 0 ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
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
          <div style={{ width: '1px', height: '20px', backgroundColor: $('--border'), flexShrink: 0 }} />

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
      <div className="px-4 mt-2 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-text-primary">List Account</span>
          <span
            className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md text-text-secondary"
            style={{ backgroundColor: `color-mix(in srgb, ${$('--text-secondary')} 10%, transparent)` }}
          >
            {accounts.length}
          </span>
        </div>
        <div className="flex gap-1 p-[3px] rounded-lg" style={{ backgroundColor: $('--input-background') }}>
          {(['day', 'week', 'month', 'year', 'all'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setStatsPeriod(p)}
              className="px-3 py-1 rounded-md border-none text-[11px] font-medium capitalize"
              style={{
                backgroundColor: statsPeriod === p ? `color-mix(in srgb, ${$('--primary')} 15%, transparent)` : 'transparent',
                color: statsPeriod === p ? $('--primary') : $('--text-secondary'),
                cursor: 'pointer',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Account List */}
      <DrawerBody className="p-3 flex flex-col gap-2.5">
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
              />
            );
          })
        )}
      </DrawerBody>

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <DrawerFooter>
          <span className="text-[11px] text-text-secondary">
            {pagination.page} / {pagination.total_pages}
          </span>
          <div className="flex gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
              onClick={handlePrevPage}
            >
              <ChevronLeft size={14} />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === pagination.total_pages}
              onClick={handleNextPage}
            >
              Next
              <ChevronRight size={14} />
            </Button>
          </div>
        </DrawerFooter>
      )}

      <AddAccountDrawer
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => fetchAccounts(pagination.page, pagination.limit, true)}
      />

      <EditAccountDrawer
        open={!!editAccount}
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

      <ConfirmDeleteAccountDrawer
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={executeDelete}
        loading={deleteLoading}
        email={deleteItem?.email}
        providerName={deleteItem?.provider_name}
        websiteUrl={deleteItem?.website_url}
        count={deleteItem ? 1 : selectedAccounts.size}
      />

      <ImportDuplicatesDrawer
        open={importPreviewOpen}
        onOpenChange={setImportPreviewOpen}
        duplicates={importDuplicates as any}
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
    </Drawer>
  );
};

export default AccountPanel;
