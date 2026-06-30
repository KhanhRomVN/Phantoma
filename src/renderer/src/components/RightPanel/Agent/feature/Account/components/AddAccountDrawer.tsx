import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { Loader2, X, AlertCircle, ShieldCheck } from "lucide-react";
import { useSettings } from "../../../context/SettingsContext";
import { getFaviconUrl } from "../utils";
import { Drawer, DrawerHeader, DrawerBody, DrawerFooter } from '@renderer/components/ui/Drawer';
import { Button } from '@renderer/components/ui/Button';
import { cn } from '@renderer/shared/lib/utils';

interface Provider {
  provider_id: string;
  provider_name: string;
  website: string;
  icon?: string;
  is_enabled?: boolean;
  auth_methods?: string[];
  platform?: string;
  connection_type?: string;
  auth_method?: string;
}

interface AddAccountDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// List row card
const ProviderRow: React.FC<{
  provider: Provider;
  onSelect: (method: "basic" | "cdp") => void;
  onContextMenu: (e: React.MouseEvent, provider: Provider) => void;
  loading: boolean;
}> = ({ provider, onSelect, onContextMenu, loading }) => {
  const [imgError, setImgError] = useState(false);
  const [hovered, setHovered] = useState(false);
  const iconUrl = getFaviconUrl(provider.website);
  const disabled = provider.is_enabled === false || loading;

  const connectionType = provider.connection_type || "https";
  const platform = provider.platform || "web";
  const authMethod =
    provider.auth_method ||
    (provider.auth_methods && provider.auth_methods.length > 0
      ? provider.auth_methods[0]
      : null);

  const connectionBadgeBg =
    connectionType === "browser"
      ? "bg-[rgba(251,146,60,0.12)]"
      : "bg-[rgba(34,197,94,0.1)]";
  const connectionBadgeText =
    connectionType === "browser"
      ? "text-[var(--vscode-editorWarning-foreground,#f97316)]"
      : "text-[var(--vscode-testing-iconPassed,#22c55e)]";

  const handleClick = () => {
    if (disabled) return;
    onSelect("basic");
  };

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    onContextMenu(e, provider);
  };

  return (
    <div
      onClick={handleClick}
      onContextMenu={handleRightClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-[10px] transition-all duration-[0.13s] ease-in-out border border-border',
        hovered && !disabled
          ? 'bg-card-hover cursor-pointer opacity-100'
          : 'bg-[var(--secondary-bg)]',
        disabled
          ? 'cursor-not-allowed opacity-45'
          : 'cursor-pointer opacity-100'
      )}
    >
      <div className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center overflow-hidden shrink-0 bg-[rgba(128,128,128,0.1)]">
        {iconUrl && !imgError ? (
          <img
            src={iconUrl}
            alt={provider.provider_name}
            className="w-[22px] h-[22px] object-contain"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="text-[13px] font-bold opacity-70 text-[var(--vscode-foreground)]">
            {provider.provider_name.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-semibold overflow-hidden text-ellipsis whitespace-nowrap text-text-primary">
            {provider.provider_name}
          </span>
          <span className={cn('text-[9px] font-semibold px-[7px] py-0.5 rounded-[5px] shrink-0 uppercase tracking-[0.04em]', connectionBadgeBg, connectionBadgeText)}>
            {connectionType}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-[3px]">
          <span className="text-[11px] opacity-70 text-text-secondary">{platform}</span>
          {authMethod && (
            <>
              <span className="text-[10px] opacity-40 text-text-secondary">·</span>
              <span className="text-[11px] opacity-70 text-text-secondary">{authMethod}</span>
            </>
          )}
          {provider.is_enabled === false && (
            <span className="text-[9px] px-[5px] py-px rounded ml-0.5 bg-[rgba(128,128,128,0.15)] text-text-secondary">Soon</span>
          )}
        </div>
      </div>

      {!disabled && (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-40 shrink-0 text-text-secondary">
          <path d="m9 18 6-6-6-6" />
        </svg>
      )}
    </div>
  );
};

const AddAccountDrawer: React.FC<AddAccountDrawerProps> = ({ open, onOpenChange, onSuccess }) => {
  const { apiUrl } = useSettings();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [error, setError] = useState("");

  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingAccount, setPendingAccount] = useState<any>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [showEmailDrawer, setShowEmailDrawer] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [pendingBrowserProvider, setPendingBrowserProvider] = useState<Provider | null>(null);
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [tempSessionId, setTempSessionId] = useState<string | null>(null);

  const [contextMenu, setContextMenu] = useState<{ provider: Provider; x: number; y: number } | null>(null);

  useEffect(() => {
    if (!open) {
      setError("");
      setShowConfirm(false);
      setPendingAccount(null);
      return;
    }
    fetchProviders();
  }, [open]);

  const fetchProviders = async () => {
    setLoadingProviders(true);
    try {
      const response = await fetch(`${apiUrl}/v1/providers`);
      const data = await response.json();
      if (data.success && data.data) {
        const sorted = [...data.data].sort((a: Provider, b: Provider) => {
          if (a.is_enabled === b.is_enabled) return 0;
          return a.is_enabled ? -1 : 1;
        });
        setProviders(sorted);
      }
    } catch {
      setError("Failed to load providers");
    } finally {
      setLoadingProviders(false);
    }
  };

  useEffect(() => {
    if (!contextMenu) return;
    const closeMenu = () => setContextMenu(null);
    document.addEventListener("click", closeMenu);
    return () => document.removeEventListener("click", closeMenu);
  }, [contextMenu]);

  const handleLogin = async (provider: Provider, loginMethod: "basic" | "cdp" = "basic") => {
    if (!provider || provider.is_enabled === false) return;
    setLoading(true);
    setError("");
    setContextMenu(null);
    try {
      const response = await fetch(`${apiUrl}/v1/accounts/login/${provider.provider_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: loginMethod }),
      });
      const data = await response.json();
      if (data.success && data.account) {
        if (data.account.pending && data.account.tempSessionId) {
          setPendingBrowserProvider(provider);
          setTempSessionId(data.account.tempSessionId);
          setShowEmailDrawer(true);
        } else if (provider.connection_type === "browser" && data.account.credential) {
          const saveResponse = await fetch(`${apiUrl}/v1/accounts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: data.account.id || crypto.randomUUID(),
              provider_id: data.account.provider_id,
              email: data.account.email || "",
              credential: data.account.credential,
            }),
          });
          const saveData = await saveResponse.json();
          if (saveData.success) {
            onSuccess();
            onOpenChange(false);
          } else {
            setError(saveData.message || "Failed to save account");
          }
        } else {
          setPendingAccount(data.account);
          setShowConfirm(true);
        }
      } else {
        setError(data.message || "Login failed");
      }
    } catch (err: any) {
      if (provider.connection_type === "browser") {
        setPendingBrowserProvider(provider);
        setShowEmailDrawer(true);
      } else {
        setError(err.message || "An error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAccount = async () => {
    if (!pendingAccount) return;
    setConfirmLoading(true);
    try {
      const response = await fetch(`${apiUrl}/v1/accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: pendingAccount.id || crypto.randomUUID(),
          provider_id: pendingAccount.provider_id,
          email: pendingAccount.email,
          credential: pendingAccount.credential,
        }),
      });
      const data = await response.json();
      if (data.success) {
        onSuccess();
        onOpenChange(false);
      } else {
        setError(data.message || "Failed to save account");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleEmailSubmit = async () => {
    if (!pendingBrowserProvider || !emailInput.trim()) return;
    setEmailSubmitting(true);
    try {
      let response;
      if (tempSessionId) {
        response = await fetch(`${apiUrl}/v1/browser-sessions/complete/${tempSessionId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailInput.trim() }),
        });
      } else {
        const loginResponse = await fetch(`${apiUrl}/v1/accounts/login/${pendingBrowserProvider.provider_id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ method: "basic" }),
        });
        const loginData = await loginResponse.json();
        response = await fetch(`${apiUrl}/v1/accounts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: crypto.randomUUID(),
            provider_id: pendingBrowserProvider.provider_id,
            email: emailInput.trim(),
            credential: loginData.success && loginData.account ? loginData.account.credential : "",
          }),
        });
      }
      const data = await response.json();
      if (data.success) {
        onSuccess();
        onOpenChange(false);
      } else {
        setError(data.message || "Failed to save account");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setEmailSubmitting(false);
      setShowEmailDrawer(false);
      setPendingBrowserProvider(null);
      setEmailInput("");
      setTempSessionId(null);
    }
  };

  // ── Email input view ──────────────────────────────────────────────────────
  if (showEmailDrawer && pendingBrowserProvider) {
    return (
      <Drawer isOpen={open} onClose={() => onOpenChange(false)} height="auto" strategy="absolute">
        <DrawerHeader
          title="Enter Email"
          description="Browser closed. Please enter your email to continue."
          onClose={() => {
            setShowEmailDrawer(false);
            setPendingBrowserProvider(null);
            setEmailInput("");
          }}
        />
        <DrawerBody>
          <div>
            <label className="text-[11px] font-medium block mb-[5px] text-text-secondary">Email Address</label>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-[11px] py-[9px] rounded-[9px] text-[13px] outline-none box-border bg-[rgb(var(--input-background))] border border-border text-text-primary"
              autoFocus
            />
          </div>
          {error && (
            <div className="mt-3 rounded-lg px-2.5 py-2 text-xs flex items-center gap-1.5 bg-[var(--vscode-inputValidation-errorBackground,rgba(239,68,68,0.08))] text-[var(--vscode-errorForeground)]">
              <AlertCircle size={12} />
              <span>{error}</span>
            </div>
          )}
        </DrawerBody>
        <DrawerFooter>
          <Button variant="outline" size="sm" fullWidth onClick={() => { setShowEmailDrawer(false); setPendingBrowserProvider(null); setEmailInput(""); }}>
            Cancel
          </Button>
          <Button variant="solid" size="sm" className="flex-[2]" disabled={emailSubmitting || !emailInput.trim()} onClick={handleEmailSubmit}>
            {emailSubmitting && <Loader2 size={13} style={{ animation: "aaSpin 1s linear infinite" }} />}
            {emailSubmitting ? "Saving…" : "Save Account"}
          </Button>
        </DrawerFooter>
      </Drawer>
    );
  }

  // ── Confirmation view ──────────────────────────────────────────────────────
  if (showConfirm && pendingAccount) {
    return (
      <Drawer isOpen={open} onClose={() => onOpenChange(false)} height="auto" strategy="absolute">
        <DrawerHeader
          title="Confirm Account"
          description="Review captured details"
          onClose={() => { setShowConfirm(false); setPendingAccount(null); }}
        />
        <DrawerBody>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-[11px] font-medium block mb-[5px] text-text-secondary">Email / Identifier</label>
              <input
                type="email"
                value={pendingAccount.email || ""}
                onChange={(e) => setPendingAccount({ ...pendingAccount, email: e.target.value })}
                className="w-full px-[11px] py-[9px] rounded-[9px] text-[13px] outline-none box-border bg-[rgb(var(--input-background))] border border-border text-text-primary"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium block mb-[5px] text-text-secondary">Credential / Token</label>
              <input
                type="text"
                value={pendingAccount.credential ? `${pendingAccount.credential.substring(0, 10)}...${pendingAccount.credential.slice(-5)}` : "N/A"}
                readOnly
                className="w-full px-[11px] py-[9px] rounded-[9px] text-xs font-mono outline-none box-border bg-[rgb(var(--input-background))] border border-border text-text-secondary"
              />
            </div>
            {error && (
              <div className="rounded-lg px-2.5 py-2 text-xs flex items-center gap-1.5 bg-[var(--vscode-inputValidation-errorBackground,rgba(239,68,68,0.08))] text-[var(--vscode-errorForeground)]">
                <AlertCircle size={12} />
                <span>{error}</span>
              </div>
            )}
          </div>
        </DrawerBody>
        <DrawerFooter>
          <Button variant="outline" size="sm" fullWidth onClick={() => { setShowConfirm(false); setPendingAccount(null); }}>
            Back
          </Button>
          <Button variant="solid" size="sm" className="flex-[2]" disabled={confirmLoading || !pendingAccount.email} onClick={handleConfirmAccount}>
            {confirmLoading && <Loader2 size={13} style={{ animation: "aaSpin 1s linear infinite" }} />}
            {confirmLoading ? "Adding…" : "Confirm & Add"}
          </Button>
        </DrawerFooter>
      </Drawer>
    );
  }

  // ── Main provider selection view ───────────────────────────────────────────
  return (
    <Drawer isOpen={open} onClose={() => onOpenChange(false)} height="70%" strategy="absolute">
      <DrawerHeader
        title="Add Account"
        description="Choose a provider to continue"
        onClose={() => onOpenChange(false)}
      />
      <DrawerBody>
        {loadingProviders ? (
          <div className="h-[120px] flex flex-col items-center justify-center gap-2.5 text-text-secondary">
            <Loader2 size={24} className="text-[var(--vscode-foreground)]" style={{ animation: "aaSpin 1s linear infinite" }} />
            <span className="text-xs">Loading providers…</span>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {providers.map((p) => (
              <ProviderRow
                key={p.provider_id}
                provider={p}
                onSelect={(method) => handleLogin(p, method)}
                onContextMenu={(e, provider) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ provider, x: e.clientX, y: e.clientY }); }}
                loading={loading}
              />
            ))}
          </div>
        )}

        {contextMenu && ReactDOM.createPortal(
          <div className="fixed rounded-[10px] overflow-hidden z-[99999] min-w-[200px] bg-[rgb(var(--card-background))] border border-border shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => handleLogin(contextMenu.provider, "basic")}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 border-none bg-transparent text-xs cursor-pointer text-left text-text-primary border-b border-border"
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--hover-bg)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <span className="text-sm">🌐</span>
              <div><div className="font-semibold">MITM Login</div><div className="text-[10px] opacity-60">Dễ bị ban, nhanh hơn</div></div>
            </button>
            <button onClick={() => handleLogin(contextMenu.provider, "cdp")}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 border-none bg-transparent text-xs cursor-pointer text-left text-text-primary"
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--hover-bg)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <span className="text-sm">🛡️</span>
              <div><div className="font-semibold">CDP Login</div><div className="text-[10px] opacity-60">Khó bị ban, chậm hơn</div></div>
            </button>
          </div>,
          document.body,
        )}

        {error && (
          <div className="mt-2.5 rounded-lg px-2.5 py-2 text-xs flex items-center gap-1.5 bg-[var(--vscode-inputValidation-errorBackground,rgba(239,68,68,0.08))] text-[var(--vscode-errorForeground)]">
            <AlertCircle size={12} />
            <span>{error}</span>
          </div>
        )}
      </DrawerBody>

      {loading && (
        <div className="flex items-center justify-center gap-2 px-4 pt-2.5 pb-4 text-xs shrink-0 text-text-secondary">
          <Loader2 size={14} style={{ animation: "aaSpin 1s linear infinite" }} />
          Logging in…
        </div>
      )}
    </Drawer>
  );
};

export default AddAccountDrawer;