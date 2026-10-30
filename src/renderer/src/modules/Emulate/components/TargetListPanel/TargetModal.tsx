/**
 * ------------------------------------------------------------------
 * TargetModal
 * ------------------------------------------------------------------
 * Modal THÊM / SỬA target cho mọi platform (web/pc/android/cli).
 * Luồng: chọn platform (PlatformPicker) -> form cấu hình riêng của
 * từng platform. Nút Cancel ở form sẽ quay lại bước chọn platform.
 * Kích thước modal cố định theo % viewport, nội dung cuộn bên trong.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import React, {
  useRef,
  useCallback,
  useState,
  useEffect,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@renderer/components/ui/Modal';
import { Button } from '@renderer/components/ui/Button';
import { Search, Smartphone, Monitor, Loader2, RefreshCw, Check, Bug, Folder } from 'lucide-react';
import type { AppPlatform, AppMode, DiscoveredApp } from '../../types/apps';
import { PLATFORMS } from '../../constants/platforms';
import { cn } from '@renderer/shared/utils/cn';
import { useAccentColors } from '@renderer/shared/hooks/useAccentColors';
import { runtimeApi } from '../../services/runtime-api.service';
import { User } from 'lucide-react';
import {
  listChromiumProfiles,
  getChromeProfileDirs,
} from '@renderer/components/RightPanel/Zen/services/chromeProfiles';

// ─── Shared Types ───────────────────────────────────────────────────────
export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (app: {
    name: string;
    url?: string;
    executablePath?: string;
    mode: AppMode;
    platform: AppPlatform;
    icon?: string;
    emulatorSerial?: string;
    packageName?: string;
    // ASSUMED: cấu hình mở rộng của từng platform, truyền qua một object duy nhất
    config?: Record<string, unknown>;
  }) => void | Promise<void>;
  existingApps?: {
    id?: string;
    name?: string;
    url?: string;
    executablePath?: string;
    emulatorSerial?: string;
    packageName?: string;
  }[];
  editApp?: { id: string; name: string; url?: string; executablePath?: string } | null;
  onEdit?: (id: string, data: { name: string; url?: string; executablePath?: string }) => void;
  onCanSubmitChange?: (value: boolean) => void;
}

interface TargetModalProps {
  isOpen: boolean;
  platform?: AppPlatform | null;
  onClose: () => void;
  onAdd: BaseModalProps['onAdd'];
  existingApps?: BaseModalProps['existingApps'];
  editApp?: BaseModalProps['editApp'];
  onEdit?: BaseModalProps['onEdit'];
}

interface BodyRef {
  submit: () => Promise<void>;
  canSubmit: boolean;
}

type FormProps = Pick<
  BaseModalProps,
  'isOpen' | 'onAdd' | 'existingApps' | 'editApp' | 'onEdit' | 'onCanSubmitChange'
>;

interface Device {
  name: string;
  serial: string;
  type: 'physical' | 'vm' | 'running-vm';
}

type FaviconStatus = 'idle' | 'loading' | 'success' | 'error';

// ─── Shared Styles ──────────────────────────────────────────────────────
const INPUT =
  'w-full bg-input-background border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/50 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none transition-colors';
const FORM_SCROLL = 'flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-6';

const PLATFORM_RGB: Record<AppPlatform, string> = {
  web: '14, 165, 233',
  pc: '139, 92, 246',
  android: '16, 185, 129',
  cli: '245, 158, 11',
};

// ─── Shared Helpers ─────────────────────────────────────────────────────
/** Thêm https:// nếu URL người dùng nhập chưa có protocol. */
const withProtocol = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /^https?:[/][/]/i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const checkImage = (src: string): Promise<boolean> =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });

const pickFolder = async (): Promise<string | null> => {
  try {
    const result = await (window as any).electron.ipcRenderer.invoke('dialog:select-paths', {
      kind: 'folder',
    });
    return result?.success && result?.paths?.[0] ? result.paths[0] : null;
  } catch (error) {
    console.error('[TargetModal] Select folder failed:', error);
    return null;
  }
};

