import type { SourceCodeData, Dependency } from '../types/sourcecode-data';
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

function StatBox({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent: string }) {
  return (
    <div className="bg-[#0d1017] border border-[#1c2333] rounded p-2.5 flex flex-col gap-0.5">
      <span className="text-[9px] uppercase tracking-widest font-mono text-[#3a4558]">{label}</span>
      <span className="text-[15px] font-bold font-mono leading-none" style={{ color: accent }}>
        {value}
      </span>
      {sub && <span className="text-[8px] font-mono text-[#2a3548]">{sub}</span>}
    </div>
  );
}

export function DependencyAnalysis({ data }: { data: SourceCodeData }) {
  const { dependencyAnalysis } = data;
  
  const getDeps = (deps: Dependency[] | undefined): Dependency[] => deps || [];
  const packageDeps = getDeps(dependencyAnalysis.packageJson);
  const pipDeps = getDeps(dependencyAnalysis.requirementsTxt);
  const vulnerableDeps = [...packageDeps, ...pipDeps].filter(d => d.vulnerable);
  const totalDeps = packageDeps.length + pipDeps.length;
  
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10]">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 grid grid-cols-4 gap-2 mb-1">
          <StatBox label="Total Dependencies" value={totalDeps} sub="packages" accent="#0af" />
          <StatBox label="npm/pnpm" value={packageDeps.length} sub="JavaScript" accent="#f5a623" />
          <StatBox label="pip" value={pipDeps.length} sub="Python" accent="#30d158" />
          <StatBox label="Vulnerable" value={vulnerableDeps.length} sub="CVEs found" accent="#ff2d55" />
        </div>
        
        {packageDeps.length > 0 && (
          <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] font-mono">
                <thead>
                  <tr className="border-b border-[#1c2333] bg-[#0a0e14]">
                    <th className="text-left p-2 text-[#2a3548] font-normal">Package</th>
                    <th className="text-left p-2 text-[#2a3548] font-normal">Version</th>
                    <th className="text-left p-2 text-[#2a3548] font-normal">Vulnerable</th>
                    <th className="text-left p-2 text-[#2a3548] font-normal">CVE</th>
                  </tr>
                </thead>
                <tbody>
                  {packageDeps.map((dep, idx) => (
                    <tr key={idx} className="border-b border-[#111827] hover:bg-[#111827]">
                      <td className="p-2 text-[#0af]">{dep.name}</td>
                      <td className="p-2 text-[#6a7a9a]">{dep.version}</td>
                      <td className="p-2">
                        <span className={dep.vulnerable ? 'text-[#ff2d55]' : 'text-[#30d158]'}>
                          {dep.vulnerable ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="p-2 text-[#ff6b35]">{dep.cve?.join(', ') || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {vulnerableDeps.length > 0 && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
            <SectionHeader accent="#ff2d55">Vulnerability Summary</SectionHeader>
            {vulnerableDeps.map((dep, idx) => (
              <div key={idx} className="mb-2 p-2 bg-[#0a0e14] rounded">
                <div className="flex justify-between">
                  <span className="text-[11px] font-mono text-[#0af]">{dep.name}@{dep.version}</span>
                  <span className="text-[9px] text-[#ff2d55]">CRITICAL</span>
                </div>
                <div className="text-[9px] text-[#6a7a9a] mt-1">CVE: {dep.cve?.join(', ')}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}