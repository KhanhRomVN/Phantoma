import type { DataPoint } from '../../types/ip/data-point';
import type { SmartCategoryGroup } from '../../types/ip/smart-category';
import { SectionHeader } from '../../components/shared/SectionHeader';
import { StatBox } from '../../components/shared/StatBox';
import { DataTable } from '../../components/shared/DataTable';

interface ShodanProps {
  dataPoints: DataPoint[];
  activeGroup: SmartCategoryGroup;
}

export function Shodan({ dataPoints, activeGroup }: ShodanProps) {
  const openPorts = dataPoints.filter((dp) => dp.category === 'open_port').length;
  const serviceBanners = dataPoints.filter((dp) => dp.category === 'service_banner').length;
  const sslCerts = dataPoints.filter((dp) => dp.category === 'ssl_certificate').length;

  if (dataPoints.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-2 p-3">
        <span className="text-[24px] opacity-15">📡</span>
        <span className="text-[12px] font-mono text-[#6a7a9a]">No port scan data available</span>
        <span className="text-[10px] font-mono text-[#3a4558]">{activeGroup.description}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatBox label="Open Ports" value={openPorts} sub="detected" accent="#ff6b35" />
        <StatBox label="Banners" value={serviceBanners} sub="captured" accent="#0a84ff" />
        <StatBox label="SSL Certs" value={sslCerts} sub="on ports" accent="#64d2ff" />
      </div>

      <SectionHeader accent="#ff6b35">Ports & Services</SectionHeader>
      <DataTable
        dataPoints={dataPoints}
        columns={['value', 'category', 'confidence', 'source', 'metadata']}
        maxRows={200}
      />
    </div>
  );
}
