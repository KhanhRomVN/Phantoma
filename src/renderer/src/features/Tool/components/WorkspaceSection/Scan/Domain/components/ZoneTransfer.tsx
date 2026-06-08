import { useMemo } from 'react';
import type { DataPoint } from '../types/scan-data-point';
import type { SmartCategoryGroup } from '../types/scan-result';
import { SectionHeader } from './shared/SectionHeader';
import { StatBox } from './shared/StatBox';
import { DataTable } from './shared/DataTable';

interface ZoneTransferProps {
  dataPoints: DataPoint[];
  activeGroup: SmartCategoryGroup;
}

export function ZoneTransfer({ dataPoints, activeGroup }: ZoneTransferProps) {
  const successCount = dataPoints.filter((dp) => dp.category === 'zone_transfer_success').length;
  const failedCount = dataPoints.filter((dp) => dp.category === 'zone_transfer_failed').length;
  const recordCount = dataPoints.filter((dp) => dp.tags?.includes('zone-transfer-record')).length;
  const internalCount = dataPoints.filter((dp) => dp.tags?.includes('internal')).length;

  if (dataPoints.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-2 p-3">
        <span className="text-[24px] opacity-15">🔄</span>
        <span className="text-[12px] font-mono text-[#6a7a9a]">No zone transfer data</span>
        <span className="text-[10px] font-mono text-[#3a4558]">{activeGroup.description}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-4 gap-2 mb-3">
        <StatBox label="Success" value={successCount} sub="transfers" accent="#30d158" />
        <StatBox label="Failed" value={failedCount} sub="refused" accent="#ff2d55" />
        <StatBox label="Records" value={recordCount} sub="total" accent="#0a84ff" />
        <StatBox
          label="Internal"
          value={internalCount}
          sub="RFC 1918"
          accent={internalCount > 0 ? '#ff6b35' : '#30d158'}
        />
      </div>

      {successCount > 0 && (
        <>
          <SectionHeader accent="#30d158">Zone Transfer — Success</SectionHeader>
          <DataTable
            dataPoints={dataPoints.filter((dp) => dp.category === 'zone_transfer_success')}
            columns={['value', 'category', 'confidence', 'source']}
          />
        </>
      )}

      {failedCount > 0 && (
        <>
          <SectionHeader accent="#ff2d55">Zone Transfer — Failed</SectionHeader>
          <DataTable
            dataPoints={dataPoints.filter((dp) => dp.category === 'zone_transfer_failed')}
            columns={['value', 'category', 'confidence', 'source']}
          />
        </>
      )}

      {recordCount > 0 && (
        <>
          <SectionHeader accent="#ff6b35">Zone Records ({recordCount})</SectionHeader>
          <DataTable
            dataPoints={dataPoints.filter((dp) => dp.tags?.includes('zone-transfer-record'))}
            columns={['value', 'category', 'severity', 'confidence', 'source']}
            maxRows={200}
          />
        </>
      )}
    </div>
  );
}