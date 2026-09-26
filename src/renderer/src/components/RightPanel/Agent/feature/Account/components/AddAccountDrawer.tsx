import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  Loader2,
  X,
  AlertCircle,
  Search,
  Globe,
  Key,
  KeyRound,
  ExternalLink,
  ChevronLeft,
  UserX,
} from 'lucide-react';
import { useDbFetch } from '../../../services/useDbFetch';
import { useActiveDatabaseManagerName } from '../../../hooks/useActiveDatabaseManagerName';
import { useSettings } from '../../../context/SettingsContext';
import { extensionService, messageDispatcher } from '../../../services/ExtensionService';
import { getFaviconUrl } from '../utils';
import { CopyableText } from '../utils';

interface Provider {
  provider_id: string;
  provider_name: string;
  description?: string;
  color?: string;
  website: string;
  website_url?: string;
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

/** Parse auth methods: handle both string and array formats. */
const parseAuthMethods = (raw: any): string[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((m: any) => typeof m === 'string' && m.length > 0);
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed))
        return parsed.filter((m: any) => typeof m === 'string' && m.length > 0);
    } catch {
      return trimmed
        .split(/[,;|\s]+/)
        .map((m) => m.trim())
        .filter((m) => m.length > 0);
    }
  }
  return [];
};

const MethodCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  desc: string;
  onClick: () => void;
  disabled?: boolean;
}> = ({ icon, label, desc, onClick, disabled }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={() => {
        if (!disabled) onClick();
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '12px 14px',
        borderRadius: '10px',
        backgroundColor: hovered && !disabled ? 'rgba(128,128,128,0.07)' : 'var(--input-bg)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'all 0.13s ease',
        border: 'none',
      }}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '9px',
          backgroundColor: 'rgba(128,128,128,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: 'var(--text-primary)',
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', opacity: 0.7 }}>
          {desc}
        </div>
      </div>
      <ChevronLeft
        size={15}
        style={{ color: 'var(--text-secondary)', transform: 'rotate(180deg)', opacity: 0.5, flexShrink: 0 }}
      />
    </div>
  );
};

