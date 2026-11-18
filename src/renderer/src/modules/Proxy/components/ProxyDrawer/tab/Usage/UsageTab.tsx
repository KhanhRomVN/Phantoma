import { Calendar, FileText, Lock, Share2, Tag, Users } from 'lucide-react';
import type { Proxy } from '../../../../types';
import { formatDateTime } from '../../../../utils/format';
import { Pill, UserStack } from '../../../common/ProxyBits';
import { Empty, InfoRow, Section, StatCard } from '../../common/Section';

export function UsageTab({ proxy }: { proxy: Proxy }) {
  const private_ = proxy.ownership === 'private';
  return (
    <div className='flex flex-col gap-3'>
      <div className='grid grid-cols-3 gap-2.5'>
        <StatCard label='Profiles' icon={Users} tone={proxy.usedBy.length > 0 ? 'primary' : 'muted'} value={proxy.usedBy.length} />
        <StatCard label='Tags' icon={Tag} tone={proxy.tags.length > 0 ? 'info' : 'muted'} value={proxy.tags.length} />
        <StatCard label='Ownership' icon={private_ ? Lock : Share2} tone={private_ ? 'warn' : 'success'} value={private_ ? 'Private' : 'Shared'} />
      </div>

      <Section title={`Used by · ${proxy.usedBy.length}`} icon={Users} tone='primary'>
        {proxy.usedBy.length === 0 ? (
          <Empty text='Not assigned to any profile.' icon={Users} />
        ) : (
          <div className='grid grid-cols-2 gap-1.5'>
            {proxy.usedBy.map((n) => (
              <div key={n} className='flex min-w-0 items-center gap-2 rounded-md bg-text-secondary/5 px-2 py-1.5 text-xs'>
                <UserStack names={[n]} />
                <span className='truncate text-text-primary'>{n}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title='Tags' icon={Tag} tone='info'>
        {proxy.tags.length === 0 ? (
          <span className='text-xs text-text-secondary'>No tags</span>
        ) : (
          <div className='flex flex-wrap gap-1.5'>
            {proxy.tags.map((t) => (
              <Pill key={t} tone='info'>
                {t}
              </Pill>
            ))}
          </div>
        )}
      </Section>

      <Section title='Notes' icon={FileText} tone='warn'>
        <p className='whitespace-pre-wrap text-xs leading-relaxed text-text-secondary'>{proxy.notes || 'No notes.'}</p>
      </Section>

      <Section title='Meta' icon={Calendar} tone='muted'>
        <InfoRow label='Ownership'>{private_ ? 'Private' : 'Shared'}</InfoRow>
        <InfoRow label='Source'>{proxy.sourceId}</InfoRow>
        <InfoRow label='Added'>{formatDateTime(proxy.createdAt)}</InfoRow>
      </Section>
    </div>
  );
}

export default UsageTab;