import { SectionHeader } from '../../shared-ui';

export function PersonLeakExposure({ data }: { data: any }) {
  return (
    <div className="p-3 bg-[#080b10]">
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
        <SectionHeader accent="#ff2d55">Leak & Exposure</SectionHeader>
        <div>TODO: Password leak, credential leak, breach database, Pastebin leak, public documents</div>
      </div>
    </div>
  );
}