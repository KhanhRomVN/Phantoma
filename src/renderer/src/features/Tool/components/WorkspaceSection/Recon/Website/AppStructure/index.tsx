import { SectionHeader } from '../../shared-ui';

export function WebsiteAppStructure({ data }: { data: any }) {
  return (
    <div className="p-3 bg-[#080b10]">
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
        <SectionHeader accent="#0af">Application Structure</SectionHeader>
        <div>TODO: URL structure, endpoint mapping, route discovery, API discovery, hidden paths, upload paths</div>
      </div>
    </div>
  );
}