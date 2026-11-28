import { Fingerprint, Network, Play, Rocket, X } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Button } from '@renderer/components/ui/Button';

import { TONE_CLASS } from '../../../../../shared/constants/tone.constants';
import { CANCEL_BTN, CONFIRM_BTN } from '../../../../../shared/components/FormBits';

import type { FootprintPreset } from '@renderer/services/fingerprint-generator';
import type { Fork, ProxyItem } from '../../../../../shared/types';
import { flagEmoji } from '../../../utils/proxy.util';
import { Block } from './ConfigBits';

import { FootprintPicker } from './FootprintPicker';
import { LifecycleBlock } from './LifecycleBlock';
import { ProxyPicker } from './ProxyPicker';

interface ConfigPanelProps {
  isChrome: boolean;
  fork: Fork | null;
  proxy: ProxyItem | null;
  onProxyChange: (p: ProxyItem | null) => void;
  preset: FootprintPreset | null;
  onPresetChange: (p: FootprintPreset | null) => void;
  flags: Record<string, boolean>;
  onFlag: (id: string, v: boolean) => void;
  summary: string[];
  onClose: () => void;
  onLaunch: () => void;
}

export function ConfigPanel({
  isChrome,
  fork,
  proxy,
  onProxyChange,
  preset,
  onPresetChange,
  flags,
  onFlag,
  summary,
  onClose,
  onLaunch,
}: ConfigPanelProps) {
  return (
    <div className='flex min-h-0 min-w-0 flex-col'>
      <header className='flex h-16 shrink-0 items-center justify-between border-b border-border px-5'>
        <div className='flex items-center gap-2.5'>
          <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', TONE_CLASS.primary.icon)}>
            <Rocket className='h-4 w-4' />
          </span>
          <div className='flex flex-col'>
            <h2 className='text-sm font-semibold text-text-primary'>Launch Browser</h2>
            <span className='text-[11px] text-text-secondary'>
              {isChrome ? 'Chrome · uses the real device footprint' : `${fork?.name ?? 'Chromium'} · custom proxy & footprint`}
            </span>
          </div>
        </div>
        <button
          type='button'
          onClick={onClose}
          className='flex h-7 w-7 items-center justify-center rounded-md bg-text-secondary/10 text-text-secondary transition-colors hover:bg-error/15 hover:text-error'
        >
          <X className='h-4 w-4' />
        </button>
      </header>

      <div className='flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4'>
        {!isChrome && (
          <>
            <Block
              title='Proxy'
              icon={Network}
              tone='info'
              aside={
                <span className='flex items-center gap-1.5 text-[11px] text-text-secondary'>
                  {proxy ? (
                    <>
                      <span className='text-sm leading-none'>{flagEmoji(proxy.countryCode)}</span>
                      <span className='max-w-[220px] truncate'>{proxy.name}</span>
                    </>
                  ) : (
                    'Direct connection'
                  )}

                </span>
              }
            >
              <ProxyPicker value={proxy} onChange={onProxyChange} />
            </Block>

            <Block title='Footprint' icon={Fingerprint} tone='primary' aside={<span className='text-[11px] text-text-secondary'>{preset?.name ?? 'System footprint'}</span>}>
              <FootprintPicker value={preset} onChange={onPresetChange} proxy={proxy} />
            </Block>
          </>
        )}

        <LifecycleBlock isChrome={isChrome} flags={flags} onFlag={onFlag} />
      </div>

      <footer className='flex shrink-0 items-center justify-between gap-3 border-t border-border px-5 py-3.5'>
        <div className='flex min-w-0 flex-wrap items-center gap-1.5'>
          {summary.map((s, i) => (
            <span key={i} className='max-w-[180px] truncate rounded-md bg-text-secondary/10 px-2 py-1 text-[11px] text-text-secondary'>
              {s}
            </span>
          ))}
        </div>
        <div className='flex shrink-0 items-center gap-2'>
          <Button className={cn('h-9 rounded-md', CANCEL_BTN)} onClick={onClose}>
            Cancel
          </Button>
          <Button className={cn('h-9 rounded-md', CONFIRM_BTN)} onClick={onLaunch}>
            <Play className='h-3.5 w-3.5' />
            Launch
          </Button>
        </div>
      </footer>
    </div>
  );
}

export default ConfigPanel;