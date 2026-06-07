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

export function TabOverview({ data }: { data: ReconData }) {
  const totalBreachedAccounts = data.breaches.reduce((sum, b) => sum + b.accounts, 0);
  const nameserverCount = (data.identityRecords?.nameservers || data.whoisData?.nameServers || []).length;
  const dnsRecordCount = data.dnsRecords
    ? (data.dnsRecords.A?.length || 0) +
      (data.dnsRecords.AAAA?.length || 0) +
      (data.dnsRecords.MX?.length || 0) +
      (data.dnsRecords.NS?.length || 0) +
      (data.dnsRecords.TXT?.length || 0) +
      1 // SOA
    : 0;

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-2 gap-2">
        {/* Top stats row */}
        <div className="col-span-2 grid grid-cols-4 gap-2 mb-1">
          <StatBox label="Subdomains" value={data.subdomains.length} sub="passive discovery" accent="#0af" />
          <StatBox label="DNS Records" value={dnsRecordCount} sub="total records" accent="#30d158" />
          <StatBox label="Breaches" value={data.breaches.length} sub={`${totalBreachedAccounts.toLocaleString()} accounts`} accent="#ff2d55" />
          <StatBox label="Nameservers" value={nameserverCount} sub="NS records" accent="#f5a623" />
        </div>

        {/* Target Info Card */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#0af">Target Information</SectionHeader>
          <div className="flex justify-between items-center py-1 border-b border-[#111827]">
            <span className="text-[11px] font-mono text-[#c8d6f0] uppercase tracking-wide">Domain</span>
            <span className="text-[12px] font-mono text-[#0af]">{data.target}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-[#111827]">
            <span className="text-[11px] font-mono text-[#c8d6f0] uppercase tracking-wide">IP Address</span>
            <span className="text-[12px] font-mono text-[#c8d6f0]">{data.targetIp}</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-[11px] font-mono text-[#c8d6f0] uppercase tracking-wide">Scan Time</span>
            <span className="text-[12px] font-mono text-[#c8d6f0]">{new Date(data.scanTime).toLocaleString()}</span>
          </div>
        </div>

        {/* DNS Summary Card */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#30d158">DNS Summary</SectionHeader>
          <div className="flex justify-between items-center py-1 border-b border-[#111827]">
            <span className="text-[11px] font-mono text-[#c8d6f0] uppercase tracking-wide">A Records</span>
            <span className="text-[12px] font-mono text-[#0af]">{data.dnsRecords.A.length}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-[#111827]">
            <span className="text-[11px] font-mono text-[#c8d6f0] uppercase tracking-wide">MX Records</span>
            <span className="text-[12px] font-mono text-[#c8d6f0]">{data.dnsRecords.MX.length}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-[#111827]">
            <span className="text-[11px] font-mono text-[#c8d6f0] uppercase tracking-wide">TXT Records</span>
            <span className="text-[12px] font-mono text-[#c8d6f0]">{data.dnsRecords.TXT.length}</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-[11px] font-mono text-[#c8d6f0] uppercase tracking-wide">DNSSEC</span>
            <span className={`text-[12px] font-mono ${(data.identityRecords?.dnssec || data.whoisData?.dnssec) === 'unsigned' ? 'text-[#ff6b35]' : 'text-[#30d158]'}`}>
              {data.identityRecords?.dnssec || data.whoisData?.dnssec || 'N/A'}
            </span>
          </div>
        </div>

        {/* OSINT Summary Card */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#ff9f0a">OSINT Summary</SectionHeader>
          <div className="flex justify-between items-center py-1 border-b border-[#111827]">
            <span className="text-[11px] font-mono text-[#c8d6f0] uppercase tracking-wide">Google Dorks</span>
            <span className="text-[12px] font-mono text-[#c8d6f0]">{data.googleDorks.length}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-[#111827]">
            <span className="text-[11px] font-mono text-[#c8d6f0] uppercase tracking-wide">Wayback Snapshots</span>
            <span className="text-[12px] font-mono text-[#c8d6f0]">{data.waybackSnapshots.length}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-[#111827]">
            <span className="text-[11px] font-mono text-[#c8d6f0] uppercase tracking-wide">CT Certificates</span>
            <span className="text-[12px] font-mono text-[#c8d6f0]">{data.certTransparency.length}</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-[11px] font-mono text-[#c8d6f0] uppercase tracking-wide">Emails Found</span>
            <span className="text-[12px] font-mono text-[#c8d6f0]">{data.harvestedEmails.length}</span>
          </div>
        </div>

        {/* Subdomain Highlights Card */}
        {data.subdomains.length > 0 && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
            <SectionHeader accent="#0af">Subdomain Discovery (Passive)</SectionHeader>
            <div className="flex flex-wrap gap-2">
              {data.subdomains.slice(0, 10).map((sub, i) => (
                <span key={i} className="text-[11px] font-mono text-[#0af] bg-[#0af10] px-2 py-0.5 rounded border border-[#0af30]">
                  {sub.name}
                </span>
              ))}
              {data.subdomains.length > 10 && (
                <span className="text-[11px] font-mono text-[#c8d6f0]">+{data.subdomains.length - 10} more</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}