const ProviderRow: React.FC<{
  provider: Provider;
  onSelect: () => void;
  onContextMenu: (e: React.MouseEvent, provider: Provider) => void;
  loading: boolean;
}> = ({ provider, onSelect, onContextMenu, loading }) => {
  const [imgError, setImgError] = useState(false);
  const [hovered, setHovered] = useState(false);

  const iconUrl = getFaviconUrl(provider.website_url || provider.website);
  const disabled = provider.is_enabled === false || loading;
  const connectionType = provider.connection_type || 'https';
  const authMethods = parseAuthMethods(provider.auth_method ?? provider.auth_methods);

  const connectionBadgeColor =
    connectionType === 'browser'
      ? { bg: 'rgba(251,146,60,0.12)', color: '#f97316' }
      : { bg: 'rgba(34,197,94,0.1)', color: '#22c55e' };

  return (
    <div
      onClick={() => !disabled && onSelect()}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) onContextMenu(e, provider);
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 12px',
        borderRadius: '10px',
        backgroundColor: hovered && !disabled ? 'rgba(128,128,128,0.07)' : 'var(--input-bg)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'all 0.13s ease',
      }}
    >
      <div
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {iconUrl && !imgError ? (
          <img
            src={iconUrl}
            alt={provider.provider_name}
            style={{ width: '22px', height: '22px', objectFit: 'contain' }}
            onError={() => setImgError(true)}
          />
        ) : (
          <span style={{ fontSize: '13px', fontWeight: 700, opacity: 0.7 }}>
            {provider.provider_name.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <span
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {provider.provider_name}
          </span>
          <span
            style={{
              fontSize: '9px',
              fontWeight: 600,
              padding: '2px 5px',
              borderRadius: '4px',
              backgroundColor: connectionBadgeColor.bg,
              color: connectionBadgeColor.color,
              flexShrink: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
            }}
          >
            <Globe size={9} />
            {connectionType}
          </span>
        </div>

        {provider.description && (
          <div
            style={{
              fontSize: '11px',
              color: 'var(--text-secondary)',
              marginTop: '4px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {provider.description}
          </div>
        )}

        {authMethods.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '5px', flexWrap: 'wrap' }}>
            {authMethods.map((method) => (
              <div
                key={method}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-secondary)' }}
              >
                <Key size={11} />
                <span>{method}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ProviderFavicon: React.FC<{ provider: Provider; size?: number }> = ({ provider, size = 20 }) => {
  const [imgError, setImgError] = useState(false);
  const iconUrl = getFaviconUrl(provider.website_url || provider.website);
  if (!iconUrl || imgError) return null;
  return (
    <img
      src={iconUrl}
      alt={provider.provider_name}
      style={{ width: `${size}px`, height: `${size}px`, borderRadius: '4px', objectFit: 'contain', flexShrink: 0 }}
      onError={() => setImgError(true)}
    />
  );
};

const ProfileCard: React.FC<{
  badge: React.ReactNode;
  badgeBg: string;
  badgeColor: string;
  label: string;
  desc?: string;
  onClick: () => void;
  disabled?: boolean;
}> = ({ badge, badgeBg, badgeColor, label, desc, onClick, disabled }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={() => {
        if (!disabled) onClick();
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '12px 14px',
        borderRadius: '10px',
        backgroundColor: hovered && !disabled ? 'rgba(128,128,128,0.07)' : 'var(--input-bg)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'all 0.13s ease',
        border: 'none',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '9px',
          backgroundColor: badgeBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: badgeColor,
        }}
      >
        {badge}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </div>
        {desc && (
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', opacity: 0.7 }}>
            {desc}
          </div>
        )}
      </div>
      <ChevronLeft
        size={15}
        style={{ color: 'var(--text-secondary)', transform: 'rotate(180deg)', opacity: 0.5, flexShrink: 0 }}
      />
    </div>
  );
};

const ProfilePicker: React.FC<{
  folders: string[];
  loading: boolean;
  error: string;
  disabled: boolean;
  baseDir?: string;
  onSelect: (folder?: string) => void;
}> = ({ folders, loading, error, disabled, baseDir, onSelect }) => {
  const [query, setQuery] = useState('');

  const shortPath = (folder: string) => {
    const parent = (baseDir || '').split(/[\\/]+/).filter(Boolean).pop();
    return parent ? `…/${parent}/${folder}` : `…/${folder}`;
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? folders.filter((f) => f.toLowerCase().includes(q)) : folders;
  }, [folders, query]);

  const getTone = (folder: string) => {
    const first = folder.trim().charAt(0).toUpperCase();
    const hue = ((first.charCodeAt(0) || 0) * 47) % 360;
    return { first: first || '?', bg: `hsla(${hue}, 70%, 55%, 0.15)`, color: `hsl(${hue}, 70%, 55%)` };
  };

  return (
    <>
      <div style={{ padding: '10px 16px', flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          <Search
            size={14}
            style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }}
          />
          <input
            autoFocus
            type="text"
            placeholder="Search profiles..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 32px',
              fontSize: '13px',
              backgroundColor: 'var(--input-bg)',
              border: 'none',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              outline: 'none',
              boxSizing: 'border-box',
              height: '34px',
            }}
          />
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 16px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <ProfileCard
          badge={<UserX size={18} />}
          badgeBg="rgba(59,130,246,0.12)"
          badgeColor="#3b82f6"
          label="No profile"
          desc="Login as default with a fresh browser window"
          onClick={() => onSelect()}
          disabled={disabled}
        />

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', color: 'var(--text-secondary)', fontSize: '12px' }}>
            <Loader2 size={14} style={{ animation: 'aaSpin 1s linear infinite' }} />
            Loading profiles…
          </div>
        )}

        {!loading && error && (
          <div style={{ backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: '8px', padding: '8px 10px', fontSize: '12px', color: 'var(--vscode-errorForeground)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={12} />
            <span>{error}</span>
          </div>
        )}

        {!loading &&
          !error &&
          filtered.map((folder) => {
            const tone = getTone(folder);
            return (
              <ProfileCard
                key={folder}
                badge={<span style={{ fontSize: '14px', fontWeight: 700 }}>{tone.first}</span>}
                badgeBg={tone.bg}
                badgeColor={tone.color}
                label={folder}
                desc={shortPath(folder)}
                onClick={() => onSelect(folder)}
                disabled={disabled}
              />
            );
          })}

        {!loading && !error && filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '12px', fontSize: '12px' }}>
            {query.trim() ? 'No matching profiles' : 'No available profiles'}
          </div>
        )}
      </div>
    </>
  );
};

