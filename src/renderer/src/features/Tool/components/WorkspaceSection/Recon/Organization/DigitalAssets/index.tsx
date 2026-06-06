import { SectionHeader } from '../../shared-ui';

export function OrganizationDigitalAssets({ data }: { data: any }) {
  return (
    <div className="p-3 bg-[#080b10]">
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
        <SectionHeader accent="#30d158">Digital Assets</SectionHeader>
        <div>TODO: Domains, subdomains, mobile apps, cloud assets, GitHub organization, public repositories</div>
      </div>
    </div>
  );
}