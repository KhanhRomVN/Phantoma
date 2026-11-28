/**
 * Nội dung cột giữa của LaunchTargetModal: chọn capture method (card
 * theo nhóm), profile, sudo password, proxy và footprint.
 */

import React from 'react';
import {
  Activity,
  Cpu,
  Fingerprint,
  Globe,
  Key,
  Loader2,
  Lock,
  Monitor,
  Network,
  Plug,
  Shield,
  Square,
  Syringe,
  User,
  Zap,
} from 'lucide-react';

import { cn } from '@renderer/utils/cn';
import { flagEmoji } from '@renderer/components/common/LaunchConfig/utils/proxy';
import { Block } from '@renderer/components/common/LaunchConfig/picker/ConfigBits';
import { ProxyPicker } from '@renderer/components/common/LaunchConfig/picker/ProxyPicker';
import { FootprintPicker } from '@renderer/components/common/LaunchConfig/picker/FootprintPicker';
import type { ProxyItem } from '@renderer/components/common/LaunchConfig/types';
import type { FootprintPreset } from '@renderer/services/fingerprint-generator';

import { ProfilePicker } from './ProfilePicker';

export type MethodTone = 'success' | 'info' | 'primary' | 'warn' | 'error';

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Monitor,
  Shield,
  Syringe,
  Zap,
  Network,
  Activity,
  Cpu,
  Plug,
  Key,
  Globe,
};

// Giữ lại để tương thích với nơi import cũ
export const METHOD_RGB: Record<string, string> = {
  cdp: '14, 165, 233',
  'mitm-normal': '16, 185, 129',
  'mitm-env': '139, 92, 246',
  frida: '236, 72, 153',
  ebpf: '245, 158, 11',
  pcap: '99, 102, 241',
  'app-debug': '20, 184, 166',
  stop: '239, 68, 68',
};

export const TONE_STYLE: Record<
  MethodTone,
  { icon: string; card: string; dot: string; text: string; chip: string; bar: string }
> = {
  success: {
    icon: 'bg-success/15 text-success',
    card: 'bg-success/10 ring-1 ring-inset ring-success/40',
    dot: 'bg-success',
    text: 'text-success',
    chip: 'bg-success/10 text-success',
    bar: 'bg-success',
  },
  info: {
    icon: 'bg-info/15 text-info',
    card: 'bg-info/10 ring-1 ring-inset ring-info/40',
    dot: 'bg-info',
    text: 'text-info',
    chip: 'bg-info/10 text-info',
    bar: 'bg-info',
  },
  primary: {
    icon: 'bg-primary/15 text-primary',
    card: 'bg-primary/10 ring-1 ring-inset ring-primary/40',
    dot: 'bg-primary',
    text: 'text-primary',
    chip: 'bg-primary/10 text-primary',
    bar: 'bg-primary',
  },
  warn: {
    icon: 'bg-warn/15 text-warn',
    card: 'bg-warn/10 ring-1 ring-inset ring-warn/40',
    dot: 'bg-warn',
    text: 'text-warn',
    chip: 'bg-warn/10 text-warn',
    bar: 'bg-warn',
  },
  error: {
    icon: 'bg-error/15 text-error',
    card: 'bg-error/10 ring-1 ring-inset ring-error/40',
    dot: 'bg-error',
    text: 'text-error',
    chip: 'bg-error/10 text-error',
    bar: 'bg-error',
  },
};

export const METHOD_TONE: Record<string, MethodTone> = {
  cdp: 'info',
  'mitm-normal': 'success',
  'mitm-env': 'primary',
  frida: 'warn',
  ebpf: 'success',
  pcap: 'info',
  'app-debug': 'success',
  'memory-analysis': 'info',
  'dynamic-instrumentation': 'primary',
  'ld-preload': 'warn',
  sslkeylogfile: 'info',
  'mitm-proxy': 'primary',
  stop: 'error',
};

const FALLBACK_TONES: MethodTone[] = ['info', 'success', 'primary', 'warn'];

