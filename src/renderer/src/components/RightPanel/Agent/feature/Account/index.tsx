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
import { Drawer, DrawerHeader, DrawerBody, DrawerFooter } from '@renderer/components/ui/Drawer';
import { Button } from '@renderer/components/ui/Button';
import { cn } from '@renderer/shared/lib/utils';
import { $ } from '@renderer/utils/color';

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

  return (
    <Drawer isOpen={isOpen} onClose={onClose} height="100%" strategy="absolute">
      <DrawerHeader
        title="Accounts"
        description="Manage your API accounts"
        onClose={onClose}
      />

      {/* Action Bar */}
      <div className="px-4 pt-3 pb-2 shrink-0 flex gap-2 items-center bg-background">
        {/* Search Input */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-[34px] pl-8 pr-3 text-[13px] rounded-lg outline-none box-border bg-input-background border border-border text-text-primary"
          />
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary" />
        </div>

        <ProviderFilterDropdown
          providerConfigs={providerConfigs}
          selectedProvider={providerFilter}
          onSelectProvider={setProviderFilter}
          getFaviconUrl={getFaviconUrl}
        />

        <Button
          variant="solid"
          size="sm"
          className="w-[34px] h-[34px] p-0"
          onClick={() => setDialogOpen(true)}
          title="Add account"
        >
          <Plus size={16} />
        </Button>

        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-[34px] h-[34px] rounded-lg border flex items-center justify-center shrink-0 cursor-pointer bg-input-background border-border text-text-secondary"
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
            <div className="absolute right-0 top-full mt-2 w-[160px] rounded-xl overflow-hidden z-[100] bg-card-background border border-border shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
              <button
                onClick={handleImport}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 border-none bg-transparent text-[13px] cursor-pointer text-left text-text-primary"
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = $('--hover-bg'))}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Upload size={14} />
                <span>Import JSON</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedAccounts.size > 0 && (
        <div className="mt-2 mx-4 px-3 py-2 rounded-[10px] flex items-center justify-between bg-sidebar-item-hover/10">
          <span className="text-xs text-text-primary">
            {selectedAccounts.size} selected
          </span>
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

      {/* Account List */}
      <DrawerBody className="p-3 flex flex-col gap-2.5">
        {loading && accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[200px] gap-3 text-text-secondary">
            <Loader2
              size={28}
              style={{ color: $('--accent-text'), animation: 'spin 1s linear infinite' }}
            />
            <span className="text-xs">Loading accounts...</span>
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[200px] gap-3 text-center text-text-secondary">
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
    </Drawer>
  );
};

export default AccountPanel;