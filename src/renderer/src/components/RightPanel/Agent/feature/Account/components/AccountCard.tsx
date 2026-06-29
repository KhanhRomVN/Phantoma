import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { Trash2, RefreshCw, CheckCircle } from "lucide-react";
import { FlatAccount } from "../types";
import { CopyableText } from "../utils";
import { cn } from '@renderer/shared/lib/utils';

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
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [expanded, setExpanded] = useState(false);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuPosition({ x: e.clientX, y: e.clientY });
    setShowMenu(true);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  const handleSelectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelect();
  };

  useEffect(() => {
    if (!showMenu) return;
    const close = () => setShowMenu(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [showMenu]);

  const handleCopyAccount = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
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
      daily_requests: account.daily_requests ?? null,
      daily_tokens: account.daily_tokens ?? null,
    };
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  };

  const getProviderIcon = () => {
    if (providerConfig?.website) {
      try {
        const url = new URL(providerConfig.website);
        return `${url.origin}/favicon.ico`;
      } catch {
        return null;
      }
    }
    return null;
  };

  const providerIconUrl = getProviderIcon();

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  // Portal-based context menu
  const contextMenu = showMenu
    ? ReactDOM.createPortal(
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className="fixed rounded-[10px] overflow-hidden z-[99999] min-w-[180px] bg-[var(--tertiary-bg)] border border-[var(--border-color)] shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
          style={{
            top: menuPosition.y,
            left: menuPosition.x,
          }}
        >
          {/* Select */}
          <button
            onMouseDown={(e) => {
              e.stopPropagation();
              setShowMenu(false);
              onToggleSelect();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 border-none bg-transparent text-xs cursor-pointer text-left text-[var(--primary-text)]"
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "var(--hover-bg)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
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
            <span>{isSelected ? "Deselect" : "Select"} Account</span>
          </button>

          {/* Copy JSON */}
          <button
            onMouseDown={handleCopyAccount}
            className="w-full flex items-center gap-2 px-3 py-2 border-none bg-transparent text-xs cursor-pointer text-left text-[var(--primary-text)]"
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "var(--hover-bg)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
            </svg>
            <span>Copy as JSON</span>
          </button>

          {/* Switch */}
          {account.is_active_cli === false && (
            <button
              onMouseDown={(e) => {
                e.stopPropagation();
                setShowMenu(false);
                onSwitch();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 border-none bg-transparent text-xs cursor-pointer text-left text-[var(--primary-text)]"
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "var(--hover-bg)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "transparent")
              }
            >
              <RefreshCw size={12} />
              <span>Switch to CLI</span>
            </button>
          )}

          {/* Delete */}
          <button
            onMouseDown={(e) => {
              e.stopPropagation();
              setShowMenu(false);
              onDelete();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 border-none bg-transparent text-xs cursor-pointer text-left text-[var(--vscode-errorForeground,#f87171)]"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor =
                "var(--vscode-inputValidation-errorBackground, rgba(239,68,68,0.1))";
            }}
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            <Trash2 size={12} />
            <span>Delete Account</span>
          </button>
        </div>,
        document.body,
      )
    : null;

  return (
    <div
      className={cn(
        'account-card relative rounded-xl transition-all duration-200 ease-in-out',
        isSelected
          ? 'bg-[var(--vscode-list-activeSelectionBackground,rgba(99,102,241,0.08))] border border-[var(--vscode-focusBorder,rgba(99,102,241,0.4))]'
          : 'bg-[var(--tertiary-bg)] border border-[var(--border-color)]'
      )}
      onContextMenu={handleContextMenu}
    >
      {/* Main Card Content */}
      <div onClick={handleCardClick} className="px-3 py-2.5 cursor-pointer">
        {/* Selection checkbox */}
        {anySelected && (
          <div
            className={cn(
              'absolute left-2 top-1/2 -translate-y-1/2 w-[18px] h-[18px] rounded flex items-center justify-center cursor-pointer z-[1] shrink-0 transition-all duration-150',
              isSelected
                ? 'border border-[var(--vscode-focusBorder)] bg-[var(--vscode-list-activeSelectionBackground,rgba(99,102,241,0.2))]'
                : 'border border-[var(--border-color)] bg-[rgba(128,128,128,0.08)]'
            )}
            onClick={handleSelectClick}
          >
            {isSelected && (
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--vscode-list-activeSelectionForeground, currentColor)"
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
          className={cn(
            'flex items-center gap-2.5 transition-all duration-150',
            anySelected ? 'pl-6' : 'pl-0'
          )}
        >
          {/* Provider icon */}
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 overflow-hidden bg-[rgba(128,128,128,0.1)] text-[var(--vscode-foreground)]">
            {providerIconUrl ? (
              <img
                src={providerIconUrl}
                alt={account.provider_id}
                className="w-5 h-5 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  const parent = (e.target as HTMLImageElement).parentElement;
                  if (parent) {
                    const fallback = document.createElement("div");
                    fallback.style.cssText =
                      "width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;";
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
          <div className="flex-1 min-w-0">
            <p className="m-0 text-[13px] font-medium overflow-hidden text-ellipsis whitespace-nowrap text-[var(--primary-text)]">
              <span className="font-semibold">
                {providerConfig?.provider_name || account.provider_id}
              </span>
              <span className="mx-1 text-[var(--secondary-text)]">
                |
              </span>
              <span>{account.email || "No email"}</span>
            </p>

            {/* Daily stats */}
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {account.daily_requests !== undefined && account.daily_requests > 0 && (
                <span className="text-[9px] opacity-60 text-[var(--secondary-text)]">
                  {account.daily_requests.toLocaleString()} req today
                </span>
              )}
              {account.daily_tokens !== undefined && account.daily_tokens > 0 && (
                <span className="text-[9px] opacity-60 text-[var(--secondary-text)]">
                  •{" "}
                  {account.daily_tokens >= 1000000
                    ? (account.daily_tokens / 1000000).toFixed(1) + "M"
                    : account.daily_tokens >= 1000
                      ? (account.daily_tokens / 1000).toFixed(1) + "k"
                      : account.daily_tokens}{" "}
                  tokens
                </span>
              )}
              {account.successful_requests !== undefined &&
                account.total_requests !== undefined &&
                account.total_requests > 0 && (
                  <span
                    className={cn(
                      'text-[9px] opacity-80',
                      account.successful_requests / account.total_requests > 0.8
                        ? 'text-[var(--vscode-testing-iconPassed,#22c55e)]'
                        : 'text-[var(--vscode-editorWarning-foreground,#f97316)]'
                    )}
                  >
                    •{" "}
                    {Math.round(
                      (account.successful_requests / account.total_requests) * 100,
                    )}
                    % success rate
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
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium cursor-pointer shrink-0 bg-[var(--vscode-button-secondaryBackground,rgba(128,128,128,0.15))] border border-[var(--border-color)] text-[var(--vscode-button-secondaryForeground,var(--secondary-text))]"
            >
              <RefreshCw size={10} />
              Switch
            </button>
          )}

          {/* Active badge */}
          {account.is_active_cli === true && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium shrink-0 bg-[var(--vscode-testing-iconPassed-background,rgba(34,197,94,0.1))] border border-[var(--vscode-testing-iconPassed,rgba(34,197,94,0.3))] text-[var(--vscode-testing-iconPassed,#22c55e)]">
              <CheckCircle size={10} />
              Active
            </div>
          )}
        </div>
      </div>

      {/* Expanded detail section */}
      {expanded && (
        <div className="text-xs py-2.5 border-t border-[var(--border-color)] bg-[var(--vscode-list-hoverBackground,rgba(128,128,128,0.04))]">
          <div className="grid grid-cols-2 gap-2.5 mb-2.5 px-3">
            <div className="min-w-0">
              <div className="text-[10px] mb-0.5 text-[var(--secondary-text)]">
                Account ID
              </div>
              <CopyableText value={account.id} monospace />
            </div>

            <div className="min-w-0">
              <div className="text-[10px] mb-0.5 text-[var(--secondary-text)]">
                Credential
              </div>
              <CopyableText value={account.credential || ""} monospace />
            </div>

            {(account.usage != null || account.reset_period != null) && (
              <div>
                <div className="text-[10px] mb-0.5 text-[var(--secondary-text)]">
                  Usage
                </div>
                <div className="text-[11px] font-medium text-[var(--primary-text)]">
                  {account.usage ?? "—"}
                  {account.reset_period != null && (
                    <span className="text-[10px] ml-1 text-[var(--secondary-text)]">
                      / {account.reset_period}
                    </span>
                  )}
                </div>
              </div>
            )}

            {account.last_refreshed_at != null && (
              <div>
                <div className="text-[10px] mb-0.5 text-[var(--secondary-text)]">
                  Last Refreshed
                </div>
                <div className="text-[11px] font-medium text-[var(--primary-text)]">
                  {formatDate(account.last_refreshed_at)}
                </div>
              </div>
            )}
          </div>

          <div className="text-[10px] text-center pt-2 mx-3 opacity-60 border-t border-dashed border-[var(--border-color)] text-[var(--secondary-text)]">
            Click again to collapse
          </div>
        </div>
      )}

      {contextMenu}

      <style>{`
        .account-card:hover {
          transform: translateY(-1px);
          border-color: var(--vscode-focusBorder);
          box-shadow: 0 2px 8px rgba(0,0,0,0.12);
        }
      `}</style>
    </div>
  );
};

export default AccountCard;