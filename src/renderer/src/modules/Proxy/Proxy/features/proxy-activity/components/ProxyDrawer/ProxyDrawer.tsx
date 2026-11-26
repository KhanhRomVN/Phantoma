import { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, ChevronRight, History, LayoutDashboard, Link2, Loader2, Plug, Trash2, Unplug, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { COUNTRY_NAME } from '../../../../shared/constants/proxy-meta.constants';
import { TONE_CLASS } from '../../../../shared/constants/tone.constants';
import type { Proxy, ProxyStatus, Tone } from '../../../../shared/types/proxy-domain.types';
import { hueOf } from '../../../../shared/utils/color';
import { buildProxyUrl, flag } from '../../../../shared/utils/format';
import { KindIcon, KindTag, ProtocolTag, StatusBadge } from '../../../../shared/components/ProxyBits';
import { CopyText } from '../../../../shared/components/Section';
import { OverviewTab } from './tabs/OverviewTab';
import { ConnectionTab } from './tabs/ConnectionTab';
import { UsageTab } from './tabs/UsageTab';
import { HistoryTab } from './tabs/HistoryTab';

interface ProxyDrawerProps {
  proxy: Proxy;
  testing: boolean;
  onClose: () => void;
  onTest: (proxy: Proxy) => void;
  onDelete: (proxy: Proxy) => void;
}

type TabId = 'overview' | 'connection' | 'usage' | 'history';

const SOFT_BTN = 'h-8 shrink-0 rounded-md bg-text-secondary/10 text-text-secondary hover:bg-text-secondary/15 active:bg-text-secondary/20';

export function ProxyDrawer({ proxy, testing, onClose, onTest, onDelete }: ProxyDrawerProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const status: ProxyStatus = testing ? 'testing' : proxy.status;
  const hue = hueOf(proxy.id);

  const tabs: { id: TabId; label: string; icon: LucideIcon; tone: Tone; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, tone: 'primary' },
    { id: 'connection', label: 'Connection', icon: Plug, tone: 'warn' },
    { id: 'usage', label: 'Usage', icon: Unplug, tone: 'success', count: proxy.usedBy.length },
    { id: 'history', label: 'History', icon: History, tone: 'info', count: proxy.checks.length },
  ];

  return (
    <div className='flex h-full min-h-0 w-full flex-col'>
      <div className='relative shrink-0 overflow-hidden bg-card-background'>
        <div
          aria-hidden
          className='pointer-events-none absolute inset-0'
          style={{
            background: `radial-gradient(120% 100% at 0% 0%, hsl(${hue} 70% 55% / 0.22), transparent 60%), radial-gradient(80% 80% at 100% 0%, hsl(${(hue + 70) % 360} 70% 55% / 0.12), transparent 65%)`,
          }}
        />

        <div className='relative flex h-10 items-center justify-between border-b border-border px-4'>
          <nav className='flex min-w-0 items-center gap-1 text-[11px] text-text-secondary'>
            <span className='shrink-0'>Proxies</span>
            <ChevronRight className='h-3 w-3 shrink-0 opacity-60' />
            <span className='truncate font-medium text-text-primary'>{proxy.name}</span>
          </nav>
          <button
            type='button'
            onClick={onClose}
            className='flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-background/60 text-text-secondary backdrop-blur transition-colors hover:bg-error/15 hover:text-error'
          >
            <X className='h-4 w-4' />
          </button>
        </div>

        <div className='relative flex flex-col gap-3.5 px-4 pb-4 pt-4'>
          <div className='grid grid-cols-[44px_minmax(0,1fr)] items-center gap-3'>
            <KindIcon kind={proxy.kind} size={44} />
            <div className='flex min-w-0 flex-col gap-1'>
              <div className='flex min-w-0 items-center gap-2'>
                <h2 className='min-w-0 truncate text-base font-semibold leading-6 text-text-primary'>{proxy.name}</h2>
                <StatusBadge status={status} />
              </div>
              <div className='flex min-w-0 items-center gap-2 text-xs leading-4 text-text-secondary'>
                <CopyText value={`${proxy.host}:${proxy.port}`} />
                <span className='h-0.5 w-0.5 shrink-0 rounded-full bg-text-secondary/60' />
                <span className='min-w-0 truncate'>
                  {flag(proxy.country)} {proxy.city}, {COUNTRY_NAME[proxy.country] ?? proxy.country}
                </span>
              </div>
            </div>
          </div>

          <div className='flex flex-wrap items-center gap-1.5'>
            <ProtocolTag protocol={proxy.protocol} />
            <KindTag kind={proxy.kind} />
          </div>

          <div className='flex items-center gap-1.5'>
            <button
              type='button'
              onClick={() => onTest(proxy)}
              disabled={testing}
              className='flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md bg-primary/10 text-xs font-medium text-primary transition-colors hover:bg-primary/20 active:bg-primary/30 disabled:opacity-60'
            >
              {testing ? <Loader2 className='h-3.5 w-3.5 animate-spin' /> : <Activity className='h-3.5 w-3.5' />}
              Test connection
            </button>
            <button
              type='button'
              onClick={() => void navigator.clipboard.writeText(buildProxyUrl(proxy, true)).catch(() => undefined)}
              className={cn(SOFT_BTN, 'flex items-center gap-1.5 px-3 text-xs font-medium transition-colors')}
            >
              <Link2 className='h-3.5 w-3.5' />
              Copy URL
            </button>
            <button
              type='button'
              onClick={() => onDelete(proxy)}
              className='flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-error/15 px-3 text-xs font-medium text-error transition-colors hover:bg-error/20 active:bg-error/25'
            >
              <Trash2 className='h-3.5 w-3.5' />
              Delete
            </button>
          </div>
        </div>
      </div>

      <div className='flex shrink-0 gap-1 border-b border-border px-3'>
        {tabs.map((t) => (
          <button
            key={t.id}
            type='button'
            onClick={() => setTab(t.id)}
            className={cn(
              'relative flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium transition-colors',
              tab === t.id ? TONE_CLASS[t.tone].text : 'text-text-secondary hover:text-text-primary',
            )}
          >
            <t.icon className='h-3.5 w-3.5' />
            {t.label}
            {t.count !== undefined && (
              <span className='rounded-md bg-text-secondary/10 px-1.5 text-[10px] tabular-nums text-text-secondary'>{t.count}</span>
            )}
            {tab === t.id && (
              <motion.span
                layoutId='proxy-tab-underline'
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className={cn('absolute inset-x-2 -bottom-px h-0.5 rounded-full', TONE_CLASS[t.tone].dot)}
              />
            )}
          </button>
        ))}
      </div>

      <div className='flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-3'>
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          className='flex flex-1 flex-col'
        >
          {tab === 'overview' && <OverviewTab proxy={proxy} />}
          {tab === 'connection' && <ConnectionTab proxy={proxy} />}
          {tab === 'usage' && <UsageTab proxy={proxy} />}
          {tab === 'history' && <HistoryTab proxy={proxy} />}
        </motion.div>
      </div>
    </div>
  );
}

export default ProxyDrawer;