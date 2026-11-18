import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardPaste,
  Eye,
  EyeOff,
  FileText,
  Globe2,
  KeyRound,
  Layers,
  Loader2,
  Lock,
  Plug,
  Plus,
  Share2,
  X,
  XCircle,
} from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useEscapeKey } from '../../../Profile/hooks/useEscapeKey';
import { Modal } from '@renderer/components/ui/Modal/Modal';
import { ModalHeader } from '@renderer/components/ui/Modal/ModalHeader';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownTrigger,
} from '@renderer/components/ui/Dropdown';
import { Calendar } from '@renderer/components/ui/Calendar';
import type {
  ProxyDraft,
  ProxyKind,
  ProxyOwnership,
  ProxyProtocol,
  ProxySource,
} from '../../types';
import {
  COUNTRIES,
  KINDS,
  KIND_META,
  PROTOCOLS,
  PROTOCOL_META,
  PROVIDERS,
  TONE_CLASS,
} from '../../constants/proxy';
import { flag } from '../../utils/format';
import { joinExpiry, pad2, splitExpiry } from '../../utils/expiry';
import { KIND_ICON } from '../common/ProxyBits';
import { ProxyInfoPanel } from './ProxyInfoPanel';
import { SourcePickerPanel } from './SourcePickerPanel';
import { Section } from '../ProxyDrawer/common/Section';
import { profileApi } from '../../../Profile/services/profile-api.service';
import type { Profile } from '../../../Profile/types';
import { decodeQrText } from '../../../Profile/utils/qr';
import { parseWireGuardConf } from '../../utils/wireguard';

interface CreateProxyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (draft: ProxyDraft, sourceId: string) => void;
  sources?: ProxySource[];
  activeSourceId?: string;
  warp?: boolean;
  onCreateWarp?: (input: { license: string; count: number }) => Promise<void>;
  foxhole?: { activated: boolean; running: boolean; country: string } | null;
  onCreateFoxhole?: (input: { country: string; profileId: string }) => Promise<void>;
  onActivateFoxhole?: () => Promise<void>;
  proton?: boolean;
  onCreateProton?: (input: {
    email: string;
    privateKey: string;
    peerPublicKey: string;
    endpoint: string;
  }) => Promise<void>;
}

type Form = Required<ProxyDraft>;

const EMPTY: Form = {
  protocol: 'http',
  host: '',
  port: 8080,
  username: '',
  password: '',
  kind: 'datacenter',
  ownership: 'private',
  country: 'VN',
  provider: PROVIDERS[0],
  tags: [],
  isp: '',
  name: '',
  stickyEnabled: false,
  stickyTtlMin: 30,
  rotationMin: 0,
  maxConns: 10,
  notes: '',
  quotaTotalGb: null,
  expiresAt: null,
};

const HOST_RE =
  /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?([.][a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;

const INPUT =
  'h-9 w-full rounded-md bg-text-secondary/10 px-3 text-xs text-text-primary outline-none transition-colors placeholder:text-text-secondary/70 focus:bg-text-secondary/15';

type TestState =
  { status: 'idle' } | { status: 'testing' } | { status: 'ok'; ms: number } | { status: 'fail' };

function parseQuick(raw: string): Partial<ProxyDraft> | null {
  const text = raw.trim();
  if (!text) return null;
  let protocol: ProxyProtocol | undefined;
  let rest = text;
  const m = text.match(/^([a-zA-Z0-9]+):[/][/](.+)$/);
  if (m) {
    const p = m[1].toLowerCase() as ProxyProtocol;
    if (!PROTOCOLS.includes(p)) return null;
    protocol = p;
    rest = m[2];
  }
  let host = '';
  let port = '';
  let user = '';
  let pass = '';
  if (rest.includes('@')) {
    const idx = rest.lastIndexOf('@');
    const cred = rest.slice(0, idx).split(':');
    const hp = rest.slice(idx + 1).split(':');
    user = cred[0] ?? '';
    pass = cred.slice(1).join(':');
    host = hp[0] ?? '';
    port = hp[1] ?? '';
  } else {
    const parts = rest.split(':');
    if (parts.length !== 2 && parts.length !== 4) return null;
    [host, port, user, pass] = [parts[0], parts[1], parts[2] ?? '', parts[3] ?? ''];
  }
  const portNum = Number(port);
  if (!host || !Number.isInteger(portNum) || portNum < 1 || portNum > 65535) return null;
  return { ...(protocol ? { protocol } : {}), host, port: portNum, username: user, password: pass };
}

function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-text-secondary">{label}</span>
        {hint}
      </div>
      {children}
    </div>
  );
}

interface Option {
  value: string;
  label: string;
  prefix?: ReactNode;
}