const useFavicon = (url: string) => {
  const [status, setStatus] = useState<FaviconStatus>('idle');
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!url.trim()) {
      setStatus('idle');
      setSrc(null);
      return;
    }
    let mounted = true;
    setStatus('loading');

    const run = async () => {
      try {
        const hostname = new URL(withProtocol(url)).hostname;
        const candidates = [
          `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`,
          `https://${hostname}/favicon.ico`,
          `https://${hostname}/favicon.png`,
        ];
        for (const candidate of candidates) {
          const ok = await checkImage(candidate);
          if (!mounted) return;
          if (ok) {
            setSrc(candidate);
            setStatus('success');
            return;
          }
        }
        if (mounted) setStatus('error');
      } catch {
        if (mounted) setStatus('error');
      }
    };

    const timer = setTimeout(run, 400);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [url]);

  return { status, src, markError: () => setStatus('error') };
};

// ─── Shared UI ──────────────────────────────────────────────────────────

const Field: React.FC<{
  label: string;
  optional?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}> = ({ label, optional, hint, error, children }) => (
  <div>
    <label className="block text-xs font-semibold text-text-secondary mb-1.5">
      {label}
      {optional && <span className="font-normal text-text-secondary/60"> (optional)</span>}
    </label>
    {children}
    {error ? (
      <p className="text-xs text-error mt-1.5">{error}</p>
    ) : hint ? (
      <p className="text-[11px] text-text-secondary/70 mt-1.5">{hint}</p>
    ) : null}
  </div>
);

const Toggle: React.FC<{
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
}> = ({ checked, onChange, label, description }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className="flex w-full items-center justify-between gap-4 rounded-lg bg-input-background px-3 py-2.5 text-left outline-none transition-colors hover:bg-dropdown-item-hover/60"
  >
    <span className="min-w-0">
      <span className="block text-sm font-medium text-text-primary">{label}</span>
      {description && (
        <span className="mt-0.5 block text-xs text-text-secondary">{description}</span>
      )}
    </span>
    <span
      className={cn(
        'relative h-5 w-9 shrink-0 rounded-full transition-colors',
        checked ? 'bg-primary' : 'bg-border',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all',
          checked ? 'left-[18px]' : 'left-0.5',
        )}
      />
    </span>
  </button>
);

const FaviconBox: React.FC<{
  status: FaviconStatus;
  src: string | null;
  onError: () => void;
}> = ({ status, src, onError }) => (
  <div
    className={cn(
      'w-10 h-10 shrink-0 rounded-lg flex items-center justify-center border border-dashed transition-all bg-input-background',
      status === 'idle' && 'border-border',
      status === 'loading' && 'border-border animate-pulse',
      status === 'success' && 'border-success',
      status === 'error' && 'border-error',
    )}
  >
    {status === 'loading' && (
      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    )}
    {status === 'success' && src && (
      <img src={src} alt="Favicon" className="w-6 h-6 object-contain" onError={onError} />
    )}
    {status === 'error' && <Bug className="w-5 h-5 text-error" />}
    {status === 'idle' && <div className="w-6 h-6 rounded bg-border/30" />}
  </div>
);

const FolderInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}> = ({ value, onChange, placeholder }) => (
  <div className="flex items-center gap-2">
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(INPUT, 'flex-1 font-mono')}
    />
    <Button
      variant="soft"
      title="Choose folder"
      className="h-[42px] w-[42px] shrink-0 px-0 py-0"
      onClick={async () => {
        const folder = await pickFolder();
        if (folder) onChange(folder);
      }}
    >
      <Folder className="w-4 h-4 text-text-secondary" />
    </Button>
  </div>
);

// ─── Platform Picker ────────────────────────────────────────────────────
const PlatformPicker: React.FC<{ onSelect: (platform: AppPlatform) => void }> = ({ onSelect }) => (
  <div className="flex-1 min-h-0 overflow-y-auto p-6">
    <div className="flex flex-col gap-3">
      {(Object.keys(PLATFORMS) as AppPlatform[]).map((pid) => {
        const meta = PLATFORMS[pid];
        const Icon = meta.icon;
        const rgb = PLATFORM_RGB[pid];
        return (
          <button
            key={pid}
            type="button"
            onClick={() => onSelect(pid)}
            className="group relative flex flex-row items-center gap-4 overflow-hidden rounded-lg bg-input-background px-4 py-3 text-left outline-none transition-all duration-200 hover:-translate-y-0.5"
          >
            <span
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{
                background: `radial-gradient(120% 120% at 0% 0%, rgba(${rgb}, 0.18), transparent 60%)`,
              }}
            />
            <span
              className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-border/40 text-text-secondary transition-colors duration-200 group-hover:bg-[rgba(var(--platform-rgb),0.14)] group-hover:text-[rgb(var(--platform-rgb))]"
              style={{ '--platform-rgb': rgb } as React.CSSProperties}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="relative block min-w-0 flex-1">
              <span className="block text-base font-semibold text-text-primary">{meta.label}</span>
              <span className="mt-0.5 block text-xs text-text-secondary">{meta.description}</span>
            </span>
          </button>
        );
      })}
    </div>
  </div>
);

