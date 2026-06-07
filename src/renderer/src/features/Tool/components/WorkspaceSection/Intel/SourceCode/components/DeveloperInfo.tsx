import type { SourceCodeData } from '../types/sourcecode-data';
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

export function DeveloperInfo({ data }: { data: SourceCodeData }) {
  const { developerInfo } = data;
  
  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-[#0d1017] border border-[#1c2333] rounded overflow-hidden col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] font-mono">
              <thead>
                <tr className="border-b border-[#1c2333] bg-[#0a0e14]">
                  <th className="text-left p-2 text-[#c8d6f0] font-normal">Name</th>
                  <th className="text-left p-2 text-[#c8d6f0] font-normal">Email</th>
                  <th className="text-left p-2 text-[#c8d6f0] font-normal">Commits</th>
                  <th className="text-left p-2 text-[#c8d6f0] font-normal">Maintainer</th>
                </tr>
              </thead>
              <tbody>
                {developerInfo.contributors.map((contributor, idx) => (
                  <tr key={idx} className="border-b border-[#111827] hover:bg-[#111827]">
                    <td className="p-2 text-[#0af]">{contributor.name}</td>
                    <td className="p-2 text-[#c8d6f0]">{contributor.email}</td>
                    <td className="p-2 text-[#30d158]">{contributor.commits}</td>
                    <td className="p-2">
                      {developerInfo.maintainers.includes(contributor.email) ? (
                        <span className="text-[9px] font-bold text-[#f5a623]">MAINTAINER</span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
          <SectionHeader accent="#30d158">Commit Emails</SectionHeader>
          <div className="flex flex-wrap gap-2">
            {developerInfo.commitEmails.map((email, idx) => (
              <span key={idx} className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#0a0e14] border border-[#1c2333] text-[#c8d6f0]">
                {email}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}