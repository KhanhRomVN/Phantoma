import React, { useState } from "react";
import { $ } from '@renderer/utils/color';
import { Loader2, X, AlertCircle, Search, Globe, Key } from "lucide-react";
import { getFaviconUrl } from "@renderer/shared/utils/faviconUtils";
import { sharedBackdrop, sharedSheet } from "./AddAccountShared";
import {
  AUTH_LABELS,
  ICON_METHODS,
  authIconFile,
  splitAuthMethod,
  type Provider,
} from "./addAccount.utils";

const ProviderRow: React.FC<{
  provider: Provider;
  onSelect: () => void;
  loading: boolean;
}> = ({ provider, onSelect, loading }) => {
  // ── State ──
  const [imgError, setImgError] = useState(false);
  const [hovered, setHovered] = useState(false);

  // ── Derived ──
  const iconUrl = getFaviconUrl(provider.website_url || provider.website);
  const disabled = provider.is_enabled === false || loading;

  const connectionType = provider.connection_type || "https";

  // Parse auth_methods: handle both string and array formats
  const parseAuthMethods = (raw: any): string[] => {
    if (!raw) return [];
    if (Array.isArray(raw))
      return raw.filter((m: any) => typeof m === "string" && m.length > 0);
    if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (!trimmed) return [];
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed))
          return parsed.filter(
            (m: any) => typeof m === "string" && m.length > 0,
          );
      } catch {
        // not JSON — split by common separators
        return trimmed
          .split(/[,;|\s]+/)
          .map((m) => m.trim())
          .filter((m) => m.length > 0);
      }
    }
    return [];
  };

  const authMethods = parseAuthMethods(
    provider.auth_method ?? provider.auth_methods,
  );

  const connectionBadgeColor =
    connectionType === "browser"
      ? {
          bg: "rgba(251,146,60,0.12)",
          color: $('--warn'),
        }
      : {
          bg: "rgba(34,197,94,0.1)",
          color: $('--success'),
        };

  // Connection icon
  const ConnectionIcon = connectionType === "browser" ? Globe : Globe;

  // Auth method icon rendering
  const renderAuthIcon = (method: string) => {
    if (!method) return null;

    if (ICON_METHODS.includes(method)) {
      const baseUri = ((window as any).__zenImagesUri as string | undefined) || "/images";
      const src = baseUri
        ? `${baseUri}/auth_icons/${authIconFile(method)}`
        : undefined;

      if (!src) {
        console.warn(
          "[AddAccountModal] window.__zenImagesUri is not available — cannot load auth icon for",
          method,
        );
        return <Key size={11} />;
      }

      return (
        <img
          src={src}
          alt={method}
          style={{ width: "11px", height: "11px", objectFit: "contain" }}
          onLoad={() => {}}
          onError={(e) => {
            console.error(
              `[AddAccountModal] ❌ auth icon FAILED to load: ${src}`,
              "img element:",
              e.currentTarget,
            );
          }}
        />
      );
    }

    // Basic auth uses lucide icon
    return <Key size={11} />;
  };

  // ── Handlers ──
  const handleClick = () => {
    if (disabled) return;
    onSelect();
  };

  // ── Render ──
  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "10px 12px",
        borderRadius: "10px",
        backgroundColor:
          hovered && !disabled
            ? `color-mix(in srgb, ${$('--text-secondary')} 7%, transparent)`
            : $('--input-background'),
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        transition: "all 0.13s ease",
      }}
    >
      {/* Favicon badge */}
      <div
        style={{
          width: "38px",
          height: "38px",
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        {iconUrl && !imgError ? (
          <img
            src={iconUrl}
            alt={provider.provider_name}
            style={{ width: "22px", height: "22px", objectFit: "contain" }}
            onError={() => {
              console.error(
                "[AddAccountModal] favicon failed",
                provider.provider_id,
                iconUrl,
              );
              setImgError(true);
            }}
          />
        ) : (
          <span
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: $('--text-primary'),
              opacity: 0.7,
            }}
          >
            {provider.provider_name.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>

      {/* Text info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Row 1: provider_name + connection_type badge (bên phải) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
          }}
        >
          <span
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: $('--text-primary'),
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {provider.provider_name}
          </span>
          <span
            style={{
              fontSize: "9px",
              fontWeight: 600,
              padding: "2px 5px",
              borderRadius: "4px",
              backgroundColor: connectionBadgeColor.bg,
              color: connectionBadgeColor.color,
              flexShrink: 0,
              textTransform: "uppercase",
              letterSpacing: "0.03em",
              display: "flex",
              alignItems: "center",
              gap: "3px",
            }}
          >
            <ConnectionIcon size={9} />
            {connectionType}
          </span>
        </div>

        {/* Row 2: description (truncate nếu quá dài) */}
        {provider.description && (
          <div
            style={{
              fontSize: "11px",
              color: $('--text-secondary'),
              marginTop: "4px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {provider.description}
          </div>
        )}

        {/* Row 3: auth_method badges (bên trái) + website_url (bên phải) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "5px",
            gap: "8px",
          }}
        >
          {/* Auth method badges */}
          {authMethods.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              {authMethods.map((method) => (
                <div
                  key={method}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "10px",
                    color: $('--text-secondary'),
                  }}
                >
                  {splitAuthMethod(method).map((part) => (
                    <React.Fragment key={part}>
                      {renderAuthIcon(part)}
                    </React.Fragment>
                  ))}
                  <span>
                    {splitAuthMethod(method)
                      .map((part) => AUTH_LABELS[part] ?? part)
                      .join(" · ")}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Website URL - text only, not clickable */}
          {provider.website_url && (
            <span
              style={{
                fontSize: "10px",
                color: $('--text-secondary'),
                flexShrink: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: "140px",
              }}
            >
              {provider.website_url.replace(/^https?:\/\//, "")}
            </span>
          )}

          {provider.is_enabled === false && (
            <span
              style={{
                fontSize: "9px",
                padding: "1px 5px",
                borderRadius: "4px",
                backgroundColor: "rgba(128,128,128,0.15)",
                color: $('--text-secondary'),
                marginLeft: "auto",
              }}
            >
              Soon
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export const ProviderListModal: React.FC<{
  searchQuery: string;
  onSearchChange: (value: string) => void;
  loadingProviders: boolean;
  filteredProviders: Provider[];
  loading: boolean;
  error: string;
  onSelectProvider: (provider: Provider) => void;
  onClose: () => void;
  onCancelLogin: () => void;
}> = ({
  searchQuery,
  onSearchChange,
  loadingProviders,
  filteredProviders,
  loading,
  error,
  onSelectProvider,
  onClose,
  onCancelLogin,
}) => {
  return (
    <>
      {sharedBackdrop(() => onClose())}
      {sharedSheet(
        <>
          {/* Header */}
          <div
            style={{
              padding: "12px 16px 12px",
              borderBottom: `1px solid ${$('--border')}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "17px",
                  fontWeight: 700,
                  color: $('--text-primary'),
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                Add Account
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: $('--text-secondary'),
                  opacity: 0.7,
                  marginTop: "3px",
                }}
              >
                Choose a provider to continue
              </div>
            </div>
            <button
              onClick={() => onClose()}
              style={{
                padding: "6px",
                borderRadius: "4px",
                border: "none",
                background: "transparent",
                color: $('--text-secondary'),
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(244, 67, 54, 0.15)";
                e.currentTarget.style.color = "#f44336";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = $('--text-secondary');
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Search */}
          <div
            style={{
              position: "relative",
              padding: "12px 16px 0 16px",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: "26px",
                top: "12px",
                height: "34px",
                display: "flex",
                alignItems: "center",
                pointerEvents: "none",
              }}
            >
              <Search
                size={14}
                style={{
                  color:
                    $('--text-secondary'),
                }}
              />
            </div>
            <input
              autoFocus
              type="text"
              placeholder="Search providers..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 32px",
                fontSize: "13px",
                backgroundColor: $('--input-background'),
                border: "none",
                borderRadius: "8px",
                color: $('--text-primary'),
                outline: "none",
                boxSizing: "border-box",
                height: "34px",
              }}
            />
          </div>

          {/* Provider list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "10px 16px" }}>
            {loadingProviders ? (
              <div
                style={{
                  height: "120px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  color: $('--text-secondary'),
                }}
              >
                <Loader2
                  size={24}
                  style={{
                    animation: "aaSpin 1s linear infinite",
                    color: $('--text-primary'),
                  }}
                />
                <span style={{ fontSize: "12px" }}>Loading providers…</span>
              </div>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: "6px" }}
              >
                {filteredProviders.map((p) => (
                  <ProviderRow
                    key={p.provider_id}
                    provider={p}
                    onSelect={() => onSelectProvider(p)}
                    loading={loading}
                  />
                ))}
                {filteredProviders.length === 0 && (
                  <div
                    style={{
                      textAlign: "center",
                      color: $('--text-secondary'),
                      padding: "20px",
                      fontSize: "12px",
                    }}
                  >
                    No providers found
                  </div>
                )}
              </div>
            )}

            {error && (
              <div
                style={{
                  marginTop: "10px",
                  backgroundColor:
                    `color-mix(in srgb, ${$('--error')} 8%, transparent)`,
                  borderRadius: "8px",
                  padding: "8px 10px",
                  fontSize: "12px",
                  color: $('--error'),
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <AlertCircle size={12} />
                <span>{error}</span>
              </div>
            )}
          </div>

          {loading && (
            <div
              style={{
                padding: "10px 16px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                color: $('--text-secondary'),
                fontSize: "12px",
                flexShrink: 0,
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <Loader2
                  size={14}
                  style={{ animation: "aaSpin 1s linear infinite" }}
                />
                Logging in…
              </div>
              <button
                onClick={() => {
                  onCancelLogin();
                }}
                style={{
                  padding: "5px 10px",
                  borderRadius: "6px",
                  backgroundColor: "rgba(128,128,128,0.1)",
                  border: "none",
                  color: $('--text-secondary'),
                  fontSize: "11px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </>,
      )}
      <style>{`
        @keyframes aaSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes aaFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes aaSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
};
