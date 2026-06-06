import { SectionHeader } from '../../shared-ui';

export function IPServerInfrastructureExposure({ data }: { data: any }) {
  return (
    <div className="p-3 bg-[#080b10]">
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
        <SectionHeader accent="#ff6b35">Infrastructure Exposure</SectionHeader>
        <div>TODO: Docker exposure, Kubernetes exposure, Redis exposure, Elasticsearch exposure, MongoDB exposure, PostgreSQL exposure, MySQL exposure</div>
      </div>
    </div>
  );
}