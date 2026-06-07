import type { ScanNetworkData } from '../types/scan-network-data';
import React from 'react';

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

function StatBox({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent: string }) {
  return (
    <div className="bg-[#0d1017] border border-[#1c2333] rounded p-2.5 flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-widest font-mono text-[#2a3548]">{label}</span>
      <span className="text-[16px] font-bold font-mono leading-none" style={{ color: accent }}>
        {value}
      </span>
      {sub && <span className="text-[9px] font-mono text-[#3d4a61]">{sub}</span>}
    </div>
  );
}

function RiskBar({ label, score, max = 10, color }: { label: string; score: number; max?: number; color: string }) {
  const percentage = Math.min((score / max) * 100, 100);
  return (
    <div className="mb-2">
      <div className="flex justify-between text-[10px] font-mono mb-0.5">
        <span className="text-[#c8d6f0]">{label}</span>
        <span className="text-[#c8d6f0]">{score}/{max}</span>
      </div>
      <div className="h-1.5 bg-[#1c2333] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${percentage}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export function NetworkOverview({ data }: { data: ScanNetworkData }) {
  const pingSweep = data.pingSweep;
  const portScan = data.portScan;
  const serviceDetection = data.serviceDetection;
  const osFingerprint = data.osFingerprint;

  const liveHosts = pingSweep?.liveHosts ?? 0;
  const openPorts = portScan?.openPorts ?? 0;
  const filteredPorts = portScan?.filteredPorts ?? 0;
  const servicesIdentified = serviceDetection?.identifiedServices ?? 0;
  const osAccuracy = osFingerprint?.accuracy ?? 0;

  const overallRisk = Math.min(
    Math.round((openPorts * 2 + filteredPorts * 1 + (100 - osAccuracy) * 0.05) / 2),
    10
  );
  const riskColor = overallRisk >= 7 ? '#ff2d55' : overallRisk >= 4 ? '#f5a623' : '#30d158';

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-2 gap-2">
        {/* Target Header */}
        <div className="col-span-2 bg-gradient-to-r from-[#0a0e14] to-[#0d1017] border border-[#1c2333] rounded p-3 mb-1">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-[20px] font-bold font-mono text-[#ff9f0a]">{data.target}</div>
              <div className="text-[10px] font-mono text-[#2a3548] mt-0.5">Network Scan Target</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-[#2a3548]">Attack Surface</div>
              <div className="text-[28px] font-bold font-mono" style={{ color: riskColor }}>{overallRisk}</div>
              <div className="text-[9px] text-[#3d4a61]">/ 10</div>
            </div>
          </div>
        </div>

        {/* Stat boxes */}
        <div className="col-span-2 grid grid-cols-5 gap-2 mb-1">
          <StatBox label="Live Hosts" value={liveHosts} sub={pingSweep ? `of ${pingSweep.totalHosts}` : ''} accent="#30d158" />
          <StatBox label="Open Ports" value={openPorts} sub="accessible" accent="#ff9f0a" />
          <StatBox label="Filtered" value={filteredPorts} sub="firewalled" accent="#f5a623" />
          <StatBox label="Services" value={servicesIdentified} sub="identified" accent="#0af" />
          <StatBox label="OS Accuracy" value={`${osAccuracy}%`} sub={osFingerprint?.operatingSystem ?? ''} accent="#5e5ce6" />
        </div>

        {/* Scan Summary */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#30d158">Ping Sweep</SectionHeader>
          {pingSweep ? (
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[10px] font-mono text-[#2a3548] uppercase">Method</span>
                <span className="text-[11px] font-mono text-[#c8d6f0]">{pingSweep.config.method.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] font-mono text-[#2a3548] uppercase">Live Hosts</span>
                <span className="text-[11px] font-mono text-[#30d158]">{liveHosts} / {pingSweep.totalHosts}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] font-mono text-[#2a3548] uppercase">Duration</span>
                <span className="text-[11px] font-mono text-[#c8d6f0]">{pingSweep.duration}s</span>
              </div>
            </div>
          ) : (
            <div className="text-[11px] font-mono text-[#3d4a61] italic">Not yet scanned</div>
          )}
        </div>

        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#ff9f0a">Port Scan</SectionHeader>
          {portScan ? (
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[10px] font-mono text-[#2a3548] uppercase">Range</span>
                <span className="text-[11px] font-mono text-[#c8d6f0]">{portScan.config.ports}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] font-mono text-[#2a3548] uppercase">Scanned</span>
                <span className="text-[11px] font-mono text-[#c8d6f0]">{portScan.totalScanned}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] font-mono text-[#2a3548] uppercase">Duration</span>
                <span className="text-[11px] font-mono text-[#c8d6f0]">{portScan.duration}s</span>
              </div>
            </div>
          ) : (
            <div className="text-[11px] font-mono text-[#3d4a61] italic">Not yet scanned</div>
          )}
        </div>

        {/* OS & Services Summary */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#5e5ce6">OS Fingerprint</SectionHeader>
          {osFingerprint ? (
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[10px] font-mono text-[#2a3548] uppercase">OS</span>
                <span className="text-[11px] font-mono text-[#5e5ce6]">{osFingerprint.operatingSystem}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] font-mono text-[#2a3548] uppercase">Accuracy</span>
                <span className="text-[11px] font-mono text-[#30d158]">{osAccuracy}%</span>
              </div>
            </div>
          ) : (
            <div className="text-[11px] font-mono text-[#3d4a61] italic">Not yet scanned</div>
          )}
        </div>

        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#0af">Service Detection</SectionHeader>
          {serviceDetection ? (
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[10px] font-mono text-[#2a3548] uppercase">Identified</span>
                <span className="text-[11px] font-mono text-[#30d158]">{servicesIdentified}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] font-mono text-[#2a3548] uppercase">Total</span>
                <span className="text-[11px] font-mono text-[#c8d6f0]">{serviceDetection.totalServices}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] font-mono text-[#2a3548] uppercase">Duration</span>
                <span className="text-[11px] font-mono text-[#c8d6f0]">{serviceDetection.duration}s</span>
              </div>
            </div>
          ) : (
            <div className="text-[11px] font-mono text-[#3d4a61] italic">Not yet scanned</div>
          )}
        </div>

        {/* Risk Breakdown */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
          <SectionHeader accent="#ff2d55">Risk Breakdown</SectionHeader>
          <RiskBar label="Open Ports" score={Math.min(openPorts, 10)} max={10} color="#ff9f0a" />
          <RiskBar label="Filtered Ports" score={Math.min(filteredPorts, 10)} max={10} color="#f5a623" />
          <RiskBar label="OS Certainty Gap" score={Math.round((100 - osAccuracy) / 10)} max={10} color="#5e5ce6" />
          <RiskBar label="Attack Surface" score={overallRisk} max={10} color={riskColor} />
        </div>

        {/* Quick Actions */}
        <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#ff9f0a">Quick Actions</SectionHeader>
          <div className="flex gap-2 flex-wrap">
            <button className="px-3 py-1.5 text-[11px] font-mono text-[#30d158] bg-[#30d15810] border border-[#30d15830] rounded hover:bg-[#30d15820] transition-colors">
              ▶ Ping Sweep
            </button>
            <button className="px-3 py-1.5 text-[11px] font-mono text-[#ff9f0a] bg-[#ff9f0a10] border border-[#ff9f0a30] rounded hover:bg-[#ff9f0a20] transition-colors">
              ▶ Port Scan
            </button>
            <button className="px-3 py-1.5 text-[11px] font-mono text-[#0af] bg-[#0af10] border border-[#0af30] rounded hover:bg-[#0af20] transition-colors">
              ▶ Service Detection
            </button>
            <button className="px-3 py-1.5 text-[11px] font-mono text-[#5e5ce6] bg-[#5e5ce610] border border-[#5e5ce630] rounded hover:bg-[#5e5ce620] transition-colors">
              ▶ OS Fingerprint
            </button>
            <button className="px-3 py-1.5 text-[11px] font-mono text-[#ff2d55] bg-[#ff2d5510] border border-[#ff2d5530] rounded hover:bg-[#ff2d5520] transition-colors">
              ▶ Run Full Scan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}