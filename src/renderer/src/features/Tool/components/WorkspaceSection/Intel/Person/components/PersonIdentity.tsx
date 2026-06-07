import type { PersonData } from '../types/person-data';
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
      <span className={cn('text-[12px] font-mono text-right max-w-[60%] break-all', vc)}>{v}</span>
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

function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? '#30d158' : pct >= 55 ? '#f5a623' : '#ff2d55';
  return (
    <div className="bg-[#0d1017] border border-[#1c2333] rounded p-2.5 flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-widest font-mono text-[#c8d6f0]">Confidence</span>
      <div className="flex items-center gap-2">
        <span className="text-[16px] font-bold font-mono leading-none" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-1 w-full bg-[#111827] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function QueryTypeBadge({ type }: { type?: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    name:     { label: 'NAME SEARCH',     color: '#af52de', bg: '#af52de18' },
    email:    { label: 'EMAIL SEARCH',    color: '#30d158', bg: '#30d15818' },
    username: { label: 'USERNAME SEARCH', color: '#0a84ff', bg: '#0a84ff18' },
  };
  const meta = type ? map[type] : null;
  if (!meta) return null;
  return (
    <span
      className="text-[10px] font-mono font-bold px-2 py-0.5 rounded tracking-widest"
      style={{ color: meta.color, backgroundColor: meta.bg, border: `1px solid ${meta.color}30` }}
    >
      {meta.label}
    </span>
  );
}

function TagList({ items, color }: { items: string[]; color: string }) {
  return (
    <div className="flex flex-wrap gap-1 mt-0.5">
      {items.map((item, i) => (
        <span
          key={i}
          className="text-[10px] font-mono px-1.5 py-0.5 rounded"
          style={{ color, backgroundColor: `${color}15`, border: `1px solid ${color}25` }}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

export function PersonIdentity({ data }: { data: PersonData }) {
  const { identityInfo, contactInfo, leakExposure } = data;
  const emailCount   = contactInfo.email?.length || 0;
  const aliasCount   = identityInfo.alias?.length || 0;
  const leakCount    = (leakExposure.passwordLeaks?.length || 0) + (leakExposure.credentialLeaks?.length || 0);
  const totalHits    = data.totalHits ?? 0;

  return (
    <div className="flex-1 overflow-y-auto p-3">
      {/* Top bar: query type + scan meta */}
      <div className="flex items-center justify-between mb-2 px-0.5">
        <div className="flex items-center gap-2">
          <QueryTypeBadge type={data.queryType} />
          {totalHits > 0 && (
            <span className="text-[10px] font-mono text-[#c8d6f0]">{totalHits} hits</span>
          )}
        </div>
        <span className="text-[10px] font-mono text-[#c8d6f0]">
          {new Date(data.scanTime).toLocaleString()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* Stat row */}
        <div className="col-span-2 grid grid-cols-4 gap-2 mb-1">
          <StatBox label="Target" value={data.target} sub={data.queryType} accent="#0af" />
          <StatBox label="Aliases" value={aliasCount} sub="usernames" accent="#f5a623" />
          <StatBox label="Emails" value={emailCount} sub="addresses" accent="#30d158" />
          <StatBox label="Leaks" value={leakCount} sub="exposed" accent="#ff2d55" />
        </div>

        {/* Confidence meter — only if present */}
        {data.confidence !== undefined && (
          <div className="col-span-2 mb-1">
            <ConfidenceMeter value={data.confidence} />
          </div>
        )}

        {/* Identity block */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#0af">Identity</SectionHeader>
          <KV k="Full Name" v={identityInfo.fullName} vc="text-[#0af] font-bold" />
          {identityInfo.nickname && <KV k="Nickname" v={identityInfo.nickname} />}
          {identityInfo.estimatedAge && <KV k="Est. Age" v={identityInfo.estimatedAge} />}
          {identityInfo.nationality && <KV k="Nationality" v={identityInfo.nationality} />}
          {identityInfo.possibleRealNames && identityInfo.possibleRealNames.length > 0 && (
            <div className="py-1 border-b border-[#111827]">
              <span className="text-[11px] font-mono text-[#c8d6f0] uppercase tracking-wide block mb-1">Possible Names</span>
              <TagList items={identityInfo.possibleRealNames} color="#af52de" />
            </div>
          )}
          {identityInfo.language && identityInfo.language.length > 0 && (
            <div className="py-1 border-b border-[#111827]">
              <span className="text-[11px] font-mono text-[#c8d6f0] uppercase tracking-wide block mb-1">Language</span>
              <TagList items={identityInfo.language} color="#64d2ff" />
            </div>
          )}
          {identityInfo.alias && identityInfo.alias.length > 0 && (
            <div className="py-1 border-b border-[#111827]">
              <span className="text-[11px] font-mono text-[#c8d6f0] uppercase tracking-wide block mb-1">Aliases</span>
              <TagList items={identityInfo.alias} color="#f5a623" />
            </div>
          )}
          {identityInfo.username && identityInfo.username.length > 0 && (
            <div className="py-1">
              <span className="text-[11px] font-mono text-[#c8d6f0] uppercase tracking-wide block mb-1">Usernames</span>
              <TagList items={identityInfo.username} color="#0af" />
            </div>
          )}
        </div>

        {/* Contact block */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#30d158">Contact</SectionHeader>
          {contactInfo.email && contactInfo.email.length > 0 && (
            <div className="py-1 border-b border-[#111827]">
              <span className="text-[11px] font-mono text-[#c8d6f0] uppercase tracking-wide block mb-1">Email</span>
              {contactInfo.email.map((e, i) => (
                <div key={i} className="text-[12px] font-mono text-[#0af]">{e}</div>
              ))}
            </div>
          )}
          {contactInfo.phoneNumber && contactInfo.phoneNumber.length > 0 && (
            <KV k="Phone" v={contactInfo.phoneNumber.join(', ')} />
          )}
          {contactInfo.address && <KV k="Address" v={contactInfo.address} />}
          {contactInfo.messengerAccounts && contactInfo.messengerAccounts.map((acc, idx) => (
            <KV key={idx} k={acc.platform} v={acc.username} vc="text-[#30d158]" />
          ))}
        </div>

        {/* Analyst notes */}
        {identityInfo.notes && (
          <div className="col-span-2 bg-[#0d1017] border border-[#f5a62330] rounded p-3">
            <SectionHeader accent="#f5a623">Analyst Notes</SectionHeader>
            <p className="text-[12px] font-mono text-[#c8d6f0] leading-relaxed">{identityInfo.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}