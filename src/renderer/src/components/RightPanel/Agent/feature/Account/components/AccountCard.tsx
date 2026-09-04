/**
 * ------------------------------------------------------------------
 * AccountCard
 * ------------------------------------------------------------------
 * Card hiển thị thông tin tài khoản trong danh sách.
 * Hỗ trợ chọn, mở context menu (copy JSON, switch, delete), và mở rộng chi tiết.
 *
 * Main features:
 * - Hiển thị thông tin provider, email, thống kê daily requests/tokens
 * - Context menu khi click chuột phải (Copy as JSON, Switch, Delete)
 * - Expand/collapse chi tiết tài khoản (ID, credential, usage...)
 * ------------------------------------------------------------------
 */

import React, { useState, useEffect } from 'react';
import {
  Trash2,
  RefreshCw,
  CheckCircle,
  Activity,
  Coins,
  Fingerprint,
  KeyRound,
  BarChart3,
  Clock,
  FolderOpen,
  Copy,
} from 'lucide-react';
import { FlatAccount } from '../types';
import { CopyableText } from '../utils';
import { getFaviconUrl } from '../utils';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from '@renderer/components/ui/Dropdown';
import { extensionService } from '../../../services/ExtensionService';

interface AccountCardProps {
  account: FlatAccount;
  isSelected: boolean;
  anySelected: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
  onSwitch: () => void;
  providerConfig?: any;
}

// Custom icon: lucide-square-dashed-mouse-pointer
const SquareDashedMousePointerIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12.034 12.681a.498.498 0 0 1 .647-.647l9 3.5a.5.5 0 0 1-.033.943l-3.444 1.068a1 1 0 0 0-.66.66l-1.067 3.443a.5.5 0 0 1-.943.033z" />
    <path d="M5 3a2 2 0 0 0-2 2" />
    <path d="M19 3a2 2 0 0 1 2 2" />
    <path d="M5 21a2 2 0 0 1-2-2" />
    <path d="M9 3h1" />
    <path d="M9 21h2" />
    <path d="M14 3h1" />
    <path d="M3 9v1" />
    <path d="M21 9v2" />
    <path d="M3 14v1" />
  </svg>
);