function Select({
  value,
  options,
  onChange,
  searchable,
}: {
  value: string;
  options: Option[];
  onChange: (v: string) => void;
  searchable?: boolean;
}) {
  const current = options.find((o) => o.value === value);
  return (
    <Dropdown searchable={searchable}>
      <DropdownTrigger asChild>
        <button
          type="button"
          className={cn(
            INPUT,
            'flex items-center justify-between gap-2 text-left hover:bg-text-secondary/15',
          )}
        >
          <span className="flex min-w-0 items-center gap-2 truncate">
            {current?.prefix}
            <span className="truncate">{current?.label}</span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
        </button>
      </DropdownTrigger>
      <DropdownContent className="max-h-[240px] overflow-y-auto">
        {options.map((o) => (
          <DropdownItem
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cn(o.value === value && 'bg-text-secondary/10')}
          >
            {o.prefix}
            {o.label}
          </DropdownItem>
        ))}
      </DropdownContent>
    </Dropdown>
  );
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-5 w-9 shrink-0 rounded-full transition-colors',
        checked ? 'bg-primary' : 'bg-text-secondary/25',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all',
          checked ? 'left-[18px]' : 'left-0.5',
        )}
      />
    </button>
  );
}

function NumField({
  value,
  onChange,
  suffix,
  min = 0,
  max,
}: {
  value: number;
  onChange: (v: number) => void;
  suffix: string;
  min?: number;
  max?: number;
}) {
  return (
    <div className="relative">
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(INPUT, 'pr-12 font-mono')}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-text-secondary">
        {suffix}
      </span>
    </div>
  );
}