// ─── Profile Select ─────────────────────────────────────────────────────
interface BrowserProfile {
  email: string;
  path: string;
  avatar?: string;
}

// ASSUMED: AvatarUI chưa tồn tại trong codebase nên dùng avatar cục bộ (ảnh profile, fallback icon User)
const ProfileAvatar: React.FC<{ src?: string }> = ({ src }) => {
  const [failed, setFailed] = useState(false);
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-border/40 text-text-secondary">
      {src && !failed ? (
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <User className="h-4 w-4" />
      )}
    </div>
  );
};

const ProfileCardContent: React.FC<{ profile: BrowserProfile }> = ({ profile }) => (
  <>
    <ProfileAvatar src={profile.avatar} />
    <div className="min-w-0 flex-1 text-left">
      <div className="truncate text-[13px] font-semibold text-text-primary">{profile.email}</div>
      <div className="truncate font-mono text-[11px] text-text-secondary">{profile.path}</div>
    </div>
  </>
);

const PROFILE_CARD =
  'flex min-w-0 items-center gap-3 rounded-xl border p-3 text-left outline-none transition-all';
const PROFILE_CARD_SELECTED = 'rounded-l-none border-transparent border-l-2 bg-input-background';

const PROFILE_COLORS = [
  '#0ea5e9',
  '#a78bfa',
  '#34d399',
  '#fbbf24',
  '#f87171',
  '#f472b6',
  '#2dd4bf',
  '#fb923c',
];
const getProfileColor = (index: number) => PROFILE_COLORS[index % PROFILE_COLORS.length];
const PROFILE_CARD_IDLE = 'border-border/40 bg-input-background hover:bg-dropdown-item-hover/60';

const EMAIL_REGEX = /[^\s<>()]+@[^\s<>()]+\.[^\s<>()]+/;

// ASSUMED: Emulate không lưu chromium-profile-dir, luôn dùng thư mục profile mặc định của Chrome
export const ProfileSelect: React.FC<{ value: string; onChange: (path: string) => void }> = ({
  value,
  onChange,
}) => {
  const [profiles, setProfiles] = useState<BrowserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    // ASSUMED: path rỗng = Chrome mặc định; resolve ra đường dẫn tuyệt đối để emulate-server dùng làm --user-data-dir
    const resolveBase = getChromeProfileDirs()
      .then((dirs) => dirs[0]?.path || '')
      .catch(() => '');
    Promise.all([listChromiumProfiles(''), resolveBase])
      .then(([result, baseDir]) => {
        if (!mounted) return;
        const entries: { folder: string; label?: string; avatar?: string }[] =
          result.profiles.length > 0 ? result.profiles : result.folders.map((f) => ({ folder: f }));
        setProfiles(
          entries.map((p) => ({
            email: p.label?.match(EMAIL_REGEX)?.[0] || p.label || p.folder,
            path: baseDir ? `${baseDir}/${p.folder}` : p.folder,
            avatar: p.avatar,
          })),
        );
      })
      .catch((error) => console.error('[TargetModal] Load profiles failed:', error))
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange('')}
          className={cn(PROFILE_CARD, !value ? PROFILE_CARD_SELECTED : PROFILE_CARD_IDLE)}
          style={!value ? { borderLeftColor: getProfileColor(0) } : undefined}
        >
          <ProfileAvatar />
          <div className="min-w-0 flex-1 text-left">
            <div className="truncate text-[13px] font-semibold text-text-primary">No Profile</div>
            <div className="truncate text-[11px] text-text-secondary">Clean temporary session</div>
          </div>
        </button>
        {profiles.map((profile, index) => (
          <button
            key={profile.path}
            type="button"
            onClick={() => onChange(profile.path)}
            style={
              profile.path === value ? { borderLeftColor: getProfileColor(index + 1) } : undefined
            }
            className={cn(
              PROFILE_CARD,
              profile.path === value ? PROFILE_CARD_SELECTED : PROFILE_CARD_IDLE,
            )}
          >
            <ProfileCardContent profile={profile} />
          </button>
        ))}
      </div>
      {loading && (
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading profiles...
        </div>
      )}
    </div>
  );
};

