import type { IPServerData } from '../types/ip-server-data';
import React from 'react';
import { cn } from '../../../../../../../shared/lib/utils';

function SectionHeader({ accent = '#0af', children }: { accent?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="w-1 h-4 rounded-full" style={{ backgroundColor: accent }} />
      <h3 className="text-[12px] font-bold uppercase tracking-[0.1em] text-[#c8d6f0] font-mono">
        {children}
      </h3>
    </div>
  );
}

function KV({ k, v, vc = 'text-[#c8d6f0]' }: { k: string; v: string | number | React.ReactNode; vc?: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-[#111827] last:border-0">
      <span className="text-[11px] font-mono text-[#c8d6f0] uppercase tracking-wide">{k}</span>
      <span className={cn('text-[12px] font-mono', vc)}>{v}</span>
    </div>
  );
}

function StatBox({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent: string }) {
  return (
    <div className="bg-[#0d1017] border border-[#1c2333] rounded p-2.5 flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-widest font-mono text-[#c8d6f0]">{label}</span>
      <span className="text-[16px] font-bold font-mono leading-none" style={{ color: accent }}>
        {value}
      </span>
      {sub && <span className="text-[9px] font-mono text-[#c8d6f0]">{sub}</span>}
    </div>
  );
}

export function OSDetection({ data }: { data: IPServerData }) {
  const { osDetection } = data;
  
  const uptimeDays = osDetection.uptime ? Math.floor(osDetection.uptime / 86400) : null;
  const uptimeHours = osDetection.uptime ? Math.floor((osDetection.uptime % 86400) / 3600) : null;
  
  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 grid grid-cols-4 gap-2 mb-1">
          <StatBox label="Operating System" value={osDetection.operatingSystem.split(' ')[0]} sub={osDetection.operatingSystem} accent="#0af" />
          <StatBox label="Kernel" value={osDetection.kernelVersion?.split('-')[0] || 'N/A'} sub={osDetection.kernelVersion || ''} accent="#30d158" />
          <StatBox label="Architecture" value={osDetection.architecture || 'N/A'} sub="" accent="#f5a623" />
          <StatBox label="Uptime" value={uptimeDays ? `${uptimeDays}d ${uptimeHours}h` : 'N/A'} sub="since last reboot" accent="#bf5af2" />
        </div>
        
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
          <SectionHeader accent="#0af">Operating System Details</SectionHeader>
          <KV k="OS" v={osDetection.operatingSystem} vc="text-[#30d158]" />
          <KV k="Kernel Version" v={osDetection.kernelVersion || '—'} />
          <KV k="Architecture" v={osDetection.architecture || '—'} />
          <KV k="Hostname" v={osDetection.hostname || '—'} vc="text-[#0af]" />
          {osDetection.uptime && (
            <KV k="Uptime" v={`${Math.floor(osDetection.uptime / 86400)} days, ${Math.floor((osDetection.uptime % 86400) / 3600)} hours, ${Math.floor((osDetection.uptime % 3600) / 60)} minutes`} />
          )}
        </div>
        
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
          <SectionHeader accent="#f5a623">Fingerprinting Confidence</SectionHeader>
          <div className="h-2 bg-[#1c2333] rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-[#30d158]" style={{ width: '92%' }} />
          </div>
          <div className="flex justify-between text-[10px] font-mono mt-1">
            <span className="text-[#c8d6f0]">TCP/IP Stack</span>
            <span className="text-[#30d158]">92% match</span>
          </div>
          <div className="h-2 bg-[#1c2333] rounded-full overflow-hidden mt-2">
            <div className="h-full rounded-full bg-[#0af]" style={{ width: '78%' }} />
          </div>
          <div className="flex justify-between text-[10px] font-mono mt-1">
            <span className="text-[#c8d6f0]">HTTP Headers</span>
            <span className="text-[#0af]">78% match</span>
          </div>
          <div className="h-2 bg-[#1c2333] rounded-full overflow-hidden mt-2">
            <div className="h-full rounded-full bg-[#f5a623]" style={{ width: '65%' }} />
          </div>
          <div className="flex justify-between text-[10px] font-mono mt-1">
            <span className="text-[#c8d6f0]">Open Ports Pattern</span>
            <span className="text-[#f5a623]">65% match</span>
          </div>
        </div>
      </div>
    </div>
  );
}