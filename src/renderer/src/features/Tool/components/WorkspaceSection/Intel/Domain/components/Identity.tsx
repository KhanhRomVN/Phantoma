import type { ReconData } from '../types/recon-data';
import React, { ReactNode } from 'react';
import { cn } from '../../../../../../../shared/lib/utils';

// UI Components (styled like Test components)
function SectionHeader({ accent = '#0af', children }: { accent?: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="w-1 h-4 rounded-full" style={{ backgroundColor: accent }} />
      <h3 className="text-[12px] font-bold uppercase tracking-[0.1em] text-[#c8d6f0] font-mono">
        {children}
      </h3>
    </div>
  );
}

function KV({ k, v, vc = 'text-[#c8d6f0]' }: { k: string; v: string | number | ReactNode; vc?: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-[#111827] last:border-0">
      <span className="text-[11px] font-mono text-[#c8d6f0] uppercase tracking-wide">{k}</span>
      <span className={cn('text-[12px] font-mono', vc)}>{v}</span>
    </div>
  );
}

function ExpandableRaw({ content }: { content: string }) {
  const [expanded, setExpanded] = React.useState(false);
  const preview = content.split('\n').slice(0, 3).join('\n');
  
  return (
    <div className="mt-2">
      <pre className="text-[10px] font-mono text-[#5a6a8a] bg-[#0a0e14] p-2 rounded overflow-x-auto whitespace-pre-wrap">
        {expanded ? content : preview}
      </pre>
      {content.split('\n').length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[10px] font-mono text-[#0af] hover:text-[#5cf] mt-1"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
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

export function DomainIdentity({ data }: { data: ReconData }) {
  const identity = data.identityRecords || data.whoisData;
  const isLegacy = !data.identityRecords;
  
  // Format date for display
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const age = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 365));
      return `${d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} (${age} years ago)`;
    } catch {
      return dateStr;
    }
  };
  
  const calculateAge = (dateStr: string) => {
    if (!dateStr) return 0;
    try {
      const d = new Date(dateStr);
      const now = new Date();
      return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 365));
    } catch {
      return 0;
    }
  };
  
  const domainAge = calculateAge(identity.creationDate);
  const daysToExpiry = (() => {
    if (!identity.expirationDate) return null;
    try {
      const expiry = new Date(identity.expirationDate);
      const now = new Date();
      const diff = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diff > 0 ? diff : 0;
    } catch {
      return null;
    }
  })();
  
  const nameserversCount = (identity.nameservers || identity.nameServers || []).length;
  const statusCount = (identity.domainStatus || []).length;
  
  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-2 gap-2">
        {/* Stat boxes row */}
        <div className="col-span-2 grid grid-cols-4 gap-2 mb-1">
          <StatBox label="Domain Age" value={`${domainAge} years`} sub={formatDate(identity.creationDate)} accent="#30d158" />
          <StatBox label="Expires In" value={daysToExpiry ? `${daysToExpiry} days` : 'N/A'} sub={formatDate(identity.expirationDate)} accent={daysToExpiry && daysToExpiry < 30 ? '#ff2d55' : '#f5a623'} />
          <StatBox label="Nameservers" value={nameserversCount} sub="NS records" accent="#0af" />
          <StatBox label="Domain Status" value={statusCount} sub={statusCount > 0 ? 'active flags' : 'none'} accent="#bf5af2" />
        </div>
        
        {/* Basic Info Card */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#0af">Basic Identity</SectionHeader>
          <KV k="Domain Name" v={identity.domainName || identity.domain || 'N/A'} vc="text-[#0af] font-bold" />
          <KV k="Registrar" v={identity.registrar || 'N/A'} />
          {!isLegacy && <KV k="Registry" v={identity.registry || 'N/A'} />}
          <KV k="TLD" v={identity.tld || (identity.domainName || identity.domain)?.split('.').pop() || 'N/A'} />
          <KV k="DNSSEC" v={
            <span className={identity.dnssec === 'unsigned' ? 'text-[#ff6b35]' : 'text-[#30d158]'}>
              {identity.dnssec || 'N/A'}
            </span>
          } vc="" />
        </div>
        
        {/* Dates Card */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#f5a623">Registration Timeline</SectionHeader>
          <KV k="Creation Date" v={formatDate(identity.creationDate)} vc="text-[#f5a623]" />
          <KV k="Expiration Date" v={formatDate(identity.expirationDate)} vc={daysToExpiry && daysToExpiry < 30 ? 'text-[#ff2d55]' : 'text-[#f5a623]'} />
          {!isLegacy && <KV k="Updated Date" v={formatDate(identity.updatedDate)} />}
        </div>
        
        {/* Nameservers Card */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
          <SectionHeader accent="#30d158">Nameservers</SectionHeader>
          <div className="flex flex-wrap gap-2">
            {(identity.nameservers || identity.nameServers || []).map((ns: string, idx: number) => (
              <span key={idx} className="text-[11px] font-mono text-[#c8d6f0] bg-[#0a0e14] px-2 py-0.5 rounded border border-[#1c2333]">
                {ns}
              </span>
            ))}
          </div>
        </div>
        
        {/* Domain Status Card */}
        {!isLegacy && identity.domainStatus && identity.domainStatus.length > 0 && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
            <SectionHeader accent="#bf5af2">Domain Status</SectionHeader>
            <div className="flex flex-wrap gap-2">
              {identity.domainStatus.map((status: string, idx: number) => (
                <span key={idx} className="text-[12px] font-mono px-2 py-1 rounded" style={{ background: '#bf5af215', border: '1px solid #bf5af230', color: '#bf5af2' }}>
                  {status}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Registrar Abuse Contact Card */}
        {!isLegacy && identity.registrarAbuseContact && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
            <SectionHeader accent="#ff2d55">Abuse Contact</SectionHeader>
            {identity.registrarAbuseContact.email && (
              <KV k="Email" v={identity.registrarAbuseContact.email} vc="text-[#0af]" />
            )}
            {identity.registrarAbuseContact.phone && (
              <KV k="Phone" v={identity.registrarAbuseContact.phone} />
            )}
          </div>
        )}
        
        {/* WHOIS Raw Card */}
        {identity.whoisRaw && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
            <SectionHeader accent="#4a5a7a">WHOIS Raw Data</SectionHeader>
            <ExpandableRaw content={identity.whoisRaw} />
          </div>
        )}
      </div>
    </div>
  );
}