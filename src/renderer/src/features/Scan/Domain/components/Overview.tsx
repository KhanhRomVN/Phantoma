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
  const highSeverityCount = result.allDataPoints.filter(
    (dp) => dp.severity === 'critical' || dp.severity === 'high',
  ).length;

  const zoneTransferSuccess = result.allDataPoints.filter(
    (dp) => dp.category === 'zone_transfer_success',
  ).length;
  const bruteForceResolved = result.allDataPoints.filter(
    (dp) => dp.category === 'bruteforce_resolved' || dp.category === 'bruteforce_internal',
  ).length;
  const misconfigCount = result.allDataPoints.filter((dp) =>
    dp.category.startsWith('misconfig_'),
  ).length;

  return (
    <div className="flex-1 overflow-y-auto p-3">
      {/* Top stats row */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <StatBox label="Data Points" value={totalDataPoints} sub="processed" accent="#0af" />
        <StatBox
          label="High Risk"
          value={highSeverityCount}
          sub="findings"
          accent={highSeverityCount > 0 ? '#ff2d55' : '#30d158'}
        />
        <StatBox label="Sources" value={sourceCount} sub="active" accent="#f5a623" />
        <StatBox label="Noise" value={noiseCount} sub="filtered" accent="#6a7a9a" />
      </div>

      {/* Scan Info Card */}
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 mb-3">
        <SectionHeader accent="#0af">Target Information</SectionHeader>
        <div className="flex justify-between items-center py-1 border-b border-[#111827]">
          <span className="text-[11px] font-mono text-[#6a7a9a] uppercase tracking-wide">
            Domain
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

      {/* Quick Summary Card */}
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 mb-3">
        <SectionHeader accent="#30d158">Scan Summary</SectionHeader>
        <div className="grid grid-cols-3 gap-2">
          <StatBox
            label="Zone Transfer"
            value={zoneTransferSuccess > 0 ? 'OPEN' : 'LOCKED'}
            sub={`${zoneTransferSuccess} success`}
            accent={zoneTransferSuccess > 0 ? '#ff2d55' : '#30d158'}
          />
          <StatBox label="Subdomains" value={bruteForceResolved} sub="resolved" accent="#0a84ff" />
          <StatBox
            label="Misconfigs"
            value={misconfigCount}
            sub="issues"
            accent={misconfigCount > 0 ? '#ff6b35' : '#30d158'}
          />
        </div>
      </div>

      {/* Category Breakdown */}
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

      {/* Warnings */}
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
