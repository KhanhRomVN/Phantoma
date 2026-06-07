import React from 'react';
import type { DataPoint } from '../../types/data-point';
import { DataPointRow } from './DataPointRow';

interface TimelineClusterProps {
  dataPoints: DataPoint[];
}

export function TimelineCluster({ dataPoints }: TimelineClusterProps) {
  const sorted = [...dataPoints]
    .filter((dp) => dp.discoveredAt)
    .sort((a, b) => (b.discoveredAt || '').localeCompare(a.discoveredAt || ''));

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-4 rounded-full" style={{ backgroundColor: '#5e5ce6' }} />
        <h3 className="text-[12px] font-bold uppercase tracking-[0.1em] text-[#c8d6f0] font-mono">
          Timeline ({sorted.length} events)
        </h3>
      </div>
      <div className="space-y-1">
        {sorted.length === 0 ? (
          <div className="text-[11px] font-mono text-[#6a7a9a] py-4 text-center">
            No timestamped data points
          </div>
        ) : (
          sorted.map((dp) => (
            <div key={dp.id} className="flex items-start gap-2">
              <span className="text-[10px] font-mono text-[#3a4558] w-[100px] shrink-0 pt-1.5">
                {dp.discoveredAt ? new Date(dp.discoveredAt).toLocaleDateString() : 'Unknown'}
              </span>
              <div className="flex-1">
                <DataPointRow dataPoint={dp} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}