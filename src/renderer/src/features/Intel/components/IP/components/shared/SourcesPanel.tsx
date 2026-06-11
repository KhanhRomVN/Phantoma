import type { DataSource } from '../../types/data-point';

interface SourcesPanelProps {
  sources: DataSource[];
}

export function SourcesPanel({ sources }: SourcesPanelProps) {
  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-4 rounded-full" style={{ backgroundColor: '#6a7a9a' }} />
        <h3 className="text-[12px] font-bold uppercase tracking-[0.1em] text-[#c8d6f0] font-mono">
          Data Sources ({sources.length})
        </h3>
      </div>
      <div className="space-y-1">
        {sources.map((src) => (
          <div
            key={src.id}
            className="flex items-center justify-between px-3 py-2 bg-[#0a0e14] border border-[#111827] rounded"
          >
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-mono text-[#c8d6f0]">{src.name}</span>
              <span className="text-[9px] font-mono text-[#3a4558] bg-[#111827] px-1 rounded">
                {src.type}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1 bg-[#111827] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.round(src.credibility * 100)}%`,
                    backgroundColor:
                      src.credibility >= 0.7
                        ? '#30d158'
                        : src.credibility >= 0.4
                          ? '#f5a623'
                          : '#ff2d55',
                  }}
                />
              </div>
              <span className="text-[10px] font-mono text-[#6a7a9a] w-8 text-right">
                {Math.round(src.credibility * 100)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
