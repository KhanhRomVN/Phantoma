import { SectionHeader } from '../../shared-ui';

export function OrganizationEmployeeIntel({ data }: { data: any }) {
  return (
    <div className="p-3 bg-[#080b10]">
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
        <SectionHeader accent="#f5a623">Employee Intelligence</SectionHeader>
        <div>TODO: Employee names, LinkedIn profiles, public emails, job positions, department structure</div>
      </div>
    </div>
  );
}