const AddAccountDrawer: React.FC<AddAccountDrawerProps> = ({ open, onOpenChange, onSuccess }) => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);

  const [deviceCodeInfo, setDeviceCodeInfo] = useState<{
    user_code: string;
    verification_url: string;
    pollContext: string;
    poll_interval: number;
    provider: Provider;
  } | null>(null);

  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingAccount, setPendingAccount] = useState<any>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [showEmailDrawer, setShowEmailDrawer] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [pendingBrowserProvider, setPendingBrowserProvider] = useState<Provider | null>(null);
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [tempSessionId, setTempSessionId] = useState<string | null>(null);

  const [contextMenu, setContextMenu] = useState<{ provider: Provider; x: number; y: number } | null>(null);

  const [profileStepProvider, setProfileStepProvider] = useState<Provider | null>(null);
  const [profileFolders, setProfileFolders] = useState<string[]>([]);
  const [existingEmails, setExistingEmails] = useState<Set<string>>(new Set());
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [profilesError, setProfilesError] = useState('');
  const profileReqRef = useRef(0);

  const dbFetch = useDbFetch();
  const activeDbName = useActiveDatabaseManagerName();
  const { chromiumProfileDir } = useSettings();

  const sharedBackdrop = (onClickBackdrop: () => void) => (
    <div
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 200, animation: 'aaFadeIn 0.15s ease' }}
      onClick={onClickBackdrop}
    />
  );

  const sharedSheet = (children: React.ReactNode, height: string = '50%') => (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgb(var(--card-background))',
        borderTop: '1px solid var(--border)',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.25)',
        zIndex: 201,
        height,
        display: 'flex',
        flexDirection: 'column',
        animation: 'aaSlideUp 0.22s ease',
      }}
    >
      {children}
    </div>
  );

  const fetchProviders = async () => {
    setLoadingProviders(true);
    try {
      const response = await dbFetch(`/v1/providers`);
      const data = await response.json();
      if (data.success && data.data) {
        const sorted = [...data.data].sort((a: Provider, b: Provider) => {
          if (a.is_enabled === b.is_enabled) return 0;
          return a.is_enabled ? -1 : 1;
        });
        setProviders(sorted);
      }
    } catch {
      setError('Failed to load providers');
    } finally {
      setLoadingProviders(false);
    }
  };

  const handlePickMethod = (provider: Provider) => {
    const reqToken = ++profileReqRef.current;
    setSelectedProvider(null);
    setProfileStepProvider(provider);
    setProfileFolders([]);
    setProfilesError('');

    if (!chromiumProfileDir) {
      setProfilesLoading(false);
      setProfilesError('Chromium Profile Folder chưa được cấu hình trong Settings');
      return;
    }

    setProfilesLoading(true);
    const requestId = `listChromiumProfiles-${Date.now()}`;

    const foldersPromise = new Promise<string[]>((resolve, reject) => {
      messageDispatcher.register(
        requestId,
        (msg: any) => {
          if (msg.error) reject(new Error(msg.error));
          else resolve(Array.isArray(msg.folders) ? msg.folders : []);
        },
        8000,
        () => reject(new Error('Quét Chromium Profile Folder quá thời gian')),
      );
      extensionService.postMessage({ command: 'listChromiumProfiles', requestId, path: chromiumProfileDir });
    });

    const emailsPromise = dbFetch(
      `/v1/accounts?page=1&limit=1000&provider_id=${encodeURIComponent(provider.provider_id)}`,
    )
      .then((res) => res.json())
      .then(
        (data) =>
          new Set<string>(
            (data?.data?.accounts ?? [])
              .map((a: any) => String(a.email || '').trim().toLowerCase())
              .filter(Boolean),
          ),
      )
      .catch(() => new Set<string>());

    Promise.all([foldersPromise, emailsPromise])
      .then(([folders, emails]) => {
        if (profileReqRef.current !== reqToken) return;
        setProfileFolders(folders);
        setExistingEmails(emails);
      })
      .catch((err: any) => {
        if (profileReqRef.current !== reqToken) return;
        setProfilesError(err?.message || 'Không đọc được danh sách profile');
      })
      .finally(() => {
        if (profileReqRef.current === reqToken) setProfilesLoading(false);
      });
  };

  const handleLogin = async (
    provider: Provider,
    loginMethod: 'basic' | 'cdp' = 'basic',
    profileFolder?: string,
  ) => {
    if (!provider || provider.is_enabled === false) return;
    setLoading(true);
    setError('');
    setContextMenu(null);
    try {
      const response = await dbFetch(`/v1/accounts/login/${provider.provider_id}`, {
        method: 'POST',
        body: JSON.stringify({
          method: loginMethod,
          ...(profileFolder ? { profile_folder: profileFolder } : {}),
        }),
      });
      const data = await response.json();
      if (data.success && data.account) {
        if (data.account.pending && data.account.user_code) {
          setDeviceCodeInfo({
            user_code: data.account.user_code,
            verification_url: data.account.verification_url,
            pollContext: data.account.tempSessionId,
            poll_interval: data.account.poll_interval || 5,
            provider,
          });
          setLoading(false);
          return;
        }

        if (data.account.pending && data.account.tempSessionId) {
          setPendingBrowserProvider(provider);
          setTempSessionId(data.account.tempSessionId);
          setShowEmailDrawer(true);
        } else if (provider.connection_type === 'browser' && data.account.credential) {
          const saveResponse = await dbFetch(`/v1/accounts`, {
            method: 'POST',
            body: JSON.stringify({
              id: data.account.id || crypto.randomUUID(),
              provider_id: data.account.provider_id,
              email: data.account.email || '',
              credential: data.account.credential,
            }),
          });
          const saveData = await saveResponse.json();
          if (saveData.success) {
            onSuccess();
            onOpenChange(false);
          } else {
            setError(saveData.message || 'Failed to save account');
          }
        } else {
          setPendingAccount(data.account);
          setShowConfirm(true);
        }
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err: any) {
      if (provider.connection_type === 'browser') {
        const errorMessage = err.message || String(err);
        const isTimeout = errorMessage.toLowerCase().includes('timeout');
        if (isTimeout) {
          setError('Login timeout. Please try again.');
          setLoading(false);
        } else {
          setPendingBrowserProvider(provider);
          setShowEmailDrawer(true);
          setLoading(false);
        }
      } else {
        setError(err.message || 'An error occurred');
        setLoading(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAccount = async () => {
    if (!pendingAccount) return;
    setConfirmLoading(true);
    try {
      const response = await dbFetch(`/v1/accounts`, {
        method: 'POST',
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
        setError(data.message || 'Failed to save account');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
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
        response = await dbFetch(`/v1/browser-sessions/complete/${tempSessionId}`, {
          method: 'POST',
          body: JSON.stringify({ email: emailInput.trim() }),
        });
      } else {
        const loginResponse = await dbFetch(
          `/v1/accounts/login/${pendingBrowserProvider.provider_id}`,
          { method: 'POST', body: JSON.stringify({ method: 'basic' }) },
        );
        const loginData = await loginResponse.json();
        response = await dbFetch(`/v1/accounts`, {
          method: 'POST',
          body: JSON.stringify({
            id: crypto.randomUUID(),
            provider_id: pendingBrowserProvider.provider_id,
            email: emailInput.trim(),
            credential: loginData.success && loginData.account ? loginData.account.credential : '',
          }),
        });
      }
      const data = await response.json();
      if (data.success) {
        onSuccess();
        onOpenChange(false);
      } else {
        setError(data.message || 'Failed to save account');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setEmailSubmitting(false);
      setShowEmailDrawer(false);
      setPendingBrowserProvider(null);
      setEmailInput('');
      setTempSessionId(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) {
      setError('');
      setShowConfirm(false);
      setPendingAccount(null);
      setSearchQuery('');
      setSelectedProvider(null);
      setProfileStepProvider(null);
      setDeviceCodeInfo(null);
      return;
    }
    setSearchQuery('');
    fetchProviders();
  }, [open]);

  useEffect(() => {
    if (!contextMenu) return;
    const closeMenu = () => setContextMenu(null);
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, [contextMenu]);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!deviceCodeInfo) {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }

    const intervalMs = Math.max(deviceCodeInfo.poll_interval * 1000, 3000);
    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await dbFetch(
          `/v1/accounts/login/${deviceCodeInfo.provider.provider_id}/poll`,
          { method: 'POST', body: JSON.stringify({ pollContext: deviceCodeInfo.pollContext }) },
        );
        const data = await res.json();

        if (data.error) {
          clearInterval(pollTimerRef.current!);
          pollTimerRef.current = null;
          setDeviceCodeInfo(null);
          setError(data.error);
          return;
        }

        if (data.done && data.account) {
          clearInterval(pollTimerRef.current!);
          pollTimerRef.current = null;
          setDeviceCodeInfo(null);
          setPendingAccount({
            id: crypto.randomUUID(),
            provider_id: data.account.provider_id,
            email: data.account.email || '',
            credential: data.account.credential,
          });
          setShowConfirm(true);
        }
      } catch {
        // Network error — keep polling
      }
    }, intervalMs);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [deviceCodeInfo, dbFetch]);

  const filteredProviders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return providers.filter((p) => {
      const methods = parseAuthMethods((p as any).auth_method ?? (p as any).auth_methods);
      if (methods.length === 0) return false;
      if (!q) return true;
      return (
        (p.provider_name || '').toLowerCase().includes(q) ||
        (p.provider_id || '').toLowerCase().includes(q)
      );
    });
  }, [providers, searchQuery]);

  if (!open) return null;

  // ── Device code view ──
  if (deviceCodeInfo) {
    return (
      <>
        {sharedBackdrop(() => setDeviceCodeInfo(null))}
        {sharedSheet(
          <>
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}
            >
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Authorize in Browser
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.7, marginTop: '2px' }}>
                  {deviceCodeInfo.provider.provider_name}
                </div>
              </div>
              <button
                onClick={() => setDeviceCodeInfo(null)}
                style={{ padding: '6px', borderRadius: '4px', border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                <div
                  style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    letterSpacing: '0.15em',
                    fontFamily: 'monospace',
                    color: 'var(--text-primary)',
                    backgroundColor: 'var(--input-bg)',
                    padding: '0 16px',
                    borderRadius: '8px',
                    border: 'none',
                    height: '34px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {deviceCodeInfo.user_code}
                </div>
                <a
                  href={deviceCodeInfo.verification_url}
                  target="_blank"
                  rel="noreferrer"
                  title="Open Browser"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--input-bg)',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    flexShrink: 0,
                    textDecoration: 'none',
                  }}
                >
                  <ExternalLink size={15} />
                </a>
              </div>

              <div style={{ width: '100%', position: 'relative' }}>
                <input
                  readOnly
                  value={deviceCodeInfo.verification_url}
                  style={{
                    width: '100%',
                    padding: '8px 36px 8px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--input-bg)',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    outline: 'none',
                    boxSizing: 'border-box',
                    height: '34px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                />
                <button
                  onClick={() => navigator.clipboard.writeText(deviceCodeInfo.verification_url)}
                  title="Copy URL"
                  style={{
                    position: 'absolute',
                    right: '6px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    padding: '4px',
                    borderRadius: '4px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                <Loader2 size={14} style={{ animation: 'aaSpin 1s linear infinite' }} />
                Waiting for authorization…
              </div>

              {error && (
                <div style={{ width: '100%', backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: '8px', padding: '8px 10px', fontSize: '12px', color: 'var(--vscode-errorForeground)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={12} />
                  <span>{error}</span>
                </div>
              )}
            </div>
          </>,
          'auto',
        )}
        <style>{`
          @keyframes aaSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
          @keyframes aaFadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes aaSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </>
    );
  }

  // ── Profile selection step ──
  if (profileStepProvider && !showEmailDrawer && !showConfirm) {
    const visibleFolders = profileFolders.filter(
      (name) => !existingEmails.has(name.trim().toLowerCase()),
    );
    const backToMethods = () => {
      setSelectedProvider(profileStepProvider);
      setProfileStepProvider(null);
    };
    const startLogin = (folder?: string) => {
      const provider = profileStepProvider;
      setProfileStepProvider(null);
      handleLogin(provider, 'basic', folder);
    };

    return (
      <>
        {sharedBackdrop(() => setProfileStepProvider(null))}
        {sharedSheet(
          <>
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flexShrink: 0,
              }}
            >
              <button
                onClick={backToMethods}
                style={{ padding: '6px', borderRadius: '4px', border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}
              >
                <ChevronLeft size={16} />
              </button>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ProviderFavicon provider={profileStepProvider} />
                  <span>{profileStepProvider.provider_name}</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.7 }}>
                  Select a Chromium profile
                </div>
              </div>
            </div>

            <ProfilePicker
              folders={visibleFolders}
              loading={profilesLoading}
              error={profilesError}
              disabled={loading}
              baseDir={chromiumProfileDir}
              onSelect={startLogin}
            />
          </>,
          '50%',
        )}
        <style>{`
          @keyframes aaSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
          @keyframes aaFadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes aaSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </>
    );
  }

  // ── Method selection view ──
  if (selectedProvider && !showEmailDrawer && !showConfirm) {
    const methods = parseAuthMethods(
      (selectedProvider as any).auth_method ?? (selectedProvider as any).auth_methods,
    );

    const methodMeta: Record<string, { label: string; desc: string; icon: React.ReactNode }> = {
      google: { label: 'Google', desc: 'Sign in with your Google account via OAuth', icon: <Key size={18} /> },
      github: { label: 'GitHub', desc: 'Sign in with your GitHub account via OAuth', icon: <Key size={18} /> },
      x: { label: 'X / xAI', desc: 'Sign in via device code — browser will open automatically', icon: <Key size={18} /> },
      basic: { label: 'Basic', desc: 'Enter your email and password directly — no OAuth required', icon: <Key size={18} /> },
    };

    const iconUrl = getFaviconUrl(selectedProvider.website_url || selectedProvider.website);

    return (
      <>
        {sharedBackdrop(() => setSelectedProvider(null))}
        {sharedSheet(
          <>
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flexShrink: 0,
              }}
            >
              <button
                onClick={() => setSelectedProvider(null)}
                style={{ padding: '6px', borderRadius: '4px', border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}
              >
                <ChevronLeft size={16} />
              </button>
              {iconUrl && (
                <img
                  src={iconUrl}
                  alt={selectedProvider.provider_name}
                  style={{ width: '20px', height: '20px', borderRadius: '4px', objectFit: 'contain' }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selectedProvider.provider_name}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.7 }}>
                  Select a login method
                </div>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {methods.map((method) => {
                const meta = methodMeta[method] ?? {
                  label: method,
                  desc: `Sign in with ${method}`,
                  icon: <Key size={18} />,
                };
                return (
                  <MethodCard
                    key={method}
                    icon={meta.icon}
                    label={meta.label}
                    desc={meta.desc}
                    onClick={() => handlePickMethod(selectedProvider)}
                    disabled={loading}
                  />
                );
              })}
            </div>

            {error && (
              <div style={{ margin: '0 16px 12px', backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: '8px', padding: '8px 10px', fontSize: '12px', color: 'var(--vscode-errorForeground)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={12} />
                <span>{error}</span>
              </div>
            )}
          </>,
          '50%',
        )}
        <style>{`
          @keyframes aaSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
          @keyframes aaFadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes aaSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </>
    );
  }

  // ── Email input for browser provider ──
  if (showEmailDrawer && pendingBrowserProvider) {
    return (
      <>
        {sharedBackdrop(() => {
          setShowEmailDrawer(false);
          setPendingBrowserProvider(null);
          setEmailInput('');
          setLoading(false);
        })}
        {sharedSheet(
          <>
            <div
              style={{
                padding: '4px 16px 12px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '9px', backgroundColor: 'rgba(251,146,60,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertCircle size={16} color="#f97316" />
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Enter Email
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', opacity: 0.7 }}>
                    Browser closed. Please enter your email to continue.
                  </div>
                </div>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="your@email.com"
                  style={{
                    width: '100%',
                    padding: '9px 11px',
                    borderRadius: '9px',
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  autoFocus
                />
              </div>
              {error && (
                <div style={{ marginTop: '12px', backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: '8px', padding: '8px 10px', fontSize: '12px', color: 'var(--vscode-errorForeground)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={12} />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <div style={{ padding: '12px 16px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px', flexShrink: 0 }}>
              <button
                onClick={() => {
                  setShowEmailDrawer(false);
                  setPendingBrowserProvider(null);
                  setEmailInput('');
                  setLoading(false);
                }}
                style={{ flex: 1, padding: '9px', borderRadius: '9px', backgroundColor: 'rgba(128,128,128,0.1)', border: 'none', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleEmailSubmit}
                disabled={emailSubmitting || !emailInput.trim()}
                style={{
                  flex: 2,
                  padding: '9px',
                  borderRadius: '9px',
                  backgroundColor: 'var(--vscode-button-background)',
                  border: 'none',
                  color: 'var(--vscode-button-foreground)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: emailSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  opacity: !emailInput.trim() ? 0.5 : 1,
                }}
              >
                {emailSubmitting && <Loader2 size={13} style={{ animation: 'aaSpin 1s linear infinite' }} />}
                {emailSubmitting ? 'Saving…' : 'Save Account'}
              </button>
            </div>
          </>,
          'auto',
        )}
        <style>{`
          @keyframes aaSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
          @keyframes aaFadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes aaSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </>
    );
  }

  // ── Confirmation view ──
  if (showConfirm && pendingAccount) {
    const credValue = pendingAccount.credential || pendingAccount.user_data_dir || '';
    let credParsed: Record<string, any> | null = null;
    try {
      const raw = credValue.trim();
      if (raw.startsWith('{')) credParsed = JSON.parse(raw);
    } catch {
      /* ignore */
    }
    return (
      <>
        {sharedBackdrop(() => {
          setShowConfirm(false);
          setPendingAccount(null);
        })}
        {sharedSheet(
          <>
            <div
              style={{
                padding: '12px 16px 12px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}
            >
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Confirm Account
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', opacity: 0.7 }}>
                  Review captured details
                </div>
              </div>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setPendingAccount(null);
                }}
                style={{ padding: '6px', borderRadius: '4px', border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
                    Email / Identifier
                  </label>
                  <input
                    type="email"
                    value={pendingAccount.email || ''}
                    onChange={(e) => setPendingAccount({ ...pendingAccount, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--input-bg)',
                      border: 'none',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      height: '34px',
                    }}
                  />
                </div>

                {credValue && (
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
                      {pendingAccount.user_data_dir ? 'User Data Dir' : 'Credential / Token'}
                    </label>
                    <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {credParsed ? (
                        Object.entries(credParsed).map(([key, val]) => (
                          <div key={key} style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                              <KeyRound size={10} />
                              {key}
                            </div>
                            <CopyableText value={String(val ?? '')} monospace />
                          </div>
                        ))
                      ) : (
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                            <KeyRound size={10} />
                            {pendingAccount.user_data_dir ? 'Path' : 'Token'}
                          </div>
                          <CopyableText value={credValue} monospace />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {error && (
                  <div style={{ backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: '8px', padding: '8px 10px', fontSize: '12px', color: 'var(--vscode-errorForeground)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertCircle size={12} />
                    <span>{error}</span>
                  </div>
                )}
              </div>
            </div>

            <div style={{ padding: '12px 16px 12px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '8px', flexShrink: 0 }}>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setPendingAccount(null);
                }}
                style={{ padding: '8px 14px', borderRadius: '9px', backgroundColor: 'rgba(128,128,128,0.08)', border: 'none', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAccount}
                disabled={confirmLoading || !pendingAccount.email}
                style={{
                  padding: '8px 14px',
                  borderRadius: '9px',
                  backgroundColor: 'rgba(34,197,94,0.12)',
                  border: 'none',
                  color: 'var(--success, #22c55e)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: confirmLoading || !pendingAccount.email ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: !pendingAccount.email ? 0.5 : 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {confirmLoading && <Loader2 size={13} style={{ animation: 'aaSpin 1s linear infinite' }} />}
                {confirmLoading ? 'Adding…' : 'Confirm'}
              </button>
            </div>
          </>,
          'auto',
        )}
        <style>{`
          @keyframes aaSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
          @keyframes aaFadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes aaSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </>
    );
  }

  // ── Main provider selection view ──
  return (
    <>
      {sharedBackdrop(() => onOpenChange(false))}
      {sharedSheet(
        <>
          <div
            style={{
              padding: '12px 16px 12px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}
          >
            <div>
              <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Add Account
                {activeDbName && (
                  <span style={{ fontSize: '10px', fontWeight: 500, padding: '2px 7px', borderRadius: '4px', backgroundColor: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', whiteSpace: 'nowrap' }}>
                    {activeDbName}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', opacity: 0.7, marginTop: '3px' }}>
                Choose a provider to continue
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              style={{ padding: '6px', borderRadius: '4px', border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <X size={16} />
            </button>
          </div>

          <div style={{ position: 'relative', padding: '12px 16px 0 16px', flexShrink: 0 }}>
            <div style={{ position: 'absolute', left: '26px', top: '12px', height: '34px', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
              <Search size={14} style={{ color: 'var(--text-secondary)' }} />
            </div>
            <input
              autoFocus
              type="text"
              placeholder="Search providers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 32px',
                fontSize: '13px',
                backgroundColor: 'var(--input-bg)',
                border: 'none',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                outline: 'none',
                boxSizing: 'border-box',
                height: '34px',
              }}
            />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px' }}>
            {loadingProviders ? (
              <div style={{ height: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', color: 'var(--text-secondary)' }}>
                <Loader2 size={24} style={{ animation: 'aaSpin 1s linear infinite' }} />
                <span style={{ fontSize: '12px' }}>Loading providers…</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {filteredProviders.map((p) => (
                  <ProviderRow
                    key={p.provider_id}
                    provider={p}
                    onSelect={() => setSelectedProvider(p)}
                    onContextMenu={(e, provider) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setContextMenu({ provider, x: e.clientX, y: e.clientY });
                    }}
                    loading={loading}
                  />
                ))}
                {filteredProviders.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px', fontSize: '12px' }}>
                    No providers found
                  </div>
                )}
              </div>
            )}

            {contextMenu &&
              ReactDOM.createPortal(
                <div
                  style={{
                    position: 'fixed',
                    top: contextMenu.y,
                    left: contextMenu.x,
                    backgroundColor: 'rgb(var(--card-background))',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                    zIndex: 99999,
                    minWidth: '200px',
                    overflow: 'hidden',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => handleLogin(contextMenu.provider, 'basic')}
                    style={{ width: '100%', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px', border: 'none', backgroundColor: 'transparent', color: 'var(--text-primary)', fontSize: '12px', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--border)' }}
                  >
                    <span style={{ fontSize: '14px' }}>🌐</span>
                    <div>
                      <div style={{ fontWeight: 600 }}>MITM Login</div>
                      <div style={{ fontSize: '10px', opacity: 0.6 }}>Dễ bị ban, nhanh hơn</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleLogin(contextMenu.provider, 'cdp')}
                    style={{ width: '100%', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px', border: 'none', backgroundColor: 'transparent', color: 'var(--text-primary)', fontSize: '12px', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <span style={{ fontSize: '14px' }}>🛡️</span>
                    <div>
                      <div style={{ fontWeight: 600 }}>CDP Login</div>
                      <div style={{ fontSize: '10px', opacity: 0.6 }}>Khó bị ban, chậm hơn</div>
                    </div>
                  </button>
                </div>,
                document.body,
              )}

            {error && (
              <div style={{ marginTop: '10px', backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: '8px', padding: '8px 10px', fontSize: '12px', color: 'var(--vscode-errorForeground)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={12} />
                <span>{error}</span>
              </div>
            )}
          </div>

          {loading && (
            <div style={{ padding: '10px 16px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', color: 'var(--text-secondary)', fontSize: '12px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Loader2 size={14} style={{ animation: 'aaSpin 1s linear infinite' }} />
                Logging in…
              </div>
              <button
                onClick={() => {
                  onOpenChange(false);
                  setLoading(false);
                }}
                style={{ padding: '5px 10px', borderRadius: '6px', backgroundColor: 'rgba(128,128,128,0.1)', border: 'none', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 500, cursor: 'pointer' }}
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

export default AddAccountDrawer;