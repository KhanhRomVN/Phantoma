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
} from 'lucide-react';
import AccountCard from './components/AccountCard';
import AddAccountDrawer from './components/AddAccountDrawer';
import EditAccountDrawer from './components/EditAccountDrawer';
import ConfirmDeleteDrawer from './components/ConfirmDeleteDrawer';
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
import { logger } from '@renderer/utils/logger';
import { extensionService } from '../../services/ExtensionService';
import { Drawer, DrawerHeader, DrawerBody, DrawerFooter } from '@renderer/components/ui/Drawer';
import { Button } from '@renderer/components/ui/Button';
import { Input } from '@renderer/components/ui/Input';
import { $ } from '@renderer/utils/color';
import { getFaviconUrl } from './utils';
import { FlatAccount } from './types';

interface AccountPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const AccountPanel: React.FC<AccountPanelProps> = ({ isOpen, onClose }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<FlatAccount | null>(null);
  const { apiUrl } = useSettings();
  const activeDbName = useActiveDatabaseManagerName();

  const {
    accounts,
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

  const handleImport = async () => {
    try {
      extensionService.postMessage({ command: 'importAccounts', apiUrl });
      setTimeout(() => fetchAccounts(pagination.page, pagination.limit, true), 1200);
    } catch (error) {
      logger.error('Failed to import:', error);
    }
  };

  const handleExport = () => {
    const fileName = `phantoma-${accounts.length}-${Date.now()}.json`;
    extensionService.postMessage({
      command: 'exportAccounts',
      fileName,
      content: JSON.stringify(accounts, null, 2),
    });
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
            style={{ backgroundColor: $('--input-bg') }}
          />
        </div>

        <Dropdown align="end" sideOffset={4}>
          <DropdownTrigger asChild>
            <button
              className="w-[34px] h-[34px] rounded-lg flex items-center justify-center shrink-0 cursor-pointer text-text-secondary"
              style={{ backgroundColor: $('--input-bg'), border: 'none' }}
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
                  style={{ backgroundColor: 'rgba(128,128,128,0.15)' }}
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
              style={{ backgroundColor: $('--input-bg'), border: 'none' }}
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
                backgroundColor: isOn ? 'rgba(59,130,246,0.2)' : $('--input-bg'),
                color: isOn ? '#3b82f6' : 'var(--text-secondary)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
              }}
            >
              {b.label}[{b.count}]
            </button>
          );
        })}
      </div>

      {/* Bulk Actions Bar */}
      {selectedAccounts.size > 0 && (
        <div className="mt-2 mx-4 px-3 py-2 rounded-[10px] flex items-center justify-between bg-sidebar-item-hover/10">
          <span className="text-xs text-text-primary">{selectedAccounts.size} selected</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              {allVisibleSelected ? 'Deselect All' : 'Select All'}
            </Button>
            <Button variant="error" size="sm" onClick={handleBulkDelete}>
              <Trash2 size={12} />
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Header: label + period tab bar */}
      <div className="px-4 mt-2 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-text-primary">List Account</span>
          <span
            className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md text-text-secondary"
            style={{ backgroundColor: 'rgba(128,128,128,0.1)' }}
          >
            {accounts.length}
          </span>
        </div>
        <div
          className="flex gap-1 p-[3px] rounded-lg"
          style={{ backgroundColor: $('--input-bg') }}
        >
          {(['day', 'week', 'month'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setStatsPeriod(p)}
              className="px-3 py-1 rounded-md border-none text-[11px] font-medium capitalize"
              style={{
                backgroundColor: statsPeriod === p ? 'rgba(59,130,246,0.15)' : 'transparent',
                color: statsPeriod === p ? '#3b82f6' : 'var(--text-secondary)',
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
            ? providerConfigs.find((p) => p.provider_id === editAccount.provider_id) ?? null
            : null
        }
      />

      <ConfirmDeleteDrawer
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={executeDelete}
        loading={deleteLoading}
        email={deleteItem?.email}
        providerName={deleteItem?.provider_name}
        websiteUrl={deleteItem?.website_url}
        count={deleteItem ? 1 : selectedAccounts.size}
      />
    </Drawer>
  );
};

export default AccountPanel;