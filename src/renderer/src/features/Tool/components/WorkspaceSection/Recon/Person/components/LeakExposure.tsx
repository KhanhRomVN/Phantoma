import type { PersonData } from '../types/person-data';
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
    <div className="flex justify-between items-start gap-2 py-1 border-b border-[#111827] last:border-0">
      <span className="text-[10px] font-mono text-[#3a4558] uppercase tracking-wide shrink-0">{k}</span>
      <span className={cn('text-[11px] font-mono text-right break-all', vc)}>{v}</span>
    </div>
  );
}

function StatBox({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent: string }) {
  return (
    <div className="bg-[#0d1017] border border-[#1c2333] rounded p-2.5 flex flex-col gap-0.5">
      <span className="text-[9px] uppercase tracking-widest font-mono text-[#3a4558]">{label}</span>
      <span className="text-[15px] font-bold font-mono leading-none" style={{ color: accent }}>{value}</span>
      {sub && <span className="text-[8px] font-mono text-[#2a3548]">{sub}</span>}
    </div>
  );
}

function SeverityBadge({ level }: { level?: string }) {
  if (!level) return null;
  const map: Record<string, { color: string; bg: string }> = {
    CRITICAL: { color: '#ff2d55', bg: '#ff2d5522' },
    HIGH:     { color: '#ff6b35', bg: '#ff6b3522' },
    MEDIUM:   { color: '#f5a623', bg: '#f5a62322' },
    LOW:      { color: '#30d158', bg: '#30d15822' },
  };
  const meta = map[level] || { color: '#6a7a9a', bg: '#6a7a9a22' };
  return (
    <span
      className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded tracking-widest"
      style={{ color: meta.color, backgroundColor: meta.bg, border: `1px solid ${meta.color}40` }}
    >
      {level}
    </span>
  );
}

export function LeakExposure({ data }: { data: PersonData }) {
  const { leakExposure } = data;
  const passwordLeaks   = leakExposure.passwordLeaks   || [];
  const credentialLeaks = leakExposure.credentialLeaks || [];
  const pastebinLeaks   = leakExposure.pastebinLeaks   || [];
  const darkwebMentions = leakExposure.darkwebMentions || [];
  const breachDbs       = leakExposure.breachDatabase  || [];
  const totalLeaks      = passwordLeaks.length + credentialLeaks.length;
  const criticalCount   = [...passwordLeaks, ...credentialLeaks].filter(l => l.severity === 'CRITICAL').length;

  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10]">
      <div className="grid grid-cols-2 gap-2">

        {/* Stat row */}
        <div className="col-span-2 grid grid-cols-4 gap-2 mb-1">
          <StatBox label="Total Leaks"     value={totalLeaks}              sub="records"       accent="#ff2d55" />
          <StatBox label="Critical"         value={criticalCount}           sub="severity"      accent="#ff2d55" />
          <StatBox label="Pastebin"         value={pastebinLeaks.length}    sub="exposures"     accent="#f5a623" />
          <StatBox label="Darkweb"          value={darkwebMentions.length}  sub="mentions"      accent="#af52de" />
        </div>

        {/* Breach databases */}
        {breachDbs.length > 0 && (
          <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded p-3">
            <SectionHeader accent="#ff2d55">Found In Databases</SectionHeader>
            <div className="flex flex-wrap gap-1.5">
              {breachDbs.map((db, i) => (
                <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ color: '#ff2d55', backgroundColor: '#ff2d5515', border: '1px solid #ff2d5530' }}>
                  {db}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Password leaks */}
        {passwordLeaks.length > 0 && (
          <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded p-3">
            <SectionHeader accent="#ff2d55">Password Leaks</SectionHeader>
            <div className="space-y-2">
              {passwordLeaks.map((leak, idx) => (
                <div key={idx} className="p-2 bg-[#0a0e14] rounded border border-[#1c2333]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-mono font-bold text-[#ff2d55]">{leak.source}</span>
                    <div className="flex items-center gap-1.5">
                      {leak.hashType && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ color: '#6a7a9a', backgroundColor: '#1c233340' }}>
                          {leak.hashType}
                        </span>
                      )}
                      <SeverityBadge level={leak.severity} />
                    </div>
                  </div>
                  <KV k="Date"  v={leak.date} />
                  <KV k="Email" v={leak.email} vc="text-[#0af]" />
                  {leak.detail && (
                    <div className="mt-1.5 pt-1.5 border-t border-[#1c2333]">
                      <p className="text-[10px] font-mono text-[#6a7a9a] leading-relaxed">{leak.detail}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Credential leaks */}
        {credentialLeaks.length > 0 && (
          <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded p-3">
            <SectionHeader accent="#ff6b35">Credential Leaks</SectionHeader>
            <div className="space-y-2">
              {credentialLeaks.map((leak, idx) => (
                <div key={idx} className="p-2 bg-[#0a0e14] rounded border border-[#1c2333]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-mono font-bold text-[#ff6b35]">{leak.source}</span>
                    <SeverityBadge level={leak.severity} />
                  </div>
                  <KV k="Date" v={leak.date} />
                  <KV k="Type" v={leak.type} vc="text-[#ff6b35]" />
                  {leak.detail && (
                    <div className="mt-1.5 pt-1.5 border-t border-[#1c2333]">
                      <p className="text-[10px] font-mono text-[#6a7a9a] leading-relaxed">{leak.detail}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pastebin leaks */}
        {pastebinLeaks.length > 0 && (
          <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded p-3">
            <SectionHeader accent="#f5a623">Pastebin / Public Leaks</SectionHeader>
            <div className="space-y-2">
              {pastebinLeaks.map((leak, idx) => (
                <div key={idx} className="p-2 bg-[#0a0e14] rounded border border-[#1c2333]">
                  <KV k="Title" v={leak.title} vc="text-[#f5a623]" />
                  <KV k="URL"   v={leak.url}   vc="text-[#0af]" />
                  <KV k="Date"  v={leak.date} />
                  {leak.preview && (
                    <div className="mt-1.5 pt-1.5 border-t border-[#1c2333]">
                      <p className="text-[10px] font-mono text-[#3a4558] italic leading-relaxed break-all">{leak.preview}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Darkweb mentions */}
        {darkwebMentions.length > 0 && (
          <div className="col-span-2 bg-[#0d1017] border border-[#af52de30] rounded p-3">
            <SectionHeader accent="#af52de">Darkweb Mentions</SectionHeader>
            <div className="space-y-2">
              {darkwebMentions.map((mention, idx) => (
                <div key={idx} className="p-2 bg-[#0a0e14] rounded border border-[#1c2333]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-mono font-bold text-[#af52de]">{mention.forum}</span>
                    <span className="text-[10px] font-mono text-[#2a3548]">{mention.date}</span>
                  </div>
                  <p className="text-[10px] font-mono text-[#6a7a9a] leading-relaxed">{mention.context}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {totalLeaks === 0 && pastebinLeaks.length === 0 && darkwebMentions.length === 0 && (
          <div className="col-span-2 flex items-center justify-center py-8 flex-col gap-2">
            <span className="text-[24px] opacity-20">🛡</span>
            <span className="text-[11px] font-mono text-[#2a3548]">No leak exposure found</span>
          </div>
        )}
      </div>
    </div>
  );
}