// ─── Website Form ───────────────────────────────────────────────────────
const WebsiteForm = forwardRef<BodyRef, FormProps>(function WebsiteForm(
  { isOpen, onAdd, existingApps = [], editApp, onEdit, onCanSubmitChange },
  ref,
) {
  const isEdit = !!editApp;
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [profilePath, setProfilePath] = useState('');
  const profileMode: 'none' | 'profile' = profilePath ? 'profile' : 'none';
  const favicon = useFavicon(url);

  const duplicateError = useMemo(() => {
    const appsToCheck =
      isEdit && editApp ? existingApps.filter((app) => app.id !== editApp.id) : existingApps;
    const error: { name?: string; value?: string } = {};
    if (name) {
      const found = appsToCheck.find((app) => app.name?.toLowerCase() === name.toLowerCase());
      if (found) error.name = `Name '${found.name}' already exists`;
    }
    if (url) {
      const found = appsToCheck.find((app) => app.url?.toLowerCase() === url.toLowerCase());
      if (found) error.value = `URL '${found.url}' already exists`;
    }
    return error;
  }, [name, url, existingApps, isEdit, editApp]);

  useEffect(() => {
    if (!isOpen) return;
    setName(editApp?.name || '');
    setUrl(editApp?.url || '');
    setProfilePath('');
  }, [isOpen, editApp]);

  const handleSubmit = async () => {
    if (isEdit && editApp && onEdit) {
      onEdit(editApp.id, { name, url });
      return;
    }
    if (!name || !url) return;
    try {
      await onAdd({
        name,
        url,
        mode: 'intercept',
        platform: 'web',
        config: {
          profileMode,
          profilePath: profileMode === 'profile' ? profilePath : undefined,
          ignoreCertErrors: true,
        },
      });
    } catch (error) {
      console.error('[Website] Add target failed:', error);
    }
  };

  const canSubmit =
    !!(name && url) &&
    !duplicateError.name &&
    !duplicateError.value &&
    (isEdit || profileMode === 'none' || !!profilePath.trim());

  useImperativeHandle(ref, () => ({ submit: handleSubmit, canSubmit }), [handleSubmit, canSubmit]);

  useEffect(() => {
    onCanSubmitChange?.(canSubmit);
  }, [canSubmit, onCanSubmitChange]);

  return (
    <div className={FORM_SCROLL}>
      <div className="space-y-3">
        <Field label="Name" error={duplicateError.name}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Google"
            className={cn(INPUT, duplicateError.name && 'border-error')}
          />
        </Field>
        <Field label="URL" error={duplicateError.value}>
          <div className="flex items-center gap-2">
            <FaviconBox status={favicon.status} src={favicon.src} onError={favicon.markError} />
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className={cn(INPUT, 'flex-1 font-mono', duplicateError.value && 'border-error')}
            />
          </div>
        </Field>
      </div>

      {!isEdit && (
        <Field label="Browser session">
          <ProfileSelect value={profilePath} onChange={setProfilePath} />
        </Field>
      )}
    </div>
  );
});

// ─── Android Form ───────────────────────────────────────────────────────
const DEVICE_LABEL: Record<Device['type'], string> = {
  physical: 'Physical',
  'running-vm': 'Running VM',
  vm: 'Stopped VM',
};

