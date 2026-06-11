import type { DataPoint } from '../../types/person/data-point';
import type { SmartCategoryGroup } from '../../types/person/smart-category';
import { SectionHeader } from '../../components/shared/SectionHeader';
import { StatBox } from '../../components/shared/StatBox';
import { DataTable } from '../../components/shared/DataTable';

interface TechnicalProps {
  dataPoints: DataPoint[];
  activeGroup: SmartCategoryGroup;
}

export function Technical({ dataPoints, activeGroup }: TechnicalProps) {
  const repos = dataPoints.filter((dp) => dp.category === 'tech_repo_contribution').length;
  const tools = dataPoints.filter((dp) => dp.category === 'tech_tool_published').length;
  const domains = dataPoints.filter((dp) => dp.category === 'tech_domain').length;
  const ips = dataPoints.filter((dp) => dp.category === 'tech_ip_address').length;
  const keys = dataPoints.filter((dp) => dp.category === 'tech_public_key').length;
  const ctfResults = dataPoints.filter((dp) => dp.category === 'tech_ctf_result').length;

  if (dataPoints.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-2 p-3">
        <span className="text-[24px] opacity-15">⚙️</span>
        <span className="text-[12px] font-mono text-[#6a7a9a]">No technical footprint data</span>
        <span className="text-[10px] font-mono text-[#3a4558]">{activeGroup.description}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatBox label="Repos" value={repos} sub="contributions" accent="#af52de" />
        <StatBox label="Tools" value={tools} sub="published" accent="#0a84ff" />
        <StatBox label="Domains" value={domains} sub="owned" accent="#30d158" />
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatBox label="IPs" value={ips} sub="addresses" accent="#f5a623" />
        <StatBox label="Keys" value={keys} sub="PGP/SSH" accent="#64d2ff" />
        <StatBox label="CTFs" value={ctfResults} sub="results" accent="#ff6b35" />
      </div>

      <SectionHeader accent="#af52de">Technical Footprint</SectionHeader>
      <DataTable
        dataPoints={dataPoints}
        columns={['value', 'category', 'confidence', 'source', 'metadata']}
        maxRows={200}
      />
    </div>
  );
}
