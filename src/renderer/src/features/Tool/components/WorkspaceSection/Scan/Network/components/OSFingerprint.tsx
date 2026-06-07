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

function KV({ k, v, vc = 'text-[#c8d6f0]' }: { k: string; v: string | number; vc?: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-[#111827] last:border-0">
      <span className="text-[11px] font-mono text-[#2a3548] uppercase tracking-wide">{k}</span>
      <span className="text-[12px] font-mono" style={{ color: vc === 'text-[#c8d6f0]' ? '#c8d6f0' : vc }}>{v}</span>
    </div>
  );
}

export function NetworkOSFingerprint({ data }: { data: ScanNetworkData }) {
  const osFingerprint = data.osFingerprint;

  if (!osFingerprint) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-3 bg-[#0f1319]">
        <div className="text-[32px] opacity-15">💻</div>
        <div className="text-[11px] font-mono text-[#2a3548]">
          No OS fingerprint data available. Run OS detection first.
        </div>
      </div>
    );
  }

  const accuracyColor =
    osFingerprint.accuracy >= 90 ? '#30d158' :
    osFingerprint.accuracy >= 70 ? '#f5a623' : '#ff2d55';

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-2 gap-2">
        {/* Stat boxes */}
        <div className="col-span-2 grid grid-cols-4 gap-2 mb-1">
          <StatBox label="Target" value={osFingerprint.target} accent="#0af" />
          <StatBox label="OS" value={osFingerprint.operatingSystem.split(' ')[0]} sub={osFingerprint.operatingSystem} accent="#5e5ce6" />
          <StatBox label="Accuracy" value={`${osFingerprint.accuracy}%`} accent={accuracyColor} />
          <StatBox label="Duration" value={`${osFingerprint.duration}s`} accent="#ff9f0a" />
        </div>

        {/* OS Details */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
          <SectionHeader accent="#5e5ce6">Operating System Details</SectionHeader>
          <KV k="OS" v={osFingerprint.operatingSystem} vc="#5e5ce6" />
          <KV k="Accuracy" v={`${osFingerprint.accuracy}%`} vc={accuracyColor} />
          {osFingerprint.cpe && <KV k="CPE" v={osFingerprint.cpe} vc="#0af" />}
          {osFingerprint.details?.vendor && <KV k="Vendor" v={osFingerprint.details.vendor} />}
          {osFingerprint.details?.family && <KV k="Family" v={osFingerprint.details.family} />}
          {osFingerprint.details?.generation && <KV k="Generation" v={osFingerprint.details.generation} />}
          {osFingerprint.details?.deviceType && <KV k="Device Type" v={osFingerprint.details.deviceType} />}
        </div>

        {/* Accuracy Visualization */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
          <SectionHeader accent={accuracyColor}>Fingerprint Confidence</SectionHeader>
          <div className="space-y-3">
            <div>
              <div className="h-2 bg-[#1c2333] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${osFingerprint.accuracy}%`, backgroundColor: accuracyColor }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono mt-1">
                <span className="text-[#2a3548]">TCP/IP Stack Match</span>
                <span style={{ color: accuracyColor }}>{osFingerprint.accuracy}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Raw Fingerprint */}
        {osFingerprint.fingerprintRaw && (
          <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded p-3">
            <SectionHeader accent="#3a4558">Raw Fingerprint</SectionHeader>
            <div className="bg-[#060810] border border-[#111827] rounded p-2">
              <code className="text-[10px] font-mono text-[#3d4a61] break-all">
                {osFingerprint.fingerprintRaw}
              </code>
            </div>
          </div>
        )}

        {/* Scan Info */}
        <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#ff9f0a">Scan Information</SectionHeader>
          <div className="text-[11px] font-mono text-[#c8d6f0]">
            Duration: <span className="text-[#f5a623]">{osFingerprint.duration}s</span>
            <span className="text-[#2a3548] mx-2">·</span>
            Started: <span className="text-[#3d4a61]">{osFingerprint.startedAt}</span>
          </div>
        </div>
      </div>
    </div>
  );
}