const AndroidForm = forwardRef<BodyRef, FormProps>(function AndroidForm(
  { isOpen, onAdd, existingApps = [], onCanSubmitChange },
  ref,
) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [packageName, setPackageName] = useState('');
  const [installCa, setInstallCa] = useState(true);
  const [clearData, setClearData] = useState(false);

  const loadDevices = async () => {
    setLoading(true);
    try {
      const [vmsRes, connectedRes] = await Promise.all([
        runtimeApi.mobileListGenymotionVms(),
        runtimeApi.mobileDetectEmulators(),
      ]);
      const vms = (vmsRes.data as string[]) || [];
      const connected = (connectedRes.data as any[]) || [];

      const list: Device[] = [];
      connected.forEach((dev: any) => {
        list.push({
          name: dev.name || dev.serial,
          serial: dev.serial,
          type: dev.type === 'physical' ? 'physical' : 'running-vm',
        });
      });
      vms.forEach((vm: string) => {
        if (!connected.some((d: any) => d.name === vm || d.id === vm)) {
          list.push({ name: vm, serial: vm, type: 'vm' });
        }
      });
      setDevices(list);
    } catch (e) {
      console.error('Failed to load devices:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setDevices([]);
      setSearchQuery('');
      setSelectedDevice(null);
      return;
    }
    setPackageName('');
    setInstallCa(true);
    setClearData(false);
    loadDevices();
  }, [isOpen]);

  const filteredDevices = useMemo(() => {
    if (!searchQuery) return devices;
    const q = searchQuery.toLowerCase();
    return devices.filter(
      (d) => d.name.toLowerCase().includes(q) || d.serial.toLowerCase().includes(q),
    );
  }, [devices, searchQuery]);

  const isExistingSerial = (serial: string) =>
    existingApps.some((app) => app.emulatorSerial?.toLowerCase() === serial.toLowerCase());

  const duplicateError =
    selectedDevice && isExistingSerial(selectedDevice.serial)
      ? `Device '${selectedDevice.name}' (${selectedDevice.serial}) already exists`
      : null;

  const handleSubmit = async () => {
    if (!selectedDevice || duplicateError) return;
    try {
      await onAdd({
        name: selectedDevice.name,
        platform: 'android',
        mode: 'intercept',
        emulatorSerial: selectedDevice.serial,
        packageName: packageName.trim() || undefined,
        config: { installCaCert: installCa, clearAppData: clearData },
      });
    } catch (error) {
      console.error('[Android] Add target failed:', error);
    }
  };

  const canSubmit = !!selectedDevice && !duplicateError;

  useImperativeHandle(ref, () => ({ submit: handleSubmit, canSubmit }), [handleSubmit, canSubmit]);

  useEffect(() => {
    onCanSubmitChange?.(canSubmit);
  }, [canSubmit, onCanSubmitChange]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 gap-2 px-6 pb-3 pt-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="Search device by name or serial..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(INPUT, 'pl-9')}
          />
        </div>
        <Button
          variant="soft"
          disabled={loading}
          onClick={loadDevices}
          title="Rescan devices"
          className="h-[42px] w-[42px] shrink-0 px-0 py-0"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6">
        {loading && devices.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-text-secondary">Scanning devices...</p>
          </div>
        ) : filteredDevices.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-text-secondary">
            <Smartphone className="h-12 w-12 text-text-secondary/30" />
            <p className="mt-2 text-sm">No device found</p>
            <p className="text-xs text-text-secondary/60">
              Start a Genymotion VM or connect an Android device
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 pb-3">
            {filteredDevices.map((device) => {
              const isSelected = selectedDevice?.serial === device.serial;
              const isExisting = isExistingSerial(device.serial);
              const Icon = device.type === 'physical' ? Smartphone : Monitor;
              return (
                <button
                  key={device.serial}
                  type="button"
                  disabled={isExisting}
                  onClick={() => setSelectedDevice(device)}
                  className={cn(
                    'relative flex items-center gap-3 rounded-xl border p-3 text-left outline-none transition-all',
                    isSelected
                      ? 'border-primary/40 bg-primary/10'
                      : isExisting
                        ? 'cursor-not-allowed border-border/40 bg-dropdown-item-hover/40 opacity-50'
                        : 'border-border/40 bg-input-background hover:bg-dropdown-item-hover/60',
                  )}
                >
                  <div
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                      device.type === 'physical' ? 'bg-green/10' : 'bg-blue/10',
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-4 w-4',
                        device.type === 'physical' ? 'text-green' : 'text-blue',
                      )}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold text-text-primary">
                      {device.name}
                    </div>
                    <div className="truncate font-mono text-[10px] text-text-secondary">
                      {device.serial}
                    </div>
                    <div className="mt-0.5 text-[10px] text-text-secondary/60">
                      {DEVICE_LABEL[device.type]}
                    </div>
                  </div>
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  {isExisting && (
                    <span className="shrink-0 text-[10px] text-text-secondary">Added</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {duplicateError && (
        <div className="shrink-0 px-6 pb-3">
          <div className="rounded-lg border border-error/20 bg-error/10 p-2 text-sm text-error">
            {duplicateError}
          </div>
        </div>
      )}

      <div className="shrink-0 space-y-3 border-t border-divider px-6 py-4">
        <Field label="Package name" optional hint="Launch this app once the session starts">
          <input
            type="text"
            value={packageName}
            onChange={(e) => setPackageName(e.target.value)}
            placeholder="com.example.app"
            className={cn(INPUT, 'font-mono')}
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Toggle
            checked={installCa}
            onChange={setInstallCa}
            label="Install CA certificate"
            description="Needed to decrypt HTTPS"
          />
          <Toggle
            checked={clearData}
            onChange={setClearData}
            label="Clear app data"
            description="Fresh state on each start"
          />
        </div>
      </div>
    </div>
  );
});

// ─── PC Form ────────────────────────────────────────────────────────────
const getExec = (app: DiscoveredApp): string | undefined => app.exec ?? app.executablePath;

const PCForm = forwardRef<BodyRef, FormProps>(function PCForm(
  { isOpen, onAdd, existingApps = [], onCanSubmitChange },
  ref,
) {
  const [discoveredApps, setDiscoveredApps] = useState<DiscoveredApp[]>([]);
  const [selectedPcApp, setSelectedPcApp] = useState<DiscoveredApp | null>(null);
  const [pcLoading, setPcLoading] = useState(false);
  const [pcSearch, setPcSearch] = useState('');
  const { getColorByIndex, toRgba } = useAccentColors();

  const getAppAccent = (name: string): string => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash << 5) - hash + name.charCodeAt(i);
      hash |= 0;
    }
    return getColorByIndex(Math.abs(hash));
  };

  const isExistingApp = useCallback(
    (app: DiscoveredApp) => {
      const exec = getExec(app)?.toLowerCase();
      return existingApps.some(
        (existing) =>
          (!!exec && existing.executablePath?.toLowerCase() === exec) ||
          existing.name?.toLowerCase() === app.name?.toLowerCase(),
      );
    },
    [existingApps],
  );

  const loadPcApps = async () => {
    setPcLoading(true);
    try {
      const apps = await (window as any).electron.ipcRenderer.invoke('app:list-installed');
      setDiscoveredApps(apps || []);
    } catch (e) {
      console.error('[PC] Error loading apps:', e);
      setDiscoveredApps([]);
    } finally {
      setPcLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setSelectedPcApp(null);
    setPcSearch('');
    loadPcApps();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && discoveredApps.length > 0 && !selectedPcApp) {
      setSelectedPcApp(discoveredApps.find((app) => !isExistingApp(app)) ?? null);
    }
  }, [discoveredApps, isOpen]);

  const filteredPcApps = useMemo(() => {
    if (!pcSearch) return discoveredApps;
    const l = pcSearch.toLowerCase();
    return discoveredApps.filter(
      (a) => a.name.toLowerCase().includes(l) || a.description?.toLowerCase().includes(l),
    );
  }, [discoveredApps, pcSearch]);

  const handleSubmit = async () => {
    if (!selectedPcApp) return;
    try {
      await onAdd({
        name: selectedPcApp.name,
        executablePath: getExec(selectedPcApp),
        platform: 'pc',
        mode: 'intercept',
        icon: selectedPcApp.icon,
      });
    } catch (error) {
      console.error('[PC] Add target failed:', error);
    }
  };

  const canSubmit = !!selectedPcApp && !isExistingApp(selectedPcApp);

  useImperativeHandle(ref, () => ({ submit: handleSubmit, canSubmit }), [handleSubmit, canSubmit]);

  useEffect(() => {
    onCanSubmitChange?.(canSubmit);
  }, [canSubmit, onCanSubmitChange]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-col">
        <div className="flex shrink-0 gap-2 px-6 pb-3 pt-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              placeholder="Search apps..."
              value={pcSearch}
              onChange={(e) => setPcSearch(e.target.value)}
              className={cn(INPUT, 'pl-9')}
            />
          </div>
          <Button
            variant="soft"
            title="Rescan apps"
            onClick={loadPcApps}
            className="h-[42px] w-[42px] shrink-0 px-0 py-0"
          >
            <RefreshCw className={cn('h-4 w-4 text-text-secondary', pcLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-3">
        {pcLoading && !discoveredApps.length ? (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-text-secondary">Scanning installed apps...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filteredPcApps.map((app) => {
              const exec = getExec(app);
              const isExisting = isExistingApp(app);
              const isSelected =
                selectedPcApp?.name === app.name && getExec(selectedPcApp) === exec;
              const accent = getAppAccent(app.name);
              return (
                <button
                  key={`${app.name}-${exec}`}
                  type="button"
                  disabled={isExisting}
                  onClick={() => setSelectedPcApp(app)}
                  style={
                    isSelected && !isExisting
                      ? { borderLeftColor: accent, backgroundColor: toRgba(accent, 0.1) }
                      : undefined
                  }
                  className={cn(
                    'flex min-w-0 items-center gap-3 rounded-xl border p-3 text-left outline-none transition-all',
                    isSelected && !isExisting
                      ? 'rounded-l-none border-transparent border-l-2'
                      : isExisting
                        ? 'cursor-not-allowed border-border/30 bg-input-background/50 opacity-50'
                        : 'border-border/40 bg-input-background hover:bg-dropdown-item-hover/60',
                  )}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-dropdown-item-hover">
                    {app.icon ? (
                      <img
                        src={`media://${app.icon}`}
                        alt={app.name}
                        className="h-8 w-8 object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <Monitor className="h-4 w-4 text-text-secondary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold text-text-primary">
                      {app.name}
                      {isExisting && (
                        <span className="ml-2 text-[10px] font-normal text-text-secondary">
                          (added)
                        </span>
                      )}
                    </div>
                    <div className="truncate text-[10px] text-text-secondary">
                      {app.description || 'System Application'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

// ─── CLI Form ───────────────────────────────────────────────────────────
const CLIForm = forwardRef<BodyRef, FormProps>(function CLIForm(
  { isOpen, onAdd, existingApps = [], editApp, onEdit, onCanSubmitChange },
  ref,
) {
  const isEdit = !!editApp;
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [command, setCommand] = useState('');
  const [workingDir, setWorkingDir] = useState('');
  const favicon = useFavicon(url);

  const isUrlInvalid = useMemo(() => {
    if (!url.trim()) return false;
    try {
      new URL(withProtocol(url));
      return false;
    } catch {
      return true;
    }
  }, [url]);

  const duplicateError = useMemo(() => {
    const appsToCheck =
      isEdit && editApp ? existingApps.filter((app) => app.id !== editApp.id) : existingApps;
    const error: { name?: string; value?: string } = {};
    if (name && command) {
      const byName = appsToCheck.find((app) => app.name?.toLowerCase() === name.toLowerCase());
      const byCommand = appsToCheck.find(
        (app) => app.executablePath?.toLowerCase() === command.toLowerCase(),
      );
      if (byName) error.name = `Name '${byName.name}' already exists`;
      if (byCommand) error.value = `Command '${byCommand.executablePath}' already exists`;
    }
    return error;
  }, [name, command, existingApps, isEdit, editApp]);

  useEffect(() => {
    if (!isOpen) return;
    setName(editApp?.name || '');
    setUrl(editApp?.url || '');
    setCommand(editApp?.executablePath || '');
    setWorkingDir('');
  }, [isOpen, editApp]);

  const handleSubmit = async () => {
    const normalizedUrl = withProtocol(url);
    if (isEdit && editApp && onEdit) {
      // url rỗng ('') để cho phép xóa URL đã lưu (toUpdateDTO bỏ qua undefined)
      onEdit(editApp.id, { name, executablePath: command, url: normalizedUrl });
      return;
    }
    if (!name || !command) return;
    try {
      await onAdd({
        name,
        executablePath: command,
        url: normalizedUrl || undefined,
        mode: 'intercept',
        platform: 'cli',
        config: {
          workingDir: workingDir.trim() || undefined,
        },
      });
    } catch (error) {
      console.error('[CLI] Add target failed:', error);
    }
  };

  const canSubmit =
    !!(name && command) && !duplicateError.name && !duplicateError.value && !isUrlInvalid;

  useImperativeHandle(ref, () => ({ submit: handleSubmit, canSubmit }), [handleSubmit, canSubmit]);

  useEffect(() => {
    onCanSubmitChange?.(canSubmit);
  }, [canSubmit, onCanSubmitChange]);

  return (
    <div className={FORM_SCROLL}>
      <div className="space-y-4">
        <Field label="Name" error={duplicateError.name}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. My Node API"
            className={cn(INPUT, duplicateError.name && 'border-error')}
          />
        </Field>
        <Field
          label="URL"
          optional
          error={isUrlInvalid ? 'Invalid URL' : undefined}
          hint="Used to display the favicon for this CLI target"
        >
          <div className="flex items-center gap-2">
            <FaviconBox status={favicon.status} src={favicon.src} onError={favicon.markError} />
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className={cn(INPUT, 'flex-1 font-mono', isUrlInvalid && 'border-error')}
            />
          </div>
        </Field>
        <Field
          label="Command"
          error={duplicateError.value}
          hint="The command will be proxied through the MITM proxy for traffic inspection"
        >
          <textarea
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="e.g. node server.js --port 3000"
            rows={3}
            className={cn(INPUT, 'resize-none font-mono', duplicateError.value && 'border-error')}
          />
        </Field>
        {!isEdit && (
          <Field label="Working directory" optional>
            <FolderInput
              value={workingDir}
              onChange={setWorkingDir}
              placeholder="/path/to/project"
            />
          </Field>
        )}
      </div>
    </div>
  );
});

// ─── Platform config ────────────────────────────────────────────────────
const PLATFORM_CONFIG: Partial<
  Record<
    AppPlatform,
    { title: string; description: string; isEditTitle?: string; isEditDesc?: string }
  >
> = {
  web: {
    title: 'Add Website',
    description: 'Configure your website target',
    isEditTitle: 'Edit Website',
    isEditDesc: 'Update target details',
  },
  pc: { title: 'Add App', description: 'Configure your app target' },
  cli: {
    title: 'Add CLI Command',
    description: 'Configure your CLI target',
    isEditTitle: 'Edit CLI Command',
    isEditDesc: 'Update target details',
  },
  android: {
    title: 'Add Android Device',
    description: 'Pick a device and configure the session',
  },
};

// Kích thước cố định theo % viewport, không phụ thuộc nội dung bên trong.
const MODAL_SIZE: Record<'select' | AppPlatform, string> = {
  select: '!w-[34%] !h-auto',
  web: '!w-[40%] !h-[74%]',
  pc: '!w-[40%] !h-[74%]',
  android: '!w-[54%] !h-[76%]',
  cli: '!w-[39%] !h-[62%]',
};

const CANCEL_CLASS =
  'bg-button-soft-background text-text-secondary hover:bg-button-soft-background/80 hover:text-text-primary active:bg-button-soft-background/70 disabled:hover:bg-button-soft-background';

// ─── Main Modal ─────────────────────────────────────────────────────────
export const TargetModal: React.FC<TargetModalProps> = ({
  isOpen,
  platform = null,
  onClose,
  onAdd,
  existingApps,
  editApp,
  onEdit,
}) => {
  const bodyRef = useRef<BodyRef>(null);
  const [step, setStep] = useState<AppPlatform | null>(platform);
  const [canSubmit, setCanSubmit] = useState(false);

  const isEdit = !!editApp;
  const config = step ? PLATFORM_CONFIG[step] : undefined;
  const title = !step
    ? 'Add Target'
    : isEdit
      ? config?.isEditTitle || config?.title || 'Edit Target'
      : config?.title || 'Add Target';
  const description = !step
    ? 'Choose a platform'
    : isEdit
      ? config?.isEditDesc || config?.description || ''
      : config?.description || '';

  useEffect(() => {
    if (isOpen) setStep(platform);
    setCanSubmit(false);
  }, [isOpen, platform]);

  const handleSubmit = useCallback(async () => {
    if (bodyRef.current) {
      await bodyRef.current.submit();
      onClose();
    }
  }, [onClose]);

  const handleCancel = useCallback(() => {
    if (step && !isEdit) {
      setStep(null);
      setCanSubmit(false);
      return;
    }
    onClose();
  }, [step, isEdit, onClose]);

  const renderBody = () => {
    const common = {
      isOpen,
      onAdd,
      existingApps,
      editApp,
      onEdit,
      onCanSubmitChange: setCanSubmit,
    };
    switch (step) {
      case 'web':
        return <WebsiteForm ref={bodyRef} {...common} />;
      case 'android':
        return <AndroidForm ref={bodyRef} {...common} />;
      case 'pc':
        return <PCForm ref={bodyRef} {...common} />;
      case 'cli':
        return <CLIForm ref={bodyRef} {...common} />;
      default:
        return <PlatformPicker onSelect={setStep} />;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className={cn('!max-w-none !max-h-none overflow-hidden', MODAL_SIZE[step ?? 'select'])}
    >
      <ModalHeader title={title} description={description} onClose={onClose} />
      <ModalBody className="flex min-h-0 flex-col !overflow-hidden !p-0">{renderBody()}</ModalBody>
      {step && (
        <ModalFooter>
          <Button onClick={handleCancel} className={CANCEL_CLASS}>
            Cancel
          </Button>
          <Button variant="soft" onClick={handleSubmit} disabled={!canSubmit}>
            {isEdit ? 'Save Changes' : 'Add Target'}
          </Button>
        </ModalFooter>
      )}
    </Modal>
  );
};

// Backward-compatible alias để không phá vỡ các import cũ nếu còn.
export const AddTargetModal = TargetModal;
export default TargetModal;
