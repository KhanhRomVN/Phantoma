import type { ScanResult } from '../types/scan-result';
import { StatBox } from './shared/StatBox';
import { SectionHeader } from './shared/SectionHeader';

interface OverviewProps {
  result: ScanResult;
}

export function Overview({ result }: OverviewProps) {
  const totalDataPoints = result.allDataPoints.length;
  const sourceCount = result.sources.length;
  const noiseCount = result.allDataPoints.filter((dp) => dp.isNoise).length;

  const hostUpCount = result.allDataPoints.filter((dp) => dp.category === 'host_up').length;
  const portOpenCount = result.allDataPoints
    .filter((dp) => dp.category === 'port_open' || dp.category.startsWith('port_'))
    .filter((dp) => dp.metadata?.state === 'open').length;
  const serviceCount = result.allDataPoints.filter((dp) => dp.tags?.includes('service')).length;
  const osDetectedCount = result.allDataPoints.filter((dp) =>
    dp.tags?.includes('os_detection'),
  ).length;

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-4 gap-2 mb-3">
        <StatBox label="Data Points" value={totalDataPoints} sub="processed" accent="#0af" />
        <StatBox label="Hosts Up" value={hostUpCount} sub="discovered" accent="#30d158" />
        <StatBox label="Open Ports" value={portOpenCount} sub="total" accent="#ff6b35" />
        <StatBox label="Sources" value={sourceCount} sub="active" accent="#f5a623" />
      </div>

      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 mb-3">
        <SectionHeader accent="#0af">Target Information</SectionHeader>
        <div className="flex justify-between items-center py-1 border-b border-[#111827]">
          <span className="text-[11px] font-mono text-[#6a7a9a] uppercase tracking-wide">
            Network
          </span>
          <span className="text-[12px] font-mono text-[#0af]">{result.query.value}</span>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-[#111827]">
          <span className="text-[11px] font-mono text-[#6a7a9a] uppercase tracking-wide">
            Scan Type
          </span>
          <span className="text-[12px] font-mono text-[#ff6b35] uppercase">
            {result.scan.scanType}
          </span>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-[#111827]">
          <span className="text-[11px] font-mono text-[#6a7a9a] uppercase tracking-wide">
            Duration
          </span>
          <span className="text-[12px] font-mono text-[#c8d6f0]">
            {(result.scan.duration / 1000).toFixed(1)}s
          </span>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-[#111827]">
          <span className="text-[11px] font-mono text-[#6a7a9a] uppercase tracking-wide">
            Raw Hits
          </span>
          <span className="text-[12px] font-mono text-[#c8d6f0]">
            {result.scan.totalRawHits.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between items-center py-1">
          <span className="text-[11px] font-mono text-[#6a7a9a] uppercase tracking-wide">
            Confidence
          </span>
          <span
            className="text-[12px] font-mono"
            style={{ color: result.overallConfidence >= 0.7 ? '#30d158' : '#f5a623' }}
          >
            {Math.round(result.overallConfidence * 100)}%
          </span>
        </div>
      </div>

      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 mb-3">
        <SectionHeader accent="#30d158">Scan Summary</SectionHeader>
        <div className="grid grid-cols-3 gap-2">
          <StatBox label="Hosts Up" value={hostUpCount} sub="active hosts" accent="#30d158" />
          <StatBox label="Open Ports" value={portOpenCount} sub="accessible" accent="#ff6b35" />
          <StatBox label="Services" value={serviceCount} sub="detected" accent="#0a84ff" />
        </div>
      </div>

      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 mb-3">
        <SectionHeader accent="#0a84ff">Category Breakdown</SectionHeader>
        <div className="flex flex-wrap gap-2">
          {result.activeCategoryGroups
            .filter((g) => g.count > 0 && !['overview', 'raw', 'sources'].includes(g.id))
            .map((group) => (
              <span
                key={group.id}
                className="text-[11px] font-mono px-2 py-0.5 rounded border"
                style={{
                  color: group.accent,
                  borderColor: `${group.accent}30`,
                  backgroundColor: `${group.accent}10`,
                }}
              >
                {group.label} ({group.count})
              </span>
            ))}
        </div>
      </div>

      {result.warnings.length > 0 && (
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#f5a623">Warnings ({result.warnings.length})</SectionHeader>
          <div className="space-y-1">
            {result.warnings.map((w, i) => (
              <div key={i} className="text-[11px] font-mono text-[#f5a623] py-0.5">
                ⚠ {w}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
