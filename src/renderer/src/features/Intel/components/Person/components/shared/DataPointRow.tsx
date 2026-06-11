import React from 'react';
import type { DataPoint } from '../../types/data-point';
import { ConfidenceBadge } from './ConfidenceBadge';

interface DataPointRowProps {
  dataPoint: DataPoint;
}

export function DataPointRow({ dataPoint }: DataPointRowProps) {
  const { label, displayValue, confidence, source, isNoise, riskScore } = dataPoint;

  return (
    <div
      className="flex items-center gap-2 px-2 py-1.5 bg-[#0a0e14] border border-[#111827] rounded text-[11px] font-mono hover:border-[#1c2333] transition-colors"
    >
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span
          className="truncate"
          style={{ color: isNoise ? '#3a4558' : '#c8d6f0' }}
        >
          {displayValue || String(dataPoint.value || '')}
        </span>
        {isNoise && (
          <span className="text-[9px] text-[#6a7a9a] bg-[#1c2333] px-1 rounded shrink-0">NOISE</span>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {riskScore !== undefined && riskScore >= 50 && (
          <span
            className="text-[9px] font-mono px-1 rounded"
            style={{
              color: riskScore >= 75 ? '#ff2d55' : '#f5a623',
              backgroundColor: riskScore >= 75 ? '#ff2d5515' : '#f5a62315',
            }}
          >
            R{riskScore}
          </span>
        )}

        <ConfidenceBadge value={confidence} />

        <span className="text-[9px] text-[#3a4558] bg-[#111827] px-1 rounded truncate max-w-[120px]">
          {source.name}
        </span>
      </div>
    </div>
  );
}