export const getMethodTone = (id: string, index = 0): MethodTone =>
  METHOD_TONE[id] ?? FALLBACK_TONES[index % FALLBACK_TONES.length];

const METHOD_GROUP: Record<string, string> = {
  ebpf: 'Kernel level',
  'memory-analysis': 'Process level',
  'dynamic-instrumentation': 'Process level',
  'ld-preload': 'Process level',
  sslkeylogfile: 'Network level',
  'mitm-proxy': 'Network level',
};

const METHOD_TOOLS: Record<string, string[]> = {
  ebpf: ['eCapture', 'sslsniff', 'Qtap'],
  cdp: ['DevTools Protocol', 'Chromium'],
  'mitm-normal': ['mitmproxy', 'Burp Suite', 'PolarProxy'],
};

export interface CaptureMethodMeta {
  id: string;
  label: string;
  description: string;
  icon?: string;
  color?: string;
  recommended?: boolean;
  tools?: string[];
  implemented?: boolean;
  ratings?: { dataQuality: number; authCompat: number; complexity: number };
  pros?: string[];
  cons?: string[];
  limitations?: string;
}

interface MethodPanelProps {
  isRunning: boolean;
  loadingMethods: boolean;
  methods: CaptureMethodMeta[];
  selectedAction: string | null;
  onSelectAction: (id: string) => void;
  showProfile: boolean;
  profilePath: string;
  onProfileChange: (path: string) => void;
  showProxy: boolean;
  showFootprint: boolean;
  proxy: ProxyItem | null;
  onProxyChange: (p: ProxyItem | null) => void;
  preset: FootprintPreset | null;
  onPresetChange: (p: FootprintPreset | null) => void;
  sudoPassword: string;
  onSudoPasswordChange: (v: string) => void;
}

const MethodCard: React.FC<{
  icon: React.ComponentType<any>;
  label: string;
  description: string;
  tone: MethodTone;
  selected: boolean;
  recommended?: boolean;
  soon?: boolean;
  tools?: string[];
  onClick: () => void;
}> = ({ icon: Icon, label, description, tone, selected, recommended, soon, tools, onClick }) => {
  const s = TONE_STYLE[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-full w-full items-start gap-3 rounded-xl bg-background/60 p-3 text-left transition-colors hover:bg-dropdown-item-hover/60',
        selected
          ? cn(' outline-1 -outline-offset-1 outline-dashed outline-current', s.text)
          : 'outline-none',
      )}
    >
      <span
        className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', s.icon)}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[13px] font-semibold text-text-primary">{label}</span>
          {recommended && (
            <span className="shrink-0 rounded-md bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success">
              Recommended
            </span>
          )}
          {soon && (
            <span className="shrink-0 rounded-md bg-text-secondary/10 px-1.5 py-0.5 text-[10px] font-medium text-text-secondary">
              Soon
            </span>
          )}
        </span>
        <span className="text-[11px] leading-snug text-text-secondary">{description}</span>
        {tools && tools.length > 0 && (
          <span className="mt-0.5 flex flex-wrap gap-1">
            {tools.map((t) => (
              <span
                key={t}
                className="rounded-md bg-text-secondary/10 px-1.5 py-0.5 font-mono text-[10px] text-text-secondary"
              >
                {t}
              </span>
            ))}
          </span>
        )}
      </span>
      <span
        className={cn(
          'mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors',
          selected ? 'border-transparent bg-text-primary/10' : 'border-text-secondary/40',
        )}
      >
        {selected && <span className={cn('h-2 w-2 rounded-full', s.dot)} />}
      </span>
    </button>
  );
};