export function CreateProxyModal({
  isOpen,
  onClose,
  onCreate,
  sources,
  activeSourceId,
  warp,
  onCreateWarp,
  foxhole,
  onCreateFoxhole,
  proton,
  onCreateProton,
}: CreateProxyModalProps) {
  const [draft, setDraft] = useState<Form>(EMPTY);

  const [quick, setQuick] = useState('');
  const [quickError, setQuickError] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [test, setTest] = useState<TestState>({ status: 'idle' });
  const [license, setLicense] = useState('');
  const [warpCount, setWarpCount] = useState(1);
  const [warpBusy, setWarpBusy] = useState(false);
  const [warpError, setWarpError] = useState<string | null>(null);
  const [foxCountry, setFoxCountry] = useState('');
  const [foxBusy, setFoxBusy] = useState(false);
  const [foxError, setFoxError] = useState<string | null>(null);
  const [foxProfileId, setFoxProfileId] = useState('');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const foxEnabled = Boolean(foxhole);
  const [pEmail, setPEmail] = useState('');
  const [pPrivateKey, setPPrivateKey] = useState('');
  const [pPeerKey, setPPeerKey] = useState('');
  const [pEndpoint, setPEndpoint] = useState('');
  const [pReveal, setPReveal] = useState(false);
  const [pBusy, setPBusy] = useState(false);
  const [pError, setPError] = useState<string | null>(null);
  const [pConf, setPConf] = useState('');
  const [pDrag, setPDrag] = useState(false);
  const [pHint, setPHint] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setPConf('');
      setPDrag(false);
      setPHint(null);
    }
  }, [isOpen]);

  const applyConf = (text: string): void => {
    setPConf(text);
    if (!text.trim()) {
      setPHint(null);
      return;
    }
    const parsed = parseWireGuardConf(text);
    if (!parsed) {
      setPHint({ ok: false, text: 'No PrivateKey, PublicKey and Endpoint found in this text.' });
      return;
    }
    if (parsed.email) setPEmail(parsed.email);
    setPPrivateKey(parsed.privateKey);
    setPPeerKey(parsed.peerPublicKey);
    setPEndpoint(parsed.endpoint);
    setPHint({ ok: true, text: 'Fields filled from the configuration.' });
  };

  const applyImage = async (file: Blob): Promise<void> => {
    try {
      applyConf(await decodeQrText(file));
    } catch (err) {
      setPHint({ ok: false, text: err instanceof Error ? err.message : 'Failed to read image.' });
    }
  };

  const pasteClipboard = async (): Promise<void> => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          await applyImage(await item.getType(imageType));
          return;
        }
      }
      const text = await navigator.clipboard.readText();
      if (text.trim()) applyConf(text);
      else setPHint({ ok: false, text: 'Clipboard has no image or configuration text.' });
    } catch {
      setPHint({ ok: false, text: 'Cannot read the clipboard.' });
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setPEmail('');
      setPPrivateKey('');
      setPPeerKey('');
      setPEndpoint('');
      setPReveal(false);
      setPBusy(false);
      setPError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setFoxCountry('');
      setFoxProfileId('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !foxEnabled) return;
    let cancelled = false;
    profileApi.profiles
      .list()
      .then((list) => {
        if (!cancelled) setProfiles(list);
      })
      .catch((err) => {
        if (!cancelled)
          setFoxError(`Cannot load profiles: ${err instanceof Error ? err.message : String(err)}`);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, foxEnabled]);

  useEffect(() => {
    if (!isOpen) {
      setLicense('');
      setWarpCount(1);
      setWarpBusy(false);
      setWarpError(null);
      setFoxBusy(false);
      setFoxError(null);
      setDraft(EMPTY);
      setQuick('');
      setQuickError(false);
      setReveal(false);
      setTest({ status: 'idle' });
    }
  }, [isOpen]);

  const set = (patch: Partial<Form>): void => setDraft((d) => ({ ...d, ...patch }));
  useEscapeKey(isOpen, onClose);

  // ASSUMED: "normal" sources are vendor-type sources; WARP is excluded because it has its own creation flow
  const normalSources = (sources ?? []).filter(
    (s) => s.type !== 'vpn' && !s.vpn && s.provider !== 'warp',
  );
  const [sourceId, setSourceId] = useState('');
  useEffect(() => {
    if (!isOpen) return;
    const preferred = normalSources.find((s) => s.id === activeSourceId) ?? normalSources[0];
    setSourceId(preferred?.id ?? '');
  }, [isOpen, activeSourceId, sources]);

  const host = draft.host.trim();
  const hostOk = HOST_RE.test(host);
  const portOk = Number.isInteger(draft.port) && draft.port > 0 && draft.port <= 65535;
  const valid = hostOk && portOk;
  const hostError = host.length > 0 && !hostOk;

  const applyQuick = (text: string): void => {
    const parsed = parseQuick(text);
    if (!parsed) {
      setQuickError(text.trim().length > 0);
      return;
    }
    set(parsed);
    setQuick('');
    setQuickError(false);
  };

  // ASSUMED: simulated test like the table's test action — replace with real IPC when available
  useEffect(() => {
    if (!valid) {
      setTest({ status: 'idle' });
      return;
    }
    let inner: number | undefined;
    const outer = window.setTimeout(() => {
      setTest({ status: 'testing' });
      inner = window.setTimeout(
        () => {
          const ok = Math.random() > 0.25;
          setTest(
            ok ? { status: 'ok', ms: Math.round(60 + Math.random() * 320) } : { status: 'fail' },
          );
        },
        900 + Math.random() * 600,
      );
    }, 600);
    return () => {
      window.clearTimeout(outer);
      window.clearTimeout(inner);
    };
  }, [valid, host, draft.port, draft.protocol, draft.username, draft.password]);

  const submit = (): void => {
    if (!valid || !sourceId) return;
    onCreate(
      {
        ...draft,
        host,
        provider: normalSources.find((s) => s.id === sourceId)?.name ?? draft.provider,
        name: draft.name.trim(),
        isp: draft.isp.trim(),
        notes: draft.notes.trim(),
      },
      sourceId,
    );
    onClose();
  };

  const exp = splitExpiry(draft.expiresAt);
  const clampTime = (raw: string, max: number): number =>
    Math.min(max, Math.max(0, Math.trunc(Number(raw)) || 0));
  const setExpiry = (patch: Partial<{ date: string; hour: number; minute: number }>): void => {
    const base = exp ?? { date: '', hour: 23, minute: 59 };
    const next = { ...base, ...patch };
    set({ expiresAt: next.date ? joinExpiry(next.date, next.hour, next.minute) : null });
  };

  const countryOptions: Option[] = COUNTRIES.map(([code, name]) => ({
    value: code,
    label: name,
    prefix: <span className="text-[13px] leading-none">{flag(code)}</span>,
  }));

  const ownershipOptions: Option[] = [
    { value: 'private', label: 'Private', prefix: <Lock className="h-3.5 w-3.5 text-warn" /> },
    { value: 'shared', label: 'Shared', prefix: <Share2 className="h-3.5 w-3.5 text-success" /> },
  ];

  if (foxhole) {
    const countryChoices: Option[] = [
      {
        value: '',
        label: 'Automatic (nearest server)',
        prefix: <Globe2 className="h-3.5 w-3.5 text-text-secondary" />,
      },
      ...countryOptions,
    ];
    const profileChoices: Option[] = [
      {
        value: '',
        label: 'No profile (temporary browser)',
        prefix: <Globe2 className="h-3.5 w-3.5 text-text-secondary" />,
      },
      ...profiles.map((p) => ({ value: p.id, label: p.email })),
    ];
    const submitFoxhole = async (): Promise<void> => {
      setFoxBusy(true);
      setFoxError(null);
      try {
        await onCreateFoxhole?.({ country: foxCountry, profileId: foxProfileId });
        onClose();
      } catch (err) {
        setFoxError(err instanceof Error ? err.message : String(err));
      } finally {
        setFoxBusy(false);
      }
    };
    return (
      <Modal
        isOpen={isOpen}
        onClose={foxBusy ? () => undefined : onClose}
        closeOnBackdropClick={false}
        className="max-w-md"
      >
        <ModalHeader
          title="Add Foxhole account"
          description="Local SOCKS5 proxy over the free Firefox VPN, one Mozilla account per proxy"
          onClose={onClose}
        />
        <ModalBody className="flex flex-col gap-4 py-4">
          <Field
            label="Browser profile"
            hint={<span className="text-[10px] text-text-secondary">Optional</span>}
          >
            <Select
              value={foxProfileId}
              options={profileChoices}
              searchable
              onChange={setFoxProfileId}
            />
          </Field>
          <Field
            label="Exit country"
            hint={<span className="text-[10px] text-text-secondary">Optional</span>}
          >
            <Select
              value={foxCountry}
              options={countryChoices}
              searchable
              onChange={setFoxCountry}
            />
          </Field>
          <p className="text-[11px] leading-relaxed text-text-secondary">
            Creating the account opens Chrome (with the selected profile and a CDP debug port) on
            the Mozilla sign-in page. It closes by itself once you are signed in, then the proxy
            starts on 127.0.0.1.
          </p>
          {foxError && (
            <p className="rounded-md bg-error/10 px-3 py-2 text-[11px] leading-relaxed text-error">
              {foxError}
            </p>
          )}
        </ModalBody>
        <ModalFooter className="items-center justify-end gap-2 border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={foxBusy}
            className="h-8 rounded-md bg-primary/10 px-3 text-xs font-medium text-text-secondary hover:bg-primary/20 hover:text-text-primary active:bg-primary/30 disabled:hover:bg-primary/10 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submitFoxhole()}
            disabled={foxBusy}
            className="flex h-8 items-center gap-1.5 rounded-md bg-primary/10 px-3 text-xs font-medium text-primary hover:bg-primary/20 active:bg-primary/30 disabled:opacity-50"
          >
            {foxBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            {foxBusy ? 'Waiting for sign-in…' : 'Create account'}
          </button>
        </ModalFooter>
      </Modal>
    );
  }

  if (proton) {
    // ASSUMED: endpoint is also required — the backend needs host:port to build the wireproxy config
    const protonValid = Boolean(
      pEmail.trim() &&
      pPrivateKey.trim() &&
      pPeerKey.trim() &&
      /^[^\s:]+:\d{1,5}$/.test(pEndpoint.trim()),
    );
    const submitProton = async (): Promise<void> => {
      if (!protonValid) return;
      setPBusy(true);
      setPError(null);
      try {
        await onCreateProton?.({
          email: pEmail.trim(),
          privateKey: pPrivateKey.trim(),
          peerPublicKey: pPeerKey.trim(),
          endpoint: pEndpoint.trim(),
        });
        onClose();
      } catch (err) {
        setPError(err instanceof Error ? err.message : String(err));
      } finally {
        setPBusy(false);
      }
    };
    return (
      <Modal
        isOpen={isOpen}
        onClose={pBusy ? () => undefined : onClose}
        closeOnBackdropClick={false}
        className="max-w-xl"
      >
        <ModalHeader
          title="Add ProtonVPN account"
          description="Local SOCKS5 proxy over ProtonVPN WireGuard via wireproxy"
          onClose={onClose}
        />
        <ModalBody className="flex flex-col gap-4 py-4">
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setPDrag(true);
            }}
            onDragLeave={() => setPDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setPDrag(false);
              const file = Array.from(e.dataTransfer.files).find((f) =>
                f.type.startsWith('image/'),
              );
              if (file) void applyImage(file);
            }}
            className={cn(
              'flex cursor-pointer flex-col items-center gap-1.5 rounded-md border border-dashed px-3 py-4 text-center transition-colors',
              pDrag
                ? 'border-primary bg-primary/10'
                : 'border-text-secondary/30 bg-text-secondary/5 hover:bg-text-secondary/10',
            )}
          >
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void applyImage(file);
                e.target.value = '';
              }}
            />
            <FileText className="h-5 w-5 text-text-secondary" />
            <span className="text-xs font-medium text-text-primary">
              Drop a QR image here or click to browse
            </span>
            <span className="text-[10px] text-text-secondary">
              WireGuard configuration QR code (PNG, JPG, WebP…)
            </span>
          </label>
          <Field
            label="WireGuard configuration"
            hint={
              <button
                type="button"
                onClick={() => void pasteClipboard()}
                className="flex h-6 items-center gap-1 rounded-md bg-text-secondary/10 px-2 text-[11px] font-medium text-text-secondary transition-colors hover:bg-text-secondary/15 hover:text-text-primary"
              >
                <ClipboardPaste className="h-3 w-3" />
                Paste from clipboard
              </button>
            }
          >
            <textarea
              rows={5}
              value={pConf}
              spellCheck={false}
              placeholder={
                '[Interface]\nPrivateKey = ...\n\n[Peer]\nPublicKey = ...\nEndpoint = host:port'
              }
              onChange={(e) => applyConf(e.target.value)}
              onPaste={(e) => {
                const item = Array.from(e.clipboardData.items).find((i) =>
                  i.type.startsWith('image/'),
                );
                const file = item?.getAsFile();
                if (file) {
                  e.preventDefault();
                  void applyImage(file);
                }
              }}
              className="w-full resize-none rounded-md bg-text-secondary/10 p-2.5 font-mono text-[11px] leading-relaxed text-text-primary outline-none placeholder:text-text-secondary/70 focus:bg-text-secondary/15"
            />
            {pHint && (
              <span className={cn('text-[11px]', pHint.ok ? 'text-success' : 'text-error')}>
                {pHint.text}
              </span>
            )}
          </Field>
          <Field label="Email">
            <input
              className={INPUT}
              type="email"
              value={pEmail}
              autoComplete="off"
              spellCheck={false}
              placeholder="you@proton.me"
              onChange={(e) => setPEmail(e.target.value)}
            />
          </Field>
          <Field label="WireGuard private key">
            <div className="relative">
              <input
                className={cn(INPUT, 'pr-9 font-mono')}
                type={pReveal ? 'text' : 'password'}
                value={pPrivateKey}
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => setPPrivateKey(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setPReveal((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary transition-colors hover:text-text-primary"
              >
                {pReveal ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </Field>
          <Field label="WireGuard peer public key">
            <input
              className={cn(INPUT, 'font-mono')}
              value={pPeerKey}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => setPPeerKey(e.target.value)}
            />
          </Field>
          <Field
            label="Endpoint"
            hint={
              pEndpoint.trim() &&
              !/^[^\s:]+:\d{1,5}$/.test(pEndpoint.trim()) && (
                <span className="text-[11px] text-error">host:port</span>
              )
            }
          >
            <input
              className={cn(INPUT, 'font-mono')}
              value={pEndpoint}
              autoComplete="off"
              spellCheck={false}
              placeholder="149.102.251.97:51820"
              onChange={(e) => setPEndpoint(e.target.value)}
            />
          </Field>
          {pError && (
            <p className="rounded-md bg-error/10 px-3 py-2 text-[11px] leading-relaxed text-error">
              {pError}
            </p>
          )}
        </ModalBody>
        <ModalFooter className="items-center justify-end gap-2 border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={pBusy}
            className="h-8 rounded-md bg-primary/10 px-3 text-xs font-medium text-text-secondary hover:bg-primary/20 hover:text-text-primary active:bg-primary/30 disabled:hover:bg-primary/10 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submitProton()}
            disabled={!protonValid || pBusy}
            className="flex h-8 items-center gap-1.5 rounded-md bg-primary/10 px-3 text-xs font-medium text-primary hover:bg-primary/20 active:bg-primary/30 disabled:opacity-50"
          >
            {pBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            {pBusy ? 'Creating…' : 'Create account'}
          </button>
        </ModalFooter>
      </Modal>
    );
  }

  if (warp) {
    const warpValid = Number.isInteger(warpCount) && warpCount >= 1 && warpCount <= 10;
    const submitWarp = async (): Promise<void> => {
      if (!warpValid) return;
      setWarpBusy(true);
      setWarpError(null);
      try {
        await onCreateWarp?.({ license: license.trim(), count: warpCount });
        onClose();
      } catch (err) {
        setWarpError(err instanceof Error ? err.message : String(err));
      } finally {
        setWarpBusy(false);
      }
    };
    return (
      <Modal
        isOpen={isOpen}
        onClose={warpBusy ? () => undefined : onClose}
        closeOnBackdropClick={false}
        className="max-w-md"
      >
        <ModalHeader
          title="Add WARP proxy"
          description="Each proxy registers its own Cloudflare WARP device and starts automatically"
          onClose={onClose}
        />
        <ModalBody className="flex flex-col gap-4 py-4">
          <Field
            label="Number of proxies"
            hint={!warpValid && <span className="text-[11px] text-error">1–10</span>}
          >
            <NumField value={warpCount} min={1} max={10} suffix="proxy" onChange={setWarpCount} />
          </Field>
          <Field
            label="WARP+ license key"
            hint={<span className="text-[10px] text-text-secondary">Optional</span>}
          >
            <input
              className={cn(INPUT, 'font-mono')}
              value={license}
              autoComplete="off"
              spellCheck={false}
              placeholder="Leave blank for free WARP"
              onChange={(e) => setLicense(e.target.value)}
            />
          </Field>
          <p className="text-[11px] leading-relaxed text-text-secondary">
            Creates local SOCKS5 proxies on 127.0.0.1. Registering a device can take a few seconds
            per proxy.
          </p>
          {warpError && (
            <p className="rounded-md bg-error/10 px-3 py-2 text-[11px] leading-relaxed text-error">
              {warpError}
            </p>
          )}
        </ModalBody>
        <ModalFooter className="items-center justify-end gap-2 border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={warpBusy}
            className="h-8 rounded-md bg-primary/10 px-3 text-xs font-medium text-text-secondary hover:bg-primary/20 hover:text-text-primary active:bg-primary/30 disabled:hover:bg-primary/10 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submitWarp()}
            disabled={!warpValid || warpBusy}
            className="flex h-8 items-center gap-1.5 rounded-md bg-primary/10 px-3 text-xs font-medium text-primary hover:bg-primary/20 active:bg-primary/30 disabled:opacity-50"
          >
            {warpBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            {warpBusy ? 'Creating…' : 'Create WARP proxy'}
          </button>
        </ModalFooter>
      </Modal>
    );
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative grid h-[min(92vh,max(780px,100vh))] w-[90vw] min-w-[1040px] max-w-full grid-cols-[280px_minmax(0,1fr)_460px] overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
          >
            <aside className="flex min-h-0 min-w-0 flex-col border-r border-border">
              <header className="flex h-16 shrink-0 items-center gap-2.5 border-b border-border px-5">
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg',
                    TONE_CLASS.info.icon,
                  )}
                >
                  <Layers className="h-4 w-4" />
                </span>
                <div className="flex flex-col">
                  <h2 className="text-sm font-semibold text-text-primary">Destination</h2>
                  <span className="text-[11px] text-text-secondary">
                    Where this proxy is stored
                  </span>
                </div>
              </header>
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
                <SourcePickerPanel
                  sources={normalSources}
                  value={sourceId}
                  onChange={setSourceId}
                />
              </div>
            </aside>

            <div className="flex min-h-0 min-w-0 flex-col">
              <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-5">
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg',
                      TONE_CLASS.primary.icon,
                    )}
                  >
                    <Plus className="h-4 w-4" />
                  </span>
                  <div className="flex flex-col">
                    <h2 className="text-sm font-semibold text-text-primary">Add proxy</h2>
                    <span className="text-[11px] text-text-secondary">
                      Connection details, classification and session settings
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-7 w-7 items-center justify-center rounded-md bg-text-secondary/10 text-text-secondary transition-colors hover:bg-error/15 hover:text-error"
                >
                  <X className="h-4 w-4" />
                </button>
              </header>

              <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
                <Section title="Connection" icon={Plug} tone="primary">
                  <div className="flex flex-col gap-3">
                    <Field
                      label="Quick paste"
                      hint={
                        quickError && (
                          <span className="text-[11px] text-error">Unrecognized format</span>
                        )
                      }
                    >
                      <div className="flex items-center gap-1.5">
                        <div className="relative min-w-0 flex-1">
                          <ClipboardPaste className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary" />
                          <input
                            value={quick}
                            spellCheck={false}
                            placeholder="socks5://user:pass@host:port  or  host:port:user:pass"
                            onChange={(e) => {
                              setQuick(e.target.value);
                              setQuickError(false);
                            }}
                            onPaste={(e) => {
                              e.preventDefault();
                              applyQuick(e.clipboardData.getData('text'));
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                applyQuick(quick);
                              }
                            }}
                            className={cn(INPUT, 'pl-9 font-mono', quickError && 'bg-error/10')}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => applyQuick(quick)}
                          disabled={!quick.trim()}
                          className="h-9 shrink-0 rounded-md bg-text-secondary/10 px-3 text-xs font-medium text-text-secondary transition-colors hover:bg-text-secondary/15 hover:text-text-primary disabled:opacity-50"
                        >
                          Fill
                        </button>
                      </div>
                    </Field>

                    <Field label="Protocol">
                      <div className="grid grid-cols-4 gap-1.5">
                        {PROTOCOLS.map((p: ProxyProtocol) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => set({ protocol: p })}
                            className={cn(
                              'h-9 rounded-md font-mono text-[11px] font-medium transition-colors',
                              draft.protocol === p
                                ? TONE_CLASS[PROTOCOL_META[p].tone].pill
                                : 'bg-text-secondary/10 text-text-secondary hover:bg-text-secondary/15',
                            )}
                          >
                            {PROTOCOL_META[p].label}
                          </button>
                        ))}
                      </div>
                    </Field>

                    <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-2.5">
                      <Field
                        label="Host"
                        hint={
                          hostError && <span className="text-[11px] text-error">Invalid host</span>
                        }
                      >
                        <input
                          className={cn(INPUT, 'font-mono', hostError && 'bg-error/10')}
                          value={draft.host}
                          spellCheck={false}
                          placeholder="123.45.67.89 or gw.provider.io"
                          onChange={(e) => set({ host: e.target.value })}
                        />
                      </Field>
                      <Field
                        label="Port"
                        hint={!portOk && <span className="text-[11px] text-error">1–65535</span>}
                      >
                        <input
                          className={cn(INPUT, 'font-mono', !portOk && 'bg-error/10')}
                          type="number"
                          value={draft.port}
                          onChange={(e) => set({ port: Number(e.target.value) })}
                        />
                      </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <Field label="Username (optional)">
                        <input
                          className={INPUT}
                          value={draft.username}
                          autoComplete="off"
                          onChange={(e) => set({ username: e.target.value })}
                        />
                      </Field>
                      <Field label="Password (optional)">
                        <div className="relative">
                          <input
                            className={cn(INPUT, 'pr-9')}
                            type={reveal ? 'text' : 'password'}
                            autoComplete="off"
                            value={draft.password}
                            onChange={(e) => set({ password: e.target.value })}
                          />
                          <button
                            type="button"
                            onClick={() => setReveal((v) => !v)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary transition-colors hover:text-text-primary"
                          >
                            {reveal ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </Field>
                    </div>
                  </div>
                </Section>

                <Section title="Classification" icon={Globe2} tone="info">
                  <div className="flex flex-col gap-3">
                    <Field label="Type">
                      <div className="grid grid-cols-2 gap-1.5">
                        {KINDS.map((k: ProxyKind) => {
                          const Icon = KIND_ICON[k];
                          const active = draft.kind === k;
                          return (
                            <button
                              key={k}
                              type="button"
                              onClick={() => set({ kind: k })}
                              className={cn(
                                'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors',
                                active
                                  ? 'bg-text-secondary/20'
                                  : 'bg-text-secondary/5 hover:bg-text-secondary/10',
                              )}
                            >
                              <span
                                className={cn(
                                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
                                  TONE_CLASS[KIND_META[k].tone].icon,
                                )}
                              >
                                <Icon className="h-4 w-4" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-xs font-medium text-text-primary">
                                  {KIND_META[k].label}
                                </span>
                                <span className="block truncate text-[10px] text-text-secondary">
                                  {KIND_META[k].description}
                                </span>
                              </span>
                              <span
                                className={cn(
                                  'h-1.5 w-1.5 shrink-0 rounded-full transition-opacity',
                                  TONE_CLASS[KIND_META[k].tone].dot,
                                  active ? 'opacity-100' : 'opacity-0',
                                )}
                              />
                            </button>
                          );
                        })}
                      </div>
                    </Field>

                    <div className="grid grid-cols-2 gap-2.5">
                      <Field label="Country">
                        <Select
                          value={draft.country}
                          options={countryOptions}
                          searchable
                          onChange={(v) => set({ country: v })}
                        />
                      </Field>
                      <Field label="Ownership">
                        <Select
                          value={draft.ownership}
                          options={ownershipOptions}
                          onChange={(v) => set({ ownership: v as ProxyOwnership })}
                        />
                      </Field>
                    </div>
                  </div>
                </Section>

                <Section title="Session & limits" icon={Layers} tone="warn">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-3 rounded-md bg-text-secondary/5 px-2.5 py-2">
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-text-primary">
                          Unlimited bandwidth
                        </div>
                        <div className="truncate text-[10px] text-text-secondary">
                          No data cap on this proxy
                        </div>
                      </div>
                      <Switch
                        checked={draft.quotaTotalGb === null}
                        onChange={(v) => set({ quotaTotalGb: v ? null : 100 })}
                      />
                    </div>
                    <div
                      className={cn(
                        'grid gap-2.5',
                        draft.quotaTotalGb !== null ? 'grid-cols-2' : 'grid-cols-1',
                      )}
                    >
                      {draft.quotaTotalGb !== null && (
                        <Field label="Bandwidth limit">
                          <NumField
                            value={draft.quotaTotalGb}
                            min={1}
                            suffix="GB"
                            onChange={(v) => set({ quotaTotalGb: v })}
                          />
                        </Field>
                      )}
                      <Field
                        label="Expiry (optional)"
                        hint={
                          exp && (
                            <button
                              type="button"
                              onClick={() => set({ expiresAt: null })}
                              className="flex items-center gap-1 text-[11px] text-text-secondary transition-colors hover:text-text-primary"
                            >
                              <X className="h-3 w-3" />
                              Clear
                            </button>
                          )
                        }
                      >
                        <Dropdown>
                          <DropdownTrigger asChild>
                            <button
                              type="button"
                              className={cn(
                                INPUT,
                                'flex items-center justify-between gap-2 text-left hover:bg-text-secondary/15',
                              )}
                            >
                              <span className="flex min-w-0 items-center gap-2 truncate font-mono">
                                <CalendarDays className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
                                {exp
                                  ? `${exp.date} ${pad2(exp.hour)}:${pad2(exp.minute)}`
                                  : 'No expiry'}
                              </span>
                              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
                            </button>
                          </DropdownTrigger>
                          <DropdownContent className="w-[264px]">
                            <Calendar
                              value={exp?.date ?? null}
                              onChange={(date) => setExpiry({ date })}
                            />
                            <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
                              <span className="text-[11px] font-medium text-text-secondary">
                                Time (24h)
                              </span>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min={0}
                                  max={23}
                                  disabled={!exp}
                                  value={pad2(exp?.hour ?? 23)}
                                  onChange={(e) =>
                                    setExpiry({ hour: clampTime(e.target.value, 23) })
                                  }
                                  className="h-7 w-12 rounded-md bg-text-secondary/10 px-2 text-center font-mono text-xs text-text-primary outline-none focus:bg-text-secondary/15 disabled:opacity-50"
                                />
                                <span className="text-xs text-text-secondary">:</span>
                                <input
                                  type="number"
                                  min={0}
                                  max={59}
                                  disabled={!exp}
                                  value={pad2(exp?.minute ?? 59)}
                                  onChange={(e) =>
                                    setExpiry({ minute: clampTime(e.target.value, 59) })
                                  }
                                  className="h-7 w-12 rounded-md bg-text-secondary/10 px-2 text-center font-mono text-xs text-text-primary outline-none focus:bg-text-secondary/15 disabled:opacity-50"
                                />
                              </div>
                            </div>
                          </DropdownContent>
                        </Dropdown>
                      </Field>
                    </div>
                  </div>
                </Section>
              </div>

              <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-5 py-3.5">
                <span
                  className={cn(
                    'flex items-center gap-1.5 text-[11px]',
                    !valid
                      ? 'text-warn'
                      : test.status === 'ok'
                        ? 'text-success'
                        : test.status === 'fail'
                          ? 'text-error'
                          : 'text-text-secondary',
                  )}
                >
                  {valid && test.status === 'testing' ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : valid && test.status === 'ok' ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : valid && test.status === 'fail' ? (
                    <XCircle className="h-3 w-3" />
                  ) : (
                    <KeyRound className="h-3 w-3" />
                  )}
                  {!valid
                    ? 'Enter a valid host and port to continue'
                    : test.status === 'testing'
                      ? 'Testing connection…'
                      : test.status === 'ok'
                        ? `Reachable · ${test.ms} ms`
                        : test.status === 'fail'
                          ? 'Connection timed out'
                          : 'Ready to add'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="h-8 rounded-md bg-primary/10 px-3 text-xs font-medium text-text-secondary hover:bg-primary/20 hover:text-text-primary active:bg-primary/30"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={!valid || !sourceId}
                    className="flex h-8 items-center gap-1.5 rounded-md bg-primary/10 px-3 text-xs font-medium text-primary hover:bg-primary/20 active:bg-primary/30 disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add proxy
                  </button>
                </div>
              </footer>
            </div>

            <aside className="flex min-h-0 min-w-0 flex-col border-l border-border">
              <header className="flex h-16 shrink-0 items-center gap-2.5 border-b border-border px-5">
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg',
                    TONE_CLASS.success.icon,
                  )}
                >
                  <Globe2 className="h-4 w-4" />
                </span>
                <div className="flex flex-col">
                  <h2 className="text-sm font-semibold text-text-primary">Proxy info</h2>
                  <span className="text-[11px] text-text-secondary">
                    Live lookup of the entered proxy
                  </span>
                </div>
              </header>
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
                <ProxyInfoPanel
                  host={host}
                  port={draft.port}
                  protocol={draft.protocol}
                  ready={valid}
                />
              </div>
            </aside>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export default CreateProxyModal;
