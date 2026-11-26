import { Loader2 } from 'lucide-react';
import type { FootprintPreset } from '@renderer/services/fingerprint-generator';
import type { DetailTab, ProxyItem } from '../../../../../shared/types';
import { CenteredState } from './CenteredState';
import { Segmented } from './DetailBits';
import { FootprintDetailPanel } from './FootprintDetailPanel';
import { ProxyDetailPanel } from './ProxyDetailPanel';

interface DetailPanelProps {
  tab: DetailTab;
  onTabChange: (t: DetailTab) => void;
  proxy: ProxyItem | null;
  preset: FootprintPreset | null;
}

export function DetailPanel({ tab, onTabChange, proxy, preset }: DetailPanelProps) {
  const footprintSubtitle = preset ? `${preset.name} · ${preset.browser}` : 'Reading device fingerprint…';
  const subtitle = tab === 'proxy' ? (proxy ? `${proxy.name} · ${proxy.protocol}` : 'Direct connection, no proxy') : footprintSubtitle;

  return (
    <aside className='flex min-h-0 min-w-0 flex-col border-l border-border'>
      <div className='flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border px-4'>
        <div className='flex min-w-0 flex-col'>
          <span className='text-sm font-semibold text-text-primary'>Details</span>
          <span className='truncate text-[11px] text-text-secondary'>{subtitle}</span>
        </div>
        <Segmented<DetailTab>
          value={tab}
          onChange={onTabChange}
          options={[
            { id: 'proxy', label: 'Proxy' },
            { id: 'fingerprint', label: 'Fingerprint' },
          ]}
        />
      </div>
      <div className='flex min-h-0 flex-1 flex-col overflow-y-auto p-4'>
        {tab === 'proxy' ? (
          <ProxyDetailPanel proxy={proxy} />
        ) : preset ? (
          <FootprintDetailPanel preset={preset} proxy={proxy} />
        ) : (
          <CenteredState icon={Loader2} spin title='Reading device' text="Collecting this machine's fingerprint…" />
        )}
      </div>
    </aside>
  );
}

export default DetailPanel;