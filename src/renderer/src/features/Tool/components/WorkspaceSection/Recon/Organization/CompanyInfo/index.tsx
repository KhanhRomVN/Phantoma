import { SectionHeader, KV } from '../../shared-ui';

export function OrganizationCompanyInfo({ data }: { data: any }) {
  return (
    <div className="p-3 bg-[#080b10]">
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
        <SectionHeader accent="#0af">Company Information</SectionHeader>
        <div>TODO: Company name, legal name, address, phone number, email, industry, subsidiary</div>
      </div>
    </div>
  );
}