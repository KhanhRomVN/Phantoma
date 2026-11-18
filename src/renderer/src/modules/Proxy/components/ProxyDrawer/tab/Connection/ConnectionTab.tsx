import { useState } from 'react';
import { Eye, EyeOff, KeyRound, Layers, Link2, RefreshCw, Terminal, Timer, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Proxy } from '../../../../types';
import { buildProxyUrl } from '../../../../utils/format';
import { ProtocolTag } from '../../../common/ProxyBits';
import { CopyText, InfoRow, Section } from '../../common/Section';

function RevealButton({ reveal, onToggle }: { reveal: boolean; onToggle: () => void }) {
  return (
    <button
      type='button'
      onClick={onToggle}
      className='flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-text-secondary/10 text-text-secondary transition-colors hover:bg-text-secondary/15 hover:text-text-primary'
    >
      {reveal ? <EyeOff className='h-3.5 w-3.5' /> : <Eye className='h-3.5 w-3.5' />}
    </button>
  );
}

function CodeBlock({ value, display }: { value: string; display: string }) {
  return (
    <div className='rounded-md bg-text-secondary/10 px-2.5 py-2 text-xs'>
      <div className='min-w-0 break-all'>
        <CopyText value={value} display={display} />
      </div>
    </div>
  );
}

function Tile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className='flex flex-col gap-1 rounded-md bg-text-secondary/5 p-2.5'>
      <Icon className='h-3.5 w-3.5 text-text-secondary' />
      <span className='text-[10px] uppercase tracking-wide text-text-secondary'>{label}</span>
      <span className='text-xs font-semibold tabular-nums text-text-primary'>{value}</span>
    </div>
  );
}

export function ConnectionTab({ proxy }: { proxy: Proxy }) {
  const [reveal, setReveal] = useState(false);
  const url = buildProxyUrl(proxy, true);
  const curlReal = `curl -x ${url} https://api.ipify.org`;
  const curlShown = `curl -x ${buildProxyUrl(proxy, reveal)} https://api.ipify.org`;

  return (
    <div className='flex flex-col gap-3'>
      <Section
        title='Proxy URL'
        icon={Link2}
        tone='primary'
        action={proxy.username ? <RevealButton reveal={reveal} onToggle={() => setReveal((v) => !v)} /> : undefined}
      >
        <div className='flex flex-col gap-2'>
          <CodeBlock value={url} display={buildProxyUrl(proxy, reveal)} />
          <div className='flex items-center gap-1.5 text-[11px] text-text-secondary'>
            <Terminal className='h-3 w-3' />
            Test from terminal
          </div>
          <CodeBlock value={curlReal} display={curlShown} />
        </div>
      </Section>

      <Section title='Credentials' icon={KeyRound} tone='warn'>
        <InfoRow label='Protocol'>
          <ProtocolTag protocol={proxy.protocol} />
        </InfoRow>
        <InfoRow label='Host'>
          <CopyText value={proxy.host} />
        </InfoRow>
        <InfoRow label='Port'>
          <CopyText value={String(proxy.port)} />
        </InfoRow>
        <InfoRow label='Username'>
          {proxy.username ? <CopyText value={proxy.username} /> : <span className='text-text-secondary'>None</span>}
        </InfoRow>
        <InfoRow label='Password'>
          {proxy.password ? (
            <CopyText value={proxy.password} display={reveal ? proxy.password : '••••••••••'} />
          ) : (
            <span className='text-text-secondary'>None</span>
          )}
        </InfoRow>
      </Section>

      <Section title='Session' icon={Layers} tone='info'>
        <div className='grid grid-cols-3 gap-2'>
          <Tile icon={Timer} label='Sticky' value={proxy.stickyEnabled ? `${proxy.stickyTtlMin} min` : 'Off'} />
          <Tile icon={RefreshCw} label='Rotation' value={proxy.rotationMin > 0 ? `${proxy.rotationMin} min` : 'Off'} />
          <Tile icon={Users} label='Max conns' value={String(proxy.maxConns)} />
        </div>
      </Section>
    </div>
  );
}

export default ConnectionTab;