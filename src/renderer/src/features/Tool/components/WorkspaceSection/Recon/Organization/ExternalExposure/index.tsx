import { SectionHeader } from '../../shared-ui';

export function OrganizationExternalExposure({ data }: { data: any }) {
  return (
    <div className="p-3 bg-[#080b10]">
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
        <SectionHeader accent="#ff2d55">External Exposure</SectionHeader>
        <div>TODO: Data breach, credential leak, public documents, PDF metadata, press releases, conference talks</div>
      </div>
    </div>
  );
}