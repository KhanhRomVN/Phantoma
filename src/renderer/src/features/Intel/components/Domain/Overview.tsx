import type { ReconResult } from '../../types/domain/recon-result';
import { StatBox } from '../shared/StatBox';
import { SectionHeader } from '../shared/SectionHeader';

interface OverviewProps {
  result: ReconResult;
  onSelectEntity: (entityId: string) => void;
}

export function Overview({ result, onSelectEntity }: OverviewProps) {
  const totalDataPoints = result.allDataPoints.length;
  const entityCount = result.entities.length;
  const sourceCount = result.sources.length;
  const highRiskEntities = result.entities.filter((e) => e.riskScore && e.riskScore >= 75).length;

  return (
    <div className="flex-1 overflow-y-auto p-3">
      {/* Top stats row */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <StatBox label="Data Points" value={totalDataPoints} sub="processed" accent="var(--primary)" />
        <StatBox label="Entities" value={entityCount} sub="identified" accent="var(--success)" />
        <StatBox label="Sources" value={sourceCount} sub="integrated" accent="var(--warning)" />
        <StatBox
          label="High Risk"
          value={highRiskEntities}
          sub="entities ≥75"
          accent={highRiskEntities > 0 ? 'var(--error)' : 'var(--success)'}
        />
      </div>

      {/* Scan Info Card */}
      <div className="bg-card-background border border-border rounded p-3 mb-3">
        <SectionHeader accent="var(--primary)">Target Information</SectionHeader>
        <div className="flex justify-between items-center py-1 border-b border-border">
          <span className="text-[11px] font-mono text-text-secondary uppercase tracking-wide">
            Domain
          </span>
          <span className="text-[12px] font-mono text-primary">{result.query.value}</span>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-[#111827]">
          <span className="text-[11px] font-mono text-text-secondary uppercase tracking-wide">
            Scan Duration
          </span>
          <span className="text-[12px] font-mono text-text-primary">
            {(result.scan.duration / 1000).toFixed(1)}s
          </span>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-[#111827]">
          <span className="text-[11px] font-mono text-text-secondary uppercase tracking-wide">
            Raw Hits
          </span>
          <span className="text-[12px] font-mono text-text-primary">
            {result.scan.totalRawHits.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between items-center py-1">
          <span className="text-[11px] font-mono text-text-secondary uppercase tracking-wide">
            Confidence
          </span>
          <span
            className="text-[12px] font-mono"
            style={{ color: result.overallConfidence >= 0.7 ? 'var(--success)' : 'var(--warning)' }}
          >
            {Math.round(result.overallConfidence * 100)}%
          </span>
        </div>
      </div>

      {/* Entities Card */}
      <div className="bg-card-background border border-border rounded p-3 mb-3">
        <SectionHeader accent="var(--accent-purple)">
          Top Entities
          <span className="text-[10px] font-normal text-text-secondary ml-1">
            ({result.entities.length})
          </span>
        </SectionHeader>
        <div className="space-y-1">
          {result.entities.slice(0, 5).map((entity) => (
            <div
              key={entity.id}
              onClick={() => onSelectEntity(entity.id)}
              className="flex items-center justify-between px-2 py-1.5 bg-card-background border border-border rounded cursor-pointer hover:border-border transition-all"
            >
              <div>
                <span className="text-[12px] font-mono text-text-primary">{entity.displayName}</span>
                <span className="text-[10px] font-mono text-text-secondary ml-2">{entity.summary}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono px-1 rounded bg-border text-text-secondary">
                  {entity.relevance.toUpperCase()}
                </span>
                {entity.riskScore !== undefined && (
                  <span
                    className="text-[9px] font-mono px-1 rounded"
                    style={{
                      color:
                        entity.riskScore >= 75
                          ? 'var(--error)'
                          : entity.riskScore >= 50
                            ? 'var(--warning)'
                            : 'var(--success)',
                      backgroundColor:
                        entity.riskScore >= 75
                          ? 'var(--error)15'
                          : entity.riskScore >= 50
                            ? 'var(--warning)15'
                            : 'var(--success)15',
                    }}
                  >
                    R{entity.riskScore}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-card-background border border-border rounded p-3 mb-3">
        <SectionHeader accent="var(--success)">Category Breakdown</SectionHeader>
        <div className="flex flex-wrap gap-2">
          {result.activeCategoryGroups
            .filter(
              (g) => g.count > 0 && !['overview', 'timeline', 'raw', 'sources'].includes(g.id),
            )
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
        <div className="bg-card-background border border-border rounded p-3">
          <SectionHeader accent="var(--warning)">Warnings ({result.warnings.length})</SectionHeader>
          <div className="space-y-1">
            {result.warnings.slice(0, 5).map((w, i) => (
              <div key={i} className="text-[11px] font-mono text-warning py-0.5">
                ⚠ {w}
              </div>
            ))}
            {result.warnings.length > 5 && (
              <div className="text-[11px] font-mono text-text-secondary text-center">
                +{result.warnings.length - 5} more warnings
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
