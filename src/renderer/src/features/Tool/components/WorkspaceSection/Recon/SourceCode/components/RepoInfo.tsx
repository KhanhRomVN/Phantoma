import type { SourceCodeData } from '../types/sourcecode-data';
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
    <div className="flex justify-between items-center py-1 border-b border-[#111827] last:border-0">
      <span className="text-[10px] font-mono text-[#3a4558] uppercase tracking-wide">{k}</span>
      <span className={cn('text-[11px] font-mono', vc)}>{v}</span>
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

export function RepoInfo({ data }: { data: SourceCodeData }) {
  const { repoInfo, developerInfo } = data;
  const contributorCount = developerInfo.contributors?.length || 0;
  const commitCount = repoInfo.commitHistory?.totalCommits || 0;
  
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10]">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 grid grid-cols-4 gap-2 mb-1">
          <StatBox label="Repository" value={repoInfo.repositoryName} sub={repoInfo.owner} accent="#0af" />
          <StatBox label="Visibility" value={repoInfo.visibility} sub="" accent={repoInfo.visibility === 'public' ? '#ff6b35' : '#30d158'} />
          <StatBox label="Contributors" value={contributorCount} sub="developers" accent="#f5a623" />
          <StatBox label="Commits" value={commitCount.toLocaleString()} sub="total" accent="#bf5af2" />
        </div>
        
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#0af">Repository Details</SectionHeader>
          <KV k="Owner" v={repoInfo.owner} vc="text-[#0af]" />
          <KV k="Visibility" v={repoInfo.visibility} vc={repoInfo.visibility === 'public' ? 'text-[#ff6b35]' : 'text-[#30d158]'} />
          {repoInfo.branches && <KV k="Branches" v={repoInfo.branches.length} />}
          {repoInfo.tags && <KV k="Tags" v={repoInfo.tags.length} />}
          {repoInfo.releases && <KV k="Releases" v={repoInfo.releases.length} />}
        </div>
        
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#30d158">Commit History</SectionHeader>
          {repoInfo.commitHistory ? (
            <>
              <KV k="Total Commits" v={repoInfo.commitHistory.totalCommits.toLocaleString()} />
              <KV k="First Commit" v={repoInfo.commitHistory.firstCommitDate} />
              <KV k="Last Commit" v={repoInfo.commitHistory.lastCommitDate} />
            </>
          ) : (
            <span className="text-[10px] text-[#3a4558]">No commit data</span>
          )}
        </div>
        
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
          <SectionHeader accent="#f5a623">Contributors</SectionHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] font-mono">
              <thead>
                <tr className="border-b border-[#1c2333]">
                  <th className="text-left p-1 text-[#2a3548] font-normal">Name</th>
                  <th className="text-left p-1 text-[#2a3548] font-normal">Email</th>
                  <th className="text-left p-1 text-[#2a3548] font-normal">Commits</th>
                </tr>
              </thead>
              <tbody>
                {developerInfo.contributors?.map((contributor, idx) => (
                  <tr key={idx} className="border-b border-[#111827]">
                    <td className="p-1 text-[#0af]">{contributor.name}</td>
                    <td className="p-1 text-[#6a7a9a]">{contributor.email}</td>
                    <td className="p-1 text-[#30d158]">{contributor.commits}</td>
                   </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}