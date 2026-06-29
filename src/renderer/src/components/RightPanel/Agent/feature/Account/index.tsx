import React, { useState, useEffect } from 'react';
import {
  Loader2,
  Plus,
  Search,
  Upload,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Smartphone,
  Users,
} from 'lucide-react';
import AccountCard from './components/AccountCard';
import AddAccountDrawer from './components/AddAccountDrawer';
import ConfirmDeleteDrawer from './components/ConfirmDeleteDrawer';
import ProviderFilterDropdown from './components/ProviderFilterDropdown';
import { useAccounts } from './hooks/useAccounts';
import { getFaviconUrl } from './utils';
import { extensionService } from '../../services/ExtensionService';
import { cn } from '@renderer/shared/lib/utils';

interface AccountPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const AccountPanel: React.FC<AccountPanelProps> = ({ isOpen, onClose }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

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
    providerFilter,
    setProviderFilter,
    emailFilter,
    setEmailFilter,
    switchKiroAccount,
  } = useAccounts(isOpen);

  const [closeHover, setCloseHover] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = () => setShowDropdown(false);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen]);

  const handleImport = async () => {
    try {
      extensionService.postMessage({ command: 'importAccounts' });
      setTimeout(() => fetchAccounts(pagination.page, pagination.limit, true), 800);
    } catch (error) {
      console.error('Failed to import:', error);
    }
    setShowDropdown(false);
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

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 w-full h-full z-50 flex flex-col overflow-hidden bg-[var(--secondary-bg)]">
      {/* Header */}
      <div className="px-4 pt-4 pb-3.5 shrink-0 border-t border-b border-[var(--border-color)] bg-[var(--tertiary-bg)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center bg-[rgba(128,128,128,0.1)] text-[var(--vscode-foreground)]">
              <Smartphone size={18} />
            </div>
            <div>
              <div className="mb-[3px]">
                <span className="font-bold text-sm tracking-[0.01em] text-[var(--primary-text)]">
                  Accounts
                </span>
              </div>
              <p className="m-0 text-xs opacity-70 leading-relaxed text-[var(--secondary-text)]">
                Manage your API accounts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            onMouseEnter={() => setCloseHover(true)}
            onMouseLeave={() => setCloseHover(false)}
            className={cn(
              'p-[5px] rounded-md shrink-0 border-none flex items-center justify-center cursor-pointer transition-all duration-150',
              closeHover
                ? 'bg-[var(--vscode-inputValidation-errorBackground,rgba(239,68,68,0.12))] text-[var(--vscode-errorForeground)]'
                : 'bg-[rgba(128,128,128,0.1)] text-[var(--secondary-text)]'
            )}
            title="Close Accounts"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Action Bar */}
      <div className="px-4 pt-4 pb-3 shrink-0 bg-[var(--tertiary-bg)]">
        <div className="flex gap-2 items-center">
          {/* Search Input */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-[34px] pl-8 pr-3 text-[13px] rounded-lg outline-none box-border bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--primary-text)]"
            />
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--secondary-text)]" />
          </div>

          <ProviderFilterDropdown
            providerConfigs={providerConfigs}
            selectedProvider={providerFilter}
            onSelectProvider={setProviderFilter}
            getFaviconUrl={getFaviconUrl}
          />

          <button
            onClick={() => setDialogOpen(true)}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.45')}
            className="w-[34px] h-[34px] rounded-lg border-none flex items-center justify-center shrink-0 cursor-pointer transition-opacity duration-150 opacity-45 bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)]"
            title="Add account"
          >
            <Plus size={16} />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="w-[34px] h-[34px] rounded-lg border flex items-center justify-center shrink-0 cursor-pointer bg-[var(--input-bg)] border-[var(--border-color)] text-[var(--secondary-text)]"
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
            {showDropdown && (
              <div className="absolute right-0 top-full mt-2 w-[160px] rounded-xl overflow-hidden z-[100] bg-[var(--tertiary-bg)] border border-[var(--border-color)] shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
                <button
                  onClick={handleImport}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 border-none bg-transparent text-[13px] cursor-pointer text-left text-[var(--primary-text)]"
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--hover-bg)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Upload size={14} />
                  <span>Import JSON</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedAccounts.size > 0 && (
        <div className="mt-3 mx-4 px-3 py-2 rounded-[10px] flex items-center justify-between bg-[var(--vscode-list-activeSelectionBackground,rgba(128,128,128,0.1))]">
          <span className="text-xs text-[var(--primary-text)]">
            {selectedAccounts.size} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleSelectAll}
              className="px-2.5 py-1 rounded-md bg-transparent border border-[var(--border-color)] text-[11px] cursor-pointer text-[var(--secondary-text)]"
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--hover-bg)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              {allVisibleSelected ? 'Deselect All' : 'Select All'}
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-2.5 py-1 rounded-md border-none text-[11px] cursor-pointer flex items-center gap-1 bg-[var(--vscode-inputValidation-errorBackground,rgba(239,68,68,0.12))] text-[var(--vscode-errorForeground,#f87171)]"
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              <Trash2 size={12} />
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Account List */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5">
        {loading && accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[200px] gap-3 text-[var(--secondary-text)]">
            <Loader2
              size={28}
              className="text-[var(--accent-text)]"
              style={{ animation: 'spin 1s linear infinite' }}
            />
            <span className="text-xs">Loading accounts...</span>
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[200px] gap-3 text-center text-[var(--secondary-text)]">
            <Users size={40} className="opacity-30" />
            <div>
              <p className="text-sm font-medium m-0 mb-1">
                {searchQuery ? 'No matching accounts' : 'No accounts yet'}
              </p>
              <p className="text-[11px] m-0 opacity-70">
                {searchQuery ? 'Try a different search' : 'Click the + button to add one'}
              </p>
            </div>
          </div>
        ) : (
          accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              isSelected={selectedAccounts.has(account.id)}
              anySelected={selectedAccounts.size > 0}
              onToggleSelect={() => toggleSelection(account.id)}
              onDelete={() => handleDelete(account.id, account.email)}
              onSwitch={() => switchKiroAccount(account.id)}
              providerConfig={providerConfigs.find((p) => p.provider_id === account.provider_id)}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 shrink-0 border-t border-[var(--border-color)] bg-[var(--tertiary-bg)]">
          <span className="text-[11px] text-[var(--secondary-text)]">
            {pagination.page} / {pagination.total_pages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={handlePrevPage}
              disabled={pagination.page === 1}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--primary-text)]',
                pagination.page === 1
                  ? 'cursor-not-allowed opacity-50'
                  : 'cursor-pointer opacity-100'
              )}
            >
              <ChevronLeft size={14} />
              Previous
            </button>
            <button
              onClick={handleNextPage}
              disabled={pagination.page === pagination.total_pages}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--primary-text)]',
                pagination.page === pagination.total_pages
                  ? 'cursor-not-allowed opacity-50'
                  : 'cursor-pointer opacity-100'
              )}
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      <AddAccountDrawer
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => fetchAccounts(pagination.page, pagination.limit, true)}
      />

      <ConfirmDeleteDrawer
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={executeDelete}
        loading={deleteLoading}
        title={
          deleteItem ? `Delete account ${deleteItem.email ?? ''}?` : 'Delete selected accounts'
        }
        count={deleteItem ? 1 : selectedAccounts.size}
      />

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default AccountPanel;