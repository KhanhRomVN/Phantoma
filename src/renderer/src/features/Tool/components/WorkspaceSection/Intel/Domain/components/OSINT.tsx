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

export function DomainOSINT({ data }: { data: ReconData }) {
  const totalBreachedAccounts = data.breaches.reduce((sum, b) => sum + b.accounts, 0);
  
  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-2 gap-2">
        {/* Stat boxes */}
        <div className="col-span-2 grid grid-cols-4 gap-2 mb-1">
          <StatBox label="Breaches" value={data.breaches.length} sub="incidents" accent="#ff2d55" />
          <StatBox label="Leaked Accounts" value={`${(totalBreachedAccounts / 1e6).toFixed(1)}M`} sub="records exposed" accent="#ff6b35" />
          <StatBox label="Emails" value={data.harvestedEmails.length} sub="harvested" accent="#0af" />
          <StatBox label="Google Dorks" value={data.googleDorks.length} sub="queries" accent="#f5a623" />
        </div>
        
        {/* Breaches Card */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
          <SectionHeader accent="#ff2d55">Data Breaches</SectionHeader>
          {data.breaches.map((breach, i) => (
            <div key={i} className="mb-2 pb-2 border-b border-[#111827] last:border-0">
              <div className="flex justify-between items-center">
                <span className="text-[12px] font-mono text-[#ff6b35]">{breach.name}</span>
                <span className="text-[10px] font-mono text-[#c8d6f0]">{breach.date}</span>
              </div>
              <div className="text-[11px] font-mono text-[#c8d6f0] mt-0.5">
                {breach.accounts.toLocaleString()} accounts • {breach.data.join(', ')}
              </div>
            </div>
          ))}
        </div>
        
        {/* Emails Card */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#0af">Harvested Emails</SectionHeader>
          <div className="flex flex-wrap gap-1">
            {data.harvestedEmails.map((email, i) => (
              <span key={i} className="text-[11px] font-mono text-[#0af] bg-[#0af10] px-2 py-0.5 rounded border border-[#0af30]">
                {email}
              </span>
            ))}
          </div>
        </div>
        
        {/* Social Intel Card */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#bf5af2">Social Intelligence</SectionHeader>
          {Object.entries(data.socialIntel).length > 0 ? (
            Object.entries(data.socialIntel).map(([platform, handle]) => (
              <KV key={platform} k={platform} v={`@${handle}`} vc="text-[#0af]" />
            ))
          ) : (
            <KV k="Social" v="No data found" />
          )}
        </div>
        
        {/* Google Dorks Card */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#f5a623">Google Dorks</SectionHeader>
          {data.googleDorks.map((dork, i) => (
            <div key={i} className="mb-1 pb-1 border-b border-[#111827] last:border-0">
              <div className="text-[10px] font-mono text-[#c8d6f0] truncate">{dork.query}</div>
              <div className="text-[9px] font-mono text-[#c8d6f0]">{dork.resultCount} results</div>
            </div>
          ))}
        </div>
        
        {/* Wayback Snapshots Card */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#30d158">Wayback Machine</SectionHeader>
          {data.waybackSnapshots.map((snapshot, i) => (
            <div key={i} className="mb-1 pb-1 border-b border-[#111827] last:border-0">
              <div className="text-[10px] font-mono text-[#c8d6f0] truncate">{snapshot.url}</div>
              <div className="text-[9px] font-mono text-[#c8d6f0]">{new Date(snapshot.timestamp).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
        
        {/* Certificate Transparency Card */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
          <SectionHeader accent="#5e5ce6">Certificate Transparency</SectionHeader>
          {data.certTransparency.map((cert, i) => (
            <div key={i} className="mb-2 pb-2 border-b border-[#111827] last:border-0">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-[#5e5ce6]">{cert.issuer}</span>
                <span className="text-[#c8d6f0]">
                  {new Date(cert.validFrom).toLocaleDateString()} → {new Date(cert.validTo).toLocaleDateString()}
                </span>
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {cert.domains.slice(0, 4).map((domain, idx) => (
                  <span key={idx} className="text-[9px] font-mono text-[#c8d6f0] bg-[#0a0e14] px-1 py-0.5 rounded">
                    {domain}
                  </span>
                ))}
                {cert.domains.length > 4 && (
                  <span className="text-[9px] text-[#c8d6f0]">+{cert.domains.length - 4}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}