import type { IPIntelData } from '../types/ip-intel-data';
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

export function NetworkInfo({ data }: { data: IPIntelData }) {
  const { networkInfo } = data;

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-2 gap-2">
        {/* Stat boxes */}
        <div className="col-span-2 grid grid-cols-4 gap-2 mb-1">
          <StatBox label="IP Address" value={networkInfo.ipAddress} sub={networkInfo.reverseDns || 'No PTR'} accent="#0af" />
          <StatBox label="ASN" value={networkInfo.asn.split(' - ')[0]} sub={networkInfo.isp} accent="#f5a623" />
          <StatBox label="Location" value={networkInfo.geoIp.city} sub={networkInfo.geoIp.country} accent="#30d158" />
          <StatBox label="ISP" value={networkInfo.isp} sub="" accent="#bf5af2" />
        </div>

        {/* Network Details */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
          <SectionHeader accent="#0af">Network Details</SectionHeader>
          <KV k="IP Address" v={networkInfo.ipAddress} vc="text-[#0af] font-bold" />
          <KV k="Reverse DNS" v={networkInfo.reverseDns || '—'} />
          <KV k="ASN" v={networkInfo.asn} />
          <KV k="ISP" v={networkInfo.isp} />
          <KV k="CIDR Ranges" v={networkInfo.cidr.join(', ')} />
        </div>

        {/* Geo Location */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
          <SectionHeader accent="#30d158">Geo Location</SectionHeader>
          <KV k="Country" v={networkInfo.geoIp.country} />
          <KV k="City" v={networkInfo.geoIp.city} />
          <KV k="Latitude" v={networkInfo.geoIp.latitude} />
          <KV k="Longitude" v={networkInfo.geoIp.longitude} />
        </div>
      </div>
    </div>
  );
}