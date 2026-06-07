import type { ScanDomainData } from '../types/scan-data';
import React from 'react';

// UI Components
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

export function ScanOverview({ data }: { data: ScanDomainData }) {
  const zoneTransfer = data.zoneTransfer;
  const dnsBrute = data.dnsBrute;

  const zoneRecords = zoneTransfer?.recordCount ?? 0;
  const zoneSuccess = zoneTransfer?.success ?? false;
  const bruteResolved = dnsBrute?.resolvedCount ?? 0;
  const bruteTotal = dnsBrute?.wordlistSize ?? 0;

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-2 gap-2">
        {/* Target Info */}
        <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#0af">Scan Target</SectionHeader>
          <div className="flex items-center gap-4">
            <div>
              <span className="text-[10px] uppercase tracking-widest font-mono text-[#2a3548]">Domain</span>
              <div className="text-[14px] font-mono font-bold text-[#0af]">{data.target}</div>
            </div>
            <div className="w-px h-8 bg-[#1c2333]" />
            <div>
              <span className="text-[10px] uppercase tracking-widest font-mono text-[#2a3548]">Scan Time</span>
              <div className="text-[12px] font-mono text-[#6a7a9a]">{data.scanTime}</div>
            </div>
          </div>
        </div>

        {/* Stat boxes */}
        <div className="col-span-2 grid grid-cols-4 gap-2 mb-1">
          <StatBox label="Zone Transfer" value={zoneSuccess ? 'Success' : 'Failed'} sub={zoneSuccess ? `${zoneRecords} records` : 'AXFR denied'} accent={zoneSuccess ? '#30d158' : '#ff2d55'} />
          <StatBox label="DNS Brute" value={bruteResolved} sub={`from ${bruteTotal} names`} accent="#f5a623" />
          <StatBox label="Total Records" value={zoneRecords + bruteResolved} sub="discovered" accent="#0af" />
          <StatBox label="Duration" value={dnsBrute ? `${dnsBrute.duration}s` : 'N/A'} sub="brute-force time" accent="#5e5ce6" />
        </div>

        {/* Zone Transfer Summary */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent={zoneSuccess ? '#30d158' : '#ff2d55'}>Zone Transfer (AXFR)</SectionHeader>
          {zoneTransfer ? (
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[10px] font-mono text-[#2a3548] uppercase">Nameserver</span>
                <span className="text-[11px] font-mono text-[#c8d6f0]">{zoneTransfer.nameserver}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] font-mono text-[#2a3548] uppercase">Status</span>
                <span className="text-[11px] font-mono" style={{ color: zoneSuccess ? '#30d158' : '#ff2d55' }}>
                  {zoneSuccess ? '✓ Successful' : '✕ Failed'}
                </span>
              </div>
              {zoneTransfer.error && (
                <div className="flex justify-between">
                  <span className="text-[10px] font-mono text-[#2a3548] uppercase">Error</span>
                  <span className="text-[11px] font-mono text-[#ff6b35]">{zoneTransfer.error}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[10px] font-mono text-[#2a3548] uppercase">Records</span>
                <span className="text-[11px] font-mono text-[#c8d6f0]">{zoneRecords}</span>
              </div>
            </div>
          ) : (
            <div className="text-[11px] font-mono text-[#3d4a61] italic">No zone transfer attempted</div>
          )}
        </div>

        {/* DNS Brute-force Summary */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#f5a623">DNS Brute-force</SectionHeader>
          {dnsBrute ? (
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[10px] font-mono text-[#2a3548] uppercase">Wordlist</span>
                <span className="text-[11px] font-mono text-[#c8d6f0]">{dnsBrute.wordlist}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] font-mono text-[#2a3548] uppercase">Tested</span>
                <span className="text-[11px] font-mono text-[#c8d6f0]">{bruteTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] font-mono text-[#2a3548] uppercase">Resolved</span>
                <span className="text-[11px] font-mono text-[#f5a623]">{bruteResolved}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] font-mono text-[#2a3548] uppercase">Duration</span>
                <span className="text-[11px] font-mono text-[#c8d6f0]">{dnsBrute.duration}s</span>
              </div>
            </div>
          ) : (
            <div className="text-[11px] font-mono text-[#3d4a61] italic">No brute-force attempted</div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#ff9f0a">Quick Actions</SectionHeader>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 text-[11px] font-mono text-[#0af] bg-[#0af10] border border-[#0af30] rounded hover:bg-[#0af20] transition-colors">
              ▶ Re-run Zone Transfer
            </button>
            <button className="px-3 py-1.5 text-[11px] font-mono text-[#f5a623] bg-[#f5a62310] border border-[#f5a62330] rounded hover:bg-[#f5a62320] transition-colors">
              ▶ Re-run DNS Brute
            </button>
            <button className="px-3 py-1.5 text-[11px] font-mono text-[#30d158] bg-[#30d15810] border border-[#30d15830] rounded hover:bg-[#30d15820] transition-colors">
              ▶ Run Full Scan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}