import type { DataPoint } from '../../types/data-point';

interface DataTableProps {
  dataPoints: DataPoint[];
  columns?: ('value' | 'category' | 'confidence' | 'source' | 'risk' | 'metadata')[];
  maxRows?: number;
}

const RISK_COLORS: Record<number, string> = {
  75: '#ff2d55',
  50: '#f5a623',
  0: '#30d158',
};

function getRiskColor(score: number): string {
  if (score >= 75) return RISK_COLORS[75];
  if (score >= 50) return RISK_COLORS[50];
  return RISK_COLORS[0];
}

function ConfidenceCell({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? '#30d158' : pct >= 40 ? '#f5a623' : '#ff2d55';
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-10 h-1.5 bg-[#111827] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[10px] font-mono tabular-nums" style={{ color }}>
        {pct}%
      </span>
    </div>
  );
}

export function DataTable({
  dataPoints,
  columns = ['value', 'category', 'confidence', 'source', 'risk'],
  maxRows,
}: DataTableProps) {
  const display = maxRows ? dataPoints.slice(0, maxRows) : dataPoints;

  if (dataPoints.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px] font-mono border-collapse">
        <thead>
          <tr className="border-b border-[#1c2333]">
            {columns.includes('value') && (
              <th className="text-left py-2 px-2 text-[10px] uppercase tracking-wider text-[#6a7a9a] font-medium">
                Value
              </th>
            )}
            {columns.includes('category') && (
              <th className="text-left py-2 px-2 text-[10px] uppercase tracking-wider text-[#6a7a9a] font-medium w-[100px]">
                Category
              </th>
            )}
            {columns.includes('metadata') && (
              <th className="text-left py-2 px-2 text-[10px] uppercase tracking-wider text-[#6a7a9a] font-medium w-[120px]">
                Details
              </th>
            )}
            {columns.includes('confidence') && (
              <th className="text-left py-2 px-2 text-[10px] uppercase tracking-wider text-[#6a7a9a] font-medium w-[90px]">
                Conf
              </th>
            )}
            {columns.includes('source') && (
              <th className="text-left py-2 px-2 text-[10px] uppercase tracking-wider text-[#6a7a9a] font-medium w-[110px]">
                Source
              </th>
            )}
            {columns.includes('risk') && (
              <th className="text-right py-2 px-2 text-[10px] uppercase tracking-wider text-[#6a7a9a] font-medium w-[50px]">
                Risk
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {display.map((dp) => (
            <tr
              key={dp.id}
              className="border-b border-[#111827] hover:bg-[#0d1017] transition-colors"
              style={{ opacity: dp.isNoise ? 0.4 : 1 }}
            >
              {columns.includes('value') && (
                <td
                  className="py-1.5 px-2 max-w-[400px] truncate"
                  style={{ color: dp.isNoise ? '#3a4558' : '#c8d6f0' }}
                  title={dp.displayValue || String(dp.value)}
                >
                  {dp.displayValue || String(dp.value)}
                  {dp.isNoise && (
                    <span className="ml-1.5 text-[9px] text-[#6a7a9a] bg-[#1c2333] px-1 rounded">
                      NOISE
                    </span>
                  )}
                </td>
              )}
              {columns.includes('category') && (
                <td className="py-1.5 px-2">
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded"
                    style={{
                      color: dp.verificationStatus === 'verified' ? '#30d158' : '#6a7a9a',
                      backgroundColor:
                        dp.verificationStatus === 'verified' ? '#30d15815' : '#1c2333',
                    }}
                  >
                    {dp.label}
                  </span>
                </td>
              )}
              {columns.includes('metadata') && (
                <td className="py-1.5 px-2 text-[10px] text-[#3a4558]">
                  {dp.metadata
                    ? Object.entries(dp.metadata)
                        .filter(([, v]) => v !== undefined && v !== null && typeof v !== 'object')
                        .slice(0, 2)
                        .map(([k, v]) => (
                          <div key={k} className="truncate max-w-[110px]">
                            {String(v)}
                          </div>
                        ))
                    : '—'}
                </td>
              )}
              {columns.includes('confidence') && (
                <td className="py-1.5 px-2">
                  <ConfidenceCell value={dp.confidence} />
                </td>
              )}
              {columns.includes('source') && (
                <td className="py-1.5 px-2">
                  <span className="text-[10px] text-[#3a4558] truncate block max-w-[100px]">
                    {dp.source.name}
                  </span>
                </td>
              )}
              {columns.includes('risk') && (
                <td className="py-1.5 px-2 text-right">
                  {dp.riskScore !== undefined && dp.riskScore >= 50 ? (
                    <span
                      className="text-[10px] font-bold tabular-nums"
                      style={{ color: getRiskColor(dp.riskScore) }}
                    >
                      {dp.riskScore}
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#3a4558]">—</span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {maxRows && dataPoints.length > maxRows && (
        <div className="text-[10px] font-mono text-[#6a7a9a] text-center py-2 border-t border-[#1c2333]">
          +{dataPoints.length - maxRows} more rows
        </div>
      )}
    </div>
  );
}
