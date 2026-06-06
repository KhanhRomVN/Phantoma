import { SectionHeader } from '../../shared-ui';

export function SourceCodeSensitiveExposure({ data }: { data: any }) {
  return (
    <div className="p-3 bg-[#080b10]">
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
        <SectionHeader accent="#ff2d55">Sensitive Exposure</SectionHeader>
        <div>TODO: API keys, secret tokens, SSH keys, database credentials, cloud credentials, hardcoded passwords</div>
      </div>
    </div>
  );
}