import type { DataPoint } from '../../types/data-point';

interface DataPointRowProps {
  dataPoint: DataPoint;
}

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? 'var(--success)' : pct >= 40 ? 'var(--warning)' : 'var(--error)';
  const bgColor = pct >= 70 ? 'var(--success)15' : pct >= 40 ? 'var(--warning)15' : 'var(--error)15';
  return (
    <span
      className="text-[9px] font-mono px-1 py-0.5 rounded border ml-1 shrink-0"
      style={{ color, borderColor: color, backgroundColor: bgColor }}
    >
      {pct}%
    </span>
  );
}

export function DataPointRow({ dataPoint }: DataPointRowProps) {
  const { displayValue, confidence, source, isNoise, riskScore } = dataPoint;

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 bg-card-background border border-border rounded text-[11px] font-mono hover:border-border transition-colors">
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className={cn("truncate", isNoise ? 'text-text-secondary' : 'text-text-primary')}>
          {displayValue || String(dataPoint.value || '')}
        </span>
        {isNoise && (
          <span className="text-[9px] text-text-secondary bg-border px-1 rounded shrink-0">
            NOISE
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {riskScore !== undefined && riskScore >= 50 && (
          <span
            className="text-[9px] font-mono px-1 rounded"
            style={{
              color: riskScore >= 75 ? 'var(--error)' : 'var(--warning)',
              backgroundColor: riskScore >= 75 ? 'var(--error)15' : 'var(--warning)15',
            }}
          >
            R{riskScore}
          </span>
        )}

        <ConfidenceBadge value={confidence} />

        <span className="text-[9px] text-text-secondary bg-border px-1 rounded truncate max-w-[120px]">
          {source.name}
        </span>
      </div>
    </div>
  );
}
