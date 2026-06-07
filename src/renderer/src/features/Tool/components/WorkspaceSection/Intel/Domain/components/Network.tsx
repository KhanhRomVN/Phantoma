import type { DataPoint } from '../../Person/types/data-point';
import type { SmartCategoryGroup } from '../../Person/types/smart-category';
import { DataPointRow } from '../../Person/components/shared/DataPointRow';
import { SectionHeader } from '../../Person/components/shared/SectionHeader';
import { StatBox } from '../../Person/components/shared/StatBox';

interface NetworkProps {
  dataPoints: DataPoint[];
  activeGroup: SmartCategoryGroup;
}

const CATEGORY_LABELS: Record<string, string> = {
  open_port: 'Open Ports',
  service_banner: 'Service Banners',
  http_response: 'HTTP Responses',
  ssl_certificate_chain: 'SSL Chain',
  cors_header: 'CORS Headers',
  security_header: 'Security Headers',
  port: 'Ports',
  service: 'Services',
};

export function Network({ dataPoints, activeGroup }: NetworkProps) {
  const grouped = dataPoints.reduce(
    (acc, dp) => {
      const key = dp.category;
      if (!acc[key]) acc[key] = [];
      acc[key].push(dp);
      return acc;
    },
    {} as Record<string, DataPoint[]>,
  );

  const openPortsCount = (grouped.open_port || []).length + (grouped.port || []).length;
  const serviceCount = (grouped.service || []).length + (grouped.service_banner || []).length;

  if (dataPoints.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-2 p-3">
        <span className="text-[24px] opacity-15">📡</span>
        <span className="text-[12px] font-mono text-[#6a7a9a]">No network scan data available</span>
        <span className="text-[10px] font-mono text-[#3a4558]">{activeGroup.description}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatBox label="Ports" value={openPortsCount} sub="open" accent="#ff6b35" />
        <StatBox label="Services" value={serviceCount} sub="detected" accent="#0a84ff" />
        <StatBox label="Total" value={dataPoints.length} sub="findings" accent="#ff6b35" />
      </div>

      <div className="space-y-3">
        {Object.entries(grouped).map(([category, dps]) => (
          <div key={category}>
            <SectionHeader accent="#ff6b35">
              {CATEGORY_LABELS[category] || category.replace(/_/g, ' ')}
              <span className="text-[10px] font-normal text-[#6a7a9a] ml-1">({dps.length})</span>
            </SectionHeader>
            <div className="space-y-1">
              {dps.map((dp) => (
                <DataPointRow key={dp.id} dataPoint={dp} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
