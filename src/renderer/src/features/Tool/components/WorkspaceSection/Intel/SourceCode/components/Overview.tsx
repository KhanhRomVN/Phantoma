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

function KV({ k, v, vc = 'text-[#c8d6f0]' }: { k: string; v: string | number | React.ReactNode; vc?: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-[#111827] last:border-0">
      <span className="text-[11px] font-mono text-[#c8d6f0] uppercase tracking-wide">{k}</span>
      <span className={cn('text-[12px] font-mono', vc)}>{v}</span>
    </div>
  );
}

function RiskBar({ label, score, max = 10, color }: { label: string; score: number; max?: number; color: string }) {
  const percentage = (score / max) * 100;
  return (
    <div className="mb-2">
      <div className="flex justify-between text-[10px] font-mono mb-0.5">
        <span className="text-[#c8d6f0]">{label}</span>
        <span className="text-[#c8d6f0]">{score}/{max}</span>
      </div>
      <div className="h-1.5 bg-[#1c2333] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export function SourceCodeOverview({ data }: { data: SourceCodeData }) {
  const { repoInfo, developerInfo, secretExposure, dependencyAnalysis, appIntelligence } = data;
  
  const contributorCount = developerInfo.contributors?.length || 0;
  const commitCount = repoInfo.commitHistory?.totalCommits || 0;
  const secretCount = (secretExposure.apiKeys?.length || 0) + (secretExposure.secretTokens?.length || 0) + (secretExposure.databaseCredentials?.length || 0);
  const vulnerableDeps = [...(dependencyAnalysis.packageJson || []), ...(dependencyAnalysis.requirementsTxt || [])].filter(d => d.vulnerable).length;
  const exposedEndpoints = appIntelligence.apiEndpoints?.length || 0;
  
  const overallRiskScore = (secretCount * 8 + vulnerableDeps * 5 + exposedEndpoints * 2) / 10;
  const riskColor = overallRiskScore >= 7 ? '#ff2d55' : overallRiskScore >= 4 ? '#f5a623' : '#30d158';
  
  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 bg-gradient-to-r from-[#0a0e14] to-[#0d1017] border border-[#1c2333] rounded p-3 mb-1">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-[20px] font-bold font-mono text-[#0af]">{repoInfo.repositoryName}</div>
              <div className="text-[10px] font-mono text-[#c8d6f0] mt-0.5">{repoInfo.owner} • {repoInfo.visibility}</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-[#c8d6f0]">Overall Risk Score</div>
              <div className="text-[28px] font-bold font-mono" style={{ color: riskColor }}>{overallRiskScore.toFixed(1)}</div>
              <div className="text-[9px] text-[#c8d6f0]">/ 10.0</div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-2 col-span-2 mb-1">
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-2 text-center">
            <div className="text-[10px] text-[#c8d6f0]">Commits</div>
            <div className="text-[19px] font-bold text-[#0af]">{commitCount.toLocaleString()}</div>
          </div>
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-2 text-center">
            <div className="text-[10px] text-[#c8d6f0]">Contributors</div>
            <div className="text-[19px] font-bold text-[#30d158]">{contributorCount}</div>
          </div>
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-2 text-center">
            <div className="text-[10px] text-[#c8d6f0]">Secrets Exposed</div>
            <div className="text-[19px] font-bold text-[#ff2d55]">{secretCount}</div>
          </div>
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-2 text-center">
            <div className="text-[10px] text-[#c8d6f0]">Vuln. Dependencies</div>
            <div className="text-[19px] font-bold text-[#ff6b35]">{vulnerableDeps}</div>
          </div>
        </div>
        
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#0af">Repository</SectionHeader>
          <KV k="Name" v={repoInfo.repositoryName} vc="text-[#0af]" />
          <KV k="Visibility" v={repoInfo.visibility} vc={repoInfo.visibility === 'public' ? 'text-[#ff6b35]' : 'text-[#30d158]'} />
          <KV k="Branches" v={repoInfo.branches?.length || 0} />
          <KV k="Releases" v={repoInfo.releases?.length || 0} />
        </div>
        
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#30d158">Code Health</SectionHeader>
          <KV k="Total Commits" v={commitCount.toLocaleString()} />
          <KV k="First Commit" v={repoInfo.commitHistory?.firstCommitDate?.split('T')[0] || 'N/A'} />
          <KV k="Last Commit" v={repoInfo.commitHistory?.lastCommitDate?.split('T')[0] || 'N/A'} />
        </div>
        
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
          <SectionHeader accent="#ff2d55">Risk Breakdown</SectionHeader>
          <RiskBar label="Secret Exposure" score={secretCount} max={10} color="#ff2d55" />
          <RiskBar label="Vulnerable Dependencies" score={vulnerableDeps} max={10} color="#ff6b35" />
          <RiskBar label="Exposed Endpoints" score={exposedEndpoints} max={20} color="#f5a623" />
          <RiskBar label="CI/CD Configs" score={data.infrastructureInfo.ciCdConfig?.length || 0} max={5} color="#0af" />
        </div>
      </div>
    </div>
  );
}