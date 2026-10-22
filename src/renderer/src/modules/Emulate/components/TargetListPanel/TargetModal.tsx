/**
 * ------------------------------------------------------------------
 * TargetModal
 * ------------------------------------------------------------------
 * Modal gộp dùng để THÊM và SỬA target cho mọi platform (web/pc/
 * android/cli). File này gộp toàn bộ logic form của các platform trước
 * đây nằm rải rác trong folder AddTargetModal (index/Website/Android/
 * PC/CLI) thành một file duy nhất.
 *
 * Cấu trúc:
 * - BaseModalProps / các Ref interface
 * - WebsiteForm / AndroidForm / PCForm / CLIForm (các form con)
 * - TargetModal (modal wrapper chọn form theo platform)
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import React, {
  useRef,
  useCallback,
  useState,
  useEffect,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from 'react';

// ── UI ──
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@renderer/components/ui/Modal';
import {
  Search,
  Smartphone,
  Monitor,
  Loader2,
  RefreshCw,
  Check,
  Bug,
  Folder,
  Plus,
  Trash2,
} from 'lucide-react';

// ── Types ──
import type { AppPlatform, AppMode, DiscoveredApp } from '../../types/apps';

// ── Utils ──
import { cn } from '@renderer/shared/utils/cn';
import { runtimeApi } from '../../services/runtime-api.service';

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
  platform: AppPlatform;
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

// ─── Website Form ───────────────────────────────────────────────────────
type WebsiteBodyProps = Pick<
  BaseModalProps,
  'isOpen' | 'onAdd' | 'existingApps' | 'editApp' | 'onEdit' | 'onCanSubmitChange'
>;

interface WebsiteRef {
  submit: () => Promise<void>;
  canSubmit: boolean;
}

const WebsiteForm = forwardRef<WebsiteRef, WebsiteBodyProps>(function WebsiteForm(
  { isOpen, onAdd, existingApps = [], editApp, onEdit, onCanSubmitChange },
  ref,
) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [duplicateError, setDuplicateError] = useState<{ name?: string; value?: string }>({});
  const [, setSuggestions] = useState<
    Array<{ name: string; url?: string; executablePath?: string }>
  >([]);
  const [faviconStatus, setFaviconStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle',
  );
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const isEdit = !!editApp;

  const normalizeUrl = (urlString?: string): string => {
    if (!urlString) return '';
    try {
      const u = new URL(urlString);
      let normalized = u.hostname + u.pathname;
      if (normalized.endsWith('/')) normalized = normalized.slice(0, -1);
      return normalized.toLowerCase();
    } catch {
      return urlString.toLowerCase().replace(/\/$/, '');
    }
  };

  const extractSearchKeywords = (input: string): string => {
    try {
      const u = new URL(input);
      return u.hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      return input.toLowerCase();
    }
  };

  // Suggestions for duplicate detection
  useEffect(() => {
    if (!isOpen || isEdit) {
      setSuggestions([]);
      return;
    }
    const searchTerm = (name || '').toLowerCase();
    let searchKeywords: string[] = [];
    if (searchTerm) {
      searchKeywords = [searchTerm];
    } else if (url) {
      const domain = extractSearchKeywords(url);
      searchKeywords = [domain];
    }
    if (searchKeywords.length === 0 || !searchKeywords[0]) {
      setSuggestions([]);
      return;
    }
    const matches = existingApps
      .filter((app) => {
        const normalizedInputUrl = normalizeUrl(url);
        const normalizedAppUrl = normalizeUrl(app.url);
        if (name && app.name?.toLowerCase() === name.toLowerCase()) return true;
        if (url && normalizedInputUrl === normalizedAppUrl) return true;
        for (const keyword of searchKeywords) {
          const appUrl = (app.url || '').toLowerCase();
          if (appUrl.includes(keyword) && keyword.length > 3) return true;
        }
        return false;
      })
      .slice(0, 2)
      .map((app) => ({ name: app.name || '', url: app.url, executablePath: app.executablePath }));
    setSuggestions(matches);
  }, [name, url, existingApps, isEdit, isOpen]);

  // Duplicate error detection
  useEffect(() => {
    const appsToCheck =
      isEdit && editApp ? existingApps.filter((app) => app.id !== editApp.id) : existingApps;
    const error: { name?: string; value?: string } = {};
    if (name) {
      const existingByName = appsToCheck.find(
        (app) => app.name?.toLowerCase() === name?.toLowerCase(),
      );
      if (existingByName) error.name = `Name "${existingByName.name}" already exists`;
    }
    if (url) {
      const existingByUrl = appsToCheck.find(
        (app) => app.url?.toLowerCase() === url?.toLowerCase(),
      );
      if (existingByUrl) error.value = `URL "${existingByUrl.url}" already exists`;
    }
    setDuplicateError(error);
  }, [name, url, existingApps, isEdit, editApp]);

  // Fetch favicon when URL changes
  useEffect(() => {
    if (!url) {
      setFaviconStatus('idle');
      setFaviconUrl(null);
      return;
    }

    let isMounted = true;
    setFaviconStatus('loading');

    const fetchFavicon = async () => {
      try {
        let domain = url;
        if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
          domain = `https://${domain}`;
        }
        const urlObj = new URL(domain);
        const hostname = urlObj.hostname;

        const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;

        const checkImage = (src: string): Promise<boolean> => {
          return new Promise((resolve) => {
            const testImg = new Image();
            testImg.onload = () => resolve(true);
            testImg.onerror = () => resolve(false);
            testImg.src = src;
          });
        };

        const googleLoaded = await checkImage(googleFaviconUrl);
        if (googleLoaded && isMounted) {
          setFaviconUrl(googleFaviconUrl);
          setFaviconStatus('success');
          return;
        }

        const icoUrl = `https://${hostname}/favicon.ico`;
        const icoLoaded = await checkImage(icoUrl);
        if (icoLoaded && isMounted) {
          setFaviconUrl(icoUrl);
          setFaviconStatus('success');
          return;
        }

        const pngUrl = `https://${hostname}/favicon.png`;
        const pngLoaded = await checkImage(pngUrl);
        if (pngLoaded && isMounted) {
          setFaviconUrl(pngUrl);
          setFaviconStatus('success');
          return;
        }

        if (isMounted) {
          setFaviconStatus('error');
        }
      } catch {
        if (isMounted) {
          setFaviconStatus('error');
        }
      }
    };

    fetchFavicon();

    return () => {
      isMounted = false;
    };
  }, [url]);

  // Reset on open/edit
  useEffect(() => {
    if (!isOpen) return;
    if (editApp) {
      setName(editApp.name || '');
      setUrl(editApp.url || '');
    } else {
      setName('');
      setUrl('');
    }
    setFaviconStatus('idle');
    setFaviconUrl(null);
  }, [isOpen, editApp]);

  const handleSubmit = async () => {
    if (isEdit && editApp && onEdit) {
      onEdit(editApp.id, { name, url });
      return;
    }
    if (!name || !url) return;

    try {
      await onAdd({ name, url, mode: 'intercept', platform: 'web' });
    } catch (error) {
      console.error('[Website] Add target failed:', error);
    }
  };

  const canSubmit = !!(name && url) && !duplicateError.name && !duplicateError.value;

  useImperativeHandle(ref, () => ({ submit: handleSubmit, canSubmit }), [handleSubmit, canSubmit]);

  useEffect(() => {
    onCanSubmitChange?.(canSubmit);
  }, [canSubmit, onCanSubmitChange]);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-text-secondary mb-1.5">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Google"
          className={cn(
            'w-full bg-input-background border rounded-lg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary',
            duplicateError.name ? 'border-error' : 'border-border',
          )}
        />
        {duplicateError.name && <p className="text-xs text-error mt-1.5">{duplicateError.name}</p>}
      </div>
      <div>
        <label className="block text-xs font-bold text-text-secondary mb-1.5">URL</label>
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-9 h-9 shrink-0 rounded-lg flex items-center justify-center border-2 transition-all bg-input-background',
              faviconStatus === 'idle' && 'border-border',
              faviconStatus === 'loading' && 'border-border animate-pulse',
              faviconStatus === 'success' && 'border-success',
              faviconStatus === 'error' && 'border-error',
            )}
          >
            {faviconStatus === 'loading' && (
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            )}
            {faviconStatus === 'success' && faviconUrl && (
              <img
                src={faviconUrl}
                alt="Favicon"
                className="w-6 h-6 object-contain"
                onError={() => setFaviconStatus('error')}
              />
            )}
            {faviconStatus === 'error' && <Bug className="w-5 h-5 text-error" />}
            {faviconStatus === 'idle' && <div className="w-6 h-6 rounded bg-border/30" />}
          </div>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className={cn(
              'flex-1 bg-input-background border rounded-lg px-3 py-2.5 text-sm font-mono text-text-primary outline-none focus:border-primary',
              duplicateError.value ? 'border-error' : 'border-border',
            )}
          />
        </div>
        {duplicateError.value && (
          <p className="text-xs text-error mt-1.5">{duplicateError.value}</p>
        )}
      </div>
    </div>
  );
});

// ─── Android Form ───────────────────────────────────────────────────────
type AndroidBodyProps = Pick<
  BaseModalProps,
  'isOpen' | 'onAdd' | 'existingApps' | 'onCanSubmitChange'
>;

interface AndroidRef {
  submit: () => Promise<void>;
  canSubmit: boolean;
}

interface Device {
  name: string;
  serial: string;
  type: 'physical' | 'vm' | 'running-vm';
}

const AndroidForm = forwardRef<AndroidRef, AndroidBodyProps>(function AndroidForm(
  { isOpen, onAdd, existingApps = [], onCanSubmitChange },
  ref,
) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

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

  // Reset state khi đóng modal
  useEffect(() => {
    if (!isOpen) {
      setDevices([]);
      setSearchQuery('');
      setSelectedDevice(null);
      setDuplicateError(null);
    }
  }, [isOpen]);

  // Load devices khi mở modal
  useEffect(() => {
    if (isOpen) {
      loadDevices();
    }
  }, [isOpen]);

  // Lọc danh sách device theo search
  const filteredDevices = useMemo(() => {
    if (!searchQuery) return devices;
    const q = searchQuery.toLowerCase();
    return devices.filter(
      (d) => d.name.toLowerCase().includes(q) || d.serial.toLowerCase().includes(q),
    );
  }, [devices, searchQuery]);

  // Kiểm tra trùng lặp device
  useEffect(() => {
    if (!selectedDevice) {
      setDuplicateError(null);
      return;
    }

    const existing = existingApps.find(
      (app) => app.emulatorSerial?.toLowerCase() === selectedDevice.serial?.toLowerCase(),
    );
    if (existing) {
      setDuplicateError(`Device "${existing.name}" (${existing.emulatorSerial}) đã tồn tại`);
    } else {
      setDuplicateError(null);
    }
  }, [selectedDevice, existingApps]);

  const handleSubmit = async () => {
    if (!selectedDevice) return;
    if (duplicateError) return;

    try {
      await onAdd({
        name: selectedDevice.name,
        platform: 'android',
        mode: 'intercept',
        emulatorSerial: selectedDevice.serial,
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
    <div className="flex flex-col" style={{ height: '50vh' }}>
      {/* Search + Refresh */}
      <div className="pb-3 flex gap-2 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
          <input
            type="text"
            placeholder="Tìm device theo tên hoặc serial..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-input-background border border-border rounded-lg pl-8 pr-3 py-2 text-sm text-text-primary outline-none focus:border-primary/50"
          />
        </div>
        <button
          onClick={loadDevices}
          disabled={loading}
          className="p-2 bg-dropdown-item-hover hover:bg-dropdown-item-hover border border-border rounded-lg transition-all"
        >
          <RefreshCw className={cn('w-4 h-4 text-text-secondary', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading && devices.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-sm text-text-secondary">Đang quét thiết bị...</p>
          </div>
        ) : filteredDevices.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-secondary">
            <Smartphone className="w-12 h-12 text-text-secondary/30" />
            <p className="text-sm mt-2">Không tìm thấy thiết bị</p>
            <p className="text-xs text-text-secondary/60">
              Hãy khởi động Genymotion VM hoặc kết nối thiết bị Android
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filteredDevices.map((device) => {
              const isSelected = selectedDevice?.serial === device.serial;
              const isExisting = existingApps.some(
                (app) => app.emulatorSerial?.toLowerCase() === device.serial.toLowerCase(),
              );
              const Icon = device.type === 'physical' ? Smartphone : Monitor;

              return (
                <button
                  key={device.serial}
                  onClick={() => {
                    if (isExisting) return;
                    setSelectedDevice(device);
                  }}
                  disabled={isExisting}
                  className={cn(
                    'relative flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                    isSelected
                      ? 'bg-primary/10 border-primary/40'
                      : isExisting
                        ? 'bg-dropdown-item-hover/40 border-border/40 opacity-50 cursor-not-allowed'
                        : 'bg-input-background border-border/40 hover:bg-dropdown-item-hover/60',
                  )}
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                      device.type === 'physical' ? 'bg-green/10' : 'bg-blue/10',
                    )}
                  >
                    <Icon
                      className={cn(
                        'w-4 h-4',
                        device.type === 'physical' ? 'text-green' : 'text-blue',
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-text-primary truncate">
                      {device.name}
                    </div>
                    <div className="text-[10px] text-text-secondary truncate font-mono">
                      {device.serial}
                    </div>
                    <div className="text-[9px] text-text-secondary/60 mt-0.5">
                      {device.type === 'physical'
                        ? '📱 Physical'
                        : device.type === 'running-vm'
                          ? '⚡ Running VM'
                          : '⏸️ Stopped VM'}
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                  {isExisting && (
                    <span className="text-[9px] text-text-secondary shrink-0">Đã có</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Error message */}
      {duplicateError && (
        <div className="pt-3 shrink-0">
          <div className="bg-error/10 border border-error/20 rounded-lg p-2 text-sm text-error">
            {duplicateError}
          </div>
        </div>
      )}
    </div>
  );
});

// ─── PC Form ────────────────────────────────────────────────────────────
type PCBodyProps = Pick<BaseModalProps, 'isOpen' | 'onAdd' | 'existingApps' | 'onCanSubmitChange'>;

interface PCRef {
  submit: () => Promise<void>;
  canSubmit: boolean;
}

const PCForm = forwardRef<PCRef, PCBodyProps>(function PCForm(
  { isOpen, onAdd, existingApps = [], onCanSubmitChange },
  ref,
) {
  const [discoveredApps, setDiscoveredApps] = useState<DiscoveredApp[]>([]);
  const [selectedPcApp, setSelectedPcApp] = useState<DiscoveredApp | null>(null);
  const [pcLoading, setPcLoading] = useState(false);
  const [pcSearch, setPcSearch] = useState('');
  const [duplicateError, setDuplicateError] = useState<{ name?: string; value?: string }>({});

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

  // Duplicate error detection
  useEffect(() => {
    if (selectedPcApp) {
      const error: { name?: string; value?: string } = {};
      const existingByName = existingApps.find(
        (app) => app.name?.toLowerCase() === selectedPcApp.name?.toLowerCase(),
      );
      const existingByPath = existingApps.find(
        (app) => app.executablePath?.toLowerCase() === (selectedPcApp as any).exec?.toLowerCase(),
      );
      if (existingByName) error.name = `Name "${existingByName.name}" already exists`;
      if (existingByPath) error.value = `Path "${existingByPath.executablePath}" already exists`;
      setDuplicateError(error);
    } else {
      setDuplicateError({});
    }
  }, [selectedPcApp, existingApps]);

  // Load apps on open
  useEffect(() => {
    if (!isOpen) return;
    setSelectedPcApp(null);
    setPcSearch('');
    loadPcApps();
  }, [isOpen]);

  // Auto-select first card when apps are discovered
  useEffect(() => {
    if (isOpen && discoveredApps.length > 0 && !selectedPcApp) {
      setSelectedPcApp(discoveredApps[0]);
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
        executablePath: (selectedPcApp as any).exec,
        platform: 'pc',
        mode: 'intercept',
        icon: selectedPcApp.icon,
      });
    } catch (error) {
      console.error('[PC] Add target failed:', error);
    }
  };

  const canSubmit = !!selectedPcApp && !duplicateError.name && !duplicateError.value;

  useImperativeHandle(ref, () => ({ submit: handleSubmit, canSubmit }), [handleSubmit, canSubmit]);

  useEffect(() => {
    onCanSubmitChange?.(canSubmit);
  }, [canSubmit, onCanSubmitChange]);

  return (
    <div className="flex flex-row" style={{ height: '50vh' }}>
      {/* Left Panel - App List */}
      <div className="w-[37.5%] flex flex-col pr-3 border-r border-border">
        <div className="pb-3 flex gap-2 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
            <input
              type="text"
              placeholder="Search apps..."
              value={pcSearch}
              onChange={(e) => setPcSearch(e.target.value)}
              className="w-full bg-input-background border border-border rounded-lg pl-8 pr-3 py-2 text-sm text-text-primary outline-none focus:border-primary/50"
            />
          </div>
          <button
            onClick={loadPcApps}
            className="p-2 bg-dropdown-item-hover hover:bg-dropdown-item-hover border border-border rounded-lg shrink-0"
          >
            <RefreshCw className={cn('w-4 h-4 text-text-secondary', pcLoading && 'animate-spin')} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {pcLoading && !discoveredApps.length ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-sm text-text-secondary">Scanning installed apps...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {filteredPcApps.map((app) => {
                const isSelected =
                  (selectedPcApp as any)?.exec === (app as any).exec &&
                  (selectedPcApp as any)?.name === app.name;
                const isExisting = existingApps.some(
                  (existing) =>
                    existing.executablePath?.toLowerCase() === (app as any).exec?.toLowerCase() ||
                    existing.name?.toLowerCase() === app.name?.toLowerCase(),
                );
                return (
                  <button
                    key={`${app.name}-${(app as any).exec}`}
                    onClick={() => !isExisting && setSelectedPcApp(app)}
                    disabled={isExisting}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border text-left transition-all w-full',
                      isSelected && !isExisting
                        ? 'bg-primary/10 border-primary/40'
                        : isExisting
                          ? 'opacity-50 cursor-not-allowed bg-input-background/50 border-border/30'
                          : 'bg-input-background border-border/40 hover:bg-dropdown-item-hover/60',
                    )}
                  >
                    <div className="w-9 h-9 rounded-lg bg-dropdown-item-hover flex items-center justify-center shrink-0 overflow-hidden">
                      {app.icon ? (
                        <img
                          src={`media://${app.icon}`}
                          alt={app.name}
                          className="w-8 h-8 object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <Monitor className="w-4 h-4 text-text-secondary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-text-primary truncate">
                        {app.name}
                        {isExisting && (
                          <span className="ml-2 text-[9px] font-normal text-text-secondary">
                            (đã tồn tại)
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-text-secondary truncate">
                        {app.description || 'System Application'}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-text-secondary">
                        <span className="px-1.5 py-0 rounded-md bg-text-secondary/10 text-text-secondary">
                          {app.appSize || 'N/A'}
                        </span>
                        <span className="px-1.5 py-0 rounded-md bg-text-secondary/10 text-text-secondary">
                          {app.lastUsed || 'Never used'}
                        </span>
                        <span className="px-1.5 py-0 rounded-md bg-text-secondary/10 text-text-secondary">
                          {app.addedToTarget ? 'Added' : 'New'}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {duplicateError.name && (
          <p className="text-xs text-error mt-2 shrink-0">{duplicateError.name}</p>
        )}
        {duplicateError.value && (
          <p className="text-xs text-error mt-1 shrink-0">{duplicateError.value}</p>
        )}
      </div>

      {/* Right Panel - App Details */}
      <div className="w-1/2 pl-3 overflow-y-auto">
        {selectedPcApp ? (
          <div className="flex flex-col gap-4">
            {/* Header: Icon + Name */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-dropdown-item-hover flex items-center justify-center shrink-0 overflow-hidden border border-border">
                {selectedPcApp.icon ? (
                  <img
                    src={`media://${selectedPcApp.icon}`}
                    alt={selectedPcApp.name}
                    className="w-10 h-10 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <Monitor className="w-6 h-6 text-text-secondary" />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-text-primary truncate">
                  {selectedPcApp.name}
                </h3>
                <p className="text-[11px] text-text-secondary">
                  {selectedPcApp.description || 'System Application'}
                </p>
              </div>
            </div>

            {/* Executable Path */}
            <div>
              <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wide mb-1">
                Executable Path
              </p>
              <p className="text-xs text-text-primary font-mono bg-input-background rounded-md px-2 py-1.5 break-all border border-border/40">
                {(selectedPcApp as any).exec || 'N/A'}
              </p>
            </div>

            {/* Package Name */}
            {selectedPcApp.packageName && (
              <div>
                <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wide mb-1">
                  Package Name
                </p>
                <p className="text-xs text-text-primary font-mono break-all">
                  {selectedPcApp.packageName}
                </p>
              </div>
            )}

            {/* URL */}
            {selectedPcApp.url && (
              <div>
                <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wide mb-1">
                  URL
                </p>
                <p className="text-xs text-text-primary break-all">{selectedPcApp.url}</p>
              </div>
            )}

            {/* Source */}
            <div>
              <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wide mb-1">
                Source
              </p>
              <p className="text-xs text-text-primary capitalize">{selectedPcApp.source}</p>
            </div>

            {/* Confidence */}
            {selectedPcApp.confidence !== undefined && (
              <div>
                <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wide mb-1">
                  Confidence
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-input-background rounded-full overflow-hidden border border-border/40">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${Math.round(selectedPcApp.confidence * 100)}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-text-secondary font-medium">
                    {Math.round(selectedPcApp.confidence * 100)}%
                  </span>
                </div>
              </div>
            )}

            {/* Tags */}
            {selectedPcApp.tags && selectedPcApp.tags.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wide mb-1.5">
                  Tags
                </p>
                <div className="flex flex-wrap gap-1">
                  {selectedPcApp.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-primary/10 text-primary border border-primary/20"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Discovered At */}
            {selectedPcApp.discoveredAt && (
              <div>
                <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wide mb-1">
                  Discovered
                </p>
                <p className="text-xs text-text-primary">
                  {new Date(selectedPcApp.discoveredAt).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-text-secondary">
            <Monitor className="w-8 h-8 opacity-30" />
            <p className="text-xs">Select an app to view details</p>
          </div>
        )}
      </div>
    </div>
  );
});

// ─── CLI Form ───────────────────────────────────────────────────────────
type CLIBodyProps = Pick<
  BaseModalProps,
  'isOpen' | 'onAdd' | 'existingApps' | 'editApp' | 'onEdit' | 'onCanSubmitChange'
>;

interface CLIRef {
  submit: () => Promise<void>;
  canSubmit: boolean;
}

interface EnvVar {
  key: string;
  value: string;
}

/** Thêm https:// nếu URL người dùng nhập chưa có protocol. */
const withProtocol = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const CLIForm = forwardRef<CLIRef, CLIBodyProps>(function CLIForm(
  { isOpen, onAdd, existingApps = [], editApp, onEdit, onCanSubmitChange },
  ref,
) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [command, setCommand] = useState('');
  const [workingDir, setWorkingDir] = useState('');
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [duplicateError, setDuplicateError] = useState<{ name?: string; value?: string }>({});
  const [faviconStatus, setFaviconStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle',
  );
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);

  const isEdit = !!editApp;

  const isUrlInvalid = (() => {
    if (!url.trim()) return false;
    try {
      new URL(withProtocol(url));
      return false;
    } catch {
      return true;
    }
  })();

  // Duplicate error detection
  useEffect(() => {
    const appsToCheck =
      isEdit && editApp ? existingApps.filter((app) => app.id !== editApp.id) : existingApps;
    const error: { name?: string; value?: string } = {};
    if (name && command) {
      const existingByName = appsToCheck.find(
        (app) => app.name?.toLowerCase() === name?.toLowerCase(),
      );
      const existingByCommand = appsToCheck.find(
        (app) => app.executablePath?.toLowerCase() === command?.toLowerCase(),
      );
      if (existingByName) error.name = `Name "${existingByName.name}" already exists`;
      if (existingByCommand)
        error.value = `Command "${existingByCommand.executablePath}" already exists`;
    }
    setDuplicateError(error);
  }, [name, command, existingApps, isEdit, editApp]);

  // Fetch favicon when URL changes
  useEffect(() => {
    if (!url.trim()) {
      setFaviconStatus('idle');
      setFaviconUrl(null);
      return;
    }

    let isMounted = true;
    setFaviconStatus('loading');

    const checkImage = (src: string): Promise<boolean> =>
      new Promise((resolve) => {
        const testImg = new Image();
        testImg.onload = () => resolve(true);
        testImg.onerror = () => resolve(false);
        testImg.src = src;
      });

    const fetchFavicon = async () => {
      try {
        const hostname = new URL(withProtocol(url)).hostname;
        const candidates = [
          `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`,
          `https://${hostname}/favicon.ico`,
          `https://${hostname}/favicon.png`,
        ];
        for (const src of candidates) {
          const loaded = await checkImage(src);
          if (!isMounted) return;
          if (loaded) {
            setFaviconUrl(src);
            setFaviconStatus('success');
            return;
          }
        }
        if (isMounted) setFaviconStatus('error');
      } catch {
        if (isMounted) setFaviconStatus('error');
      }
    };

    // Debounce để tránh fetch ở mỗi lần gõ phím
    const timer = setTimeout(fetchFavicon, 400);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [url]);

  // Reset on open/edit
  useEffect(() => {
    if (!isOpen) return;
    if (editApp) {
      setName(editApp.name || '');
      setUrl(editApp.url || '');
      setCommand(editApp.executablePath || '');
    } else {
      setName('');
      setUrl('');
      setCommand('');
    }
    setWorkingDir('');
    setEnvVars([]);
    setFaviconStatus('idle');
    setFaviconUrl(null);
  }, [isOpen, editApp]);

  const handleSelectFolder = async () => {
    try {
      const result = await (window as any).electron.ipcRenderer.invoke('dialog:show-save', {
        title: 'Select Working Directory',
        properties: ['openDirectory'],
      });
      if (result?.success && result?.filePath) {
        setWorkingDir(result.filePath);
      }
    } catch (error) {
      console.error('[CLI] Select folder failed:', error);
    }
  };

  const addEnvVar = () => {
    setEnvVars((prev) => [...prev, { key: '', value: '' }]);
  };

  const updateEnvVar = (index: number, field: 'key' | 'value', value: string) => {
    setEnvVars((prev) => prev.map((env, i) => (i === index ? { ...env, [field]: value } : env)));
  };

  const removeEnvVar = (index: number) => {
    setEnvVars((prev) => prev.filter((_, i) => i !== index));
  };

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
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-text-secondary mb-1.5">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. My Node API"
          className={cn(
            'w-full bg-input-background border rounded-lg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary',
            duplicateError.name ? 'border-error' : 'border-border',
          )}
        />
        {duplicateError.name && <p className="text-xs text-error mt-1.5">{duplicateError.name}</p>}
      </div>

      {/* URL (optional) — dùng để lấy favicon hiển thị trên TargetCard */}
      <div>
        <label className="block text-xs font-bold text-text-secondary mb-1.5">
          URL <span className="font-normal text-text-secondary/60">(optional)</span>
        </label>
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-9 h-9 shrink-0 rounded-lg flex items-center justify-center border-2 transition-all bg-input-background',
              faviconStatus === 'idle' && 'border-border',
              faviconStatus === 'loading' && 'border-border animate-pulse',
              faviconStatus === 'success' && 'border-success',
              faviconStatus === 'error' && 'border-error',
            )}
          >
            {faviconStatus === 'loading' && (
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            )}
            {faviconStatus === 'success' && faviconUrl && (
              <img
                src={faviconUrl}
                alt="Favicon"
                className="w-6 h-6 object-contain"
                onError={() => setFaviconStatus('error')}
              />
            )}
            {faviconStatus === 'error' && <Bug className="w-5 h-5 text-error" />}
            {faviconStatus === 'idle' && <div className="w-6 h-6 rounded bg-border/30" />}
          </div>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className={cn(
              'flex-1 bg-input-background border rounded-lg px-3 py-2.5 text-sm font-mono text-text-primary outline-none focus:border-primary',
              isUrlInvalid ? 'border-error' : 'border-border',
            )}
          />
        </div>
        {isUrlInvalid && <p className="text-xs text-error mt-1.5">Invalid URL</p>}
        <p className="text-[10px] text-text-secondary mt-1.5 italic">
          Used to display the favicon for this CLI target.
        </p>
      </div>

      <div>
        <label className="block text-xs font-bold text-text-secondary mb-1.5">Command</label>
        <textarea
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="e.g. node server.js --port 3000"
          rows={3}
          className={cn(
            'w-full bg-input-background border rounded-lg px-3 py-2.5 text-sm font-mono text-text-primary outline-none focus:border-primary resize-none',
            duplicateError.value ? 'border-error' : 'border-border',
          )}
        />
        {duplicateError.value && (
          <p className="text-xs text-error mt-1.5">{duplicateError.value}</p>
        )}
        <p className="text-[10px] text-text-secondary mt-1.5 italic">
          The command will be proxied through the MITM proxy for traffic inspection.
        </p>
      </div>

      {/* Working Directory */}
      <div>
        <label className="block text-xs font-bold text-text-secondary mb-1.5">
          Working Directory
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={workingDir}
            onChange={(e) => setWorkingDir(e.target.value)}
            placeholder="/path/to/project"
            className="flex-1 bg-input-background border border-border rounded-lg px-3 py-2.5 text-sm font-mono text-text-primary outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={handleSelectFolder}
            title="Choose folder"
            className="shrink-0 w-10 h-10 flex items-center justify-center rounded-lg border border-border bg-input-background text-text-secondary hover:text-text-primary hover:bg-dropdown-item-hover transition-colors"
          >
            <Folder className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Environment Variables */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-bold text-text-secondary">
            Environment Variables
          </label>
          <button
            type="button"
            onClick={addEnvVar}
            className="flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>
        {envVars.length === 0 ? (
          <p className="text-xs text-text-secondary/60 italic">No environment variables</p>
        ) : (
          <div className="space-y-2">
            {envVars.map((env, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={env.key}
                  onChange={(e) => updateEnvVar(index, 'key', e.target.value)}
                  placeholder="KEY"
                  className="flex-1 bg-input-background border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary outline-none focus:border-primary"
                />
                <input
                  type="text"
                  value={env.value}
                  onChange={(e) => updateEnvVar(index, 'value', e.target.value)}
                  placeholder="VALUE"
                  className="flex-1 bg-input-background border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => removeEnvVar(index)}
                  title="Remove"
                  className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-text-secondary hover:text-error hover:bg-error/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
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
    description: 'Chọn thiết bị Android từ danh sách scan được',
  },
};

// ─── Main Modal ─────────────────────────────────────────────────────────
export const TargetModal: React.FC<TargetModalProps> = ({
  isOpen,
  platform,
  onClose,
  onAdd,
  existingApps,
  editApp,
  onEdit,
}) => {
  const bodyRef = useRef<BodyRef>(null);
  const [canSubmit, setCanSubmit] = useState(false);

  const isEdit = !!editApp;
  const config = PLATFORM_CONFIG[platform] || { title: 'Add Target', description: '' };
  const title = isEdit ? config.isEditTitle || config.title : config.title;
  const description = isEdit ? config.isEditDesc || config.description : config.description;

  useEffect(() => {
    if (!isOpen) {
      setCanSubmit(false);
    }
  }, [isOpen]);

  const handleSubmit = useCallback(async () => {
    if (bodyRef.current) {
      await bodyRef.current.submit();
      onClose();
    }
  }, [onClose]);

  const renderBody = () => {
    switch (platform) {
      case 'web':
        return (
          <WebsiteForm
            ref={bodyRef}
            isOpen={isOpen}
            onAdd={onAdd}
            existingApps={existingApps}
            editApp={editApp}
            onEdit={onEdit}
            onCanSubmitChange={setCanSubmit}
          />
        );
      case 'android':
        return (
          <AndroidForm
            ref={bodyRef}
            isOpen={isOpen}
            onAdd={onAdd}
            existingApps={existingApps}
            onCanSubmitChange={setCanSubmit}
          />
        );
      case 'pc':
        return (
          <PCForm
            ref={bodyRef}
            isOpen={isOpen}
            onAdd={onAdd}
            existingApps={existingApps}
            onCanSubmitChange={setCanSubmit}
          />
        );
      case 'cli':
        return (
          <CLIForm
            ref={bodyRef}
            isOpen={isOpen}
            onAdd={onAdd}
            existingApps={existingApps}
            editApp={editApp}
            onEdit={onEdit}
            onCanSubmitChange={setCanSubmit}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className={platform === 'pc' ? 'max-w-5xl' : 'max-w-2xl'}>
      <ModalHeader title={title} description={description} onClose={onClose} />
      <ModalBody>{renderBody()}</ModalBody>
      <ModalFooter>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-dropdown-item-hover transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-primary hover:bg-primary/90 disabled:opacity-50 transition-all"
        >
          {isEdit ? 'Save Changes' : 'Add Target'}
        </button>
      </ModalFooter>
    </Modal>
  );
};

// Backward-compatible alias để không phá vỡ các import cũ nếu còn.
export const AddTargetModal = TargetModal;
export default TargetModal;