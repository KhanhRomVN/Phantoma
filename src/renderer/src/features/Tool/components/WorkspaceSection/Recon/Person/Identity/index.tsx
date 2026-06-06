import { SectionHeader, KV } from '../../shared-ui';

export function PersonIdentity({ data }: { data: any }) {
  return (
    <div className="p-3 bg-[#080b10]">
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
        <SectionHeader accent="#0af">Identity Information</SectionHeader>
        <div>TODO: Full name, alias, username, nickname, avatar</div>
      </div>
    </div>
  );
}