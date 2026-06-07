import React from 'react';
import type { ReconResult } from '../types/recon-result';
import type { ReconEntity } from '../types/entity';
import { SectionHeader } from './shared/SectionHeader';
import { StatBox } from './shared/StatBox';
import { ConfidenceBadge } from './shared/ConfidenceBadge';
import { EntityCard } from './shared/EntityCard';
import { AlertTriangle, Info, Users, Database, Clock, Target } from 'lucide-react';

interface OverviewProps {
  result: ReconResult;
  onSelectEntity: (entityId: string) => void;
}

export function Overview({ result, onSelectEntity }: OverviewProps) {
  const { query, scan, entities, sources, warnings, overallConfidence } = result;

  const primaryEntities = entities.filter(e => e.relevance === 'primary');
  const secondaryEntities = entities.filter(e => e.relevance === 'secondary');
  const noiseEntities = entities.filter(e => e.relevance === 'noise');
  const totalLeakDps = result.allDataPoints.filter(dp =>
    ['password_leak', 'credential_leak', 'stealer_log', 'breach_entry'].includes(dp.category),
  ).length;
  const highCredSources = sources.filter(s => s.credibility >= 0.7).length;

  return (
    <div className="flex-1 overflow-y-auto p-3">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-bold text-[#0af] uppercase tracking-widest">
            {query.type}: {query.value}
          </span>
          <ConfidenceBadge value={overallConfidence} showLabel />
        </div>
        <span className="text-[10px] font-mono text-[#6a7a9a]">
          {new Date(scan.completedAt).toLocaleString()}
        </span>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <StatBox label="Entities" value={entities.length} sub={`${primaryEntities.length} primary`} accent="#af52de" />
        <StatBox label="Data Points" value={result.allDataPoints.length} sub={`${result.unassignedDataPoints.length} unassigned`} accent="#0af" />
        <StatBox label="Sources" value={sources.length} sub={`${highCredSources} high-cred`} accent="#30d158" />
        <StatBox label="Leak Data" value={totalLeakDps} sub="breaches & leaks" accent="#ff375f" />
      </div>

      {/* Scan metadata */}
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 mb-3">
        <SectionHeader accent="#0af">Scan Summary</SectionHeader>
        <div className="grid grid-cols-4 gap-3 text-[11px] font-mono">
          <div>
            <span className="text-[#6a7a9a]">Duration</span>
            <div className="text-[#c8d6f0]">{(scan.duration / 1000).toFixed(1)}s</div>
          </div>
          <div>
            <span className="text-[#6a7a9a]">Raw Hits</span>
            <div className="text-[#c8d6f0]">{scan.totalRawHits.toLocaleString()}</div>
          </div>
          <div>
            <span className="text-[#6a7a9a]">Processed</span>
            <div className="text-[#c8d6f0]">{scan.totalProcessedHits.toLocaleString()}</div>
          </div>
          <div>
            <span className="text-[#6a7a9a]">Signal Ratio</span>
            <div className="text-[#0af]">
              {scan.totalRawHits > 0
                ? ((entities.filter(e => e.relevance !== 'noise').length / entities.length) * 100).toFixed(0)
                : 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-[#0d1017] border border-[#f5a62330] rounded p-3 mb-3">
          <SectionHeader accent="#f5a623">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Warnings
            </div>
          </SectionHeader>
          <div className="space-y-1">
            {warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px] font-mono text-[#f5a623] leading-relaxed">
                <span className="shrink-0 mt-0.5">⚠</span>
                <span>{w}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Primary Entities */}
      {primaryEntities.length > 0 && (
        <div className="mb-3">
          <SectionHeader accent="#30d158">Primary Entities ({primaryEntities.length})</SectionHeader>
          <div className="space-y-1">
            {primaryEntities.map(e => (
              <EntityCard
                key={e.id}
                entity={e}
                isSelected={false}
                onClick={() => onSelectEntity(e.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Secondary Entities */}
      {secondaryEntities.length > 0 && (
        <div className="mb-3">
          <SectionHeader accent="#f5a623">Secondary Entities ({secondaryEntities.length})</SectionHeader>
          <div className="space-y-1 max-h-[200px] overflow-y-auto">
            {secondaryEntities.map(e => (
              <EntityCard
                key={e.id}
                entity={e}
                isSelected={false}
                onClick={() => onSelectEntity(e.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Noise summary */}
      {noiseEntities.length > 0 && (
        <div className="mb-3">
          <SectionHeader accent="#6a7a9a">Noise ({noiseEntities.length} entities)</SectionHeader>
          <div className="text-[11px] font-mono text-[#6a7a9a] leading-relaxed bg-[#0d1017] border border-[#1c2333] rounded p-2">
            {noiseEntities.length} entities were classified as noise. They matched the query but are likely unrelated.
            <span
              className="text-[#0af] ml-1 cursor-pointer hover:underline"
              onClick={() => {}}  // Will link to noise tab
            >
              View in Raw Data tab →
            </span>
          </div>
        </div>
      )}

      {/* Sources summary */}
      <div className="mb-3">
        <SectionHeader accent="#64d2ff">Top Sources</SectionHeader>
        <div className="space-y-1">
          {sources
            .sort((a, b) => b.credibility - a.credibility)
            .slice(0, 8)
            .map(source => (
              <div key={source.id} className="flex items-center gap-2 py-1 px-2 hover:bg-[#111827] rounded transition-colors">
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: source.credibility >= 0.7 ? '#30d158' : source.credibility >= 0.4 ? '#f5a623' : '#6a7a9a',
                  }}
                />
                <span className="text-[11px] font-mono text-[#c8d6f0] flex-1">{source.name}</span>
                <span className="text-[10px] font-mono text-[#6a7a9a] uppercase">{source.type.replace('_', ' ')}</span>
                <span className="text-[10px] font-mono" style={{ color: source.credibility >= 0.7 ? '#30d158' : source.credibility >= 0.4 ? '#f5a623' : '#6a7a9a' }}>
                  {Math.round(source.credibility * 100)}%
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}