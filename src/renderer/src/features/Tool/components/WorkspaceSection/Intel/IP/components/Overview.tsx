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

export function IPIntelOverview({ data }: { data: IPIntelData }) {
  const { networkInfo, shodanIntel, reverseIP } = data;

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-2 gap-2">
        {/* Header banner */}
        <div className="col-span-2 bg-gradient-to-r from-[#0a0e14] to-[#0d1017] border border-[#1c2333] rounded p-3 mb-1">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-[20px] font-bold font-mono text-[#0af]">{networkInfo.ipAddress}</div>
              <div className="text-[10px] font-mono text-[#6a7a9a] mt-0.5">{networkInfo.reverseDns || 'No PTR record'}</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-[#6a7a9a]">Shodan Last Seen</div>
              <div className="text-[14px] font-bold font-mono text-[#30d158]">
                {shodanIntel.lastScan ? new Date(shodanIntel.lastScan).toLocaleDateString() : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Stat boxes */}
        <div className="col-span-2 grid grid-cols-4 gap-2 mb-1">
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-2 text-center">
            <div className="text-[10px] text-[#6a7a9a]">Shodan Ports</div>
            <div className="text-[19px] font-bold text-[#0af]">{shodanIntel.openPorts}</div>
          </div>
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-2 text-center">
            <div className="text-[10px] text-[#6a7a9a]">Reverse IP</div>
            <div className="text-[19px] font-bold text-[#30d158]">{reverseIP.length}</div>
          </div>
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-2 text-center">
            <div className="text-[10px] text-[#6a7a9a]">Hostnames</div>
            <div className="text-[19px] font-bold text-[#bf5af2]">{shodanIntel.hostnames?.length || 0}</div>
          </div>
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-2 text-center">
            <div className="text-[10px] text-[#6a7a9a]">Organization</div>
            <div className="text-[13px] font-bold text-[#f5a623] truncate">{shodanIntel.org || 'N/A'}</div>
          </div>
        </div>

        {/* Network Summary */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#0af">Network Summary</SectionHeader>
          <KV k="ASN" v={networkInfo.asn} />
          <KV k="ISP" v={networkInfo.isp} />
          <KV k="Location" v={`${networkInfo.geoIp.city}, ${networkInfo.geoIp.country}`} />
          <KV k="Coordinates" v={`${networkInfo.geoIp.latitude}, ${networkInfo.geoIp.longitude}`} />
        </div>

        {/* Shodan Summary */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#ff9f0a">Shodan Intelligence</SectionHeader>
          <KV k="Open Ports" v={shodanIntel.openPorts} vc="text-[#0af]" />
          <KV k="ISP" v={shodanIntel.isp || 'N/A'} />
          <KV k="Org" v={shodanIntel.org || 'N/A'} />
          <KV k="Last Scan" v={shodanIntel.lastScan ? new Date(shodanIntel.lastScan).toLocaleDateString() : 'N/A'} />
        </div>

        {/* Shodan Services */}
        {shodanIntel.services.length > 0 && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
            <SectionHeader accent="#30d158">Shodan Services (Cached)</SectionHeader>
            <div className="flex flex-wrap gap-2">
              {shodanIntel.services.map((svc, i) => (
                <span key={i} className="text-[11px] font-mono text-[#c8d6f0] bg-[#0a0e14] px-2 py-0.5 rounded border border-[#1c2333]">
                  {svc.port}/{svc.transport} {svc.service}
                  {svc.product ? ` (${svc.product}${svc.version ? ' ' + svc.version : ''})` : ''}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Reverse IP */}
        {reverseIP.length > 0 && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
            <SectionHeader accent="#bf5af2">Reverse IP — Domains on Same IP</SectionHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] font-mono">
                <thead>
                  <tr className="border-b border-[#1c2333]">
                    <th className="text-left p-2 text-[#6a7a9a] font-normal text-[10px] uppercase">Domain</th>
                    <th className="text-left p-2 text-[#6a7a9a] font-normal text-[10px] uppercase">First Seen</th>
                    <th className="text-left p-2 text-[#6a7a9a] font-normal text-[10px] uppercase">Last Seen</th>
                  </tr>
                </thead>
                <tbody>
                  {reverseIP.map((entry, i) => (
                    <tr key={i} className="border-b border-[#111827] hover:bg-[#111827]">
                      <td className="p-2 text-[#0af]">{entry.domain}</td>
                      <td className="p-2 text-[#c8d6f0]">{entry.firstSeen || '—'}</td>
                      <td className="p-2 text-[#c8d6f0]">{entry.lastSeen || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}