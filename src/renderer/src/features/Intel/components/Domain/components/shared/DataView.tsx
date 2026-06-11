import type { DataPoint } from '../../types/data-point';
import type { SmartCategoryGroup } from '../../types/smart-category';
import { DataPointRow } from './DataPointRow';
import { SectionHeader } from './SectionHeader';

interface DataViewProps {
  dataPoints: DataPoint[];
  activeGroup: SmartCategoryGroup;
  entityName?: string;
}

export function DataView({ dataPoints, activeGroup, entityName }: DataViewProps) {
  return (
    <div className="flex-1 overflow-y-auto p-3">
      <SectionHeader accent={activeGroup.accent}>
        {activeGroup.label}
        {entityName && (
          <span className="text-[10px] font-normal text-[#6a7a9a] ml-1">— {entityName}</span>
        )}
        <span className="text-[10px] font-normal text-[#6a7a9a] ml-1">({dataPoints.length})</span>
      </SectionHeader>
      <div className="space-y-1">
        {dataPoints.length === 0 ? (
          <div className="text-[11px] font-mono text-[#6a7a9a] py-4 text-center">
            No data points in this category
          </div>
        ) : (
          dataPoints.map((dp) => <DataPointRow key={dp.id} dataPoint={dp} />)
        )}
      </div>
    </div>
  );
}
