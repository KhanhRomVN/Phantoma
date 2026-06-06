import type { IPServerData } from '../types/ip-server-data';
import React from 'react';
import { cn } from '../../../../../../../shared/lib/utils';

function SectionHeader({ accent = '#0af', children }: { accent?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="w-1 h-4 rounded-full" style={{ backgroundColor: accent }} />
      <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#c8d6f0] font-mono">
        {children}
      </h3>
    </div>
  );
}

function KV({ k, v, vc = 'text-[#6a7a9a]' }: { k: string; v: string | number | React.ReactNode; vc?: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-[#111827] last:border-0">
      <span className="text-[10px] font-mono text-[#3a4558] uppercase tracking-wide">{k}</span>
      <span className={cn('text-[11px] font-mono', vc)}>{v}</span>
    </div>
  );
}

function StatBox({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent: string }) {
  return (
    <div className="bg-[#0d1017] border border-[#1c2333] rounded p-2.5 flex flex-col gap-0.5">
      <span className="text-[9px] uppercase tracking-widest font-mono text-[#3a4558]">{label}</span>
      <span className="text-[15px] font-bold font-mono leading-none" style={{ color: accent }}>
        {value}
      </span>
      {sub && <span className="text-[8px] font-mono text-[#2a3548]">{sub}</span>}
    </div>
  );
}

export function NetworkInfo({ data }: { data: IPServerData }) {
  const { networkInfo } = data;
  
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10]">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 grid grid-cols-4 gap-2 mb-1">
          <StatBox label="IP Address" value={networkInfo.ipAddress} sub={networkInfo.reverseDns || 'No PTR'} accent="#0af" />
          <StatBox label="ASN" value={networkInfo.asn} sub={networkInfo.isp} accent="#f5a623" />
          <StatBox label="Location" value={networkInfo.geoIp.city} sub={`${networkInfo.geoIp.country}`} accent="#30d158" />
          <StatBox label="Latency" value={networkInfo.latency ? `${networkInfo.latency}ms` : 'N/A'} sub={networkInfo.packetLoss ? `${networkInfo.packetLoss}% loss` : ''} accent="#bf5af2" />
        </div>
        
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
          <SectionHeader accent="#0af">Network Details</SectionHeader>
          <KV k="Reverse DNS" v={networkInfo.reverseDns || '—'} vc="text-[#8da0c0]" />
          <KV k="CIDR Ranges" v={networkInfo.cidr.join(', ')} vc="text-[#8da0c0]" />
          <KV k="ISP" v={networkInfo.isp} />
          <KV k="Coordinates" v={`${networkInfo.geoIp.latitude}, ${networkInfo.geoIp.longitude}`} />
        </div>
        
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
          <SectionHeader accent="#30d158">Geo Location</SectionHeader>
          <KV k="Country" v={networkInfo.geoIp.country} />
          <KV k="City" v={networkInfo.geoIp.city} />
        </div>
      </div>
    </div>
  );
}