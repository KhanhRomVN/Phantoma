// ─── Accounts Tab ────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, Trash2, Search, CheckCircle, AlertCircle, X } from 'lucide-react';
import { Account, Provider } from '../../types';
import { getAgentAPI } from '../../services/api';
import { useAgentStore } from '../store';
import { cn } from '@renderer/shared/lib/utils';

export function Accounts() {
  const { apiUrl, activeAccountId, setActiveAccountId } = useAgentStore();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addingAccount, setAddingAccount] = useState(false);
  const [addMethod, setAddMethod] = useState<'chrome' | 'manual'>('manual');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addCredential, setAddCredential] = useState('');
  const [addMessage, setAddMessage] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // ─── Load data ───────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const api = getAgentAPI(apiUrl);
      const [providersData, accountsData] = await Promise.all([
        api.getProviders(),
        api.getAccounts(),
      ]);
      setProviders(providersData);
      setAccounts(accountsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Select account ─────────────────────────────────────────────────

  const selectAccount = useCallback(
    (accountId: string) => {
      setActiveAccountId(activeAccountId === accountId ? null : accountId);
    },
    [activeAccountId, setActiveAccountId],
  );

  // ─── Delete account ────────────────────────────────────────────────

  const handleDeleteAccount = useCallback(
    async (accountId: string) => {
      if (!confirm('Delete this account?')) return;

      try {
        const api = getAgentAPI(apiUrl);
        await api.deleteAccount(accountId);
        setAccounts((prev) => prev.filter((a) => a.id !== accountId));
        if (activeAccountId === accountId) {
          setActiveAccountId(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete account');
      }
    },
    [apiUrl, activeAccountId, setActiveAccountId],
  );

  // ─── Add account ────────────────────────────────────────────────────

  const handleAddAccount = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedProvider) {
        setAddError('Please select a provider');
        return;
      }

      if (addMethod === 'manual' && !addEmail) {
        setAddError('Please enter an email');
        return;
      }

      setAddingAccount(true);
      setAddError(null);
      setAddMessage(null);

      try {
        const api = getAgentAPI(apiUrl);
        const newAccount = await api.addAccount(
          selectedProvider,
          addEmail,
          addMethod === 'manual' ? addCredential : undefined,
        );
        setAccounts((prev) => [...prev, newAccount]);
        setAddMessage('Account added successfully!');
        setAddEmail('');
        setAddCredential('');
        setShowAddForm(false);
        setTimeout(() => setAddMessage(null), 3000);
      } catch (err) {
        setAddError(err instanceof Error ? err.message : 'Failed to add account');
      } finally {
        setAddingAccount(false);
      }
    },
    [selectedProvider, addMethod, addEmail, addCredential, apiUrl],
  );

  // ─── Filtering ──────────────────────────────────────────────────────

  const filteredAccounts = accounts.filter(
    (a) =>
      a.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.provider_id.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getProviderName = (providerId: string) => {
    const p = providers.find((p) => p.provider_id === providerId);
    return p?.provider_name || providerId;
  };

  const getProviderFavicon = (providerId: string) => {
    const p = providers.find((p) => p.provider_id === providerId);
    if (p?.website_url) {
      return `https://www.google.com/s2/favicons?domain=${new URL(p.website_url).hostname}`;
    }
    return null;
  };

  // ─── Loading state ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-text-secondary gap-3">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        <span className="text-xs">Loading accounts...</span>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-divider flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-bold text-text-primary">Account Manager</h3>
          <p className="text-[11px] text-text-secondary">
            Manage provider credentials and active sessions.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/25 rounded-md text-[11px] font-semibold transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          {showAddForm ? 'Hide Form' : 'Add Account'}
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddAccount}
          className="mt-3 p-4 bg-card-background border border-border rounded-lg space-y-3.5"
        >
          <h4 className="text-xs font-bold text-text-primary flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            Register New Account
          </h4>

          {/* Method Selector */}
          <div className="flex gap-3 p-1.5 bg-background border border-border rounded-md text-xs">
            <button
              type="button"
              onClick={() => setAddMethod('chrome')}
              className={cn(
                'flex-1 py-1 rounded text-center font-medium transition-all',
                addMethod === 'chrome'
                  ? 'bg-cyan-500/10 text-cyan-400'
                  : 'text-text-secondary hover:text-text-primary',
              )}
            >
              Chrome Login
            </button>
            <button
              type="button"
              onClick={() => setAddMethod('manual')}
              className={cn(
                'flex-1 py-1 rounded text-center font-medium transition-all',
                addMethod === 'manual'
                  ? 'bg-cyan-500/10 text-cyan-400'
                  : 'text-text-secondary hover:text-text-primary',
              )}
            >
              Manual Credentials
            </button>
          </div>

          {/* Provider Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-text-secondary block mb-1">Provider</label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="w-full bg-card-background border border-border rounded px-3 py-2 text-xs text-text-primary outline-none focus:border-cyan-500/40"
              >
                <option value="">Select provider...</option>
                {providers
                  .filter((p) => p.is_enabled)
                  .map((p) => (
                    <option key={p.provider_id} value={p.provider_id}>
                      {p.provider_name}
                    </option>
                  ))}
              </select>
            </div>
            {addMethod === 'manual' && (
              <div>
                <label className="text-[10px] text-text-secondary block mb-1">
                  Email / Identifier
                </label>
                <input
                  type="email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full bg-card-background border border-border rounded px-3 py-2 text-xs text-text-primary outline-none focus:border-cyan-500/40 placeholder-text-secondary"
                />
              </div>
            )}
          </div>

          {/* Credential Input (Manual) */}
          {addMethod === 'manual' && (
            <div>
              <label className="text-[10px] text-text-secondary block mb-1">Credential</label>
              <textarea
                value={addCredential}
                onChange={(e) => setAddCredential(e.target.value)}
                placeholder="Input credentials or cookies..."
                rows={3}
                className="w-full bg-card-background border border-border rounded px-3 py-2 text-xs text-text-primary outline-none focus:border-cyan-500/40 placeholder-text-secondary font-mono"
              />
            </div>
          )}

          {/* Status Messages */}
          {addMessage && (
            <div className="text-[10px] text-green-400 bg-green-500/10 border border-green-500/20 rounded p-2 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{addMessage}</span>
            </div>
          )}

          {addError && (
            <div className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{addError}</span>
            </div>
          )}

          {error && (
            <div className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-2.5 pt-1.5">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3.5 py-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addingAccount}
              className="px-4 py-1.5 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 text-xs font-semibold rounded transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {addingAccount && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {addMethod === 'chrome' ? 'Open Chrome Login' : 'Save Account'}
            </button>
          </div>
        </form>
      )}

      {/* Search */}
      <div className="flex items-center gap-3 py-3">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search accounts..."
            className="w-full bg-card-background border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-text-primary outline-none focus:border-cyan-500/40 placeholder-text-secondary"
          />
        </div>
        <span className="text-[10px] text-text-secondary whitespace-nowrap">
          {filteredAccounts.length} accounts
        </span>
      </div>

      {/* Account List */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-sm">
        {filteredAccounts.length === 0 ? (
          <div className="text-center py-12 text-text-secondary text-xs">
            No accounts match your criteria or none registered yet.
          </div>
        ) : (
          <div className="space-y-2.5 pb-4">
            {filteredAccounts.map((account) => {
              const isActive = activeAccountId === account.id;
              const favicon = getProviderFavicon(account.provider_id);

              return (
                <div
                  key={account.id}
                  onClick={() => selectAccount(account.id)}
                  className={cn(
                    'p-3 bg-card-background border rounded-lg transition-all flex items-center justify-between cursor-pointer',
                    isActive
                      ? 'border-cyan-500/50 bg-cyan-500/5'
                      : 'border-border hover:border-cyan-500/10',
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center text-xs font-bold text-text-primary shrink-0 border border-border">
                      {favicon ? (
                        <img
                          src={favicon}
                          alt=""
                          className="w-5 h-5 object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        account.provider_id.slice(0, 2).toUpperCase()
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-text-primary truncate">
                          {account.email}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-background text-text-secondary font-mono shrink-0">
                          {getProviderName(account.provider_id)}
                        </span>
                        {isActive && (
                          <span className="text-[9px] text-green-400 font-bold bg-green-500/5 px-1.5 rounded uppercase shrink-0">
                            Selected
                          </span>
                        )}
                      </div>

                      <div className="flex gap-3 mt-1 text-[9px] text-text-secondary font-mono flex-wrap">
                        <span>Requests: {account.total_requests || 0}</span>
                        <span>Tokens: {Number(account.total_tokens || 0).toLocaleString()}</span>
                        {account.daily_requests !== undefined && (
                          <span>Daily: {account.daily_requests} reqs</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAccount(account.id);
                    }}
                    className="p-1.5 hover:bg-red-500/15 text-text-secondary hover:text-red-400 rounded transition-colors shrink-0 ml-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
