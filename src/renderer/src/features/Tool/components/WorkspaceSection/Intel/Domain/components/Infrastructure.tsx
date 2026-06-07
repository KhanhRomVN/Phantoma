import type { ReconData } from '../types/recon-data';
import React from 'react';
import { cn } from '../../../../../../../shared/lib/utils';

// UI Components
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

export function TabInfrastructure({ data }: { data: ReconData }) {
  const infra = data.infrastructure;
  const dns = data.dnsRecords;
  
  // Get IPs from DNS records if not in infrastructure
  const ipAddress = infra.ipAddress || (dns.A && dns.A[0]) || data.targetIp;
  const ipv6List = infra.ipv6 || dns.AAAA || [];
  
  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-2 gap-2">
        {/* Stat boxes row */}
        <div className="col-span-2 grid grid-cols-4 gap-2 mb-1">
          <StatBox label="IPv4" value={ipAddress || 'N/A'} sub="primary" accent="#0af" />
          <StatBox label="IPv6" value={ipv6List.length} sub={`${ipv6List.length} addresses`} accent="#30d158" />
          <StatBox label="ASN" value={infra.asn?.split(' - ')[0] || 'N/A'} sub={infra.asn?.split(' - ')[1] || ''} accent="#f5a623" />
          <StatBox label="CDN/WAF" value={infra.cdn || 'None'} sub={infra.waf ? 'WAF active' : 'No WAF'} accent="#ff6b35" />
        </div>
        
        {/* Network Card */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#0af">Network Information</SectionHeader>
          <KV k="IP Address" v={ipAddress} vc="text-[#0af] font-bold" />
          <KV k="IPv6" v={ipv6List.length > 0 ? ipv6List.join(', ') : 'N/A'} vc="text-[#30d158]" />
          <KV k="ASN" v={infra.asn || 'N/A'} />
          <KV k="Hosting Provider" v={infra.hostingProvider || 'N/A'} />
          <KV k="Cloud Provider" v={infra.cloudProvider || 'N/A'} />
        </div>
        
        {/* Location Card */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#f5a623">Geo Location</SectionHeader>
          {infra.geoLocation ? (
            <>
              <KV k="Country" v={infra.geoLocation.country} />
              <KV k="City" v={infra.geoLocation.city} />
              {infra.geoLocation.latitude && infra.geoLocation.longitude && (
                <KV k="Coordinates" v={`${infra.geoLocation.latitude}, ${infra.geoLocation.longitude}`} />
              )}
            </>
          ) : (
            <KV k="Location" v="Unknown" />
          )}
        </div>
        
        {/* Security & Proxy Card */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#ff2d55">Security & Proxy</SectionHeader>
          <KV k="CDN" v={infra.cdn || 'None'} vc={infra.cdn ? 'text-[#0af]' : 'text-[#c8d6f0]'} />
          <KV k="WAF" v={infra.waf || 'None'} vc={infra.waf ? 'text-[#ff6b35]' : 'text-[#c8d6f0]'} />
          <KV k="Reverse Proxy" v={infra.reverseProxy || 'None'} />
          <KV k="Load Balancer" v={infra.loadBalancer || 'None'} />
        </div>
        
        {/* IP Ranges & CIDR Card */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#30d158">IP Ranges</SectionHeader>
          {(infra.cidrRange && infra.cidrRange.length > 0) || (infra.ipRanges && infra.ipRanges.length > 0) ? (
            <>
              {infra.cidrRange && infra.cidrRange.map((range, i) => (
                <KV key={i} k={`CIDR[${i}]`} v={range} vc="text-[#0af]" />
              ))}
              {infra.ipRanges && infra.ipRanges.map((range, i) => (
                <KV key={i} k={`Range[${i}]`} v={range} vc="text-[#c8d6f0]" />
              ))}
            </>
          ) : (
            <KV k="IP Ranges" v="None detected" />
          )}
        </div>
        
        {/* Reverse IP Card */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#bf5af2">Reverse IP Lookup</SectionHeader>
          {infra.reverseIp && infra.reverseIp.length > 0 ? (
            infra.reverseIp.map((entry, i) => (
              <KV key={i} k={`Entry ${i + 1}`} v={entry} vc="text-[#c8d6f0]" />
            ))
          ) : (
            <KV k="Reverse IP" v="No results" />
          )}
        </div>
      </div>
    </div>
  );
}