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

function RiskBar({ label, score, max = 10, color }: { label: string; score: number; max?: number; color: string }) {
  const percentage = (score / max) * 100;
  return (
    <div className="mb-2">
      <div className="flex justify-between text-[9px] font-mono mb-0.5">
        <span className="text-[#3a4558]">{label}</span>
        <span className="text-[#c8d6f0]">{score}/{max}</span>
      </div>
      <div className="h-1.5 bg-[#1c2333] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export function IPServerOverview({ data }: { data: IPServerData }) {
  const { networkInfo, ports, osDetection, securityFindings, infrastructureExposure } = data;
  
  const openPorts = ports.filter(p => p.state === 'open').length;
  const filteredPorts = ports.filter(p => p.state === 'filtered').length;
  const closedPorts = ports.filter(p => p.state === 'closed').length;
  const criticalFindings = securityFindings.filter(f => f.severity === 'CRITICAL').length;
  const highFindings = securityFindings.filter(f => f.severity === 'HIGH').length;
  const exposures = Object.values(infrastructureExposure).filter(v => v === true).length;
  
  const overallRiskScore = (criticalFindings * 10 + highFindings * 7 + exposures * 5 + openPorts * 2) / 10;
  const riskColor = overallRiskScore >= 7 ? '#ff2d55' : overallRiskScore >= 4 ? '#f5a623' : '#30d158';
  
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10]">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 bg-gradient-to-r from-[#0a0e14] to-[#0d1017] border border-[#1c2333] rounded p-3 mb-1">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-[20px] font-bold font-mono text-[#0af]">{networkInfo.ipAddress}</div>
              <div className="text-[9px] font-mono text-[#3a4558] mt-0.5">{networkInfo.reverseDns || 'No PTR record'}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-[#3a4558]">Overall Risk Score</div>
              <div className="text-[28px] font-bold font-mono" style={{ color: riskColor }}>{overallRiskScore.toFixed(1)}</div>
              <div className="text-[8px] text-[#3a4558]">/ 10.0</div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-2 col-span-2 mb-1">
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-2 text-center">
            <div className="text-[9px] text-[#3a4558]">Open Ports</div>
            <div className="text-[18px] font-bold text-[#30d158]">{openPorts}</div>
          </div>
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-2 text-center">
            <div className="text-[9px] text-[#3a4558]">Filtered</div>
            <div className="text-[18px] font-bold text-[#f5a623]">{filteredPorts}</div>
          </div>
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-2 text-center">
            <div className="text-[9px] text-[#3a4558]">Vulnerabilities</div>
            <div className="text-[18px] font-bold text-[#ff2d55]">{securityFindings.length}</div>
          </div>
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-2 text-center">
            <div className="text-[9px] text-[#3a4558]">Exposures</div>
            <div className="text-[18px] font-bold text-[#ff6b35]">{exposures}</div>
          </div>
        </div>
        
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#0af">Network Summary</SectionHeader>
          <KV k="ASN" v={networkInfo.asn} />
          <KV k="ISP" v={networkInfo.isp} />
          <KV k="Location" v={`${networkInfo.geoIp.city}, ${networkInfo.geoIp.country}`} />
          <KV k="Latency" v={`${networkInfo.latency}ms`} vc={networkInfo.latency < 50 ? 'text-[#30d158]' : 'text-[#f5a623]'} />
          {networkInfo.packetLoss !== undefined && <KV k="Packet Loss" v={`${networkInfo.packetLoss}%`} vc={networkInfo.packetLoss < 1 ? 'text-[#30d158]' : 'text-[#f5a623]'} />}
        </div>
        
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#30d158">System Profile</SectionHeader>
          <KV k="OS" v={osDetection.operatingSystem} />
          <KV k="Hostname" v={osDetection.hostname || '—'} />
          <KV k="Uptime" v={osDetection.uptime ? `${Math.floor(osDetection.uptime / 86400)} days` : '—'} />
        </div>
        
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
          <SectionHeader accent="#ff2d55">Risk Breakdown</SectionHeader>
          <RiskBar label="Critical Vulnerabilities" score={criticalFindings} max={5} color="#ff2d55" />
          <RiskBar label="High Vulnerabilities" score={highFindings} max={10} color="#ff6b35" />
          <RiskBar label="Infrastructure Exposures" score={exposures} max={7} color="#f5a623" />
          <RiskBar label="Open Attack Surface" score={openPorts} max={20} color="#0af" />
        </div>
      </div>
    </div>
  );
}