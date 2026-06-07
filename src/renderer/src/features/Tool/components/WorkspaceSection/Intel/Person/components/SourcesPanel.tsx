import React from 'react';
import type { DataSource } from '../types/source';
import { SectionHeader } from './shared/SectionHeader';
import { Database, ExternalLink, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';

interface SourcesPanelProps {
  sources: DataSource[];
}

function SourceCredibilityBadge({ credibility }: { credibility: number }) {
  const pct = Math.round(credibility * 100);
  let color = '#6a7a9a';
  let bg = '#6a7a9a15';
  let icon = <Shield className="w-3 h-3" />;

  if (pct >= 70) {
    color = '#30d158';
    bg = '#30d15815';
    icon = <ShieldCheck className="w-3 h-3" />;
  } else if (pct >= 40) {
    color = '#f5a623';
    bg = '#f5a62315';
    icon = <ShieldAlert className="w-3 h-3" />;
  }

  return (
    <span
      className="text-[10px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1"
      style={{ color, backgroundColor: bg, border: `1px solid ${color}30` }}
    >
      {icon}
      {pct}% cred
    </span>
  );
}

export function SourcesPanel({ sources }: SourcesPanelProps) {
  const sortedSources = [...sources].sort((a, b) => b.credibility - a.credibility);
  const highCred = sources.filter(s => s.credibility >= 0.7).length;
  const mediumCred = sources.filter(s => s.credibility >= 0.4 && s.credibility < 0.7).length;
  const lowCred = sources.filter(s => s.credibility < 0.4).length;

  return (
    <div className="flex-1 overflow-y-auto p-3">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-[#0d1017] border border-[#30d15830] rounded p-2 flex flex-col items-center">
          <span className="text-[10px] font-mono text-[#30d158] uppercase tracking-widest">High Cred</span>
          <span className="text-[20px] font-bold font-mono text-[#30d158]">{highCred}</span>
        </div>
        <div className="bg-[#0d1017] border border-[#f5a62330] rounded p-2 flex flex-col items-center">
          <span className="text-[10px] font-mono text-[#f5a623] uppercase tracking-widest">Medium</span>
          <span className="text-[20px] font-bold font-mono text-[#f5a623]">{mediumCred}</span>
        </div>
        <div className="bg-[#0d1017] border border-[#6a7a9a30] rounded p-2 flex flex-col items-center">
          <span className="text-[10px] font-mono text-[#6a7a9a] uppercase tracking-widest">Low</span>
          <span className="text-[20px] font-bold font-mono text-[#6a7a9a]">{lowCred}</span>
        </div>
      </div>

      {/* Source list */}
      <div className="bg-[#0d1017] border border-[#1c2333] rounded overflow-hidden">
        <div className="bg-[#0a0e14] px-3 py-2 border-b border-[#1c2333]">
          <SectionHeader accent="#0af">All Sources ({sources.length})</SectionHeader>
        </div>
        <div className="divide-y divide-[#111827]">
          {sortedSources.map(source => (
            <div key={source.id} className="px-3 py-2 hover:bg-[#111827] transition-colors">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-[#6a7a9a]" />
                  <span className="text-[12px] font-mono font-bold text-[#c8d6f0]">{source.name}</span>
                </div>
                <SourceCredibilityBadge credibility={source.credibility} />
              </div>
              <div className="flex items-center gap-3 text-[10px] font-mono">
                <span className="text-[#6a7a9a] uppercase">{source.type.replace(/_/g, ' ')}</span>
                {source.url && (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0af] hover:underline flex items-center gap-1 truncate max-w-[300px]"
                    onClick={e => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3 h-3" />
                    {source.url}
                  </a>
                )}
                {source.retrievedAt && (
                  <span className="text-[#3a4558] ml-auto">
                    {new Date(source.retrievedAt).toLocaleString()}
                  </span>
                )}
              </div>
              {source.excerpt && (
                <div className="mt-1 pt-1 border-t border-[#1c2333] text-[10px] font-mono text-[#6a7a9a] italic leading-relaxed">
                  {source.excerpt.substring(0, 200)}{source.excerpt.length > 200 ? '…' : ''}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}