const AccountCard: React.FC<AccountCardProps> = ({
  account,
  isSelected,
  anySelected,
  onToggleSelect,
  onDelete,
  onSwitch,
  providerConfig,
}) => {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (anySelected) setExpanded(false);
  }, [anySelected]);

  const providerIconUrl = providerConfig?.website
    ? getFaviconUrl(providerConfig.website)
    : null;

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (anySelected) return;
    setExpanded(!expanded);
  };

  const handleSelectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelect();
  };

  const handleCopyAccount = () => {
    const data = {
      id: account.id,
      provider_id: account.provider_id,
      email: account.email,
      credential: account.credential,
      usage: account.usage ?? null,
      reset_period: account.reset_period ?? null,
      last_refreshed_at: account.last_refreshed_at ?? null,
      is_active_cli: account.is_active_cli ?? false,
      total_requests: account.total_requests ?? null,
      successful_requests: account.successful_requests ?? null,
      total_tokens: account.total_tokens ?? null,
      period_requests: account.daily_requests ?? null,
      period_tokens: account.daily_tokens ?? null,
    };
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  };

  return (
    <Dropdown trigger="contextmenu" align="end" side="right">
      <DropdownTrigger asChild>
        <div
          className="account-card"
          style={{
            backgroundColor: 'var(--input-bg)',
            border: isSelected ? '1px dashed var(--primary)' : 'none',
            borderRadius: '12px',
            transition: 'all 0.2s ease',
            position: 'relative',
          }}
        >
          {/* Main Card Content */}
          <div onClick={handleCardClick} style={{ padding: '10px 12px', cursor: 'pointer' }}>
            {/* Selection checkbox */}
            {anySelected && (
              <div
                style={{
                  position: 'absolute',
                  left: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '14px',
                  height: '14px',
                  borderRadius: '4px',
                  border: isSelected
                    ? '1px solid var(--primary)'
                    : '1px solid var(--border)',
                  backgroundColor: isSelected
                    ? 'rgba(99,102,241,0.2)'
                    : 'rgba(128,128,128,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 1,
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
                onClick={handleSelectClick}
              >
                {isSelected && (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--primary-text)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            )}

            {/* Account info row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                paddingLeft: anySelected ? '24px' : '0px',
                transition: 'padding-left 0.15s ease',
              }}
            >
              {/* Provider icon */}
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(128,128,128,0.1)',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  overflow: 'hidden',
                }}
              >
                {providerIconUrl ? (
                  <img
                    src={providerIconUrl}
                    alt={account.provider_id}
                    style={{ width: '20px', height: '20px', objectFit: 'contain' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      const parent = (e.target as HTMLImageElement).parentElement;
                      if (parent) {
                        const fallback = document.createElement('div');
                        fallback.style.cssText =
                          'width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;';
                        fallback.textContent = account.provider_id
                          .slice(0, 2)
                          .toUpperCase();
                        (e.target as HTMLImageElement).replaceWith(fallback);
                      }
                    }}
                  />
                ) : (
                  <SquareDashedMousePointerIcon size={16} />
                )}
              </div>

              {/* Name + email */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>
                    {providerConfig?.provider_name || account.provider_id}
                  </span>
                  <span style={{ color: 'var(--text-secondary)', margin: '0 4px' }}>|</span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {account.email || 'No email'}
                  </span>
                </p>

                {/* Daily stats */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginTop: '2px',
                  }}
                >
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '10px',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <Activity size={11} style={{ color: 'var(--success, #22c55e)' }} />
                    {(account.daily_requests ?? 0).toLocaleString()} req
                  </span>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '10px',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <Coins size={11} style={{ color: 'var(--warn, #f97316)' }} />
                    {account.daily_tokens !== undefined && account.daily_tokens >= 1000000
                      ? (account.daily_tokens / 1000000).toFixed(1) + 'M'
                      : account.daily_tokens !== undefined && account.daily_tokens >= 1000
                        ? (account.daily_tokens / 1000).toFixed(1) + 'k'
                        : account.daily_tokens ?? 0}{' '}
                    tokens
                  </span>
                </div>
              </div>

              {/* Switch button */}
              {account.is_active_cli === false && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSwitch();
                  }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(128,128,128,0.15)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                    fontSize: '10px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    flexShrink: 0,
                  }}
                >
                  <RefreshCw size={10} />
                  Switch
                </button>
              )}

              {/* Active badge */}
              {account.is_active_cli === true && (
                <div
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--success, rgba(34,197,94,0.1))',
                    border: '1px solid rgba(34,197,94,0.3)',
                    color: 'var(--success, #22c55e)',
                    fontSize: '10px',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    flexShrink: 0,
                  }}
                >
                  <CheckCircle size={10} />
                  Active
                </div>
              )}
            </div>
          </div>

          {/* Expanded detail section */}
          {expanded && (
            <div
              style={{
                borderTop: '1px solid var(--border)',
                backgroundColor: 'var(--input-bg)',
                fontSize: '12px',
                borderRadius: '0 0 12px 12px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  padding: '10px 12px',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '10px',
                      color: 'var(--text-secondary)',
                      marginBottom: '2px',
                    }}
                  >
                    <Fingerprint size={10} />
                    Account ID
                  </div>
                  <CopyableText value={account.id} monospace />
                </div>

                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '10px',
                      color: 'var(--text-secondary)',
                      marginBottom: '2px',
                    }}
                  >
                    <KeyRound size={10} />
                    Credential
                  </div>
                  <CopyableText value={account.credential || ''} monospace />
                </div>

                {(account.usage != null || account.reset_period != null) && (
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '10px',
                        color: 'var(--text-secondary)',
                        marginBottom: '2px',
                      }}
                    >
                      <BarChart3 size={10} />
                      Usage
                    </div>
                    <div
                      style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-primary)' }}
                    >
                      {account.usage ?? '—'}
                      {account.reset_period != null && (
                        <span
                          style={{
                            fontSize: '10px',
                            color: 'var(--text-secondary)',
                            marginLeft: '4px',
                          }}
                        >
                          / {account.reset_period}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {account.last_refreshed_at != null && (
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '10px',
                        color: 'var(--text-secondary)',
                        marginBottom: '2px',
                      }}
                    >
                      <Clock size={10} />
                      Last Refreshed
                    </div>
                    <div
                      style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-primary)' }}
                    >
                      {formatDate(account.last_refreshed_at)}
                    </div>
                  </div>
                )}
              </div>

              <div
                onClick={() => setExpanded(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  color: 'var(--text-secondary)',
                  paddingTop: '8px',
                  paddingBottom: '8px',
                  borderTop: '1px dashed var(--border)',
                  borderRadius: '0 0 12px 12px',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = 'var(--hover-bg)')
                }
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                Click again to collapse
              </div>
            </div>
          )}

          <style>{`
            .account-card:hover {
              transform: translateY(-1px);
              border-color: var(--primary);
              box-shadow: 0 2px 8px rgba(0,0,0,0.12);
            }
          `}</style>
        </div>
      </DropdownTrigger>
      <DropdownContent>
        <DropdownItem
          icon={<SquareDashedMousePointerIcon size={14} />}
          onClick={onToggleSelect}
        >
          {isSelected ? 'Deselect' : 'Select'} Account
        </DropdownItem>
        <DropdownItem icon={<Copy size={14} />} onClick={handleCopyAccount}>
          Copy as JSON
        </DropdownItem>
        {account.is_active_cli === false && (
          <DropdownItem icon={<RefreshCw size={14} />} onClick={onSwitch}>
            Switch to CLI
          </DropdownItem>
        )}
        {providerConfig?.connection_type === 'browser' && account.user_data_dir && (
          <DropdownItem
            icon={<FolderOpen size={14} />}
            onClick={() =>
              extensionService.postMessage({
                command: 'openFolder',
                path: account.user_data_dir,
              })
            }
          >
            Open Profile Folder
          </DropdownItem>
        )}
        <DropdownItem icon={<Trash2 size={14} />} variant="error" onClick={onDelete}>
          Delete Account
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
};

export default AccountCard;