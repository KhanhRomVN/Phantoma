import { useMemo } from 'react';
import type { DataPoint } from '../types/data-point';
import type { SmartCategoryGroup } from '../types/smart-category';
import { SectionHeader } from './shared/SectionHeader';
import { StatBox } from './shared/StatBox';
import { DataTable } from './shared/DataTable';

interface GeoIpProps {
  dataPoints: DataPoint[];
  activeGroup: SmartCategoryGroup;
}

export function GeoIp({ dataPoints, activeGroup }: GeoIpProps) {
  const country = dataPoints.find((dp) => dp.category === 'geoip_country')?.value;
  const city = dataPoints.find((dp) => dp.category === 'geoip_city')?.value;
  const isp = dataPoints.find((dp) => dp.category === 'geoip_isp')?.value;
  const sourcesCount = new Set(dataPoints.map((dp) => dp.source.name)).size;

  if (dataPoints.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-2 p-3">
        <span className="text-[24px] opacity-15">📍</span>
        <span className="text-[12px] font-mono text-[#6a7a9a]">No GeoIP data available</span>
        <span className="text-[10px] font-mono text-[#3a4558]">{activeGroup.description}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatBox label="Country" value={String(country || '—')} sub="location" accent="#30d158" />
        <StatBox label="City" value={String(city || '—')} sub="approx" accent="#0a84ff" />
        <StatBox label="Sources" value={sourcesCount} sub="providers" accent="#f5a623" />
      </div>

      {isp && (
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 mb-3">
          <div className="flex justify-between items-center py-1">
            <span className="text-[11px] font-mono text-[#6a7a9a] uppercase tracking-wide">ISP / Org</span>
            <span className="text-[12px] font-mono text-[#c8d6f0]">{String(isp)}</span>
          </div>
        </div>
      )}

      <SectionHeader accent="#30d158">GeoIP Data</SectionHeader>
      <DataTable
        dataPoints={dataPoints}
        columns={['value', 'category', 'confidence', 'source']}
      />
    </div>
  );
}