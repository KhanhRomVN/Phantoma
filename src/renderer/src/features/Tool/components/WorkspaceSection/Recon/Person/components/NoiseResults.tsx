import type { PersonData } from '../types/person-data';
import React from 'react';

function SectionHeader({ accent = '#0af', children }: { accent?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="w-1 h-4 rounded-full" style={{ backgroundColor: accent }} />
      <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#c8d6f0] font-mono">
        {children}
      </h3>
    </div>
  );
}

function ConfidencePill({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 60 ? '#f5a623' : pct >= 30 ? '#6a7a9a' : '#3a4558';
  return (
    <div className="flex items-center gap-1">
      <div className="w-12 h-1 bg-[#111827] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[9px] font-mono" style={{ color }}>{pct}%</span>
    </div>
  );
}

export function NoiseResults({ data }: { data: PersonData }) {
  const noiseResults = data.noiseResults || [];
  const registeredServices = data.registeredServices || [];

  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10]">
      <div className="space-y-2">

        {/* Registered Services */}
        {registeredServices.length > 0 && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
            <SectionHeader accent="#30d158">Registered Services</SectionHeader>
            <div className="space-y-1">
              {registeredServices.map((svc, i) => (
                <div key={i} className="flex items-center gap-3 py-1 border-b border-[#111827] last:border-0">
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: svc.confirmed ? '#30d158' : '#3a4558' }}
                  />
                  <span className="text-[11px] font-mono text-[#c8d6f0] flex-1">{svc.service}</span>
                  {svc.url && (
                    <span className="text-[10px] font-mono text-[#0af] truncate max-w-[160px]">{svc.url}</span>
                  )}
                  <span
                    className="text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0"
                    style={{
                      color: svc.confirmed ? '#30d158' : '#3a4558',
                      backgroundColor: svc.confirmed ? '#30d15815' : '#3a455815',
                    }}
                  >
                    {svc.confirmed ? 'CONFIRMED' : 'POSSIBLE'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Noise / Unrelated hits */}
        {noiseResults.length > 0 && (
          <div className="bg-[#0d1017] border border-[#f5a62330] rounded p-3">
            <SectionHeader accent="#f5a623">Unrelated Hits (Noise)</SectionHeader>
            <p className="text-[10px] font-mono text-[#3a4558] mb-2 leading-relaxed">
              These results matched the query but are likely unrelated to the primary target. Low confidence scores indicate poor match.
            </p>
            <div className="space-y-2">
              {noiseResults.map((result, i) => (
                <div key={i} className="p-2 bg-[#0a0e14] rounded border border-[#1c2333]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-mono font-bold text-[#f5a623]">{result.source}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono text-[#3a4558] px-1.5 py-0.5 bg-[#1c2333] rounded">{result.type}</span>
                      <ConfidencePill value={result.confidence} />
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-[#0af] mb-1 break-all">{result.url}</div>
                  <div className="text-[10px] font-mono text-[#6a7a9a] italic">{result.note}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {noiseResults.length === 0 && registeredServices.length === 0 && (
          <div className="flex items-center justify-center py-12 flex-col gap-2">
            <span className="text-[24px] opacity-15">📋</span>
            <span className="text-[11px] font-mono text-[#2a3548]">No additional data available</span>
          </div>
        )}
      </div>
    </div>
  );
}