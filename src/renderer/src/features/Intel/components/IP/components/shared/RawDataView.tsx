import type { DataPoint } from '../../types/data-point';
import { DataPointRow } from './DataPointRow';

interface RawDataViewProps {
  dataPoints: DataPoint[];
  title: string;
  description: string;
}

export function RawDataView({ dataPoints, title, description }: RawDataViewProps) {
  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-1 h-4 rounded-full" style={{ backgroundColor: '#6a7a9a' }} />
        <h3 className="text-[12px] font-bold uppercase tracking-[0.1em] text-[#c8d6f0] font-mono">
          {title} ({dataPoints.length})
        </h3>
      </div>
      <p className="text-[11px] font-mono text-[#6a7a9a] mb-3">{description}</p>
      <div className="space-y-1">
        {dataPoints.length === 0 ? (
          <div className="text-[11px] font-mono text-[#6a7a9a] py-4 text-center">
            No unclassified data points
          </div>
        ) : (
          dataPoints.map((dp) => <DataPointRow key={dp.id} dataPoint={dp} />)
        )}
      </div>
    </div>
  );
}
