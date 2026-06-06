import { SectionHeader } from '../../shared-ui';

export function PersonTechnicalFootprint({ data }: { data: any }) {
  return (
    <div className="p-3 bg-[#080b10]">
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
        <SectionHeader accent="#bf5af2">Technical Footprint</SectionHeader>
        <div>TODO: GitHub, GitLab, StackOverflow, public keys, domain ownership, repository contributions</div>
      </div>
    </div>
  );
}