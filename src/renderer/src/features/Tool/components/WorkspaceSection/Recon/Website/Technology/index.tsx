import { SectionHeader } from '../../shared-ui';

export function WebsiteTechnology({ data }: { data: any }) {
  return (
    <div className="p-3 bg-[#080b10]">
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
        <SectionHeader accent="#bf5af2">Technology Detection</SectionHeader>
        <div>TODO: Frontend framework, backend framework, CMS, web server, runtime, CDN, WAF</div>
      </div>
    </div>
  );
}