export function MethodPanel({
  isRunning,
  loadingMethods,
  methods,
  selectedAction,
  onSelectAction,
  showProfile,
  profilePath,
  onProfileChange,
  showProxy,
  showFootprint,
  proxy,
  onProxyChange,
  preset,
  onPresetChange,
  sudoPassword,
  onSudoPasswordChange,
}: MethodPanelProps) {
  const needsSudo = (selectedAction === 'ebpf' || selectedAction === 'pcap') && !isRunning;

  const renderMethods = () => {
    if (isRunning) {
      return (
        <MethodCard
          icon={Square}
          label="Stop target"
          description="Stop the running target session"
          tone="error"
          selected={selectedAction === 'stop'}
          onClick={() => onSelectAction('stop')}
        />
      );
    }
    if (loadingMethods) {
      return (
        <div className="flex items-center justify-center gap-2 py-6 text-xs text-text-secondary">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading methods...
        </div>
      );
    }
    if (methods.length === 0) {
      return (
        <div className="py-6 text-center text-xs text-text-secondary">
          No capture methods available for this platform
        </div>
      );
    }

    const groups: { name: string; items: { m: CaptureMethodMeta; i: number }[] }[] = [];
    methods.forEach((m, i) => {
      const name = METHOD_GROUP[m.id] ?? '';
      let g = groups.find((x) => x.name === name);
      if (!g) {
        g = { name, items: [] };
        groups.push(g);
      }
      g.items.push({ m, i });
    });

    return groups.map((g) => (
      <div key={g.name || 'all'} className="grid grid-cols-2 gap-2 min-[1400px]:grid-cols-3">
        {g.name && (
          <div className="col-span-full flex items-center gap-2 px-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
            <span>{g.name}</span>
            <span className="h-px flex-1 bg-text-secondary/15" />
          </div>
        )}
        {g.items.map(({ m, i }) => (
          <MethodCard
            key={m.id}
            icon={(m.icon && ICON_MAP[m.icon]) || Shield}
            label={m.label}
            description={m.description}
            tone={getMethodTone(m.id, i)}
            recommended={m.recommended}
            soon={m.implemented === false}
            tools={m.tools ?? METHOD_TOOLS[m.id]}
            selected={selectedAction === m.id}
            onClick={() => onSelectAction(m.id)}
          />
        ))}
      </div>
    ));
  };

  return (
    <>
      <Block
        title={isRunning ? 'Actions' : 'HTTPS capture method'}
        icon={Shield}
        tone="success"
        aside={
          !isRunning && methods.length > 0 ? (
            <span className="rounded-md bg-text-secondary/10 px-1.5 py-0.5 text-[10px] font-medium text-text-secondary">
              {methods.length} methods
            </span>
          ) : undefined
        }
      >
        <div className="flex flex-col gap-2">{renderMethods()}</div>
      </Block>

      {showProfile && (
        <Block title="Browser profile" icon={User} tone="primary">
          <ProfilePicker value={profilePath} onChange={onProfileChange} />
        </Block>
      )}

      {needsSudo && (
        <Block title="Sudo password" icon={Lock} tone="warn">
          <input
            type="text"
            autoComplete="off"
            value={sudoPassword}
            onChange={(e) => onSudoPasswordChange(e.target.value)}
            placeholder="Enter your sudo password..."
            className="h-[42px] w-full rounded-lg bg-background px-3 text-sm text-text-primary outline-none"
          />
        </Block>
      )}

      {showProxy && (
        <Block
          title="Proxy"
          icon={Network}
          tone="info"
          aside={
            <span className="flex items-center gap-1.5 text-[11px] text-text-secondary">
              {proxy ? (
                <>
                  <span className="text-sm leading-none">{flagEmoji(proxy.countryCode)}</span>
                  <span className="max-w-[220px] truncate">{proxy.name}</span>
                </>
              ) : (
                'Direct connection'
              )}
            </span>
          }
        >
          <ProxyPicker value={proxy} onChange={onProxyChange} />
        </Block>
      )}

      {showFootprint && (
        <Block
          title="Footprint"
          icon={Fingerprint}
          tone="primary"
          aside={
            <span className="text-[11px] text-text-secondary">
              {preset?.name ?? 'System footprint'}
            </span>
          }
        >
          <FootprintPicker value={preset} onChange={onPresetChange} proxy={proxy} />
        </Block>
      )}
    </>
  );
}

export default MethodPanel;
