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

function TagChip({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="text-[9px] font-mono px-1.5 py-0.5 rounded"
      style={{ color, backgroundColor: `${color}15`, border: `1px solid ${color}25` }}
    >
      {label}
    </span>
  );
}

export function TechnicalFootprint({ data }: { data: PersonData }) {
  const { technicalFootprint, leakExposure } = data;
  const repoCount      = technicalFootprint.repositoryContributions?.length || 0;
  const keyCount       = technicalFootprint.publicKeys?.length || 0;
  const domainCount    = technicalFootprint.domainOwnership?.length || 0;
  const passwordLeaks  = leakExposure.passwordLeaks?.length || 0;
  const totalContribs  = technicalFootprint.repositoryContributions?.reduce((s, r) => s + r.contributions, 0) || 0;

  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10]">
      <div className="grid grid-cols-2 gap-2">

        {/* Stat row */}
        <div className="col-span-2 grid grid-cols-4 gap-2 mb-1">
          <StatBox label="Repos"        value={repoCount}     sub="linked"       accent="#0af" />
          <StatBox label="Contributions" value={totalContribs} sub="total commits" accent="#64d2ff" />
          <StatBox label="Domains"      value={domainCount}   sub="owned"        accent="#30d158" />
          <StatBox label="Public Keys"  value={keyCount}      sub="exposed"      accent="#f5a623" />
        </div>

        {/* Code platforms */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#0af">Code Platforms</SectionHeader>
          {technicalFootprint.github       && <KV k="GitHub"       v={technicalFootprint.github}       vc="text-[#6e5494]" />}
          {technicalFootprint.gitlab       && <KV k="GitLab"       v={technicalFootprint.gitlab}       vc="text-[#fc6d26]" />}
          {technicalFootprint.stackoverflow && <KV k="StackOverflow" v={technicalFootprint.stackoverflow} vc="text-[#f48024]" />}
          {!technicalFootprint.github && !technicalFootprint.gitlab && !technicalFootprint.stackoverflow && (
            <span className="text-[10px] font-mono text-[#3a4558]">No code platforms found</span>
          )}
        </div>

        {/* Tech stack */}
        {technicalFootprint.technologies && technicalFootprint.technologies.length > 0 && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
            <SectionHeader accent="#64d2ff">Tech Stack</SectionHeader>
            <div className="flex flex-wrap gap-1.5">
              {technicalFootprint.technologies.map((t, i) => (
                <TagChip key={i} label={t} color="#64d2ff" />
              ))}
            </div>
          </div>
        )}

        {/* Repository contributions */}
        {repoCount > 0 && (
          <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded p-3">
            <SectionHeader accent="#0af">Repository Contributions</SectionHeader>
            <div className="space-y-1.5">
              {technicalFootprint.repositoryContributions!.map((repo, idx) => {
                const pct = Math.round((repo.contributions / (totalContribs || 1)) * 100);
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-[#6e5494] w-[200px] truncate shrink-0">{repo.repo}</span>
                    <div className="flex-1 h-1 bg-[#111827] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[#0af]" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] font-mono text-[#0af] w-10 text-right shrink-0">{repo.contributions}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Domain ownership */}
        {domainCount > 0 && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
            <SectionHeader accent="#30d158">Domain Ownership</SectionHeader>
            {technicalFootprint.domainOwnership!.map((domain, idx) => (
              <KV key={idx} k={`Domain ${idx + 1}`} v={domain} vc="text-[#0af]" />
            ))}
          </div>
        )}

        {/* IP Addresses */}
        {technicalFootprint.ipAddresses && technicalFootprint.ipAddresses.length > 0 && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
            <SectionHeader accent="#ff6b35">IP Addresses</SectionHeader>
            {technicalFootprint.ipAddresses.map((ip, idx) => (
              <KV key={idx} k={`IP ${idx + 1}`} v={ip} vc="text-[#ff6b35]" />
            ))}
            {technicalFootprint.hostingProviders && technicalFootprint.hostingProviders.length > 0 && (
              <div className="pt-1 mt-1 border-t border-[#1c2333]">
                <span className="text-[10px] font-mono text-[#3a4558] uppercase tracking-wide block mb-1">Hosting</span>
                <div className="flex flex-wrap gap-1">
                  {technicalFootprint.hostingProviders.map((h, i) => (
                    <TagChip key={i} label={h} color="#ff6b35" />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Public keys */}
        {keyCount > 0 && (
          <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded p-3">
            <SectionHeader accent="#f5a623">Public Keys</SectionHeader>
            {technicalFootprint.publicKeys!.map((key, idx) => (
              <div key={idx} className="py-1 border-b border-[#111827] last:border-0">
                <p className="text-[10px] font-mono text-[#8da0c0] break-all">{key.length > 80 ? key.substring(0, 80) + '…' : key}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tools published */}
        {technicalFootprint.toolsPublished && technicalFootprint.toolsPublished.length > 0 && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
            <SectionHeader accent="#30d158">Tools Published</SectionHeader>
            <div className="flex flex-wrap gap-1.5">
              {technicalFootprint.toolsPublished.map((t, i) => (
                <TagChip key={i} label={t} color="#30d158" />
              ))}
            </div>
          </div>
        )}

        {/* Conferences */}
        {technicalFootprint.conferences && technicalFootprint.conferences.length > 0 && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
            <SectionHeader accent="#af52de">Conferences</SectionHeader>
            {technicalFootprint.conferences.map((c, i) => (
              <div key={i} className="py-1 border-b border-[#111827] last:border-0">
                <span className="text-[11px] font-mono text-[#af52de]">{c}</span>
              </div>
            ))}
          </div>
        )}

        {/* CTF Results */}
        {technicalFootprint.ctfResults && technicalFootprint.ctfResults.length > 0 && (
          <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded p-3">
            <SectionHeader accent="#f5a623">CTF Results</SectionHeader>
            <div className="space-y-1">
              {technicalFootprint.ctfResults.map((ctf, i) => (
                <div key={i} className="flex items-center gap-3 py-1 border-b border-[#111827] last:border-0">
                  <span
                    className="text-[12px] font-bold font-mono w-6 text-center shrink-0"
                    style={{ color: ctf.rank === 1 ? '#f5a623' : ctf.rank <= 3 ? '#30d158' : '#6a7a9a' }}
                  >
                    #{ctf.rank}
                  </span>
                  <span className="text-[11px] font-mono text-[#c8d6f0] flex-1">{ctf.event}</span>
                  <span className="text-[10px] font-mono text-[#3a4558]">{ctf.team}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Password leaks preview */}
        {passwordLeaks > 0 && (
          <div className="col-span-2 bg-[#0d1017] border border-[#ff2d5530] rounded p-3">
            <SectionHeader accent="#ff2d55">⚠ Credential Exposure</SectionHeader>
            <div className="text-[11px] font-mono text-[#ff2d55]">
              {passwordLeaks} password leak{passwordLeaks > 1 ? 's' : ''} detected — see Leak Exposure tab for details
            </div>
          </div>
        )}
      </div>
    </div>
  );
}