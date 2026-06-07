import React from 'react';
import type { DataPoint } from '../types/data-point';
import { SectionHeader } from './shared/SectionHeader';
import { DataPointRow } from './shared/DataPointRow';

interface RawDataViewProps {
  dataPoints: DataPoint[];
  title?: string;
  description?: string;
}

export function RawDataView({ dataPoints, title = 'Raw Data', description }: RawDataViewProps) {
  const noisePoints = dataPoints.filter(dp => dp.isNoise);
  const unclassifiedPoints = dataPoints.filter(dp => !dp.isNoise && dp.category === 'unclassified');
  const otherPoints = dataPoints.filter(dp => !dp.isNoise && dp.category !== 'unclassified');

  return (
    <div className="flex-1 overflow-y-auto p-3">
      {description && (
        <div className="text-[11px] font-mono text-[#6a7a9a] mb-3 leading-relaxed bg-[#0d1017] border border-[#1c2333] rounded p-2">
          {description}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-[#0d1017] border border-[#f5a62330] rounded p-2 flex flex-col items-center">
          <span className="text-[10px] font-mono text-[#f5a623] uppercase tracking-widest">Noise</span>
          <span className="text-[20px] font-bold font-mono text-[#f5a623]">{noisePoints.length}</span>
        </div>
        <div className="bg-[#0d1017] border border-[#6a7a9a30] rounded p-2 flex flex-col items-center">
          <span className="text-[10px] font-mono text-[#6a7a9a] uppercase tracking-widest">Unclassified</span>
          <span className="text-[20px] font-bold font-mono text-[#6a7a9a]">{unclassifiedPoints.length}</span>
        </div>
        <div className="bg-[#0d1017] border border-[#0af30] rounded p-2 flex flex-col items-center">
          <span className="text-[10px] font-mono text-[#0af] uppercase tracking-widest">Other</span>
          <span className="text-[20px] font-bold font-mono text-[#0af]">{otherPoints.length}</span>
        </div>
      </div>

      {/* Noise points */}
      {noisePoints.length > 0 && (
        <div className="mb-3">
          <SectionHeader accent="#f5a623">Noise Data ({noisePoints.length})</SectionHeader>
          <div className="space-y-1">
            {noisePoints.slice(0, 50).map(dp => (
              <DataPointRow key={dp.id} dataPoint={dp} compact />
            ))}
            {noisePoints.length > 50 && (
              <div className="text-[11px] font-mono text-[#6a7a9a] text-center py-2">
                +{noisePoints.length - 50} more noise items
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unclassified */}
      {unclassifiedPoints.length > 0 && (
        <div className="mb-3">
          <SectionHeader accent="#6a7a9a">Unclassified ({unclassifiedPoints.length})</SectionHeader>
          <div className="space-y-1">
            {unclassifiedPoints.slice(0, 50).map(dp => (
              <DataPointRow key={dp.id} dataPoint={dp} compact />
            ))}
          </div>
        </div>
      )}

      {/* Other classified but not in main tabs */}
      {otherPoints.length > 0 && (
        <div className="mb-3">
          <SectionHeader accent="#0af">Other Classified ({otherPoints.length})</SectionHeader>
          <div className="space-y-1">
            {otherPoints.slice(0, 50).map(dp => (
              <DataPointRow key={dp.id} dataPoint={dp} />
            ))}
          </div>
        </div>
      )}

      {dataPoints.length === 0 && (
        <div className="flex items-center justify-center py-12 flex-col gap-2">
          <span className="text-[24px] opacity-15">📋</span>
          <span className="text-[12px] font-mono text-[#6a7a9a]">No raw data available</span>
        </div>
      )}
    </div>
  );
}