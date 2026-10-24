import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
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
  Key,
  Pencil,
  XCircle,
} from 'lucide-react';
import { FlatAccount } from '../types';
import { CopyableText } from '../utils';
import { getFaviconUrl } from '@renderer/shared/utils/faviconUtils';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from '@renderer/components/ui/Dropdown';
import { extensionService } from '../../../services/ExtensionService';
import {
  extractAccessToken,
  formatJwtExpiry,
  isJwtExpired,
  extractCookieSessionExpiry,
  formatExpiryMs,
} from '@renderer/utils/jwt';
import {
  formatInUserTimezone,
  parseIsoSafe,
  getUserTimezone,
  computeNextResetVN,
} from '@renderer/utils/timezone';
import AccountTooltip from './AccountTooltip';
import { $ } from '@renderer/utils/color';

interface AccountCardProps {
  account: FlatAccount;
  isSelected: boolean;
  anySelected: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
  onSwitch: () => void;
  onRefreshToken?: () => Promise<{ success: boolean; error?: string }>;
  onEdit?: () => void;
  providerConfig?: any;
  statsPeriod?: 'day' | 'week' | 'month' | 'year' | 'all';
  externalRefreshing?: boolean;
  externalRefreshResult?: { success: boolean; error?: string } | null;
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
  onRefreshToken,
  onEdit,
  providerConfig,
  statsPeriod = 'day',
  externalRefreshing = false,
  externalRefreshResult = null,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const refreshStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Hover tooltip state ───────────────────────────────────────────────
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [tooltipVisible, setTooltipVisible] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setTooltipPos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    setTooltipPos({ x: e.clientX, y: e.clientY });
    setTooltipVisible(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltipVisible(false);
  }, []);

  useEffect(() => {
    if (anySelected) setExpanded(false);
  }, [anySelected]);

  // Cleanup timer khi unmount
  useEffect(() => {
    return () => {
      if (refreshStatusTimerRef.current) clearTimeout(refreshStatusTimerRef.current);
    };
  }, []);

  const providerIconUrl = providerConfig?.website
    ? getFaviconUrl(providerConfig.website)
    : null;

  /** Format ISO/SQLite date string theo timezone của người dùng */
  const formatIsoDate = (iso: string) => {
    const d = parseIsoSafe(iso);
    return formatInUserTimezone(d, iso);
  };

  const isBrowserConnection = providerConfig?.connection_type === 'browser';

  // Extract JWT token and check expiry (with cookie fallback)
  const accessToken = extractAccessToken(account.credential || '');
  const expiryToken = accessToken;
  const tokenExpiry = expiryToken
    ? formatJwtExpiry(expiryToken)
    : (() => {
        const cookieExpMs = extractCookieSessionExpiry(account.credential || '');
        return cookieExpMs !== null ? formatExpiryMs(cookieExpMs) : null;
      })();
  const isTokenExpired = expiryToken
    ? isJwtExpired(expiryToken)
    : (() => {
        const cookieExpMs = extractCookieSessionExpiry(account.credential || '');
        return cookieExpMs !== null ? Date.now() >= cookieExpMs : false;
      })();

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Khi đang ở selection mode: click bất kỳ đâu = toggle select
    if (anySelected) {
      onToggleSelect();
      return;
    }
    setExpanded(!expanded);
  };

  const handleCopyAccount = () => {
    const data = {
      id: account.id,
      provider_id: account.provider_id,
      email: account.email,
      credential: account.credential,
      auth_method: account.auth_method ?? null,
      usage: account.usage ?? null,
      reset_usage_at: account.reset_usage_at ?? null,
      is_active_cli: account.is_active_cli ?? false,
      total_requests: account.total_requests ?? null,
      successful_requests: account.successful_requests ?? null,
      total_tokens: account.total_tokens ?? null,
      period_requests: account.period_requests ?? null,
      period_tokens: account.period_tokens ?? null,
    };
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  };

  const prevExternalRefreshing = useRef(false);
  useEffect(() => {
    if (externalRefreshing) setIsRefreshing(true);
    else if (prevExternalRefreshing.current) setIsRefreshing(false);
    prevExternalRefreshing.current = externalRefreshing;
  }, [externalRefreshing]);

  useEffect(() => {
    if (!externalRefreshResult) return;
    if (refreshStatusTimerRef.current) clearTimeout(refreshStatusTimerRef.current);
    setRefreshStatus(externalRefreshResult.success ? 'success' : 'error');
    setRefreshError(
      externalRefreshResult.success ? null : externalRefreshResult.error || 'Refresh failed',
    );
    refreshStatusTimerRef.current = setTimeout(() => {
      setRefreshStatus('idle');
      setRefreshError(null);
    }, 3000);
  }, [externalRefreshResult]);

  const handleRefreshToken = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!onRefreshToken || isRefreshing) {
      console.warn('[AccountCard][handleRefreshToken] Aborted', {
        hasOnRefreshToken: !!onRefreshToken,
        isRefreshing,
      });
      return;
    }
    setIsRefreshing(true);
    setRefreshStatus('idle');
    setRefreshError(null);
    // Clear previous timer
    if (refreshStatusTimerRef.current) clearTimeout(refreshStatusTimerRef.current);
    try {
      const result = await onRefreshToken();
      if (result.success) {
        setRefreshStatus('success');
      } else {
        setRefreshStatus('error');
        setRefreshError(result.error || 'Refresh failed');
      }
    } catch (err: any) {
      console.error('[AccountCard][handleRefreshToken] Exception:', err);
      setRefreshStatus('error');
      setRefreshError(err?.message || 'Refresh failed');
    } finally {
      setIsRefreshing(false);
      // Auto-clear feedback sau 3s
      refreshStatusTimerRef.current = setTimeout(() => {
        setRefreshStatus('idle');
        setRefreshError(null);
      }, 3000);
    }
  };

  // ── Selected card style: subtle highlight, no dashed border ──────────
  const primaryColor = $('--primary');
  const inputBg = $('--input-background');

  const cardStyle: React.CSSProperties = {
    backgroundColor: isSelected
      ? `color-mix(in srgb, ${primaryColor} 10%, ${inputBg})`
      : inputBg,
    border: isSelected
      ? `1.5px solid color-mix(in srgb, ${primaryColor} 60%, transparent)`
      : '1.5px solid transparent',
    borderRadius: '12px',
    transition: 'all 0.15s ease',
    position: 'relative',
    cursor: anySelected ? 'pointer' : 'default',
  };

  return (
    <Dropdown trigger="contextmenu" align="end" side="right">
      <DropdownTrigger asChild>
        <div
          className="account-card"
          style={cardStyle}
          onClick={handleCardClick}
          onMouseEnter={handleMouseEnter}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Hover tooltip — render qua portal để tránh bị clip */}
          {tooltipVisible &&
            ReactDOM.createPortal(
              <AccountTooltip
                account={account}
                providerConfig={providerConfig}
                x={tooltipPos.x}
                y={tooltipPos.y}
                visible={tooltipVisible}
                statsPeriod={statsPeriod}
              />,
              document.body,
            )}

          {/* Main Card Content */}
          <div style={{ padding: '10px 12px' }}>
            {/* Checkmark indicator when selected (top-right corner, subtle) */}
            {isSelected && (
              <div
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  backgroundColor: $('--primary'),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2,
                  flexShrink: 0,
                }}
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            )}

            {/* Account info row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                paddingRight: isSelected ? '24px' : '0',
                transition: 'padding-right 0.15s ease',
              }}
            >
              {/* Provider icon */}
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: $('--text-secondary', 0.1),
                  color: $('--text-primary'),
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
                        fallback.textContent = account.provider_id.slice(0, 2).toUpperCase();
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
                  {account.auth_method &&
                    (() => {
                      const method = account.auth_method;
                      const baseUri = (window as any).__zenImagesUri as string | undefined;
                      const knownIcons = ['google', 'github', 'x'];
                      const hasIcon = knownIcons.includes(method) && baseUri;
                      return (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginLeft: '5px',
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 7px',
                            borderRadius: '4px',
                            backgroundColor: $('--text-secondary', 0.1),
                            color: $('--text-secondary'),
                            letterSpacing: '0.02em',
                            verticalAlign: 'middle',
                            flexShrink: 0,
                          }}
                        >
                          {hasIcon ? (
                            <img
                              src={`${baseUri}/auth_icons/${method}.svg`}
                              alt={method}
                              style={{ width: '12px', height: '12px', objectFit: 'contain' }}
                            />
                          ) : (
                            <Key size={11} />
                          )}
                          {method}
                        </span>
                      );
                    })()}
                </p>

                {/* Period stats */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginTop: '2px',
                    overflow: 'hidden',
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '10px',
                      color: $('--text-secondary'),
                      flexShrink: 0,
                    }}
                  >
                    <Activity size={11} style={{ color: $('--success') }} />
                    {(account.period_requests ?? 0).toLocaleString()} msg
                  </span>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '10px',
                      color: $('--text-secondary'),
                      flexShrink: 0,
                    }}
                  >
                    <Coins size={11} style={{ color: $('--warn') }} />
                    {account.period_tokens !== undefined && account.period_tokens >= 1000000
                      ? (account.period_tokens / 1000000).toFixed(1) + 'M'
                      : account.period_tokens !== undefined && account.period_tokens >= 1000
                        ? (account.period_tokens / 1000).toFixed(1) + 'k'
                        : (account.period_tokens ?? 0)}{' '}
                    tokens
                  </span>
                  {account.usage != null &&
                    (() => {
                      const usageNum = Number(account.usage);
                      const errorColor = $('--error');
                      const warnColor = $('--warn');
                      const purpleColor = $('--purple');
                      const secondaryColor = $('--text-secondary');
                      
                      const usageColor =
                        usageNum >= 90
                          ? errorColor
                          : usageNum >= 70
                            ? warnColor
                            : purpleColor;
                            
                      const textColor =
                        usageNum >= 90
                          ? errorColor
                          : usageNum >= 70
                            ? warnColor
                            : secondaryColor;

                      const resetTitle = account.reset_usage_at
                        ? `Usage resets at: ${formatIsoDate(account.reset_usage_at)} (${getUserTimezone()})`
                        : undefined;
                      return (
                        <span
                          title={resetTitle}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '10px',
                            color: textColor,
                            flexShrink: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '80px',
                          }}
                        >
                          <BarChart3 size={11} style={{ flexShrink: 0, color: usageColor }} />
                          <span
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {usageNum.toFixed(1)}%
                          </span>
                        </span>
                      );
                    })()}
                  {/* Reset countdown — hiển thị kể cả khi reset_usage_at cũ/expired */}
                  {account.usage != null &&
                    account.reset_usage_at != null &&
                    (() => {
                      const storedReset = parseIsoSafe(account.reset_usage_at);
                      const resetDate =
                        !isNaN(storedReset.getTime()) && storedReset.getTime() > Date.now()
                          ? storedReset
                          : computeNextResetVN('day');
                      const diffMs = resetDate.getTime() - Date.now();
                      if (diffMs <= 0) return null;
                      const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
                      const label =
                        diffHours < 1
                          ? 'Resets <1h'
                          : diffHours < 24
                            ? `Resets ${diffHours}h`
                            : `Resets ${Math.ceil(diffHours / 24)}d`;
                      const resetLabel = formatInUserTimezone(resetDate);
                      return (
                        <span
                          title={`Usage resets at: ${resetLabel} (${getUserTimezone()})`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontSize: '10px',
                            color: $('--warn'),
                            flexShrink: 0,
                          }}
                        >
                          <Clock size={10} style={{ flexShrink: 0 }} />
                          <span>{label}</span>
                        </span>
                      );
                    })()}
                  {tokenExpiry && (
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '10px',
                        color: isTokenExpired
                          ? $('--error')
                          : $('--text-secondary'),
                        flexShrink: 1,
                        overflow: 'hidden',
                        minWidth: 0,
                      }}
                    >
                      <Clock
                        size={11}
                        style={{
                          flexShrink: 0,
                          color: isTokenExpired
                            ? $('--error')
                            : $('--primary'),
                        }}
                      />
                      <span
                        style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {isTokenExpired ? 'Expired' : `Exp: ${tokenExpiry}`}
                      </span>
                    </span>
                  )}

                  {/* Refresh token feedback badge */}
                  {isRefreshing && (
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '10px',
                        color: $('--primary'),
                        flexShrink: 0,
                      }}
                    >
                      <RefreshCw size={10} style={{ animation: 'spin 1s linear infinite' }} />
                      Refreshing…
                    </span>
                  )}
                  {!isRefreshing && refreshStatus === 'success' && (
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '10px',
                        color: $('--success'),
                        flexShrink: 0,
                      }}
                    >
                      <CheckCircle size={10} />
                      Token refreshed
                    </span>
                  )}
                  {!isRefreshing && refreshStatus === 'error' && (
                    <span
                      title={refreshError || 'Refresh failed'}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '10px',
                        color: $('--error'),
                        flexShrink: 0,
                        overflow: 'hidden',
                        maxWidth: '120px',
                      }}
                    >
                      <XCircle size={10} style={{ flexShrink: 0 }} />
                      <span
                        style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {refreshError || 'Refresh failed'}
                      </span>
                    </span>
                  )}
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
                    backgroundColor: `color-mix(in srgb, ${$('--text-secondary')} 15%, transparent)`,
                    border: `1px solid ${$('--border')}`,
                    color: $('--text-secondary'),
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
                    backgroundColor: `color-mix(in srgb, ${$('--success')} 10%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${$('--success')} 30%, transparent)`,
                    color: $('--success'),
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
          {expanded && !anySelected && (
            <div
              style={{
                borderTop: `1px solid ${$('--border')}`,
                backgroundColor: $('--input-background'),
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
                      color: $('--text-secondary'),
                      marginBottom: '2px',
                    }}
                  >
                    <Fingerprint size={10} />
                    Account ID
                  </div>
                  <CopyableText value={account.id} monospace />
                </div>

                {!isBrowserConnection &&
                  account.credential &&
                  (() => {
                    let parsed: Record<string, any> | null = null;
                    try {
                      const raw = account.credential.trim();
                      if (raw.startsWith('{')) {
                        parsed = JSON.parse(raw);
                      }
                    } catch {
                      /* ignore */
                    }

                    if (parsed) {
                      return (
                        <>
                          {Object.entries(parsed).map(([key, val]) => (
                            <div key={key} style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '10px',
                                  color: $('--text-secondary'),
                                  marginBottom: '2px',
                                }}
                              >
                                <KeyRound size={10} />
                                {key}
                              </div>
                              <CopyableText value={String(val ?? '')} monospace />
                            </div>
                          ))}
                        </>
                      );
                    }

                    return (
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '10px',
                            color: $('--text-secondary'),
                            marginBottom: '2px',
                          }}
                        >
                          <KeyRound size={10} />
                          Credential
                        </div>
                        <CopyableText value={account.credential} monospace />
                      </div>
                    );
                  })()}

                {account.reset_usage_at != null && (
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '10px',
                        color: $('--text-secondary'),
                        marginBottom: '2px',
                      }}
                    >
                      <Clock size={10} />
                      Reset At ({getUserTimezone()})
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 500, color: $('--text-primary') }}>
                      {(() => {
                        const stored = parseIsoSafe(account.reset_usage_at!);
                        const effectiveReset =
                          !isNaN(stored.getTime()) && stored.getTime() > Date.now()
                            ? stored
                            : computeNextResetVN('day');
                        return formatInUserTimezone(effectiveReset);
                      })()}
                    </div>
                  </div>
                )}
              </div>

              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  color: $('--text-secondary'),
                  paddingTop: '8px',
                  paddingBottom: '8px',
                  borderTop: `1px dashed ${$('--border')}`,
                  borderRadius: '0 0 12px 12px',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${$('--text-secondary')} 10%, transparent)`)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                Click again to collapse
              </div>
            </div>
          )}

          <style>{`
            .account-card:hover {
              transform: translateY(-1px);
              box-shadow: 0 2px 8px rgb(0,0,0,0.12);
            }
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
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
        {onEdit && (
          <DropdownItem icon={<Pencil size={14} />} onClick={onEdit}>
            Edit Account
          </DropdownItem>
        )}
        {onRefreshToken && providerConfig?.can_refresh_token && (
          <DropdownItem
            icon={
              isRefreshing ? (
                <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
              ) : refreshStatus === 'success' ? (
                <CheckCircle size={14} style={{ color: $('--success') }} />
              ) : refreshStatus === 'error' ? (
                <XCircle size={14} style={{ color: $('--error') }} />
              ) : (
                <Key size={14} />
              )
            }
            onClick={() => handleRefreshToken()}
            disabled={isRefreshing}
          >
            {isRefreshing
              ? 'Refreshing Token…'
              : refreshStatus === 'success'
                ? 'Token Refreshed!'
                : refreshStatus === 'error'
                  ? 'Retry Refresh Token'
                  : 'Refresh Token'}
          </DropdownItem>
        )}
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