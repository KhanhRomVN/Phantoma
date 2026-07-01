import type { DataSource } from '../../types/data-point';
import { cn } from '../../../../shared/lib/utils';

export function SourcesPanel({ sources }: SourcesPanelProps) {
  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-4 rounded-full bg-text-secondary" />
        <h3 className="text-[12px] font-bold uppercase tracking-[0.1em] text-text-primary font-mono">
          Data Sources ({sources.length})
        </h3>
      </div>
      <div className="space-y-1">
        {sources.map((src) => {
          const credibility = Math.round(src.credibility * 100);
          const color =
            src.credibility >= 0.7
              ? $('--success')
              : src.credibility >= 0.4
                ? $('--warning')
                : $('--error');
          return (
            <div
              key={src.id}
              className="flex items-center justify-between px-3 py-2 bg-card-background border border-border rounded"
            >
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-mono text-text-primary">{src.name}</span>
                <span className="text-[9px] font-mono text-text-secondary bg-border px-1 rounded">
                  {src.type}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${credibility}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
                <span className="text-[10px] font-mono text-text-secondary w-8 text-right">
                  {credibility}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
